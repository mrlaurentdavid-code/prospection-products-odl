-- ============================================
-- MIGRATION 020: Exclude archived products from main view
-- Modifie get_prospection_products_filtered pour exclure les archivés
-- ============================================

CREATE OR REPLACE FUNCTION public.get_prospection_products_filtered(
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_subcategory TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF prospection.products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM prospection.products
  WHERE
    -- Exclure les produits archivés sauf si explicitement demandé
    (p_status = 'archived' OR status != 'archived')
    AND (p_status IS NULL OR status::TEXT = p_status)
    AND (p_category IS NULL OR category = p_category)
    AND (p_subcategory IS NULL OR subcategory = p_subcategory)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Fonction dédiée pour récupérer uniquement les produits archivés
CREATE OR REPLACE FUNCTION public.get_prospection_products_archived(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS SETOF prospection.products
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM prospection.products
  WHERE status = 'archived'
  ORDER BY updated_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.get_prospection_products_archived(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospection_products_archived(INT, INT) TO anon;
