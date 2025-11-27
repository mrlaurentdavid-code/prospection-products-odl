-- Migration: Create RPC functions for contacts management
-- This allows API access to contacts stored in JSONB columns in prospection.products and prospection.brands

-- =====================================================
-- Function: Get entity contacts (product or brand)
-- =====================================================
CREATE OR REPLACE FUNCTION get_entity_contacts(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contacts JSONB;
  v_website TEXT;
  v_company_name TEXT;
  v_parent_company TEXT;
BEGIN
  IF p_entity_type = 'product' THEN
    SELECT contacts, company_website, company_name, parent_company
    INTO v_contacts, v_website, v_company_name, v_parent_company
    FROM prospection.products
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'brand' THEN
    SELECT contacts, company_website, company_name, company_parent
    INTO v_contacts, v_website, v_company_name, v_parent_company
    FROM prospection.brands
    WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  IF v_contacts IS NULL THEN
    v_contacts := '[]'::JSONB;
  END IF;

  RETURN jsonb_build_object(
    'contacts', v_contacts,
    'company_website', v_website,
    'company_name', v_company_name,
    'parent_company', v_parent_company
  );
END;
$$;

-- =====================================================
-- Function: Add contact to entity
-- =====================================================
CREATE OR REPLACE FUNCTION add_entity_contact(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_contact JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_contacts JSONB;
  v_new_contacts JSONB;
  v_contact_name TEXT;
  v_contact_email TEXT;
  v_is_duplicate BOOLEAN := FALSE;
BEGIN
  -- Get contact name and email for duplicate check
  v_contact_name := LOWER(COALESCE(p_contact->>'name', ''));
  v_contact_email := LOWER(COALESCE(p_contact->>'email', ''));

  -- Get existing contacts
  IF p_entity_type = 'product' THEN
    SELECT COALESCE(contacts, '[]'::JSONB)
    INTO v_existing_contacts
    FROM prospection.products
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'brand' THEN
    SELECT COALESCE(contacts, '[]'::JSONB)
    INTO v_existing_contacts
    FROM prospection.brands
    WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  IF v_existing_contacts IS NULL THEN
    RAISE EXCEPTION 'Entity not found';
  END IF;

  -- Check for duplicates
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_existing_contacts) AS c
    WHERE (v_contact_email != '' AND LOWER(c->>'email') = v_contact_email)
       OR (v_contact_name != '' AND LOWER(c->>'name') = v_contact_name)
  ) INTO v_is_duplicate;

  IF v_is_duplicate THEN
    RAISE EXCEPTION 'Contact already exists (same email or name)';
  END IF;

  -- Add new contact
  v_new_contacts := v_existing_contacts || jsonb_build_array(p_contact);

  -- Update entity
  IF p_entity_type = 'product' THEN
    UPDATE prospection.products
    SET contacts = v_new_contacts, updated_at = NOW()
    WHERE id = p_entity_id;
  ELSE
    UPDATE prospection.brands
    SET contacts = v_new_contacts, updated_at = NOW()
    WHERE id = p_entity_id;
  END IF;

  RETURN v_new_contacts;
END;
$$;

-- =====================================================
-- Function: Update entity contacts (replace all)
-- =====================================================
CREATE OR REPLACE FUNCTION update_entity_contacts(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_contacts JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_entity_type = 'product' THEN
    UPDATE prospection.products
    SET contacts = p_contacts, updated_at = NOW()
    WHERE id = p_entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
  ELSIF p_entity_type = 'brand' THEN
    UPDATE prospection.brands
    SET contacts = p_contacts, updated_at = NOW()
    WHERE id = p_entity_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Brand not found';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  RETURN p_contacts;
END;
$$;

-- =====================================================
-- Function: Delete contact from entity by index
-- =====================================================
CREATE OR REPLACE FUNCTION delete_entity_contact(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_contact_index INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_contacts JSONB;
  v_new_contacts JSONB;
  v_array_length INT;
BEGIN
  -- Get existing contacts
  IF p_entity_type = 'product' THEN
    SELECT COALESCE(contacts, '[]'::JSONB)
    INTO v_existing_contacts
    FROM prospection.products
    WHERE id = p_entity_id;
  ELSIF p_entity_type = 'brand' THEN
    SELECT COALESCE(contacts, '[]'::JSONB)
    INTO v_existing_contacts
    FROM prospection.brands
    WHERE id = p_entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  IF v_existing_contacts IS NULL THEN
    RAISE EXCEPTION 'Entity not found';
  END IF;

  v_array_length := jsonb_array_length(v_existing_contacts);

  IF p_contact_index < 0 OR p_contact_index >= v_array_length THEN
    RAISE EXCEPTION 'Contact index out of bounds';
  END IF;

  -- Remove contact at index
  v_new_contacts := (
    SELECT COALESCE(jsonb_agg(elem), '[]'::JSONB)
    FROM jsonb_array_elements(v_existing_contacts) WITH ORDINALITY AS t(elem, idx)
    WHERE idx - 1 != p_contact_index
  );

  -- Update entity
  IF p_entity_type = 'product' THEN
    UPDATE prospection.products
    SET contacts = v_new_contacts, updated_at = NOW()
    WHERE id = p_entity_id;
  ELSE
    UPDATE prospection.brands
    SET contacts = v_new_contacts, updated_at = NOW()
    WHERE id = p_entity_id;
  END IF;

  RETURN v_new_contacts;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_entity_contacts(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_entity_contact(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_entity_contacts(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_entity_contact(TEXT, UUID, INT) TO authenticated;
