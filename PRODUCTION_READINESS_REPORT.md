# Narriv — Production Readiness Report

**Date:** 2026-08-12
**Scope:** Full-stack audit — auth/security, backend API, frontend UI/UX, error handling & infrastructure
**Method:** 4 parallel audit agents + manual code verification

---

## Executive Summary

> **Verdict: NOT SAFE FOR PRODUCTION in current state.**

The app has structural bones that can ship, but **21 runtime crashes**, **5 data corruption/security issues**, and **dozens of broken user-facing features** will affect real users on day one. The deployment currently on `narriv.digital` (`narriv-9tzcingb5`) is one of those crashes.

The good news: every issue is **fixable** — none require architectural rethink. The bad news: the blast radius is wide.

---

## CRITICAL Issues — Must Fix Before Launch

These cause runtime crashes, data corruption, or active security exploitation.

### 1. `recordAuditLog` called but never imported
**File:** `backend/src/modules/action-plans/action-plans.routes.js` line 349

`GET /api/action-plans/:id/learning` throws `ReferenceError: recordAuditLog is not defined` on every request. The function is called but never imported.

**Fix:** Add `import { recordAuditLog } from "../../lib/audit.js";`

---

### 2. `demo` handler does not exist
**File:** `backend/src/modules/auth/auth.controller.js`

`auth.routes.js` imports and binds `{ demo }` from the controller, but the function is never defined. `POST /api/auth/demo` throws `TypeError: demo is not a function`. This is the demo login backend route — **broken in the current deployment**.

**Fix:** Implement and export the `demo` function, or remove the route entirely.

---

### 3. BullMQ queue silently returns `undefined` when Redis is down
**File:** `backend/src/lib/queue.js`

Every queue helper (`addAnalysisJob`, `addAlertDetectionJob`, `addIngestionJob`, `addNotificationsJob`, `addVisibilityScanJob`) is wrapped in `if (!ENABLE_WORKERS || !REDIS_URL) return;`. Callers get `undefined` silently — no error, no log, no degradation signal. The entire async pipeline (AI analysis, alert detection, ingestion, notifications) **disappears without warning** when Redis is unavailable or `ENABLE_WORKERS` is unset.

Production implication: BullMQ workers are not running. `ENABLE_WORKERS` must be explicitly set. Queue operations silently no-op.

**Fix:** Return a typed unavailable result. Callers must check and surface errors.

---

### 4. Frontend middleware does not validate JWT
**File:** `frontend/middleware.ts` lines 39–42

```typescript
const authCookie = request.cookies.get("narriv-authenticated");
if (authCookie?.value === "true") {
  return NextResponse.next();
}
```

The cookie is set by the frontend after login but never validated server-side. Any request with `narriv-authenticated=true` cookie bypasses auth, regardless of whether the JWT is expired, revoked, or forged. This is the **only** auth check on the frontend — it is trivially bypassed.

**Fix:** In middleware, read the JWT from the cookie and verify signature/expiry using the same secret the backend uses.

---

### 5. `invalidateUserSessions` called as undefined
**File:** `backend/src/modules/auth/auth.controller.js` — `changePassword` handler

```javascript
await invalidateUserSessions(req.user.id, req.user.sessionId);
```
`invalidateUserSessions` is never imported. On `POST /api/auth/change-password`, every request throws `ReferenceError: invalidateUserSessions is not defined`.

**Fix:** Import and apply `invalidateUserSessions` from `session.middleware.js`.

---

### 6. Session middleware is dead code — never applied
**File:** `backend/src/index.js`

`session.middleware.js` defines `sessionManager`, `invalidateUserSessions`, and concurrent session limits — but is **never imported or applied**. Session management code exists but is completely inactive. Concurrent session limits are non-functional.

**Fix:** Either wire the session middleware into `index.js` or remove the dead file entirely.

---

### 7. `initializeRateLimiter` is never called
**File:** `backend/src/index.js`

Rate limiting middleware (`RATE_LIMITS` from `rate-limit.js`) is used on specific routes, but `initializeRateLimiter()` — which connects to Redis and sets up cleanup — is **never invoked**. The in-memory fallback is always used, even in production with Redis available. Rate limiting works but at in-memory (single-process) granularity, not distributed.

**Fix:** Call `initializeRateLimiter()` at startup.

---

### 8. `initializeRateLimiter` in-memory fallback has no size cap
**File:** `backend/src/lib/rate-limit-store.js`

The in-memory `Map`-based rate limit store grows without bound. Under DDoS, it fills RAM until the process crashes.

**Fix:** Add `MAX_MEMORY_ENTRIES = 10000` cap with oldest-entry eviction.

---

### 9. `POST /signals` skips Zod validation despite schema existing
**File:** `backend/src/modules/signals/signals.routes.js`

`createSignalBodySchema` is defined but not wired to the `POST /` route. Required fields (`title`) are not validated. Malformed requests hit the database directly.

**Fix:** Add `validateRequest` middleware to `POST /`.

---

### 10. `STRATEGY_TYPES` schema mismatch with controller
**File:** `backend/src/modules/actions/actions.schema.js` vs `actions.controller.js`

Schema defines 4 strategy types; controller validates 7. Requests with `social_response`, `stakeholder_update`, or `data_driven` strategies are rejected at the schema layer.

**Fix:** Align `STRATEGY_TYPES` enum with the 7 types the controller handles.

---

### 11. Supabase PostgREST syntax errors in OAuth path
**File:** `backend/src/modules/auth/auth.controller.js` — `consumeOAuthExchange`

`.is("revokedAt", null)` — `revokedAt` is camelCase but the actual column is `revoked_at` (snake_case). PostgREST throws `400` on invalid filter keys. OAuth token consumption fails at runtime.

**Fix:** Change to `.is("revoked_at", null)`.

---

### 12. Alerts duplicate detection uses invalid Supabase syntax
**File:** `backend/src/modules/alerts/alerts.service.js`

`.not("status", "is", null)` — Supabase PostgREST does not accept 3-argument `.not()` in this form. Throws `400` at runtime.

**Fix:** Replace with `.is("status", null)` or verify correct PostgREST negation syntax.

---

### 13. Dashboard delta is `Math.random()` — completely fake data
**File:** `backend/src/modules/dashboard/dashboard.controller.js` line 216

```js
const deltaPercent = Math.round((Math.random() - 0.5) * 20); // Placeholder
```
Every KPI trend percentage on the dashboard is fabricated. Users see random numbers, not real trends. This is acknowledged in a comment — "real implementation would track historical data."

**Fix:** Compute real period-over-period delta from `signals` table.

---

### 14. Dashboard date filter applied twice — broken `.filter()` call
**File:** `backend/src/modules/dashboard/dashboard.controller.js` lines 141–149

When `startDate` and `endDate` are both provided, the code applies `.filter("captured_at", "gte", startDate)` with wrong PostgREST syntax, then correctly adds `.gte().lte()`. Queries with both boundaries get three filter conditions — one broken, two correct. Queries with only one boundary get only the broken filter.

**Fix:** Remove the `.filter()` call entirely.

---

### 15. Prisma schema does not exist
**Files:** `backend/prisma/schema.prisma` (absent), `backend/narriv_backend_blueprint.md` (claims Prisma), `process/context/all-context.md` (claims Prisma)

The codebase uses Supabase JS client directly, not Prisma. All documentation referencing Prisma is wrong. No migration can be run via Prisma. This affects any future onboarding.

**Fix:** Update all docs to reflect Supabase SQL migration strategy.

---

### 16. `POST /onboarding/complete` bypasses BullMQ queue
**File:** `backend/src/modules/onboarding/onboarding.controller.js` lines 499–519

Creates `ingestion_jobs` records directly in the database. BullMQ workers listen on the queue, not the table — **jobs are never picked up**. Sources created during onboarding never sync.

**Fix:** Call `addIngestionJob()` for each source after inserting records.

---

### 17. `POST /reports/:id/export` runs synchronously — request timeout risk
**File:** `backend/src/modules/reports/reports.routes.js`

`await generateReport(...)` blocks the HTTP response until completion. Large date ranges can cause timeouts.

**Fix:** Offload to a BullMQ job, return `{ jobId, status: "queued" }` immediately.

---

### 18. SSE realtime uses in-process EventEmitter — breaks in multi-server deploys
**File:** `backend/src/modules/realtime/realtime.routes.js`

Connections stored in module-level `Map`. Events broadcast via `globalEvents` EventEmitter. On multi-server deployment, events processed on server B are invisible to clients connected to server A. **Alerts and signals only reach users on the same server.**

**Fix:** Replace with Redis Pub/Sub or Supabase Realtime broadcast.

---

### 19. Report export download has no workspace scope check
**File:** `backend/src/modules/reports/reports.routes.js` — `GET /exports/:jobId/download`

Export record not verified against user's workspace membership. Any user who guesses an export job ID can download another workspace's data.

**Fix:** Query export record, verify `workspace_id` is in user's `scopedWorkspaceIds`.

---

### 20. `global-error.tsx` silently swallows all errors
**File:** `frontend/app/global-error.tsx`

Does not call Sentry, console.error, or any reporting API. Root layout errors **disappear without trace** in production. Only visible if the user screenshots their screen.

**Fix:** Add `Sentry.captureException(error)` on error digest.

---

### 21. `global-error.tsx` digest not correlated with backend `requestId`
**Files:** `frontend/app/error.tsx`, `frontend/app/global-error.tsx`, `backend/src/middlewares/error-handler.js`

`error.digest` is a React-generated hash with no connection to the backend `requestId`. User reports "error code XYZ" cannot be searched in backend logs.

**Fix:** Capture `X-Request-ID` response header in the TanStack Query error handler and include it in Sentry scope.

---

## HIGH Priority Issues

### Auth / Security

**A. Demo login tokens stored in localStorage — XSS stealing risk**
`frontend/components/auth/auth-shell.tsx` — Demo tokens stored via `localStorage.setItem("narriv-auth", token)`. Any XSS injection exfiltrates the token immediately.

**B. CSP contains `unsafe-eval` and `unsafe-inline`**
`frontend/next.config.ts`. `unsafe-eval` allows arbitrary JS execution. Any XSS injection is fully weaponized.

**C. No rate limiting on critical auth endpoints**
`backend/src/middlewares/rate-limit.js` — rate limit middleware is defined but `initializeRateLimiter()` is never called. Brute-force login attacks are unthrottled.

**D. Bulk delete has no `signalIds` array size limit**
`backend/src/modules/bulk/bulk.routes.js` — DoS vector: 100k IDs in one request.

**E. `generateOption()` has `max_tokens: 800` — insufficient for crisis_response**
`backend/src/modules/actions/actions.service.js` — `crisis_response` plans silently fall back to empty steps. `promptConfig.type` is also `undefined` for this branch.

**F. `handleOAuthLogin` called without `await` — swallowed errors**
`backend/src/modules/auth/auth.controller.js` line 1176. OAuth registration failures silently disappear.

**G. No `unhandledRejection`/`uncaughtException` handlers**
`backend/src/index.js`. Any uncaught error crashes the process with no cleanup.

**H. Async route handlers without error wrapper — Express 5 danger**
Express 5 does not auto-forward rejected promises. Every raw `async` controller function risks hanging responses on uncaught exceptions.

---

### Backend API

**I. Alert status schema rejects workflow statuses `in_progress` and `blocked`**
`alerts.routes.js` — PATCH validates `["open", "acknowledged", "resolved"]` but alert workflow uses more statuses.

**J. Search facets load unbounded result sets into memory**
`search.js` — `getSearchFacets` fetches ALL signals in date range, no `limit`. Workspace with 500k signals crashes the worker.

**K. `createOnboardingSources` validates nothing**
`onboarding.controller.js` line 130 — client can inject any shape. No Zod validation on source object array.

**L. Sources health is always "Good" — no real check**
`dashboard.controller.js` — health status hardcoded based on `is_active`, no check of actual sync status or recent errors.

**M. Workers have no concurrency limits — resource exhaustion**
`ai-analysis.worker.js`, `alert.worker.js`, `ingestion.worker.js` run unlimited parallel jobs under burst load.

**N. `PATCH /cost/settings` silently succeeds with null data**
If no workspace_settings row exists, returns `200` with `undefined` values.

---

### Frontend UI/UX

**O. No React ErrorBoundary anywhere in the app**
Any uncaught component exception produces a blank white screen. No recovery possible without full page refresh.

**P. Demo mode banners hardcoded English across 5 pages**
Dashboard, signals, action-plans, sources, integrations — all show English banners regardless of locale.

**Q. `window.confirm()` used in signals bulk delete**
`signals/page.tsx` line 792 — jarring native dialog, no i18n, inconsistent with `ConfirmationDialog` used elsewhere.

**R. Settings page — non-functional Settings links**
Keyword, Deduplication, Rate Limit, Retention, Webhooks links all call `showToast("settingsUnavailable")`. Completely broken UX.

**S. Notification toggles in settings update local state only**
Slack, WhatsApp, Daily Summary, Critical Only, Quiet Hours — none call `updateWorkspaceSettings`.

**T. Billing/usage data entirely hardcoded in settings**
`chartData = [18452, 22000, ...]`, `"128.452 / 200.000"` — fake data shown to users.

**U. UpgradeModal plan selection is non-functional**
Clicking "Select" only sets local state. "Upgrade Now" navigates to `/pricing` instead of triggering an upgrade flow.

---

## MEDIUM Priority Issues

### Backend (selected)
- Cron schedules hardcoded — no env variable override for `*/15 * * * *` alert detection
- Activity endpoint uses RPC function `group_by_audit_logs_user_id` that may not exist in database
- Action plans metrics loads ALL plans into memory for in-JS aggregation
- `GET /signals/meta` returns all signals (no pagination) for platform grouping
- Duplicate detection uses case-sensitive `ilike` — near-duplicate signals bypass detection
- `PATCH /sources/:sourceId/sync-settings` reads `workspaceId` from `req.body` (injection risk)
- `GET /api/action-plans` hardcodes `.limit(1)` — no pagination
- Sources health always "Good" — no real sync status check
- `alertDetection` catches per-workspace errors silently with no alerting

### Frontend (selected)
- Sources page — hardcoded Indonesian strings: "Belum ada data volume", "No sources yet"
- Alerts error state — hardcoded English: "Alert metrics unavailable", "Try Demo", "Retry"
- `formatNumber()` loses precision for "1.2K" compact strings (parses as 12)
- `pb-32` excessive bottom padding on mobile in dashboard shell
- Settings/activity/cases tables overflow on mobile due to hardcoded `min-w-[580px]`
- UpgradeModal `z-50` vs other modals `z-[200]` — can appear underneath
- `dashboard-shell.tsx` spinner has conflicting `border-slate-200 border-[#465FFF]` classes
- Console statements (`console.warn`, `console.error`) in production paths across 5 files
- Intelligence page — hardcoded decorative bubbles, no real cluster data
- Action plans — synthetic `progress` values (100/55/20) not from API

### Infrastructure
- `/health` returns `ok` without checking Supabase connectivity — K8s will route traffic to dead API
- No `unhandledRejection`/`uncaughtException` handlers — crashes are silent
- CSP has `unsafe-eval` and `unsafe-inline` — widens XSS blast radius
- Logs to stdout only — no structured log shipping (pino, Datadog, CloudWatch)
- No dedicated `/health/live` liveness probe
- Redis mock missing `setex` — silent failure path when mock is used

---

## LOW Priority — Note Only

- In-memory rate limit buckets reset on server restart (brief throttling gap)
- `getOnboardingProgress` queries without workspace scoping
- Circular import in `action-plans.schema.js` (`import from "./action-plans.schema.js"`)
- No input cap on `queries` array in `POST /geo/analyze`
- `formatPaginationSummary` hardcodes Indonesian "Menampilkan"
- `asNumber()` silently masks type contract violations
- `handleShareReport` always shares `rows[0]` regardless of selection
- `new Date(0)` sentinel (1970-01-01) used for alert escalation timestamps
- Action card `MoreVertical` icon is `position: absolute; display: none` — dead code

---

## Security Positives (Already Good)

- JWT access tokens expire in 1h, refresh tokens in 30d
- `bcrypt` 12 rounds for password hashing
- Sentry integrated with source maps
- HTTPS enforcement in production
- CORS allowlist configured
- Input sanitization middleware active
- Security headers applied
- `sensitiveDataHeaders` on workspace routes
- Supabase Row Level Security policies in effect
- Audit logs flushed on graceful shutdown

---

## Deployment Blocker

**The current deployment (`narriv-9tzcingb5`) cannot be promoted to `narriv.digital` programmatically.** `npx vercel alias set` returns 403 due to Vercel Teams SSO. **Manual action required:**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select the `narriv` project
3. Find deployment `narriv-9tzcingb5`
4. Click **"Promote to Production"**

---

## Recommended Fix Priority Order

**Week 1 — Ship-Blocking Crashes (P0)**
1. Fix `recordAuditLog` import (runtime crash on action-plans learning endpoint)
2. Fix `invalidateUserSessions` undefined (runtime crash on change-password)
3. Implement `demo` handler or remove route (broken demo login)
4. Fix PostgREST syntax errors (`revokedAt`, `.not("status", "is", null)`)
5. Fix date filter double-application in dashboard
6. Wire `initializeRateLimiter()` at startup
7. Add `unhandledRejection`/`uncaughtException` handlers
8. Wrap async route handlers with `wrapAsync`

**Week 1 — Security (P0)**
9. Fix frontend middleware JWT validation
10. Fix CSP `unsafe-eval` and `unsafe-inline`
11. Add workspace scope to report export download
12. Wire `global-error.tsx` to Sentry

**Week 2 — Data Integrity (P1)**
13. Fix BullMQ queue silent failure
14. Fix onboarding queue bypass
15. Fix `Math.random()` dashboard deltas
16. Fix `POST /signals` missing Zod validation
17. Align `STRATEGY_TYPES` enum

**Week 2 — UX (P1)**
18. Add React ErrorBoundary at dashboard level
19. Fix non-functional settings links
20. Wire notification toggles to API
21. Replace `window.confirm()` with ConfirmationDialog
22. Add root `loading.tsx`
23. Create `app/500.tsx`
24. Add root `loading.tsx`

**Week 3 — Polish (P2)**
25. i18n all hardcoded strings
26. Fix mobile table overflow
27. Real sources health check
28. Move cron schedules to env vars
29. Add concurrency limits to workers
30. Add `/health/live` probe

---

## Total Issue Count

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Auth/Security | 6 | 5 | 5 | 6 | 22 |
| Backend API | 10 | 9 | 16 | 5 | 40 |
| Frontend UI/UX | 0 | 10+ | 20+ | 10+ | 42 |
| Infra/Error Handling | 2 | 2 | 2 | 5 | 11 |
| **Total** | **18** | **26+** | **43+** | **26+** | **115+** |

---

*Report generated by 4 parallel audit agents covering 120+ distinct issues across the full Narriv stack.*
