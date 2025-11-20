-- ============================================
-- MIGRATION 041 V2: Rename and duplicate templates for products AND brands (FIXED)
-- ============================================
-- Description:
--   1. Drop and recreate UNIQUE constraint (idempotent)
--   2. Rename existing templates to add "- Product -"
--   3. Duplicate templates for brands with "- Brand -" and {{brand_name}} variable
-- Author: Claude Code + Laurent David
-- Date: 2025-11-20 (V2)
-- ============================================

-- 1. Drop the old UNIQUE constraint if it exists
ALTER TABLE prospection.email_templates
DROP CONSTRAINT IF EXISTS email_templates_language_type_key;

-- 2. Drop and recreate new UNIQUE constraint (idempotent)
ALTER TABLE prospection.email_templates
DROP CONSTRAINT IF EXISTS email_templates_language_type_name_key;

ALTER TABLE prospection.email_templates
ADD CONSTRAINT email_templates_language_type_name_key UNIQUE (language, type, name);

-- 3. Rename existing "First Contact - English" to "First Contact - Product - English" (only if not already renamed)
UPDATE prospection.email_templates
SET name = 'First Contact - Product - English'
WHERE type = 'first_contact'
  AND language = 'en'
  AND name = 'First Contact - English';

-- 4. Rename existing "Follow-up 1 - English" to "Follow-up 1 - Product - English" (only if not already renamed)
UPDATE prospection.email_templates
SET name = 'Follow-up 1 - Product - English'
WHERE type = 'followup_1'
  AND language = 'en'
  AND name = 'Follow-up 1 - English';

-- 5. Delete any existing Brand templates (cleanup from failed previous attempts)
DELETE FROM prospection.email_templates
WHERE name IN ('First Contact - Brand - English', 'Follow-up 1 - Brand - English');

-- 6. Duplicate "First Contact - Product - English" for brands
INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body_html,
  created_at,
  updated_at
)
SELECT
  'First Contact - Brand - English',
  type,
  language,
  REPLACE(subject, '{{product_name}}', '{{brand_name}}'),
  REPLACE(
    REPLACE(body_html, '{{product_name}}', '{{brand_name}}'),
    'your product',
    'your brand'
  ),
  NOW(),
  NOW()
FROM prospection.email_templates
WHERE type = 'first_contact'
  AND language = 'en'
  AND name = 'First Contact - Product - English';

-- 7. Duplicate "Follow-up 1 - Product - English" for brands
INSERT INTO prospection.email_templates (
  name,
  type,
  language,
  subject,
  body_html,
  created_at,
  updated_at
)
SELECT
  'Follow-up 1 - Brand - English',
  type,
  language,
  REPLACE(subject, '{{product_name}}', '{{brand_name}}'),
  REPLACE(
    REPLACE(body_html, '{{product_name}}', '{{brand_name}}'),
    'your product',
    'your brand'
  ),
  NOW(),
  NOW()
FROM prospection.email_templates
WHERE type = 'followup_1'
  AND language = 'en'
  AND name = 'Follow-up 1 - Product - English';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
DECLARE
  v_template_count INT;
BEGIN
  SELECT COUNT(*) INTO v_template_count
  FROM prospection.email_templates
  WHERE type IN ('first_contact', 'followup_1');

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 041 V2 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Modifications:';
  RAISE NOTICE '  1. Supprimé contrainte UNIQUE (language, type) si existe';
  RAISE NOTICE '  2. Recréé contrainte UNIQUE (language, type, name)';
  RAISE NOTICE '  3. Renommé: "First Contact - English" → "First Contact - Product - English"';
  RAISE NOTICE '  4. Renommé: "Follow-up 1 - English" → "Follow-up 1 - Product - English"';
  RAISE NOTICE '  5. Nettoyé anciens templates Brand';
  RAISE NOTICE '  6. Créé: "First Contact - Brand - English"';
  RAISE NOTICE '  7. Créé: "Follow-up 1 - Brand - English"';
  RAISE NOTICE '';
  RAISE NOTICE 'Résultat:';
  RAISE NOTICE '  - Total templates (first_contact + followup_1): %', v_template_count;
  RAISE NOTICE '  - Templates produit utilisent: {{product_name}}';
  RAISE NOTICE '  - Templates marque utilisent: {{brand_name}}';
  RAISE NOTICE '';
  RAISE NOTICE 'Variables produit:';
  RAISE NOTICE '  - {{product_name}}, {{company_name}}, {{product_category}}';
  RAISE NOTICE '  - {{sender_name}}, {{sender_title}}, {{contact_name}}';
  RAISE NOTICE '';
  RAISE NOTICE 'Variables marque:';
  RAISE NOTICE '  - {{brand_name}}, {{company_name}}, {{product_category}}';
  RAISE NOTICE '  - {{sender_name}}, {{sender_title}}, {{contact_name}}';
  RAISE NOTICE '============================================';
END $$;
