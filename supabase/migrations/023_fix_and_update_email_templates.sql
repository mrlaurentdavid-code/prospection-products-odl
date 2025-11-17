-- ============================================
-- MIGRATION 023: Fix and update email templates
-- ============================================
-- Description: Corrige le schéma et met à jour les templates d'email
-- ============================================

-- 1. Ajouter le type 'custom' à la contrainte CHECK
ALTER TABLE prospection.email_templates
DROP CONSTRAINT IF EXISTS email_templates_type_check;

ALTER TABLE prospection.email_templates
ADD CONSTRAINT email_templates_type_check
CHECK (type IN ('first_contact', 'followup_1', 'followup_2', 'custom'));

-- 2. Supprimer les anciens templates s'ils existent
DELETE FROM prospection.email_templates WHERE language = 'en';

-- 3. Insérer les templates corrigés
INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body_html
) VALUES (
  'First Contact - English',
  'first_contact',
  'en',
  'Partnership Opportunity – {{company_name}} & O!deal',
  'Hi {{contact_name}},

I hope this message finds you well.

My name is {{sender_name}}. As {{sender_title}} and co-founder of O!deal, I personally handle product partnerships because finding the right brands is critical to what we''re building—a Swiss e-commerce platform dedicated to connecting innovative brands with discerning customers.

I recently discovered your {{product_name}}, and I was genuinely impressed. It''s exactly the kind of breakthrough product our tech-savvy community is actively seeking.

Why O!deal is different:
We''ve built something unique for brands like yours:

• Swiss market access – Thousands of engaged customers in Switzerland
• True autonomy – Unlike traditional platforms, our proprietary offer management module lets you create, adjust, and launch promotions in just a few clicks. No waiting, no intermediaries—you''re in control
• Risk-free partnership – Performance-based model with zero upfront investment
• Brand-first approach – Curated platform where your products get the attention they deserve

Logistics: We work with brands that have stock in Europe for fast, reliable delivery.

I''d love to explore how we could showcase {{company_name}} on our platform.

Would you have 15 minutes this week for a quick intro call?

Looking forward to connecting.

Best regards,
{{sender_name}}
{{sender_title}} & Co-Founder
O!deal | Swiss E-Commerce Platform
🌐 odeal.ch'
);

INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body_html
) VALUES (
  'Follow-up 1 - English',
  'followup_1',
  'en',
  'Following up - {{company_name}} x O!deal Partnership',
  'Hi,

I wanted to follow up on my previous email about featuring {{product_name}} on O!deal.

I understand you''re busy, but I genuinely believe this could be a great opportunity for {{company_name}} to expand your reach in the Swiss and European markets.

Quick reminder of what we offer:
• Zero upfront costs - commission-based model only
• Access to thousands of active customers
• Full marketing and logistics support

If you''re interested or have any questions, I''d be happy to send over more details or schedule a quick call at your convenience.

Thanks for your time!

Best,
{{sender_name}}
O!deal Marketplace'
);

INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body_html
) VALUES (
  'Blank Template',
  'custom',
  'en',
  '',
  ''
);
