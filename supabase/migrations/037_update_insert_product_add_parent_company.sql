-- ============================================
-- MIGRATION 037: Update insert_prospection_product to include company_parent
-- ============================================
-- Description: Mise à jour de la fonction RPC pour accepter company_parent
-- Author: Claude Code + Laurent David
-- Date: 2025-11-18
-- ============================================

-- Supprimer l'ancienne version
DROP FUNCTION IF EXISTS public.insert_prospection_product(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT[], DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB, JSONB);

-- Créer la nouvelle version avec company_parent
CREATE OR REPLACE FUNCTION public.insert_prospection_product(
  p_source_url TEXT,
  p_source_type TEXT,
  p_name TEXT,
  p_description TEXT,
  p_category_id INTEGER,
  p_subcategory_id INTEGER,
  p_category TEXT,
  p_subcategory TEXT,
  p_images TEXT[],
  p_msrp_eu DECIMAL,
  p_msrp_ch DECIMAL,
  p_msrp_source_url TEXT,
  p_company_name TEXT,
  p_company_parent TEXT DEFAULT NULL,  -- NOUVEAU: Société mère
  p_company_website TEXT DEFAULT NULL,
  p_company_email TEXT DEFAULT NULL,
  p_company_linkedin TEXT DEFAULT NULL,
  p_company_country TEXT DEFAULT NULL,
  p_ai_confidence_score DECIMAL DEFAULT NULL,
  p_ai_raw_analysis JSONB DEFAULT NULL,
  p_contacts JSONB DEFAULT '[]'::JSONB
)
RETURNS prospection.products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product prospection.products;
BEGIN
  INSERT INTO prospection.products (
    source_url,
    source_type,
    name,
    description,
    category_id,
    subcategory_id,
    category,
    subcategory,
    images,
    msrp_eu,
    msrp_ch,
    msrp_source_url,
    company_name,
    company_parent,  -- NOUVEAU
    company_website,
    company_email,
    company_linkedin,
    company_country,
    status,
    ai_confidence_score,
    ai_raw_analysis,
    contacts
  ) VALUES (
    p_source_url,
    p_source_type,
    p_name,
    p_description,
    p_category_id,
    p_subcategory_id,
    p_category,
    p_subcategory,
    p_images,
    p_msrp_eu,
    p_msrp_ch,
    p_msrp_source_url,
    p_company_name,
    p_company_parent,  -- NOUVEAU
    p_company_website,
    p_company_email,
    p_company_linkedin,
    p_company_country,
    'to_review',
    p_ai_confidence_score,
    p_ai_raw_analysis,
    p_contacts
  )
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.insert_prospection_product(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT[], DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB, JSONB) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.insert_prospection_product IS 'Insère un nouveau produit dans prospection.products avec catégories TEXT, contacts et société mère (accessible via RPC)';
