-- ============================================
-- MIGRATION 001: Initial Schema for Prospection-ODL
-- ============================================
-- Description: Création du schéma dédié 'prospection' et des tables principales
-- Author: Claude Code + Laurent David
-- Date: 2025-11-16
-- ============================================

-- Créer le schéma dédié
CREATE SCHEMA IF NOT EXISTS prospection;

-- Activer Row Level Security sur le schéma
ALTER SCHEMA prospection OWNER TO postgres;

-- ============================================
-- TABLE: categories (10 catégories principales)
-- ============================================
CREATE TABLE prospection.categories (
  id SERIAL PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_de VARCHAR(100) NOT NULL,
  name_it VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: subcategories (65 sous-catégories)
-- ============================================
CREATE TABLE prospection.subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES prospection.categories(id) ON DELETE CASCADE,
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_de VARCHAR(100) NOT NULL,
  name_it VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_subcategories_category_id ON prospection.subcategories(category_id);

-- ============================================
-- TABLE: products (produits analysés)
-- ============================================
CREATE TABLE prospection.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source du produit
  source_url TEXT NOT NULL UNIQUE,
  source_type VARCHAR(20) CHECK (source_type IN ('instagram', 'facebook', 'tiktok', 'website', 'other')),

  -- Informations produit
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES prospection.categories(id),
  subcategory_id INTEGER REFERENCES prospection.subcategories(id),

  -- Médias
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  videos TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Prix de marché (MSRP)
  msrp_eu DECIMAL(10, 2),
  msrp_ch DECIMAL(10, 2),
  msrp_source_url TEXT,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Informations entreprise
  company_name VARCHAR(255),
  company_website TEXT,
  company_email VARCHAR(255),
  company_linkedin TEXT,
  company_country VARCHAR(2),
  company_address TEXT,
  company_founded_year INTEGER,
  company_has_ecommerce BOOLEAN DEFAULT false,

  -- Statut et workflow
  status VARCHAR(20) DEFAULT 'to_review' CHECK (status IN ('to_review', 'standby', 'contacted', 'archived')),

  -- Données IA
  ai_confidence_score DECIMAL(3, 2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  ai_raw_analysis JSONB,

  -- Review humaine
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Index pour améliorer les performances
CREATE INDEX idx_products_status ON prospection.products(status);
CREATE INDEX idx_products_category_id ON prospection.products(category_id);
CREATE INDEX idx_products_subcategory_id ON prospection.products(subcategory_id);
CREATE INDEX idx_products_created_at ON prospection.products(created_at DESC);
CREATE INDEX idx_products_company_name ON prospection.products(company_name);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION prospection.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON prospection.products
FOR EACH ROW
EXECUTE FUNCTION prospection.update_updated_at_column();

-- ============================================
-- TABLE: email_templates (templates d'emails)
-- ============================================
CREATE TABLE prospection.email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  language VARCHAR(2) CHECK (language IN ('en', 'fr', 'de', 'it')),
  type VARCHAR(20) CHECK (type IN ('first_contact', 'followup_1', 'followup_2')),
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(language, type)
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON prospection.email_templates
FOR EACH ROW
EXECUTE FUNCTION prospection.update_updated_at_column();

-- ============================================
-- TABLE: email_logs (historique des emails envoyés)
-- ============================================
CREATE TABLE prospection.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES prospection.products(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES prospection.email_templates(id),

  -- Envoi
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,

  -- Tracking
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'bounced')),
  sendgrid_message_id VARCHAR(255),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Index pour améliorer les performances
CREATE INDEX idx_email_logs_product_id ON prospection.email_logs(product_id);
CREATE INDEX idx_email_logs_sent_at ON prospection.email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_status ON prospection.email_logs(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE prospection.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospection.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Tous les utilisateurs authentifiés ont accès complet (MVP)
-- TODO: Implémenter des rôles (admin, viewer, sourcing) dans une version future

-- Categories (lecture publique, modification par authentifiés)
CREATE POLICY "Categories are viewable by everyone"
  ON prospection.categories FOR SELECT
  USING (true);

CREATE POLICY "Categories are modifiable by authenticated users"
  ON prospection.categories FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Subcategories (lecture publique, modification par authentifiés)
CREATE POLICY "Subcategories are viewable by everyone"
  ON prospection.subcategories FOR SELECT
  USING (true);

CREATE POLICY "Subcategories are modifiable by authenticated users"
  ON prospection.subcategories FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Products (accès complet pour authentifiés)
CREATE POLICY "Products are viewable by authenticated users"
  ON prospection.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Products are modifiable by authenticated users"
  ON prospection.products FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Email Templates (accès complet pour authentifiés)
CREATE POLICY "Email templates are viewable by authenticated users"
  ON prospection.email_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Email templates are modifiable by authenticated users"
  ON prospection.email_templates FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Email Logs (accès complet pour authentifiés)
CREATE POLICY "Email logs are viewable by authenticated users"
  ON prospection.email_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Email logs are modifiable by authenticated users"
  ON prospection.email_logs FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Donner les permissions au rôle authenticated
GRANT USAGE ON SCHEMA prospection TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA prospection TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA prospection TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA prospection TO authenticated;

-- Donner les permissions au rôle anon (pour les catégories publiques)
GRANT USAGE ON SCHEMA prospection TO anon;
GRANT SELECT ON prospection.categories TO anon;
GRANT SELECT ON prospection.subcategories TO anon;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON SCHEMA prospection IS 'Schéma dédié pour l''application Prospection-ODL (système de veille produits avec IA)';
COMMENT ON TABLE prospection.categories IS 'Catégories principales des produits (10 catégories)';
COMMENT ON TABLE prospection.subcategories IS 'Sous-catégories des produits (65 sous-catégories)';
COMMENT ON TABLE prospection.products IS 'Produits analysés par l''IA';
COMMENT ON TABLE prospection.email_templates IS 'Templates d''emails de prospection multilingues';
COMMENT ON TABLE prospection.email_logs IS 'Historique des emails envoyés avec tracking';
