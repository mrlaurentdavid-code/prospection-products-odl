-- ============================================
-- MIGRATION 035: Create update_product_images function
-- ============================================
-- Description: Permet de mettre à jour le tableau d'images d'un produit
-- Author: Claude Code + Laurent David
-- Date: 2025-11-18
-- ============================================

-- Créer la fonction pour mettre à jour les images d'un produit
CREATE OR REPLACE FUNCTION public.update_product_images(
  p_product_id UUID,
  p_images TEXT[]
)
RETURNS prospection.products
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_product prospection.products;
BEGIN
  -- Valider que le tableau d'images n'est pas vide
  IF p_images IS NULL OR array_length(p_images, 1) IS NULL OR array_length(p_images, 1) = 0 THEN
    RAISE EXCEPTION 'Images array cannot be empty';
  END IF;

  -- Mettre à jour les images du produit
  UPDATE prospection.products
  SET
    images = p_images,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  -- Vérifier que le produit existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found with id: %', p_product_id;
  END IF;

  RETURN v_product;
END;
$$;

COMMENT ON FUNCTION public.update_product_images(UUID, TEXT[]) IS 'Met à jour le tableau d''images d''un produit (réorganisation ou suppression)';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 035 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Fonction créée:';
  RAISE NOTICE '  - update_product_images(product_id, images[])';
  RAISE NOTICE '';
  RAISE NOTICE 'Utilisation:';
  RAISE NOTICE '  SELECT * FROM update_product_images(';
  RAISE NOTICE '    ''product-uuid'',';
  RAISE NOTICE '    ARRAY[''url1'', ''url2'', ''url3'']';
  RAISE NOTICE '  );';
  RAISE NOTICE '============================================';
END $$;
