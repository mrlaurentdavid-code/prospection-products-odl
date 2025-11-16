-- Migration 006: Create function to get a single product by ID from prospection schema
-- This allows the Supabase JS client to access a single product by ID

CREATE OR REPLACE FUNCTION public.get_prospection_product_by_id(
  p_product_id UUID
)
RETURNS SETOF prospection.products
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM prospection.products
  WHERE id = p_product_id
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_prospection_product_by_id(UUID) TO authenticated;
