-- ============================================
-- MIGRATION 028: Fix template variables to use {{sender_name}} and {{sender_title}}
-- ============================================
-- Description: Remplace "Laurent David" et "CEO" en dur par les variables dynamiques
-- ============================================

UPDATE prospection.email_templates
SET
  subject = 'Partnership Opportunity – {{company_name}} & O!deal',
  body_html = 'Hi {{contact_name}},

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
{{sender_title}}
O!deal | Swiss E-Commerce Platform
🌐 odeal.ch'
WHERE type = 'first_contact' AND language = 'en';

-- Commentaire
COMMENT ON COLUMN prospection.email_templates.body_html IS 'Template HTML. Variables: {{sender_name}}, {{sender_title}}, {{contact_name}}, {{company_name}}, {{product_name}}, {{product_category}}';
