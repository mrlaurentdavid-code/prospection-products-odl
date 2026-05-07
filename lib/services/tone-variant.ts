/**
 * Tone Variant Selection
 *
 * Implements brief §4: maps prospect classification fields to one of three
 * content-strategy tone variants used by the 2-step generation pipeline.
 *
 * This is distinct from `tone-engine.ts` (formal/premium/friendly/bk),
 * which controls greeting/closing micro-styling and is kept untouched.
 */

import type { ToneVariant } from './email-canon'

const PREMIUM_CATEGORIES = new Set([
  'luxury',
  'jewelry',
  'jewellery',
  'fine_cosmetics',
  'fine cosmetics',
  'wines_spirits_premium',
  'wines & spirits',
  'haute couture',
  'high jewelry',
  'horlogerie',
  'watchmaking',
])

const DEFAULT_ENRICHMENT_THRESHOLD = 60

function getEnrichmentThreshold(): number {
  const raw = process.env.EMAIL_ENRICHMENT_THRESHOLD
  if (!raw) return DEFAULT_ENRICHMENT_THRESHOLD
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : DEFAULT_ENRICHMENT_THRESHOLD
}

export interface ToneVariantInput {
  tier?: 'premium' | 'mid' | 'mass' | null
  category?: string | null
  sizeBucket?: 'sme' | 'mid' | 'large_corp' | null
  enrichmentScore?: number | null
  hasPainPoint?: boolean
  hasRecentSignal?: boolean
}

export function selectToneVariant(input: ToneVariantInput): ToneVariant {
  const { tier, category, sizeBucket, enrichmentScore, hasPainPoint, hasRecentSignal } = input

  // 1. Premium / luxury / large corporate → consultative
  const normalizedCategory = (category || '').toLowerCase().trim()
  if (
    tier === 'premium' ||
    PREMIUM_CATEGORIES.has(normalizedCategory) ||
    sizeBucket === 'large_corp'
  ) {
    return 'consultative'
  }

  // 2. Thin enrichment → curiosity hook
  const threshold = getEnrichmentThreshold()
  const score = typeof enrichmentScore === 'number' ? enrichmentScore : 100
  if (score < threshold || (!hasPainPoint && !hasRecentSignal)) {
    return 'curiosity_hook'
  }

  // 3. Default
  return 'confident_direct'
}

/**
 * Compute an enrichment score from an analysis brief.
 *
 * Heuristic: count populated, useful fields. Each populated signal is worth
 * a fixed weight; the result is clamped to [0, 100].
 */
export function computeEnrichmentScore(input: {
  hasVertical?: boolean
  hasPositioning?: boolean
  hasProofPoints?: boolean
  hasPersonalizationHooks?: boolean
  hasWikiFacts?: boolean
  hasDescription?: boolean
  hasCountry?: boolean
}): number {
  const weights: Array<[boolean | undefined, number]> = [
    [input.hasVertical, 15],
    [input.hasPositioning, 15],
    [input.hasProofPoints, 20],
    [input.hasPersonalizationHooks, 25],
    [input.hasWikiFacts, 15],
    [input.hasDescription, 5],
    [input.hasCountry, 5],
  ]
  const total = weights.reduce((sum, [present, w]) => sum + (present ? w : 0), 0)
  return Math.min(100, total)
}
