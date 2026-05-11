# Backend AI Development Checklist

This checklist is the backend todo list for Narriv after the frontend is ready. Keep this file updated so backend and frontend development stay aligned.

## Current Frontend State
- Frontend UI is ready in light/dark mode with shadcn-style dashboard pages.
- Frontend supports English and Indonesian through `next-intl`.
- Frontend is production/live-only; implemented pages show API data, loading states, empty states, or errors without mock fallback.
- Frontend already calls the backend contracts listed below.

## Current Backend Development Todo

Use this as the active backend backlog before production deployment.

Product positioning to preserve in backend contracts:
- Narriv is an operational response platform, not a scraping/monitoring dashboard.
- AI Visibility is a hero feature and should remain first-class in APIs, reports, and action generation.
- Ingestion language should map to automatic syncing/monitoring concepts, not manual collection.
- Alert workflows should support predictive/risk framing, owner assignment, deadline tracking, escalation levels, notifications, and feedback-based learning.

### Production Readiness
- [ ] Baseline existing local/staging/production databases before running `npx prisma migrate deploy` on non-empty databases.
- [ ] Run `npx prisma migrate deploy` successfully against a clean database and a baselined existing database.
- [x] Document required backend environment variables in `.env.example`, including `JWT_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`, Apify configuration, queue configuration, and report export storage settings.
- [x] Add a startup/runtime health check that reports database, queue, OpenAI, and ingestion provider availability without leaking secrets.
- [ ] Decide long-term workspace deletion policy: restrict, soft delete, or cascade tenant-owned data.

### API Reliability and Validation
- [ ] Add schema validation for every `POST`, `PATCH`, and `PUT` endpoint, including auth, sources, ingestion, alerts, action generation, feedback, and report export.
- [ ] Normalize API error responses into one contract: `{ error, code?, details? }`.
- [ ] Return correct status codes for action generation failures, e.g. missing `OPENAI_API_KEY`, invalid alert/topic ownership, and provider timeout.
- [ ] Add pagination metadata consistently for list endpoints.
- [ ] Add integration tests for every frontend-facing endpoint listed in the contract table.

### Workspace and Product Endpoints
- [ ] Add a dedicated workspace settings endpoint for `/workspace/settings`, e.g. `GET /api/workspace/settings` and `PATCH /api/workspace/settings`.
- [ ] Add backend support for workspace members/team access if settings will manage users.

### Assignment, Notifications, and Escalation
- [ ] Add assignment fields or models for alerts/action plans: PIC, team, deadline, status, and escalation level.
- [ ] Add notification channel settings for WhatsApp-to-PIC and email first; keep Slack/Telegram optional.
- [ ] Add notification dispatch jobs for newly high-risk alerts, assignment changes, deadline reminders, and escalation changes.
- [ ] Add audit log entries for assignment changes, notification attempts, and escalation-level changes.
- [ ] Add API contracts for frontend assignment controls and notification settings once the data model is finalized.

### AI and Action Engine
- [ ] Add a non-AI fallback or explicit unavailable state for `POST /api/actions` when `OPENAI_API_KEY` is missing.
- [ ] Add provider timeout/retry policy for action generation.
- [ ] Store generation failure logs with workspace ID, strategy type, target IDs, provider error, and timestamp.
- [ ] Add strategy-specific response normalization so action plans always produce useful `outputs` and `plan` fields.
- [ ] Add tests for PR response, content strategy, influencer strategy, and crisis response action generation.

### Ingestion and Reporting
- [ ] Verify Apify/collector production configuration and document actor IDs/input schema.
- [ ] Add ingestion retry/backoff policy and job cancellation/timeout behavior.
- [ ] Ensure raw documents and signals have deterministic dedupe behavior per workspace.
- [ ] Finish report export storage implementation for production downloads, including signed URL expiration and cleanup.
- [ ] Add export worker tests for success, failed, and expired download cases.

### Security and Observability
- [ ] Add audit log entries for password change and sensitive workspace settings updates.
- [ ] Add request IDs and structured logging for API requests, worker jobs, and AI provider calls.
- [ ] Add rate limits to AI generation, report export, ingestion run, and feedback endpoints.
- [ ] Add basic metrics for endpoint latency, AI failures, ingestion failures, and export failures.
- [ ] Review CORS production allowlist before launch and replace broad preview settings if needed.

## Completed Backend Foundation
- [x] Auth module: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`.
- [x] Auth middleware: `verifyToken` for protected routes.
- [x] Sources module: `GET /sources`, `POST /sources`, `PATCH /sources/:sourceId`, `DELETE /sources/:sourceId`.
- [x] Sources module is scoped by workspace membership.
- [x] Ingestion module: `POST /ingestion/run/:sourceId`, `GET /ingestion/status/:jobId`.
- [x] Ingestion source and job status access is scoped by workspace membership.
- [x] Signals module: `GET /signals`, `GET /signals/:id`, `POST /signals/:id/analyze`.
- [x] Dashboard summary: `GET /dashboard/summary`.
- [x] Alerts module: `GET /api/alerts`, `GET /api/alerts/:id`, `PATCH /api/alerts/:id/status`.
- [x] CORS allows local frontend and Vercel preview domains.
- [x] Production database hardening migration added for tenant indexes, token uniqueness, report export uniqueness, and source update tracking.

---

## Priority 1: Frontend-Blocking Endpoints

These endpoints are already wired in the frontend and should be implemented first.

### 1. AI Visibility Endpoint
- [x] Implement `GET /api/visibility`.
- [x] Return a stable response shape compatible with `frontend/lib/api-service.ts#getVisibility()`.
- [x] Include `score` as number.
- [x] Include `presence` as percentage number.
- [x] Include `presenceMentions` as string or number shown in the UI.
- [x] Include `competitor` as percentage number.
- [x] Include `prompts[]` with `prompt`, `engine`, `brand`, `competitor`, `brandTone`, and `compTone`.
- [x] Include `geoActions[]` with `title`, `tag`, and optional `highlighted`.
- [x] Add Prisma model/table for AI visibility results and prompt test runs.
- [x] Add seed/demo rows so frontend is not empty in local development.

Acceptance criteria:
- [x] `/visibility` page renders backend data without falling back to mock data.
- [x] Empty state still works when there are no visibility records.
- [x] Response works for both English and Indonesian frontend labels.

### 2. Action Plans Endpoint
- [x] Implement `GET /api/action-plans`.
- [x] Return a stable response shape compatible with `frontend/lib/api-service.ts#getActionPlans()`.
- [x] Include `inputNarrative` as plain text summary.
- [x] Include `evidenceSummary` as plain text evidence line.
- [x] Include `outputs` as array of `[label, value]` pairs.
- [x] Include `plan` as array of `[step, time]` pairs.
- [x] Add Prisma model/table for action plans.
- [x] Add seed/demo action plan linked to high-risk alert or narrative.

Acceptance criteria:
- [x] `/action-plans` renders backend action plan data.
- [x] Feedback controls still work locally while feedback endpoint is pending.
- [x] Missing plan data returns a safe empty state, not a crash.

### 3. Reports Endpoint
- [x] Implement `GET /api/reports`.
- [x] Return a stable response shape compatible with `frontend/lib/api-service.ts#getReports()`.
- [x] Return `{ reports: [...] }`.
- [x] Each report should include `title`, `readiness`, `sections`, and `status`.
- [x] Add Prisma model/table for reports.
- [x] Add seed/demo reports for Weekly Brief, AI Visibility Movement, and Risk Review.

Acceptance criteria:
- [x] `/reports` table renders backend data.
- [x] Search/filter/pagination continue working on frontend.
- [x] Empty reports state is supported.

### 4. Narrative / Topic Map Endpoint
- [x] Implement `GET /api/narratives` or `GET /api/clusters`.
- [x] Decide one endpoint name and document it here. (`GET /api/narratives`)
- [x] Return topic clusters grouped from analyzed signals.
- [x] Include title, description, source count, confidence, impact, speed/velocity, and recommended focus.
- [x] Add Prisma model/table for narratives/clusters and signal relations.
- [x] Update frontend API service after endpoint name is finalized.

Acceptance criteria:
- [x] `/intelligence` can render backend topic data instead of static demo copy.
- [x] Topic detail panel has enough data for stakeholder review.

---

## Priority 2: Product Logic

### 5. AI Analysis Quality
- [x] Review and harden `analyzeSignal()` output.
- [x] Ensure AI output includes sentiment, narrative type, stakeholder, impact, summary, recommended action, and confidence score.
- [x] Add `validateAIOutput()` so malformed AI responses do not break persistence.
- [x] Add retry behavior with safe fallback for AI failures.
- [x] Store raw AI output for debugging when validation fails.

### 6. Predictive Alert Engine
- [x] Implement `detectAlerts()` to generate alerts from signals or narrative clusters.
- [x] Implement alert scoring using speed, sentiment, source strength, spread, time-to-impact, and confidence.
- [x] Implement `enhanceAlert()` for plain-language alert explanation.
- [x] Add alert background worker and queue integration.
- [x] Prevent duplicate alerts for the same topic/window.

### 7. Learning Loop and Feedback
- [x] Implement feedback endpoint for action suggestions.
- [x] Suggested endpoint: `POST /api/action-plans/:id/feedback`.
- [x] Support feedback values: `accepted`, `edited`, `rejected`.
- [x] Store reason/comment when feedback is edited or rejected.
- [x] Add Prisma model/table: `recommendation_feedback` or `ActionFeedback`. (Implemented via existing `AIFeedback` table)
- [x] Use feedback to improve future prompt scoring.

---

## Priority 3: Data and Operations

### 8. Source and Ingestion Hardening
- [x] Add workspace membership checks for source list/create/update/delete.
- [x] Add workspace membership checks before triggering ingestion.
- [x] Add workspace membership checks before reading ingestion job status.
- [x] Add soft delete for sources through `DELETE /sources/:sourceId` by setting `isActive=false`.
- [x] Verify `POST /sources` validates source type, name, actor ID, and input config.
- [x] Ensure ingestion jobs write raw documents and create signals consistently.
- [x] Add clear job status values: `queued`, `running`, `completed`, `failed`.
- [x] Store ingestion errors for frontend troubleshooting.
- [x] Add pagination and filtering for source records if the list grows.
- [x] Add database indexes for source, ingestion, raw document, and signal workspace queries.

### 9. Security and Auth
- [x] Ensure all protected endpoints use `verifyToken`.
- [x] Confirm frontend token format matches backend auth middleware.
- [x] Set access token expiration time explicitly, e.g. `15m`, `1h`, or another approved TTL.
- [x] Add refresh-token strategy if sessions need to last longer than the access token TTL.
- [x] Store refresh tokens securely, preferably hashed in the database if persistent sessions are required.
- [x] Add token revocation/logout support so old refresh tokens can be invalidated.
- [x] Return clear `401` responses when access tokens are expired or invalid.
- [x] Avoid silently accepting expired JWTs in `verifyToken`.
- [x] Add password hashing policy using `bcrypt` or equivalent with an approved salt round value.
- [x] Add password strength validation for registration and password updates.
- [x] Add rate limiting for `POST /auth/login` and `POST /auth/register` to reduce brute-force attempts.
- [x] Add account lockout or cooldown after repeated failed login attempts.
- [x] Do not expose whether an email exists during login errors; use generic invalid credential messages.
- [x] Add `GET /auth/me` response shape contract for frontend session validation.
- [x] Add optional `POST /auth/logout` endpoint if refresh tokens or server-side sessions are implemented.
- [x] Add optional `POST /auth/refresh` endpoint if refresh-token flow is implemented.
- [x] Add workspace scoping to protected queries.
- [x] Prevent users from reading another workspace's data.
- [ ] Add basic request validation for all POST/PATCH endpoints.
- [ ] Add audit log entries for login, logout, failed login, password change, and sensitive settings updates.
- [x] Review CORS origins and allowed headers before production deployment.
- [x] Ensure secrets like `JWT_SECRET`, refresh-token secret, and database credentials are loaded from environment variables only.
- [x] Add unique index for refresh token hashes.
- [x] Add audit log indexes for user/event lookup.

### 10. Reporting Export Jobs
- [x] Add report export job creation endpoint when ready.
- [x] Suggested endpoint: `POST /api/reports/:id/export`.
- [x] Add export job status endpoint.
- [x] Suggested endpoint: `GET /api/reports/exports/:jobId`.
- [x] Add signed download URL support when files are generated.
- [x] Add report export indexes and signed-token uniqueness.

### 11. Database Production Readiness
- [x] Add composite indexes for tenant-owned tables using `workspaceId` plus common filter/sort columns.
- [x] Add foreign-key lookup indexes for relation-heavy tables.
- [x] Add unique membership constraint: one `WorkspaceMember` per `userId` and `workspaceId`.
- [x] Add `Source.updatedAt` for source CRUD tracking.
- [x] Add deployable migration: `20260509050000_production_database_hardening`.
- [ ] Baseline existing local/production databases before running `prisma migrate deploy` if they were created before Prisma migration history.
- [ ] Decide long-term workspace deletion policy: restrict, soft delete, or cascade tenant data.
- [ ] Add optional Postgres RLS if any client ever connects directly to the database instead of only through the Node API.

---

## Frontend-Backend API Contract Summary

| Frontend Function | Backend Endpoint | Status |
| --- | --- | --- |
| `getDashboardSummary()` | `GET /api/dashboard/summary` | Ready |
| `login()` | `POST /auth/login` | Ready |
| `signup()` | `POST /auth/register` | Ready |
| `logout()` | `POST /auth/logout` | Ready |
| `refreshSession()` | `POST /auth/refresh` | Ready |
| `getCurrentUser()` | `GET /auth/me` | Ready |
| `getSignals()` | `GET /signals` | Ready |
| `getSignalById()` | `GET /signals/:id` | Ready |
| `getSources()` | `GET /sources` | Ready |
| `createSource()` | `POST /sources` | Ready |
| `updateSource()` | `PATCH /sources/:sourceId` | Ready |
| `deleteSource()` | `DELETE /sources/:sourceId` | Ready |
| `runSourceIngestion()` | `POST /ingestion/run/:sourceId` | Ready |
| `getIngestionStatus()` | `GET /ingestion/status/:jobId` | Ready |
| `getAlerts()` | `GET /api/alerts` | Ready |
| `updateAlertStatus()` | `PATCH /api/alerts/:id/status` | Ready |
| `getVisibility()` | `GET /api/visibility` | Ready |
| `getActionPlans()` | `GET /api/action-plans` | Ready |
| `createActionPlan()` | `POST /api/actions` | Ready; requires `OPENAI_API_KEY` |
| `getActionQueue()` | `GET /api/actions` | Ready |
| `submitActionPlanFeedback()` | `POST /api/action-plans/:id/feedback` | Ready |
| `getReports()` | `GET /api/reports` | Ready |
| `createReportExport()` | `POST /api/reports/:id/export` | Ready; storage must be production-verified |
| `getReportExportStatus()` | `GET /api/reports/exports/:jobId` | Ready; storage must be production-verified |
| `getNarratives()` | `GET /api/narratives` | Ready |

---

## Suggested Prisma Tables to Add

- [x] `AIVisibilityResult`
- [x] `PromptTestRun`
- [x] `ActionPlan`
- [x] `ActionFeedback` (implemented via `AIFeedback`)
- [x] `Report`
- [x] `ReportExport`
- [x] `Narrative` or `TopicCluster`
- [x] Join table between `Narrative` and `Signal` if using many-to-many clustering.

---

## Testing Checklist

- [ ] Run auth happy path: register, login, me.
- [ ] Test expired access token returns `401`.
- [ ] Test invalid JWT signature returns `401`.
- [ ] Test refresh-token flow if implemented.
- [ ] Test logout invalidates refresh token if implemented.
- [ ] Test repeated failed login attempts trigger rate limit or cooldown.
- [ ] Run source create, update, soft delete, and ingestion job flow.
- [ ] Test source and ingestion endpoints reject another workspace's records.
- [ ] Run signal list and signal detail with analysis.
- [ ] Run dashboard summary with empty and non-empty database.
- [ ] Run alerts list and status update.
- [ ] Run visibility endpoint with empty and seeded data.
- [ ] Run action plans endpoint with empty and seeded data.
- [ ] Run reports endpoint with empty and seeded data.
- [ ] Test all frontend pages against backend with `NEXT_PUBLIC_API_URL` set.
- [ ] Confirm frontend no longer falls back to mock data for implemented endpoints.
