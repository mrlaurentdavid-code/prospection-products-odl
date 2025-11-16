# INTERDEPENDANCES.MD - Relations entre composants

## 🔗 VUE D'ENSEMBLE

Ce document décrit les **relations et dépendances** entre les différents composants, services et tables de la base de données. Il permet de comprendre l'impact d'une modification sur le reste du système.

---

## 📊 SCHÉMA DE DÉPENDANCES

```
┌─────────────────────────────────────────────────────────────┐
│                      TELEGRAM BOT                           │
│  (lib/services/telegram-bot.ts)                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              API /api/telegram/webhook                      │
│  (app/api/telegram/webhook/route.ts)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  API /api/analyze                           │
│  (app/api/analyze/route.ts)                                 │
└────┬────────────────────────────────────────────┬───────────┘
     │                                            │
     ▼                                            ▼
┌────────────────────┐                 ┌──────────────────────┐
│  JINA SCRAPER      │                 │  CLAUDE ANALYZER     │
│  (jina-scraper.ts) │                 │  (claude-analyzer.ts)│
└────────────────────┘                 └──────────┬───────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────────┐
                                        │  SUPABASE DB         │
                                        │  (products table)    │
                                        └──────────┬───────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────────┐
                                        │  FRONTEND            │
                                        │  (dashboard pages)   │
                                        └──────────┬───────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────────┐
                                        │  EMAIL SENDER        │
                                        │  (email-sender.ts)   │
                                        └──────────────────────┘
```

---

## 🗃️ DÉPENDANCES DE LA BASE DE DONNÉES

### Table `products`
**Dépend de :**
- `categories` (foreign key : `category_id`)
- `subcategories` (foreign key : `subcategory_id`)
- `auth.users` (foreign key : `reviewed_by`) (Supabase Auth)

**Utilisée par :**
- `email_logs` (foreign key : `product_id`)
- Frontend : `/app/(dashboard)/products/page.tsx`
- Frontend : `/app/(dashboard)/products/[id]/page.tsx`
- API : `/app/api/analyze/route.ts`
- API : `/app/api/products/[id]/route.ts`

**Impact si modification :**
- ⚠️ Modification de la structure → Mettre à jour les types TypeScript (`lib/supabase/types.ts`)
- ⚠️ Ajout/suppression de colonne → Créer une migration SQL
- ⚠️ Modification RLS → Vérifier que le frontend peut toujours accéder aux données

### Table `categories`
**Dépend de :**
- Aucune (table indépendante)

**Utilisée par :**
- `products` (foreign key : `category_id`)
- `subcategories` (foreign key : `category_id`)
- Service : `lib/services/claude-analyzer.ts` (pour sélectionner la catégorie)
- Frontend : `/app/(dashboard)/products/page.tsx` (filtres)

**Impact si modification :**
- ⚠️ Modification des noms → Vérifier que Claude API utilise les bons noms
- ⚠️ Ajout/suppression de catégorie → Mettre à jour `categories-seed.json`

### Table `subcategories`
**Dépend de :**
- `categories` (foreign key : `category_id`)

**Utilisée par :**
- `products` (foreign key : `subcategory_id`)
- Service : `lib/services/claude-analyzer.ts` (pour sélectionner la sous-catégorie)
- Frontend : `/app/(dashboard)/products/page.tsx` (filtres)

**Impact si modification :**
- ⚠️ Modification des noms → Vérifier que Claude API utilise les bons noms
- ⚠️ Ajout/suppression de sous-catégorie → Mettre à jour `categories-seed.json`

### Table `email_templates`
**Dépend de :**
- Aucune (table indépendante)

**Utilisée par :**
- `email_logs` (foreign key : `template_id`)
- Service : `lib/services/email-sender.ts` (pour récupérer le template)
- Frontend : `components/EmailComposer.tsx` (sélection du template)

**Impact si modification :**
- ⚠️ Modification des variables → Mettre à jour `lib/services/email-sender.ts`
- ⚠️ Ajout de template → Créer une migration SQL

### Table `email_logs`
**Dépend de :**
- `products` (foreign key : `product_id`)
- `email_templates` (foreign key : `template_id`)
- `auth.users` (foreign key : `sent_by`) (Supabase Auth)

**Utilisée par :**
- Frontend : `/app/(dashboard)/products/[id]/page.tsx` (historique emails)
- API : `/app/api/email/webhook/route.ts` (tracking ouverture/clics)

**Impact si modification :**
- ⚠️ Ajout de colonne → Mettre à jour les types TypeScript
- ⚠️ Modification RLS → Vérifier que le frontend peut toujours accéder aux logs

---

## ⚙️ DÉPENDANCES DES SERVICES

### `lib/services/jina-scraper.ts`
**Dépend de :**
- Jina AI Reader API (externe)
- `fetch` (Node.js)

**Utilisé par :**
- `/app/api/analyze/route.ts`

**Impact si modification :**
- ⚠️ Modification du format de sortie → Mettre à jour `/app/api/analyze/route.ts`
- ⚠️ Ajout de paramètres → Mettre à jour l'appel dans `/app/api/analyze/route.ts`

### `lib/services/claude-analyzer.ts`
**Dépend de :**
- Claude API (Anthropic)
- `@anthropic-ai/sdk`
- `categories` et `subcategories` (BDD)
- `lib/services/jina-scraper.ts` (pour les données scrapées)

**Utilisé par :**
- `/app/api/analyze/route.ts`

**Impact si modification :**
- ⚠️ Modification du prompt → Vérifier que le JSON retourné est toujours valide
- ⚠️ Modification du format de sortie → Mettre à jour `/app/api/analyze/route.ts`
- ⚠️ Modification des catégories → Mettre à jour le prompt

### `lib/services/telegram-bot.ts`
**Dépend de :**
- Telegram Bot API (externe)
- `node-telegram-bot-api`
- Variables d'environnement : `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

**Utilisé par :**
- `/app/api/telegram/webhook/route.ts` (réception des messages)
- `/app/api/analyze/route.ts` (envoi de notifications)

**Impact si modification :**
- ⚠️ Modification du format des notifications → Vérifier que le message Telegram est bien formaté
- ⚠️ Ajout de commandes → Mettre à jour `/app/api/telegram/webhook/route.ts`

### `lib/services/email-sender.ts`
**Dépend de :**
- SendGrid API (externe)
- `@sendgrid/mail`
- Variables d'environnement : `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- `email_templates` (BDD)

**Utilisé par :**
- `/app/api/email/send/route.ts`

**Impact si modification :**
- ⚠️ Modification du format des emails → Vérifier que les templates sont bien rendus
- ⚠️ Ajout de variables dynamiques → Mettre à jour les templates dans la BDD

---

## 🎨 DÉPENDANCES DES COMPOSANTS FRONTEND

### `components/Navbar.tsx`
**Dépend de :**
- `lib/supabase/client.ts` (pour l'authentification)
- `components/ui/button.tsx` (shadcn/ui)
- `components/ui/dropdown-menu.tsx` (shadcn/ui)

**Utilisé par :**
- `/app/(dashboard)/layout.tsx`

**Impact si modification :**
- ⚠️ Modification du design → Vérifier que le layout reste cohérent
- ⚠️ Ajout de liens → Vérifier que les routes existent

### `components/ProductCard.tsx`
**Dépend de :**
- `lib/supabase/types.ts` (type `Product`)
- `components/ui/card.tsx` (shadcn/ui)
- `components/ui/badge.tsx` (shadcn/ui)
- `next/image` (optimisation images)

**Utilisé par :**
- `/app/(dashboard)/products/page.tsx`
- `/app/(dashboard)/page.tsx` (dashboard)

**Impact si modification :**
- ⚠️ Modification du design → Vérifier que les cards restent cohérentes
- ⚠️ Ajout de props → Mettre à jour les appels dans les pages

### `components/ProductDetailView.tsx`
**Dépend de :**
- `lib/supabase/types.ts` (type `Product`)
- `components/ui/card.tsx` (shadcn/ui)
- `components/ui/badge.tsx` (shadcn/ui)
- `components/ui/separator.tsx` (shadcn/ui)
- `next/image` (optimisation images)

**Utilisé par :**
- `/app/(dashboard)/products/[id]/page.tsx`

**Impact si modification :**
- ⚠️ Modification du design → Vérifier que la fiche produit reste lisible
- ⚠️ Ajout de sections → Vérifier que les données sont disponibles

### `components/EmailComposer.tsx`
**Dépend de :**
- `lib/supabase/types.ts` (types `Product`, `EmailTemplate`)
- `lib/services/email-sender.ts` (envoi email)
- `components/ui/dialog.tsx` (shadcn/ui)
- `components/ui/select.tsx` (shadcn/ui)
- `components/ui/textarea.tsx` (shadcn/ui)
- `components/ui/button.tsx` (shadcn/ui)

**Utilisé par :**
- `/app/(dashboard)/products/[id]/page.tsx`

**Impact si modification :**
- ⚠️ Modification du format → Vérifier que le preview est correct
- ⚠️ Ajout de variables → Mettre à jour les templates dans la BDD

---

## 🛣️ DÉPENDANCES DES API ROUTES

### `/app/api/analyze/route.ts`
**Dépend de :**
- `lib/services/jina-scraper.ts`
- `lib/services/claude-analyzer.ts`
- `lib/services/telegram-bot.ts`
- `lib/supabase/server.ts`
- `lib/utils/validators.ts` (validation Zod)

**Utilisé par :**
- `/app/api/telegram/webhook/route.ts`

**Impact si modification :**
- ⚠️ Modification de l'endpoint → Mettre à jour le webhook Telegram
- ⚠️ Modification du format de sortie → Vérifier que le frontend peut toujours afficher les produits

### `/app/api/telegram/webhook/route.ts`
**Dépend de :**
- `lib/services/telegram-bot.ts`
- `/app/api/analyze/route.ts` (appel interne)

**Utilisé par :**
- Telegram Bot API (externe)

**Impact si modification :**
- ⚠️ Modification de la logique → Vérifier que le bot répond toujours correctement
- ⚠️ Ajout de commandes → Mettre à jour la documentation

### `/app/api/email/send/route.ts`
**Dépend de :**
- `lib/services/email-sender.ts`
- `lib/supabase/server.ts`
- `lib/utils/validators.ts` (validation Zod)

**Utilisé par :**
- `components/EmailComposer.tsx`

**Impact si modification :**
- ⚠️ Modification de l'endpoint → Mettre à jour `EmailComposer.tsx`
- ⚠️ Modification du format de sortie → Vérifier que le frontend affiche bien les erreurs

### `/app/api/email/webhook/route.ts`
**Dépend de :**
- `lib/supabase/server.ts`
- SendGrid webhooks (externe)

**Utilisé par :**
- SendGrid (externe)

**Impact si modification :**
- ⚠️ Modification de la logique → Vérifier que les logs sont bien mis à jour
- ⚠️ Modification du format → Vérifier que SendGrid peut toujours envoyer les webhooks

---

## 🔐 DÉPENDANCES D'AUTHENTIFICATION

### Supabase Auth
**Dépend de :**
- Supabase Auth API (externe)
- Variables d'environnement : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Utilisé par :**
- `/app/(auth)/login/page.tsx`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- Middleware Next.js (protection des routes)

**Impact si modification :**
- ⚠️ Modification des clés → Mettre à jour `.env.local`
- ⚠️ Modification des RLS policies → Vérifier que les users ont toujours accès aux données

---

## ⚠️ POINTS D'ATTENTION LORS DES MODIFICATIONS

### 1. Modification de la structure BDD
1. Créer une migration SQL (`supabase/migrations/XXX_description.sql`)
2. Appliquer la migration (`supabase db push`)
3. Régénérer les types TypeScript (`supabase gen types typescript`)
4. Mettre à jour les services et composants qui utilisent cette table

### 2. Modification d'un service
1. Vérifier tous les fichiers qui importent ce service
2. Mettre à jour les tests si existants
3. Vérifier que les API routes qui utilisent ce service fonctionnent toujours

### 3. Modification d'un composant UI
1. Vérifier toutes les pages qui utilisent ce composant
2. Tester le responsive (mobile/desktop)
3. Vérifier que le design reste cohérent

### 4. Modification d'une API route
1. Vérifier que le frontend peut toujours appeler cette route
2. Vérifier que les webhooks externes fonctionnent toujours
3. Tester avec Postman ou curl

### 5. Modification des catégories
1. Mettre à jour `categories-seed.json`
2. Créer une migration SQL pour mettre à jour la BDD
3. Vérifier que Claude API utilise les nouvelles catégories
4. Vérifier que les filtres frontend fonctionnent toujours

---

## 📝 CONVENTIONS DE MODIFICATION

### Avant de modifier un fichier :
1. ✅ Vérifier les dépendances dans ce document
2. ✅ Identifier tous les fichiers impactés
3. ✅ Créer une branche git (`git checkout -b feature/description`)
4. ✅ Modifier le fichier
5. ✅ Mettre à jour les fichiers dépendants
6. ✅ Tester localement
7. ✅ Commit (`git commit -m "description"`)
8. ✅ Mettre à jour ce document si nécessaire

---

**Dernière mise à jour** : 2025-11-16
