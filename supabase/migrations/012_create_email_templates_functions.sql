-- ============================================
-- MIGRATION 012: Create email templates RPC functions
-- ============================================
-- Description: Fonctions pour gérer les templates d'emails
-- ============================================

-- Function to get all email templates
CREATE OR REPLACE FUNCTION public.get_email_templates()
RETURNS SETOF prospection.email_templates
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM prospection.email_templates
  ORDER BY type, language;
$$;

-- Function to get a template by id
CREATE OR REPLACE FUNCTION public.get_email_template_by_id(
  p_template_id INTEGER
)
RETURNS prospection.email_templates
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM prospection.email_templates
  WHERE id = p_template_id
  LIMIT 1;
$$;

-- Function to update a template
CREATE OR REPLACE FUNCTION public.update_email_template(
  p_template_id INTEGER,
  p_subject TEXT,
  p_body_html TEXT
)
RETURNS prospection.email_templates
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_template prospection.email_templates;
BEGIN
  UPDATE prospection.email_templates
  SET
    subject = p_subject,
    body_html = p_body_html,
    updated_at = NOW()
  WHERE id = p_template_id
  RETURNING * INTO v_template;

  RETURN v_template;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_email_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_template_by_id(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_email_template(INTEGER, TEXT, TEXT) TO authenticated;

-- Commentaires
COMMENT ON FUNCTION public.get_email_templates IS 'Récupère tous les templates d''emails';
COMMENT ON FUNCTION public.get_email_template_by_id IS 'Récupère un template par son ID';
COMMENT ON FUNCTION public.update_email_template IS 'Met à jour le subject et le body d''un template';
