# 🏢 PLAN COMPLET - Fonctionnalité "MARQUE"

## 📋 RÉSUMÉ EXÉCUTIF

L'application actuelle est 100% orientée **PRODUIT** (analyse d'un produit spécifique). La nouvelle fonctionnalité "MARQUE" permettra d'analyser une **marque entière** avec une approche plus généraliste: logo, best sellers, univers de la marque, templates d'email adaptés.

---

## 🔍 AUDIT DE L'EXISTANT

### 1. Structure de données actuelle (Produits)

**Table: `prospection.products`**
```sql
- id, created_at, updated_at
- source_url, source_type
- name, description
- category_id, subcategory_id
- images[], videos[]
- msrp_eu, msrp_ch, currency
- company_name, company_website, company_email, company_linkedin
- company_country, company_address, company_founded_year
- company_has_ecommerce
- company_parent (société mère)
- status (to_review, standby, contacted, archived)
- ai_confidence_score, ai_raw_analysis
- contacts JSONB[] (manager CH/EU)
- reviewed_by, reviewed_at
- created_by_user_id, updated_by_user_id
```

**Caractéristiques "PRODUIT":**
- ✅ Focus sur UN produit spécifique
- ✅ Prix MSRP (EU/CH)
- ✅ Catégorisation stricte (10 + 65)
- ✅ Images du produit
- ✅ Description technique du produit
- ✅ Contacts ciblés sur ce produit

### 2. Composants frontend actuels

**Point d'entrée UX:**
- `QuickAnalyze.tsx` - Barre de recherche (URL uniquement)

**Pages:**
- `/dashboard` - Dashboard avec stats produits
- `/dashboard/products` - Liste produits (grid de cartes)
- `/dashboard/products/[id]` - Détail produit
- `/dashboard/contacted` - Produits contactés
- `/dashboard/archived` - Produits archivés

**Composants:**
- `ModernProductCard.tsx` - Card produit (grid)
- `LatestGemsHeader.tsx` - Carrousel derniers produits
- `ProductsFilters.tsx` - Filtres (statut, catégorie, sous-catégorie)
- `ProductImage.tsx` - Affichage images produit
- `ContactsList.tsx` - Liste contacts trouvés
- `EmailComposer.tsx` - Composer email (spécifique produit)
- `ProductHistory.tsx` - Historique actions produit
- `ImageGalleryManager.tsx` - Gestion images produit

### 3. API & Services

**API Routes:**
- `/api/analyze` - Analyse produit (POST)
- `/api/products/[id]` - CRUD produit
- `/api/products/[id]/history` - Historique
- `/api/email/log` - Log email envoyé
- `/api/email/templates` - Templates email

**Services:**
- `jina-scraper.ts` - Scraping avec Jina AI
- `claude-analyzer.ts` - Analyse avec Claude (prompt produit)
- `hunter-io.ts` - Enrichissement emails
- `contact-page-enrichment.ts` - Extraction contacts

**Prompt Claude actuel:**
```
"Tu es un expert en analyse de produits..."
→ Focus: nom produit, description produit, catégorie, MSRP
→ Objectif: extraire infos d'UN produit spécifique
```

### 4. Templates email actuels

**Tables:**
- `prospection.email_templates` (first_contact, followup_1, followup_2)
- Variables: `{product_name}`, `{product_category}`, `{company_name}`, `{recipient_name}`, `{msrp_eu}`, `{msrp_ch}`

**Ton actuel:**
- Focus sur UN produit spécifique
- "Nous sommes intéressés par votre produit {product_name}..."
- Prix MSRP mentionné

---

## 🎯 NOUVELLE FONCTIONNALITÉ "MARQUE"

### Différences clés: Produit vs Marque

| Aspect | PRODUIT | MARQUE |
|--------|---------|--------|
| **Focus** | UN produit spécifique | L'univers de la marque |
| **Images** | Photos du produit | Logo + visuels marque |
| **Prix** | MSRP EU/CH | Pas de prix (catalogue) |
| **Description** | Technique, caractéristiques | Présentation marque, valeurs, histoire |
| **Catégorie** | 1 catégorie précise | Plusieurs catégories possibles |
| **Best sellers** | - | Liste des produits phares |
| **Email** | "Intéressés par X produit" | "Partenariat avec votre marque" |
| **URL source** | Page produit | Homepage marque / About |

### Ce qu'on doit capturer (Marque)

```typescript
interface Brand {
  // Identité
  name: string;
  tagline?: string;
  description: string; // Présentation, histoire, valeurs

  // Visuels
  logo_url: string; // IMPORTANT
  brand_images: string[]; // Images générales marque

  // Catalogue
  best_sellers: {
    name: string;
    image_url?: string;
    category?: string;
  }[];

  // Catégories couvertes
  categories: string[]; // Plusieurs possibles

  // Infos entreprise (partagé avec produit)
  company_name: string;
  company_website: string;
  company_email?: string;
  company_linkedin?: string;
  company_country?: string;
  company_parent?: string;
  company_founded_year?: number;

  // Contacts (partagé)
  contacts: Contact[];

  // Métadonnées (partagé)
  source_url: string;
  source_type: string;
  status: 'to_review' | 'standby' | 'contacted' | 'archived';
  ai_confidence_score: number;
  ai_raw_analysis: object;
}
```

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Option 1: Table séparée `brands` (RECOMMANDÉ)

**Avantages:**
- ✅ Séparation claire des concerns
- ✅ Schéma adapté (logo, best_sellers, etc.)
- ✅ Pas de pollution de la table products
- ✅ Facilite les requêtes et filtres
- ✅ Évolutif (stats, analytics séparés)

**Inconvénients:**
- ⚠️ Duplication de certaines colonnes (company_*, contacts, status)
- ⚠️ Besoin de dupliquer certaines RPC functions

**Structure proposée:**
```sql
CREATE TABLE prospection.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source
  source_url TEXT NOT NULL UNIQUE,
  source_type VARCHAR(20),

  -- Identité marque
  name VARCHAR(255) NOT NULL,
  tagline TEXT,
  description TEXT,

  -- Visuels
  logo_url TEXT,
  brand_images TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Catalogue
  best_sellers JSONB DEFAULT '[]'::JSONB,
  -- Structure: [{ name, image_url, category }]

  -- Catégories (plusieurs possibles)
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Infos entreprise (identique à products)
  company_name VARCHAR(255),
  company_website TEXT,
  company_email VARCHAR(255),
  company_linkedin TEXT,
  company_country VARCHAR(2),
  company_address TEXT,
  company_parent VARCHAR(255),
  company_founded_year INTEGER,
  company_has_ecommerce BOOLEAN DEFAULT false,

  -- Contacts (identique à products)
  contacts JSONB DEFAULT '[]'::JSONB,

  -- Workflow (identique à products)
  status VARCHAR(20) DEFAULT 'to_review'
    CHECK (status IN ('to_review', 'standby', 'contacted', 'archived')),

  -- IA (identique à products)
  ai_confidence_score DECIMAL(3, 2),
  ai_raw_analysis JSONB,

  -- Review (identique à products)
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Tracking user
  created_by_user_id UUID REFERENCES auth.users(id),
  updated_by_user_id UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX idx_brands_status ON prospection.brands(status);
CREATE INDEX idx_brands_company_name ON prospection.brands(company_name);
CREATE INDEX idx_brands_created_at ON prospection.brands(created_at DESC);
```

### Option 2: Colonne `type` dans `products` (NON RECOMMANDÉ)

❌ Pollue le schéma existant
❌ Colonnes NULL selon le type (logo pour marque, msrp pour produit)
❌ Complexité des requêtes et filtres
❌ Migrations risquées sur table existante

**→ DÉCISION: Option 1 (table séparée)**

---

## 📐 PLAN D'IMPLÉMENTATION DÉTAILLÉ

### PHASE 1: DATABASE (Migrations Supabase)

**Migration 038: Create brands table**
```sql
-- Créer table brands (voir structure ci-dessus)
-- Créer RLS policies
-- Créer trigger updated_at
```

**Migration 039: Create brands RPC functions**
```sql
-- insert_brand(...)
-- get_brands_filtered(status, categories, limit, offset)
-- get_brand_by_id(brand_id)
-- update_brand_status(brand_id, new_status)
-- delete_brand(brand_id)
-- get_brands_stats()
```

**Migration 040: Update email_templates for brands**
```sql
-- Ajouter colonne: entity_type VARCHAR(20) CHECK (entity_type IN ('product', 'brand', 'both'))
-- Dupliquer templates existants avec entity_type='both'
-- Créer nouveaux templates spécifiques marque:
  - brand_first_contact_{en,fr,de,it}
  - brand_followup_1_{en,fr,de,it}

-- Variables templates marque:
  - {brand_name}
  - {brand_tagline}
  - {best_sellers_list}
  - {categories_list}
  - {company_name}
  - {recipient_name}
```

**Temps estimé: 2-3h**

---

### PHASE 2: BACKEND SERVICES

#### 2.1 Créer `lib/services/claude-brand-analyzer.ts`

**Nouveau prompt Claude spécifique marque:**
```typescript
export async function analyzeBrand(
  scrapedData: JinaScrapedData,
): Promise<ClaudeBrandAnalysis> {

  const prompt = `Tu es un expert en analyse de marques pour une marketplace suisse.
Analyse ce contenu et retourne UNIQUEMENT un JSON valide.

DONNÉES DE LA MARQUE:
Title: ${scrapedData.title}
Content: ${scrapedData.content.slice(0, 20000)}

INSTRUCTIONS:
1. Extrait le nom exact de la marque
2. Identifie le tagline/slogan s'il existe
3. **Rédige une description de la marque EN FRANÇAIS** (histoire, valeurs, univers)
4. **PRIORITAIRE: Trouve l'URL du LOGO** (header, footer, balise <img> avec "logo")
5. Identifie les 3-5 best sellers / produits phares avec:
   - Nom du produit
   - URL image si disponible
   - Catégorie approximative
6. Liste les catégories de produits couvertes (max 5)
7. Informations entreprise (nom, website, email, LinkedIn, pays, société mère)
8. Contacts ciblés marché CH/EU
9. Score de confiance

FORMAT JSON:
{
  "name": "string",
  "tagline": "string|null",
  "description": "string (FR)",
  "logo_url": "string|null",
  "brand_images": ["url1", "url2"],
  "best_sellers": [
    { "name": "string", "image_url": "string|null", "category": "string|null" }
  ],
  "categories": ["category1", "category2"],
  "company_name": "string",
  "company_website": "string",
  "company_email": "string|null",
  "company_linkedin": "string|null",
  "company_country": "string|null",
  "company_parent": "string|null",
  "company_founded_year": number|null,
  "contacts": [...],
  "confidence_score": number
}`;

  // ... appel Claude API
}
```

#### 2.2 Créer validation schema `lib/utils/validators.ts`

```typescript
export const claudeBrandAnalysisSchema = z.object({
  name: z.string(),
  tagline: z.string().nullable(),
  description: z.string(),
  logo_url: z.string().url().nullable(),
  brand_images: z.array(z.string().url()),
  best_sellers: z.array(z.object({
    name: z.string(),
    image_url: z.string().url().nullable(),
    category: z.string().nullable(),
  })),
  categories: z.array(z.string()),
  company_name: z.string(),
  company_website: z.string().url(),
  company_email: z.string().email().nullable(),
  company_linkedin: z.string().url().nullable(),
  company_country: z.string().length(2).nullable(),
  company_parent: z.string().nullable(),
  company_founded_year: z.number().int().nullable(),
  contacts: z.array(contactSchema),
  confidence_score: z.number().min(0).max(1),
});
```

#### 2.3 Types TypeScript `lib/supabase/types.ts`

```typescript
export interface Brand {
  id: string;
  created_at: string;
  updated_at: string;
  source_url: string;
  source_type: string;
  name: string;
  tagline: string | null;
  description: string;
  logo_url: string | null;
  brand_images: string[];
  best_sellers: BestSeller[];
  categories: string[];
  company_name: string;
  company_website: string;
  company_email: string | null;
  company_linkedin: string | null;
  company_country: string | null;
  company_address: string | null;
  company_parent: string | null;
  company_founded_year: number | null;
  company_has_ecommerce: boolean;
  contacts: Contact[];
  status: 'to_review' | 'standby' | 'contacted' | 'archived';
  ai_confidence_score: number;
  ai_raw_analysis: any;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
}

export interface BestSeller {
  name: string;
  image_url: string | null;
  category: string | null;
}
```

**Temps estimé: 3-4h**

---

### PHASE 3: API ROUTES

#### 3.1 Modifier `/api/analyze/route.ts`

**Ajouter paramètre `type` dans body:**
```typescript
const body = await req.json();
const { url, type = 'product' } = body; // 'product' | 'brand'

if (type === 'product') {
  // Logique existante (analyzeProduct)
} else if (type === 'brand') {
  // Nouvelle logique (analyzeBrand)
  const analysis = await analyzeBrand(scrapedData);

  // Insert dans brands table
  const { data, error } = await supabase.rpc('insert_brand', {
    ...analysis,
    p_source_url: url,
    p_created_by_user_id: user.id,
  });
}
```

#### 3.2 Créer `/api/brands/[id]/route.ts`

```typescript
// GET - Récupérer une marque
// PATCH - Mettre à jour statut
// DELETE - Archiver/supprimer
```

#### 3.3 Créer `/api/brands/[id]/history/route.ts`

```typescript
// GET - Historique actions marque (emails envoyés, changements statut)
```

**Temps estimé: 2-3h**

---

### PHASE 4: FRONTEND - UX Point d'entrée

#### 4.1 Modifier `components/QuickAnalyze.tsx`

**Ajouter sélecteur "Produit" vs "Marque":**
```tsx
export function QuickAnalyze() {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'product' | 'brand'>('product');
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔍 Analyse rapide</CardTitle>
        <CardDescription>
          Collez une URL pour lancer une analyse automatique
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Toggle Produit / Marque */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={type === 'product' ? 'default' : 'outline'}
            onClick={() => setType('product')}
            className="flex-1"
          >
            📦 Produit
          </Button>
          <Button
            variant={type === 'brand' ? 'default' : 'outline'}
            onClick={() => setType('brand')}
            className="flex-1"
          >
            🏢 Marque
          </Button>
        </div>

        {/* Input URL */}
        <Input
          placeholder={
            type === 'product'
              ? 'https://example.com/product/...'
              : 'https://brand.com ou https://brand.com/about'
          }
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        {/* Description contextuelle */}
        <p className="text-sm text-gray-500 mt-2">
          {type === 'product'
            ? 'Analysez un produit spécifique (prix, caractéristiques, contacts)'
            : 'Analysez une marque entière (logo, best sellers, univers)'}
        </p>

        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : 'Analyser'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### 4.2 Navigation: Ajouter onglet "Marques"

**Modifier `components/Navbar.tsx`:**
```tsx
<nav>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/dashboard/products">Produits</Link>
  <Link href="/dashboard/brands">Marques</Link> {/* NOUVEAU */}
  <Link href="/dashboard/contacted">Contactés</Link>
  <Link href="/dashboard/archived">Archives</Link>
</nav>
```

**Temps estimé: 2-3h**

---

### PHASE 5: FRONTEND - Pages Marques

#### 5.1 Créer `app/dashboard/brands/page.tsx`

**Liste des marques (inspiré de products/page.tsx):**
```tsx
export default async function BrandsPage({ searchParams }) {
  const supabase = await createClient();
  const params = await searchParams;

  const status = params.status || null;

  // RPC function
  const { data: brands } = await supabase.rpc('get_brands_filtered', {
    p_status: status,
    p_categories: null,
    p_limit: 100,
    p_offset: 0,
  });

  return (
    <div className="space-y-8">
      <h1>🏢 Marques</h1>
      <p>{brands?.length || 0} marque(s) analysée(s)</p>

      {/* Quick Analyze avec type='brand' par défaut */}
      <QuickAnalyze defaultType="brand" />

      {/* Filtres */}
      <BrandsFilters />

      {/* Grid de cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {brands.map((brand) => (
          <Link key={brand.id} href={`/dashboard/brands/${brand.id}`}>
            <BrandCard brand={brand} />
          </Link>
        ))}
      </div>
    </div>
  );
}
```

#### 5.2 Créer `components/BrandCard.tsx`

**Card marque (inspiré de ModernProductCard):**
```tsx
export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Card>
      <CardHeader>
        {/* Logo de la marque */}
        {brand.logo_url && (
          <div className="w-full h-32 relative mb-4">
            <Image
              src={brand.logo_url}
              alt={brand.name}
              fill
              className="object-contain"
            />
          </div>
        )}

        <CardTitle>{brand.name}</CardTitle>
        {brand.tagline && (
          <p className="text-sm text-gray-600">{brand.tagline}</p>
        )}
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-700 line-clamp-3">
          {brand.description}
        </p>

        {/* Badges catégories */}
        <div className="flex flex-wrap gap-2 mt-3">
          {brand.categories.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>

        {/* Best sellers preview */}
        {brand.best_sellers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">
              🌟 {brand.best_sellers.length} best seller(s)
            </p>
            <div className="flex gap-2">
              {brand.best_sellers.slice(0, 3).map((bs, idx) => (
                <div key={idx} className="w-12 h-12 rounded bg-gray-100 relative">
                  {bs.image_url && (
                    <Image src={bs.image_url} alt={bs.name} fill className="object-cover rounded" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <StatusBadge status={brand.status} />
        <div className="ml-auto text-xs text-gray-500">
          {brand.company_country && `🌍 ${brand.company_country}`}
        </div>
      </CardFooter>
    </Card>
  );
}
```

#### 5.3 Créer `app/dashboard/brands/[id]/page.tsx`

**Détail marque (inspiré de products/[id]/page.tsx):**
```tsx
export default async function BrandDetailPage({ params }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: brand } = await supabase.rpc('get_brand_by_id', {
    p_brand_id: id,
  });

  return (
    <div className="space-y-8">
      {/* Header avec logo */}
      <div className="flex items-start gap-6">
        {brand.logo_url && (
          <div className="w-32 h-32 relative flex-shrink-0 bg-white rounded-lg p-4">
            <Image src={brand.logo_url} alt={brand.name} fill className="object-contain" />
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-4xl font-bold">{brand.name}</h1>
          {brand.tagline && (
            <p className="text-xl text-gray-600 mt-2">{brand.tagline}</p>
          )}
          <StatusBadge status={brand.status} className="mt-4" />
        </div>

        {/* Actions */}
        <BrandActions brand={brand} />
      </div>

      {/* Description */}
      <Card>
        <CardHeader><CardTitle>À propos</CardTitle></CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-line">{brand.description}</p>
        </CardContent>
      </Card>

      {/* Best Sellers */}
      {brand.best_sellers.length > 0 && (
        <Card>
          <CardHeader><CardTitle>🌟 Best Sellers</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {brand.best_sellers.map((bs, idx) => (
                <div key={idx} className="text-center">
                  {bs.image_url && (
                    <div className="aspect-square relative rounded-lg overflow-hidden mb-2">
                      <Image src={bs.image_url} alt={bs.name} fill className="object-cover" />
                    </div>
                  )}
                  <p className="text-sm font-medium">{bs.name}</p>
                  {bs.category && (
                    <Badge variant="outline" className="text-xs mt-1">{bs.category}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Catégories */}
      <Card>
        <CardHeader><CardTitle>Catégories de produits</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {brand.categories.map((cat) => (
              <Badge key={cat}>{cat}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Infos entreprise */}
      <Card>
        <CardHeader><CardTitle>Informations entreprise</CardTitle></CardHeader>
        <CardContent>
          {/* Identique à produit */}
        </CardContent>
      </Card>

      {/* Contacts */}
      {brand.contacts.length > 0 && (
        <ContactsList contacts={brand.contacts} />
      )}

      {/* Galerie visuels */}
      {brand.brand_images.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Visuels de la marque</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {brand.brand_images.map((img, idx) => (
                <div key={idx} className="aspect-video relative rounded-lg overflow-hidden">
                  <Image src={img} alt={`${brand.name} visual ${idx + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <BrandHistory brandId={brand.id} />
    </div>
  );
}
```

#### 5.4 Créer `components/BrandActions.tsx`

```tsx
export function BrandActions({ brand }: { brand: Brand }) {
  return (
    <div className="flex gap-2">
      {/* Bouton Email (ouvre EmailComposer avec mode='brand') */}
      <EmailComposerDialog brand={brand} />

      {/* Bouton Statut */}
      <StatusDropdown
        currentStatus={brand.status}
        onStatusChange={(newStatus) => updateBrandStatus(brand.id, newStatus)}
      />

      {/* Bouton Supprimer */}
      <DeleteButton onDelete={() => deleteBrand(brand.id)} />
    </div>
  );
}
```

**Temps estimé: 6-8h**

---

### PHASE 6: EMAIL TEMPLATES MARQUE

#### 6.1 Modifier `components/EmailComposer.tsx`

**Support mode='brand':**
```tsx
interface EmailComposerProps {
  product?: Product;
  brand?: Brand;
  mode: 'product' | 'brand';
}

export function EmailComposer({ product, brand, mode }: EmailComposerProps) {
  const entity = mode === 'product' ? product : brand;

  // Charger templates selon entity_type
  const { data: templates } = await supabase
    .rpc('get_email_templates')
    .in('entity_type', ['both', mode]);

  // Remplacer variables
  const replacedBody = mode === 'product'
    ? body
        .replace(/\{product_name\}/g, product.name)
        .replace(/\{product_category\}/g, product.category)
        .replace(/\{msrp_eu\}/g, product.msrp_eu)
        // ...
    : body
        .replace(/\{brand_name\}/g, brand.name)
        .replace(/\{brand_tagline\}/g, brand.tagline)
        .replace(/\{best_sellers_list\}/g, brand.best_sellers.map(bs => bs.name).join(', '))
        .replace(/\{categories_list\}/g, brand.categories.join(', '))
        // ...

  // ...
}
```

#### 6.2 Seed nouveaux templates (Migration 040)

**Template: `brand_first_contact_fr`**
```
Objet: Partenariat O!deal - {brand_name}

Bonjour {recipient_name},

Je suis {user_name} de O!deal, la marketplace suisse de référence pour les produits innovants.

Nous sommes très intéressés par l'univers de {brand_name} et vos produits dans les catégories {categories_list}.

Vos best sellers comme {best_sellers_list} correspondent parfaitement à notre positionnement qualité.

O!deal propose:
- Accès au marché suisse (boutiques et e-commerce)
- Visibilité auprès de retailers sélectionnés
- Support marketing et logistique

Seriez-vous disponible pour échanger sur un partenariat ?

Cordialement,
{user_name}
O!deal
```

**Template: `brand_first_contact_en`**
```
Subject: Partnership opportunity - O!deal x {brand_name}

Hello {recipient_name},

I am {user_name} from O!deal, Switzerland's leading marketplace for innovative products.

We are very interested in {brand_name}'s universe and your products in {categories_list}.

Your best sellers like {best_sellers_list} align perfectly with our quality positioning.

O!deal offers:
- Access to the Swiss market (retail and e-commerce)
- Visibility with selected retailers
- Marketing and logistics support

Would you be available to discuss a partnership?

Best regards,
{user_name}
O!deal
```

**Temps estimé: 3-4h**

---

### PHASE 7: DASHBOARD & STATS

#### 7.1 Modifier `app/dashboard/page.tsx`

**Ajouter stats marques:**
```tsx
const { data: productStats } = await supabase.rpc('get_products_stats');
const { data: brandStats } = await supabase.rpc('get_brands_stats');

return (
  <div className="grid grid-cols-2 gap-6">
    {/* Card Produits */}
    <Card>
      <CardHeader>
        <CardTitle>📦 Produits</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Total: {productStats.total}</p>
        <p>À réviser: {productStats.to_review}</p>
        <p>Contactés: {productStats.contacted}</p>
      </CardContent>
    </Card>

    {/* Card Marques */}
    <Card>
      <CardHeader>
        <CardTitle>🏢 Marques</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Total: {brandStats.total}</p>
        <p>À réviser: {brandStats.to_review}</p>
        <p>Contactés: {brandStats.contacted}</p>
      </CardContent>
    </Card>
  </div>
);
```

#### 7.2 Modifier `components/LatestGemsHeader.tsx`

**Support marques:**
```tsx
interface LatestGemsHeaderProps {
  products: Product[];
  brands: Brand[]; // NOUVEAU
}

// Afficher les 2 types dans le carrousel
const allItems = [
  ...products.map(p => ({ type: 'product', data: p })),
  ...brands.map(b => ({ type: 'brand', data: b })),
];
```

**Temps estimé: 2-3h**

---

### PHASE 8: FILTRES & RECHERCHE

#### 8.1 Créer `components/BrandsFilters.tsx`

```tsx
export function BrandsFilters() {
  return (
    <div className="flex gap-4">
      {/* Filtre Statut */}
      <Select name="status">
        <option value="all">Tous les statuts</option>
        <option value="to_review">À réviser</option>
        <option value="standby">En attente</option>
        <option value="contacted">Contacté</option>
      </Select>

      {/* Filtre Catégories (multi-select possible) */}
      <MultiSelect name="categories">
        <option value="Food & Beverage">Food & Beverage</option>
        <option value="Beauty & Wellness">Beauty & Wellness</option>
        {/* ... */}
      </MultiSelect>

      {/* Filtre Pays */}
      <Select name="country">
        <option value="all">Tous les pays</option>
        <option value="CH">Suisse</option>
        <option value="FR">France</option>
        <option value="DE">Allemagne</option>
        {/* ... */}
      </Select>
    </div>
  );
}
```

**Temps estimé: 2h**

---

## 📊 RÉCAPITULATIF DES FICHIERS

### À CRÉER

**Database:**
- `supabase/migrations/038_create_brands_table.sql`
- `supabase/migrations/039_create_brands_rpc_functions.sql`
- `supabase/migrations/040_update_email_templates_for_brands.sql`

**Services:**
- `lib/services/claude-brand-analyzer.ts`

**API:**
- `app/api/brands/[id]/route.ts`
- `app/api/brands/[id]/history/route.ts`

**Pages:**
- `app/dashboard/brands/page.tsx`
- `app/dashboard/brands/[id]/page.tsx`

**Composants:**
- `components/BrandCard.tsx`
- `components/BrandActions.tsx`
- `components/BrandsFilters.tsx`
- `components/BrandHistory.tsx`

### À MODIFIER

**Services:**
- `lib/utils/validators.ts` (ajouter `claudeBrandAnalysisSchema`)

**Types:**
- `lib/supabase/types.ts` (ajouter `Brand`, `BestSeller`)

**API:**
- `app/api/analyze/route.ts` (support paramètre `type`)

**Composants:**
- `components/QuickAnalyze.tsx` (toggle Produit/Marque)
- `components/Navbar.tsx` (lien Marques)
- `components/EmailComposer.tsx` (support mode='brand')
- `components/LatestGemsHeader.tsx` (afficher marques)

**Pages:**
- `app/dashboard/page.tsx` (stats marques)

---

## ⏱️ ESTIMATION TEMPS TOTAL

| Phase | Tâches | Temps estimé |
|-------|--------|--------------|
| Phase 1 | Database (migrations, RPC) | 2-3h |
| Phase 2 | Backend services (analyzer, validators) | 3-4h |
| Phase 3 | API routes | 2-3h |
| Phase 4 | UX point d'entrée (QuickAnalyze, Navbar) | 2-3h |
| Phase 5 | Pages marques (liste, détail) | 6-8h |
| Phase 6 | Email templates marque | 3-4h |
| Phase 7 | Dashboard & stats | 2-3h |
| Phase 8 | Filtres & recherche | 2h |
| **TOTAL** | | **22-30h** |

**Estimation réaliste: 3-4 jours de développement**

---

## 🎯 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. **Database** (Phase 1) - Foundation
2. **Backend Services** (Phase 2) - Logique métier
3. **API Routes** (Phase 3) - Endpoints
4. **UX Point d'entrée** (Phase 4) - Permettre l'analyse
5. **Pages Marques** (Phase 5) - Visualisation
6. **Email Templates** (Phase 6) - Prospection
7. **Dashboard** (Phase 7) - Vue d'ensemble
8. **Filtres** (Phase 8) - Finitions

---

## 🚨 POINTS D'ATTENTION

### 1. Détection automatique Produit vs Marque

**Défi:** Comment savoir automatiquement si l'URL est un produit ou une marque?

**Solutions possibles:**
- ❌ **Option A:** Détection automatique via patterns URL
  - Complexe, peu fiable (trop de variations)
- ✅ **Option B:** Choix manuel utilisateur (toggle dans QuickAnalyze)
  - Simple, fiable, contrôle total
  - **→ RECOMMANDÉ**

### 2. Partage des contacts

**Question:** Les contacts sont-ils partagés entre produits et marques d'une même entreprise?

**Solution:**
- Pour le MVP: contacts stockés indépendamment (duplication OK)
- V2: possibilité de créer une table `prospection.companies` partagée

### 3. Catégories

**Question:** Les catégories strictes (10+65) s'appliquent-elles aux marques?

**Décision:**
- **Produit:** 1 catégorie stricte (liste existante)
- **Marque:** Plusieurs catégories en texte libre (pas de contrainte FK)
- Justification: Une marque peut couvrir plusieurs catégories

### 4. Templates email

**Architecture:**
- Colonne `entity_type: 'product' | 'brand' | 'both'`
- Templates "both" = utilisables pour les 2
- Templates spécifiques marque avec variables adaptées

### 5. Navigation

**URL Structure:**
- Produits: `/dashboard/products`, `/dashboard/products/[id]`
- Marques: `/dashboard/brands`, `/dashboard/brands/[id]`
- Contactés: `/dashboard/contacted` (affiche les 2 types?)
- Archives: `/dashboard/archived` (affiche les 2 types?)

**Proposition:**
- Garder pages séparées pour contacted/archived
- Ajouter tabs "Produits" / "Marques" dans ces pages

---

## ✅ CHECKLIST DE VALIDATION

Avant de considérer la feature complète:

**Database:**
- [ ] Table `brands` créée avec tous les champs
- [ ] RLS policies configurées
- [ ] RPC functions opérationnelles
- [ ] Templates email marque créés (4 langues)

**Backend:**
- [ ] `claude-brand-analyzer.ts` avec prompt adapté
- [ ] Validation schema Zod complet
- [ ] Types TypeScript à jour

**API:**
- [ ] `/api/analyze` supporte paramètre `type`
- [ ] `/api/brands/[id]` CRUD opérationnel
- [ ] `/api/brands/[id]/history` fonctionnel

**Frontend:**
- [ ] Toggle Produit/Marque dans QuickAnalyze
- [ ] Lien "Marques" dans Navbar
- [ ] Page liste marques responsive
- [ ] Page détail marque complète
- [ ] BrandCard avec logo + best sellers
- [ ] EmailComposer supporte mode='brand'
- [ ] Templates marque disponibles dans composer

**Tests:**
- [ ] Analyser une URL marque (ex: https://hofats.com)
- [ ] Vérifier extraction: logo, best sellers, catégories
- [ ] Tester email de prospection marque
- [ ] Vérifier filtres et recherche
- [ ] Tester workflow complet: analyse → review → contact → archivage

---

## 📚 RESSOURCES & RÉFÉRENCES

**Exemples d'URLs marque à tester:**
- https://hofats.com (marque BBQ/outdoor)
- https://womanizer.com (marque wellness)
- https://victorinox.com (marque couteaux suisses)
- https://nespresso.com (marque café)

**Variables templates marque:**
- `{brand_name}` - Nom de la marque
- `{brand_tagline}` - Slogan/tagline
- `{best_sellers_list}` - Liste des best sellers
- `{categories_list}` - Liste des catégories
- `{company_name}` - Nom entreprise
- `{recipient_name}` - Nom du contact
- `{user_name}` - Nom de l'utilisateur O!deal
- `{user_email}` - Email de l'utilisateur

---

**FIN DU PLAN**

Date de création: 2025-11-18
Version: 1.0
Auteur: Claude Code + Laurent David
