# Prospection-ODL

Système de veille et prospection automatisé pour O!deal (marketplace suisse). Analyse automatique de produits via Telegram et IA.

## 🚀 Stack technique

- **Frontend/Backend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Base de données**: Supabase (PostgreSQL)
- **Services**: Jina AI Reader, Claude API, Telegram Bot, SendGrid
- **Déploiement**: Vercel (prospection.odl-tools.ch)

## 📋 Prérequis

- Node.js 18+ installé
- Compte Supabase (avec projet créé)
- Clé API Anthropic (Claude)
- Compte Telegram (pour créer un bot via BotFather)
- Compte SendGrid (gratuit 100 emails/jour)

## 🛠️ Installation

### 1. Cloner le projet et installer les dépendances

```bash
cd prospection-odl
npm install
```

### 2. Configurer les variables d'environnement

Copier `.env.local.example` en `.env.local` et remplir les valeurs :

```bash
cp .env.local.example .env.local
```

**Variables à configurer :**

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme publique
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service (secret)
- `ANTHROPIC_API_KEY` : Clé API Claude (Anthropic)
- `TELEGRAM_BOT_TOKEN` : Token du bot Telegram (via BotFather)
- `TELEGRAM_CHAT_ID` : ID du chat Telegram
- `SENDGRID_API_KEY` : Clé API SendGrid
- `SENDGRID_FROM_EMAIL` : Email d'envoi vérifié

### 3. Créer les tables Supabase

Aller dans votre projet Supabase → SQL Editor → Copier/coller le contenu de :
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_seed_categories.sql`

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📂 Structure du projet

```
prospection-odl/
├── CLAUDE.md                    # Documentation Claude Code
├── context.md                   # Contexte métier
├── structure.md                 # Arborescence détaillée
├── todo.md                      # Liste des tâches
├── interdependances.md          # Relations entre composants
├── app/                         # Next.js App Router
├── lib/                         # Logique métier
│   ├── services/                # Services externes
│   ├── supabase/                # Client Supabase
│   └── utils/                   # Utilitaires
├── components/                  # Composants React
└── supabase/                    # Migrations SQL
```

## 🔄 Workflow

1. **Trigger** : Envoyer un lien via Telegram
2. **Scraping** : Jina AI Reader extrait le contenu
3. **Analyse** : Claude API analyse et structure les données
4. **Notification** : Message Telegram avec résumé
5. **Review** : Valider dans l'interface web
6. **Prospection** : Envoyer un email de contact

## 📚 Documentation complète

- **CLAUDE.md** : Résumé du projet et décisions architecturales
- **context.md** : Règles métier et contexte O!deal
- **structure.md** : Arborescence et conventions
- **interdependances.md** : Relations entre composants

## 🧑‍💻 Développement

```bash
# Développement
npm run dev

# Build production
npm run build

# Lancer en production
npm start

# Linter
npm run lint
```

## 🚢 Déploiement

Le projet est configuré pour être déployé sur **Vercel** :

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement sur Vercel
3. Déployer sur `prospection.odl-tools.ch`

## 📝 Commandes utiles

```bash
# Générer les types TypeScript depuis Supabase
supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts

# Appliquer les migrations Supabase
supabase db push
```

## 📄 License

MIT

---

**Version** : 0.1.0 (Phase 1 - Foundation)
**Développeur** : Laurent David + Claude Code
**Dernière mise à jour** : 2025-11-16
