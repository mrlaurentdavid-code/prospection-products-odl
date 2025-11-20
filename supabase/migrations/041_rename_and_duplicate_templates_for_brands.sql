-- ============================================
-- MIGRATION 041: Rename existing templates and create brand versions
-- ============================================
-- Description:
--   1. Rename "First Contact - English" → "First Contact - Product - English"
--   2. Rename "Follow-up 1 - English" → "Follow-up 1 - Product - English"
--   3. Duplicate both templates for brands (replacing product_name with brand_name)
-- Author: Claude Code + Laurent David
-- Date: 2025-11-20
-- ============================================

-- 1. Update existing template names to include "- Product -"
UPDATE prospection.email_templates
SET name = 'First Contact - Product - English'
WHERE type = 'first_contact'
  AND language = 'en'
  AND name = 'First Contact - English';

UPDATE prospection.email_templates
SET name = 'Follow-up 1 - Product - English'
WHERE type = 'followup_1'
  AND language = 'en'
  AND name = 'Follow-up 1 - English';

-- 2. Create brand version of First Contact - English
INSERT INTO prospection.email_templates (
  name,
  type,
  subject,
  body_html,
  language
)
SELECT
  'First Contact - Brand - English',
  type,
  REPLACE(subject, '{{product_name}}', '{{brand_name}}'),
  REPLACE(
    REPLACE(body_html, '{{product_name}}', '{{brand_name}}'),
    'your product',
    'your brand'
  ),
  language
FROM prospection.email_templates
WHERE type = 'first_contact'
  AND language = 'en'
  AND name = 'First Contact - Product - English';

-- 3. Create brand version of Follow-up 1 - English
INSERT INTO prospection.email_templates (
  name,
  type,
  subject,
  body_html,
  language
)
SELECT
  'Follow-up 1 - Brand - English',
  type,
  REPLACE(subject, '{{product_name}}', '{{brand_name}}'),
  REPLACE(
    REPLACE(body_html, '{{product_name}}', '{{brand_name}}'),
    'your product',
    'your brand'
  ),
  language
FROM prospection.email_templates
WHERE type = 'followup_1'
  AND language = 'en'
  AND name = 'Follow-up 1 - Product - English';

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
  RAISE NOTICE '  1. "First Contact - English" → "First Contact - Product - English"';
  RAISE NOTICE '  2. "Follow-up 1 - English" → "Follow-up 1 - Product - English"';
  RAISE NOTICE '  3. Créé "First Contact - Brand - English" (dupliqué depuis Product)';
  RAISE NOTICE '  4. Créé "Follow-up 1 - Brand - English" (dupliqué depuis Product)';
  RAISE NOTICE '';
  RAISE NOTICE 'Résultat:';
  RAISE NOTICE '  - Total 5 templates: 1 blank + 2 product + 2 brand';
  RAISE NOTICE '  - Templates brand utilisent {{brand_name}} au lieu de {{product_name}}';
  RAISE NOTICE '';
  RAISE NOTICE 'Variables templates Brand:';
  RAISE NOTICE '  - {{brand_name}}';
  RAISE NOTICE '  - {{company_name}}';
  RAISE NOTICE '  - {{product_category}} (categories de la marque)';
  RAISE NOTICE '  - {{sender_name}}';
  RAISE NOTICE '  - {{sender_title}}';
  RAISE NOTICE '============================================';
END $$;
