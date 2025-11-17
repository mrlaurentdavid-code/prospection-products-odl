-- ============================================
-- MIGRATION 027: Seed master users profiles
-- ============================================
-- Description: Crée les profils pour Laurent et Bobby (master users)
-- ============================================

-- Note: Les users doivent déjà exister dans auth.users
-- Laurent: laurent@odeal.ch
-- Bobby: boby@odeal.ch

-- Insert profile for Laurent
INSERT INTO prospection.user_profiles (
  id,
  first_name,
  last_name,
  title,
  email,
  phone,
  signature
)
SELECT
  id,
  'Laurent',
  'David',
  'CEO & Co-Founder',
  'laurent@odeal.ch',
  '+41 XX XXX XX XX',
  'Looking forward to partnering with innovative brands!'
FROM auth.users
WHERE email = 'laurent@odeal.ch'
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  title = EXCLUDED.title,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  signature = EXCLUDED.signature;

-- Insert profile for Bobby (Boby)
INSERT INTO prospection.user_profiles (
  id,
  first_name,
  last_name,
  title,
  email,
  phone,
  signature
)
SELECT
  id,
  'Boby',
  '',
  'CTO & Co-Founder',
  'boby@odeal.ch',
  '+41 XX XXX XX XX',
  'Excited to bring your products to the Swiss market!'
FROM auth.users
WHERE email = 'boby@odeal.ch'
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  title = EXCLUDED.title,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  signature = EXCLUDED.signature;

-- Vérification
DO $$
DECLARE
  laurent_count INTEGER;
  bobby_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO laurent_count FROM prospection.user_profiles WHERE email = 'laurent@odeal.ch';
  SELECT COUNT(*) INTO bobby_count FROM prospection.user_profiles WHERE email = 'boby@odeal.ch';

  IF laurent_count = 0 THEN
    RAISE WARNING 'User laurent@odeal.ch not found in auth.users. Please create the account first.';
  ELSE
    RAISE NOTICE '✅ Profile created for Laurent';
  END IF;

  IF bobby_count = 0 THEN
    RAISE WARNING 'User boby@odeal.ch not found in auth.users. Please create the account first.';
  ELSE
    RAISE NOTICE '✅ Profile created for Bobby';
  END IF;
END $$;
