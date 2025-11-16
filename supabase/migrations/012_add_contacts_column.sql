-- ============================================
-- MIGRATION 012: Add contacts column to products
-- ============================================
-- Description: Ajoute une colonne JSONB pour stocker les contacts extraits
-- Author: Claude Code + Laurent David
-- Date: 2025-11-16
-- ============================================

-- Ajouter la colonne contacts (array de contacts en JSONB)
ALTER TABLE prospection.products
ADD COLUMN contacts JSONB DEFAULT '[]'::JSONB;

-- Commentaire pour documentation
COMMENT ON COLUMN prospection.products.contacts IS 'Array de contacts décisionnaires (JSON): [{"name": "John Doe", "title": "Sales Manager", "email": "j.doe@company.com", "linkedin_url": "https://linkedin.com/in/johndoe", "location": "Paris, France", "phone": "+33...", "source": "claude_extraction", "confidence": 0.85}]';

-- Index GIN pour recherche efficace dans le JSONB
CREATE INDEX idx_products_contacts_gin ON prospection.products USING GIN (contacts);

-- Exemple de requête pour trouver des produits avec contacts:
-- SELECT * FROM prospection.products WHERE jsonb_array_length(contacts) > 0;
