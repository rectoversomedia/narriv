# Narriv - All Context

Last updated: 2026-06-02

This file is the root context entrypoint for the repo. Start here before substantial research, planning, review, testing, or implementation work.

Narriv is a Narrative Intelligence & Operational Response platform. It helps organizations monitor digital signals, analyze narratives, detect risks, generate reports, and coordinate proactive AI-assisted responses.

---

## Current Root Entry Points

| File | Read when |
|---|---|
| `process/context/all-context.md` | any substantial planning, research, review, or implementation task |
| `process/context/tests/all-tests.md` | testing, verification, debugging test failures, execution planning |
| `process/context/planning/all-planning.md` | plan-shape calibration, SIMPLE vs COMPLEX references, plan lifecycle routing |
| `process/development-protocols/all-development-protocols.md` | workflow, RIPER-5, planning, execution, or process questions |
| `frontend/narriv_frontend_blueprint.md` | frontend page inventory, UI contracts, API wiring status, frontend tracker |
| `backend/narriv_backend_blueprint.md` | backend architecture, API map, schema summary, backend tracker |
| `graphify-out/GRAPH_REPORT.md` | high-level product/community map generated from prior project analysis |

## Current Context Groups

| Group | Entry point | Scope |
|---|---|---|
| `tests/` | `process/context/tests/all-tests.md` | test runners, commands, debugging, current testing gaps |
| `planning/` | `process/context/planning/all-planning.md` | plan-shape calibration, plan lifecycle routing, SIMPLE vs COMPLEX references |

No additional context groups exist yet. Promote a group when a durable domain has 3+ docs, a single doc exceeds roughly 800 lines, or agents repeatedly need only one slice of a large context file.

## Task Routing Table

| If the task involves... | Load first | Then load |
|---|---|---|
| general repo research | `process/context/all-context.md` | the relevant blueprint or source folder |
| frontend UI, routes, Next.js behavior | `process/context/all-context.md` | `frontend/narriv_frontend_blueprint.md`, then `frontend/AGENTS.md` |
| backend API, Prisma, workers, infra | `process/context/all-context.md` | `backend/narriv_backend_blueprint.md`, then relevant `backend/src/` files |
| tests or verification | `process/context/all-context.md` | `process/context/tests/all-tests.md` |
| plans or phase workflow | `process/context/all-context.md` | `process/context/planning/all-planning.md`, then `process/development-protocols/all-development-protocols.md` |
| product area orientation | `process/context/all-context.md` | `graphify-out/GRAPH_REPORT.md` and the two blueprints |

## Context Group Lifecycle

Context groups are durable knowledge domains, not feature folders.

Create or promote a context group when:

- a topic has 3+ durable docs
- a single doc exceeds roughly 800 lines with separable subtopics
- multiple agents repeatedly need only one slice of a large context file
- the topic maps to a stable operational domain such as tests, planning, infra, database, auth, UI, or workflows

Do not create a context group for temporary reports, one-off plans, or feature artifacts that belong in `process/features/...`.

When context organization changes, update this router and run `vc-audit-context`.

---

## Repository Structure

```text
narriv/
  backend/                    Express 5 API server, Prisma schema, workers, tests
    src/                      API modules, middleware, lib helpers, BullMQ workers
    prisma/                   Prisma schema, migrations, seed data
    tests/                    Jest + Supertest integration tests
    narriv_backend_blueprint.md
  frontend/                   Next.js 16 App Router dashboard app
    app/                      App Router pages and route groups
    components/               Dashboard, UI, layout, chart, and shared components
    lib/                      API client/service layer and utilities
    stores/                   Zustand auth/UI state
    messages/                 EN/ID next-intl message files
    narriv_frontend_blueprint.md
  graphify-out/               Generated project/product graph and report
  process/                    Agent workflow context, plans, protocols, and seeds
  .claude/                    Claude agent/skill harness
  .codex/                     Codex agent mirrors and config
  .agents/                    Shared skills compatibility surface
```

There is no root `package.json`. `frontend/` and `backend/` are separate npm packages with separate lockfiles.

## Technology Stack

### Frontend

- **Framework:** Next.js `16.2.4` with App Router and Turbopack dev server.
- **Language:** TypeScript `^5`.
- **React:** React `19.2.4` and React DOM `19.2.4`.
- **Styling:** Tailwind CSS v4 with `@theme inline` in `globals.css`; shadcn-style/custom dashboard primitives.
- **State:** Zustand persisted stores (`useAuthStore`, `useUiStore`).
- **Data fetching:** Native `fetch`, typed `api-service.ts`, TanStack Query `^5.100.6`.
- **Forms:** `react-hook-form` + Zod.
- **i18n:** `next-intl` client usage with EN/ID messages.
- **Testing:** Playwright E2E scripts exist.

### Backend

- **Runtime:** Node.js ESM (`"type": "module"`).
- **Framework:** Express `5.2.1` REST API.
- **Database:** PostgreSQL via Prisma `5.22` and `@prisma/client`.
- **Queue/cache:** Redis via `ioredis`, BullMQ workers and scheduled jobs.
- **AI:** OpenAI SDK `6.34.0`.
- **Data collection:** Apify client.
- **Auth:** JWT + bcrypt access/refresh-token flow.
- **Validation:** Zod request schemas.
- **Testing:** Jest `30.4.2`, Supertest `7.2.2`, `cross-env`.

## Product Areas

Graphify identified these main product communities:

- **Command Center Overview:** dashboard KPIs, signal volume, quick actions, health/status widgets.
- **Signals and Sources:** data source connectors, source health, ingestion, AI-classified crawling logs, signals table.
- **Alerts and Escalation:** predictive alert lists, alert detail, status/assignment, escalation settings.
- **Narrative Intelligence:** narrative clusters, interactive topic maps, velocity tables, issue relationships.
- **AI Visibility / GEO:** AI search visibility, competitor mentions, prompt tests, platform comparisons, content suggestions.
- **Reports Center:** report vault, templates, exports, scheduled reporting, sharing/download flows.
- **Action Response Loop:** action plans, Kanban/list board, action detail, AI feedback loop.
- **Settings and Workspace:** workspace settings, members, notification/escalation channels, cases, integrations.

## Backend Architecture

The backend is a modular Express API server with Prisma persistence and BullMQ workers.

Important modules:

- `src/modules/auth/` handles register, login, me, refresh, logout, and change password.
- `src/modules/sources/` and `src/modules/ingestion/` manage collection sources, ingestion jobs, RSS/webhook ingestion, and Apify integration.
- `src/modules/signals/`, `src/modules/ai/`, `src/modules/clustering/`, and `src/workers/ai-analysis.worker.js` implement signal analysis and narrative intelligence.
- `src/modules/alerts/` plus `src/workers/alert.worker.js` implement anomaly/risk alerting.
- `src/modules/reports/` implements report templates, export jobs, PDF-ready data, and email send stubs/services.
- `src/modules/actions/`, `src/modules/action-plans/`, and `src/modules/feedback/` implement generated actions and AI learning loop feedback.
- `src/modules/workspace-settings/`, `activity/`, `onboarding/`, `cases/`, `integrations/`, and `notifications/` handle workspace/admin surfaces.

Important libraries:

- `src/prisma.js` exports the Prisma client.
- `src/lib/queue.js` defines queues and scheduled jobs.
- `src/lib/redis.js` defines Redis connection behavior.
- `src/lib/logger.js`, `metrics.js`, and `runtime-health.js` support observability.
- `src/lib/workspace-access.js` enforces workspace membership/scoping helpers.

## Frontend Architecture

The frontend is a Next.js dashboard with auth pages, onboarding, and dashboard route groups.

Important surfaces:

- Auth pages: `/login`, `/signup`, `/reset-password`, `/verify-code`, `/new-password`.
- Dashboard shell: sidebar, topbar, mobile nav, global search, language toggle, notification popover, logout.
- Main pages: `/`, `/signals`, `/alerts`, `/alerts/[id]`, `/visibility`, `/intelligence`, `/reports`, `/action-plans`, workspace settings/sources/activity/cases/integrations.
- API access: `frontend/lib/apiClient.ts` handles tokens/401 refresh; `frontend/lib/api-service.ts` provides typed domain calls.
- Route protection: Next.js 16 uses `proxy.ts`, not old middleware assumptions.

## Key Patterns and Conventions

- Preserve established frontend visual language. The current direction is a polished light enterprise dashboard; do not reintroduce dark mode unless explicitly requested.
- Frontend pages use React Query with API service functions and preview/mock fallback where live coverage remains incomplete.
- Backend routes use Zod validation middleware and normalized error responses.
- Backend multi-tenancy is workspace-scoped at the API layer through workspace memberships and `workspaceId` filtering.
- Backend workers and scheduled jobs depend on Redis/BullMQ; local Redis connection failures may be expected if Docker Compose services are not running.
- File uploads for workspace logos use base64 JSON payloads rather than multipart/multer.
- When editing frontend code, respect `frontend/AGENTS.md`: this is Next.js 16 with breaking changes; check local Next docs in `node_modules/next/dist/docs/` before changing Next-specific APIs.
- Keep `frontend/narriv_frontend_blueprint.md` and `backend/narriv_backend_blueprint.md` updated when completing tracked work.
- Use PowerShell-safe command chaining (`; if ($?) { ... }`) rather than `&&`.

## Environment Variables

Backend:

- `DATABASE_URL` required for PostgreSQL/Prisma.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` required for auth.
- `OPENAI_API_KEY` required for live AI features.
- `REDIS_URL` required for BullMQ workers/queues.
- `APIFY_TOKEN` required for Apify ingestion.
- `PORT`, `NODE_ENV`, `CORS_ORIGINS`, and `LOG_LEVEL` are optional/configuration variables.

Frontend:

- Uses backend API at `localhost:3000` during local development.
- Runs on `localhost:3001` via `next dev -p 3001`.

## Current Implementation State

- Frontend API wiring is mostly complete for dashboard, signals, alerts, reports, action plans, sources, and settings.
- Backend phases 2 through 5 are largely complete according to `backend/narriv_backend_blueprint.md`.
- Backend Phase 6 testing is ongoing: Jest/Supertest infrastructure exists; auth tests cover register, login, refresh, logout, lockout, and password change.
- Current backend API coverage includes auth happy paths, auth/security negative cases, sources, ingestion jobs, alerts, action plans/feedback, reports/exports, workspace settings, workspace members, cases, and integrations. Worker coverage includes ingestion processing/cancellation/retry/final-failure, AI analysis persistence/fallback failure logs, alert detection/escalation dispatch with partial workspace failure recovery, and notification event dispatch/unknown-event failure. k6 load-test skeleton exists under `backend/tests/load/`; localhost smoke, baseline, and stress profiles have been run and reported passing.
- Known product/API gaps include reset-password backend flow, real-time updates, production HTTPS enforcement, migration baseline, and broader mutation audit logging.

## Context Update Protocol

When durable project knowledge changes:

1. update the smallest relevant context file
2. update this file if routing, ownership, naming, or groups changed
3. update `frontend/narriv_frontend_blueprint.md` or `backend/narriv_backend_blueprint.md` when tracked frontend/backend work changes
4. run `vc-audit-context` after context organization changes
