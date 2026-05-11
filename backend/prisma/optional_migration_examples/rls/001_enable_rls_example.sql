-- OPTIONAL EXAMPLE ONLY
-- This file is NOT auto-applied by Prisma migrate deploy.
-- Copy/adapt into a real migration only when RLS rollout is approved.

-- 1) Enable RLS on tenant-owned tables (example subset)
ALTER TABLE "Source" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionPlan" ENABLE ROW LEVEL SECURITY;

-- 2) Example policy pattern: workspace isolation via session setting
-- Requires: set_config('app.current_workspace_id', '<uuid>', true)
CREATE POLICY source_workspace_isolation_policy
ON "Source"
USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

CREATE POLICY signal_workspace_isolation_policy
ON "Signal"
USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

CREATE POLICY alert_workspace_isolation_policy
ON "Alert"
USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

CREATE POLICY report_workspace_isolation_policy
ON "Report"
USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

CREATE POLICY actionplan_workspace_isolation_policy
ON "ActionPlan"
USING ("workspaceId"::text = current_setting('app.current_workspace_id', true))
WITH CHECK ("workspaceId"::text = current_setting('app.current_workspace_id', true));

-- 3) (Optional) Force RLS is intentionally NOT enabled in this example.
-- ALTER TABLE "Source" FORCE ROW LEVEL SECURITY;

