/**
 * Email Validation
 *
 * Deterministic, regex-based post-generation checks for AI-generated
 * prospection emails. Pure functions, no I/O. Reusable across all
 * templates and tone variants.
 *
 * Errors → reject + regenerate.
 * Warnings → log only, allow send.
 */

import {
  FORBIDDEN_PHRASES,
  REQUIRED_PHRASES,
  REQUIRED_PHRASE_MIN_HITS,
  TONE_VARIANT_WORD_RANGES,
  type ToneVariant,
} from './email-canon'

export interface ValidationInput {
  subject: string
  body: string
  toneVariant: ToneVariant
  brandName: string
  personalizationSignals: string[]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

const GENERIC_OPENER_PATTERNS: RegExp[] = [
  /^\s*(?:hi|hello|hey|dear|bonjour|salut|guten tag|sehr geehrte)[^,\n]*[,]\s*\n+\s*i hope this/i,
  /^\s*(?:hi|hello|hey|dear|bonjour|salut|guten tag|sehr geehrte)[^,\n]*[,]\s*\n+\s*my name is/i,
  /^\s*(?:hi|hello|hey|dear|bonjour|salut|guten tag|sehr geehrte)[^,\n]*[,]\s*\n+\s*i'?d like to introduce/i,
  /^\s*(?:hi|hello|hey|dear|bonjour|salut|guten tag|sehr geehrte)[^,\n]*[,]\s*\n+\s*i'?m reaching out to tell you/i,
]

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
  const global = new RegExp(pattern.source, flags)
  const matches = text.match(global)
  return matches ? matches.length : 0
}

function detectBeats(body: string): {
  hasBullets: boolean
  bulletGroups: number
  maxBulletsPerGroup: number
} {
  const lines = body.split(/\n/)
  let inGroup = false
  let groupCount = 0
  let groupSize = 0
  let maxGroup = 0
  for (const line of lines) {
    const isBullet = /^\s*[•\-\*]\s+/.test(line)
    if (isBullet) {
      if (!inGroup) {
        inGroup = true
        groupCount += 1
        groupSize = 0
      }
      groupSize += 1
      maxGroup = Math.max(maxGroup, groupSize)
    } else if (line.trim().length > 0) {
      inGroup = false
    }
  }
  return {
    hasBullets: groupCount > 0,
    bulletGroups: groupCount,
    maxBulletsPerGroup: maxGroup,
  }
}

export function validateGeneratedEmail(input: ValidationInput): ValidationResult {
  const { subject, body, toneVariant, brandName, personalizationSignals } = input
  const errors: string[] = []
  const warnings: string[] = []

  // ---- Forbidden phrases ----
  for (const { pattern, reason } of FORBIDDEN_PHRASES) {
    if (pattern.test(body) || pattern.test(subject)) {
      errors.push(`Forbidden phrase detected (${reason}): /${pattern.source}/`)
    }
  }

  // ---- Required phrases (>= 3 of 4) ----
  let requiredHits = 0
  const missing: string[] = []
  for (const { pattern, label } of REQUIRED_PHRASES) {
    if (pattern.test(body)) {
      requiredHits += 1
    } else {
      missing.push(label)
    }
  }
  if (requiredHits < REQUIRED_PHRASE_MIN_HITS) {
    errors.push(
      `Required phrases: only ${requiredHits}/${REQUIRED_PHRASES.length} present (need ≥${REQUIRED_PHRASE_MIN_HITS}). Missing: ${missing.join(', ')}`,
    )
  }

  // ---- Word count ----
  const wordCount = countWords(body)
  const [minWords, maxWords] = TONE_VARIANT_WORD_RANGES[toneVariant]
  if (wordCount < minWords) {
    errors.push(`Body too short: ${wordCount} words (min ${minWords} for ${toneVariant})`)
  } else if (wordCount > maxWords) {
    errors.push(`Body too long: ${wordCount} words (max ${maxWords} for ${toneVariant})`)
  }

  // ---- Generic opener ----
  for (const pattern of GENERIC_OPENER_PATTERNS) {
    if (pattern.test(body)) {
      errors.push(`Generic opener detected: /${pattern.source}/`)
      break
    }
  }

  // ---- Subject ----
  const subjectIncludesBrand = brandName
    ? subject.toLowerCase().includes(brandName.toLowerCase())
    : false
  const subjectIsQuestion = subject.trim().endsWith('?')
  if (!subjectIncludesBrand && !subjectIsQuestion) {
    errors.push('Subject must contain the brand name OR be phrased as a question')
  }

  // ---- Beat 1 personalization signal ----
  // Heuristic: first 2 paragraphs (separated by blank line) must reference
  // at least one of the provided personalization signals (substring match).
  const firstChunk = body.split(/\n\s*\n/).slice(0, 2).join('\n').toLowerCase()
  const referencedSignal = personalizationSignals.some((sig) => {
    if (!sig || sig.length < 4) return false
    return firstChunk.includes(sig.toLowerCase())
  })
  if (personalizationSignals.length > 0 && !referencedSignal) {
    errors.push(
      'Beat 1 (Hook) does not reference any provided personalization signal',
    )
  }

  // ---- Beats present heuristic ----
  // We require at least 2 distinct bullet groups (Beat 4 outcomes + Beat 5 perks)
  // and the body must contain the operational model (4 lines) — we check this
  // via the merchant-of-record + 1-7 days regex, which already counts toward
  // required phrases. If those passed and we have >=2 bullet groups, beats OK.
  const beats = detectBeats(body)
  if (beats.bulletGroups < 2) {
    errors.push(
      `Expected ≥2 bullet groups (Beat 4 outcomes + Beat 5 perks); found ${beats.bulletGroups}`,
    )
  }

  // ---- Warnings (non-blocking) ----
  if (brandName) {
    const brandRepetitions = countMatches(body, new RegExp(escapeRegex(brandName), 'gi'))
    if (brandRepetitions > 4) {
      warnings.push(`Brand name repeated ${brandRepetitions}× (>4) — may sound robotic`)
    }
  }
  if (beats.maxBulletsPerGroup > 5) {
    warnings.push(`Bullet group with ${beats.maxBulletsPerGroup} items (>5) — consider trimming`)
  }
  const longSentences = body
    .split(/(?<=[.!?])\s+/)
    .filter((s) => countWords(s) > 30)
  if (longSentences.length > 0) {
    warnings.push(`${longSentences.length} sentence(s) exceed 30 words`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
