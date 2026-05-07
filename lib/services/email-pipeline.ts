/**
 * Pre-Register Email Pipeline (2-step generation + validation loop)
 *
 * Step 1 — Personalization extraction: Claude reads the prospect record and
 * the factual canon, decides what's specific to this brand, picks a tone
 * variant. Output is JSON.
 *
 * Step 2 — Email drafting: Claude reads Step 1's output, the matching anchor
 * template (loaded from DB as a few-shot example), and the canon. Output is
 * JSON matching `GeneratedEmail`.
 *
 * Validation loop: deterministic checks (lib/services/email-validation.ts).
 * Errors → regenerate up to MAX_REGENERATIONS times. After that, return the
 * best-effort email plus the warnings for the user to review.
 *
 * This pipeline is invoked by /api/compose/generate when type='pre_register'.
 * Other email types continue using the existing single-shot path.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CANON_VERSION,
  FACTUAL_CANON,
  PRELAUNCH_URL,
  TONE_VARIANT_SIGNOFFS,
  TONE_VARIANT_WORD_RANGES,
  type CanonSegment,
  type ToneVariant,
} from './email-canon'
import { validateGeneratedEmail } from './email-validation'
import {
  selectToneVariant,
  computeEnrichmentScore,
  type ToneVariantInput,
} from './tone-variant'

const MAX_REGENERATIONS = 2
const STEP1_MODEL = 'claude-sonnet-4-20250514'
const STEP2_MODEL = 'claude-sonnet-4-20250514'

// ============================================
// PUBLIC TYPES
// ============================================

export interface ProspectInput {
  brand_name: string
  contact_first_name: string | null
  contact_role: string | null
  org_type: 'BRAND_OWNER' | 'DISTRIBUTOR'
  country: string | null
  language: 'en' // Phase 1: English only
  vertical: string | null
  positioning: string | null
  description: string | null
  proof_points: string[]
  personalization_hooks: string[]
  represented_brands: string[]
  wiki_facts: Record<string, unknown> | null
}

export interface SenderInput {
  full_name: string
  first_name: string
  title: string
  meeting_url: string
}

export interface PipelineInput {
  prospect: ProspectInput
  sender: SenderInput
  supabase: SupabaseClient
}

export interface PipelineResult {
  ok: boolean
  subject: string
  body: string
  tone_variant_used: ToneVariant
  personalization_signals_used: string[]
  validation_warnings: string[]
  validation_errors: string[]
  regeneration_count: number
  canon_version: string
  tokens_used: number
  step1_output: Step1Output | null
}

interface Step1Output {
  primary_pain_point: string
  specific_value_prop_for_this_brand: string
  hook_angle: string
  tone_variant_recommendation: ToneVariant
  personalization_confidence: number
  signals_referenced: string[]
}

// ============================================
// MAIN ENTRYPOINT
// ============================================

export async function generatePreRegisterEmail(
  input: PipelineInput,
): Promise<PipelineResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let tokensUsed = 0

  // ---- Step 1: Personalization extraction ----
  const step1 = await runStep1(anthropic, input)
  tokensUsed += step1.tokens_used

  // Tone variant: prefer Step 1's recommendation, but fall back to deterministic
  // selection if confidence is low or recommendation looks invalid.
  const heuristicTone = selectToneVariant(buildToneInput(input.prospect, step1.output))
  const toneVariant: ToneVariant =
    step1.output && step1.output.personalization_confidence >= 60
      ? step1.output.tone_variant_recommendation
      : heuristicTone

  // ---- Load anchor template ----
  const anchor = await loadAnchorTemplate(input.supabase, input.prospect.org_type, toneVariant)
  if (!anchor) {
    return {
      ok: false,
      subject: '',
      body: '',
      tone_variant_used: toneVariant,
      personalization_signals_used: [],
      validation_warnings: [],
      validation_errors: [`No anchor template found for ${input.prospect.org_type} / ${toneVariant} / en`],
      regeneration_count: 0,
      canon_version: CANON_VERSION,
      tokens_used: tokensUsed,
      step1_output: step1.output,
    }
  }

  // ---- Step 2 + validation loop ----
  let attempt = 0
  let bestResult: { subject: string; body: string; signals: string[] } | null = null
  let lastErrors: string[] = []
  let lastWarnings: string[] = []
  let regenFeedback: string[] = []

  while (attempt <= MAX_REGENERATIONS) {
    const step2 = await runStep2(anthropic, input, step1.output, anchor, toneVariant, regenFeedback)
    tokensUsed += step2.tokens_used

    if (!step2.parsed) {
      lastErrors = [step2.error || 'Step 2 returned unparseable JSON']
      regenFeedback = lastErrors
      attempt += 1
      continue
    }

    bestResult = {
      subject: step2.parsed.subject,
      body: step2.parsed.body,
      signals: step2.parsed.personalization_signals_used || [],
    }

    const validation = validateGeneratedEmail({
      subject: step2.parsed.subject,
      body: step2.parsed.body,
      toneVariant,
      brandName: input.prospect.brand_name,
      personalizationSignals: collectPersonalizationSignals(input.prospect, step1.output),
    })

    lastErrors = validation.errors
    lastWarnings = validation.warnings

    if (validation.ok) {
      return {
        ok: true,
        subject: step2.parsed.subject,
        body: step2.parsed.body,
        tone_variant_used: toneVariant,
        personalization_signals_used: bestResult.signals,
        validation_warnings: lastWarnings,
        validation_errors: [],
        regeneration_count: attempt,
        canon_version: CANON_VERSION,
        tokens_used: tokensUsed,
        step1_output: step1.output,
      }
    }

    regenFeedback = validation.errors
    attempt += 1
  }

  // After MAX_REGENERATIONS failures: return best effort with warnings.
  return {
    ok: false,
    subject: bestResult?.subject ?? '',
    body: bestResult?.body ?? '',
    tone_variant_used: toneVariant,
    personalization_signals_used: bestResult?.signals ?? [],
    validation_warnings: lastWarnings,
    validation_errors: lastErrors,
    regeneration_count: attempt - 1,
    canon_version: CANON_VERSION,
    tokens_used: tokensUsed,
    step1_output: step1.output,
  }
}

// ============================================
// STEP 1
// ============================================

async function runStep1(
  anthropic: Anthropic,
  input: PipelineInput,
): Promise<{ output: Step1Output | null; tokens_used: number; error?: string }> {
  const segment: CanonSegment = input.prospect.org_type === 'DISTRIBUTOR' ? 'distributor' : 'brand_owner'
  const canon = FACTUAL_CANON[segment]

  const systemPrompt = `You are a personalization analyst for O!deal, a Swiss flash-sale platform.

Your job: read a prospect record and extract the most specific, useful angles for a prospection email. You do NOT write the email — you decide what the email should be about.

FACTUAL CANON (immutable — do not invent beyond this):
- Positioning: ${canon.positioning.join(' | ')}
- Operational model: ${canon.operational_model.join(' ')}
- We handle: ${canon.we_handle.join(', ')}

Output ONLY a JSON object matching this exact schema:
{
  "primary_pain_point": "The specific pain or constraint this brand likely faces (1 sentence, grounded in the prospect data — never generic).",
  "specific_value_prop_for_this_brand": "What O!deal does for THIS brand specifically (1-2 sentences, references brand_name and at least one prospect detail).",
  "hook_angle": "The opening angle for Beat 1 of the email — it must reference a real fact about this brand (1 sentence).",
  "tone_variant_recommendation": "confident_direct" | "consultative" | "curiosity_hook",
  "personalization_confidence": 0-100,
  "signals_referenced": ["which prospect fields you actually used, e.g. 'vertical', 'positioning', 'wiki_facts.headquarters'"]
}

Tone variant guide:
- "consultative": premium / luxury / large corporates — formal, structured.
- "curiosity_hook": thin enrichment OR no clear pain point — open with a question.
- "confident_direct": default for mid-market, DTC, mass/lifestyle, tech, FMCG.`

  const userMessage = JSON.stringify(buildProspectPayload(input.prospect), null, 2)

  try {
    const response = await anthropic.messages.create({
      model: STEP1_MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const tokens_used = response.usage.input_tokens + response.usage.output_tokens
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { output: null, tokens_used, error: 'Step 1: no text response' }
    }
    const parsed = parseJsonFromText<Step1Output>(textBlock.text)
    return { output: parsed, tokens_used }
  } catch (e) {
    return { output: null, tokens_used: 0, error: e instanceof Error ? e.message : 'Step 1 error' }
  }
}

// ============================================
// STEP 2
// ============================================

async function runStep2(
  anthropic: Anthropic,
  input: PipelineInput,
  step1: Step1Output | null,
  anchor: AnchorTemplate,
  toneVariant: ToneVariant,
  regenFeedback: string[],
): Promise<{
  parsed: { subject: string; body: string; personalization_signals_used: string[] } | null
  tokens_used: number
  error?: string
}> {
  const segment: CanonSegment = input.prospect.org_type === 'DISTRIBUTOR' ? 'distributor' : 'brand_owner'
  const canon = FACTUAL_CANON[segment]
  const [minWords, maxWords] = TONE_VARIANT_WORD_RANGES[toneVariant]
  const signoff = TONE_VARIANT_SIGNOFFS[toneVariant]

  const systemPrompt = `You are writing a B2B prospection email for ${input.sender.full_name} at O!deal — Switzerland's flash-sale platform.

The email invites the prospect to PRE-REGISTER on ${PRELAUNCH_URL} so they are notified when supplier onboarding opens. Pre-registered ${segment === 'brand_owner' ? 'brands' : 'distributors'} get locked early-registrant advantages.

CARNEGIE PRINCIPLES (HARD RULES — encode in every output):
1. Open with their world, not our pitch. The first 1-2 sentences reference the prospect's reality.
2. Possessive framing on benefits: "your brand", "your customers", "${input.prospect.brand_name}". Avoid "our suppliers", "our partners".
3. Concrete > abstract. Use specific numbers wherever possible.
4. They are the agent ("Bring your brand to Switzerland"); we are the enabler ("We handle...").
5. Sincere importance: at least one sentence explains why THIS brand specifically (grounded in the data below).
6. One primary CTA (pre-register link), one secondary CTA (book meeting). Both appear in the last two lines before sign-off.

FACTUAL CANON (do not deviate):
- Positioning: ${canon.positioning.join(' | ')}
- Operational model (4 lines, in this order):
${canon.operational_model.map((l) => '  • ' + l).join('\n')}
- We handle (subset, not all): ${canon.we_handle.join(', ')}
- Pre-register advantages (use exactly these two):
${canon.pre_reg_perks.map((p) => '  • ' + p).join('\n')}
- Pre-register URL: ${PRELAUNCH_URL}
- Meeting booking URL: ${input.sender.meeting_url}
- Sign-off: "${signoff}"
- Signature (appended after sign-off): "${input.sender.full_name}\n${input.sender.title}\nodeal.ch"

REQUIRED PHRASES (at least 3 of 4 must appear verbatim):
- "merchant of record"
- "8.7M Swiss consumers"
- "1–7 days" or "max 7 days"
- "80% on compliant receipt, balance at D+15"

FORBIDDEN PHRASES (never use):
- "no stock" / "zero stock" / "no stock to immobilize"
- "pre-order"
- "long-term partnership" / "ongoing contract" / "recurring relationship"
- "risk of unsold stock"
- "I hope this email finds you well"
- "My name is Laurent and I'm…"
- "I'd like to introduce…"
- "I'm reaching out to tell you…"
- "marketplace"

EMAIL ARCHITECTURE (6 beats, in order):
1. Hook (1-3 sentences) — their problem/question, references at least one personalization signal
2. Bridge to O!deal (1 sentence)
3. How it works (4 bulleted lines — exactly the 4-line operational model above)
4. What it means for ${input.prospect.brand_name} (3-4 bullets, concrete outcomes)
5. Pre-registration advantages (the 2 perks above as bullets)
6. Dual CTA: primary pre-register link, secondary meeting link

LENGTH: ${minWords}-${maxWords} words for the body. Subject line: 30-60 chars.

SUBJECT RULE: contains "${input.prospect.brand_name}" OR is phrased as a question.

TONE VARIANT: ${toneVariant}
${toneVariantGuidance(toneVariant)}

OUTPUT — JSON only, exactly this schema:
{
  "subject": "...",
  "body": "...",
  "tone_variant_used": "${toneVariant}",
  "personalization_signals_used": ["which prospect signals you actually wove in"]
}

Body uses \\n for line breaks. Bullets use "• " prefix.`

  const anchorBody = anchor.body
  const anchorSubject = anchor.subject
  const stepOneSection = step1
    ? `STEP 1 PERSONALIZATION ANALYSIS (use these to write the email):
- Primary pain point: ${step1.primary_pain_point}
- Specific value prop for ${input.prospect.brand_name}: ${step1.specific_value_prop_for_this_brand}
- Hook angle: ${step1.hook_angle}
- Signals to reference: ${step1.signals_referenced.join(', ')}
`
    : ''

  const regenSection =
    regenFeedback.length > 0
      ? `\nPREVIOUS ATTEMPT FAILED VALIDATION. Fix these issues:\n${regenFeedback.map((e) => '- ' + e).join('\n')}\n`
      : ''

  const userMessage = `${stepOneSection}
PROSPECT DATA:
${JSON.stringify(buildProspectPayload(input.prospect), null, 2)}

ANCHOR EXAMPLE (style reference — adapt to the prospect, do NOT copy verbatim):
SUBJECT: ${anchorSubject}
BODY:
${anchorBody}
${regenSection}
Write the email now. Output ONLY the JSON object.`

  try {
    const response = await anthropic.messages.create({
      model: STEP2_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const tokens_used = response.usage.input_tokens + response.usage.output_tokens
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { parsed: null, tokens_used, error: 'Step 2: no text response' }
    }
    const parsed = parseJsonFromText<{
      subject: string
      body: string
      personalization_signals_used: string[]
    }>(textBlock.text)
    if (!parsed || !parsed.subject || !parsed.body) {
      return { parsed: null, tokens_used, error: 'Step 2: invalid output schema' }
    }
    return { parsed, tokens_used }
  } catch (e) {
    return { parsed: null, tokens_used: 0, error: e instanceof Error ? e.message : 'Step 2 error' }
  }
}

// ============================================
// HELPERS
// ============================================

interface AnchorTemplate {
  id: string
  subject: string
  body: string
  tone_variant: ToneVariant
}

async function loadAnchorTemplate(
  supabase: SupabaseClient,
  orgType: 'BRAND_OWNER' | 'DISTRIBUTOR',
  toneVariant: ToneVariant,
): Promise<AnchorTemplate | null> {
  const { data } = await supabase
    .from('email_templates')
    .select('id, subject, body, tone_variant')
    .eq('type', 'pre_register')
    .eq('org_type', orgType)
    .eq('language', 'en')
    .eq('tone_variant', toneVariant)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return data as AnchorTemplate
}

function buildProspectPayload(p: ProspectInput): Record<string, unknown> {
  return {
    brand_name: p.brand_name,
    contact_first_name: p.contact_first_name,
    contact_role: p.contact_role,
    org_type: p.org_type,
    country: p.country,
    vertical: p.vertical,
    positioning: p.positioning,
    description: p.description,
    proof_points: p.proof_points,
    personalization_hooks: p.personalization_hooks,
    represented_brands: p.represented_brands,
    wiki_facts: p.wiki_facts,
  }
}

function buildToneInput(prospect: ProspectInput, step1: Step1Output | null): ToneVariantInput {
  const hasPainPoint = !!step1?.primary_pain_point && step1.primary_pain_point.length > 10
  const hasRecentSignal =
    prospect.personalization_hooks.length > 0 || prospect.proof_points.length > 0

  const enrichmentScore = computeEnrichmentScore({
    hasVertical: !!prospect.vertical,
    hasPositioning: !!prospect.positioning,
    hasProofPoints: prospect.proof_points.length > 0,
    hasPersonalizationHooks: prospect.personalization_hooks.length > 0,
    hasWikiFacts: !!prospect.wiki_facts,
    hasDescription: !!prospect.description,
    hasCountry: !!prospect.country,
  })

  return {
    category: prospect.vertical,
    enrichmentScore,
    hasPainPoint,
    hasRecentSignal,
  }
}

function collectPersonalizationSignals(
  prospect: ProspectInput,
  step1: Step1Output | null,
): string[] {
  const signals: string[] = []
  if (prospect.vertical) signals.push(prospect.vertical)
  if (prospect.positioning) signals.push(prospect.positioning)
  signals.push(...prospect.proof_points)
  signals.push(...prospect.personalization_hooks)
  if (prospect.wiki_facts) {
    for (const v of Object.values(prospect.wiki_facts)) {
      if (typeof v === 'string' && v.length > 3) signals.push(v)
    }
  }
  if (step1?.hook_angle) signals.push(step1.hook_angle)
  return signals
}

function parseJsonFromText<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text.match(/\{[\s\S]*\}/)?.[0] ?? text
  try {
    return JSON.parse(candidate.trim()) as T
  } catch {
    return null
  }
}

function toneVariantGuidance(v: ToneVariant): string {
  switch (v) {
    case 'confident_direct':
      return 'Voice markers: short sentences, contrastive openings, bullet density. Direct, "no fluff".'
    case 'consultative':
      return 'Voice markers: longer sentences, formal register, structured paragraphs, no informal sign-off.'
    case 'curiosity_hook':
      return 'Voice markers: open with a question; lighter operational detail in Beat 1, denser later.'
  }
}
