-- ============================================
-- MIGRATION 028: Recreate category RPC functions
-- ============================================
-- Description: Recréer les fonctions RPC pour les catégories
-- ============================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_prospection_categories();
DROP FUNCTION IF EXISTS public.get_prospection_subcategories();

-- Recréer la fonction pour les catégories
CREATE OR REPLACE FUNCTION public.get_prospection_categories()
RETURNS TABLE (
  id INTEGER,
  name_en VARCHAR(100),
  name_fr VARCHAR(100),
  name_de VARCHAR(100),
  name_it VARCHAR(100),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name_en,
    c.name_fr,
    c.name_de,
    c.name_it,
    c.created_at
  FROM prospection.categories c
  ORDER BY c.id;
END;
$$;

-- Recréer la fonction pour les sous-catégories
CREATE OR REPLACE FUNCTION public.get_prospection_subcategories()
RETURNS TABLE (
  id INTEGER,
  category_id INTEGER,
  name_en VARCHAR(100),
  name_fr VARCHAR(100),
  name_de VARCHAR(100),
  name_it VARCHAR(100),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.category_id,
    s.name_en,
    s.name_fr,
    s.name_de,
    s.name_it,
    s.created_at
  FROM prospection.subcategories s
  ORDER BY s.category_id, s.id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_prospection_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospection_subcategories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospection_categories() TO anon;
GRANT EXECUTE ON FUNCTION public.get_prospection_subcategories() TO anon;

-- Commentaires
COMMENT ON FUNCTION public.get_prospection_categories() IS 'Retourne toutes les catégories du schéma prospection (accessible via RPC)';
COMMENT ON FUNCTION public.get_prospection_subcategories() IS 'Retourne toutes les sous-catégories du schéma prospection (accessible via RPC)';
