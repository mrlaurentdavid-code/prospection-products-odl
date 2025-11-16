-- ============================================
-- MIGRATION 017: Add fields to email_logs
-- Ajoute le corps du message et les infos du contact
-- ============================================

ALTER TABLE prospection.email_logs
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_title VARCHAR(255);

-- Commentaire
COMMENT ON COLUMN prospection.email_logs.body IS 'Corps complet du message envoyé';
COMMENT ON COLUMN prospection.email_logs.contact_name IS 'Nom du contact sollicité';
COMMENT ON COLUMN prospection.email_logs.contact_title IS 'Titre/fonction du contact sollicité';
