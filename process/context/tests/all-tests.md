# Narriv - All Tests

Last updated: 2026-06-02

Attach this file when a task involves testing, verification, or test debugging.

---

## Scope

This file covers:

- runner selection
- package-specific commands
- current test infrastructure
- known testing gaps and debugging notes

## Quick Decision Guide

### Use backend Jest/Supertest when

- validating Express API endpoints
- testing auth, CRUD, validation, and controller behavior
- adding focused integration tests that can mock Prisma/Redis/BullMQ/OpenAI

### Use frontend Playwright when

- validating real browser navigation, route protection, auth redirects, dashboard rendering, or cross-page user flows
- checking responsive behavior or browser-only UI interactions

### Use manual Docker/local verification when

- testing Redis/BullMQ workers, scheduled jobs, container health checks, or real PostgreSQL/Redis integration
- debugging environment-specific behavior that mocks cannot reproduce

## Commands

| Package | Runner | Command | Notes |
|---|---|---|---|
| `backend` | Jest + Supertest | `npm test` | Runs ESM Jest through `node --experimental-vm-modules`; current tests mock Prisma/queues/workers/logging. |
| `backend` | Jest single file | `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/auth.test.js` | Useful for focused debugging; run from `backend/`. |
| `backend` | k6 load smoke | `npm run load:smoke` | Requires a running backend server and k6 installed. Uses `BASE_URL`, `ACCESS_TOKEN`, or `LOAD_TEST_EMAIL`/`LOAD_TEST_PASSWORD`. |
| `backend` | k6 load baseline/stress | `npm run load:baseline` / `npm run load:stress` | Requires live backend dependencies; do not run stress against shared production without approval. |
| `frontend` | ESLint | `npm run lint` | Next/ESLint lint command. |
| `frontend` | Playwright | `npm run e2e` | Runs Playwright tests; may need app/server setup depending on spec configuration. |
| `frontend` | Playwright UI | `npm run e2e:ui` | Interactive Playwright runner. |
| `frontend` | Next build | `npm run build` | Production build verification. |

There is no root test command because this repo has separate `frontend/` and `backend/` packages.

## Backend Test Notes

- Backend uses ESM, so Jest runs through `node --experimental-vm-modules`.
- `backend/jest.config.js` disables transforms and uses Node environment.
- `backend/tests/setup.js` mocks Redis, cache utilities, BullMQ queue scheduling, worker imports, rate-limit middleware, and logger output.
- `backend/tests/auth.test.js`, `backend/tests/auth-security.test.js`, `backend/tests/crud.test.js`, `backend/tests/ingestion.test.js`, and `backend/tests/actions-reports.test.js` use Supertest directly against the exported Express `app`; the backend dev server does not need to be running.
- `backend/src/index.js` exports `app` and skips `app.listen()` when `NODE_ENV === "test"`.
- Auth, auth/security, CRUD, ingestion, action, feedback, and report endpoint tests use mocked Prisma data. They do not currently require a running PostgreSQL database.
- `backend/tests/auth-security.test.js` covers missing/expired/invalid access tokens, invalid refresh tokens, protected route token enforcement, and workspace-scoped source isolation.
- `backend/tests/auth.test.js` covers forgot-password, verify-reset-code, and reset-password behavior, including generic unknown-email response and invalid code/token rejection.
- `backend/tests/crud.test.js` covers source lifecycle, alert list/detail/status/assignment, workspace settings, workspace members including registered-user email invites, case lifecycle, and integration lifecycle with workspace-scoped mocks.
- `backend/tests/ingestion.test.js` covers ingestion job creation/enqueue, status lookup, cancellation, terminal-state rejection, and workspace scoping.
- `backend/tests/actions-reports.test.js` covers action generation/list/detail/assignment/feedback, general feedback prompt scoring, report create/list/detail, export status, and signed export download.
- `backend/tests/production-hardening.test.js` covers production HTTPS enforcement and production CORS origin allowlist behavior.
- `backend/tests/workers.test.js` mocks `bullmq.Worker` to capture processors directly; it covers ingestion worker processing/cancellation/retry/final-failure, AI analysis persistence/fallback failure logs, alert detection/escalation dispatch with partial workspace failure recovery, and notification event dispatch/unknown-event failure.
- `backend/tests/load/api.k6.js` is the live HTTP load-test skeleton with smoke, baseline, and stress profiles. It needs a running backend server and k6 installed; Jest does not run it.
- Local k6 smoke, baseline, and stress profiles were run against the localhost backend and reported passing. Detailed k6 result artifacts are not stored in the repo.
- `backend/src/workers/ingestion.worker.js` handles jobs already marked `cancelled` before worker start as `{ processedCount: 0, cancelled: true }` instead of failing the job.
- `npm test` exits cleanly after Redis/cache runtime handles are mocked in test setup.
- Security checks run during hardening: raw-query scan found no unsafe Prisma raw calls; `npm audit --audit-level=high` reports 0 vulnerabilities after `npm audit fix`.

## Frontend Test Notes

- Frontend is Next.js `16.2.4`; check local Next docs before changing framework-specific test setup or routing conventions.
- Playwright exists in dependencies and scripts, but current E2E coverage should be inspected before relying on it as a full regression suite.
- For UI changes, also run or inspect `npm run build` when touching server/client boundaries, dynamic imports, or route structure.

## Default Verification Order

Unless the task clearly needs a different path:

1. run the narrowest test for the changed package
2. run related lint/build checks for frontend changes
3. run broader package tests if the change touches shared behavior
4. use Docker/manual verification for Redis, worker, or full-stack behavior

## Known Gaps

- Backend API endpoint coverage is broad for current Phase 6 scope, including targeted auth/security negative cases; add focused endpoint coverage as new routes are introduced.
- Backend worker failure/retry coverage exists for current worker processors; add new matrix cases as worker behavior changes.
- Backend load test skeleton exists and localhost smoke/baseline/stress execution has passed; deeper DB-scale, queue-volume, and memory-profile load tests are still pending.
- Frontend Playwright coverage includes smoke checks for auth redirects/login controls plus workspace checks for Activity Log, Integrations CRUD/status/disconnect, and Settings logo upload. It is still not comprehensive across all dashboard CRUD flows.
- Reset-password backend flow exists and frontend pages call it; production email delivery is still a provider integration gap, so local/dev testing uses exposed reset code responses outside production.
