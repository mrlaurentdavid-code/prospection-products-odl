-- ============================================
-- MIGRATION 041: Make templates work for both products AND brands
-- ============================================
-- Description:
--   Instead of duplicating templates, we make existing templates work for BOTH
--   products and brands by using conditional variable replacement in the app.
--
--   The app logic will decide whether to replace {{entity_name}} with product_name or brand_name
-- Author: Claude Code + Laurent David
-- Date: 2025-11-20
-- ============================================

-- 1. Update existing template names to be generic (not product-specific)
UPDATE prospection.email_templates
SET
  name = 'First Contact - English',
  subject = REPLACE(subject, '{{product_name}}', '{{entity_name}}'),
  body_html = REPLACE(
    REPLACE(body_html, '{{product_name}}', '{{entity_name}}'),
    'your product',
    'your offering'
  )
WHERE type = 'first_contact'
  AND language = 'en'
  AND (name = 'First Contact - English' OR name = 'First Contact - Product - English');

UPDATE prospection.email_templates
SET
  name = 'Follow-up 1 - English',
  subject = REPLACE(subject, '{{product_name}}', '{{entity_name}}'),
  body_html = REPLACE(
    REPLACE(body_html, '{{product_name}}', '{{entity_name}}'),
    'your product',
    'your offering'
  )
WHERE type = 'followup_1'
  AND language = 'en'
  AND (name = 'Follow-up 1 - English' OR name = 'Follow-up 1 - Product - English');

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 041 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Modifications:';
  RAISE NOTICE '  1. Templates rendus génériques pour produits ET marques';
  RAISE NOTICE '  2. {{product_name}} → {{entity_name}}';
  RAISE NOTICE '  3. "your product" → "your offering"';
  RAISE NOTICE '';
  RAISE NOTICE 'Résultat:';
  RAISE NOTICE '  - Les templates fonctionnent maintenant pour produits ET marques';
  RAISE NOTICE '  - L''app remplacera {{entity_name}} par product_name OU brand_name selon le contexte';
  RAISE NOTICE '';
  RAISE NOTICE 'Variables universelles:';
  RAISE NOTICE '  - {{entity_name}} (remplacé par product_name ou brand_name)';
  RAISE NOTICE '  - {{company_name}}';
  RAISE NOTICE '  - {{product_category}}';
  RAISE NOTICE '  - {{sender_name}}';
  RAISE NOTICE '  - {{sender_title}}';
  RAISE NOTICE '============================================';
END $$;
