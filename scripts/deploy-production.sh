#!/bin/bash
# ============================================
# Narriv Production Deployment Script
# ============================================
# Usage: ./deploy-production.sh [backend|frontend|all]
#
# Environment variables required:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - REDIS_URL
# - OPENAI_API_KEY
# - APIFY_TOKEN
# - RESEND_API_KEY
# - EMAIL_FROM
# - FRONTEND_URL
# - CORS_ORIGINS
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="deploy"
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_PATH="/var/www/narriv"
BACKUP_PATH="/var/backups/narriv"
LOG_FILE="/var/log/narriv/deploy.log"

# Parse arguments
DEPLOY_TARGET="${1:-all}"

# Functions
log() {
    local level=$1
    shift
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo -e "$message"
    echo "$message" >> "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }
warn() { log "WARNING" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; exit 1; }

check_prerequisites() {
    info "Checking prerequisites..."

    # Check required environment variables
    local missing_vars=()
    for var in SUPABASE_URL DATABASE_URL JWT_SECRET REDIS_URL; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
    fi

    success "Prerequisites check passed"
}

backup_database() {
    info "Backing up database..."

    local backup_name="narriv_db_$(date +%Y%m%d_%H%M%S).sql.gz"
    local backup_file="$BACKUP_PATH/$backup_name"

    # Ensure backup directory exists
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $BACKUP_PATH"

    # Create database backup
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pg_dump -Fc narriv_production | gzip > $backup_file"

    # Keep only last 7 backups
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $BACKUP_PATH && ls -t *.sql.gz | tail -n +8 | xargs -r rm"

    success "Database backed up: $backup_name"
}

backup_files() {
    info "Backing up current application files..."

    local backup_name="narriv_files_$(date +%Y%m%d_%H%M%S).tar.gz"
    local backup_file="$BACKUP_PATH/$backup_name"

    ssh "$DEPLOY_USER@$DEPLOY_HOST" "tar -czf $backup_file -C $DEPLOY_PATH . --exclude='node_modules' --exclude='.git'"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $BACKUP_PATH && ls -t *.tar.gz | tail -n +8 | xargs -r rm"

    success "Files backed up: $backup_name"
}

deploy_backend() {
    info "Deploying backend..."

    # Create deployment directory
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/backend"

    # Copy backend files
    rsync -avz --delete \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='.env*' \
        ./backend/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/backend/"

    # Install dependencies
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH/backend && npm ci --production"

    # Run database migrations
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH/backend && npx prisma generate"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH/backend && npx prisma migrate deploy"

    # Restart backend service
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 restart narriv-backend || pm2 start src/index.js --name narriv-backend"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 save"

    # Health check
    sleep 5
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "https://api.narriv.digital/health")
    if [ "$health_status" = "200" ]; then
        success "Backend deployed and healthy"
    else
        error "Backend health check failed (HTTP $health_status)"
    fi
}

deploy_frontend() {
    info "Deploying frontend..."

    # Create deployment directory
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/frontend"

    # Copy frontend files
    rsync -avz --delete \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.env*' \
        ./frontend/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/frontend/"

    # Install dependencies
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH/frontend && npm ci"

    # Build frontend
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH/frontend && NEXT_PUBLIC_API_URL=https://api.narriv.digital npm run build"

    # Restart frontend service
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 restart narriv-frontend || pm2 start npm --name narriv-frontend -- start"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 save"

    success "Frontend deployed"
}

verify_deployment() {
    info "Verifying deployment..."

    # Check all endpoints
    local endpoints=(
        "https://api.narriv.digital/health"
        "https://api.narriv.digital/health/runtime"
        "https://app.narriv.digital"
    )

    for endpoint in "${endpoints[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
        if [ "$status" -ge 200 ] && [ "$status" -lt 400 ]; then
            success "$endpoint - OK (HTTP $status)"
        else
            warn "$endpoint - FAILED (HTTP $status)"
        fi
    done
}

rollback() {
    warn "Initiating rollback..."

    # Get latest backup
    local latest_backup=$(ssh "$DEPLOY_USER@$DEPLOY_HOST" "ls -t $BACKUP_PATH/narriv_files_*.tar.gz | head -1")

    if [ -z "$latest_backup" ]; then
        error "No backup found for rollback"
    fi

    # Restore files
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 stop all"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "rm -rf $DEPLOY_PATH/*"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "tar -xzf $latest_backup -C $DEPLOY_PATH"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 start all"

    success "Rollback completed from: $latest_backup"
}

# Main execution
main() {
    echo "========================================"
    echo "  Narriv Production Deployment"
    echo "  Target: $DEPLOY_TARGET"
    echo "  Time: $(date)"
    echo "========================================"
    echo ""

    # Check if deploying to remote
    if [ -n "$DEPLOY_HOST" ]; then
        check_prerequisites
        backup_files
        backup_database

        case "$DEPLOY_TARGET" in
            backend)
                deploy_backend
                ;;
            frontend)
                deploy_frontend
                ;;
            all)
                deploy_backend
                deploy_frontend
                ;;
            *)
                error "Unknown target: $DEPLOY_TARGET"
                ;;
        esac

        verify_deployment
    else
        info "Local deployment (DEPLOY_HOST not set)"
        info "Run with: DEPLOY_HOST=your-server.com ./deploy-production.sh"
    fi

    echo ""
    echo "========================================"
    success "Deployment completed!"
    echo "========================================"
}

# Run main
main
