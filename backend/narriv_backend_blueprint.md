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
| Email Delivery | Resend | Transactional emails (password reset, reports) |
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
| **ReportTemplate** | Custom report templates | → Workspace |
| **ReportSchedule** | Recurring report schedules | → Workspace |
| **ActionPlan** | AI-generated action plans | → Workspace, Alert, NarrativeCluster, GeneratedAsset |
| **GeneratedAsset** | AI-generated content assets | → Workspace, ActionPlan |
| **AIVisibilityResult** | AI platform visibility data | → Workspace, PromptTestRun |
| **PromptTestRun** | AI prompt test results | → Workspace, AIVisibilityResult |
| **AIFeedback** | User feedback on AI outputs | → Workspace |
| **AIAnalysisFailureLog** | AI failure tracking | → Workspace, Signal |
| **RefreshToken** | JWT refresh tokens | → User |
| **AppNotification** | In-app real-time notifications | → Workspace, User |
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
| `GET` | `/metrics` | Core | Performance metrics snapshot (protected) |

### 5.2 Auth Routes (`/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/login` | ❌ | Login with email/password |
| `POST` | `/auth/register` | ❌ | Create new account |
| `GET` | `/auth/me` | ✅ | Get current user info |
| `POST` | `/auth/logout` | ❌ | Revoke refresh token from request body |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `POST` | `/auth/forgot-password` | ❌ | Generate password reset code for registered email |
| `POST` | `/auth/verify-reset-code` | ❌ | Verify 6-digit reset code and issue reset token |
| `POST` | `/auth/reset-password` | ❌ | Set new password using verified reset token |
| `POST` | `/auth/verify-email` | ❌ | Verify 6-digit email registration code |
| `POST` | `/auth/resend-verification` | ❌ | Resend 6-digit email registration code |
| `GET` | `/auth/google` | ❌ | Initiate Google OAuth2 flow |
| `GET` | `/auth/google/callback` | ❌ | Handle Google OAuth2 callback |
| `POST` | `/auth/oauth/exchange` | ❌ | Exchange durable one-time OAuth callback code for session tokens |
| `POST` | `/auth/change-password` | ✅ | Update password |

### 5.3 Protected API Routes

| Method | Path | Module | Purpose |
|--------|------|--------|---------|
| `GET` | `/api/dashboard/summary` | Dashboard | Aggregated KPIs, trends, live global activity map data from `Signal.region`, topics, source health, and system status |
| `GET` | `/signals` | Signals | List workspace-scoped signals with pagination, keyword/platform/date/sentiment filters, newest-first ordering, and limit capped at 100 |
| `GET` | `/signals/meta` | Signals | Signal metadata for sidebar (follow-ups, recommendations, timeline, sources, queue) |
| `POST` | `/signals` | Signals | Create signal |
| `GET` | `/signals/:id` | Signals | Signal detail + analysis |
| `POST` | `/signals/:id/analyze` | Signals | Trigger AI analysis |
| `POST` | `/signals/batch-analyze` | Signals | Batch AI analysis (up to 20 signals) |
| `GET` | `/api/narratives/compare` | Narratives | Compare clusters across two time periods |
| `POST` | `/ai/analyze` | AI | Analyze ad-hoc title/content using OpenAI |
| `GET` | `/sources` | Sources | List data sources |
| `POST` | `/sources` | Sources | Create new source |
| `GET` | `/sources/presets` | Sources | List Apify actor presets and blog/news web-scraper sources from `apify-actor.md` |
| `POST` | `/sources/bootstrap-defaults` | Sources | Create default Apify actor source presets for a workspace |
| `PATCH` | `/sources/:sourceId` | Sources | Update source |
| `DELETE` | `/sources/:sourceId` | Sources | Soft-delete source |
| `GET` | `/sources/health` | Sources | Get source health status |
| `GET` | `/sources/coverage` | Sources | Get source coverage metrics |
| `POST` | `/ingestion/run` | Ingestion | Batch-trigger data collection for active, non-deleted sources |
| `POST` | `/ingestion/run/:sourceId` | Ingestion | Trigger data collection |
| `GET` | `/ingestion/status/:jobId` | Ingestion | Check ingestion job status |
| `POST` | `/ingestion/cancel/:jobId` | Ingestion | Cancel ingestion job |
| `POST` | `/ingestion/webhook/:sourceId` | Ingestion | Receive webhook payload |
| `GET` | `/api/alerts` | Alerts | List alerts with workspace scope, pagination, type/severity/status filters, server-side text search, and limit capped at 100 |
| `GET` | `/api/alerts/summary` | Alerts | Aggregate metrics: total, by_severity, by_status, by_type, 7-day trend delta, 24h timeline labels/data, acknowledged/resolved/escalated/overdue counts, acknowledgment/delivery rates, average response time, and SLA target minutes |
| `GET` | `/api/alerts/:id` | Alerts | Alert detail |
| `PATCH` | `/api/alerts/:id/status` | Alerts | Update alert status |
| `PATCH` | `/api/alerts/:id/assign` | Alerts | Assign alert to PIC/team |
| `GET` | `/api/narratives` | Narratives | List narrative clusters |
| `GET` | `/api/narratives/:id` | Narratives | Narrative cluster detail |
| `GET` | `/api/visibility` | Visibility | AI visibility data + prompts |
| `GET` | `/api/visibility/summary` | Visibility | Latest visibility summary per engine |
| `GET` | `/api/visibility/trends` | Visibility | Historical visibility trends |
| `POST` | `/api/visibility/analyze` | Visibility | Trigger new visibility analysis |
| `POST` | `/api/reports` | Reports | Generate a new report |
| `GET` | `/api/reports` | Reports | List reports |
| `GET` | `/api/reports/templates` | Reports | List available report templates (system + custom) |
| `POST` | `/api/reports/templates` | Reports | Create custom report template |
| `PATCH` | `/api/reports/templates/:id` | Reports | Update custom report template |
| `DELETE` | `/api/reports/templates/:id` | Reports | Delete custom report template |
| `GET` | `/api/reports/analytics` | Reports | Aggregate metrics: export format distribution (PDF/JSON), popular report titles, 14-day trend timeline |
| `GET` | `/api/reports/schedules` | Reports | List report schedules for workspace |
| `POST` | `/api/reports/schedules` | Reports | Create report schedule |
| `PATCH` | `/api/reports/schedules/:id` | Reports | Update report schedule |
| `DELETE` | `/api/reports/schedules/:id` | Reports | Delete report schedule |
| `PATCH` | `/api/reports/schedules/:id/toggle` | Reports | Toggle schedule enabled/disabled |
| `POST` | `/api/reports/generate` | Reports | Generate report from template |
| `POST` | `/api/reports/:id/send-email` | Reports | Send report via email |
| `GET` | `/api/reports/:id` | Reports | Full report detail |
| `POST` | `/api/reports/:id/export` | Reports | Create export job |
| `GET` | `/api/reports/exports/:jobId` | Reports | Export job status + download |
| `GET` | `/api/reports/exports/:jobId/download` | Reports | Signed export download endpoint |
| `GET` | `/api/reports/:id/export/json` | Reports | Direct JSON export |
| `GET` | `/api/reports/:id/export/pdf` | Reports | PDF-ready structured export data |
| `POST` | `/api/actions` | Actions | Generate AI action plan |
| `POST` | `/api/actions/multi-step` | Actions | Generate multi-step sequential action plan |
| `GET` | `/api/actions` | Actions | List generated actions (paginated) |
| `GET` | `/api/actions/:id` | Actions | Full generated action plan detail |
| `GET` | `/api/action-plans` | Action Plans | Get latest action plan detail |
| `GET` | `/api/action-plans/metrics` | Action Plans | Live action-plan metrics for Action Center KPI cards |
| `GET` | `/api/action-plans/:id` | Action Plans | Get specific action plan detail; supports multi-step `option.steps` payloads |
| `GET` | `/api/action-plans/:id/learning` | Action Plans | Feedback-derived learning insights for selected action plan |
| `PATCH` | `/api/action-plans/:id/assign` | Action Plans | Assign action plan |
| `POST` | `/api/action-plans/:id/feedback` | Feedback | Submit AI feedback |
| `POST` | `/api/feedback` | Feedback | Submit generic AI feedback |
| `GET` | `/api/feedback/accuracy` | Feedback | AI accuracy metrics |
| `GET` | `/api/feedback/rejections` | Feedback | Rejection insights |
| `GET` | `/api/feedback/prompt-scoring` | Feedback | Feedback-derived prompt scoring |
| `GET` | `/api/workspace/settings` | Workspace | Get workspace settings |
| `PATCH` | `/api/workspace/settings` | Workspace | Update workspace settings |
| `GET` | `/api/workspace/members` | Workspace | List workspace members |
| `POST` | `/api/workspace/members` | Workspace | Add member by `userId` or registered user `email` |
| `DELETE` | `/api/workspace/members/:id` | Workspace | Remove member |
| `GET` | `/api/workspace/notification-settings` | Workspace | Get notification preferences and custom notification rules |
| `PATCH` | `/api/workspace/notification-settings` | Workspace | Update notification preferences and `customRules` trigger/condition/channel/enabled rows |
| `GET` | `/api/workspace/activity` | Workspace | List workspace-scoped audit log entries with indexed `workspaceId` filtering, legacy metadata fallback, date/event/user filters, pagination, and summary metrics |
| `POST` | `/api/onboarding/workspace` | Onboarding | Create workspace with initial settings |
| `POST` | `/api/onboarding/sources` | Onboarding | Bulk-create initial data sources |
| `POST` | `/api/onboarding/notifications` | Onboarding | Set notification preferences |
| `POST` | `/api/onboarding/team` | Onboarding | Invite initial team members |
| `POST` | `/api/workspace/logo` | Workspace | Upload workspace logo |
| `GET` | `/api/workspace/token-usage` | Workspace | Get AI token usage and cost summary |
| `GET` | `/api/workspace/cases` | Cases | List tracked cases |
| `POST` | `/api/workspace/cases` | Cases | Create case |
| `GET` | `/api/workspace/cases/:id` | Cases | Get case detail |
| `PATCH` | `/api/workspace/cases/:id` | Cases | Update case |
| `DELETE` | `/api/workspace/cases/:id` | Cases | Delete case |
| `GET` | `/api/workspace/integrations` | Integrations | List integrations |
| `POST` | `/api/workspace/integrations` | Integrations | Connect integration |
| `GET` | `/api/workspace/integrations/:id` | Integrations | Get integration detail |
| `PATCH` | `/api/workspace/integrations/:id` | Integrations | Update integration |
| `DELETE` | `/api/workspace/integrations/:id` | Integrations | Disconnect integration |
| `GET` | `/api/notifications` | Notifications | List in-app notifications |
| `GET` | `/api/notifications/stream` | Notifications | SSE stream for real-time notifications and dashboard KPI updates |
| `PATCH` | `/api/notifications/read-all` | Notifications | Mark all notifications as read |
| `PATCH` | `/api/notifications/:id/read` | Notifications | Mark single notification as read |
| `DELETE` | `/api/workspace` | Workspace | Delete workspace |

---

## 6. Module Inventory

### 6.1 Module Files

| Module | Directory | Files |
|--------|-----------|-------|
| Auth | `src/modules/auth/` | `auth.routes.js`, `auth.controller.js`, `auth.service.js` |
| Signals | `src/modules/signals/` | `signals.routes.js`, `signals.controller.js`, `signals.service.js` |
| Sources | `src/modules/sources/` | `sources.routes.js`, `sources.controller.js` |
| Ingestion | `src/modules/ingestion/` | `ingestion.routes.js`, `ingestion.controller.js`, `custom-sources.service.js`, `actor-presets.js`, `apify-normalizer.js` |
| AI | `src/modules/ai/` | `ai.routes.js`, `ai.service.js` |
| Dashboard | `src/modules/dashboard/` | `dashboard.routes.js`, `dashboard.controller.js` |
| Alerts | `src/modules/alerts/` | `alerts.routes.js`, `alerts.controller.js`, `alerts.service.js` |
| Narratives | `src/modules/narratives/` | `narratives.routes.js`, `narratives.controller.js` |
| Visibility/Geo | `src/modules/geo/` | `geo.routes.js`, `geo.controller.js`, `geo.service.js` |
| Reports | `src/modules/reports/` | `reports.routes.js`, `reports.controller.js`, `reports.service.js`, `report-templates.js`, `report-generation.js` |
| Actions | `src/modules/actions/` | `actions.routes.js`, `actions.controller.js`, `actions.service.js`, `action-templates.js` |
| Action Plans | `src/modules/action-plans/` | `action-plans.routes.js`, `action-plans.controller.js` |
| Feedback | `src/modules/feedback/` | `feedback.routes.js`, `feedback.controller.js` |
| Workspace Settings | `src/modules/workspace-settings/` | `workspace-settings.routes.js`, `workspace-settings.controller.js`, `workspace-settings.schema.js`, `workspace-logo.controller.js`, `workspace-logo.schema.js` |
| Notifications | `src/modules/notifications/` | `notifications.controller.js`, `notifications.schema.js`, `notification-dispatch.service.js`, `notification-providers.js` |
| Activity | `src/modules/activity/` | `activity.routes.js`, `activity.controller.js`, `activity.schema.js` |
| Cases | `src/modules/cases/` | `cases.routes.js`, `cases.controller.js`, `cases.schema.js` |
| Integrations | `src/modules/integrations/` | `integrations.routes.js`, `integrations.controller.js`, `integrations.schema.js` |
| Onboarding | `src/modules/onboarding/` | `onboarding.routes.js`, `onboarding.controller.js`, `onboarding.schema.js` |
| Clustering | `src/modules/clustering/` | `clustering.service.js` |
| Apify | `src/modules/apify/` | `apify.service.js` |

### 6.2 Library Files (`src/lib/`)

| File | Purpose |
|------|---------|
| `api-error.js` | Structured API error class |
| `logger.js` | Request logger middleware + structured logging |
| `metrics.js` | Endpoint latency and error metrics |
| `queue.js` | BullMQ queue setup + scheduled jobs (including visibility scans) |
| `redis.js` | Redis connection |
| `runtime-health.js` | Deep health check (DB, Redis, OpenAI) |
| `workspace-access.js` | Workspace membership verification |
| `ai-client.js` | Shared OpenAI client singleton + config |
| `ai-utils.js` | Shared AI call, retry, JSON parse, truncation utilities |
| `confidence-calibration.js` | Feedback-based confidence score adjustment |
| `analysis-cache.js` | Content hash-based analysis caching |
| `token-tracking.js` | Per-workspace token usage and cost tracking |
| `source-health.js` | Source health monitoring and coverage metrics |
| `deduplication.js` | Document deduplication checks and stats |
| `worker-metrics.js` | Worker job metrics tracking (success rate, latency) |

### 6.3 Middleware (`src/middlewares/`)

| File | Purpose |
|------|---------|
| `auth.middleware.js` | JWT verification (`verifyToken`) |
| `validate-request.js` | Zod schema validation wrapper |
| `error-handler.js` | Global error handler + 404 handler |
| `request-timeout.js` | Request timeout middleware (30s default) |
| `rate-limit.js` | In-memory rate limiter with presets |

---

## 7. Background Workers

| Worker | File | Queue | Purpose |
|--------|------|-------|---------|
| **Ingestion Worker** | `ingestion.worker.js` (19KB) | `ingestion` | Runs configured Apify actors and normalizes raw documents → signals |
| **AI Analysis Worker** | `ai-analysis.worker.js` (5KB) | `ai-analysis` | Sends signals to OpenAI for sentiment/impact analysis |
| **Alert Worker** | `alert.worker.js` (3KB) | `alert-detection` | Detects anomalies from signals → creates alerts |
| **Notification Worker** | `notification.worker.js` (2KB) | `notifications` | Dispatches alert notifications (email, WhatsApp) |

### Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `scheduleAlertDetection()` | Recurring (15min) | Periodic anomaly detection across signals |
| `scheduleAlertEscalation()` | Recurring (10min) | Auto-escalate stale high-risk alerts |
| `scheduleVisibilityScans()` | Daily (2:00 AM) | Periodic AI visibility analysis |

---

## 8. Frontend-Backend Contract Table

> This maps each frontend page to intended backend endpoints. Updated to reflect actual wiring status.

| Frontend Page | Intended Endpoints | Current Frontend Usage |
|---|---|---|
| **Login** (`/login`) | `POST /auth/login` | ✅ Wired — fully integrated |
| **Signup** (`/signup`, `/verify-email`) | `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/resend-verification` | ✅ Wired — Ky-backed registration, email verification, and code resend |
| **Dashboard Home** (`/`) | `GET /api/dashboard/summary` | ✅ Wired — `useQuery` with time range, fully unmocked (KPIs, trends, sentiment, latest signals, top topics from `narrativeCluster`, sources health, system status) |
| **Signals** (`/signals`) | `GET /signals`, `GET /signals/meta` | ✅ Wired — `GET /signals` supports page, capped limit, keyword, platform, date range, and sentiment filters used by the production Signals table. Metadata includes live `totalSignals`, `sourceDistribution` (with percentage-based values), `timeline` (24h data), `timelineLabels`, `followUps`, `recommendations`, `investigationQueue`, `metrics` (totalSignals24h, negativeSignals24h, criticalSignals24h), and bilingual `aiSummary` (en/id). Frontend renders only API-backed signal/source/sentiment/time fields, opens case creation from selected signal rows, and shows no sample fallback rows. |
| **Alerts** (`/alerts`) | `GET /api/alerts`, `PATCH /api/alerts/:id/status`, `GET /api/alerts/summary` | ✅ Wired — `useQuery` + `useMutation` for status change + assignment dropdown; metric cards, source distribution, and timeline now consume `getAlertsSummary()` live aggregates |
| **Alert Detail** (`/alerts/[id]`) | `GET /api/alerts/:id`, `PATCH /api/alerts/:id/status`, `PATCH /api/alerts/:id/assign` | ✅ Wired — `useQuery` + editable assignment fields + status buttons |
| **Visibility** (`/visibility`) | `GET /api/visibility`, `GET /api/visibility/summary`, `GET /api/visibility/trends`, `POST /api/visibility/analyze` | ✅ Wired — 100% API-driven with empty states; date filter (7/14/30/90d), CSV export, dynamic executive summary, AI Search Sandbox with real API call, bilingual AI responses (EN/ID), SVG charts, modals for mentions and actions |
| **Intelligence** (`/intelligence`) | `GET /api/narratives`, `GET /api/narratives/:id` | ✅ Wired — `useQuery` with `buildNarrativeClusters` mapping; narrative share donut and lifecycle cards are live-derived; AI Summary is generated dynamically on the frontend; React Portal modals handle detail drilling via `getNarrativeById()` |
| **Reports** (`/reports`) | `GET /api/reports`, `GET /api/reports/templates`, `POST /api/reports/templates`, `PATCH /api/reports/templates/:id`, `DELETE /api/reports/templates/:id`, `GET /api/reports/analytics`, `POST /api/reports/generate`, `POST /api/reports/:id/send-email`, `GET /api/reports/schedules`, `POST /api/reports/schedules`, `PATCH /api/reports/schedules/:id`, `DELETE /api/reports/schedules/:id`, `PATCH /api/reports/schedules/:id/toggle`, `POST /api/reports/:id/export` | ✅ Wired — `useQuery` + `useMutation` for PDF export with polling; metric cards consume `getReportTemplates()`; format donut, popular templates list, and timeline chart consume `getReportsAnalytics()`; Manage Templates modal with full CRUD (system read-only + custom); Schedule Settings modal with full CRUD and enable/disable; Create New Report form with template selector and date range via `generateReportFromTemplate()`; Share to Stakeholder modal via `sendReportEmail()`; all components 100% i18n with empty/loading states |
| **Action Plans** (`/action-plans`) | `GET /api/action-plans`, `GET /api/action-plans/:id`, `GET /api/action-plans/metrics`, `GET /api/actions`, `POST /api/actions`, `POST /api/action-plans/:id/feedback`, `GET /api/action-plans/:id/learning`, `GET /api/feedback/accuracy` | ✅ Wired — `useQuery` + `useMutation` for create, queue, detail, metrics, feedback, learning, and performance panels. Static fallback mock logic removed; successful create now invalidates action queue/metrics/latest plan queries. Multi-step plans now render `option.steps` correctly. |
| **Sources** (`/workspace/sources`) | `GET /sources`, `GET /sources/presets`, `POST /sources/bootstrap-defaults`, `PATCH /sources/:sourceId`, `DELETE /sources/:sourceId`, `GET /sources/health`, `GET /sources/coverage`, `POST /ingestion/run`, `POST /ingestion/run/:sourceId` | ✅ Wired — `useQuery` for sources/health/coverage + toggle/sync/delete mutations + individual sync per source + search by name/category + empty states for charts. Sync All uses `POST /ingestion/run` and frontend chunks batches into 25-source requests to match backend validation. |
| **Settings** (`/workspace/settings`) | `GET/PATCH /api/workspace/settings`, `GET/POST/DELETE /api/workspace/members`, `POST /auth/change-password` | ✅ Wired — `useMutation` for settings, invite (API), delete member (API), change password |
| **Route Protection** | N/A | ✅ `proxy.ts` checks `narriv-authenticated` cookie, redirects unauthenticated users |
| **Logout** | `POST /auth/logout` | ✅ Wired — revokes refresh token via API before clearing local state |
| **Activity** (`/workspace/activity`) | `GET /api/workspace/activity` | ✅ Wired — frontend route renders real audit log data with filters and pagination |
| **Cases** (`/workspace/cases`) | `GET/POST/PATCH/DELETE /api/workspace/cases` | ✅ Wired — UI built with `useQuery`/`useMutation`; sidebar navigation added; `/cases` redirect page |
| **Integrations** (`/workspace/integrations`) | `GET/POST/PATCH/DELETE /api/workspace/integrations` | ✅ Wired — frontend route supports create, filter, inline status update, and disconnect |
| **Onboarding** (`/onboarding`) | `POST /api/onboarding/workspace`, `POST /api/onboarding/sources`, `POST /api/onboarding/notifications`, `POST /api/onboarding/team` | ✅ Wired — onboarding wizard saves setup data to backend |
| **Reset Password** (`/reset-password`, `/verify-code`, `/new-password`) | `POST /auth/forgot-password`, `POST /auth/verify-reset-code`, `POST /auth/reset-password` | ✅ Wired — Ky-backed reset request, code verification, reset token, and new password submission |

---

## 9. Current State Assessment

### ✅ Completed Backend Infrastructure
- Express.js server with modular route architecture
- Prisma schema with 25+ models (including Case, Integration, TokenUsage) and comprehensive indexes
- JWT auth with access + refresh tokens, bcrypt hashing
- Workspace-scoped multi-tenancy
- BullMQ background workers for ingestion, AI analysis, alerts, notifications, visibility scans
- Zod request validation middleware
- Structured logging with request IDs
- Runtime health checks (DB, Redis, OpenAI)
- Metrics tracking for latency and errors
- CORS configuration for local and production (env-based allowlist)
- Production server port now honors `PORT` from environment instead of hardcoding `3000`
- Global error handler with normalized responses
- Request timeout middleware (30s default, configurable per endpoint)
- Rate limiting on AI/export/ingestion/auth endpoints
- Request body size limits (2MB)
- Shared AI client singleton with retry utilities
- Confidence calibration based on feedback data
- Analysis caching via content hashing
- Token usage and cost tracking per workspace
- Source health monitoring and coverage metrics
- Document deduplication checks
- Worker metrics tracking (success rates, latency)
- Report templates (Executive Brief, Risk Review, Visibility, Weekly Digest)
- Custom webhook source ingestion
- Incremental ingestion support
- Apify actor documentation
- Apify actor output normalization now preserves actor-specific language, location, media, engagement, search query, and source URL metadata into `RawDocument.metadata`; language and location hints are promoted into `Signal.language` and `Signal.region` when available.
- Production readiness runbook created at `process/general-plans/references/production-readiness-runbook.md`
- Backend package scripts include `start`, `prisma:generate`, `prisma:status`, and `prisma:deploy` for VPS/CI operations
- Apify runtime now accepts both `APIFY_TOKEN` and legacy `APIFY_API_TOKEN`; Docker Compose passes both names, with runtime preferring `APIFY_TOKEN`.
- Ingestion batch trigger is capped at 25 sources per request to reduce queue flood risk; frontend Sync All chunks larger source lists.
- Dashboard summary now includes `global_activity` for the Command Center map, derived from live `Signal.region` values and cached for 15 seconds for near-real-time refresh.
- Action Plans response builder handles both legacy strategy arrays and multi-step `option.steps` objects; structured error logging is imported in action-plan routes.

### ✅ Completed API Endpoints
All frontend-facing backend contracts are implemented and returning data. See the [API Route Map](#5-api-route-map) for the full list (50+ endpoints across 18 modules).

### ⚠️ Known Issues & Gaps

1. **Missing Endpoints**:
   - ~~No API for workspace activity/audit log listing~~ ✅ Done
   - ~~No API for cases management~~ ✅ Done
   - ~~No API for integrations/OAuth~~ ✅ Done
   - ~~No API for onboarding wizard steps~~ ✅ Done
   - ~~No API for logo/file upload~~ ✅ Done
   - ~~No dedicated notification-settings endpoint~~ ✅ Done
   - ~~No API for reset password flow (forgot password email)~~ ✅ Done — reset code/token flow implemented; Resend API integrated for production delivery
   - ~~No WebSocket/SSE for real-time updates~~ ✅ Done — implemented SSE via `/api/notifications/stream` for real-time push.

2. **Testing Gaps**:
   - ~~Integration tests not written for most endpoints~~ ✅ Broad API/worker/security/load coverage in place
   - ~~Auth flow (register → login → refresh → logout) not tested end-to-end~~ ✅ Done
   - ~~Worker failure scenarios not tested~~ ✅ Done

3. **Security Gaps**:
   - ~~Rate limiting not applied to AI generation, export, ingestion endpoints~~ ✅ Done
   - ~~CORS production allowlist needs review~~ ✅ Done
   - ~~HTTPS enforcement needed in production~~ ✅ Done
   - ~~Audit logging exists for alert/action-plan assignment and escalation changes, but is not comprehensive across all mutations~~ ✅ Main mutations covered by audit logging

4. **Contract Gaps**:
     - List endpoints are mixed: most return `pagination`, while `/api/actions` returns `meta`; frontend `api-service.ts` now models both response shapes explicitly
     - `/auth/logout` is public and revokes by refresh token body, so docs and clients should not treat it as bearer-token protected
    - ~~Workspace member invite UI sent `email`/`name` while backend required `userId`~~ ✅ Done for registered-user email lookup; full invite-token/email delivery remains future scope
    - ~~OAuth, source bootstrap, and batch ingestion endpoint mismatches between frontend and backend~~ ✅ Done — frontend now calls `/auth/oauth/exchange`, `/sources/bootstrap-defaults`, and `/ingestion/run`.

5. **Production Gaps**:
   - Database migration baseline not done for existing databases
   - ~~API error response format not fully normalized~~ ✅ Done
   - ~~Apify actor IDs and configs not documented for production~~ ✅ Done

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

Note: New models (Case, Integration, TokenUsage) are covered by migration `20260602090000_add_case_integration_token_usage`. Run `npx prisma migrate deploy` in production/CI after validating database baseline status.

#### Security
- [x] Add rate limits to: `POST /api/actions`, `POST /api/reports/:id/export`, `POST /ingestion/run`, `POST /ingestion/run/:sourceId`, `POST /api/feedback` (Sync All now uses batch endpoint; ingestion limit set to 10/min)
- [x] Review and finalize CORS production allowlist (replace broad preview settings)
- [x] Add HTTPS enforcement in production
- [x] Audit all `verifyToken` usage — ensure no unprotected endpoints leak data
- [x] Add request body size limits for all POST/PATCH endpoints
- [x] Add SQL injection protection review (Prisma handles most, verify raw queries)
- [x] Remove Microsoft OAuth — only Google OAuth2 supported for social login

Security verification notes:
- Production HTTPS enforcement rejects non-HTTPS requests with `426 HTTPS_REQUIRED`, while allowing reverse-proxy HTTPS via `x-forwarded-proto: https`.
- Production CORS allows only `CORS_ORIGINS` by default; `.vercel.app` preview origins require `ALLOW_VERCEL_PREVIEW_ORIGINS=true`.
- Raw SQL review found only Prisma tagged-template usage in runtime health and token usage tracking; no `queryRawUnsafe`/`executeRawUnsafe` usage found.
- `npm audit --audit-level=high` currently reports 0 vulnerabilities after dependency fixes.

Optional RLS notes:
- Current recommended tenant isolation remains API-layer workspace scoping.
- PostgreSQL RLS is optional and should remain disabled unless direct DB access by clients/services is introduced.
- Example non-active SQL lives in `prisma/optional_migration_examples/rls/001_enable_rls_example.sql` and `prisma/optional_migration_examples/rls/002_disable_rls_rollback_example.sql`.
- If RLS is adopted later, test in staging first and set a request/transaction workspace context such as `app.current_workspace_id` with `set_config(...)` before relying on policies.
- Keep rollback SQL ready before enabling RLS table-by-table.

#### Error Handling
- [x] Normalize all API error responses to: `{ error: string, code?: string, details?: object }`
- [x] Ensure all routes return proper HTTP status codes (400, 401, 403, 404, 500)
- [x] Add global error handler middleware for unhandled exceptions
- [x] Add request timeout middleware (30s default, 60s for AI generation)

#### Observability
- [x] Add structured error logging for all catch blocks
- [ ] Add alert detection failure logging with workspace context
- [x] Add ingestion worker metrics (jobs/min, success rate, avg duration)
- [x] Add AI analysis metrics (tokens used, latency, failure rate)
- [x] Add audit logging for source, ingestion, action generation, feedback, report generation/export, case, integration, workspace, notification, auth, alert, and action-plan mutations
- [ ] Configure log rotation or external log shipping

---

### Phase 2: Missing Endpoints (High Priority)

> [!IMPORTANT]
> These endpoints are needed by the frontend but don't exist yet.

#### Activity / Audit Log API
- [x] Implement `GET /api/workspace/activity` — List audit log entries for workspace
- [x] Support filters: `eventType`, `userId`, `dateFrom`, `dateTo`
- [x] Support pagination: `page`, `limit`
- [x] Return: `{ data: AuditLog[], meta: { page, limit, total } }`
- [x] Acceptance: frontend creates `/workspace/activity` and renders real audit events

#### Cases API
- [x] Design case data model (or extend Alert/ActionPlan for case tracking)
- [x] Implement `GET /api/workspace/cases` — List tracked cases
- [x] Implement `POST /api/workspace/cases` — Create case from alert/cluster
- [x] Implement `PATCH /api/workspace/cases/:id` — Update case status
- [x] Acceptance: frontend creates `/workspace/cases` and renders real case data

#### Integrations API
- [x] Design integration model (platform, credentials, status)
- [x] Implement `GET /api/workspace/integrations` — List integrations
- [x] Implement `POST /api/workspace/integrations` — Connect integration
- [x] Implement `DELETE /api/workspace/integrations/:id` — Disconnect
- [x] Consider OAuth flow for Slack, Teams, etc.
- [x] Acceptance: frontend creates `/workspace/integrations` and shows real connection status

#### Onboarding API
- [x] Implement `POST /api/onboarding/workspace` — Create workspace with initial settings
- [x] Implement `POST /api/onboarding/sources` — Bulk-create initial data sources
- [x] Implement `POST /api/onboarding/notifications` — Set notification preferences
- [x] Implement `POST /api/onboarding/team` — Invite initial team members
- [x] Acceptance: Onboarding wizard saves data to backend

#### File Upload API
- [x] Implement `POST /api/workspace/logo` — Upload workspace logo
- [x] Add file validation (type, size limits)
- [x] Store in local storage (`uploads/logos/`)
- [x] Return: `{ url: string }` for the uploaded logo
- [x] Acceptance: Settings page logo upload works end-to-end

#### Notification Settings API
- [x] Alerts page Notification Rules modal now uses this API for delivery toggles, presets, and customRules[] rows (id, trigger, condition, channels, enabled)
- [x] Implement `GET /api/workspace/notification-settings` — Get notification preferences
- [x] Implement `PATCH /api/workspace/notification-settings` — Update preferences
- [x] Return: `{ emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications }`
- [x] Acceptance: Settings page notification toggles persist

---

### Phase 3: AI & ML Pipeline (High Priority)

> [!NOTE]
> These improve the AI-powered features that differentiate Narriv.

#### Signal Analysis Quality
- [x] Review OpenAI prompt templates for signal analysis
- [x] Add confidence score calibration based on feedback data
- [x] Implement batch analysis for efficiency (analyze multiple signals per request)
- [x] Add analysis caching to avoid re-analyzing unchanged signals
- [x] Track token usage and cost per workspace

#### Narrative Clustering
- [x] Implement automated cluster detection from signal patterns
- [x] Add cluster merging for overlapping topics
- [x] Add cluster lifecycle management (emerging → active → declining → archived)
- [x] Add cluster velocity calculation (growth rate over time windows)
- [x] Implement cluster comparison across time periods

#### AI Visibility Engine
- [x] Implement automated prompt testing against AI platforms
- [x] Add trigger endpoint for visibility analysis (`POST /api/visibility/analyze`)
- [x] Schedule periodic visibility scans (daily at 2:00 AM)
- [x] Track visibility score trends over time
- [x] Add competitor mention tracking
- [x] Implement AI response sentiment analysis
- [x] Bilingual AI responses — system prompt now requests JSON `{ en, id }` format; responses stored with `response` (EN) and `responseId` (ID) fields; `response_format: json_object` enabled for structured output

#### Action Generation
- [x] Add new strategy types beyond the current 4 (Social Response, Stakeholder Update, Data-Driven)
- [x] Implement multi-step action plan generation (`POST /api/actions/multi-step`)
- [x] Add action plan templates based on industry
- [x] Use feedback data to improve generation quality
- [x] Add action plan cost/effort estimation

---

### Phase 4: Data Pipeline (Medium Priority)

#### Ingestion Improvements
- [x] Document all Apify actor IDs and input schemas for production
- [x] Add Apify-only source preset catalog from `backend/apify-actor.md` with bootstrap endpoint
- [x] Add source health monitoring (auto-detect failing sources)
- [x] Implement incremental ingestion (only fetch new data)
- [x] Add data deduplication quality checks
- [x] Add source coverage metrics (how much of the target is covered)
- [x] Support custom webhook sources beyond Apify
- [x] Guard ingestion trigger/webhook/worker paths against inactive or soft-deleted sources; podcast sources without explicit actor IDs now default to podcast presets
- [x] Cap batch ingestion requests at 25 source IDs and keep frontend Sync All compatible through request chunking
- [x] Normalize researched Apify actor output fields into raw document metadata and signal language/region hints without requiring a schema migration

#### Report Generation
- [x] Implement actual PDF report generation (not just JSON export)
- [x] Add report templates (Executive Brief, Risk Review, Visibility Report, Weekly Digest)
- [x] Add scheduled report generation (daily, weekly)
- [x] Implement report email delivery (Using Resend API)
- [x] Add report customization (sections, date range, branding)
- [x] Add Zod validation for `POST /generate` and `POST /:id/send-email` endpoints; `.strict()` on all report schemas to prevent mass-assignment
- [x] Replace hardcoded Indonesian in email defaults with i18n-ready English text

---

### Phase 5: Infrastructure (Before Scale)

#### Performance
- [x] Add Redis caching for frequently accessed endpoints (dashboard summary, visibility)
- [x] Implement database connection pooling optimization
- [x] Add API response compression (gzip)
- [ ] Optimize heavy queries with materialized views or pre-aggregation
- [ ] Add query performance monitoring

#### Real-time Features
- [ ] Implement WebSocket server for live signal/alert updates
- [x] Add Server-Sent Events (SSE) as a lighter alternative (Implemented for In-App Notifications)
- [x] Implement real-time notification push (not just job-based)
- [ ] Add live dashboard KPI updates

#### Deployment
- [x] Containerize with Docker (Dockerfile + docker-compose)
- [x] Configure environment-specific settings (dev, staging, production)
- [x] Set up health check for container orchestration
- [x] Create production readiness runbook covering VPS, DNS, Nginx, SSL, env, migration baseline, storage, backup, monitoring, and QA gates
- [ ] Configure database backup schedule
- [x] Set up Redis persistence or managed Redis
- [ ] Configure auto-scaling rules for workers

---

### Phase 6: Testing (Ongoing)

> [!WARNING]
> Integration tests are actively being implemented for production readiness.

#### Test Infrastructure
- [x] Setup Jest + Supertest for ESM integration testing
- [x] Configure module mocks (Prisma, BullMQ, Redis, Cache, Logging) so `npm test` exits cleanly

#### Auth Tests
- [x] Test register → login → refresh → logout flow
- [x] Test expired/invalid access token returns `401`
- [x] Test refresh token validation
- [x] Test account lockout after failed login attempts
- [x] Test password change flow
- [x] Test forgot-password → verify-reset-code → reset-password flow
- [x] Test workspace scoping (user A can't see workspace B data)

#### CRUD Tests
- [x] Test source CRUD lifecycle (create → read → update → soft-delete)
- [x] Test Apify source presets and default bootstrap endpoint
- [x] Test ingestion job creation, status tracking, cancellation, and workspace scoping
- [x] Test alert CRUD (list → detail → status update → assignment)
- [x] Test action plan generation, listing/detail, assignment, and feedback submission
- [x] Test report creation, listing/detail, export job status, and signed download lifecycle
- [x] Test workspace settings CRUD
- [x] Test workspace member management
- [x] Test cases CRUD lifecycle (create → list → detail → update → delete)
- [x] Test integrations CRUD lifecycle (connect → list → detail → update → disconnect)

#### Worker Tests
- [x] Test ingestion worker with mock Apify responses
- [x] Test Apify actor output normalizer and worker persistence of language/location hints
- [x] Test AI analysis worker with mock OpenAI responses
- [x] Test alert detection/escalation worker dispatch across workspaces
- [x] Test notification worker dispatch by event type
- [x] Test worker failure recovery and retry behavior matrix

#### Load Tests
- [x] Add k6 load test skeleton and npm scripts (`load:smoke`, `load:baseline`, `load:stress`)
- [x] Run local k6 smoke, baseline, and stress profiles against localhost backend
- [ ] Test API under concurrent load (100+ requests/second)
- [ ] Test database performance with 100K+ signals
- [ ] Test queue processing under high job volume
- [ ] Test memory usage during large ingestion jobs

---

## Appendix: Frontend Development Status

> Last updated: 2026-06-19

### ✅ Completed Frontend Work

#### API Wiring (All pages now use `useQuery`/`useMutation` with real API endpoints)
- [x] Dashboard Home — `getDashboardSummary` with time range filtering
- [x] Signals — `getSignals` with pagination, capped limit, keyword/date/sentiment filtering, and `getSignalsMeta` for live sidebar/source/timeline panels; `totalSignals` field added to `SignalsMeta` type; `timelineLabels` exposed for x-axis; all panels fully bilingual with empty/error states; frontend sample fallback rows removed
- [x] Alerts - getAlerts with pagination/search/filtering + updateAlertStatus mutation + getAlertsSummary live metrics/source distribution/timeline/lifecycle KPIs + escalation matrix + notification settings custom rules
- [x] Alert Detail - getAlertById + updateAlertAssignment mutation with workspace member and escalation role dropdowns
- [x] Visibility — `getVisibility`, `getVisibilitySummary`, and `getVisibilityTrends` with fallback
- [x] Intelligence — `getNarratives` + `getNarrativeById` with dynamic UI generation for AI summaries, live derived metrics (donuts/lifecycles), and fully wired React Portal modals (Analysis/Landscape/Clusters)
- [x] Reports — `getReports` + `createReportExport` with polling via `getReportExportStatus` + `getReportTemplates` CRUD + `getReportSchedules` CRUD + `generateReportFromTemplate` + `sendReportEmail` + `getReportsAnalytics` for dynamic charts; mock fallbacks strictly removed from frontend; added ReportTemplate and ReportSchedule Prisma models; added POST/PATCH/DELETE for custom templates; added POST/PATCH/DELETE/toggle for schedules; GET /templates merges system + custom templates
- [x] Action Plans — `getActionPlans` + `getActionQueue` + `submitActionPlanFeedback` mutation
- [x] Sources — `getSources` + `updateSource` (toggle) + `deleteSource` + `runSourceIngestion` (sync) + `runBatchSourceIngestion` (Sync All) + `getSourceHealth` + `getSourceCoverage` + individual sync + search + empty states; all metric cards, health labels, distribution panel, settings labels translated to bilingual
- [x] Settings — `updateWorkspaceSettings` + `createWorkspaceMember` (invite) + `deleteWorkspaceMember` + `changePassword`

#### Authentication & Route Protection
- [x] `proxy.ts` — Next.js 16 route protection (checks `narriv-authenticated` cookie)
- [x] Logout — revokes refresh token via `POST /auth/logout` before clearing local state
- [x] Login — wired to `POST /auth/login` with Zod validation
- [x] Signup — wired to `POST /auth/register` with Zod validation

#### Form Validation
- [x] Invite Member — name (min 2 chars) + email (valid format) with inline error messages
- [x] Workspace Info — workspace name (min 3 chars) with inline error messages
- [x] Change Password — current password required + new password (min 10 chars, uppercase, number, symbol)

#### UI Improvements
- [x] Dashboard Quick Actions — slide-over drawer with contextual content (replaces placeholder)
- [x] Alerts page — status dropdown menu (Baru/Investigating/Resolved) + "Tugaskan ke Saya"
- [x] Alert Detail — status change buttons + editable assignment fields with save
- [x] Sources — interactive toggle, sync all, delete via API, individual sync per source, search by name/category, empty states for VolumeBars/DistributionDonut/HealthDonut
- [x] Reports — PDF export with polling and auto-download; Manage Templates full CRUD; Schedule Settings full CRUD; Create New Report form; Share to Stakeholder email modal; all 100% i18n
- [x] Action Plans — accept/reject feedback buttons
- [x] Settings — invite/delete member via API, change password form

#### Infrastructure
- [x] `apiClient.ts` — auto-refresh on 401, JWT token attachment
- [x] `api-service.ts` — typed service layer for all domain endpoints
- [x] TanStack Query — all pages use `useQuery`/`useMutation` with cache invalidation

### ⚠️ Known Frontend Gaps

#### Needs Backend APIs
- [x] Reset Password flow — backend endpoint and frontend wiring complete; production email provider delivery remains future integration
- [ ] Notification bell — currently uses mock alerts, needs real notification API
- [ ] Dashboard widgets — `miniTopics`, `topTopics`, `sources`, `systemStatus` are still mock
- [x] Signals sidebar panels — `followUps`, `recommendations`, `sourceDistribution`, 24h `timeline`, labels, totals, and investigation queue consume `/signals/meta`; API failures now surface explicit error/empty states rather than preview sample data

#### Low Priority Cleanup
- [ ] Remove unused `LineChartMock` / `DonutMock` from `dashboard-kit.tsx`
- [ ] Move `navGroups` from `mock-data.ts` to constants file
- [x] Intelligence page — competitor donut, lifecycle metrics, and AI summary are all generated dynamically from live data; no mock data fallbacks remain.

---

## Appendix: Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Access token signing secret |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret |
| `OPENAI_API_KEY` | ⚠️ | Required for AI features |
| `RESEND_API_KEY` | ⚠️ | Required for transactional emails |
| `REDIS_URL` | ⚠️ | Required for BullMQ workers |
| `APIFY_TOKEN` | ⚠️ | Required for live Apify data ingestion; preferred variable name |
| `APIFY_API_TOKEN` | ⚠️ | Legacy Apify token fallback accepted for compatibility |
| `PORT` | ❌ | Server port (default: 3000) |
| `NODE_ENV` | ❌ | Environment (development/production) |
| `CORS_ORIGINS` | ❌ | Comma-separated allowed origins |
| `LOG_LEVEL` | ❌ | Logging verbosity |
| `TRUST_PROXY` | ❌ | Express proxy trust setting for Nginx/reverse proxy deployments |
| `ALLOW_INSECURE_HTTP` | ❌ | Production HTTPS bypass for controlled internal smoke tests only; keep false/blank for launch |
| `EXPOSE_RESET_SECRETS` | ❌ | Dev reset/verification code exposure; must be false/blank in production |
| `APP_URL` | ⚠️ | Frontend URL used in email links |
| `FRONTEND_URL` | ⚠️ | Frontend URL used for OAuth redirects |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | ⚠️ | Google OAuth production credentials and callback URL |

---

## Appendix: Seed Data

The file `prisma/seed.js` (9.6KB) provides demo data for local development:
- Demo user account
- Demo workspace
- Sample sources, signals, alerts
- Sample reports, action plans
- Sample AI visibility results and prompt test runs

Run seed: `npm run seed` (`node prisma/seed.js`)
