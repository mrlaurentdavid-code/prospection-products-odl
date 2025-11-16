# STRUCTURE.MD - Arborescence du projet

## 📂 ARBORESCENCE COMPLÈTE

```
prospection-odl/
│
├── 📄 CLAUDE.md                          # Documentation centrale pour Claude Code
├── 📄 context.md                         # Contexte métier et règles
├── 📄 structure.md                       # Ce fichier (arborescence)
├── 📄 todo.md                            # Liste des tâches
├── 📄 interdependances.md                # Relations entre composants
├── 📄 README.md                          # Documentation utilisateur
├── 📄 .env.local                         # Variables d'environnement (ignoré git)
├── 📄 .env.local.example                 # Template des variables
├── 📄 .gitignore                         # Fichiers ignorés par git
├── 📄 package.json                       # Dépendances npm
├── 📄 tsconfig.json                      # Configuration TypeScript
├── 📄 tailwind.config.ts                 # Configuration Tailwind CSS
├── 📄 next.config.js                     # Configuration Next.js
├── 📄 components.json                    # Configuration shadcn/ui
│
├── 📁 app/                               # Next.js App Router
│   │
│   ├── 📄 layout.tsx                     # Root layout (metadata, fonts, providers)
│   ├── 📄 globals.css                    # Styles globaux (Tailwind)
│   │
│   ├── 📁 (auth)/                        # Groupe de routes d'authentification
│   │   ├── 📄 layout.tsx                 # Layout auth (centré, simple)
│   │   ├── 📁 login/
│   │   │   └── 📄 page.tsx               # Page de connexion
│   │   └── 📁 signup/
│   │       └── 📄 page.tsx               # Page d'inscription (optionnel MVP)
│   │
│   ├── 📁 (dashboard)/                   # Groupe de routes protégées
│   │   ├── 📄 layout.tsx                 # Layout avec Navbar + Sidebar
│   │   ├── 📄 page.tsx                   # Dashboard (stats, produits récents)
│   │   │
│   │   ├── 📁 products/                  # Gestion des produits
│   │   │   ├── 📄 page.tsx               # Liste des produits (filtres, cards)
│   │   │   └── 📁 [id]/
│   │   │       └── 📄 page.tsx           # Détail produit (fiche complète)
│   │   │
│   │   └── 📁 settings/                  # Paramètres utilisateur
│   │       └── 📄 page.tsx               # Profil, préférences
│   │
│   └── 📁 api/                           # API Routes
│       │
│       ├── 📁 analyze/
│       │   └── 📄 route.ts               # POST /api/analyze (scraping + IA)
│       │
│       ├── 📁 telegram/
│       │   └── 📁 webhook/
│       │       └── 📄 route.ts           # POST /api/telegram/webhook (Telegram Bot)
│       │
│       ├── 📁 email/
│       │   ├── 📁 send/
│       │   │   └── 📄 route.ts           # POST /api/email/send (SendGrid)
│       │   └── 📁 webhook/
│       │       └── 📄 route.ts           # POST /api/email/webhook (tracking SendGrid)
│       │
│       └── 📁 products/
│           ├── 📁 [id]/
│           │   └── 📄 route.ts           # GET/PATCH/DELETE /api/products/[id]
│           └── 📄 route.ts               # GET/POST /api/products (liste, création)
│
├── 📁 lib/                               # Logique métier et utilitaires
│   │
│   ├── 📁 services/                      # Services externes
│   │   ├── 📄 jina-scraper.ts            # Scraping avec Jina AI Reader
│   │   ├── 📄 claude-analyzer.ts         # Analyse avec Claude API (Anthropic)
│   │   ├── 📄 telegram-bot.ts            # Bot Telegram (notifications)
│   │   └── 📄 email-sender.ts            # Envoi email avec SendGrid
│   │
│   ├── 📁 supabase/                      # Client Supabase
│   │   ├── 📄 client.ts                  # Client côté navigateur (createBrowserClient)
│   │   ├── 📄 server.ts                  # Client côté serveur (createServerClient)
│   │   └── 📄 types.ts                   # Types générés depuis Supabase (auto-generated)
│   │
│   ├── 📁 utils/                         # Utilitaires
│   │   ├── 📄 cn.ts                      # Merge classes Tailwind (clsx + twMerge)
│   │   ├── 📄 validators.ts              # Schemas Zod (validation)
│   │   └── 📄 constants.ts               # Constantes (statuts, langues, etc.)
│   │
│   └── 📁 hooks/                         # Custom React hooks
│       ├── 📄 useProducts.ts             # Hook pour récupérer les produits
│       └── 📄 useSupabase.ts             # Hook pour accéder au client Supabase
│
├── 📁 components/                        # Composants React
│   │
│   ├── 📁 ui/                            # shadcn/ui components
│   │   ├── 📄 button.tsx                 # Bouton
│   │   ├── 📄 card.tsx                   # Card
│   │   ├── 📄 dialog.tsx                 # Dialog/Modal
│   │   ├── 📄 dropdown-menu.tsx          # Dropdown menu
│   │   ├── 📄 input.tsx                  # Input text
│   │   ├── 📄 label.tsx                  # Label
│   │   ├── 📄 select.tsx                 # Select
│   │   ├── 📄 textarea.tsx               # Textarea
│   │   ├── 📄 badge.tsx                  # Badge
│   │   ├── 📄 separator.tsx              # Separator
│   │   ├── 📄 tabs.tsx                   # Tabs
│   │   └── 📄 toast.tsx                  # Toast (notifications)
│   │
│   ├── 📄 Navbar.tsx                     # Navigation Apple-like
│   ├── 📄 ProductCard.tsx                # Card produit (liste)
│   ├── 📄 ProductDetailView.tsx          # Vue détaillée produit
│   ├── 📄 ProductActions.tsx             # Actions produit (supprimer, standby, contacter)
│   ├── 📄 EmailComposer.tsx              # Composeur d'email (modal)
│   ├── 📄 StatsCard.tsx                  # Card de statistiques (dashboard)
│   └── 📄 FilterBar.tsx                  # Barre de filtres (produits)
│
├── 📁 supabase/                          # Configuration Supabase
│   │
│   ├── 📁 migrations/                    # Migrations SQL versionnées
│   │   ├── 📄 001_initial_schema.sql     # Tables de base (products, categories, etc.)
│   │   ├── 📄 002_seed_categories.sql    # Seeding des 10+65 catégories
│   │   └── 📄 003_email_templates.sql    # Templates email et logs
│   │
│   └── 📄 config.toml                    # Configuration Supabase CLI (optionnel)
│
├── 📁 public/                            # Assets statiques
│   ├── 📄 logo.svg                       # Logo O!deal
│   └── 📄 favicon.ico                    # Favicon
│
└── 📁 scripts/                           # Scripts utilitaires
    ├── 📄 seed-categories.ts             # Script de seeding des catégories
    └── 📄 generate-types.sh              # Génération des types Supabase
```

## 📋 CONVENTIONS DE NOMMAGE

### Fichiers et dossiers
- **Pages Next.js** : `page.tsx` (convention Next.js App Router)
- **Layouts** : `layout.tsx` (convention Next.js App Router)
- **API Routes** : `route.ts` (convention Next.js App Router)
- **Composants React** : `PascalCase.tsx` (ex: `ProductCard.tsx`)
- **Services** : `kebab-case.ts` (ex: `jina-scraper.ts`)
- **Hooks** : `useCamelCase.ts` (ex: `useProducts.ts`)
- **Utilitaires** : `kebab-case.ts` (ex: `validators.ts`)
- **Migrations SQL** : `XXX_snake_case.sql` (ex: `001_initial_schema.sql`)

### Variables et fonctions
- **Variables** : `camelCase` (ex: `productName`)
- **Constantes** : `UPPER_SNAKE_CASE` (ex: `API_BASE_URL`)
- **Fonctions** : `camelCase` (ex: `analyzeProduct`)
- **Types TypeScript** : `PascalCase` (ex: `ProductStatus`)
- **Interfaces** : `PascalCase` (ex: `IProduct`)

### Base de données
- **Tables** : `snake_case` au pluriel (ex: `products`, `email_templates`)
- **Colonnes** : `snake_case` (ex: `company_name`, `created_at`)
- **Foreign keys** : `{table}_id` (ex: `category_id`, `product_id`)
- **Indexes** : `idx_{table}_{column}` (ex: `idx_products_status`)

## 🗂️ ORGANISATION DES DOSSIERS

### `/app`
- Contient toutes les routes de l'application (Next.js App Router)
- **Groupes de routes** entre parenthèses : `(auth)`, `(dashboard)` (n'affectent pas l'URL)
- **Routes dynamiques** entre crochets : `[id]`, `[slug]`
- **API Routes** dans `/app/api`

### `/lib`
- Contient toute la logique métier et les utilitaires
- **Services externes** dans `/lib/services`
- **Client Supabase** dans `/lib/supabase`
- **Hooks personnalisés** dans `/lib/hooks`
- **Utilitaires** dans `/lib/utils`

### `/components`
- Contient tous les composants React réutilisables
- **shadcn/ui** dans `/components/ui` (auto-généré)
- **Composants métier** à la racine de `/components`

### `/supabase`
- Contient les migrations SQL versionnées
- **Migrations** dans `/supabase/migrations`
- **Config Supabase CLI** dans `/supabase/config.toml`

### `/public`
- Contient les assets statiques (images, fonts, etc.)
- Accessible via `/` dans le navigateur (ex: `/logo.svg`)

### `/scripts`
- Contient les scripts utilitaires (seeding, génération de types, etc.)
- Exécutables via `npm run {script-name}`

## 🔗 POINTS D'ENTRÉE

### Pages
- **Dashboard** : `/app/(dashboard)/page.tsx`
- **Liste produits** : `/app/(dashboard)/products/page.tsx`
- **Détail produit** : `/app/(dashboard)/products/[id]/page.tsx`
- **Login** : `/app/(auth)/login/page.tsx`

### API Routes
- **Analyse produit** : `/app/api/analyze/route.ts` (POST)
- **Webhook Telegram** : `/app/api/telegram/webhook/route.ts` (POST)
- **Envoi email** : `/app/api/email/send/route.ts` (POST)
- **Webhook SendGrid** : `/app/api/email/webhook/route.ts` (POST)

### Services
- **Jina Scraper** : `/lib/services/jina-scraper.ts`
- **Claude Analyzer** : `/lib/services/claude-analyzer.ts`
- **Telegram Bot** : `/lib/services/telegram-bot.ts`
- **Email Sender** : `/lib/services/email-sender.ts`

## 📦 DÉPENDANCES PRINCIPALES

### Production
- `next` : Framework React (App Router)
- `react` : Bibliothèque UI
- `typescript` : Typage statique
- `tailwindcss` : Framework CSS
- `@supabase/supabase-js` : Client Supabase
- `@supabase/auth-helpers-nextjs` : Auth Supabase pour Next.js
- `@anthropic-ai/sdk` : Claude API (Anthropic)
- `node-telegram-bot-api` : Telegram Bot API
- `@sendgrid/mail` : SendGrid email
- `zod` : Validation de schémas
- `clsx` : Merge classes CSS
- `tailwind-merge` : Merge classes Tailwind

### Development
- `@types/node` : Types Node.js
- `@types/react` : Types React
- `eslint` : Linter JavaScript/TypeScript
- `prettier` : Formatter de code
- `supabase` : CLI Supabase (optionnel)

---

**Dernière mise à jour** : 2025-11-16
