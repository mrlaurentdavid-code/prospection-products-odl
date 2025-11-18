-- ============================================
-- MIGRATION 029: Create odl_shared schema and reorganize user_profiles
-- ============================================
-- Description: Création du schéma partagé odl_shared et déplacement de user_profiles
-- SAFE: Ne détruit rien, crée seulement le nouveau schéma et copie les données
-- ============================================

-- ============================================
-- ÉTAPE 1: Créer le schéma partagé odl_shared
-- ============================================
CREATE SCHEMA IF NOT EXISTS odl_shared;

COMMENT ON SCHEMA odl_shared IS 'Schéma partagé pour toutes les applications ODL Tools (profiles, settings, audit logs)';

-- ============================================
-- ÉTAPE 2: Créer la table user_profiles dans odl_shared
-- ============================================
CREATE TABLE IF NOT EXISTS odl_shared.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  title VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  signature TEXT,
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'Europe/Zurich',
  language VARCHAR(2) DEFAULT 'en' CHECK (language IN ('en', 'fr', 'de', 'it')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE odl_shared.user_profiles IS 'Profils utilisateurs partagés entre toutes les apps ODL Tools';

-- ============================================
-- ÉTAPE 3: Migrer les données si la table prospection.user_profiles existe
-- ============================================
DO $$
BEGIN
  -- Vérifier si prospection.user_profiles existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'prospection' AND table_name = 'user_profiles'
  ) THEN
    -- Copier les données de prospection.user_profiles vers odl_shared.user_profiles
    INSERT INTO odl_shared.user_profiles (id, first_name, last_name, title, email, phone, signature, created_at, updated_at)
    SELECT id, first_name, last_name, title, email, phone, signature, created_at, updated_at
    FROM prospection.user_profiles
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      title = EXCLUDED.title,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      signature = EXCLUDED.signature,
      updated_at = EXCLUDED.updated_at;

    RAISE NOTICE '✅ Migré % profils de prospection.user_profiles vers odl_shared.user_profiles',
      (SELECT COUNT(*) FROM prospection.user_profiles);
  ELSE
    RAISE NOTICE 'ℹ️  prospection.user_profiles n''existe pas encore, pas de migration de données';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 4: Créer le trigger update_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION odl_shared.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON odl_shared.user_profiles
FOR EACH ROW
EXECUTE FUNCTION odl_shared.update_updated_at_column();

-- ============================================
-- ÉTAPE 5: Créer les indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON odl_shared.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON odl_shared.user_profiles(language);

-- ============================================
-- ÉTAPE 6: Activer RLS et créer les policies
-- ============================================
ALTER TABLE odl_shared.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir tous les profils (utile pour les listes)
CREATE POLICY "User profiles are viewable by authenticated users"
  ON odl_shared.user_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Les utilisateurs peuvent modifier uniquement leur propre profil
CREATE POLICY "Users can update their own profile"
  ON odl_shared.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Les utilisateurs peuvent insérer uniquement leur propre profil
CREATE POLICY "Users can insert their own profile"
  ON odl_shared.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ÉTAPE 7: Grant permissions
-- ============================================
GRANT USAGE ON SCHEMA odl_shared TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA odl_shared TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA odl_shared TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA odl_shared TO authenticated;

-- ============================================
-- ÉTAPE 8: Créer une fonction publique pour récupérer les profils
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID DEFAULT NULL)
RETURNS SETOF odl_shared.user_profiles
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM odl_shared.user_profiles
  WHERE id = COALESCE(p_user_id, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS SETOF odl_shared.user_profiles
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM odl_shared.user_profiles
  ORDER BY first_name, last_name;
$$;

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_first_name VARCHAR(100),
  p_last_name VARCHAR(100),
  p_title VARCHAR(100),
  p_phone VARCHAR(50),
  p_signature TEXT,
  p_timezone VARCHAR(50),
  p_language VARCHAR(2)
)
RETURNS odl_shared.user_profiles
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_profile odl_shared.user_profiles;
BEGIN
  UPDATE odl_shared.user_profiles
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    title = p_title,
    phone = p_phone,
    signature = p_signature,
    timezone = p_timezone,
    language = p_language,
    updated_at = NOW()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- ============================================
-- ÉTAPE 9: Créer une VUE dans prospection qui pointe vers odl_shared
-- ============================================
-- Cette vue permet la compatibilité ascendante
-- Les apps existantes qui utilisent prospection.user_profiles continueront de fonctionner
CREATE OR REPLACE VIEW prospection.user_profiles AS
SELECT * FROM odl_shared.user_profiles;

COMMENT ON VIEW prospection.user_profiles IS 'Vue de compatibilité - Pointe vers odl_shared.user_profiles';

-- ============================================
-- RÉSUMÉ DE LA MIGRATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION 029 TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Schéma créé: odl_shared';
  RAISE NOTICE '👤 Table créée: odl_shared.user_profiles';
  RAISE NOTICE '📊 Profils migrés: % profils', (SELECT COUNT(*) FROM odl_shared.user_profiles);
  RAISE NOTICE '🔒 RLS activé avec policies';
  RAISE NOTICE '🔗 Vue de compatibilité: prospection.user_profiles → odl_shared.user_profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes:';
  RAISE NOTICE '- Migration 030: Audit logs cross-app';
  RAISE NOTICE '- Migration 031: Vues optimisées';
  RAISE NOTICE '============================================';
END $$;
