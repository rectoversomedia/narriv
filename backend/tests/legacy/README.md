# Legacy test suites (quarantined)

These three suites were written when the backend used Prisma. They mock a
Prisma client (`mockPrisma.*`, `../src/prisma.js`), so they fail to load
against the current Supabase code and have provided no coverage since the
migration. They are excluded from the default Jest run by `jest.config.js`
and kept here for reference until every case is ported.

Run them explicitly (they will fail to load):
`NODE_ENV=test node --experimental-vm-modules ../node_modules/jest/bin/jest.js tests/legacy --testPathIgnorePatterns=/node_modules/`

## Ported (now running against tests/helpers/memory-db.js)

| Legacy case | Replacement |
|---|---|
| crud: workspace settings get/upsert + audit | `tests/crud-lifecycle.test.js` |
| crud: case lifecycle | `tests/crud-lifecycle.test.js` (assignedTeam is accepted but not stored: no column) |
| crud: integration lifecycle | `tests/crud-lifecycle.test.js` |
| crud: activity logs scope + event filter | `tests/crud-lifecycle.test.js` (also caught a production bug: the endpoint always returned an empty list) |
| crud: source lifecycle / inaccessible workspace | `tests/tenancy.test.js` |
| crud: alerts scope, status | `tests/tenancy.test.js`, `tests/alerts.test.js` |
| crud: members lifecycle, owner rules | `tests/trust.test.js` |
| crud: signals list / meta | `tests/trust.test.js`, `tests/tenancy.test.js` |
| actions-reports: report create/list/detail, validation | `tests/reports-actions.test.js` |
| actions-reports: action plan scope | `tests/reports-actions.test.js`, `tests/tenancy.test.js` |
| actions-reports: action plan generation | `tests/actions-generation.test.js` |
| actions-reports: reports/exports outside scope | `tests/tenancy.test.js` |
| workers: ai-analysis success / AI failure / budget | `tests/analysis-worker.test.js` (fallback and placeholder analyses removed) |

## Not yet ported (no current coverage)

- crud: Apify actor presets bootstrap; alert summary timeline; registered-email invite
  rejection; dashboard global activity; signal sentiment filter + limit cap.
- actions-reports: action-plan search/priority/workflow filters; AI feedback metrics;
  report export job status + signed download; report analytics format distribution.
- workers: ingestion worker (raw documents, Apify hints, cancel, retry, final failure),
  alert worker, notification worker. These BullMQ workers do not run on Vercel
  (scheduled ingestion runs in `/api/cron/ingest`), so they are lower priority.
