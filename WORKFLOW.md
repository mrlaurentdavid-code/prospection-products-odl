# WORKFLOW - Prospection ODL
## CRITICAL: Read this file at the start of EVERY session

---

## 🏗️ PROJECT ARCHITECTURE

### Infrastructure Stack
1. **Local Development**: `/Users/laurentdavid/Desktop/App ODL-Tools/prospection-odl`
2. **VPS Production**: Hostinger VPS at `31.97.193.159` (prosp.odl-tools.ch)
   - Location: `/opt/prospection-odl`
   - Process Manager: PM2
   - Node.js: v20+ via nvm
3. **Database**: Supabase PostgreSQL (shared with other ODL projects)
   - Schema: `prospection`
   - Migrations in: `/supabase/migrations/`
4. **Version Control**: GitHub
   - Repo: https://github.com/mrlaurentdavid-code/prospection-products-odl.git
   - Branch: `main`

### 🚫 NOT USED
- ❌ Vercel (DO NOT DEPLOY THERE)
- ❌ Docker (not part of this project)
- ❌ Any other cloud platform

---

## 📋 STANDARD WORKFLOW

### 1. MAKING CODE CHANGES (Local)

```bash
# Work in local directory
cd "/Users/laurentdavid/Desktop/App ODL-Tools/prospection-odl"

# Make changes to files
# Test locally with: npm run dev (port 3000)

# Commit changes
git add <files>
git commit -m "descriptive message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push
```

### 2. DATABASE MIGRATIONS (Supabase)

```bash
# Migrations are SQL files in: /supabase/migrations/
# Format: XXX_descriptive_name.sql
# Example: 039_create_brands_rpc_functions.sql

# Deploy manually to Supabase Dashboard:
# 1. Open Supabase project dashboard
# 2. Go to SQL Editor
# 3. Copy/paste migration content
# 4. Execute
# 5. Verify in Table Editor or Functions

# NEVER use supabase CLI for this project
```

### 3. DEPLOYING TO PRODUCTION (VPS)

**ALWAYS follow these steps in order:**

```bash
# Step 1: Ensure code is committed and pushed to GitHub
git status  # Should be clean
git push    # If needed

# Step 2: Deploy to VPS using deployment script
cd "/Users/laurentdavid/Desktop/App ODL-Tools/prospection-odl"
./deploy-to-vps.sh

# OR manual deployment:
sshpass -p 'DuTL/D/zI4afwFE@,9iV' rsync -avz --delete \
  --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  --exclude '.env.local' --exclude 'logs' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ root@31.97.193.159:/opt/prospection-odl/

# Step 3: SSH into VPS and rebuild
sshpass -p 'DuTL/D/zI4afwFE@,9iV' ssh -o StrictHostKeyChecking=no root@31.97.193.159 \
  "export NVM_DIR=\"\$HOME/.nvm\" && \
   [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && \
   nvm use 20 && \
   cd /opt/prospection-odl && \
   npm install && \
   rm -rf .next && \
   npm run build && \
   pm2 restart prospection-odl --update-env"

# Step 4: Verify deployment
# - Check PM2 status: pm2 status prospection-odl
# - Check logs: pm2 logs prospection-odl --lines 20
# - Test URL: https://prosp.odl-tools.ch/dashboard
```

---

## ⚠️ CRITICAL RULES

### Security
1. **NEVER commit `.env.production`, `.env.local`, or `.env.development`**
2. **Check `.gitignore` includes all env files before committing**
3. **Use `.env.production.example` as template (no real secrets)**

### Git Workflow
1. **ALWAYS commit locally first**
2. **ALWAYS push to GitHub second**
3. **ALWAYS deploy to VPS last**
4. **NEVER skip GitHub** - it's the source of truth

### Deployment Workflow
1. **Local → GitHub → VPS** (in this order, always)
2. **ALWAYS rebuild on VPS** after code sync (`rm -rf .next && npm run build`)
3. **ALWAYS restart PM2** after rebuild (`pm2 restart prospection-odl`)
4. **VERIFY deployment works** before marking task as complete

### Testing
1. **Test on LOCAL first**: http://localhost:3000
2. **Commit and push** if tests pass
3. **Deploy to PRODUCTION**: https://prosp.odl-tools.ch
4. **Test on PRODUCTION** to verify

---

## 🔧 COMMON COMMANDS

### Local Development
```bash
npm run dev           # Start dev server (port 3000)
npm run build         # Build for production
npm run start         # Start production server locally
```

### VPS Operations
```bash
# SSH into VPS
sshpass -p 'DuTL/D/zI4afwFE@,9iV' ssh -o StrictHostKeyChecking=no root@31.97.193.159

# Once in VPS:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20
cd /opt/prospection-odl

# Check PM2 status
pm2 status prospection-odl
pm2 logs prospection-odl --lines 50

# Rebuild and restart
npm install
rm -rf .next
npm run build
pm2 restart prospection-odl --update-env

# Check if running
curl -I http://localhost:3000
```

### Git Operations
```bash
git status                    # Check status
git add <files>               # Stage files
git commit -m "message"       # Commit
git push                      # Push to GitHub
git log --oneline -5          # View recent commits
```

---

## 📁 KEY DIRECTORIES

```
prospection-odl/
├── app/                          # Next.js App Router
│   ├── dashboard/                # Dashboard pages
│   │   ├── page.tsx              # Main dashboard (stats cards)
│   │   ├── products/             # Product pages
│   │   └── brands/               # Brand pages
│   └── api/                      # API routes
│       ├── analyze/              # Product/brand analysis
│       ├── products/[id]/        # Product operations
│       └── brands/[id]/          # Brand operations
├── lib/
│   ├── services/                 # External services
│   │   ├── jina-scraper.ts       # Web scraping
│   │   ├── claude-analyzer.ts    # Product analysis
│   │   ├── claude-brand-analyzer.ts # Brand analysis
│   │   └── contact-page-enrichment.ts # Contact extraction
│   └── supabase/                 # Supabase clients
├── supabase/
│   └── migrations/               # SQL migrations (038, 039, etc.)
├── .env.production.example       # Env template (safe to commit)
├── .gitignore                    # Git ignore rules
├── deploy-to-vps.sh              # Deployment script
├── CLAUDE.md                     # Project documentation
└── WORKFLOW.md                   # This file
```

---

## 🔄 DEPLOYMENT CHECKLIST

Before marking ANY deployment as complete:

- [ ] Code changes committed locally (`git commit`)
- [ ] Code pushed to GitHub (`git push`)
- [ ] Code synced to VPS (rsync or `./deploy-to-vps.sh`)
- [ ] Dependencies installed on VPS (`npm install`)
- [ ] `.next` directory cleaned on VPS (`rm -rf .next`)
- [ ] Application built on VPS (`npm run build`)
- [ ] PM2 restarted (`pm2 restart prospection-odl`)
- [ ] Application status checked (`pm2 status`)
- [ ] Logs checked for errors (`pm2 logs`)
- [ ] Production URL tested (https://prosp.odl-tools.ch)
- [ ] User notified of completion

---

## 🐛 TROUBLESHOOTING

### "Port 3000 already in use"
```bash
# On VPS
lsof -ti:3000 | xargs kill -9
pm2 restart prospection-odl
```

### "Build failed - missing dependencies"
```bash
# On VPS
npm install  # NOT npm install --production (needs devDependencies)
```

### "Function not found" (Supabase RPC)
```bash
# Check migration was deployed in Supabase Dashboard
# Migration files: /supabase/migrations/
# Deploy manually via SQL Editor
```

### "Changes not visible on production"
```bash
# Rebuild is required after code changes!
rm -rf .next
npm run build
pm2 restart prospection-odl
```

---

## 📝 SESSION CHECKLIST

**At the START of every session:**
1. [ ] Read WORKFLOW.md (this file)
2. [ ] Read CLAUDE.md (project overview)
3. [ ] Check current working directory
4. [ ] Verify git status (`git status`)

**Before ANY deployment:**
1. [ ] Confirm infrastructure: VPS Hostinger + Supabase + GitHub
2. [ ] Follow deployment workflow (Local → GitHub → VPS)
3. [ ] NEVER mention or use Vercel, Docker, or other platforms

**After ANY code changes:**
1. [ ] Test locally first
2. [ ] Commit and push to GitHub
3. [ ] Deploy to VPS with full rebuild
4. [ ] Verify on production URL

---

**Last Updated**: 2025-11-19
**Always refer to this file for deployment procedures**
