# Narriv Deployment Guide

Production deployment checklist. Complete each step in order.

---

## Step 1 — Rotate All Secrets

Generate new JWT secrets (the `.env` file currently has stale placeholders):

```bash
openssl rand -base64 64
openssl rand -base64 64
```

Set the two generated values as:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

**Where to set:** Vercel project dashboard → Settings → Environment Variables

---

## Step 2 — Create Two Vercel Projects

Deploy `frontend/` and `backend/` as **separate Vercel projects**. Do NOT deploy from the repo root.

```bash
# Backend
cd narriv/backend
vercel --prod

# Frontend
cd narriv/frontend
vercel --prod
```

Or via dashboard:
- dashboard.vercel.com → New Project → Import `narriv/backend`
- dashboard.vercel.com → New Project → Import `narriv/frontend`

---

## Step 3 — Set Backend Environment Variables

In the **backend** Vercel project, set these in Settings → Environment Variables:

| Variable | Value | Note |
|---|---|---|
| `SUPABASE_URL` | From Supabase dashboard | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key | From Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Anon key | From Supabase → Settings → API |
| `JWT_SECRET` | First `openssl rand -base64 64` output | **Rotate before setting** |
| `JWT_REFRESH_SECRET` | Second `openssl rand -base64 64` output | **Rotate before setting** |
| `OPENAI_API_KEY` | From platform.openai.com/api-keys | Required for AI features |
| `RESEND_API_KEY` | From resend.com/api-keys | Optional, for email |
| `APIFY_TOKEN` | From console.apify.com | Optional, for data ingestion |
| `REDIS_URL` | `Upstash Redis URL` | Optional — see Step 5 |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `CORS_ORIGINS` | `https://<your-frontend-url>` | Comma-separated for multiple |
| `APP_URL` | `https://<your-frontend-url>` | |
| `FRONTEND_URL` | `https://<your-frontend-url>` | |

---

## Step 4 — Set Frontend Environment Variables

In the **frontend** Vercel project, set these in Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-backend-vercel-url>` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional, for Google OAuth |
| `NODE_ENV` | `production` |

---

## Step 5 — BullMQ Workers (Optional)

BullMQ workers require a persistent Redis connection. Vercel serverless does NOT keep processes running between invocations, so standard BullMQ won't work.

**Option A — Upstash Redis (Recommended for Vercel)**
1. Create account at https://upstash.com
2. Create a Redis database
3. Copy the REST URL and token
4. Set in backend Vercel project:
   - `REDIS_URL` = `rediss://<token>@<host>:<port>`
   - `ENABLE_WORKERS` = `true`

**Option B — Skip Workers (Vercel)**
Leave `ENABLE_WORKERS=false`. AI analysis, alert detection, and scheduled ingestion will not run. Signals and alerts can still be created via API/webhook.

**Option C — VPS/Docker (Full Features)**
Use `docker-compose.production.yml` — it includes Redis and sets `ENABLE_WORKERS=true` automatically.

---

## Step 6 — Custom Domain

**Backend:** Vercel dashboard → backend project → Settings → Domains → Add `api.narriv.digital`

**Frontend:** Vercel dashboard → frontend project → Settings → Domains → Add `narriv.digital`

Update `NEXT_PUBLIC_API_URL` in frontend Vercel settings to match the backend domain.

Update `CORS_ORIGINS` in backend Vercel settings to include the frontend domain.

---

## Step 7 — Verify Deployment

```bash
# Check backend health
curl https://<backend-url>/health

# Check backend metrics
curl https://<backend-url>/metrics
```

1. Open frontend — should load without redirect loop
2. Sign up / log in — auth flow should work end-to-end
3. Check browser console — no 401/403 errors on API calls
4. Check Vercel function logs for errors

---

## Step 8 — Post-Deployment

- [ ] Monitor Vercel function errors for the first 24 hours
- [ ] Verify Sentry is receiving errors (if `SENTRY_DSN` is set)
- [ ] Test a real data ingestion if Apify token is set
- [ ] Set up Vercel analytics on both projects
- [ ] Add Uptime monitoring (e.g. Grafana, Pingdom) on `/health` endpoint

---

## Troubleshooting

**Auth redirect loop:** `NEXT_PUBLIC_API_URL` in frontend Vercel settings doesn't match the backend URL. Check browser Network tab for mismatched origins.

**401 on all API calls:** JWT secret mismatch between what frontend encodes and what backend decodes. Ensure `JWT_SECRET` in backend Vercel settings matches what was used to generate the token (typically set during login — rotate if unsure).

**SSE/realtime not working:** SSE requires a persistent connection. BullMQ workers must be running. With `ENABLE_WORKERS=false` on Vercel, realtime features are degraded.

**Build fails on Vercel:** Check that the backend's `vercel.json` has `"buildCommand": "node build.mjs"` and the frontend's has `"buildCommand": "npm run build"`. Both projects build independently.

## Social media collection (X, TikTok, Instagram) — cost control

Scheduled social collection runs through Apify and costs money, so it is **off for every workspace** until the
Narriv team switches it on. Clients only see its status (Data Sources page); they cannot change it.

From `backend/`:

```bash
node --env-file=.env scripts/social-auto.mjs list                       # workspaces with active keywords
node --env-file=.env scripts/social-auto.mjs on <workspace> --cap 25    # switch on, $25/month ceiling
node --env-file=.env scripts/social-auto.mjs set <workspace> --platforms x,instagram --cap 10 --no-crisis
node --env-file=.env scripts/social-auto.mjs status                     # spend this month per workspace
node --env-file=.env scripts/social-auto.mjs off <workspace>
```

How it spends (cron `/api/cron/social`, hourly at :30):
- one round a day at 08:00 WIB: one run per chosen platform for the workspace's first active keyword;
- crisis mode (default on): three rounds (08:00, 12:00, 16:00 WIB) while a critical alert from the last 72 h is open;
- each run is capped at `APIFY_COLLECTION_MAX_CHARGE_USD` (0.25) and 20 posts; a run without a bill yet counts at its
  full cap, so the ceilings hold before Apify reports the cost.

Limits (backend env on Vercel):

| Variable | Default | Meaning |
|---|---|---|
| `SOCIAL_MONTHLY_CAP_TOTAL_USD` | 75 | all workspaces together, per calendar month |
| `SOCIAL_MONTHLY_CAP_PER_WORKSPACE_USD` | 25 | per workspace, unless `--cap` sets its own |
| `SOCIAL_AUTO_PAUSED` | unset | `1` stops every scheduled social run immediately |

Also set a monthly usage limit in the Apify console (Billing → Limits) as the provider-side stop.

News (Google News RSS) is checked every hour for every workspace and is free; YouTube and Reddit (when their keys
are set) run every 6 hours to stay inside their free quotas.
