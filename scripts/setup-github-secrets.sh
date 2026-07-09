#!/bin/bash
# GitHub Secrets Setup Helper
# Run this after adding GitHub CLI credentials

set -e

echo "=========================================="
echo "  GitHub Secrets Setup"
echo "=========================================="
echo ""

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

echo "✅ Logged in to GitHub"
echo ""

# Get repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "📦 Setting secrets for: $REPO"
echo ""

# Function to set secret securely
set_secret() {
    local NAME=$1
    local VALUE=$2

    if [ -z "$VALUE" ]; then
        echo "⏭️  Skipping $NAME (empty)"
        return
    fi

    echo "🔐 Setting $NAME..."
    echo "$VALUE" | gh secret set "$NAME" --body
}

# Supabase
echo "=========================================="
echo "  Supabase Configuration"
echo "=========================================="
read -p "Supabase URL: " SUPABASE_URL
set_secret "SUPABASE_URL" "$SUPABASE_URL"

read -p "Supabase Service Key: " SUPABASE_SERVICE_KEY
set_secret "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY"

read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
set_secret "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
echo ""

# JWT Secrets
echo "=========================================="
echo "  JWT Configuration"
echo "=========================================="
echo "Generate secrets with:"
echo "  node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""
read -p "JWT Secret: " JWT_SECRET
set_secret "JWT_SECRET" "$JWT_SECRET"

read -p "JWT Refresh Secret: " JWT_REFRESH_SECRET
set_secret "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"
echo ""

# OpenAI
echo "=========================================="
echo "  OpenAI Configuration"
echo "=========================================="
read -p "OpenAI API Key: " OPENAI_API_KEY
set_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
echo ""

# Redis
echo "=========================================="
echo "  Redis Configuration"
echo "=========================================="
read -p "Redis URL (redis://...): " REDIS_URL
set_secret "REDIS_URL" "$REDIS_URL"
echo ""

# Sentry (optional)
echo "=========================================="
echo "  Sentry Configuration (Optional)"
echo "=========================================="
read -p "Sentry DSN (or Enter to skip): " SENTRY_DSN
set_secret "SENTRY_DSN" "$SENTRY_DSN"
echo ""

# Deployment (optional)
echo "=========================================="
echo "  Deployment Configuration (Optional)"
echo "=========================================="
read -p "SSH Host (or Enter to skip): " SSH_HOST
set_secret "SSH_HOST" "$SSH_HOST"

read -p "SSH User (or Enter to skip): " SSH_USER
set_secret "SSH_USER" "$SSH_USER"

echo "SSH Private Key (paste multiline, Ctrl+D to finish): "
SSH_KEY=$(cat)
set_secret "SSH_PRIVATE_KEY" "$SSH_KEY"

read -p "Domain (e.g., narriv.digital): " DOMAIN
set_secret "DOMAIN" "$DOMAIN"
echo ""

# Set repository variables
echo "=========================================="
echo "  Repository Variables"
echo "=========================================="
read -p "Turboream Team (optional): " TURBO_TEAM
if [ -n "$TURBO_TEAM" ]; then
    gh variable set TURBO_TEAM --body "$TURBO_TEAM"
fi

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify secrets at: https://github.com/$REPO/settings/secrets/actions"
echo "  2. Push changes to trigger CI"
echo "  3. Monitor CI at: https://github.com/$REPO/actions"
