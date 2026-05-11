# Production Migration Runbook

This runbook standardizes how to run Prisma migrations safely for:
- clean databases
- existing databases that were created before migration history

## 1) Pre-flight Checks

Run from `backend/`:

```bash
node check-db.js
```

If Redis queue is part of rollout validation:

```bash
node scratch/check-queue.js
```

## 2) Baseline Existing Database (Non-empty DB Without Prisma History)

Use this only for databases that already contain schema/data but do not have matching entries in `_prisma_migrations`.

1. Confirm the database already matches the intended schema revision.
2. Mark known migrations as applied using `prisma migrate resolve`.

Example:

```bash
npx prisma migrate resolve --applied 20260416083925_init
npx prisma migrate resolve --applied 20260417132744_init
npx prisma migrate resolve --applied 20260428033223_init
npx prisma migrate resolve --applied 20260509050000_production_database_hardening
```

Notes:
- Adjust migration IDs to match actual files in `prisma/migrations`.
- Do not run `resolve --applied` blindly if schema drift is unknown.

## 3) Run Migrations

For clean DB and baselined DB:

```bash
npx prisma migrate deploy
```

Then verify:

```bash
npx prisma migrate status
```

## 4) Runtime Health Verification

After deploy, verify runtime dependencies:

```bash
curl http://localhost:3000/health/runtime
```

Expected behavior:
- HTTP `200` when all required checks are healthy.
- HTTP `503` when one or more checks fail.
- Response contains service-level checks for database, queue, OpenAI, and ingestion provider.

## 5) Rollback Readiness

Before production deploy:
- ensure database backup/snapshot is created
- ensure restore steps are tested in staging
- ensure on-call owner is assigned for migration window
