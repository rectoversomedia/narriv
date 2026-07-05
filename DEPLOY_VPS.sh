#!/bin/bash
# Narriv Backend Deployment Script for VPS
# Run this on your Hostinger VPS

set -e

echo "=== Narriv Backend Deployment ==="

# 1. Update system
echo "[1/8] Updating system..."
apt update && apt upgrade -y

# 2. Install dependencies
echo "[2/8] Installing dependencies..."
apt install -y curl git build-essential

# 3. Install Node.js 22 (if not already installed)
echo "[3/8] Checking Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi
node -v

# 4. Install PM2
echo "[4/8] Installing PM2..."
npm install -g pm2

# 5. Create directory and clone repo
echo "[5/8] Setting up application..."
mkdir -p /root/narriv/backend
cd /root/narriv/backend

# If repo not cloned yet, you need to manually upload files
# Or use: git clone https://YOUR_TOKEN@github.com/rectoversomedia/narriv.git /root/narriv

# 6. Install app dependencies
echo "[6/8] Installing npm dependencies..."
npm install
npx prisma generate

# 7. Set environment variables (REPLACE THESE!)
echo "[7/8] Environment variables..."
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_SUPABASE_HOST:6543/postgres?pgbouncer=true"
export JWT_SECRET="generate-a-random-32-char-string"
export JWT_REFRESH_SECRET="generate-another-random-32-char-string"
export CORS_ORIGINS="https://www.narrriv.digital,https://narrriv.digital"
export NODE_ENV="production"
export ENABLE_WORKERS="false"
export PORT="3000"

# 8. Start with PM2
echo "[8/8] Starting application..."
pm2 start npm -- start --name "narriv-backend"
pm2 save
pm2 startup

echo "=== Done! ==="
echo "Backend should be running on port 3000"
pm2 status
