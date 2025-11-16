# TODO.MD - Liste des tâches

## 📊 LÉGENDE

- ✅ **Complété**
- 🚧 **En cours**
- ⏳ **À faire**
- ❌ **Bloqué**
- 🔄 **En attente de validation**

---

## 🚀 PHASE 1 : FOUNDATION (Jour 1)

### Documentation
- ✅ Créer CLAUDE.md
- ✅ Créer context.md
- ✅ Créer structure.md
- ✅ Créer todo.md (ce fichier)
- 🚧 Créer interdependances.md

### Setup projet
- ⏳ Initialiser Next.js 14+ avec TypeScript et Tailwind CSS
- ⏳ Configurer `.env.local` et `.env.local.example`
- ⏳ Créer README.md avec instructions de setup

### Supabase
- ⏳ Installer `@supabase/supabase-js` et `@supabase/auth-helpers-nextjs`
- ⏳ Créer les clients Supabase (`lib/supabase/client.ts` et `lib/supabase/server.ts`)
- ⏳ Créer la migration SQL `001_initial_schema.sql` (tables : products, categories, subcategories, email_templates, email_logs)
- ⏳ Créer la migration SQL `002_seed_categories.sql` (10 catégories + 65 sous-catégories)
- ⏳ Appliquer les migrations sur Supabase
- ⏳ Générer les types TypeScript (`lib/supabase/types.ts`)

### shadcn/ui
- ⏳ Installer shadcn/ui CLI
- ⏳ Installer les composants de base :
  - `button`, `card`, `dialog`, `dropdown-menu`
  - `input`, `label`, `select`, `textarea`
  - `badge`, `separator`, `tabs`, `toast`

### Layout & Navigation
- ⏳ Créer le layout racine (`app/layout.tsx`)
- ⏳ Créer le layout dashboard (`app/(dashboard)/layout.tsx`)
- ⏳ Créer la Navbar Apple-like (`components/Navbar.tsx`)
- ⏳ Créer le layout auth (`app/(auth)/layout.tsx`)

### Authentification
- ⏳ Créer la page de login (`app/(auth)/login/page.tsx`)
- ⏳ Implémenter l'authentification Supabase (email + password)
- ⏳ Protéger les routes dashboard (middleware ou Server Component)

---

## ⚙️ PHASE 2 : BACKEND SERVICES (Jour 1-2)

### Services externes
- ⏳ Créer `lib/services/jina-scraper.ts` (scraping avec Jina AI Reader)
- ⏳ Créer `lib/services/claude-analyzer.ts` (analyse avec Claude API)
- ⏳ Créer `lib/utils/validators.ts` (schemas Zod pour validation)
- ⏳ Créer `lib/utils/constants.ts` (constantes : statuts, langues, etc.)

### API Routes
- ⏳ Créer `/app/api/analyze/route.ts` (POST : scraping + IA + save to DB)
- ⏳ Tester l'API route avec Postman ou curl

### Seeding catégories
- ⏳ Créer `categories-seed.json` (10 catégories + 65 sous-catégories)
- ⏳ Créer le script `scripts/seed-categories.ts`
- ⏳ Exécuter le seeding dans Supabase

### Tests
- ⏳ Test end-to-end : URL → Scraping Jina → Analyse Claude → Save DB
- ⏳ Vérifier les données dans Supabase (table `products`)

---

## 📱 PHASE 3 : TELEGRAM INTEGRATION (Jour 2)

### Telegram Bot
- ⏳ Créer un bot Telegram via BotFather
- ⏳ Récupérer le `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID`
- ⏳ Créer `lib/services/telegram-bot.ts` (notifications)
- ⏳ Créer `/app/api/telegram/webhook/route.ts` (webhook Telegram)
- ⏳ Configurer le webhook Telegram (URL Vercel ou ngrok pour dev)

### Workflow complet
- ⏳ Test : Envoyer un lien via Telegram → Analyse → Notification
- ⏳ Vérifier que le produit est bien sauvegardé en BDD avec status `to_review`

---

## 🎨 PHASE 4 : FRONTEND CORE (Jour 2-3)

### Pages
- ⏳ Créer la page Dashboard (`app/(dashboard)/page.tsx`)
  - Stats : Produits à review, contactés cette semaine, taux de réponse
  - Produits récents (5 derniers)
- ⏳ Créer la page Liste produits (`app/(dashboard)/products/page.tsx`)
  - Filtres : status, category, date
  - Cards produits (image, nom, catégorie, société)
- ⏳ Créer la page Détail produit (`app/(dashboard)/products/[id]/page.tsx`)
  - Toutes les infos extraites
  - Galerie images/vidéos
  - Infos entreprise complètes
  - Actions : Supprimer / Stand by / Contacter

### Composants
- ⏳ Créer `components/ProductCard.tsx` (card produit pour la liste)
- ⏳ Créer `components/ProductDetailView.tsx` (vue détaillée produit)
- ⏳ Créer `components/ProductActions.tsx` (boutons d'actions)
- ⏳ Créer `components/StatsCard.tsx` (card de stats pour dashboard)
- ⏳ Créer `components/FilterBar.tsx` (barre de filtres)

### Hooks
- ⏳ Créer `lib/hooks/useProducts.ts` (hook pour récupérer les produits)
- ⏳ Créer `lib/hooks/useSupabase.ts` (hook pour accéder au client Supabase)

---

## 📧 PHASE 5 : EMAIL SYSTEM (Jour 3)

### SendGrid
- ⏳ Créer un compte SendGrid (gratuit 100 emails/jour)
- ⏳ Récupérer la `SENDGRID_API_KEY`
- ⏳ Vérifier le domaine d'envoi (`prospection@odl-tools.ch`)

### Service email
- ⏳ Créer `lib/services/email-sender.ts` (envoi email avec SendGrid)
- ⏳ Créer `/app/api/email/send/route.ts` (POST : envoi email)
- ⏳ Créer `/app/api/email/webhook/route.ts` (POST : tracking ouverture/clics)

### Templates email
- ⏳ Créer le template `first_contact` en anglais (EN)
  - Variables : `{{company_name}}`, `{{product_name}}`, `{{product_category}}`, `{{sender_name}}`
  - Ton : startup-friendly, direct
- ⏳ Sauvegarder le template dans Supabase (`email_templates`)

### Composeur d'email
- ⏳ Créer `components/EmailComposer.tsx` (modal/drawer)
  - Sélection template + langue
  - Preview avec variables remplies
  - Bouton "Envoyer"
- ⏳ Intégrer le composeur dans la page Détail produit

### Tests
- ⏳ Test : Envoyer un email de prospection à une adresse test
- ⏳ Vérifier que l'email est bien reçu
- ⏳ Vérifier que le log est sauvegardé dans `email_logs`

---

## 🎯 PHASE 6 : POLISH & DEPLOY (Jour 3-4)

### Export CSV
- ⏳ Créer une fonction d'export CSV (tous les produits)
- ⏳ Ajouter un bouton "Exporter CSV" sur la page Liste produits

### Tests manuels complets
- ⏳ Test workflow complet : Telegram → Analyse → Review → Email
- ⏳ Test tous les statuts produit (to_review, standby, contacted, archived)
- ⏳ Test filtres et recherche
- ⏳ Test responsive mobile
- ⏳ Test authentification (login/logout)

### Déploiement Vercel
- ⏳ Connecter le repo GitHub à Vercel
- ⏳ Configurer les variables d'environnement sur Vercel
- ⏳ Déployer sur `prospection.odl-tools.ch`
- ⏳ Configurer le webhook Telegram en production
- ⏳ Tester le workflow en production

### Documentation utilisateur
- ⏳ Créer un README.md avec :
  - Instructions de setup local
  - Configuration des clés API
  - Workflow complet
  - Commandes utiles
- ⏳ Créer un guide utilisateur (comment utiliser l'outil)

---

## 🔮 NICE TO HAVE (v1.1 - v1.2)

### v1.1 - Tracking email avancé
- ⏳ Implémenter les webhooks SendGrid (ouverture, clics)
- ⏳ Créer un tableau de bord avec stats email
- ⏳ Implémenter les relances automatiques (followup_1, followup_2)

### v1.2 - Templates multilingues
- ⏳ Créer les templates email FR, DE, IT (en plus de EN)
- ⏳ Détection automatique de la langue du fournisseur
- ⏳ Interface frontend multilingue (i18n)

### v1.3 - Rôles et permissions
- ⏳ Créer les rôles `admin`, `viewer`, `sourcing`
- ⏳ Implémenter les permissions dans Supabase RLS
- ⏳ Adapter le frontend en fonction des rôles

### v1.4 - Intégration CRM
- ⏳ Export vers HubSpot ou Pipedrive
- ⏳ Synchronisation bidirectionnelle
- ⏳ Webhook pour mises à jour en temps réel

### v1.5 - Dark mode
- ⏳ Implémenter le thème sombre
- ⏳ Sauvegarder la préférence utilisateur

---

## ⚠️ BLOCAGES ACTUELS

_Aucun blocage pour le moment._

---

## 📝 NOTES

- **Priorité MVP** : Phase 1 à 5 (must have)
- **Nice to have** : Phase 6 (v1.1+)
- **Durée estimée** : 3-4 jours pour le MVP complet

---

**Dernière mise à jour** : 2025-11-16
**Phase actuelle** : Phase 1 - Foundation (en cours)
