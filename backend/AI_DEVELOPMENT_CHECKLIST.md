# Backend AI Development Checklist

This checklist is the backend todo list for Narriv after the frontend is ready. Keep this file updated so backend and frontend development stay aligned.

## Current Frontend State
- Frontend UI is ready in light/dark mode with shadcn-style dashboard pages.
- Frontend supports English and Indonesian through `next-intl`.
- Frontend has safe mock fallback behavior when backend endpoints are not ready.
- Frontend already calls the backend contracts listed below.

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
- [ ] Implement `GET /api/reports`.
- [ ] Return a stable response shape compatible with `frontend/lib/api-service.ts#getReports()`.
- [ ] Return `{ reports: [...] }`.
- [ ] Each report should include `title`, `readiness`, `sections`, and `status`.
- [ ] Add Prisma model/table for reports.
- [ ] Add seed/demo reports for Weekly Brief, AI Visibility Movement, and Risk Review.

Acceptance criteria:
- [ ] `/reports` table renders backend data.
- [ ] Search/filter/pagination continue working on frontend.
- [ ] Empty reports state is supported.

### 4. Narrative / Topic Map Endpoint
- [ ] Implement `GET /api/narratives` or `GET /api/clusters`.
- [ ] Decide one endpoint name and document it here.
- [ ] Return topic clusters grouped from analyzed signals.
- [ ] Include title, description, source count, confidence, impact, speed/velocity, and recommended focus.
- [ ] Add Prisma model/table for narratives/clusters and signal relations.
- [ ] Update frontend API service after endpoint name is finalized.

Acceptance criteria:
- [ ] `/intelligence` can render backend topic data instead of static demo copy.
- [ ] Topic detail panel has enough data for stakeholder review.

---

## Priority 2: Product Logic

### 5. AI Analysis Quality
- [ ] Review and harden `analyzeSignal()` output.
- [ ] Ensure AI output includes sentiment, narrative type, stakeholder, impact, summary, recommended action, and confidence score.
- [ ] Add `validateAIOutput()` so malformed AI responses do not break persistence.
- [ ] Add retry behavior with safe fallback for AI failures.
- [ ] Store raw AI output for debugging when validation fails.

### 6. Predictive Alert Engine
- [ ] Implement `detectAlerts()` to generate alerts from signals or narrative clusters.
- [ ] Implement alert scoring using speed, sentiment, source strength, spread, time-to-impact, and confidence.
- [ ] Implement `enhanceAlert()` for plain-language alert explanation.
- [ ] Add alert background worker and queue integration.
- [ ] Prevent duplicate alerts for the same topic/window.

### 7. Learning Loop and Feedback
- [ ] Implement feedback endpoint for action suggestions.
- [ ] Suggested endpoint: `POST /api/action-plans/:id/feedback`.
- [ ] Support feedback values: `accepted`, `edited`, `rejected`.
- [ ] Store reason/comment when feedback is edited or rejected.
- [ ] Add Prisma model/table: `recommendation_feedback` or `ActionFeedback`.
- [ ] Use feedback to improve future prompt scoring.

---

## Priority 3: Data and Operations

### 8. Source and Ingestion Hardening
- [x] Add workspace membership checks for source list/create/update/delete.
- [x] Add workspace membership checks before triggering ingestion.
- [x] Add workspace membership checks before reading ingestion job status.
- [x] Add soft delete for sources through `DELETE /sources/:sourceId` by setting `isActive=false`.
- [ ] Verify `POST /sources` validates source type, name, actor ID, and input config.
- [ ] Ensure ingestion jobs write raw documents and create signals consistently.
- [ ] Add clear job status values: `queued`, `running`, `completed`, `failed`.
- [ ] Store ingestion errors for frontend troubleshooting.
- [ ] Add pagination and filtering for source records if the list grows.

### 9. Security and Auth
- [ ] Ensure all protected endpoints use `verifyToken`.
- [ ] Confirm frontend token format matches backend auth middleware.
- [ ] Set access token expiration time explicitly, e.g. `15m`, `1h`, or another approved TTL.
- [ ] Add refresh-token strategy if sessions need to last longer than the access token TTL.
- [ ] Store refresh tokens securely, preferably hashed in the database if persistent sessions are required.
- [ ] Add token revocation/logout support so old refresh tokens can be invalidated.
- [ ] Return clear `401` responses when access tokens are expired or invalid.
- [ ] Avoid silently accepting expired JWTs in `verifyToken`.
- [ ] Add password hashing policy using `bcrypt` or equivalent with an approved salt round value.
- [ ] Add password strength validation for registration and password updates.
- [ ] Add rate limiting for `POST /auth/login` and `POST /auth/register` to reduce brute-force attempts.
- [ ] Add account lockout or cooldown after repeated failed login attempts.
- [ ] Do not expose whether an email exists during login errors; use generic invalid credential messages.
- [ ] Add `GET /auth/me` response shape contract for frontend session validation.
- [ ] Add optional `POST /auth/logout` endpoint if refresh tokens or server-side sessions are implemented.
- [ ] Add optional `POST /auth/refresh` endpoint if refresh-token flow is implemented.
- [ ] Add workspace scoping to protected queries.
- [ ] Prevent users from reading another workspace's data.
- [ ] Add basic request validation for all POST/PATCH endpoints.
- [ ] Add audit log entries for login, logout, failed login, password change, and sensitive settings updates.
- [ ] Review CORS origins and allowed headers before production deployment.
- [ ] Ensure secrets like `JWT_SECRET`, refresh-token secret, and database credentials are loaded from environment variables only.

### 10. Reporting Export Jobs
- [ ] Add report export job creation endpoint when ready.
- [ ] Suggested endpoint: `POST /api/reports/:id/export`.
- [ ] Add export job status endpoint.
- [ ] Suggested endpoint: `GET /api/reports/exports/:jobId`.
- [ ] Add signed download URL support when files are generated.

---

## Frontend-Backend API Contract Summary

| Frontend Function | Backend Endpoint | Status |
| --- | --- | --- |
| `getDashboardSummary()` | `GET /dashboard/summary` | Ready |
| `login()` | `POST /auth/login` | Ready |
| `signup()` | `POST /auth/register` | Ready |
| `logout()` | `POST /auth/logout` | Optional if refresh tokens are used |
| `refreshSession()` | `POST /auth/refresh` | Optional if refresh tokens are used |
| `getCurrentUser()` | `GET /auth/me` | Ready |
| `getSignals()` | `GET /signals` | Ready |
| `getSignalById()` | `GET /signals/:id` | Ready |
| `getSources()` | `GET /sources` | Ready |
| `createSource()` | `POST /sources` | Ready |
| `updateSource()` | `PATCH /sources/:sourceId` | Backend ready; frontend helper pending |
| `deleteSource()` | `DELETE /sources/:sourceId` | Backend ready; frontend helper pending |
| `runSourceIngestion()` | `POST /ingestion/run/:sourceId` | Ready |
| `getIngestionStatus()` | `GET /ingestion/status/:jobId` | Ready |
| `getAlerts()` | `GET /api/alerts` | Ready |
| `updateAlertStatus()` | `PATCH /api/alerts/:id/status` | Ready |
| `getVisibility()` | `GET /api/visibility` | TODO |
| `getActionPlans()` | `GET /api/action-plans` | TODO |
| `getReports()` | `GET /api/reports` | TODO |
| `getNarratives()` | `GET /api/narratives` or `GET /api/clusters` | TODO |

---

## Suggested Prisma Tables to Add

- [x] `AIVisibilityResult`
- [x] `PromptTestRun`
- [x] `ActionPlan`
- [ ] `ActionFeedback`
- [ ] `Report`
- [ ] `ReportExport`
- [ ] `Narrative` or `TopicCluster`
- [ ] Join table between `Narrative` and `Signal` if using many-to-many clustering.

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
