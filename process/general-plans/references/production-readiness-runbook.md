# Narriv Production Readiness Runbook

Last updated: 2026-06-06

This runbook is the operational checklist for making Narriv production-ready on a DigitalOcean VPS with Hostinger-managed DNS. It covers deployment, database migration safety, environment variables, storage, backup, monitoring, and final QA gates.

## Target Topology

| Layer | Recommended v1 setup | Notes |
|---|---|---|
| DNS | Hostinger DNS | Point app/API records to the VPS public IP. |
| Reverse proxy | Nginx | Terminates TLS and forwards to local app ports. |
| TLS | Certbot / Let's Encrypt | Required because backend enforces HTTPS in production unless explicitly bypassed. |
| Frontend | Next.js production server | `npm run build`, then `npm run start` behind Nginx. |
| Backend | Node.js Express API | `node src/index.js` or PM2/systemd service. Honors `PORT`. |
| Database | PostgreSQL | Prefer managed Postgres for production. Single-node Docker Postgres is acceptable only with backups and volume persistence. |
| Redis | Redis 7 | Required for BullMQ queues, workers, scheduled jobs, and SSE-related workflows. |
| File uploads | Persistent local volume for v1 | `backend/uploads/logos` must survive deploys/restarts and be backed up. Use S3/Supabase before multi-instance scaling. |

## DNS And Domains

Use explicit domains before configuring OAuth and CORS.

| Purpose | Example | Required config |
|---|---|---|
| Frontend | `https://app.yourdomain.com` | `FRONTEND_URL`, `APP_URL`, frontend public URL |
| Backend API | `https://api.yourdomain.com` | `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS`, OAuth callback URLs |

Recommended DNS records:

| Type | Name | Value |
|---|---|---|
| A | `app` | VPS public IPv4 |
| A | `api` | VPS public IPv4 |

## Production Environment Variables

Backend `.env.production` must be created on the server and must not be committed.

| Variable | Required | Production rule |
|---|---:|---|
| `NODE_ENV` | Yes | Must be `production`. |
| `PORT` | Yes | Backend process port, normally `3000`. |
| `DATABASE_URL` | Yes | Production Postgres connection string. |
| `JWT_SECRET` | Yes | Strong random value, stable across deploys. |
| `JWT_REFRESH_SECRET` | Yes | Strong random value, different from `JWT_SECRET`. |
| `REDIS_URL` | Yes | Production Redis connection string. |
| `OPENAI_API_KEY` | Yes for live AI | Required for real AI analysis. |
| `APIFY_TOKEN` | Yes for live ingestion | Required for non-mock Apify ingestion. |
| `RESEND_API_KEY` | Yes for production email | Required for verification/reset/report email delivery. |
| `EMAIL_FROM` | Yes for production email | Must use a verified Resend sender/domain. |
| `APP_URL` | Yes | Frontend base URL, used in emails. |
| `FRONTEND_URL` | Yes | Frontend base URL, used by OAuth redirects. |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins. No wildcards for production. |
| `TRUST_PROXY` | Yes behind Nginx | Use a safe proxy setting for the deployment, for example `loopback` when Nginx runs on the same host. |
| `ALLOW_INSECURE_HTTP` | No | Must be false/blank for production. Only set `true` for controlled internal smoke tests. |
| `EXPOSE_RESET_SECRETS` | No | Must be false/blank for production. |
| `ALLOW_VERCEL_PREVIEW_ORIGINS` | No | Keep false/blank for VPS production. |
| `GOOGLE_CLIENT_ID` | Optional | Required for Google OAuth. |
| `GOOGLE_CLIENT_SECRET` | Optional | Required for Google OAuth. |
| `GOOGLE_CALLBACK_URL` | Optional | Must match Google Console exactly, for example `https://api.yourdomain.com/auth/google/callback`. |
| `MICROSOFT_CLIENT_ID` | Optional | Required for Microsoft OAuth. |
| `MICROSOFT_CLIENT_SECRET` | Optional | Required for Microsoft OAuth. |
| `MICROSOFT_CALLBACK_URL` | Optional | Must match Azure app registration exactly. |
| `REPORT_EXPORT_STORAGE_PROVIDER` | No | Current default is `database`. |
| `REPORT_EXPORT_URL_TTL_SECONDS` | No | Default is `3600`. |
| `LOG_LEVEL` | No | Use `info` for normal production. |

Frontend `.env.production`:

| Variable | Required | Production rule |
|---|---:|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL, for example `https://api.yourdomain.com`. |

## Database Migration Baseline Gate

This is a hard gate before production deploy.

Current repository state: `backend/prisma/migrations/` only has `migration_lock.toml`. The backend blueprint references historical migration IDs, so do not run production migrations blindly until the target DB baseline is confirmed.

Required checks:

1. Confirm whether production DB is empty or already has schema/data.
2. Backup the production DB before any Prisma operation.
3. Run `npx prisma migrate status` from `backend/` with production `DATABASE_URL` loaded.
4. If the DB is empty, create or restore the intended migration history before `npx prisma migrate deploy`.
5. If the DB already has schema but migration history is missing, compare actual schema to Prisma schema first.
6. Only use `npx prisma migrate resolve --applied <migration_id>` when that migration's SQL effects are already present in the DB.
7. Run `npx prisma generate` after dependency install/build steps.
8. Smoke-test `/health`, `/health/runtime`, auth, reports, visibility, and workspace settings after migration.

Do not use `prisma migrate dev` against production.

## VPS Provisioning Checklist

1. Create an Ubuntu LTS VPS with SSH key auth.
2. Create a non-root deploy user.
3. Enable firewall rules for SSH, HTTP, and HTTPS only.
4. Install Node.js 22 LTS-compatible runtime.
5. Install Nginx.
6. Install Certbot.
7. Install PM2 or create systemd services.
8. Install PostgreSQL/Redis only if not using managed services.
9. Create persistent directories for backend uploads, logs, and database backups.

Recommended persistent paths:

| Path | Purpose |
|---|---|
| `/var/www/narriv/backend` | Backend checkout/build. |
| `/var/www/narriv/frontend` | Frontend checkout/build. |
| `/var/lib/narriv/uploads/logos` | Persistent logo uploads. |
| `/var/backups/narriv/postgres` | Database backups. |
| `/var/log/narriv` | App logs if not using PM2 log paths. |

## Nginx Reverse Proxy Shape

Backend API should receive `x-forwarded-proto: https` from Nginx because production backend rejects insecure requests.

Minimal API server block shape:

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Minimal frontend server block shape:

```nginx
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Build And Start Commands

Backend:

```powershell
npm ci
npm run prisma:generate
npm test
npm run start
```

Frontend:

```powershell
npm ci
npm run lint
npm run build
npm run start -- -p 3001
```

Production process manager should run equivalent commands from each package directory with production env files loaded.

## Storage And Backup

Logo uploads currently write to `backend/uploads/logos`.

For single-node VPS v1:

1. Mount or symlink `backend/uploads/logos` to a persistent directory.
2. Include that directory in backup jobs.
3. Confirm deploy scripts do not delete it.
4. Move to object storage before adding multiple app instances.

Database backups:

1. Use managed database automated backups when available.
2. If self-hosted Postgres, schedule daily `pg_dump` with retention.
3. Test restore into a staging database before launch.

## Observability And Health

Required before launch:

1. Monitor `GET /health` every 1 minute.
2. Monitor `GET /health/runtime` every 5 minutes.
3. Configure log rotation for backend and frontend process logs.
4. Configure alerting for process restarts, disk usage, Redis failure, DB failure, and 5xx spikes.
5. Keep `/metrics` protected; it requires bearer auth.

## Final QA Gate

Run these after deployment with production-like env values.

| Flow | Expected result |
|---|---|
| Register -> verify email -> login | User can create and verify account. |
| Login -> refresh -> logout | Session works and refresh token revokes. |
| Forgot password -> verify code -> new password | Email delivery works through Resend. |
| Google OAuth | Callback exchanges one-time code and logs in. |
| Microsoft OAuth | Callback exchanges one-time code and logs in. |
| Dashboard home | KPIs load, SSE does not break page. |
| Signals | List/search/pagination load from API. |
| Alerts | List/detail/status/assignment work. |
| Visibility | Summary/trends/prompts render live or empty fallback. |
| Reports | Export job creates, polls, and downloads. |
| Sources | Toggle/sync/delete mutations work. |
| Settings | Workspace updates, member actions, password change, logo upload persist. |
| Notifications | Bell loads notifications and SSE pushes updates. |

## Release Gate Checklist

Do not mark Narriv production-ready until all items are true.

- [ ] Production domains selected and DNS propagated.
- [ ] TLS certificates installed and auto-renewal tested.
- [ ] Backend `.env.production` created with no dev/default secrets.
- [ ] Frontend `.env.production` points to production API URL.
- [ ] `CORS_ORIGINS`, `APP_URL`, `FRONTEND_URL`, and OAuth callback URLs match production domains.
- [ ] `ALLOW_INSECURE_HTTP` is false/blank.
- [ ] `EXPOSE_RESET_SECRETS` is false/blank.
- [ ] Database baseline verified and backed up.
- [ ] Prisma migration strategy confirmed before any production migration deploy.
- [ ] Redis connectivity verified.
- [ ] Upload directory persistence and backup verified.
- [ ] Log rotation or external log shipping configured.
- [ ] Health monitoring configured for `/health` and `/health/runtime`.
- [ ] Backend `npm test` passes.
- [ ] Frontend `npm run lint` passes.
- [ ] Frontend `npm run build` passes.
- [ ] Manual final QA gate passes.

## Current Blockers Found During Audit

| Blocker | Evidence | Required action |
|---|---|---|
| Prisma migration baseline unresolved | `backend/prisma/migrations/` contains only `migration_lock.toml` while blueprint references historical migration IDs. | Confirm target DB state and create/restore migration strategy before production deploy. |
| No existing deployment runbook | No deploy/production docs found before this file. | Use this runbook as the deployment source of truth and update it as real infrastructure is chosen. |
| Local upload storage needs persistence | Logo upload writes to `backend/uploads/logos`. | Mount/symlink persistent storage and backup it, or migrate to object storage. |
| Docker Compose has dev fallback secrets | `backend/docker-compose.yml` provides default JWT/DB fallback values. | Never use fallback values in production; provide explicit env values or use managed services. |
| OAuth requires real production callbacks | Google/Microsoft callback URLs are env-driven. | Configure provider consoles after final domains are chosen. |
