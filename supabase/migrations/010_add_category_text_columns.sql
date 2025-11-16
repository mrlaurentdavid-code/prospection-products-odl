-- Migration 010: Add category and subcategory TEXT columns to products table
-- Rationale: The AI analysis returns category names (not IDs), so we store them directly

ALTER TABLE prospection.products
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON prospection.products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON prospection.products(subcategory);

-- Comment for clarity
COMMENT ON COLUMN prospection.products.category IS 'Category name from AI analysis (e.g., "Sports & Leisure")';
COMMENT ON COLUMN prospection.products.subcategory IS 'Subcategory name from AI analysis (e.g., "Water Sports")';
