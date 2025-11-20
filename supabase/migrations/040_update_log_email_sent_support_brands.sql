-- ============================================
-- MIGRATION 040: Update log_email_sent to support brands
-- ============================================
-- Description: Modifie log_email_sent pour accepter brand_id en plus de product_id
-- Author: Claude Code + Laurent David
-- Date: 2025-11-19
-- ============================================

-- 1. Add brand_id column to email_logs table
ALTER TABLE prospection.email_logs
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES prospection.brands(id) ON DELETE CASCADE;

-- 2. Make product_id nullable (since we can have brand_id instead)
ALTER TABLE prospection.email_logs
ALTER COLUMN product_id DROP NOT NULL;

-- 3. Add check constraint: must have either product_id OR brand_id (not both, not neither)
ALTER TABLE prospection.email_logs
DROP CONSTRAINT IF EXISTS email_logs_entity_check;

ALTER TABLE prospection.email_logs
ADD CONSTRAINT email_logs_entity_check
CHECK (
  (product_id IS NOT NULL AND brand_id IS NULL) OR
  (product_id IS NULL AND brand_id IS NOT NULL)
);

-- 4. Drop old log_email_sent function signatures
DROP FUNCTION IF EXISTS public.log_email_sent(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR);

-- 5. Create new log_email_sent function with brand_id support
CREATE OR REPLACE FUNCTION public.log_email_sent(
  p_to_email VARCHAR(255),
  p_subject VARCHAR(255),
  p_body TEXT,
  p_product_id UUID DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_contact_name VARCHAR(255) DEFAULT NULL,
  p_contact_title VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_is_first_contact BOOLEAN;
BEGIN
  -- Validation: must have either product_id OR brand_id
  IF (p_product_id IS NULL AND p_brand_id IS NULL) THEN
    RAISE EXCEPTION 'Must provide either p_product_id or p_brand_id';
  END IF;

  IF (p_product_id IS NOT NULL AND p_brand_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot provide both p_product_id and p_brand_id';
  END IF;

  -- Récupérer l'utilisateur authentifié
  SELECT auth.uid() INTO v_user_id;

  -- Vérifier si c'est le premier email envoyé
  IF p_product_id IS NOT NULL THEN
    -- Pour un produit
    SELECT contacted_at IS NULL
    INTO v_is_first_contact
    FROM prospection.products
    WHERE id = p_product_id;
  ELSE
    -- Pour une marque
    SELECT contacted_at IS NULL
    INTO v_is_first_contact
    FROM prospection.brands
    WHERE id = p_brand_id;
  END IF;

  -- Insérer le log d'email
  INSERT INTO prospection.email_logs (
    product_id,
    brand_id,
    sent_by,
    to_email,
    subject,
    body,
    status,
    contact_name,
    contact_title
  )
  VALUES (
    p_product_id,
    p_brand_id,
    v_user_id,
    p_to_email,
    p_subject,
    p_body,
    'sent',
    p_contact_name,
    p_contact_title
  )
  RETURNING id INTO v_log_id;

  -- Si c'est le premier contact, mettre à jour le produit OU la marque
  IF v_is_first_contact THEN
    IF p_product_id IS NOT NULL THEN
      UPDATE prospection.products
      SET
        contacted_by = v_user_id,
        contacted_at = NOW()
      WHERE id = p_product_id;
    ELSE
      UPDATE prospection.brands
      SET
        contacted_by = v_user_id,
        contacted_at = NOW()
      WHERE id = p_brand_id;
    END IF;
  END IF;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_email_sent IS 'Enregistre un email envoyé pour un produit OU une marque et met à jour contacted_by/contacted_at si c''est le premier contact';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 040 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Modifications:';
  RAISE NOTICE '  1. email_logs.brand_id ajouté (UUID, nullable)';
  RAISE NOTICE '  2. email_logs.product_id rendu nullable';
  RAISE NOTICE '  3. Contrainte: doit avoir product_id OU brand_id (pas les deux)';
  RAISE NOTICE '  4. Supprimé ancienne signature de log_email_sent()';
  RAISE NOTICE '  5. Créé nouvelle log_email_sent() avec brand_id et paramètres réordonnés';
  RAISE NOTICE '';
  RAISE NOTICE 'Comportement:';
  RAISE NOTICE '  - Peut logger un email pour un produit (product_id)';
  RAISE NOTICE '  - OU pour une marque (brand_id)';
  RAISE NOTICE '  - Met à jour contacted_by/contacted_at automatiquement';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaine étape:';
  RAISE NOTICE '  - Tester en envoyant un email depuis une fiche marque';
  RAISE NOTICE '============================================';
END $$;
