# CONTEXT.MD - Contexte métier et règles

## 📍 CONTEXTE MÉTIER

### Qu'est-ce qu'O!deal ?
**O!deal** est une **marketplace suisse** qui met en relation des fournisseurs de produits avec des acheteurs professionnels et particuliers. L'objectif est de centraliser l'offre de produits innovants, de qualité, et souvent difficiles à trouver ailleurs.

### Problème à résoudre
Actuellement, la découverte de **nouveaux produits et fournisseurs** se fait manuellement :
1. David et Laurent trouvent des produits intéressants sur Instagram, TikTok, Facebook, ou des sites web
2. Ils doivent manuellement rechercher les infos sur l'entreprise (nom, site web, email, LinkedIn)
3. Ils doivent estimer le prix de marché (MSRP EU/CH)
4. Ils doivent catégoriser le produit dans la bonne catégorie O!deal
5. Ils doivent rédiger un email de prospection pour contacter l'entreprise
6. Ils doivent suivre les réponses et relances

**Ce processus prend 10-15 minutes par produit** et est très répétitif.

### Solution proposée
**Prospection-ODL** automatise ce processus :
- **Envoi d'un lien** via Telegram → Analyse automatique par IA → **Toutes les infos extraites** → **Email de prospection en 1 clic**
- **Gain de temps estimé** : de 10-15 minutes à **30 secondes** par produit
- **Objectif** : passer de 5-10 produits analysés par jour à **50-100 produits par jour**

## 🎯 RÈGLES MÉTIER SPÉCIFIQUES

### 1. Utilisateurs
- **Deux utilisateurs uniquement** pour le MVP : David et Laurent
- **Rôle** : Admin complet (lecture, écriture, suppression)
- **Authentification** : Email + mot de passe via Supabase Auth
- **Pas de système de permissions avancé** pour le MVP (tous les users authentifiés = admin)

### 2. Catégories produits (STRICT)
- **10 catégories principales** + **65 sous-catégories** (total : 75 catégories)
- **Pas de création de nouvelles catégories** par l'IA
- L'IA doit **choisir parmi les catégories existantes uniquement**
- Si l'IA ne trouve pas de catégorie pertinente, elle doit choisir la **catégorie la plus proche** et mettre un **confidence_score faible** (<0.70)

#### Liste des 10 catégories principales
1. **Alimentation** (Foods & Beverages)
2. **Beauté & Bien-être** (Beauty & Wellness)
3. **Maison & Jardin** (Home & Garden)
4. **Mode & Accessoires** (Fashion & Accessories)
5. **Sports & Loisirs** (Sports & Leisure)
6. **Électronique & Technologie** (Electronics & Technology)
7. **Enfants & Bébés** (Kids & Babies)
8. **Auto & Moto** (Auto & Moto)
9. **Animaux** (Pets)
10. **Services & Expériences** (Services & Experiences)

### 3. Sources de produits
- **Instagram** : Posts, Reels, Stories (via lien)
- **Facebook** : Posts, Pages (via lien)
- **TikTok** : Vidéos (via lien)
- **Sites web** : E-commerce, landing pages, sites vitrines
- **Autres** : LinkedIn, Pinterest, etc.

**Important** : Jina AI Reader peut scraper toutes ces sources (gratuit, pas de limite).

### 4. Prix de marché (MSRP)
- **MSRP** = Manufacturer's Suggested Retail Price (Prix public conseillé)
- **Deux devises** : EUR (€) et CHF (CHF)
- **Priorité** : Marché européen (EU) et suisse (CH)
- **Source** : Marketplace concurrente (Amazon, AliExpress, etc.) ou site officiel du fabricant
- **Si non trouvé** : Laisser `null` et mettre `msrp_source_url = null`

### 5. Informations entreprise
- **Nom** : Nom officiel de l'entreprise (pas le nom du produit)
- **Site web** : URL du site officiel (priorité : .com, .ch, .eu)
- **Email** : Email de contact (idéalement : contact@, info@, sales@)
- **LinkedIn** : URL de la page entreprise LinkedIn (pas le profil personnel)
- **Pays** : Code ISO (CH, FR, DE, IT, US, etc.)
- **Adresse** : Adresse complète si trouvée (optionnel)
- **Année de création** : Année de fondation (optionnel)
- **E-commerce** : Boolean (true si l'entreprise a un site e-commerce)

### 6. Statuts produit
- **to_review** : Produit analysé par l'IA, en attente de validation humaine
- **standby** : Produit validé mais pas prioritaire (mise en attente)
- **contacted** : Email de prospection envoyé
- **archived** : Produit supprimé ou non pertinent

**Workflow** :
```
to_review → standby (optionnel) → contacted → archived (si pas de réponse)
```

### 7. Confidence score
- **Valeur** : 0.00 à 1.00
- **Seuil d'acceptation** : 0.70 (si < 0.70, l'analyse est considérée comme peu fiable)
- **Calcul** : Basé sur la qualité des données extraites par Claude API
  - 1.00 : Toutes les infos trouvées (nom, catégorie, entreprise, MSRP, etc.)
  - 0.80-0.99 : La plupart des infos trouvées
  - 0.50-0.79 : Infos partielles (catégorie + nom produit minimum)
  - <0.50 : Données insuffisantes (produit rejeté)

### 8. Email de prospection
- **Langues** : EN (prioritaire), FR, DE, IT
- **Ton** : Startup-friendly, direct, pas corporatiste
- **Types de templates** :
  - **first_contact** : Premier email de contact
  - **followup_1** : Relance après 7 jours sans réponse
  - **followup_2** : Relance finale après 14 jours sans réponse
- **Variables dynamiques** :
  - `{{company_name}}` : Nom de l'entreprise
  - `{{product_name}}` : Nom du produit
  - `{{product_category}}` : Catégorie du produit
  - `{{sender_name}}` : David ou Laurent
  - `{{sender_title}}` : Product Sourcing Manager
- **Tracking** : Ouverture + clics (via SendGrid webhooks)

### 9. Analyse IA (Claude API)
L'IA doit extraire **en une seule passe** :
- Nom du produit
- Description concise (max 500 caractères)
- Catégorie + sous-catégorie (strictes)
- Images (URLs)
- Vidéos (URLs si disponibles)
- Nom entreprise
- Site web entreprise
- Email entreprise (si trouvé)
- LinkedIn entreprise (si trouvé)
- Pays entreprise
- MSRP EU + MSRP CH (si trouvé)
- Source URL du prix (marketplace concurrente)
- Confidence score (0.00-1.00)

**Format de sortie** : JSON structuré (voir `lib/services/claude-analyzer.ts`)

## ⚠️ POINTS D'ATTENTION

### 1. Rate limiting
- **Telegram webhook** : Max 10 requêtes/minute (éviter spam)
- **Claude API** : Max 50 requêtes/minute (limite Anthropic)
- **SendGrid** : Max 100 emails/jour (tier gratuit)

### 2. Gestion des erreurs
- **Jina AI Reader échoue** : Retry 1 fois, puis notifier l'utilisateur via Telegram
- **Claude API échoue** : Retry 1 fois, puis sauvegarder en BDD avec `status = "failed"`
- **SendGrid échoue** : Notifier l'utilisateur et logger l'erreur

### 3. Images et vidéos
- **Pas de upload** : Stocker uniquement les URLs (économie de stockage)
- **Limite** : Max 10 images et 5 vidéos par produit
- **Format** : Array de strings (URLs)

### 4. Sécurité
- **Secrets API** : Toujours côté serveur (jamais exposés côté client)
- **Validation des URLs** : Toujours valider avant de scraper (éviter injections)
- **RLS Supabase** : Activé dès le début (tous les users authentifiés ont accès)

### 5. Performance
- **Server Components** : Par défaut pour toutes les pages
- **Client Components** : Seulement pour l'interactivité (boutons, modales, formulaires)
- **Images optimisées** : Utiliser `next/image` avec lazy loading

## 📊 MÉTRIQUES DE SUCCÈS (MVP)

### Objectifs
- **Analyse automatique** : 90% des produits analysés avec confidence_score > 0.70
- **Temps d'analyse** : <30 secondes par produit (de l'envoi du lien à la notification Telegram)
- **Taux de prospection** : 50% des produits "to_review" sont contactés sous 48h
- **Taux d'ouverture email** : >30% (benchmark SendGrid)
- **Taux de réponse email** : >5% (benchmark prospection B2B)

### KPIs à suivre
- Nombre de produits analysés par jour
- Confidence score moyen
- Temps moyen d'analyse (scraping + IA)
- Nombre d'emails envoyés par semaine
- Taux d'ouverture et clics email
- Nombre de fournisseurs contactés avec succès

## 🔄 ÉVOLUTIONS FUTURES (hors MVP)

### v1.1 - Tracking email avancé
- Webhooks SendGrid pour tracking ouverture/clics
- Tableau de bord avec stats email
- Relances automatiques (followup_1, followup_2)

### v1.2 - Multilingue complet
- Templates email FR, DE, IT (en plus de EN)
- Détection automatique de la langue du fournisseur
- Interface frontend multilingue

### v1.3 - Rôles et permissions
- Rôle `admin` : Accès complet
- Rôle `viewer` : Lecture seule
- Rôle `sourcing` : Peut contacter mais pas supprimer

### v1.4 - Intégration CRM
- Export vers HubSpot ou Pipedrive
- Synchronisation bidirectionnelle
- Webhook pour mises à jour en temps réel

### v1.5 - Dark mode
- Thème sombre pour l'interface
- Préférence utilisateur sauvegardée

---

**Dernière mise à jour** : 2025-11-16
