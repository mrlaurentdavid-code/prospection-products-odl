-- ============================================
-- FUNCTION: update_product_status
-- Met à jour le statut d'un produit
-- ============================================

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.update_product_status(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.update_product_status(
  p_product_id UUID,
  p_status TEXT
)
RETURNS SETOF prospection.products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que le statut est valide
  IF p_status NOT IN ('to_review', 'standby', 'contacted', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value: %', p_status;
  END IF;

  -- Mettre à jour le produit et retourner toutes les colonnes
  RETURN QUERY
  UPDATE prospection.products
  SET
    status = p_status,
    updated_at = NOW()
  WHERE prospection.products.id = p_product_id
  RETURNING *;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.update_product_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_product_status(UUID, TEXT) TO anon;
