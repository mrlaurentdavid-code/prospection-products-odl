-- ============================================
-- MIGRATION 039: Create Brands RPC Functions
-- ============================================
-- Description: RPC functions for CRUD operations on brands
-- Author: Claude Code + Laurent David
-- Date: 2025-11-18
-- ============================================

-- ============================================
-- 1. INSERT BRAND
-- ============================================
CREATE OR REPLACE FUNCTION public.insert_prospection_brand(
  p_source_url TEXT,
  p_source_type TEXT,
  p_name TEXT,
  p_tagline TEXT,
  p_description TEXT,
  p_logo_url TEXT,
  p_brand_images TEXT[],
  p_best_sellers JSONB,
  p_categories TEXT[],
  p_company_name TEXT,
  p_company_website TEXT,
  p_company_email TEXT,
  p_company_linkedin TEXT,
  p_company_country TEXT,
  p_company_parent TEXT,
  p_company_founded_year INTEGER,
  p_company_has_ecommerce BOOLEAN,
  p_contacts JSONB,
  p_ai_confidence_score DECIMAL,
  p_ai_raw_analysis JSONB,
  p_created_by_user_id UUID
)
RETURNS prospection.brands
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brand prospection.brands;
BEGIN
  INSERT INTO prospection.brands (
    source_url,
    source_type,
    name,
    tagline,
    description,
    logo_url,
    brand_images,
    best_sellers,
    categories,
    company_name,
    company_website,
    company_email,
    company_linkedin,
    company_country,
    company_parent,
    company_founded_year,
    company_has_ecommerce,
    contacts,
    status,
    ai_confidence_score,
    ai_raw_analysis,
    created_by_user_id
  ) VALUES (
    p_source_url,
    p_source_type,
    p_name,
    p_tagline,
    p_description,
    p_logo_url,
    p_brand_images,
    p_best_sellers,
    p_categories,
    p_company_name,
    p_company_website,
    p_company_email,
    p_company_linkedin,
    p_company_country,
    p_company_parent,
    p_company_founded_year,
    p_company_has_ecommerce,
    p_contacts,
    'to_review',
    p_ai_confidence_score,
    p_ai_raw_analysis,
    p_created_by_user_id
  )
  RETURNING * INTO v_brand;

  RETURN v_brand;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_prospection_brand TO authenticated;
COMMENT ON FUNCTION public.insert_prospection_brand IS 'Insère une nouvelle marque dans prospection.brands (accessible via RPC)';


-- ============================================
-- 2. GET BRANDS FILTERED
-- ============================================
CREATE OR REPLACE FUNCTION public.get_prospection_brands_filtered(
  p_status TEXT DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF prospection.brands
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM prospection.brands
  WHERE
    (p_status IS NULL OR status = p_status)
    AND (p_categories IS NULL OR p_categories && categories)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospection_brands_filtered TO authenticated;
COMMENT ON FUNCTION public.get_prospection_brands_filtered IS 'Récupère les marques filtrées par statut et catégories';


-- ============================================
-- 3. GET BRAND BY ID
-- ============================================
CREATE OR REPLACE FUNCTION public.get_prospection_brand_by_id(
  p_brand_id UUID
)
RETURNS prospection.brands
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brand prospection.brands;
BEGIN
  SELECT * INTO v_brand
  FROM prospection.brands
  WHERE id = p_brand_id;

  RETURN v_brand;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospection_brand_by_id TO authenticated;
COMMENT ON FUNCTION public.get_prospection_brand_by_id IS 'Récupère une marque par son ID';


-- ============================================
-- 4. UPDATE BRAND STATUS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_prospection_brand_status(
  p_brand_id UUID,
  p_new_status TEXT,
  p_updated_by_user_id UUID
)
RETURNS prospection.brands
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brand prospection.brands;
BEGIN
  UPDATE prospection.brands
  SET
    status = p_new_status,
    updated_by_user_id = p_updated_by_user_id,
    updated_at = NOW()
  WHERE id = p_brand_id
  RETURNING * INTO v_brand;

  RETURN v_brand;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_prospection_brand_status TO authenticated;
COMMENT ON FUNCTION public.update_prospection_brand_status IS 'Met à jour le statut d''une marque';


-- ============================================
-- 5. DELETE BRAND
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_prospection_brand(
  p_brand_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM prospection.brands
  WHERE id = p_brand_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_prospection_brand TO authenticated;
COMMENT ON FUNCTION public.delete_prospection_brand IS 'Supprime une marque';


-- ============================================
-- 6. GET BRANDS STATS
-- ============================================
CREATE OR REPLACE FUNCTION public.get_prospection_brands_stats()
RETURNS TABLE(
  total BIGINT,
  to_review BIGINT,
  standby BIGINT,
  contacted BIGINT,
  archived BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE status = 'to_review')::BIGINT AS to_review,
    COUNT(*) FILTER (WHERE status = 'standby')::BIGINT AS standby,
    COUNT(*) FILTER (WHERE status = 'contacted')::BIGINT AS contacted,
    COUNT(*) FILTER (WHERE status = 'archived')::BIGINT AS archived
  FROM prospection.brands;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospection_brands_stats TO authenticated;
COMMENT ON FUNCTION public.get_prospection_brands_stats IS 'Retourne les statistiques des marques par statut';


-- ============================================
-- 7. GET BRAND CATEGORIES (for filters)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_prospection_brand_categories()
RETURNS TABLE(
  category TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    unnest(categories) AS category,
    COUNT(*)::BIGINT AS count
  FROM prospection.brands
  GROUP BY category
  ORDER BY count DESC, category ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospection_brand_categories TO authenticated;
COMMENT ON FUNCTION public.get_prospection_brand_categories IS 'Retourne toutes les catégories utilisées par les marques avec leur compteur';
