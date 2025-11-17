-- ============================================
-- MIGRATION 026: Add category and subcategory TEXT columns
-- ============================================
-- Description: Ajoute les colonnes category et subcategory (TEXT) pour stocker les noms
-- ============================================

-- Vérifier si les colonnes existent déjà, sinon les ajouter
DO $$
BEGIN
  -- Ajouter category (TEXT) si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'prospection'
    AND table_name = 'products'
    AND column_name = 'category'
  ) THEN
    ALTER TABLE prospection.products ADD COLUMN category VARCHAR(100);
    RAISE NOTICE 'Column category added';
  ELSE
    RAISE NOTICE 'Column category already exists';
  END IF;

  -- Ajouter subcategory (TEXT) si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'prospection'
    AND table_name = 'products'
    AND column_name = 'subcategory'
  ) THEN
    ALTER TABLE prospection.products ADD COLUMN subcategory VARCHAR(100);
    RAISE NOTICE 'Column subcategory added';
  ELSE
    RAISE NOTICE 'Column subcategory already exists';
  END IF;
END $$;

-- Commentaire
COMMENT ON COLUMN prospection.products.category IS 'Nom de la catégorie (texte) retourné par IA';
COMMENT ON COLUMN prospection.products.subcategory IS 'Nom de la sous-catégorie (texte) retourné par IA';
