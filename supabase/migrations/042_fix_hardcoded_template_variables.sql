-- ============================================
-- MIGRATION 042: Fix hardcoded values in templates
-- ============================================
-- Description:
--   Replace hardcoded "Laurent David" and "CEO & Co-Funder" with variables
--   {{sender_name}} and {{sender_title}} in all templates
-- Author: Claude Code + Laurent David
-- Date: 2025-11-20
-- ============================================

-- Fix First Contact templates (both Product and Brand if they exist)
UPDATE prospection.email_templates
SET body_html = REPLACE(
  REPLACE(
    REPLACE(body_html, 'Laurent David', '{{sender_name}}'),
    'CEO & Co-Funder',
    '{{sender_title}}'
  ),
  'My name is {{sender_name}}',
  'My name is {{sender_name}}'
)
WHERE type = 'first_contact'
  AND body_html LIKE '%Laurent David%';

-- Fix Follow-up templates (both Product and Brand if they exist)
UPDATE prospection.email_templates
SET body_html = REPLACE(
  REPLACE(
    REPLACE(body_html, 'Laurent David', '{{sender_name}}'),
    'CEO & Co-Funder',
    '{{sender_title}}'
  ),
  'My name is {{sender_name}}',
  'My name is {{sender_name}}'
)
WHERE type = 'followup_1'
  AND body_html LIKE '%Laurent David%';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 042 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Modifications:';
  RAISE NOTICE '  1. Remplacé "Laurent David" par {{sender_name}}';
  RAISE NOTICE '  2. Remplacé "CEO & Co-Funder" par {{sender_title}}';
  RAISE NOTICE '';
  RAISE NOTICE 'Résultat:';
  RAISE NOTICE '  - Les templates sont maintenant dynamiques pour tous les utilisateurs';
  RAISE NOTICE '  - {{sender_name}} sera remplacé par le nom complet de l''utilisateur';
  RAISE NOTICE '  - {{sender_title}} sera remplacé par le titre de l''utilisateur';
  RAISE NOTICE '============================================';
END $$;
