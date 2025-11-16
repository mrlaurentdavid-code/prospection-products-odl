-- ============================================
-- FUNCTION: delete_product
-- Supprime définitivement un produit
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_product(
  p_product_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supprimer le produit
  DELETE FROM prospection.products
  WHERE id = p_product_id;

  -- Retourner true si la suppression a réussi
  RETURN FOUND;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product(UUID) TO anon;
