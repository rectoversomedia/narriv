# Narriv Production Operations Handoff

Last verified: 2026-10-14

How Narriv actually runs in production, how to deploy and verify it, and what
is still blocked. This supersedes the VPS/Prisma sections of
`production-readiness-runbook.md`, which describe a deployment that was never
used.

## Topology

| Layer | Production | Notes |
|---|---|---|
| Frontend | Vercel project `frontend` (team `rectoverso-media`) | Serves `www.narriv.digital` and `narriv.digital`. Not Git-connected. |
| Backend API | Vercel project `narriv-api` | Root `backend`, Git-connected, auto-deploys `main`. Serves `narriv-api.vercel.app`. |
| Database | Supabase PostgreSQL via `@supabase/supabase-js` | Migrations in `supabase/migrations/`. No Prisma. |
| Scheduler | Vercel Cron | `/api/cron/ingest?slot=0|6|12|18` and `/api/cron/daily`. Runs logged in `cron_ingestion_logs`. |
| AI | OpenAI (default routing) | `ANTHROPIC_API_KEY` is set but unused: `AI_ROUTING_PROFILE` and `AI_MODEL_PREMIUM` are unset by owner decision. |
| Email | Resend (`RESEND_API_KEY`, `EMAIL_FROM`) | `narriv.digital` has no MX record, so there is no inbound mailbox. |
| DNS | Hostinger (`dns-parking.com` nameservers) | Owner access only. |

Vercel project `narriv` is a stale duplicate whose builds fail; ignore it.

## Deploy

Backend: push to `main`. Vercel builds `narriv-api` automatically. A READY
deployment is not proof that it works; check `/health` and the runtime logs.

Frontend: deploy with the CLI from the repo root, pinning the project (the root
`.vercel` links to the stale `narriv` project):

```bash
VERCEL_ORG_ID=team_foB6dX8df6bz7yGUBafyrlcO \
VERCEL_PROJECT_ID=prj_b8bqgEPqryI3Sg7TuXa4nSpznnRL \
node_modules/.bin/vercel deploy --prod --yes
```

Preview deployments cannot be signed into: `JWT_SECRET` and
`NEXT_PUBLIC_API_URL` are Production-only, and the backend CORS allowlist only
contains `www.narriv.digital`. Review public pages on a preview; review
signed-in pages on a local production build (below).

## Verify

| Check | Command or URL | Expected |
|---|---|---|
| API health | `curl https://narriv-api.vercel.app/health` | `{"status":"ok"}` |
| Runtime logs | `node_modules/.bin/vercel logs --project narriv-api --scope rectoverso-media --environment production --since 15m --no-branch --expand` | No new errors |
| Pipeline | `GET /api/pipeline/status` (signed in) | `scheduler.health` shows 4/4 scheduled runs in 24h |
| Demo session | `POST /api/auth/demo` with `{}` | Tokens for a temporary user pinned to the shared demo workspace |

The demo user has no workspace role: owner/admin routes (keyword create and
delete, member management) return 403 by design. Demo sessions see member
emails masked.

### Local review of signed-in pages

`.env.local` points at `localhost:3000`, which runs an unrelated project, so
build with the production API URL and give the local route guard its own
throwaway secret. All data still comes from the production API with the real
demo token.

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://narriv-api.vercel.app npx next build
JWT_SECRET=<local-only-random> NEXT_PUBLIC_API_URL=https://narriv-api.vercel.app npx next start -p 3101
```

The browser test must re-sign the `narriv_auth` cookie with that local secret
and add CORS headers for `narriv-api.vercel.app` responses (the API only
allows `www.narriv.digital`).

## Tests

```bash
cd backend && NODE_ENV=test node --experimental-vm-modules ../node_modules/jest/bin/jest.js
cd frontend && npm run test:unit && npx tsc --noEmit -p . && npx eslint . && npx next build
```

Playwright specs in `frontend/tests/e2e` register real users and need a
non-production backend on port 3000; they are not run against production.
GitHub Actions cannot run while the account is billing-locked.

## Client demo workflow (owner/admin)

1. Sign in with your own account (Google or email). Your first workspace is created with you as owner.
2. Topbar workspace name -> **New client workspace** (`POST /api/workspaces`; you become owner; max 10 owned).
3. Settings -> Monitoring Keywords: add the client's company, brand, product or executive names (25 active max, duplicates rejected).
4. **Run now** (`POST /api/ingestion/run-keywords`): Google News for up to 3 active keywords x 8 articles, deduplicated, stored, analysed, clustered. One run per workspace per 10 minutes. Scheduled runs continue every 6 hours.
5. Dashboard, Signals, Intelligence and Reports read only the selected workspace (`X-Workspace-Id`, membership checked; never a union of workspaces).
6. Ask Narriv answers from that workspace's stored signals and cites them.

The shared demo login has no role: it can read the demo workspace but cannot create workspaces, edit keywords, run monitoring or run AI tests.

## AI providers and Apify (2026-10-13)

| Workflow | Provider / model | How chosen |
|---|---|---|
| Ask Narriv | OpenAI gpt-4o-mini | routing profile (`AI_ROUTING_PROFILE` unset = openai) |
| Signal analysis and sentiment | OpenAI gpt-4o-mini | fixed in `ai.service.js` |
| Action plans and recommendations | OpenAI gpt-4o-mini | fixed in `actions.service.js` |
| AI Visibility | OpenAI gpt-4o-mini | fixed in `geo` services |
| Narrative clustering, reports | none | deterministic |

- `ANTHROPIC_API_KEY` is set but no workflow routes to Claude. Setting `AI_ROUTING_PROFILE=claude` would move **only Ask Narriv** (complex tier -> `claude-sonnet-5-5`; simple -> `claude-haiku-5-5`; premium -> `claude-opus-5-5` only if `AI_MODEL_PREMIUM` is set). Run Settings -> AI providers -> **Test connections** first.
- Scheduled keyword monitoring uses Google News RSS, not Apify. Legacy Apify source runs (`/ingestion/run`) need the BullMQ worker, which does not run on Vercel; they answer 503 `WORKERS_DISABLED`.
- Social and web collection (2026-10-14): Settings -> **Social and web collection** (`POST /api/ingestion/collect {preset, keyword}`, owner/admin) starts one Apify actor run on Apify's side for one of the workspace's active keywords: X, TikTok, Instagram, Threads, YouTube, Facebook, Google Search, Indonesian news. Caps: 20 items, `APIFY_COLLECTION_MAX_CHARGE_USD` (default 0.25, never above `APIFY_MAX_CHARGE_USD`), `APIFY_COLLECTION_TIMEOUT_SECS` (default 180), one active run per workspace, `APIFY_DAILY_RUNS_PER_WORKSPACE` (default 10) per 24h. `GET /api/ingestion/collect/:id` checks the run and, once Apify reports SUCCEEDED, stores the dataset once (dedup, AI analysis, clustering, alerts). The panel polls every 15 s; the daily cron finishes runs nobody checked. Runs are logged in `cron_ingestion_logs` (`job_name = apify-collection`) with status, Apify run id, cost and totals. **No actor has been run in production yet**: none of these platforms is verified until an owner starts a collection and it reports stored results.
- Data Sources (2026-10-14): a card's status comes from evidence (`GET /api/sources/health` -> `connector.status`): `paused`, `not_tested` (never run here), `collecting`, `operational` (last run stored results), `no_results` (succeeded, nothing found; healthy), `failed`, `access_restricted` (Apify refused: token, billing, actor rental). Last Sync = last finished run; Recent Activity = collection runs plus Google News keyword runs for the workspace. Card **Sync** starts one capped collection for that card (`POST /api/ingestion/collect {sourceId}`); results are stored with the card's `source_id`. Total Documents counts every stored document of the workspace; the volume chart is signals per platform over the last 7 days. Google News articles are never credited to an Apify card.
- Actor notes (Apify store pages, 2026-10-14): `apidojo/twitter-scraper-lite` on a free Apify plan runs only in Demo Mode (5 runs/month, max 10 items); paid plans ~$0.016 per query + $0.0004/tweet. TikTok ~$1.70, Instagram $2.70 (free plan), YouTube ~$2.40 per 1,000 results. TikTok/Instagram hashtag input has spaces removed.
- The Apify token in the local `backend/.env` is rejected by Apify (401). The production token's validity, plan and usage are shown by **Test connections** (read-only account call).

## Product structure (2026-10-14)

- Navigation: Overview, Monitoring (/signals), Issues & Narratives (/intelligence), Early Warnings (/alerts), AI Visibility, Ask Narriv, Reports & Insights (/reports + /brief tabs), Recommended Actions (/action-center + /action-plans + /workspace/cases tabs); Administration: Data Sources, Integrations, Activity Log, Settings. Config in `frontend/lib/navigation.ts`; old routes unchanged.
- Overview starts with `GET /api/ai/overview?windowHours=` (`backend/src/lib/executive-overview.js`, deterministic): happening / why it matters (fact vs interpretation) / what changed (only with a previous-period baseline) / up to 3 actions with workspace evidence. Fewer than 3 records -> `insufficient_data`.
- Indonesian is the default UI language for new visitors (stored choice wins).
- AI Visibility measures one model's (gpt-4o-mini) answers to test prompts only; the former hard-coded "AI Reputation" and "Share of AI Answer" panels were removed. The demo Daily Brief sample document is labelled illustrative.

## Open blockers (owner action required)

| Blocked | Why | Exact action | Needs |
|---|---|---|---|
| Owner-only verification | Client workspace creation, Run now, and Test connections need an owner session; the demo login is read-only by design | Sign in with your own account and follow the client demo workflow above | Owner |
| `api.narriv.digital` | Domain unverified in Vercel, so HTTPS fails | Add TXT `_vercel.narriv.digital` = `vc-domain-verify=api.narriv.digital,abc8cbbb2b1b05a59b40` (keep the two existing values) | DNS access |
| Support mailbox | No MX record for `narriv.digital`; the app shows "no support mailbox published" | Create MX records and a mailbox, then set `NEXT_PUBLIC_SUPPORT_EMAIL` on the frontend project; verify the `EMAIL_FROM` sender in Resend | DNS + email provider |
| Ownerless workspace recovery | `ADMIN_SECRET` unset; `/api/admin/ownership/*` returns `ADMIN_DISABLED` (fails closed) | Set a long random `ADMIN_SECRET` on `narriv-api` if recovery should be available | Owner (Vercel) |
| Duplicate schedulers | Migration 028 (unschedule pg_cron stub and SQL alert engine) not applied | Apply `supabase/migrations/028_retire_pg_cron_duplicate_schedulers.sql` in the Supabase SQL editor | Database access |
| CI | GitHub Actions jobs refused: "account is locked due to a billing issue" | Resolve billing in GitHub | Billing access |
| Legal pages | Privacy and Terms are marked DRAFT with bracketed placeholders | Legal review, then replace placeholders and remove the draft notice | Legal review |
| AI accuracy evaluation | `backend/eval/reference/labels-ref-v1-*.csv`: 0/26 items and 0/30 pairs labelled | Fill the sentiment/severity and sameNarrative columns, then import with `label-tools.mjs` | Human reviewers |
| Anthropic key exposure | The key was pasted in chat; owner chose not to rotate | Accepted risk while the key is unused; rotate before enabling Anthropic routing | Owner decision |
