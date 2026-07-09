# Getting Started with Narriv

Complete guide to set up Narriv for development and production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Common Issues](#common-issues)

---

## Prerequisites

### Required Tools

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Comes with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### Required Accounts

| Service | Purpose | Signup |
|---------|---------|--------|
| Supabase | Database & Auth | [supabase.com](https://supabase.com) |
| OpenAI | AI Capabilities | [platform.openai.com](https://platform.openai.com) |
| Apify | Web Scraping | [apify.com](https://apify.com) |
| Resend | Email Delivery | [resend.com](https://resend.com) |

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `narriv`
   - **Database Password**: Copy this securely!
   - **Region**: Choose closest to your users

4. Wait for the project to be created (~2 minutes)

### 2. Get API Credentials

Go to **Settings > API** in your Supabase dashboard:

```
Project URL: https://your-project-id.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Database Migrations

Use Supabase's SQL Editor or CLI to run migrations:

```bash
# Using Supabase CLI
supabase db push

# Or copy-paste migrations from docs/supabase-setup.md
```

### 4. Enable Email Templates (Optional)

In Supabase Dashboard > Authentication > Email Templates:
- Customize verification email
- Customize reset password email

---

## Backend Setup

### 1. Clone and Install

```bash
git clone https://github.com/rectoversomedia/narriv.git
cd narriv/backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase (from Step 2)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-chars

# OpenAI (from platform.openai.com)
OPENAI_API_KEY=sk-...

# Apify (from apify.com - optional for live data)
APIFY_TOKEN=your-apify-token

# Resend (from resend.com - optional for emails)
RESEND_API_KEY=re_...

# Redis (for BullMQ workers - optional for development)
REDIS_URL=redis://localhost:6379
ENABLE_WORKERS=false
```

### 3. Generate JWT Secrets

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Verify Setup

```bash
npm run dev
```

Should see:
```
🚀 Server running on http://localhost:3000
[SUPABASE] Connected successfully
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

Should see:
```
▲ Next.js 16.2.7
- Local: http://localhost:3001
```

---

## Running the Application

### Development Mode

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Access:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

### Docker Development Mode

```bash
cd narriv
docker-compose up -d postgres redis
```

Then run backend/frontend locally.

### Production Mode

See [deployment.md](deployment.md) for full production setup.

---

## Common Issues

### Issue: "SUPABASE Connection failed"

**Cause**: Incorrect Supabase credentials or RLS blocking access.

**Solution**:
1. Verify `SUPABASE_URL` is correct (no trailing slash)
2. Verify `SUPABASE_SERVICE_KEY` starts with `eyJ`
3. Check Supabase dashboard > Logs for errors

### Issue: "JWT secret is not configured"

**Cause**: Missing `JWT_SECRET` in `.env`

**Solution**:
```bash
# Generate a secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Add to .env as JWT_SECRET=
```

### Issue: "Redis connection failed"

**Cause**: Redis not running or `REDIS_URL` incorrect.

**Solution**:
```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or disable workers for development
ENABLE_WORKERS=false
```

### Issue: "OpenAI API error"

**Cause**: Invalid or missing OpenAI API key.

**Solution**:
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env` as `OPENAI_API_KEY=sk-...`

### Issue: "CORS error in browser"

**Cause**: Frontend URL not in `CORS_ORIGINS`.

**Solution**:
In backend `.env`:
```env
CORS_ORIGINS=http://localhost:3001
```

### Issue: "Build failed - missing dependencies"

**Cause**: Node_modules not installed or version mismatch.

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

- [API Documentation](api.md) - Learn the API endpoints
- [Deployment Guide](deployment.md) - Deploy to production
- [Supabase Setup](supabase-setup.md) - Database schema and RLS

---

## Getting Help

- **Documentation**: [docs/](.)
- **Issues**: [GitHub Issues](https://github.com/rectoversomedia/narriv/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rectoversomedia/narriv/discussions)
