-- ============================================
-- MIGRATION 022: Add custom type to email_templates
-- ============================================
-- Description: Ajoute le type 'custom' à la contrainte CHECK de email_templates
-- ============================================

-- Supprimer l'ancienne contrainte
ALTER TABLE prospection.email_templates
DROP CONSTRAINT IF EXISTS email_templates_type_check;

-- Ajouter la nouvelle contrainte avec 'custom'
ALTER TABLE prospection.email_templates
ADD CONSTRAINT email_templates_type_check
CHECK (type IN ('first_contact', 'followup_1', 'followup_2', 'custom'));
