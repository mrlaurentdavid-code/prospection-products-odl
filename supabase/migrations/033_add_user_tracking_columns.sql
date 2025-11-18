-- ============================================
-- MIGRATION 033: Add user tracking columns to products
-- ============================================
-- Description: Ajoute created_by, contacted_by et contacted_at pour tracker l'historique
-- Author: Claude Code + Laurent David
-- Date: 2025-11-18
-- ============================================

-- Ajouter la colonne created_by (qui a ajouté le produit)
ALTER TABLE prospection.products
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Ajouter la colonne contacted_by (qui a envoyé l'email de prospection)
ALTER TABLE prospection.products
ADD COLUMN IF NOT EXISTS contacted_by UUID REFERENCES auth.users(id);

-- Ajouter la colonne contacted_at (quand l'email a été envoyé)
ALTER TABLE prospection.products
ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;

-- Ajouter un index sur created_by pour les filtres par utilisateur
CREATE INDEX IF NOT EXISTS idx_products_created_by ON prospection.products(created_by);

-- Ajouter un index sur contacted_by pour les filtres
CREATE INDEX IF NOT EXISTS idx_products_contacted_by ON prospection.products(contacted_by);

-- Ajouter un commentaire pour documenter ces colonnes
COMMENT ON COLUMN prospection.products.created_by IS 'Utilisateur qui a ajouté ce produit (via Telegram ou frontend)';
COMMENT ON COLUMN prospection.products.contacted_by IS 'Utilisateur qui a envoyé l''email de prospection';
COMMENT ON COLUMN prospection.products.contacted_at IS 'Date et heure d''envoi du premier email de prospection';

-- ============================================
-- Mettre à jour la vue v_products_full pour inclure les infos utilisateurs
-- ============================================
CREATE OR REPLACE VIEW prospection.v_products_full AS
SELECT
  p.*,
  c.name_en as category_name_en,
  c.name_fr as category_name_fr,
  c.name_de as category_name_de,
  c.name_it as category_name_it,
  sc.name_en as subcategory_name_en,
  sc.name_fr as subcategory_name_fr,
  sc.name_de as subcategory_name_de,
  sc.name_it as subcategory_name_it,
  -- Informations sur qui a créé le produit
  creator.first_name || ' ' || creator.last_name as created_by_name,
  creator.email as created_by_email,
  -- Informations sur qui a reviewé le produit
  reviewer.first_name || ' ' || reviewer.last_name as reviewed_by_name,
  reviewer.email as reviewed_by_email,
  -- Informations sur qui a contacté
  contactor.first_name || ' ' || contactor.last_name as contacted_by_name,
  contactor.email as contacted_by_email,
  -- Stats emails
  (SELECT COUNT(*) FROM prospection.email_logs WHERE product_id = p.id) as emails_sent_count,
  (SELECT COUNT(*) FROM prospection.email_logs WHERE product_id = p.id AND status = 'opened') as emails_opened_count,
  (SELECT COUNT(*) FROM prospection.email_logs WHERE product_id = p.id AND status = 'clicked') as emails_clicked_count
FROM prospection.products p
LEFT JOIN prospection.categories c ON p.category_id = c.id
LEFT JOIN prospection.subcategories sc ON p.subcategory_id = sc.id
LEFT JOIN odl_shared.user_profiles creator ON p.created_by = creator.id
LEFT JOIN odl_shared.user_profiles reviewer ON p.reviewed_by = reviewer.id
LEFT JOIN odl_shared.user_profiles contactor ON p.contacted_by = contactor.id;

COMMENT ON VIEW prospection.v_products_full IS 'Vue complète des produits avec catégories, stats emails et informations utilisateurs';

-- ============================================
-- Mettre à jour la fonction get_products_full()
-- ============================================
CREATE OR REPLACE FUNCTION public.get_products_full(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF prospection.v_products_full
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM prospection.v_products_full
  WHERE (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================
-- Créer une fonction pour obtenir l'historique d'un produit
-- ============================================
CREATE OR REPLACE FUNCTION public.get_product_history(p_product_id UUID)
RETURNS TABLE (
  event_type TEXT,
  event_date TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT,
  details JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH product_events AS (
    -- Événement: Création du produit
    SELECT
      'product_created'::TEXT as event_type,
      p.created_at as event_date,
      creator.first_name || ' ' || creator.last_name as user_name,
      creator.email as user_email,
      jsonb_build_object(
        'product_name', p.name,
        'source_url', p.source_url,
        'source_type', p.source_type
      ) as details
    FROM prospection.products p
    LEFT JOIN odl_shared.user_profiles creator ON p.created_by = creator.id
    WHERE p.id = p_product_id

    UNION ALL

    -- Événement: Review du produit
    SELECT
      'product_reviewed'::TEXT as event_type,
      p.reviewed_at as event_date,
      reviewer.first_name || ' ' || reviewer.last_name as user_name,
      reviewer.email as user_email,
      jsonb_build_object(
        'status', p.status
      ) as details
    FROM prospection.products p
    LEFT JOIN odl_shared.user_profiles reviewer ON p.reviewed_by = reviewer.id
    WHERE p.id = p_product_id AND p.reviewed_at IS NOT NULL

    UNION ALL

    -- Événement: Premier contact
    SELECT
      'product_contacted'::TEXT as event_type,
      p.contacted_at as event_date,
      contactor.first_name || ' ' || contactor.last_name as user_name,
      contactor.email as user_email,
      jsonb_build_object(
        'status', 'contacted'
      ) as details
    FROM prospection.products p
    LEFT JOIN odl_shared.user_profiles contactor ON p.contacted_by = contactor.id
    WHERE p.id = p_product_id AND p.contacted_at IS NOT NULL

    UNION ALL

    -- Événements: Emails envoyés
    SELECT
      'email_sent'::TEXT as event_type,
      el.sent_at as event_date,
      sender.first_name || ' ' || sender.last_name as user_name,
      sender.email as user_email,
      jsonb_build_object(
        'to_email', el.to_email,
        'subject', el.subject,
        'contact_name', el.contact_name,
        'status', el.status
      ) as details
    FROM prospection.email_logs el
    LEFT JOIN odl_shared.user_profiles sender ON el.sent_by = sender.id
    WHERE el.product_id = p_product_id
  )
  SELECT * FROM product_events
  WHERE event_date IS NOT NULL
  ORDER BY event_date DESC;
END;
$$;

COMMENT ON FUNCTION public.get_product_history(UUID) IS 'Retourne l''historique complet d''un produit (création, review, emails)';

-- ============================================
-- Rafraîchir le cache PostgREST
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 033 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Colonnes ajoutées:';
  RAISE NOTICE '  - created_by (UUID) → Qui a ajouté le produit';
  RAISE NOTICE '  - contacted_by (UUID) → Qui a envoyé l''email';
  RAISE NOTICE '  - contacted_at (TIMESTAMPTZ) → Quand l''email a été envoyé';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Vues mises à jour:';
  RAISE NOTICE '  - v_products_full → Inclut infos créateur, reviewer, contacteur';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Fonctions créées:';
  RAISE NOTICE '  - get_product_history(product_id) → Historique complet';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes:';
  RAISE NOTICE '1. Mettre à jour l''API /api/analyze pour remplir created_by';
  RAISE NOTICE '2. Mettre à jour l''API /api/email/log pour remplir contacted_by/contacted_at';
  RAISE NOTICE '3. Afficher l''historique dans le détail produit';
  RAISE NOTICE '============================================';
END $$;
