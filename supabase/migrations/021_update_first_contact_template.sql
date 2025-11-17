-- ============================================
-- MIGRATION 021: Update first contact email template
-- ============================================
-- Description: Met à jour le template de premier contact avec le nouveau format Laurent
-- ============================================

UPDATE prospection.email_templates
SET
  subject = 'Partnership Opportunity – {{company_name}} & O!deal',
  body_html = 'Hi {{contact_name}},

I hope this message finds you well.

My name is Laurent David. As CEO and co-founder of O!deal, I personally handle product partnerships because finding the right brands is critical to what we''re building—a Swiss e-commerce platform dedicated to connecting innovative brands with discerning customers.

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
Laurent David
CEO & Co-Founder
O!deal | Swiss E-Commerce Platform
🌐 odeal.ch'
WHERE type = 'first_contact' AND language = 'en';
