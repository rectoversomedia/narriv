-- OPTIONAL EXAMPLE ONLY
-- Rollback template for the optional RLS example.

-- Drop policies first
DROP POLICY IF EXISTS source_workspace_isolation_policy ON "Source";
DROP POLICY IF EXISTS signal_workspace_isolation_policy ON "Signal";
DROP POLICY IF EXISTS alert_workspace_isolation_policy ON "Alert";
DROP POLICY IF EXISTS report_workspace_isolation_policy ON "Report";
DROP POLICY IF EXISTS actionplan_workspace_isolation_policy ON "ActionPlan";

-- Disable RLS
ALTER TABLE "Source" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Signal" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionPlan" DISABLE ROW LEVEL SECURITY;

