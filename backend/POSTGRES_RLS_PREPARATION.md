# Optional Postgres RLS Preparation (Non-Enforcing)

This guide prepares the backend for optional PostgreSQL Row Level Security (RLS) in the future.

Important:
- This document does **not** require enabling RLS now.
- Current architecture can continue using API-layer workspace scoping.
- Use this only if direct DB access by clients/services is introduced later.

## Goals

- Provide a safe, staged path to RLS adoption.
- Avoid accidental lockout or data exposure.
- Keep production stable while testing policy behavior in staging.

---

## Current State (Recommended Today)

- Tenant isolation is enforced in application code (`workspaceId` scoping).
- DB users are trusted backend service identities.
- RLS is optional and currently disabled.

---

## Suggested Rollout Strategy

1. Prepare SQL migration files that are **disabled by default**.
2. Test policies in staging with production-like data.
3. Validate all service queries under RLS role assumptions.
4. Enable RLS table-by-table only when ready.
5. Keep rollback SQL ready.

---

## Required Concepts for RLS

To use workspace-level RLS, queries usually rely on a session variable, for example:

- `app.current_workspace_id`

Application/session must set it per request/transaction:

```sql
SELECT set_config('app.current_workspace_id', '<workspace-uuid>', true);
```

RLS policy can then compare table `workspace_id` to this setting.

---

## Optional Migration Examples

See:

- `prisma/migrations/examples_optional_rls/001_enable_rls_example.sql`
- `prisma/migrations/examples_optional_rls/002_disable_rls_rollback_example.sql`

These are examples only and are not part of active Prisma migration chain unless explicitly copied into a real migration.

---

## Safety Checklist Before Enabling

- [ ] Confirm all tenant-owned tables include `workspaceId`.
- [ ] Confirm service always sets workspace context for DB sessions.
- [ ] Validate read/write paths under RLS in staging.
- [ ] Ensure admin/ops workflows have explicit bypass role strategy.
- [ ] Prepare and test rollback SQL.

---

## Rollback Guidance

If RLS causes operational impact:

1. Disable RLS for affected tables.
2. Drop restrictive policies.
3. Re-validate application-level authorization.

Never enable RLS directly in production without a tested rollback plan.

