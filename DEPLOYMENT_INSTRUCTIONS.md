# 🚀 Deployment Instructions - Brand Feature

## ✅ What's Been Done

All code changes have been committed to git (commit `2849ee5`):

### Files Added:
- ✅ `supabase/migrations/038_create_brands_table.sql` - Brands database table
- ✅ `supabase/migrations/039_create_brands_rpc_functions.sql` - 7 RPC functions for brands
- ✅ `lib/services/claude-brand-analyzer.ts` - AI brand analysis service
- ✅ `components/QuickAnalyzeBrand.tsx` - Brand search component
- ✅ `components/QuickAnalyzeUnified.tsx` - Dashboard unified search
- ✅ `app/dashboard/brands/page.tsx` - Brands list page
- ✅ `app/dashboard/brands/[id]/page.tsx` - Brand detail page
- ✅ `deploy-to-vps.sh` - Automated deployment script

### Files Modified:
- ✅ `app/api/analyze/route.ts` - Supports both product and brand analysis
- ✅ `components/Navbar.tsx` - Added "Marques" navigation link
- ✅ `components/QuickAnalyze.tsx` - Added cross-link to brands page
- ✅ `app/dashboard/page.tsx` - Uses unified search component
- ✅ `lib/supabase/types.ts` - Added Brand and BestSeller types

---

## 📋 Deployment Steps

### 1️⃣ Deploy Database Migrations to Supabase

**Go to Supabase Dashboard:**
1. Navigate to: https://supabase.com/dashboard
2. Select your project: `xewnzetqvrovqjcvwkus`
3. Click on **SQL Editor** in the left sidebar
4. Create a new query

**Run Migration 038 - Create Brands Table:**

Copy and paste this SQL, then click **Run**:

\`\`\`sql
-- Migration 038: Create brands table for brand-level prospection
-- This allows users to analyze and contact brands (not just products)

CREATE TABLE IF NOT EXISTS prospection.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source
  source_url TEXT NOT NULL UNIQUE,
  source_type VARCHAR(20) CHECK (source_type IN ('website', 'instagram', 'facebook', 'tiktok', 'other')),

  -- Brand Identity
  name VARCHAR(255) NOT NULL,
  tagline TEXT,
  description TEXT,

  -- Visuals
  logo_url TEXT,
  brand_images TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Product Catalog
  best_sellers JSONB DEFAULT '[]'::JSONB,

  -- Categories (multiple possible for brands)
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Company Info
  company_name VARCHAR(255),
  company_website TEXT,
  company_email VARCHAR(255),
  company_linkedin TEXT,
  company_country VARCHAR(2),
  company_address TEXT,
  company_parent VARCHAR(255),
  company_founded_year INTEGER,
  company_has_ecommerce BOOLEAN DEFAULT false,

  -- Contacts
  contacts JSONB DEFAULT '[]'::JSONB,

  -- Workflow Status
  status VARCHAR(20) DEFAULT 'to_review'
    CHECK (status IN ('to_review', 'standby', 'contacted', 'archived')),

  -- AI Analysis
  ai_confidence_score DECIMAL(3, 2),
  ai_raw_analysis JSONB,

  -- Review Tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- User Tracking
  created_by_user_id UUID REFERENCES auth.users(id),
  updated_by_user_id UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_brands_status ON prospection.brands(status);
CREATE INDEX idx_brands_company_name ON prospection.brands(company_name);
CREATE INDEX idx_brands_created_at ON prospection.brands(created_at DESC);
CREATE INDEX idx_brands_categories ON prospection.brands USING GIN(categories);

-- Enable RLS
ALTER TABLE prospection.brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read for authenticated users" ON prospection.brands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON prospection.brands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON prospection.brands
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON prospection.brands
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON prospection.brands
  FOR EACH ROW
  EXECUTE FUNCTION prospection.update_updated_at_column();

-- Comment
COMMENT ON TABLE prospection.brands IS 'Brands analyzed for prospection - focuses on brand identity, best sellers, and overall universe';
\`\`\`

Expected result: ✅ "Success. No rows returned"

**Run Migration 039 - Create Brand RPC Functions:**

Create another new query, copy and paste this SQL, then click **Run**:

\`\`\`sql
-- Migration 039: Create Brands RPC Functions

-- 1. INSERT BRAND
CREATE OR REPLACE FUNCTION public.insert_prospection_brand(
  p_source_url TEXT, p_source_type TEXT, p_name TEXT, p_tagline TEXT,
  p_description TEXT, p_logo_url TEXT, p_brand_images TEXT[],
  p_best_sellers JSONB, p_categories TEXT[], p_company_name TEXT,
  p_company_website TEXT, p_company_email TEXT, p_company_linkedin TEXT,
  p_company_country TEXT, p_company_parent TEXT, p_company_founded_year INTEGER,
  p_company_has_ecommerce BOOLEAN, p_contacts JSONB, p_ai_confidence_score DECIMAL,
  p_ai_raw_analysis JSONB, p_created_by_user_id UUID
)
RETURNS prospection.brands LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_brand prospection.brands;
BEGIN
  INSERT INTO prospection.brands (
    source_url, source_type, name, tagline, description, logo_url,
    brand_images, best_sellers, categories, company_name, company_website,
    company_email, company_linkedin, company_country, company_parent,
    company_founded_year, company_has_ecommerce, contacts, status,
    ai_confidence_score, ai_raw_analysis, created_by_user_id
  ) VALUES (
    p_source_url, p_source_type, p_name, p_tagline, p_description, p_logo_url,
    p_brand_images, p_best_sellers, p_categories, p_company_name, p_company_website,
    p_company_email, p_company_linkedin, p_company_country, p_company_parent,
    p_company_founded_year, p_company_has_ecommerce, p_contacts, 'to_review',
    p_ai_confidence_score, p_ai_raw_analysis, p_created_by_user_id
  ) RETURNING * INTO v_brand;
  RETURN v_brand;
END; $$;
GRANT EXECUTE ON FUNCTION public.insert_prospection_brand TO authenticated;

-- 2. GET BRANDS FILTERED
CREATE OR REPLACE FUNCTION public.get_prospection_brands_filtered(
  p_status TEXT DEFAULT NULL, p_categories TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0
)
RETURNS SETOF prospection.brands LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT * FROM prospection.brands
  WHERE (p_status IS NULL OR status = p_status)
    AND (p_categories IS NULL OR p_categories && categories)
  ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_prospection_brands_filtered TO authenticated;

-- 3. GET BRAND BY ID
CREATE OR REPLACE FUNCTION public.get_prospection_brand_by_id(p_brand_id UUID)
RETURNS prospection.brands LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_brand prospection.brands;
BEGIN
  SELECT * INTO v_brand FROM prospection.brands WHERE id = p_brand_id;
  RETURN v_brand;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_prospection_brand_by_id TO authenticated;

-- 4. UPDATE BRAND STATUS
CREATE OR REPLACE FUNCTION public.update_prospection_brand_status(
  p_brand_id UUID, p_new_status TEXT, p_updated_by_user_id UUID
)
RETURNS prospection.brands LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_brand prospection.brands;
BEGIN
  UPDATE prospection.brands SET status = p_new_status,
    updated_by_user_id = p_updated_by_user_id, updated_at = NOW()
  WHERE id = p_brand_id RETURNING * INTO v_brand;
  RETURN v_brand;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_prospection_brand_status TO authenticated;

-- 5. DELETE BRAND
CREATE OR REPLACE FUNCTION public.delete_prospection_brand(p_brand_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM prospection.brands WHERE id = p_brand_id;
  RETURN FOUND;
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_prospection_brand TO authenticated;

-- 6. GET BRANDS STATS
CREATE OR REPLACE FUNCTION public.get_prospection_brands_stats()
RETURNS TABLE(total BIGINT, to_review BIGINT, standby BIGINT, contacted BIGINT, archived BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE status = 'to_review')::BIGINT AS to_review,
    COUNT(*) FILTER (WHERE status = 'standby')::BIGINT AS standby,
    COUNT(*) FILTER (WHERE status = 'contacted')::BIGINT AS contacted,
    COUNT(*) FILTER (WHERE status = 'archived')::BIGINT AS archived
  FROM prospection.brands;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_prospection_brands_stats TO authenticated;

-- 7. GET BRAND CATEGORIES
CREATE OR REPLACE FUNCTION public.get_prospection_brand_categories()
RETURNS TABLE(category TEXT, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT DISTINCT unnest(categories) AS category, COUNT(*)::BIGINT AS count
  FROM prospection.brands GROUP BY category ORDER BY count DESC, category ASC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_prospection_brand_categories TO authenticated;
\`\`\`

Expected result: ✅ "Success. No rows returned"

---

### 2️⃣ Deploy Code to VPS

**Option A: Automated Deployment (Recommended)**

The script `deploy-to-vps.sh` has been created for you. Just run:

\`\`\`bash
cd /Users/laurentdavid/Desktop/App\ ODL-Tools/prospection-odl
./deploy-to-vps.sh
\`\`\`

**What the script does:**
1. ✅ Tests SSH connection to VPS
2. ✅ Syncs code to `/var/www/prospection-odl`
3. ✅ Installs dependencies (`npm install`)
4. ✅ Builds application (`npm run build`)
5. ✅ Restarts PM2 process
6. ✅ Shows application status and logs

**Option B: Manual Deployment**

If the automated script doesn't work (SSH issues), you can deploy manually:

\`\`\`bash
# 1. SSH into your VPS
ssh root@prosp.odl-tools.ch
# (or use your VPS user/host)

# 2. Navigate to project directory
cd /var/www/prospection-odl

# 3. Pull latest code (if using git)
git pull

# OR manually upload files via SFTP/rsync

# 4. Install dependencies
npm install --production

# 5. Build application
npm run build

# 6. Restart PM2
pm2 restart prospection-odl

# 7. Check status
pm2 status
pm2 logs prospection-odl --lines 20
\`\`\`

---

### 3️⃣ Verify Deployment

**Test the application:**

1. **Open the app**: https://prosp.odl-tools.ch
2. **Check navigation**: You should see "Marques" in the navbar
3. **Test dashboard**: Product/Brand toggle should appear
4. **Test brand analysis**: Try analyzing a brand URL (e.g., https://hofats.com)
5. **Check brand page**: Navigate to /dashboard/brands

**Test API directly:**

\`\`\`bash
# Test brand analysis endpoint
curl -X POST https://prosp.odl-tools.ch/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://hofats.com",
    "type": "brand"
  }'
\`\`\`

---

## 🐛 Troubleshooting

### Issue: SSH Connection Failed

The deployment script needs SSH access to your VPS. Configure it with:

\`\`\`bash
# Set environment variables before running
export VPS_USER="your-vps-username"
export VPS_HOST="your-vps-ip-or-domain"
export VPS_PATH="/path/to/project"

./deploy-to-vps.sh
\`\`\`

Or edit the script directly at line 14-16.

### Issue: PM2 Not Found

Install PM2 on the VPS:

\`\`\`bash
ssh root@prosp.odl-tools.ch
npm install -g pm2
\`\`\`

### Issue: Build Errors

Check for TypeScript errors locally first:

\`\`\`bash
npm run build
\`\`\`

Fix any errors before deploying.

---

## 📊 Summary

**Database:** ⏳ Waiting for manual SQL execution in Supabase Dashboard
**Code:** ✅ Committed and ready to deploy
**Deployment Script:** ✅ Created at `deploy-to-vps.sh`
**VPS Deployment:** ⏳ Requires SSH configuration

**Next Steps:**
1. Run the two SQL migrations in Supabase Dashboard
2. Configure SSH access to VPS (or deploy manually)
3. Run `./deploy-to-vps.sh`
4. Test the brand feature on production

---

**Questions or issues?** Check the logs:
- PM2: `ssh root@prosp.odl-tools.ch 'pm2 logs prospection-odl'`
- Nginx: `ssh root@prosp.odl-tools.ch 'tail -f /var/log/nginx/prosp.odl-tools.ch.error.log'`
