-- ============================================
-- MIGRATION 024: Create user profiles table
-- ============================================
-- Description: Crée la table user_profiles pour stocker les infos de signature email
-- ============================================

-- Table user_profiles
CREATE TABLE prospection.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL DEFAULT 'Product Sourcing Manager',
  email VARCHAR(255),
  phone VARCHAR(50),
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON prospection.user_profiles
FOR EACH ROW
EXECUTE FUNCTION prospection.update_updated_at_column();

-- Permissions
GRANT SELECT, INSERT, UPDATE ON prospection.user_profiles TO authenticated;

-- RLS policies
ALTER TABLE prospection.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read own profile"
  ON prospection.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy: Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON prospection.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy: Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON prospection.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Fonction pour récupérer ou créer le profil utilisateur
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile()
RETURNS TABLE (
  id UUID,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  title VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  signature TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Vérifier si le profil existe
  IF NOT EXISTS (SELECT 1 FROM prospection.user_profiles WHERE prospection.user_profiles.id = v_user_id) THEN
    -- Récupérer l'email depuis auth.users
    SELECT au.email INTO v_user_email FROM auth.users au WHERE au.id = v_user_id;

    -- Créer un profil par défaut
    INSERT INTO prospection.user_profiles (id, first_name, last_name, title, email)
    VALUES (
      v_user_id,
      'Prénom',
      'Nom',
      'Product Sourcing Manager',
      v_user_email
    );
  END IF;

  -- Retourner le profil
  RETURN QUERY
  SELECT
    up.id,
    up.first_name,
    up.last_name,
    up.title,
    up.email,
    up.phone,
    up.signature
  FROM prospection.user_profiles up
  WHERE up.id = v_user_id;
END;
$$;

-- Fonction pour mettre à jour le profil utilisateur
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_first_name VARCHAR(50),
  p_last_name VARCHAR(50),
  p_title VARCHAR(100),
  p_email VARCHAR(255) DEFAULT NULL,
  p_phone VARCHAR(50) DEFAULT NULL,
  p_signature TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mise à jour ou insertion du profil
  INSERT INTO prospection.user_profiles (id, first_name, last_name, title, email, phone, signature)
  VALUES (v_user_id, p_first_name, p_last_name, p_title, p_email, p_phone, p_signature)
  ON CONFLICT (id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    title = EXCLUDED.title,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    signature = EXCLUDED.signature,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- Permissions sur les fonctions
GRANT EXECUTE ON FUNCTION public.get_or_create_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated;

-- Seed initial pour Laurent et David
-- Note: Ces IDs devront être mis à jour avec les vrais UUIDs des utilisateurs
COMMENT ON TABLE prospection.user_profiles IS 'Profils utilisateurs pour personnalisation des emails de prospection';
