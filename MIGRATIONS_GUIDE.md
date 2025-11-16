# Guide d'application des migrations SQL

## 📋 Nouvelles migrations pour les contacts

Deux nouvelles migrations ont été créées pour supporter la collecte de contacts :

1. **012_add_contacts_column.sql** : Ajoute la colonne `contacts` (JSONB) à la table `products`
2. **013_update_insert_product_add_contacts.sql** : Met à jour la fonction RPC `insert_prospection_product` pour accepter les contacts

## 🚀 Comment appliquer les migrations

### Option 1 : Via l'interface Supabase (RECOMMANDÉ)

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet : **xewnzetqvrovqjcvwkus**
3. Aller dans **SQL Editor** (menu de gauche)
4. Cliquer sur **New Query**

#### Migration 012 : Ajouter la colonne contacts

```sql
-- Copier/coller le contenu de:
-- supabase/migrations/012_add_contacts_column.sql

-- Ajouter la colonne contacts (array de contacts en JSONB)
ALTER TABLE prospection.products
ADD COLUMN contacts JSONB DEFAULT '[]'::JSONB;

-- Commentaire pour documentation
COMMENT ON COLUMN prospection.products.contacts IS 'Array de contacts décisionnaires (JSON): [{"name": "John Doe", "title": "Sales Manager", "email": "j.doe@company.com", "linkedin_url": "https://linkedin.com/in/johndoe", "location": "Paris, France", "phone": "+33...", "source": "claude_extraction", "confidence": 0.85}]';

-- Index GIN pour recherche efficace dans le JSONB
CREATE INDEX idx_products_contacts_gin ON prospection.products USING GIN (contacts);
```

5. Cliquer sur **Run** (Ctrl+Enter)
6. Vérifier que la requête s'est exécutée avec succès ✅

#### Migration 013 : Mettre à jour la fonction RPC

```sql
-- Copier/coller le contenu de:
-- supabase/migrations/013_update_insert_product_add_contacts.sql

-- Supprimer l'ancienne version
DROP FUNCTION IF EXISTS public.insert_prospection_product(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT[], DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB);

-- Créer la nouvelle version avec contacts
CREATE OR REPLACE FUNCTION public.insert_prospection_product(
  p_source_url TEXT,
  p_source_type TEXT,
  p_name TEXT,
  p_description TEXT,
  p_category_id INTEGER,
  p_subcategory_id INTEGER,
  p_category TEXT,
  p_subcategory TEXT,
  p_images TEXT[],
  p_msrp_eu DECIMAL,
  p_msrp_ch DECIMAL,
  p_msrp_source_url TEXT,
  p_company_name TEXT,
  p_company_website TEXT,
  p_company_email TEXT,
  p_company_linkedin TEXT,
  p_company_country TEXT,
  p_ai_confidence_score DECIMAL,
  p_ai_raw_analysis JSONB,
  p_contacts JSONB DEFAULT '[]'::JSONB  -- NOUVEAU: Contacts
)
RETURNS prospection.products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product prospection.products;
BEGIN
  INSERT INTO prospection.products (
    source_url,
    source_type,
    name,
    description,
    category_id,
    subcategory_id,
    category,
    subcategory,
    images,
    msrp_eu,
    msrp_ch,
    msrp_source_url,
    company_name,
    company_website,
    company_email,
    company_linkedin,
    company_country,
    status,
    ai_confidence_score,
    ai_raw_analysis,
    contacts  -- NOUVEAU
  ) VALUES (
    p_source_url,
    p_source_type,
    p_name,
    p_description,
    p_category_id,
    p_subcategory_id,
    p_category,
    p_subcategory,
    p_images,
    p_msrp_eu,
    p_msrp_ch,
    p_msrp_source_url,
    p_company_name,
    p_company_website,
    p_company_email,
    p_company_linkedin,
    p_company_country,
    'to_review',
    p_ai_confidence_score,
    p_ai_raw_analysis,
    p_contacts  -- NOUVEAU
  )
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.insert_prospection_product(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT[], DECIMAL, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, JSONB, JSONB) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.insert_prospection_product IS 'Insère un nouveau produit dans prospection.products avec catégories TEXT et contacts (accessible via RPC)';
```

7. Cliquer sur **Run** (Ctrl+Enter)
8. Vérifier que la requête s'est exécutée avec succès ✅

### Option 2 : Via Supabase CLI (pour les utilisateurs avancés)

```bash
# Se connecter à Supabase
supabase login

# Lier le projet local au projet distant
supabase link --project-ref xewnzetqvrovqjcvwkus

# Appliquer toutes les migrations
supabase db push
```

## ✅ Vérification

Pour vérifier que les migrations ont bien été appliquées :

```sql
-- Vérifier que la colonne contacts existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prospection'
  AND table_name = 'products'
  AND column_name = 'contacts';

-- Devrait retourner:
-- column_name | data_type
-- contacts    | jsonb

-- Vérifier que la fonction RPC a été mise à jour
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'insert_prospection_product';

-- Devrait retourner:
-- proname                    | pronargs
-- insert_prospection_product | 20  (20 arguments au lieu de 19)
```

## 🎯 Ce que ça change

### Avant
```json
{
  "product": {...},
  "company": {...},
  "pricing": {...}
}
```

### Après
```json
{
  "product": {...},
  "company": {...},
  "pricing": {...},
  "contacts": [  // NOUVEAU
    {
      "name": "John Doe",
      "title": "Sales Manager Europe",
      "email": "j.doe@company.com",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "location": "Paris, France",
      "phone": "+33 6 XX XX XX XX",
      "source": "claude_extraction",
      "confidence": 0.85
    }
  ]
}
```

## 🔧 Optionnel : Hunter.io

Si vous voulez enrichir les contacts avec Hunter.io :

1. S'inscrire sur [https://hunter.io](https://hunter.io) (gratuit 50 recherches/mois)
2. Récupérer votre **API Key** dans les paramètres
3. Ajouter dans `.env.local` :

```bash
HUNTER_API_KEY=your-hunter-api-key-here
```

Si vous ne configurez pas Hunter.io, l'extraction de contacts fonctionnera quand même via Claude uniquement.

## 📝 Notes

- Les migrations sont **non destructives** (pas de perte de données)
- La colonne `contacts` est ajoutée avec une valeur par défaut `[]` (array vide)
- Les anciens produits auront `contacts = []`
- Les nouveaux produits auront les contacts extraits automatiquement

---

**Besoin d'aide ?** Consulter la documentation Supabase : [https://supabase.com/docs/guides/database/migrations](https://supabase.com/docs/guides/database/migrations)
