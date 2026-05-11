# Prisma Production Baseline Workflow

This document explains how to safely run Prisma migrations in production, especially when the database already exists before Prisma migration history was introduced.

## Why This Matters

`prisma migrate deploy` assumes migration history in `_prisma_migrations` is accurate.  
If production schema exists but migration history is missing/incomplete, deploy can fail or try to apply already-existing changes.

## Core Concepts

### 1) `prisma migrate deploy`

Use this command in CI/CD or production runtime:

```bash
npx prisma migrate deploy
```

What it does:
- reads migration files in `prisma/migrations`
- applies only migrations not yet recorded in `_prisma_migrations`
- does not create new migrations

Use `deploy` in production, not `migrate dev`.

### 2) Baselining

Baselining means marking existing migrations as already applied **without re-running SQL**, used when:
- DB schema already matches current app state
- migration history table is missing/out-of-sync

Command pattern:

```bash
npx prisma migrate resolve --applied <migration_id>
```

This writes migration records into `_prisma_migrations` so future `migrate deploy` is safe and incremental.

### 3) Production Migration Safety

Safe migration rollout requires:
- backup/snapshot before deploy
- schema drift check before baseline/deploy
- dry run in staging with production-like data
- clear rollback plan

---

## Recommended Production Workflow

### Step 1: Pre-flight Validation

1. Confirm environment variables:
- `DATABASE_URL`
- app secrets

2. Verify DB connectivity:

```bash
node check-db.js
```

3. Check current migration status:

```bash
npx prisma migrate status
```

### Step 2: Decide Path (Clean vs Existing DB)

#### Path A: Clean database

Run:

```bash
npx prisma migrate deploy
```

No baseline needed.

#### Path B: Existing database without migration history

1. Confirm schema is aligned with intended migration chain.
2. Mark historical migrations as applied:

```bash
npx prisma migrate resolve --applied <migration_id_1>
npx prisma migrate resolve --applied <migration_id_2>
# ...repeat for all historical migrations that already exist in DB
```

3. Then run:

```bash
npx prisma migrate deploy
```

### Step 3: Post-deploy Verification

1. Confirm migration state:

```bash
npx prisma migrate status
```

2. Run runtime health checks:
- `GET /health`
- `GET /health/runtime`

3. Smoke test critical APIs and workers.

---

## Baselining Rules and Guardrails

- Never baseline blindly. Validate schema parity first.
- Baseline only migrations whose SQL effects already exist in DB.
- Do not baseline future migrations that are not actually present yet.
- Record every baseline action in deployment notes/change log.

---

## Rollback Guidance

Prisma does not provide automatic down migrations for production by default.  
Use operational rollback strategy:

1. Restore DB snapshot/backup.
2. Redeploy previous app version if needed.
3. Re-check `migrate status`.

If manual SQL hotfix is used, document it and reconcile migration history.

---

## Example Safety Checklist (Production)

- [ ] Backup created and restore tested
- [ ] `migrate status` reviewed
- [ ] Baselining plan reviewed by owner
- [ ] `migrate deploy` executed in staging first
- [ ] Production deploy window and on-call owner assigned
- [ ] Post-deploy health checks passed
- [ ] Critical endpoints and queues smoke-tested

