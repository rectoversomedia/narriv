#!/bin/bash
# Narriv Production Setup Script
# Run this script after cloning the repo to setup your production environment

set -e

echo "=========================================="
echo "  Narriv Production Setup"
echo "=========================================="
echo ""

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is required but not installed."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command git

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "⚠️  Warning: Node.js 22+ recommended (current: $(node -v))"
fi

echo "✅ Prerequisites checked"
echo ""

# ===========================================
# 1. SUPABASE SETUP
# ===========================================
echo "=========================================="
echo "  Step 1: Supabase Configuration"
echo "=========================================="

read -p "Do you have a Supabase project? (y/n): " HAS_SUPABASE
if [ "$HAS_SUPABASE" = "y" ]; then
    echo ""
    echo "📝 Please provide your Supabase credentials:"
    read -p "  Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
    read -p "  Service Role Key: " SUPABASE_SERVICE_KEY
    read -p "  Anon Key: " SUPABASE_ANON_KEY

    # Save to backend .env.local
    echo ""
    echo "📝 Running database migrations..."
    echo "Copy the following SQL files to your Supabase SQL Editor:"
    echo "  1. supabase/migrations/001_initial_schema.sql"
    echo "  2. supabase/migrations/002_rls_policies.sql"
    echo "  3. supabase/migrations/003_functions.sql"
    echo "  4. supabase/migrations/004_triggers.sql"

    # Or use Supabase CLI
    if command -v supabase &> /dev/null; then
        read -p "Use Supabase CLI to push migrations? (y/n): " USE_CLI
        if [ "$USE_CLI" = "y" ]; then
            read -p "  Project Ref: " PROJECT_REF
            supabase link --project-ref $PROJECT_REF
            supabase db push
        fi
    fi
else
    echo ""
    echo "📝 Creating Supabase project..."
    echo "1. Go to https://supabase.com and create a new project"
    echo "2. Get your API credentials from Settings > API"
    echo "3. Run this script again"
fi

echo ""

# ===========================================
# 2. ENVIRONMENT VARIABLES
# ===========================================
echo "=========================================="
echo "  Step 2: Environment Variables"
echo "=========================================="

echo "Creating .env files..."

# Backend .env
cat > backend/.env << EOF
# Supabase
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=CHANGE_ME_generate_a_secure_jwt_secret
JWT_REFRESH_SECRET=CHANGE_ME_generate_a_secure_refresh_secret

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Redis
REDIS_URL=redis://localhost:6379
ENABLE_WORKERS=false

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3001

# Security (CHANGE THESE!)
SESSION_TIMEOUT_MS=1800000
MAX_CONCURRENT_SESSIONS=3
EOF

# Frontend .env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

echo "✅ .env files created"
echo "⚠️  IMPORTANT: Edit backend/.env and fill in all CHANGE_ME values!"
echo ""

# ===========================================
# 3. GITHub Secrets Setup
# ===========================================
echo "=========================================="
echo "  Step 3: GitHub Secrets"
echo "=========================================="

echo "📝 Please add these secrets to your GitHub repository:"
echo ""
echo "Go to: Settings > Secrets and variables > Actions"
echo ""
echo "Required secrets for CI/CD:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_KEY"
echo "  - SUPABASE_ANON_KEY"
echo "  - JWT_SECRET"
echo "  - JWT_REFRESH_SECRET"
echo "  - OPENAI_API_KEY"
echo "  - REDIS_URL"
echo ""
echo "For deployment:"
echo "  - SSH_HOST"
echo "  - SSH_USER"
echo "  - SSH_PRIVATE_KEY"
echo "  - DOMAIN"
echo ""
echo "For Sentry:"
echo "  - SENTRY_DSN"
echo ""

# ===========================================
# 4. Install Dependencies
# ===========================================
echo "=========================================="
echo "  Step 4: Install Dependencies"
echo "=========================================="

echo "📦 Installing backend dependencies..."
cd backend
npm install

echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "📦 Installing Sentry CLI (for source maps)..."
npm install -g @sentry/cli

cd ..
echo ""

# ===========================================
# 5. Verify Setup
# ===========================================
echo "=========================================="
echo "  Step 5: Verify Setup"
echo "=========================================="

echo "🧪 Running tests..."
cd backend
npm test || echo "⚠️  Tests may fail without Supabase connection"
cd ..

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with real credentials"
echo "  2. Add GitHub secrets"
echo "  3. Run database migrations in Supabase"
echo "  4. Push changes to trigger CI/CD"
echo "  5. Deploy to production"
echo ""
