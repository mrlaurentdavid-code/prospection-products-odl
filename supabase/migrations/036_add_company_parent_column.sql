-- ============================================
-- MIGRATION 036: Add company_parent column to products table
-- ============================================
-- Description: Ajout de la colonne company_parent pour stocker la société mère
--              Exemple: Womanizer → WOW Tech Group
-- Author: Claude Code + Laurent David
-- Date: 2025-11-18
-- ============================================

-- Ajouter la colonne company_parent
ALTER TABLE prospection.products
ADD COLUMN IF NOT EXISTS company_parent VARCHAR(255);

-- Commentaire sur la colonne
COMMENT ON COLUMN prospection.products.company_parent IS 'Société mère si applicable (ex: WOW Tech Group pour Womanizer)';

-- Créer un index pour les recherches
CREATE INDEX IF NOT EXISTS idx_products_company_parent ON prospection.products(company_parent);
