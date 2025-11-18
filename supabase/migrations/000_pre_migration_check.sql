-- ============================================
-- PRE-MIGRATION CHECK: Vérification des schémas existants
-- ============================================
-- Description: Script de vérification avant la réorganisation des schémas
-- À exécuter AVANT les migrations 029-031
-- ============================================

-- Ce script NE MODIFIE RIEN, il affiche juste les informations

DO $$
DECLARE
  schema_count INTEGER;
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PRE-MIGRATION CHECK - ODL Tools Database';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Liste des schémas existants (hors schémas système)
  RAISE NOTICE '📂 SCHÉMAS EXISTANTS:';
  FOR schema_count IN
    SELECT nspname
    FROM pg_namespace
    WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'extensions')
    ORDER BY nspname
  LOOP
    RAISE NOTICE '   - %', schema_count;
  END LOOP;
  RAISE NOTICE '';

  -- Tables dans le schéma prospection
  RAISE NOTICE '📋 TABLES DANS prospection:';
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'prospection';

  IF table_count > 0 THEN
    FOR schema_count IN
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'prospection'
      ORDER BY table_name
    LOOP
      RAISE NOTICE '   - %', schema_count;
    END LOOP;
  ELSE
    RAISE NOTICE '   ⚠️  Aucune table trouvée dans prospection';
  END IF;
  RAISE NOTICE '';

  -- Fonctions dans le schéma public (qui utilisent prospection)
  RAISE NOTICE '⚙️ FONCTIONS PUBLIC (prospection-related):';
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_definition LIKE '%prospection%';

  RAISE NOTICE '   Total: % fonctions', function_count;
  RAISE NOTICE '';

  -- Vérifier si d'autres schémas custom existent
  RAISE NOTICE '🔍 AUTRES SCHÉMAS CUSTOM:';
  SELECT COUNT(*) INTO schema_count
  FROM pg_namespace
  WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'extensions', 'auth', 'storage', 'public', 'prospection', 'graphql', 'graphql_public', 'realtime', 'supabase_functions', 'vault', 'pgsodium')
    AND nspname NOT LIKE 'pg_%';

  IF schema_count > 0 THEN
    FOR schema_count IN
      SELECT nspname
      FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1', 'extensions', 'auth', 'storage', 'public', 'prospection', 'graphql', 'graphql_public', 'realtime', 'supabase_functions', 'vault', 'pgsodium')
        AND nspname NOT LIKE 'pg_%'
      ORDER BY nspname
    LOOP
      RAISE NOTICE '   - %', schema_count;
    END LOOP;
  ELSE
    RAISE NOTICE '   ✅ Aucun autre schéma custom trouvé';
  END IF;
  RAISE NOTICE '';

  -- Vérifier les dépendances de user_profiles
  RAISE NOTICE '👤 DÉPENDANCES user_profiles:';
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'prospection' AND table_name = 'user_profiles') THEN
    RAISE NOTICE '   ✅ Table prospection.user_profiles existe';

    -- Compter les lignes
    EXECUTE 'SELECT COUNT(*) FROM prospection.user_profiles' INTO table_count;
    RAISE NOTICE '   📊 % profils utilisateur(s)', table_count;
  ELSE
    RAISE NOTICE '   ⚠️  Table prospection.user_profiles n''existe pas';
  END IF;
  RAISE NOTICE '';

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ VÉRIFICATION TERMINÉE';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes:';
  RAISE NOTICE '1. Si "prospection" existe → Migration 029 (renommage + shared schema)';
  RAISE NOTICE '2. Si autres schémas custom → Analyser manuellement avant migration';
  RAISE NOTICE '3. Si user_profiles existe → Vérifier FK avant déplacement';
  RAISE NOTICE '============================================';
END $$;
