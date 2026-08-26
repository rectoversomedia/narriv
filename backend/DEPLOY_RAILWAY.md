# Deploy Narriv Backend ke Railway

Railway is recommended karena: persistent process (BullMQ workers jalan), auto-deploy dari GitHub, easy Redis + PostgreSQL add-ons.

## Prasyarat

- Akun Railway ([railway.app](https://railway.app)) — login dengan GitHub
- GitHub repo `narriv` sudah terhubung

---

## Step 1: Deploy Backend ke Railway

### 1a. Buat project baru di Railway

1. Buka [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Pilih repo `rectoversomedia/narriv`
3. Pilih branch `main`
4. Railway auto-detect Node.js → set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 1b. Tambahkan environment variables

Di Railway Dashboard → project → **Variables**:

```
# Database (Supabase - sama seperti Vercel)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# Workers (BullMQ + Redis)
ENABLE_WORKERS=true
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
# Atau: redis://localhost:6379 (jika pakai Railway Redis plugin)

# Auth
JWT_SECRET=(generate: openssl rand -hex 32)
JWT_REFRESH_SECRET=(generate: openssl rand -hex 32)

# App
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://www.narriv.digital
APP_URL=https://www.narriv.digital
CORS_ORIGINS=https://www.narriv.digital

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://narriv.railway.app/auth/google/callback

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=Narriv <noreply@narriv.digital>

# AI
OPENAI_API_KEY=sk-xxx

# Apify
APIFY_TOKEN=xxx
```

### 1c. Setup Redis (jika belum punya)

Di Railway Dashboard → **Add Plugin** → **Redis**
- Copy connection string ke `REDIS_URL` variable

### 1d. Generate CRON_SECRET

```bash
openssl rand -hex 32
# Copy output ke variable:
CRON_SECRET=<output>
```

---

## Step 2: Update Google OAuth Callback

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Masuk ke project Google Cloud → **APIs & Services** → **Credentials**
3. Edit OAuth 2.0 Client ID
4. **Authorized redirect URIs** → tambah:
   ```
   https://narriv.railway.app/auth/google/callback
   ```
5. Save

---

## Step 3: Update Frontend API URL

Di Vercel Dashboard → `frontend` project → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://narriv.railway.app
```

Redeploy frontend: `vercel --prod` atau trigger via Dashboard.

---

## Step 4: Verify Deployment

```bash
# Test health
curl https://narriv.railway.app/api/cron/health-check \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"

# Test register
curl -X POST https://narriv.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"TestPass123!"}'
```

---

## Step 5: (Optional) Keep Vercel as Fallback

Vercel backend (`narriv-api.vercel.app`) masih bisa jadi fallback:
- Hapus `NEXT_PUBLIC_API_URL` env var dari frontend
- Frontend akan pakai Vercel sebagai primary

---

## Troubleshooting

### Railway sleeps on Hobby plan?
Railway Hobby: service sleeps setelah 30 menit inactivity. 
**Fix**: Upgrade ke Pro ($5/bulan) atau pakai **Railway Starter** ($3/bulan).

### Redis connection failed?
Pastikan `REDIS_URL` format benar:
```
redis://default:PASSWORD@HOST.upstash.io:6379
```

### CORS error setelah migrasi?
Pastikan `CORS_ORIGINS` di Railway includes `https://www.narriv.digital`

### BullMQ workers tidak jalan?
Cek Railway logs → workers → pastikan `ENABLE_WORKERS=true` dan `REDIS_URL` valid.

---

## Alur Kerja Setelah Migrasi

```
Frontend (Vercel) → Railway Backend (API + Workers)
                         ↓
                  Supabase (Database)
                         ↓
                  Upstash Redis (Workers Queue)
```
