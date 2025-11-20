# PROSPECTION-ODL - Documentation Claude Code

## 📋 RÉSUMÉ DU PROJET

**Prospection-ODL** est un système de veille et prospection automatisé pour O!deal (marketplace suisse). Il permet à deux utilisateurs (David et Laurent) d'envoyer des liens produits via Telegram, puis d'obtenir une analyse automatique par IA qui extrait toutes les informations pertinentes du produit et de l'entreprise (nom, catégorie, prix MSRP, coordonnées fournisseur). L'objectif est d'accélérer le processus de découverte de nouveaux produits et fournisseurs, avec un système de prospection email intégré pour contacter directement les entreprises identifiées.

## 🛠️ STACK TECHNIQUE

### Frontend & Backend
- **Next.js 14+** (App Router, Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **Design**: Apple-like, mobile-first, sobre et élégant

### Base de données
- **Supabase** (PostgreSQL)
- **Auth**: Supabase Authentication
- **RLS**: Row Level Security activé

### Services externes
- **Jina AI Reader** (gratuit) - Scraping web/Instagram/Facebook/TikTok
- **Claude API (Anthropic)** - Analyse et extraction structurée
- **Telegram Bot** - Trigger et notifications
- **SendGrid** (gratuit 100 emails/jour) - Prospection email

### Déploiement
- **Hostinger VPS** (31.97.193.159)
- **Docker + Docker Compose** (conteneurisation)
- **Traefik** (reverse proxy + HTTPS automatique)
- **URL**: https://prosp.odl-tools.ch
- **Coût estimé**: ~0.30€/mois (quasi gratuit)

## 📊 ÉTAT D'AVANCEMENT ACTUEL

### ✅ Complété
- [x] Structure du projet définie
- [x] Documentation initiale (CLAUDE.md)

### 🚧 En cours
- [ ] Phase 1: Foundation (Jour 1)
  - [ ] Init Next.js + TypeScript + Tailwind
  - [ ] Setup Supabase (tables + migrations)
  - [ ] Install shadcn/ui + composants de base
  - [ ] Auth Supabase
  - [ ] Layout + Navbar

### ⏳ À venir
- [ ] Phase 2: Backend Services (Jour 1-2)
- [ ] Phase 3: Telegram Integration (Jour 2)
- [ ] Phase 4: Frontend Core (Jour 2-3)
- [ ] Phase 5: Email System (Jour 3)
- [ ] Phase 6: Polish & Deploy (Jour 3-4)

## 🎯 PROCHAINES ÉTAPES PRIORITAIRES

### Immédiat (Phase 1 - Foundation)
1. **Créer les fichiers de documentation** (context.md, structure.md, todo.md, interdependances.md)
2. **Initialiser Next.js 14+** avec TypeScript et Tailwind CSS
3. **Configurer Supabase**:
   - Créer les tables (products, categories, subcategories, email_templates, email_logs)
   - Définir les migrations SQL
   - Configurer RLS policies
   - Seeder les catégories (10 + 65 sous-catégories)
4. **Installer shadcn/ui** + composants de base (Button, Card, Dialog, Input, etc.)
5. **Créer le layout de base** avec Navbar Apple-like
6. **Configurer l'authentification Supabase**

### Court terme (Phase 2 - Backend Services)
7. Créer le service Jina Scraper (`lib/services/jina-scraper.ts`)
8. Créer le service Claude Analyzer (`lib/services/claude-analyzer.ts`)
9. Créer l'API route `/api/analyze`
10. Tester le workflow complet: URL → Scraping → Analyse → BDD

## 🏗️ DÉCISIONS ARCHITECTURALES IMPORTANTES

### 1. **Next.js App Router (Server Components par défaut)**
- Utilisation maximale des Server Components pour les performances
- Client Components uniquement pour l'interactivité (boutons, modales, formulaires)
- API Routes pour les webhooks et intégrations externes

### 2. **Supabase comme unique source de vérité**
- Authentification gérée 100% par Supabase
- RLS policies pour la sécurité (MVP: tous les users authentifiés = admin)
- Migrations SQL versionnées dans `/supabase/migrations/`

### 3. **Analyse IA en deux étapes**
- **Étape 1**: Jina AI Reader scrape le contenu (gratuit, pas de limite)
- **Étape 2**: Claude API analyse le contenu scrapé (payant mais précis)
- Séparation claire des responsabilités et optimisation des coûts

### 4. **Telegram comme trigger principal**
- Pas de commandes complexes (juste envoyer un lien)
- Détection automatique des URLs dans les messages
- Notifications avec résumé + lien vers le frontend

### 5. **Design System Apple-like**
- Palette sobre: blanc, gris clair, bleu (#0066CC)
- Typographie: Inter ou SF Pro
- Animations subtiles (transition-all duration-200)
- Mobile-first, responsive

### 6. **Email de prospection multilingue**
- 4 langues: EN, FR, DE, IT (priorité CH + EU)
- 3 types de templates: first_contact, followup_1, followup_2
- Ton: startup-friendly, pas corporatiste
- Tracking: ouverture + clics via SendGrid webhooks

### 7. **Catégorisation stricte**
- 10 catégories principales
- 65 sous-catégories
- Correspondance exacte avec les catégories existantes d'O!deal
- L'IA doit choisir parmi ces catégories uniquement

### 8. **Workflow produit simplifié (MVP)**
- 4 statuts: `to_review` → `standby` → `contacted` → `archived`
- Pas de pipeline complexe pour le MVP
- Export CSV pour analyse externe si besoin

### 9. **Sécurité et rate limiting**
- Secrets API côté serveur uniquement
- Validation des inputs avec Zod
- Rate limiting sur `/api/telegram/webhook` et `/api/analyze`
- RLS Supabase activé dès le début

### 10. **MVP Scope clair**
- **MUST HAVE**: Scraping, analyse, liste produits, email EN (first_contact)
- **NICE TO HAVE**: Tracking email, templates multilingues complets
- **FUTURE**: Rôles user/admin, dark mode, stats avancées, CRM

## 📂 STRUCTURE DES FICHIERS (À JOUR)

```
prospection-odl/
├── CLAUDE.md                    # Ce fichier (résumé du projet)
├── context.md                   # Contexte métier et règles
├── structure.md                 # Arborescence complète
├── todo.md                      # Liste des tâches
├── interdependances.md          # Relations entre composants
├── README.md                    # Documentation utilisateur
├── .env.local                   # Variables d'environnement (ignoré git)
├── .env.local.example           # Template des variables
├── categories-seed.json         # 10 catégories + 65 sous-catégories
├── app/                         # Next.js App Router
│   ├── (dashboard)/             # Groupe de routes protégées
│   │   ├── layout.tsx           # Layout avec Navbar
│   │   ├── page.tsx             # Dashboard (stats)
│   │   ├── products/            # Liste et détail produits
│   │   └── settings/            # Paramètres utilisateur
│   ├── api/                     # API Routes
│   │   ├── analyze/route.ts     # Endpoint analyse produit
│   │   ├── telegram/webhook/    # Webhook Telegram
│   │   └── email/send/          # Envoi email SendGrid
│   └── layout.tsx               # Root layout
├── lib/                         # Logique métier
│   ├── services/                # Services externes
│   │   ├── jina-scraper.ts      # Scraping avec Jina AI
│   │   ├── claude-analyzer.ts   # Analyse avec Claude API
│   │   ├── telegram-bot.ts      # Bot Telegram
│   │   └── email-sender.ts      # Envoi email SendGrid
│   ├── supabase/                # Client Supabase
│   │   ├── client.ts            # Client côté navigateur
│   │   └── server.ts            # Client côté serveur
│   └── utils/                   # Utilitaires
├── components/                  # Composants React
│   ├── ui/                      # shadcn/ui components
│   ├── ProductCard.tsx          # Card produit
│   ├── ProductDetailView.tsx    # Vue détaillée produit
│   ├── EmailComposer.tsx        # Composeur d'email
│   └── Navbar.tsx               # Navigation Apple-like
├── supabase/
│   └── migrations/              # Migrations SQL versionnées
│       └── 001_initial_schema.sql
└── public/                      # Assets statiques
```

## 🔄 WORKFLOW COMPLET

```
1. TRIGGER
   WhatsApp (validation humaine entre David et Laurent)
      ↓
   Telegram Bot (envoi simple d'un lien, sans commande)
      ↓

2. SCRAPING & ANALYSE
   API endpoint /api/analyze reçoit le lien
   → Scrape avec Jina AI Reader (gratuit)
   → Analyse avec Claude API (extraction structurée JSON)
   → Catégorisation automatique (10 + 65 catégories)
   → Recherche infos entreprise (nom, website, email, LinkedIn)
   → Recherche prix de marché (MSRP EU/CH + source URL)
   → Save to Supabase (status: "to_review")
      ↓

3. NOTIFICATION TELEGRAM
   Message avec résumé:
   "✅ Nouveau produit analysé
   📦 [Nom produit]
   🏷️ [Catégorie]
   🏢 [Société]
   💰 MSRP: €XX (lien)
   👉 prosp.odl-tools.ch/products/[id]"
      ↓

4. REVIEW (Frontend)
   Liste produits → Fiche détaillée → Actions
      ↓

5. ACTIONS POSSIBLES
   - Supprimer (archive le produit)
   - Stand by (mise en attente, pas prioritaire)
   - Contacter (ouvre le composeur d'email)
      ↓

6. PROSPECTION EMAIL
   - Templates multilingues (EN, FR, DE, IT)
   - Ton: Startup-friendly
   - Tracking: ouverture + clics (SendGrid webhooks)
   - Types: first_contact, followup_1, followup_2
```

## 📝 NOTES IMPORTANTES

### Catégories O!deal (strictes)
- **10 catégories principales**: Alimentation, Beauté & Bien-être, Maison & Jardin, Mode & Accessoires, Sports & Loisirs, Électronique & Technologie, Enfants & Bébés, Auto & Moto, Animaux, Services & Expériences
- **65 sous-catégories** au total
- L'IA doit choisir parmi ces catégories uniquement (pas de création de nouvelles catégories)

### Règles métier
- **Deux utilisateurs uniquement** (David et Laurent) pour le MVP
- **Source types**: instagram, facebook, tiktok, website, other
- **MSRP**: Prix public conseillé en Europe (EU) et Suisse (CH)
- **Confidence score**: 0.00 à 1.00 (seuil d'acceptation: 0.70)
- **Statuts produit**: to_review → standby → contacted → archived
- **Langues**: EN (prioritaire), FR, DE, IT

### Coûts estimés
- **Jina AI Reader**: Gratuit (pas de limite)
- **Claude API**: ~$0.003 par analyse (estimation)
- **SendGrid**: Gratuit jusqu'à 100 emails/jour
- **Supabase**: Gratuit (tier Free)
- **Hostinger VPS**: Inclus dans abonnement existant
- **Total estimé**: ~0.30€/mois (quasi gratuit)

### Points d'attention
- **Rate limiting**: Limiter les appels à `/api/telegram/webhook` (max 10/minute)
- **Validation**: Toujours valider les URLs avant de scraper
- **Erreurs**: Gérer les cas où Jina AI ou Claude API échouent
- **Images**: Stocker uniquement les URLs (pas de upload, économie de stockage)
- **Performance**: Server Components par défaut, Client Components seulement si nécessaire

## 🚀 COMMANDES UTILES

```bash
# Développement
npm run dev

# Build production
npm run build

# Lancer Supabase local (optionnel)
supabase start

# Appliquer les migrations
supabase db push

# Générer les types TypeScript depuis Supabase
supabase gen types typescript --local > lib/supabase/types.ts

# Seed les catégories
npm run seed:categories
```

## 📚 RESSOURCES

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Jina AI Reader](https://jina.ai/reader)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [SendGrid Docs](https://docs.sendgrid.com)

---

**Dernière mise à jour**: 2025-11-16
**Version**: 0.1.0 (Foundation en cours)
**Développeur**: Claude Code + Laurent David
