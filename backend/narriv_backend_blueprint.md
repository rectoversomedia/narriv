# 🔧 Narriv Backend — Development Blueprint

> **Dokumen ini adalah panduan lengkap untuk development backend Narriv.**
> Digunakan sebagai referensi oleh AI agents dan developer untuk memahami arsitektur, API contracts, database schema, dan status pengembangan.
> AI agent wajib memperbarui checklist di bagian Development Tracker: centang `[x]` setiap tugas yang sudah selesai agar progres development tetap ter-track.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema (Prisma)](#4-database-schema-prisma)
5. [API Route Map](#5-api-route-map)
6. [Module Inventory](#6-module-inventory)
7. [Background Workers](#7-background-workers)
8. [Frontend-Backend Contract Table](#8-frontend-backend-contract-table)
9. [Current State Assessment](#9-current-state-assessment)
10. [Development Tracker](#10-development-tracker)

---

## 1. Project Overview

**Narriv** adalah platform *Narrative Intelligence & Operational Response*. Backend berfungsi sebagai API server, data processing pipeline, dan AI analysis engine.

**Backend Path**: `c:\MyProject\narriv\backend`
**Runtime**: Node.js (ESM)
**Port**: `localhost:3000`
**Frontend**: `localhost:3001`

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js (ESM modules) | `"type": "module"` |
| Framework | Express.js v5 | REST API |
| Database | PostgreSQL | Via Prisma ORM |
| ORM | Prisma v5.22 | Schema-first, migrations |
| Queue | BullMQ | Redis-backed job queue |
| Cache/Queue Backend | Redis (ioredis) | For BullMQ |
| AI Provider | OpenAI (GPT) | Signal analysis, action generation |
| Data Collection | Apify | Web scraping actors |
| Auth | JWT + bcrypt | Access + refresh tokens |
| Validation | Zod | Request body validation |
| Logging | Custom structured logger | Request IDs, latency tracking |
| Environment | dotenv | `.env` configuration |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Express.js Server                       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │   Auth    │  │ Signals  │  │  Alerts  │  │  Dashboard │  │
│  │  Module   │  │  Module  │  │  Module  │  │   Module   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Sources  │  │Ingestion │  │Narratives│  │  Visibility│  │
│  │  Module   │  │  Module  │  │  Module  │  │   (Geo)    │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Actions  │  │  Action  │  │ Reports  │  │  Feedback  │  │
│  │ (AI Gen) │  │  Plans   │  │ + Export │  │   Module   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌──────────┐  ┌──────────────────────────────────────────┐ │
│  │Workspace │  │           Middleware Layer                │ │
│  │ Settings │  │  verifyToken │ validateRequest │ logger  │ │
│  └──────────┘  └──────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────────┐
              │             │                 │
    ┌─────────▼──────┐ ┌───▼────────┐ ┌──────▼────────┐
    │   PostgreSQL   │ │   Redis    │ │   OpenAI API  │
    │   (Prisma)     │ │  (BullMQ)  │ │   (GPT-4)     │
    └────────────────┘ └────────────┘ └───────────────┘
              │
    ┌─────────▼──────────────────────────────────┐
    │           Background Workers                │
    │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
    │  │Ingestion │ │AI Analysis│ │   Alert    │  │
    │  │ Worker   │ │  Worker   │ │  Worker    │  │
    │  └──────────┘ └──────────┘ └────────────┘  │
    │  ┌──────────────────────────────────────┐   │
    │  │       Notification Worker            │   │
    │  └──────────────────────────────────────┘   │
    └─────────────────────────────────────────────┘
```

---

## 4. Database Schema (Prisma)

### 4.1 Model Summary

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| **User** | User accounts | → WorkspaceMember, RefreshToken, AuditLog |
| **Workspace** | Tenant isolation | → Members, Settings, Sources, Signals, Alerts, etc. |
| **WorkspaceSettings** | Workspace config | → Workspace (1:1) |
| **WorkspaceNotificationSettings** | Alert channels | → Workspace (1:1) |
| **WorkspaceMember** | User-workspace RBAC | → User, Workspace (unique per user+workspace) |
| **Source** | Data collection sources | → Workspace, IngestionJob, RawDocument |
| **IngestionJob** | Collection job tracking | → Workspace, Source |
| **RawDocument** | Raw collected data | → Workspace, Source, Signal |
| **Signal** | Processed intelligence signals | → Workspace, RawDocument, SignalAnalysis, NarrativeClusterSignal |
| **SignalAnalysis** | AI analysis of signals | → Signal |
| **Alert** | Predictive/risk alerts | → Workspace, ActionPlan |
| **NarrativeCluster** | Topic clustering | → Workspace, ActionPlan, NarrativeClusterSignal |
| **NarrativeClusterSignal** | Cluster-Signal join | → NarrativeCluster, Signal |
| **Report** | Generated reports | → Workspace, ReportExport |
| **ReportExport** | Export job tracking | → Report |
| **ActionPlan** | AI-generated action plans | → Workspace, Alert, NarrativeCluster, GeneratedAsset |
| **GeneratedAsset** | AI-generated content assets | → Workspace, ActionPlan |
| **AIVisibilityResult** | AI platform visibility data | → Workspace, PromptTestRun |
| **PromptTestRun** | AI prompt test results | → Workspace, AIVisibilityResult |
| **AIFeedback** | User feedback on AI outputs | → Workspace |
| **AIAnalysisFailureLog** | AI failure tracking | → Workspace, Signal |
| **RefreshToken** | JWT refresh tokens | → User |
| **AuditLog** | Security audit trail | → User |

### 4.2 Enums

| Enum | Values |
|------|--------|
| `ImpactLevel` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `EscalationLevel` | `low`, `medium`, `high`, `critical` |

### 4.3 Key Relationships

```
User ──1:N──▶ WorkspaceMember ◀──N:1── Workspace
Workspace ──1:N──▶ Source ──1:N──▶ IngestionJob
Source ──1:N──▶ RawDocument ──1:N──▶ Signal
Signal ──1:N──▶ SignalAnalysis
Signal ──M:N──▶ NarrativeCluster (via NarrativeClusterSignal)
Alert ──1:N──▶ ActionPlan
NarrativeCluster ──1:N──▶ ActionPlan
ActionPlan ──1:N──▶ GeneratedAsset
AIVisibilityResult ──1:N──▶ PromptTestRun
Report ──1:N──▶ ReportExport
```

---

## 5. API Route Map

### 5.1 Public Routes

| Method | Path | Module | Purpose |
|--------|------|--------|---------|
| `GET` | `/` | Core | Health check message |
| `GET` | `/health` | Core | Basic health (`{ status: "ok" }`) |
| `GET` | `/health/runtime` | Core | Deep health (DB, queue, OpenAI) |
| `GET` | `/metrics` | Core | Performance metrics snapshot |

### 5.2 Auth Routes (`/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/login` | ❌ | Login with email/password |
| `POST` | `/auth/register` | ❌ | Create new account |
| `GET` | `/auth/me` | ✅ | Get current user info |
| `POST` | `/auth/logout` | ❌ | Revoke refresh token from request body |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `POST` | `/auth/change-password` | ✅ | Update password |

### 5.3 Protected API Routes

| Method | Path | Module | Purpose |
|--------|------|--------|---------|
| `GET` | `/api/dashboard/summary` | Dashboard | Aggregated KPIs and trends |
| `GET` | `/signals` | Signals | List signals (paginated) |
| `POST` | `/signals` | Signals | Create signal |
| `GET` | `/signals/:id` | Signals | Signal detail + analysis |
| `POST` | `/signals/:id/analyze` | Signals | Trigger AI analysis |
| `POST` | `/ai/analyze` | AI | Analyze ad-hoc title/content using OpenAI |
| `GET` | `/sources` | Sources | List data sources |
| `POST` | `/sources` | Sources | Create new source |
| `PATCH` | `/sources/:sourceId` | Sources | Update source |
| `DELETE` | `/sources/:sourceId` | Sources | Soft-delete source |
| `POST` | `/ingestion/run/:sourceId` | Ingestion | Trigger data collection |
| `GET` | `/ingestion/status/:jobId` | Ingestion | Check ingestion job status |
| `POST` | `/ingestion/cancel/:jobId` | Ingestion | Cancel ingestion job |
| `GET` | `/api/alerts` | Alerts | List alerts (paginated, filtered) |
| `GET` | `/api/alerts/:id` | Alerts | Alert detail |
| `PATCH` | `/api/alerts/:id/status` | Alerts | Update alert status |
| `PATCH` | `/api/alerts/:id/assign` | Alerts | Assign alert to PIC/team |
| `GET` | `/api/narratives` | Narratives | List narrative clusters |
| `GET` | `/api/narratives/:id` | Narratives | Narrative cluster detail |
| `GET` | `/api/visibility` | Visibility | AI visibility data + prompts |
| `GET` | `/api/visibility/summary` | Visibility | Latest visibility summary per engine |
| `GET` | `/api/visibility/trends` | Visibility | Historical visibility trends |
| `POST` | `/api/reports` | Reports | Generate a new report |
| `GET` | `/api/reports` | Reports | List reports |
| `GET` | `/api/reports/:id` | Reports | Full report detail |
| `POST` | `/api/reports/:id/export` | Reports | Create export job |
| `GET` | `/api/reports/exports/:jobId` | Reports | Export job status + download |
| `GET` | `/api/reports/exports/:jobId/download` | Reports | Signed export download endpoint |
| `GET` | `/api/reports/:id/export/json` | Reports | Direct JSON export |
| `GET` | `/api/reports/:id/export/pdf` | Reports | PDF-ready structured export data |
| `POST` | `/api/actions` | Actions | Generate AI action plan |
| `GET` | `/api/actions` | Actions | List generated actions (paginated) |
| `GET` | `/api/actions/:id` | Actions | Full generated action plan detail |
| `GET` | `/api/action-plans` | Action Plans | Get latest action plan detail |
| `PATCH` | `/api/action-plans/:id/assign` | Action Plans | Assign action plan |
| `POST` | `/api/action-plans/:id/feedback` | Feedback | Submit AI feedback |
| `POST` | `/api/feedback` | Feedback | Submit generic AI feedback |
| `GET` | `/api/feedback/accuracy` | Feedback | AI accuracy metrics |
| `GET` | `/api/feedback/rejections` | Feedback | Rejection insights |
| `GET` | `/api/feedback/prompt-scoring` | Feedback | Feedback-derived prompt scoring |
| `GET` | `/api/workspace/settings` | Workspace | Get workspace settings |
| `PATCH` | `/api/workspace/settings` | Workspace | Update workspace settings |
| `GET` | `/api/workspace/members` | Workspace | List workspace members |
| `POST` | `/api/workspace/members` | Workspace | Add member |
| `DELETE` | `/api/workspace/members/:id` | Workspace | Remove member |
| `DELETE` | `/api/workspace` | Workspace | Delete workspace |

---

## 6. Module Inventory

### 6.1 Module Files

| Module | Directory | Files |
|--------|-----------|-------|
| Auth | `src/modules/auth/` | `auth.routes.js`, `auth.controller.js`, `auth.service.js` |
| Signals | `src/modules/signals/` | `signals.routes.js`, `signals.controller.js`, `signals.service.js` |
| Sources | `src/modules/sources/` | `sources.routes.js`, `sources.controller.js` |
| Ingestion | `src/modules/ingestion/` | `ingestion.routes.js`, `ingestion.controller.js` |
| AI | `src/modules/ai/` | `ai.routes.js`, `ai.service.js` |
| Dashboard | `src/modules/dashboard/` | `dashboard.routes.js`, `dashboard.controller.js` |
| Alerts | `src/modules/alerts/` | `alerts.routes.js`, `alerts.controller.js`, `alerts.service.js` |
| Narratives | `src/modules/narratives/` | `narratives.routes.js`, `narratives.controller.js` |
| Visibility/Geo | `src/modules/geo/` | `geo.routes.js`, `geo.controller.js` |
| Reports | `src/modules/reports/` | `reports.routes.js`, `reports.controller.js` |
| Actions | `src/modules/actions/` | `actions.routes.js`, `actions.controller.js` |
| Action Plans | `src/modules/action-plans/` | `action-plans.routes.js`, `action-plans.controller.js` |
| Feedback | `src/modules/feedback/` | `feedback.routes.js`, `feedback.controller.js` |
| Workspace Settings | `src/modules/workspace-settings/` | `workspace-settings.routes.js`, `workspace-settings.controller.js` |
| Clustering | `src/modules/clustering/` | Narrative clustering logic |
| Notifications | `src/modules/notifications/` | Notification dispatch |
| Apify | `src/modules/apify/` | Apify actor integration |

### 6.2 Library Files (`src/lib/`)

| File | Purpose |
|------|---------|
| `api-error.js` | Structured API error class |
| `logger.js` | Request logger middleware + structured logging |
| `metrics.js` | Endpoint latency and error metrics |
| `queue.js` | BullMQ queue setup + scheduled jobs |
| `redis.js` | Redis connection |
| `runtime-health.js` | Deep health check (DB, Redis, OpenAI) |
| `workspace-access.js` | Workspace membership verification |

### 6.3 Middleware (`src/middlewares/`)

| File | Purpose |
|------|---------|
| `auth.middleware.js` | JWT verification (`verifyToken`) |
| `validate-request.js` | Zod schema validation wrapper |

---

## 7. Background Workers

| Worker | File | Queue | Purpose |
|--------|------|-------|---------|
| **Ingestion Worker** | `ingestion.worker.js` (19KB) | `ingestion` | Runs Apify actors, processes raw documents → signals |
| **AI Analysis Worker** | `ai-analysis.worker.js` (5KB) | `ai-analysis` | Sends signals to OpenAI for sentiment/impact analysis |
| **Alert Worker** | `alert.worker.js` (3KB) | `alert-detection` | Detects anomalies from signals → creates alerts |
| **Notification Worker** | `notification.worker.js` (2KB) | `notifications` | Dispatches alert notifications (email, WhatsApp) |

### Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `scheduleAlertDetection()` | Recurring | Periodic anomaly detection across signals |
| `scheduleAlertEscalation()` | Recurring | Auto-escalate stale high-risk alerts |

---

## 8. Frontend-Backend Contract Table

> This maps each frontend page to intended backend endpoints. Current dashboard pages mostly do not call these endpoints yet; the endpoints exist for the mock/static → API migration.

| Frontend Page | Intended Endpoints | Current Frontend Usage |
|---|---|---|
| **Login** (`/login`) | `POST /auth/login` | Direct `fetch`; demo login bypass also exists |
| **Signup** (`/signup`) | `POST /auth/register` | Direct `fetch` |
| **Dashboard Home** (`/`) | `GET /api/dashboard/summary` | Static/mock data; not wired |
| **Signals** (`/signals`) | `GET /signals` | Static/inline data; not wired |
| **Alerts** (`/alerts`) | `GET /api/alerts`, `PATCH /api/alerts/:id/status` | Static/inline data; not wired |
| **Alert Detail** (`/alerts/[id]`) | `GET /api/alerts/:id` | `mock-data.ts`; not wired |
| **Visibility** (`/visibility`) | `GET /api/visibility`, optionally `/summary`, `/trends` | Static/inline data; not wired |
| **Intelligence** (`/intelligence`) | `GET /api/narratives`, `GET /api/narratives/:id` | Static/inline data; not wired |
| **Reports** (`/reports`) | `GET /api/reports`, `POST /api/reports/:id/export` | Static/inline data; not wired |
| **Action Plans** (`/action-plans`) | `GET /api/action-plans`, `GET/POST /api/actions`, `POST /api/action-plans/:id/feedback` | Static/inline data; not wired |
| **Sources** (`/workspace/sources`) | `GET/POST/PATCH/DELETE /sources`, ingestion endpoints | Static/inline data; not wired |
| **Settings** (`/workspace/settings`, `/settings`) | `GET/PATCH /api/workspace/settings`, `GET/POST/DELETE /api/workspace/members`, `POST /auth/change-password` | Local state; not wired |
| **Activity** (`/workspace/activity`) | No endpoint | No frontend route exists |
| **Cases** (`/workspace/cases`) | No endpoint | No frontend route exists |
| **Integrations** (`/workspace/integrations`) | No endpoint | No frontend route exists |
| **Onboarding** (`/onboarding`) | No endpoint | UI-only |

---

## 9. Current State Assessment

### ✅ Completed Backend Infrastructure
- Express.js server with modular route architecture
- Prisma schema with 20+ models and comprehensive indexes
- JWT auth with access + refresh tokens, bcrypt hashing
- Workspace-scoped multi-tenancy
- BullMQ background workers for ingestion, AI analysis, alerts, notifications
- Zod request validation middleware
- Structured logging with request IDs
- Runtime health checks (DB, Redis, OpenAI)
- Metrics tracking for latency and errors
- CORS configuration for local and Vercel domains

### ✅ Completed API Endpoints
Most frontend-facing backend contracts are implemented and returning data. See the [API Route Map](#5-api-route-map) for the full list. Important distinction: the frontend dashboard pages currently do not consume most of these endpoints yet.

### ⚠️ Known Issues & Gaps

1. **Missing Endpoints**:
   - No API for workspace activity/audit log listing
   - No API for cases management
   - No API for integrations/OAuth
   - No API for onboarding wizard steps
   - No API for logo/file upload
   - No dedicated notification-settings endpoint, despite `WorkspaceNotificationSettings` existing in Prisma

2. **Testing Gaps**:
   - Integration tests not written for most endpoints
   - Auth flow (register → login → refresh → logout) not tested end-to-end
   - Worker failure scenarios not tested

3. **Security Gaps**:
   - Rate limiting not applied to AI generation, export, ingestion endpoints
   - CORS production allowlist needs review
   - Audit logging exists for alert/action-plan assignment and escalation changes, but is not comprehensive across all mutations

4. **Contract Gaps**:
   - `GET /api/reports` returns `{ data, pagination }`; frontend `getReports()` currently expects `{ reports }`
   - List endpoints are inconsistent: some return `pagination`, while `/api/actions` returns `meta`
   - `/auth/logout` is public and revokes by refresh token body, so docs and clients should not treat it as bearer-token protected

5. **Production Gaps**:
   - Database migration baseline not done for existing databases
   - API error response format not fully normalized
   - Apify actor IDs and configs not documented for production

---

## 10. Development Tracker

> **Tracking rule for AI agents**: setelah menyelesaikan task backend apa pun yang tercantum di bawah, update file ini dan ubah checkbox dari `[ ]` menjadi `[x]`. Jika scope task berubah, tambahkan catatan singkat agar developer berikutnya memahami status terakhir.

### Phase 1: Production Hardening (Critical — Before Launch)

> [!CAUTION]
> These items MUST be completed before production deployment.

#### Database & Migrations
- [ ] Baseline existing local/staging/production databases
- [ ] Run `npx prisma migrate deploy` successfully against clean and baselined databases
- [ ] Verify all indexes are applied in production
- [ ] Test database connection pooling under load

Migration safety notes:
- Use `npx prisma migrate deploy` in production/CI, not `migrate dev`.
- For an existing database without matching `_prisma_migrations` history, validate schema parity first, then mark already-present migrations with `npx prisma migrate resolve --applied <migration_id>`.
- Known historical migration IDs from the deleted runbook were: `20260416083925_init`, `20260417132744_init`, `20260428033223_init`, `20260509050000_production_database_hardening`.
- Never baseline blindly. Only mark migrations as applied when their SQL effects already exist in the target database.
- Pre-flight: verify `DATABASE_URL`, run backend DB connectivity checks where available, review `npx prisma migrate status`, and create a backup/snapshot.
- Post-deploy: run `npx prisma migrate status`, verify `GET /health` and `GET /health/runtime`, then smoke-test critical APIs and workers.
- Rollback strategy is operational: restore DB snapshot/backup and redeploy the previous app version if needed.

#### Security
- [ ] Add rate limits to: `POST /api/actions`, `POST /api/reports/:id/export`, `POST /ingestion/run/:sourceId`, `POST /api/feedback`
- [ ] Review and finalize CORS production allowlist (replace broad preview settings)
- [ ] Add HTTPS enforcement in production
- [ ] Audit all `verifyToken` usage — ensure no unprotected endpoints leak data
- [ ] Add request body size limits for all POST/PATCH endpoints
- [ ] Add SQL injection protection review (Prisma handles most, verify raw queries)

Optional RLS notes:
- Current recommended tenant isolation remains API-layer workspace scoping.
- PostgreSQL RLS is optional and should remain disabled unless direct DB access by clients/services is introduced.
- Example non-active SQL lives in `prisma/optional_migration_examples/rls/001_enable_rls_example.sql` and `prisma/optional_migration_examples/rls/002_disable_rls_rollback_example.sql`.
- If RLS is adopted later, test in staging first and set a request/transaction workspace context such as `app.current_workspace_id` with `set_config(...)` before relying on policies.
- Keep rollback SQL ready before enabling RLS table-by-table.

#### Error Handling
- [ ] Normalize all API error responses to: `{ error: string, code?: string, details?: object }`
- [ ] Ensure all routes return proper HTTP status codes (400, 401, 403, 404, 500)
- [ ] Add global error handler middleware for unhandled exceptions
- [ ] Add request timeout middleware (30s default, 60s for AI generation)

#### Observability
- [ ] Add structured error logging for all catch blocks
- [ ] Add alert detection failure logging with workspace context
- [ ] Add ingestion worker metrics (jobs/min, success rate, avg duration)
- [ ] Add AI analysis metrics (tokens used, latency, failure rate)
- [ ] Configure log rotation or external log shipping

---

### Phase 2: Missing Endpoints (High Priority)

> [!IMPORTANT]
> These endpoints are needed by the frontend but don't exist yet.

#### Activity / Audit Log API
- [ ] Implement `GET /api/workspace/activity` — List audit log entries for workspace
- [ ] Support filters: `eventType`, `userId`, `dateFrom`, `dateTo`
- [ ] Support pagination: `page`, `limit`
- [ ] Return: `{ data: AuditLog[], meta: { page, limit, total } }`
- [ ] Acceptance: frontend creates `/workspace/activity` and renders real audit events

#### Cases API
- [ ] Design case data model (or extend Alert/ActionPlan for case tracking)
- [ ] Implement `GET /api/workspace/cases` — List tracked cases
- [ ] Implement `POST /api/workspace/cases` — Create case from alert/cluster
- [ ] Implement `PATCH /api/workspace/cases/:id` — Update case status
- [ ] Acceptance: frontend creates `/workspace/cases` and renders real case data

#### Integrations API
- [ ] Design integration model (platform, credentials, status)
- [ ] Implement `GET /api/workspace/integrations` — List integrations
- [ ] Implement `POST /api/workspace/integrations` — Connect integration
- [ ] Implement `DELETE /api/workspace/integrations/:id` — Disconnect
- [ ] Consider OAuth flow for Slack, Teams, etc.
- [ ] Acceptance: frontend creates `/workspace/integrations` and shows real connection status

#### Onboarding API
- [ ] Implement `POST /api/onboarding/workspace` — Create workspace with initial settings
- [ ] Implement `POST /api/onboarding/sources` — Bulk-create initial data sources
- [ ] Implement `POST /api/onboarding/notifications` — Set notification preferences
- [ ] Implement `POST /api/onboarding/team` — Invite initial team members
- [ ] Acceptance: Onboarding wizard saves data to backend

#### File Upload API
- [ ] Implement `POST /api/workspace/logo` — Upload workspace logo
- [ ] Add file validation (type, size limits)
- [ ] Store in cloud storage (S3, Supabase Storage, or Cloudflare R2)
- [ ] Return: `{ url: string }` for the uploaded logo
- [ ] Acceptance: Settings page logo upload works end-to-end

#### Notification Settings API
- [ ] Implement `GET /api/workspace/notification-settings` — Get notification preferences
- [ ] Implement `PATCH /api/workspace/notification-settings` — Update preferences
- [ ] Return: `{ emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications }`
- [ ] Acceptance: Settings page notification toggles persist

---

### Phase 3: AI & ML Pipeline (High Priority)

> [!NOTE]
> These improve the AI-powered features that differentiate Narriv.

#### Signal Analysis Quality
- [ ] Review OpenAI prompt templates for signal analysis
- [ ] Add confidence score calibration based on feedback data
- [ ] Implement batch analysis for efficiency (analyze multiple signals per request)
- [ ] Add analysis caching to avoid re-analyzing unchanged signals
- [ ] Track token usage and cost per workspace

#### Narrative Clustering
- [ ] Implement automated cluster detection from signal patterns
- [ ] Add cluster merging for overlapping topics
- [ ] Add cluster lifecycle management (emerging → active → declining → archived)
- [ ] Add cluster velocity calculation (growth rate over time windows)
- [ ] Implement cluster comparison across time periods

#### AI Visibility Engine
- [ ] Implement automated prompt testing against AI platforms
- [ ] Schedule periodic visibility scans
- [ ] Track visibility score trends over time
- [ ] Add competitor mention tracking
- [ ] Implement AI response sentiment analysis

#### Action Generation
- [ ] Add new strategy types beyond the current 4 (PR, Content, Influencer, Crisis)
- [ ] Implement multi-step action plan generation
- [ ] Add action plan templates based on industry
- [ ] Use feedback data to improve generation quality
- [ ] Add action plan cost/effort estimation

---

### Phase 4: Data Pipeline (Medium Priority)

#### Ingestion Improvements
- [ ] Document all Apify actor IDs and input schemas for production
- [ ] Add source health monitoring (auto-detect failing sources)
- [ ] Implement incremental ingestion (only fetch new data)
- [ ] Add data deduplication quality checks
- [ ] Add source coverage metrics (how much of the target is covered)
- [ ] Support custom RSS/webhook sources beyond Apify

#### Report Generation
- [ ] Implement actual PDF report generation (not just JSON export)
- [ ] Add report templates (Executive Brief, Risk Review, Visibility Report)
- [ ] Add scheduled report generation (daily, weekly)
- [ ] Implement report email delivery
- [ ] Add report customization (sections, date range, branding)

---

### Phase 5: Infrastructure (Before Scale)

#### Performance
- [ ] Add Redis caching for frequently accessed endpoints (dashboard summary, visibility)
- [ ] Implement database connection pooling optimization
- [ ] Add API response compression (gzip)
- [ ] Optimize heavy queries with materialized views or pre-aggregation
- [ ] Add query performance monitoring

#### Real-time Features
- [ ] Implement WebSocket server for live signal/alert updates
- [ ] Add Server-Sent Events (SSE) as a lighter alternative
- [ ] Implement real-time notification push (not just job-based)
- [ ] Add live dashboard KPI updates

#### Deployment
- [ ] Containerize with Docker (Dockerfile + docker-compose)
- [ ] Configure environment-specific settings (dev, staging, production)
- [ ] Set up health check for container orchestration
- [ ] Configure database backup schedule
- [ ] Set up Redis persistence or managed Redis
- [ ] Configure auto-scaling rules for workers

---

### Phase 6: Testing (Ongoing)

> [!WARNING]
> No integration tests exist yet. This is a significant risk for production.

#### Auth Tests
- [ ] Test register → login → me → refresh → logout flow
- [ ] Test expired access token returns `401`
- [ ] Test invalid JWT signature returns `401`
- [ ] Test refresh token rotation works correctly
- [ ] Test account lockout after failed login attempts
- [ ] Test password change flow
- [ ] Test workspace scoping (user A can't see workspace B data)

#### CRUD Tests
- [ ] Test source CRUD lifecycle (create → read → update → soft-delete)
- [ ] Test ingestion job creation and status tracking
- [ ] Test alert CRUD (list → detail → status update → assignment)
- [ ] Test action plan generation and feedback submission
- [ ] Test report creation and export job lifecycle
- [ ] Test workspace settings CRUD
- [ ] Test workspace member management

#### Worker Tests
- [ ] Test ingestion worker with mock Apify responses
- [ ] Test AI analysis worker with mock OpenAI responses
- [ ] Test alert detection worker with various signal patterns
- [ ] Test notification worker dispatch for each channel
- [ ] Test worker failure recovery and retry behavior

#### Load Tests
- [ ] Test API under concurrent load (100+ requests/second)
- [ ] Test database performance with 100K+ signals
- [ ] Test queue processing under high job volume
- [ ] Test memory usage during large ingestion jobs

---

## Appendix: Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Access token signing secret |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret |
| `OPENAI_API_KEY` | ⚠️ | Required for AI features |
| `REDIS_URL` | ⚠️ | Required for BullMQ workers |
| `APIFY_TOKEN` | ⚠️ | Required for data ingestion |
| `PORT` | ❌ | Server port (default: 3000) |
| `NODE_ENV` | ❌ | Environment (development/production) |
| `CORS_ORIGINS` | ❌ | Comma-separated allowed origins |
| `LOG_LEVEL` | ❌ | Logging verbosity |

---

## Appendix: Seed Data

The file `prisma/seed.js` (9.6KB) provides demo data for local development:
- Demo user account
- Demo workspace
- Sample sources, signals, alerts
- Sample reports, action plans
- Sample AI visibility results and prompt test runs

Run seed: `npm run seed` (`node prisma/seed.js`)
