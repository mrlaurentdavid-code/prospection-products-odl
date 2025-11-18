#!/bin/bash

# ============================================
# DEPLOYMENT SCRIPT - Prospection ODL
# ============================================
# Deploy brand feature to VPS
# Date: 2025-11-18
# ============================================

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
VPS_USER=${VPS_USER:-"root"}
VPS_HOST=${VPS_HOST:-"prosp.odl-tools.ch"}
VPS_PATH=${VPS_PATH:-"/var/www/prospection-odl"}
PM2_APP_NAME="prospection-odl"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🚀 Deploying Brand Feature to VPS${NC}"
echo -e "${BLUE}============================================${NC}"

# Step 1: Check SSH connection
echo -e "\n${YELLOW}📡 Step 1: Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection OK${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo -e "${RED}Please check:${NC}"
    echo -e "${RED}  - VPS_USER (current: ${VPS_USER})${NC}"
    echo -e "${RED}  - VPS_HOST (current: ${VPS_HOST})${NC}"
    echo -e "${RED}  - SSH keys or password${NC}"
    exit 1
fi

# Step 2: Check if project exists on VPS
echo -e "\n${YELLOW}📂 Step 2: Checking project on VPS...${NC}"
if ssh "${VPS_USER}@${VPS_HOST}" "[ -d ${VPS_PATH} ]"; then
    echo -e "${GREEN}✅ Project directory found at ${VPS_PATH}${NC}"
else
    echo -e "${RED}❌ Project directory not found${NC}"
    echo -e "${YELLOW}Creating directory...${NC}"
    ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}"
    echo -e "${GREEN}✅ Directory created${NC}"
fi

# Step 3: Sync code to VPS
echo -e "\n${YELLOW}📤 Step 3: Syncing code to VPS...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude 'logs' \
    ./ "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Code synced successfully${NC}"
else
    echo -e "${RED}❌ Code sync failed${NC}"
    exit 1
fi

# Step 4: Ensure .env.production exists on VPS
echo -e "\n${YELLOW}🔐 Step 4: Checking environment variables...${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && \
    if [ -f .env.production ]; then \
        echo '✅ .env.production exists'; \
        ln -sf .env.production .env.local; \
    else \
        echo '⚠️ .env.production not found, please configure it manually'; \
    fi"

# Step 5: Install dependencies
echo -e "\n${YELLOW}📦 Step 5: Installing dependencies...${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && npm install --production"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Dependency installation failed${NC}"
    exit 1
fi

# Step 6: Build application
echo -e "\n${YELLOW}🔨 Step 6: Building application...${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && npm run build"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Step 7: Restart PM2
echo -e "\n${YELLOW}🔄 Step 7: Restarting application...${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && \
    if pm2 list | grep -q ${PM2_APP_NAME}; then \
        echo 'Restarting existing PM2 process...'; \
        pm2 restart ${PM2_APP_NAME}; \
    else \
        echo 'Starting new PM2 process...'; \
        pm2 start npm --name ${PM2_APP_NAME} -- start; \
        pm2 save; \
    fi"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application restarted${NC}"
else
    echo -e "${RED}❌ PM2 restart failed${NC}"
    exit 1
fi

# Step 8: Check application status
echo -e "\n${YELLOW}📊 Step 8: Checking application status...${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "pm2 status ${PM2_APP_NAME}"

# Step 9: Show recent logs
echo -e "\n${YELLOW}📝 Step 9: Recent logs:${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "pm2 logs ${PM2_APP_NAME} --lines 20 --nostream"

# Success!
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${BLUE}🌐 Application URL: https://${VPS_HOST}${NC}"
echo -e "${BLUE}📊 Check PM2: ssh ${VPS_USER}@${VPS_HOST} 'pm2 status'${NC}"
echo -e "${BLUE}📝 View logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs ${PM2_APP_NAME}'${NC}"

echo -e "\n${YELLOW}⚠️  IMPORTANT: Don't forget to run the SQL migrations in Supabase Dashboard!${NC}"
echo -e "${YELLOW}   1. Migration 038: Create brands table${NC}"
echo -e "${YELLOW}   2. Migration 039: Create brands RPC functions${NC}"
