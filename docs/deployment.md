# Deployment Guide

Complete guide to deploy Narriv to production.

---

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Supabase Cloud](#supabase-cloud)
3. [Docker Deployment](#docker-deployment)
4. [VPS Deployment](#vps-deployment)
5. [Domain & SSL](#domain--ssl)
6. [Post-Deployment](#post-deployment)

---

## Deployment Options

| Option | Complexity | Cost | Best For |
|--------|------------|------|----------|
| **Supabase Cloud** | Low | $25+/mo | Managed database |
| **Docker + VPS** | Medium | $10-50/mo | Full control |
| **DigitalOcean App Platform** | Low | $5-20/mo | Simple deployment |
| **Railway** | Low | Pay-as-you-go | Quick starts |

---

## Supabase Cloud

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project ID and API keys

### 2. Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 3. Configure Environment

```env
# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

---

## Docker Deployment

### 1. Build Images

```bash
# Build backend
docker build -t narriv/backend ./backend

# Build frontend
docker build -t narriv/frontend ./frontend
```

### 2. Configure Environment

Create `.env.production`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret

# OpenAI
OPENAI_API_KEY=sk-...

# Redis
REDIS_URL=redis://redis:6379
ENABLE_WORKERS=true

# Domain
FRONTEND_URL=https://app.narriv.digital
CORS_ORIGINS=https://app.narriv.digital
```

### 3. Start Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose ps
```

---

## VPS Deployment

### 1. Server Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/rectoversomedia/narriv.git
cd narriv

# Create production .env
cp .env.example .env
nano .env  # Fill in all credentials
```

### 3. Setup Nginx

```bash
# Install Nginx
apt install nginx certbot python3-certbot-nginx -y

# Copy Nginx config
cp nginx/nginx.conf /etc/nginx/sites-available/narriv

# Edit config
nano /etc/nginx/sites-available/narriv

# Enable site
ln -s /etc/nginx/sites-available/narriv /etc/nginx/sites-enabled/

# Test and reload
nginx -t
systemctl reload nginx
```

### 4. SSL Certificate

```bash
# Get SSL certificate
certbot --nginx -d app.narriv.digital -d api.narriv.digital

# Auto-renewal
systemctl status certbot.timer
```

### 5. Start Docker Services

```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f
```

---

## Domain & SSL

### Recommended DNS Setup

| Record | Type | Value |
|--------|-------|-------|
| app.narriv.digital | A | Your server IP |
| api.narriv.digital | A | Your server IP |
| www.narriv.digital | CNAME | app.narriv.digital |

### SSL Configuration

The nginx config includes:
- TLS 1.2/1.3 only
- Modern cipher suites
- HSTS header
- OCSP stapling

---

## Post-Deployment

### 1. Verify Health

```bash
# Check backend health
curl https://api.narriv.digital/health

# Check runtime health
curl https://api.narriv.digital/health/runtime
```

### 2. Run Smoke Tests

```bash
cd backend
npm run load:smoke
```

### 3. Setup Monitoring

1. **UptimeRobot** - Free uptime monitoring
2. **Sentry** - Error tracking
3. **Grafana** - Metrics dashboard

### 4. Setup Backups

The Docker Compose includes automated daily backups:
```bash
# Access backup container
docker exec -it narriv-backup ls /backups/
```

### 5. Configure Cron Jobs

```bash
# Add to crontab
crontab -e

# Example: Database backup daily at 2 AM
0 2 * * * docker exec narriv-db pg_dump -Fc narriv > /backups/db-$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Missing env variables
# - Database connection failed
# - Port already in use
```

### Frontend shows 502

```bash
# Check nginx logs
docker-compose logs nginx

# Check backend is running
docker-compose ps backend
```

### SSL certificate issues

```bash
# Renew certificate
certbot renew

# Force reload
systemctl reload nginx
```

---

## Security Checklist

- [ ] All `.env` values are set (no placeholders)
- [ ] JWT secrets are unique and strong
- [ ] SSL certificate is valid
- [ ] CORS origins are restricted
- [ ] Database password is strong
- [ ] Rate limiting is enabled
- [ ] Firewall is configured
- [ ] Backups are scheduled
- [ ] Monitoring is active

---

## Next Steps

- [API Documentation](api.md) - API reference
- [Getting Started](getting-started.md) - Development setup
