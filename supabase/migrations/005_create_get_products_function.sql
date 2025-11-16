-- Migration 005: Create function to get products from prospection schema
-- This allows the Supabase JS client to access products in the prospection schema

CREATE OR REPLACE FUNCTION public.get_prospection_products(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF prospection.products
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM prospection.products
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_prospection_products(INT, INT) TO authenticated;
