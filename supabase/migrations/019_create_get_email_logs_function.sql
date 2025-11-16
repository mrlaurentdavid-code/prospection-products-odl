-- ============================================
-- FUNCTION: get_email_logs_by_products
-- Récupère les emails logs pour une liste de produits
-- ============================================

CREATE OR REPLACE FUNCTION public.get_email_logs_by_products(
  p_product_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  to_email VARCHAR(255),
  subject VARCHAR(255),
  body TEXT,
  contact_name VARCHAR(255),
  contact_title VARCHAR(255),
  sent_at TIMESTAMPTZ,
  status VARCHAR(20)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    product_id,
    to_email,
    subject,
    body,
    contact_name,
    contact_title,
    sent_at,
    status
  FROM prospection.email_logs
  WHERE product_id = ANY(p_product_ids)
  ORDER BY sent_at DESC;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.get_email_logs_by_products(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_logs_by_products(UUID[]) TO anon;
