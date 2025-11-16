-- ============================================
-- MIGRATION 003: Create Public Functions for API Access
-- ============================================
-- Description: Créer des fonctions dans le schéma public pour accéder aux données du schéma prospection
-- Author: Claude Code + Laurent David
-- Date: 2025-11-16
-- ============================================

-- Fonction pour récupérer toutes les catégories
CREATE OR REPLACE FUNCTION public.get_prospection_categories()
RETURNS SETOF prospection.categories
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM prospection.categories ORDER BY id;
$$;

-- Fonction pour récupérer toutes les sous-catégories
CREATE OR REPLACE FUNCTION public.get_prospection_subcategories()
RETURNS SETOF prospection.subcategories
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM prospection.subcategories ORDER BY category_id, id;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_prospection_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospection_subcategories() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prospection_categories() TO anon;
GRANT EXECUTE ON FUNCTION public.get_prospection_subcategories() TO anon;

-- Commentaires
COMMENT ON FUNCTION public.get_prospection_categories() IS 'Retourne toutes les catégories du schéma prospection (accessible via RPC)';
COMMENT ON FUNCTION public.get_prospection_subcategories() IS 'Retourne toutes les sous-catégories du schéma prospection (accessible via RPC)';
