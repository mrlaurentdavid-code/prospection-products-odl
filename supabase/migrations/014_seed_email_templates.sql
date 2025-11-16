-- ============================================
-- MIGRATION 014: Seed email templates
-- ============================================
-- Description: Ajoute les templates d'email par défaut (EN)
-- Author: Claude Code + Laurent David
-- Date: 2025-11-16
-- ============================================

-- Template 1: First Contact (EN)
INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body,
  is_active
) VALUES (
  'First Contact - English',
  'first_contact',
  'en',
  'Partnership Opportunity with {{company_name}} for O!deal Marketplace',
  'Hi,

I hope this email finds you well.

My name is {{sender_name}}, and I''m the {{sender_title}} at O!deal, a Swiss marketplace connecting innovative brands with customers across Europe.

I recently came across your product "{{product_name}}" and was really impressed by what you''ve built. It perfectly aligns with what our customers in the {{product_category}} category are looking for.

We''d love to explore a potential partnership to feature your products on our platform. O!deal gives brands like yours access to:
• Thousands of active customers in Switzerland and Europe
• A simple, commission-based sales model (no upfront costs)
• Marketing support and dedicated account management

Would you be open to a quick 15-minute call to discuss this opportunity?

Looking forward to hearing from you.

Best regards,
{{sender_name}}
{{sender_title}}
O!deal Marketplace
https://odeal.ch',
  true
);

-- Template 2: Follow-up 1 (EN)
INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body,
  is_active
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
O!deal Marketplace',
  true
);

-- Template 3: Blank Template
INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body,
  is_active
) VALUES (
  'Blank Template',
  'custom',
  'en',
  '',
  '',
  true
);

-- Commentaire
COMMENT ON TABLE prospection.email_templates IS 'Templates d''emails pour la prospection. Variables disponibles: {{company_name}}, {{product_name}}, {{product_category}}, {{sender_name}}, {{sender_title}}';
