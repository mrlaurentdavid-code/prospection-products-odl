-- ============================================
-- PRE-REGISTER TEMPLATES (Phase 1)
-- ============================================
-- Adds:
--   1. tone_variant column on email_templates (content-strategy variants
--      from the new factual-canon architecture)
--   2. email_generation_logs table (per-attempt structured logging)
--   3. 6 anchor templates: BRAND_OWNER × {confident_direct, consultative,
--      curiosity_hook} + DISTRIBUTOR × {confident_direct, consultative,
--      curiosity_hook}, all EN, type='pre_register', pitch=ODEAL
--
-- These anchors are loaded as few-shot examples by lib/services/email-pipeline.ts
-- when generating personalized pre-register emails.

-- ============================================
-- 1. Schema additions
-- ============================================

ALTER TABLE email_templates
  ADD COLUMN tone_variant TEXT
  CHECK (tone_variant IS NULL OR tone_variant IN ('confident_direct', 'consultative', 'curiosity_hook'));

COMMENT ON COLUMN email_templates.tone_variant IS
  'Content-strategy variant for the 2-step generation pipeline. Distinct from EmailTone (formal/premium/friendly/bk) which controls greeting/closing micro-styling.';

CREATE TABLE email_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  tone_variant_used TEXT NOT NULL,
  personalization_signals_used JSONB DEFAULT '[]'::jsonb,
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  regeneration_count INT DEFAULT 0,
  canon_version TEXT,
  ok BOOLEAN DEFAULT TRUE,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_generation_logs_lead_id ON email_generation_logs(lead_id);
CREATE INDEX idx_email_generation_logs_created_at ON email_generation_logs(created_at DESC);

ALTER TABLE email_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage email_generation_logs"
  ON email_generation_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- 2. Anchor templates — BRAND_OWNER (3 tone variants)
-- ============================================

INSERT INTO email_templates (name, type, org_type, pitch_type, language, tone_variant, subject, body, variables) VALUES

-- BRAND_OWNER · Confident Direct
(
  'Pre-Register BRAND_OWNER EN — Confident Direct',
  'pre_register',
  'BRAND_OWNER',
  'ODEAL',
  'en',
  'confident_direct',
  'Switzerland needs {{brand_name}}. We''ve built the shortcut.',
  E'Hi {{contact_name}},

Most brands skip Switzerland entirely. The setup is brutal — local entity, Swiss VAT registration, B2C logistics across 26 cantons. The ones that don''t skip it spend a year and a chunk of cash getting there.

We built O!deal to make all that irrelevant.

How it works:
• You sell to us B2B. We resell B2C in our name (we''re merchant of record).
• You propose an offer in our portal. We agree on a deal date (1–7 days).
• You reserve stock for the deal window. You ship only what we''ve sold to our Swiss warehouse.
• We pay 80% on compliant receipt, balance at D+15. Every Wednesday.

What that means for {{brand_name}}:
• Direct access to 8.7M Swiss consumers — no local entity, no VAT setup, no Swiss bureaucracy.
• We handle import, customs, Swiss VAT, eco-fees, last-mile, customer service, optional warranty buy-back.
• Only sold units ever leave your warehouse — you reserve stock for the deal window, ship what sells.
• Event-based deals (max 7 days), not permanent discounting — no reseller cannibalization, premium positioning protected.

We''re opening the platform to brands in successive waves. Pre-registered brands get:
• Priority onboarding when launch opens.
• Free premium features for 12 months — priority listing, advanced analytics, early access to new features.

Reserve your slot in 30 seconds: {{prelaunch_url}}
Prefer to talk it through first? Block a 30-min strategy call with me: {{meeting_url}}

À très vite,
{{sender_name}}',
  '["brand_name","contact_name","personalization_hook","sender_name","prelaunch_url","meeting_url"]'::jsonb
),

-- BRAND_OWNER · Consultative
(
  'Pre-Register BRAND_OWNER EN — Consultative',
  'pre_register',
  'BRAND_OWNER',
  'ODEAL',
  'en',
  'consultative',
  'An early invitation for {{brand_name}} — O!deal, Switzerland',
  E'Dear {{contact_name}},

For most international brands, entering the Swiss market is a structural decision: a local entity, VAT registration, B2C infrastructure, and a reseller network to manage. The barrier is high enough that many brands either delay entry indefinitely or accept compromised channels.

I''m reaching out because {{brand_name}} is exactly the type of brand we built O!deal for — a Swiss flash-sale platform designed as an event-based market entry vehicle, with no compromise to your positioning. {{personalization_hook}}

The model is straightforward:
• Your company sells to ODL Group B2B.
• ODL Group, as merchant of record, resells to the Swiss end customer in our name.
• Each deal lasts between 1–7 days; you reserve stock for the deal window.
• You ship only the quantities effectively sold to our Swiss warehouse. Payment terms: 80% on compliant receipt, balance at D+15, every Wednesday.

What this means for {{brand_name}}:
• Access to 8.7M Swiss consumers — among the highest purchasing power in Europe — without setting up a local entity.
• A complete operational handover: import, customs, Swiss VAT, eco-contributions, last-mile, customer service, optional warranty buy-back.
• Event-based deals only — no permanent discounting, protecting your premium positioning and your reseller network.
• Only sold units ever leave your warehouse, since you ship after sale closes.

We are opening the platform to brands in successive waves. Pre-registered brands receive:
• Priority onboarding when launch opens.
• Free premium features for 12 months — priority listing, advanced analytics, early access to new features.

Pre-register here: {{prelaunch_url}}
I would also be glad to walk you through the operational flow and discuss {{brand_name}}''s specific fit. You can book a 30-minute strategy call here: {{meeting_url}}

Best regards,
{{sender_name}}',
  '["brand_name","contact_name","personalization_hook","sender_name","prelaunch_url","meeting_url"]'::jsonb
),

-- BRAND_OWNER · Curiosity Hook
(
  'Pre-Register BRAND_OWNER EN — Curiosity Hook',
  'pre_register',
  'BRAND_OWNER',
  'ODEAL',
  'en',
  'curiosity_hook',
  'What if {{brand_name}} could test Switzerland in 7 days?',
  E'Hi {{contact_name}},

Quick question: what would a confidential, time-bound test of {{brand_name}} in the Swiss market look like — without setting up a local entity, without disrupting your reseller network, and without ever carrying unsold inventory?

That''s exactly what we''ve built O!deal for.

In 4 lines:
• You sell to us B2B. We resell B2C in our name (we''re merchant of record).
• You propose an offer in our portal. We set the deal date together (1–7 days).
• You reserve stock for the deal window. You ship only what we''ve sold to our Swiss warehouse.
• We pay 80% on compliant receipt, balance at D+15. Every Wednesday.

The result for {{brand_name}}:
• Access to 8.7M Swiss consumers — no local entity, no VAT registration.
• We handle import, customs, Swiss VAT, eco-fees, last-mile, customer service.
• Only sold units leave your warehouse — zero unsold inventory exposure.
• Event-based deals (max 7 days) — no permanent discounting, no cannibalization.

We''re opening the platform to brands in waves. Pre-registered ones get:
• Priority onboarding when launch opens.
• Free premium features for 12 months — priority listing, advanced analytics, early access to new features.

Reserve your slot in 30 seconds: {{prelaunch_url}}
Or block a 30-min strategy call with me: {{meeting_url}}

Talk soon,
{{sender_name}}',
  '["brand_name","contact_name","personalization_hook","sender_name","prelaunch_url","meeting_url"]'::jsonb
);

-- ============================================
-- 3. Anchor templates — DISTRIBUTOR (3 tone variants)
-- ============================================
-- Distributor angle: portfolio-level value props (you choose which brands/SKUs,
-- non-cannibalizing channel for existing retail relationships, SKU-level control).

INSERT INTO email_templates (name, type, org_type, pitch_type, language, tone_variant, subject, body, variables) VALUES

-- DISTRIBUTOR · Confident Direct
(
  'Pre-Register DISTRIBUTOR EN — Confident Direct',
  'pre_register',
  'DISTRIBUTOR',
  'ODEAL',
  'en',
  'confident_direct',
  '{{brand_name}}: a non-cannibalizing Swiss channel for your portfolio',
  E'Hi {{contact_name}},

Most distributors leave entire SKU ranges underleveraged in Switzerland — slow movers, overstock, end-of-life inventory, exclusive lines you can''t place with your existing retail partners without breaking pricing.

We built O!deal so you can move that volume without touching the rest.

How it works:
• You sell to us B2B from your portfolio — you choose which brands and which SKUs.
• We resell B2C in our name (we''re merchant of record), so your retail relationships stay clean.
• Each deal is event-based: 1–7 days max. You reserve stock for the deal window.
• You ship only what we''ve sold to our Swiss warehouse. We pay 80% on compliant receipt, balance at D+15. Every Wednesday.

What that means for {{brand_name}}:
• Direct reach to 8.7M Swiss consumers — without exposing your traditional retail network.
• You stay in control SKU by SKU — no obligation to flash-sale your hero products.
• We handle import, customs, Swiss VAT, eco-fees, last-mile, customer service, optional warranty buy-back.
• Event-based deals (max 7 days), prices hidden after — no permanent discounting trail on your portfolio brands.

We''re opening the platform in successive waves. Pre-registered distributors get:
• Priority onboarding when launch opens.
• Free premium features for 12 months — priority listing, advanced analytics, early access to new features.

Reserve your slot in 30 seconds: {{prelaunch_url}}
Prefer to talk it through first? Block a 30-min strategy call with me: {{meeting_url}}

À très vite,
{{sender_name}}',
  '["brand_name","contact_name","personalization_hook","sender_name","prelaunch_url","meeting_url"]'::jsonb
),

-- DISTRIBUTOR · Consultative
(
  'Pre-Register DISTRIBUTOR EN — Consultative',
  'pre_register',
  'DISTRIBUTOR',
  'ODEAL',
  'en',
  'consultative',
  'An early invitation for {{brand_name}} — O!deal, Switzerland',
  E'Dear {{contact_name}},

For multi-brand distributors, the Swiss market presents a structural tension: existing retail partnerships impose pricing discipline, while overstock, slow movers, and exclusive lines accumulate without a clean liquidation path. Most distributors either accept the carrying cost or compromise their channel positioning.

I''m reaching out because {{brand_name}} is exactly the type of distributor we built O!deal for — a Swiss flash-sale platform that operates as a separate, non-cannibalizing channel. {{personalization_hook}}

The operating model is straightforward:
• Your company sells to ODL Group B2B from your existing portfolio — you select brands and SKUs deal by deal.
• ODL Group, as merchant of record, resells to the Swiss end customer in our name. Your retail partners are not exposed.
• Each deal lasts 1–7 days; you reserve stock for the deal window.
• You ship only the quantities effectively sold to our Swiss warehouse. Payment terms: 80% on compliant receipt, balance at D+15, every Wednesday.

What this means for {{brand_name}}:
• Direct access to 8.7M Swiss consumers — among the highest purchasing power in Europe.
• Granular SKU-level control: you decide which products move through this channel and which remain exclusive to traditional retail.
• A complete operational handover: import, customs, Swiss VAT, eco-contributions, last-mile, customer service, optional warranty buy-back.
• Event-based deals only — no permanent discounting trail, protecting brand positioning across your portfolio.

We are opening the platform in successive waves. Pre-registered distributors receive:
• Priority onboarding when launch opens.
• Free premium features for 12 months — priority listing, advanced analytics, early access to new features.

Pre-register here: {{prelaunch_url}}
I would also be glad to walk you through the model and discuss {{brand_name}}''s portfolio fit. You can book a 30-minute strategy call here: {{meeting_url}}

Best regards,
{{sender_name}}',
  '["brand_name","contact_name","personalization_hook","sender_name","prelaunch_url","meeting_url"]'::jsonb
),

-- DISTRIBUTOR · Curiosity Hook
(
  'Pre-Register DISTRIBUTOR EN — Curiosity Hook',
  'pre_register',
  'DISTRIBUTOR',
  'ODEAL',
  'en',
  'curiosity_hook',
  'What if {{brand_name}} could clear Swiss volume without touching retail?',
  E'Hi {{contact_name}},

Quick question: what would a Swiss channel look like that lets {{brand_name}} move overstock, exclusives, or slow movers — without disturbing your retail network, without permanent price erosion, and without ever shipping unsold inventory?

That''s exactly what we''ve built O!deal for.

In 4 lines:
• You sell to us B2B from your portfolio. We resell B2C in our name (we''re merchant of record).
• You propose an offer in our portal. We set the deal date together (1–7 days).
• You reserve stock for the deal window. You ship only what we''ve sold to our Swiss warehouse.
• We pay 80% on compliant receipt, balance at D+15. Every Wednesday.

The result for {{brand_name}}:
• Direct reach to 8.7M Swiss consumers, separate from your existing retail channel.
• SKU-level control — you choose what enters each deal, deal by deal.
• We handle import, customs, Swiss VAT, eco-fees, last-mile, customer service.
• Event-based deals (max 7 days), prices hidden after — no permanent discounting trail.

We''re opening the platform in waves. Pre-registered distributors get:
• Priority onboarding when launch opens.
• Free premium features for 12 months — priority listing, advanced analytics, early access to new features.

Reserve your slot in 30 seconds: {{prelaunch_url}}
Or block a 30-min strategy call with me: {{meeting_url}}

Talk soon,
{{sender_name}}',
  '["brand_name","contact_name","personalization_hook","sender_name","prelaunch_url","meeting_url"]'::jsonb
);
