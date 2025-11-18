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
  -- Structure: [{ "name": "string", "image_url": "string|null", "category": "string|null" }]

  -- Categories (multiple possible for brands)
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Company Info (shared structure with products)
  company_name VARCHAR(255),
  company_website TEXT,
  company_email VARCHAR(255),
  company_linkedin TEXT,
  company_country VARCHAR(2),
  company_address TEXT,
  company_parent VARCHAR(255),
  company_founded_year INTEGER,
  company_has_ecommerce BOOLEAN DEFAULT false,

  -- Contacts (shared structure with products)
  contacts JSONB DEFAULT '[]'::JSONB,
  -- Structure: [{ "name": "string", "role": "string", "email": "string", "linkedin": "string", "market": "CH|EU|BOTH" }]

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

-- RLS Policies (same as products - all authenticated users can read/write for MVP)
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
COMMENT ON TABLE prospection.brands IS 'Brands analyzed for prospection - focuses on brand identity, best sellers, and overall universe rather than individual products';
