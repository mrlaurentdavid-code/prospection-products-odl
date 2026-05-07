/**
 * Email generation logging
 *
 * Phase 1 minimal logging: writes one structured row per email-generation
 * attempt to `email_generation_logs`. Conversion tracking (open/reply/
 * pre-register/book) is deferred to Phase 2.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ToneVariant } from './email-canon'

export interface GenerationLogInput {
  lead_id: string
  template_type: string
  tone_variant_used: ToneVariant
  personalization_signals_used: string[]
  validation_warnings: string[]
  validation_errors: string[]
  regeneration_count: number
  canon_version: string
  ok: boolean
  tokens_used: number
}

export async function logEmailGeneration(
  supabase: SupabaseClient,
  input: GenerationLogInput,
): Promise<void> {
  // Best-effort logging — never throw or block the response.
  try {
    await supabase.from('email_generation_logs').insert({
      lead_id: input.lead_id,
      template_type: input.template_type,
      tone_variant_used: input.tone_variant_used,
      personalization_signals_used: input.personalization_signals_used,
      validation_warnings: input.validation_warnings,
      validation_errors: input.validation_errors,
      regeneration_count: input.regeneration_count,
      canon_version: input.canon_version,
      ok: input.ok,
      tokens_used: input.tokens_used,
    })
  } catch (e) {
    console.error('email-generation-logs insert failed:', e)
  }
}
