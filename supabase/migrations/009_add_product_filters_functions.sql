-- Migration 009: Add product filtering and category list functions

-- Function to get products with filters
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
    (p_status IS NULL OR status::TEXT = p_status)
    AND (p_category IS NULL OR category = p_category)
    AND (p_subcategory IS NULL OR subcategory = p_subcategory)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Function to get all distinct categories
CREATE OR REPLACE FUNCTION public.get_prospection_categories()
RETURNS TABLE (category TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT category
  FROM prospection.products
  WHERE category IS NOT NULL
  ORDER BY category;
$$;

-- Function to get all distinct subcategories
CREATE OR REPLACE FUNCTION public.get_prospection_subcategories()
RETURNS TABLE (subcategory TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT subcategory
  FROM prospection.products
  WHERE subcategory IS NOT NULL
  ORDER BY subcategory;
$$;
