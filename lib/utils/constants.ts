// Statuts des produits
export const PRODUCT_STATUSES = {
  TO_REVIEW: 'to_review',
  STANDBY: 'standby',
  CONTACTED: 'contacted',
  ARCHIVED: 'archived',
} as const;

export type ProductStatus = typeof PRODUCT_STATUSES[keyof typeof PRODUCT_STATUSES];

// Types de sources
export const SOURCE_TYPES = {
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TIKTOK: 'tiktok',
  WEBSITE: 'website',
  OTHER: 'other',
} as const;

export type SourceType = typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES];

// Langues supportées
export const LANGUAGES = {
  EN: 'en',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
} as const;

export type Language = typeof LANGUAGES[keyof typeof LANGUAGES];

// Types de templates email
export const EMAIL_TEMPLATE_TYPES = {
  FIRST_CONTACT: 'first_contact',
  FOLLOWUP_1: 'followup_1',
  FOLLOWUP_2: 'followup_2',
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[keyof typeof EMAIL_TEMPLATE_TYPES];

// Statuts des emails
export const EMAIL_STATUSES = {
  SENT: 'sent',
  OPENED: 'opened',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
} as const;

export type EmailStatus = typeof EMAIL_STATUSES[keyof typeof EMAIL_STATUSES];

// Seuil de confiance de l'IA
export const AI_CONFIDENCE_THRESHOLD = 0.7;

// Limites
export const LIMITS = {
  MAX_IMAGES_PER_PRODUCT: 10,
  MAX_VIDEOS_PER_PRODUCT: 5,
  PRODUCT_DESCRIPTION_MAX_LENGTH: 500,
} as const;
