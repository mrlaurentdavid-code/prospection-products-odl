-- Migration 007: Create function to get product statistics
-- Returns counts of products by status

CREATE OR REPLACE FUNCTION public.get_prospection_products_stats()
RETURNS TABLE (
  status TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    status::TEXT,
    COUNT(*) as count
  FROM prospection.products
  GROUP BY status;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_prospection_products_stats() TO authenticated;
