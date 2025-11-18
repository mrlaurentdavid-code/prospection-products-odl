-- ============================================
-- MIGRATION 034: Update log_email_sent function to track contacted_by/contacted_at
-- ============================================
-- Description: Modifie la fonction log_email_sent pour remplir automatiquement contacted_by et contacted_at
-- Author: Claude Code + Laurent David
-- Date: 2025-11-18
-- ============================================

CREATE OR REPLACE FUNCTION public.log_email_sent(
  p_product_id UUID,
  p_to_email VARCHAR(255),
  p_subject VARCHAR(255),
  p_body TEXT,
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
  -- Récupérer l'utilisateur authentifié
  SELECT auth.uid() INTO v_user_id;

  -- Vérifier si c'est le premier email envoyé pour ce produit
  SELECT contacted_at IS NULL
  INTO v_is_first_contact
  FROM prospection.products
  WHERE id = p_product_id;

  -- Insérer le log d'email
  INSERT INTO prospection.email_logs (
    product_id,
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
    v_user_id,
    p_to_email,
    p_subject,
    p_body,
    'sent',
    p_contact_name,
    p_contact_title
  )
  RETURNING id INTO v_log_id;

  -- Si c'est le premier contact, mettre à jour le produit
  IF v_is_first_contact THEN
    UPDATE prospection.products
    SET
      contacted_by = v_user_id,
      contacted_at = NOW()
    WHERE id = p_product_id;
  END IF;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_email_sent IS 'Enregistre un email envoyé et met à jour contacted_by/contacted_at si c''est le premier contact';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 034 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Fonction mise à jour:';
  RAISE NOTICE '  - public.log_email_sent() → Remplit contacted_by/contacted_at automatiquement';
  RAISE NOTICE '';
  RAISE NOTICE 'Comportement:';
  RAISE NOTICE '  - Quand un email est envoyé (premier contact)';
  RAISE NOTICE '  - contacted_by = auth.uid() (utilisateur qui envoie)';
  RAISE NOTICE '  - contacted_at = NOW() (timestamp actuel)';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaine étape:';
  RAISE NOTICE '  - Appliquer migration 033 pour avoir les colonnes';
  RAISE NOTICE '  - Tester en envoyant un email depuis le frontend';
  RAISE NOTICE '============================================';
END $$;
