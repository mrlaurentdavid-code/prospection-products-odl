-- ============================================
-- FUNCTION: log_email_sent
-- Enregistre un email envoyé dans email_logs
-- ============================================

CREATE OR REPLACE FUNCTION public.log_email_sent(
  p_product_id UUID,
  p_to_email VARCHAR(255),
  p_subject VARCHAR(255),
  p_body TEXT,
  p_contact_name VARCHAR(255),
  p_contact_title VARCHAR(255)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insérer le log d'email
  INSERT INTO prospection.email_logs (
    product_id,
    to_email,
    subject,
    body,
    contact_name,
    contact_title,
    sent_at,
    status
  ) VALUES (
    p_product_id,
    p_to_email,
    p_subject,
    p_body,
    p_contact_name,
    p_contact_title,
    NOW(),
    'sent'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.log_email_sent(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_email_sent(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR) TO anon;
