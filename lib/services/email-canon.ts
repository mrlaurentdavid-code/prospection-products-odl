/**
 * Email Factual Canon
 *
 * Single source of truth for what the AI is allowed to say about O!deal in
 * prospection emails. Imported by the 2-step generation pipeline and the
 * deterministic validation layer.
 *
 * Bumping CANON_VERSION when factual content changes lets us trace which
 * emails were generated under which version of the truth.
 */

export const CANON_VERSION = '2026-05-07'

// ============================================
// SEGMENT-SPECIFIC CANON
// ============================================

interface SegmentCanon {
  positioning: string[]
  operational_model: string[]
  we_handle: string[]
  pre_reg_perks: string[]
}

const BRAND_OWNER_CANON: SegmentCanon = {
  positioning: [
    "Switzerland's flash-sale platform",
    'Swiss flash-sale platform built for brands that want volume in Switzerland',
    'Event-based, time-bound deals',
  ],
  operational_model: [
    'You sell to ODL Group B2B.',
    'ODL Group resells B2C in our name (we are merchant of record).',
    'Each deal is event-based: 1 to 7 days max. You reserve stock for the deal window.',
    'You ship only the units we have sold to our Swiss warehouse. Payment: 80% on compliant receipt, balance at D+15, every Wednesday.',
  ],
  we_handle: [
    'Import & customs',
    'Swiss VAT',
    'Eco-fees (TAR/CAR)',
    'Last-mile delivery',
    'Customer payment (Stripe, TWINT)',
    'Customer service',
    'Optional warranty buy-back',
  ],
  pre_reg_perks: [
    'Priority onboarding when launch opens',
    'Free premium features for 12 months — priority listing, advanced analytics, early access to new features',
  ],
}

const DISTRIBUTOR_CANON: SegmentCanon = {
  positioning: [
    "Switzerland's flash-sale platform",
    'A non-cannibalizing Swiss flash-sale channel for multi-brand portfolios',
    'Event-based deals you control SKU by SKU',
  ],
  operational_model: [
    'You sell to ODL Group B2B from your portfolio — you choose which brands and SKUs.',
    'ODL Group resells B2C in our name (we are merchant of record), so your existing retail relationships are not exposed.',
    'Each deal is event-based: 1 to 7 days max. You reserve stock for the deal window.',
    'You ship only the units we have sold to our Swiss warehouse. Payment: 80% on compliant receipt, balance at D+15, every Wednesday.',
  ],
  we_handle: [
    'Import & customs',
    'Swiss VAT',
    'Eco-fees (TAR/CAR)',
    'Last-mile delivery',
    'Customer payment (Stripe, TWINT)',
    'Customer service',
    'Optional warranty buy-back',
  ],
  pre_reg_perks: [
    'Priority onboarding when launch opens',
    'Free premium features for 12 months — priority listing, advanced analytics, early access to new features',
  ],
}

export const FACTUAL_CANON = {
  brand_owner: BRAND_OWNER_CANON,
  distributor: DISTRIBUTOR_CANON,
} as const

export type CanonSegment = keyof typeof FACTUAL_CANON

// ============================================
// CTA URLS (Phase 1 defaults)
// ============================================

export const PRELAUNCH_URL = 'https://odeal.ch/entry'

// ============================================
// FORBIDDEN PHRASES (auto-reject + regenerate)
// ============================================

export const FORBIDDEN_PHRASES: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bno stock\b|\bzero stock\b|no stock to immobilize/i, reason: 'Inaccurate — stock IS reserved during the deal window' },
  { pattern: /\bpre-?order\b|\bpre-?commande\b/i, reason: 'Inaccurate — products are existing, not unreleased' },
  { pattern: /long-term partnership|ongoing contract|recurring relationship/i, reason: 'Inaccurate — deals are punctual, event-based' },
  { pattern: /risk of unsold/i, reason: 'Inaccurate — suppliers ship only sold quantities' },
  { pattern: /hope this email finds you/i, reason: 'Generic opener — Carnegie violation' },
  { pattern: /my name is laurent/i, reason: 'Self-centered opener — Carnegie violation' },
  { pattern: /i'?d like to introduce/i, reason: 'Self-centered opener — Carnegie violation' },
  { pattern: /i'?m reaching out to tell you/i, reason: 'Self-centered opener — Carnegie violation' },
  { pattern: /\bmarketplace\b/i, reason: 'Forbidden by O!deal positioning rules' },
]

// ============================================
// REQUIRED PHRASES (must include >= 3 of 4)
// ============================================

export const REQUIRED_PHRASES: { pattern: RegExp; label: string }[] = [
  { pattern: /merchant of record/i, label: 'merchant of record' },
  { pattern: /8\.7\s*m(?:illion)?\s+swiss\s+consumers/i, label: '8.7M Swiss consumers' },
  { pattern: /(?:1\s*[–—\-]\s*7\s*days|max(?:imum)?\s*7\s*days)/i, label: '1–7 days / max 7 days' },
  { pattern: /80\s*%\s*on\s*compliant\s*receipt[\s\S]{0,40}d\s*\+\s*15/i, label: '80% on compliant receipt, balance at D+15' },
]

export const REQUIRED_PHRASE_MIN_HITS = 3

// ============================================
// TONE VARIANT WORD-COUNT RANGES (brief §6)
// ============================================

export type ToneVariant = 'confident_direct' | 'consultative' | 'curiosity_hook'

export const TONE_VARIANT_WORD_RANGES: Record<ToneVariant, [number, number]> = {
  confident_direct: [180, 280],
  curiosity_hook: [180, 280],
  consultative: [220, 350],
}

// ============================================
// SIGN-OFFS PER TONE VARIANT (brief §3)
// ============================================

export const TONE_VARIANT_SIGNOFFS: Record<ToneVariant, string> = {
  confident_direct: 'À très vite,',
  consultative: 'Best regards,',
  curiosity_hook: 'Talk soon,',
}
