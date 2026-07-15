#!/bin/bash
# Narriv Database Migration Deployment Script
# Run this script to apply all database migrations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Narriv Database Migration Deployment"
echo "=========================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL not set${NC}"
    echo "Using local Supabase instance..."
fi

# Migration files to apply
MIGRATIONS=(
    "003_rls_fix_users_table.sql"
    "007_alerts_performance_indexes.sql"
    "009_core_performance_indexes.sql"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_DIR="$SCRIPT_DIR/../supabase/migrations"

echo ""
echo -e "${YELLOW}Migrations to apply:${NC}"
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$MIGRATION_DIR/$migration" ]; then
        echo "  ✓ $migration"
    else
        echo -e "  ${RED}✗ $migration (NOT FOUND)${NC}"
    fi
done

echo ""
read -p "Continue with migration? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Apply migrations in order
echo ""
echo "Applying migrations..."
echo ""

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$MIGRATION_DIR/$migration" ]; then
        echo -e "${YELLOW}Applying: $migration${NC}"

        # Use psql or supabase db push based on environment
        if [ -n "$DATABASE_URL" ]; then
            # Direct database connection
            psql "$DATABASE_URL" -f "$MIGRATION_DIR/$migration" || {
                echo -e "${RED}Failed to apply $migration${NC}"
                exit 1
            }
        else
            # Try local Supabase
            supabase db push --file "$MIGRATION_DIR/$migration" || {
                echo -e "${RED}Failed to apply $migration${NC}"
                exit 1
            }
        fi

        echo -e "${GREEN}✓ $migration applied successfully${NC}"
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}All migrations applied successfully!${NC}"
echo "=========================================="

# Verify RLS policies
echo ""
echo "Verifying RLS policies..."

if [ -n "$DATABASE_URL" ]; then
    echo ""
    echo "RLS on user_profiles:"
    psql "$DATABASE_URL" -c "SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'user_profiles'::regclass;"

    echo ""
    echo "Tables with RLS enabled:"
    psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND relrowsecurity = true;"
fi

echo ""
echo "Migration complete!"
