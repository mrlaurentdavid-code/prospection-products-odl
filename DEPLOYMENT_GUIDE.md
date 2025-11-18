# 🚀 Guide de Déploiement Production - Prospection ODL

## 📋 Prérequis

### 1. Services Externes Requis

- ✅ **Supabase** (Database + Auth)
  - URL projet: `https://[PROJECT-ID].supabase.co`
  - Anon Key (publique)
  - Service Role Key (secrète)

- ✅ **Anthropic Claude API**
  - API Key commençant par `sk-ant-`
  - Modèle utilisé: `claude-sonnet-4-20250514`
  - Coût estimé: ~$0.003 par analyse

- ✅ **Telegram Bot**
  - Token obtenu via [@BotFather](https://t.me/botfather)
  - Chat ID pour les notifications

- ⚠️ **SendGrid** (Optionnel pour MVP)
  - API Key
  - Email vérifié (ex: `prospection@odl-tools.ch`)
  - Gratuit: 100 emails/jour

- ⚠️ **Hunter.io** (Optionnel)
  - API Key pour enrichissement contacts
  - Gratuit: 50 recherches/mois

### 2. Serveur Requis

- **Node.js** 18.x ou supérieur
- **npm** ou **yarn**
- **PM2** (recommandé pour process management)
- **Nginx** (reverse proxy)
- **SSL/TLS** certificate (Let's Encrypt)

---

## 🔧 Étape 1: Préparation de la Base de Données

### 1.1. Appliquer toutes les migrations Supabase

```bash
# Se connecter au Dashboard Supabase
# https://supabase.com/dashboard/project/[PROJECT-ID]

# Aller dans SQL Editor
# Exécuter les migrations dans l'ordre (001 à 035)
```

**Migrations critiques à vérifier:**
- ✅ `001_initial_schema.sql` - Schéma de base
- ✅ `014_create_user_profiles.sql` - Profils utilisateurs
- ✅ `024_add_contacts_to_products.sql` - Support contacts
- ✅ `033_create_product_history.sql` - Historique produits
- ✅ `035_create_update_product_images_function.sql` - Gestion images

### 1.2. Vérifier les RLS Policies

```sql
-- Vérifier que les policies sont actives
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'prospection';
```

---

## 📦 Étape 2: Préparation du Code

### 2.1. Cloner le projet sur le serveur

```bash
# SSH sur le serveur
ssh user@prosp.odl-tools.ch

# Cloner le repo (ou copier les fichiers)
cd /var/www/
git clone [REPO_URL] prospection-odl
cd prospection-odl
```

### 2.2. Installer les dépendances

```bash
npm install --production
```

### 2.3. Créer le fichier `.env.local` de production

```bash
cp .env.local.example .env.local
nano .env.local
```

**Variables à configurer:**

```env
# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://wdwadxpmrxkglrvwhwsp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[VOTRE_SERVICE_ROLE_KEY]

# ============================================
# ANTHROPIC (Claude API)
# ============================================
ANTHROPIC_API_KEY=sk-ant-[VOTRE_CLE_API]

# ============================================
# TELEGRAM BOT
# ============================================
TELEGRAM_BOT_TOKEN=[VOTRE_BOT_TOKEN]
TELEGRAM_CHAT_ID=[VOTRE_CHAT_ID]

# ============================================
# SENDGRID (Optionnel pour MVP)
# ============================================
SENDGRID_API_KEY=[VOTRE_CLE_SENDGRID]
SENDGRID_FROM_EMAIL=prospection@odl-tools.ch

# ============================================
# HUNTER.IO (Optionnel)
# ============================================
HUNTER_API_KEY=[VOTRE_CLE_HUNTER]

# ============================================
# APPLICATION
# ============================================
NEXT_PUBLIC_APP_URL=https://prosp.odl-tools.ch
NODE_ENV=production
```

### 2.4. Build de l'application

```bash
npm run build
```

**Vérifier qu'il n'y a pas d'erreurs TypeScript ou de build.**

---

## 🚀 Étape 3: Déploiement avec PM2

### 3.1. Installer PM2 (si pas déjà fait)

```bash
npm install -g pm2
```

### 3.2. Créer un fichier `ecosystem.config.js`

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'prospection-odl',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/prospection-odl',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3.3. Démarrer l'application

```bash
# Créer le dossier logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs prospection-odl

# Sauvegarder la config PM2 (auto-restart au reboot)
pm2 save
pm2 startup
```

---

## 🌐 Étape 4: Configuration Nginx

### 4.1. Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/prosp.odl-tools.ch
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name prosp.odl-tools.ch;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name prosp.odl-tools.ch;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/prosp.odl-tools.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prosp.odl-tools.ch/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logs
    access_log /var/log/nginx/prosp.odl-tools.ch.access.log;
    error_log /var/log/nginx/prosp.odl-tools.ch.error.log;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max body size (for image uploads)
    client_max_body_size 10M;
}
```

### 4.2. Activer le site

```bash
sudo ln -s /etc/nginx/sites-available/prosp.odl-tools.ch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3. Configurer SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d prosp.odl-tools.ch
```

---

## 🔗 Étape 5: Configuration du Webhook Telegram

### 5.1. Configurer le webhook

```bash
curl -X POST "https://api.telegram.org/bot[VOTRE_BOT_TOKEN]/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://prosp.odl-tools.ch/api/telegram/webhook",
    "allowed_updates": ["message"]
  }'
```

### 5.2. Vérifier le webhook

```bash
curl "https://api.telegram.org/bot[VOTRE_BOT_TOKEN]/getWebhookInfo"
```

**Résultat attendu:**
```json
{
  "ok": true,
  "result": {
    "url": "https://prosp.odl-tools.ch/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## ✅ Étape 6: Tests Post-Déploiement

### 6.1. Test de l'application

```bash
# Vérifier que l'app répond
curl https://prosp.odl-tools.ch

# Tester l'endpoint de health check (si vous en avez un)
curl https://prosp.odl-tools.ch/api/health
```

### 6.2. Test de l'analyse produit

```bash
# Via Telegram
# Envoyer un lien produit dans le chat Telegram

# Ou via cURL
curl -X POST https://prosp.odl-tools.ch/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/product"}'
```

### 6.3. Vérifier les logs

```bash
# Logs PM2
pm2 logs prospection-odl --lines 50

# Logs Nginx
sudo tail -f /var/log/nginx/prosp.odl-tools.ch.access.log
sudo tail -f /var/log/nginx/prosp.odl-tools.ch.error.log
```

---

## 🔄 Commandes Utiles Post-Déploiement

### Redémarrer l'application

```bash
pm2 restart prospection-odl
```

### Mettre à jour le code

```bash
cd /var/www/prospection-odl
git pull
npm install
npm run build
pm2 restart prospection-odl
```

### Voir les logs en temps réel

```bash
pm2 logs prospection-odl
```

### Monitoring

```bash
pm2 monit
```

---

## 🐛 Troubleshooting

### Problème: L'app ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs prospection-odl --err

# Vérifier les variables d'environnement
pm2 env prospection-odl

# Redémarrer PM2
pm2 delete prospection-odl
pm2 start ecosystem.config.js
```

### Problème: Erreur 502 Bad Gateway

```bash
# Vérifier que PM2 tourne
pm2 status

# Vérifier que Next.js écoute sur le port 3000
netstat -tulpn | grep 3000

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/prosp.odl-tools.ch.error.log
```

### Problème: Webhook Telegram ne fonctionne pas

```bash
# Vérifier le webhook
curl "https://api.telegram.org/bot[TOKEN]/getWebhookInfo"

# Réinitialiser le webhook
curl -X POST "https://api.telegram.org/bot[TOKEN]/deleteWebhook"
curl -X POST "https://api.telegram.org/bot[TOKEN]/setWebhook" \
  -d "url=https://prosp.odl-tools.ch/api/telegram/webhook"
```

---

## 📊 Monitoring et Maintenance

### Logs à surveiller

- **PM2 logs**: `/var/www/prospection-odl/logs/`
- **Nginx logs**: `/var/log/nginx/prosp.odl-tools.ch.*.log`
- **Application logs**: Dans PM2 (`pm2 logs`)

### Backup recommandé

- **Base de données Supabase**: Backup automatique activé
- **Code source**: Git repository
- **Variables d'environnement**: `.env.local` (backup sécurisé)

---

## 🎯 Checklist Finale

- [ ] ✅ Toutes les migrations Supabase appliquées
- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ Application buildée sans erreur (`npm run build`)
- [ ] ✅ PM2 lancé et configuré pour auto-restart
- [ ] ✅ Nginx configuré avec SSL
- [ ] ✅ Webhook Telegram configuré et vérifié
- [ ] ✅ Test d'analyse produit réussi
- [ ] ✅ Accès HTTPS fonctionnel sur `prosp.odl-tools.ch`
- [ ] ✅ Logs accessibles et surveillés

---

**Déploiement préparé par:** Claude Code
**Date:** 2025-11-18
**Version:** 1.0.0
**Contact:** Laurent David
