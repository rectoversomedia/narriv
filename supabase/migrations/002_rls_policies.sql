-- Narriv Row-Level Security Policies
-- Migration: 002_rls_policies.sql

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_cluster_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_failure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_visibility_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's workspace IDs
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS TABLE(workspace_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check workspace admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
          AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid());

-- ============================================
-- WORKSPACES POLICIES
-- ============================================

-- Users can view workspaces they are members of
CREATE POLICY "Users can view own workspaces"
    ON public.workspaces FOR SELECT
    USING (
        id IN (SELECT get_user_workspace_ids())
    );

-- Users can create workspaces
CREATE POLICY "Users can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (true);

-- Workspace admins can update workspaces
CREATE POLICY "Workspace admins can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (
        is_workspace_admin(id)
    );

-- ============================================
-- WORKSPACE MEMBERS POLICIES
-- ============================================

-- Users can view workspace members
CREATE POLICY "Users can view own workspace members"
    ON public.workspace_members FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Workspace admins can add members
CREATE POLICY "Workspace admins can add members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id)
    );

-- Workspace admins can remove members
CREATE POLICY "Workspace admins can remove members"
    ON public.workspace_members FOR DELETE
    USING (
        is_workspace_admin(workspace_id)
    );

-- ============================================
-- WORKSPACE SETTINGS POLICIES
-- ============================================

-- Users can view workspace settings
CREATE POLICY "Users can view workspace settings"
    ON public.workspace_settings FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Workspace admins can update settings
CREATE POLICY "Workspace admins can update settings"
    ON public.workspace_settings FOR UPDATE
    USING (
        is_workspace_admin(workspace_id)
    );

-- ============================================
-- SOURCES POLICIES
-- ============================================

-- Users can view workspace sources
CREATE POLICY "Users can view workspace sources"
    ON public.sources FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can create sources
CREATE POLICY "Users can create workspace sources"
    ON public.sources FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can update sources
CREATE POLICY "Users can update workspace sources"
    ON public.sources FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can soft-delete sources
CREATE POLICY "Users can delete workspace sources"
    ON public.sources FOR DELETE
    USING (
        is_workspace_admin(workspace_id)
    );

-- ============================================
-- SIGNALS POLICIES
-- ============================================

-- Users can view workspace signals
CREATE POLICY "Users can view workspace signals"
    ON public.signals FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can create signals
CREATE POLICY "Users can create workspace signals"
    ON public.signals FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can update signals
CREATE POLICY "Users can update workspace signals"
    ON public.signals FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- ALERTS POLICIES
-- ============================================

-- Users can view workspace alerts
CREATE POLICY "Users can view workspace alerts"
    ON public.alerts FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can create alerts
CREATE POLICY "Users can create workspace alerts"
    ON public.alerts FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can update alerts
CREATE POLICY "Users can update workspace alerts"
    ON public.alerts FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- REPORTS POLICIES
-- ============================================

-- Users can view workspace reports
CREATE POLICY "Users can view workspace reports"
    ON public.reports FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can create reports
CREATE POLICY "Users can create workspace reports"
    ON public.reports FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can update reports
CREATE POLICY "Users can update workspace reports"
    ON public.reports FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- ACTION PLANS POLICIES
-- ============================================

-- Users can view workspace action plans
CREATE POLICY "Users can view workspace action plans"
    ON public.action_plans FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can create action plans
CREATE POLICY "Users can create workspace action plans"
    ON public.action_plans FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can update action plans
CREATE POLICY "Users can update workspace action plans"
    ON public.action_plans FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- CASES POLICIES
-- ============================================

-- Users can view workspace cases
CREATE POLICY "Users can view workspace cases"
    ON public.cases FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can create cases
CREATE POLICY "Users can create workspace cases"
    ON public.cases FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Users can update cases
CREATE POLICY "Users can update workspace cases"
    ON public.cases FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.app_notifications FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- System can create notifications
CREATE POLICY "System can create notifications"
    ON public.app_notifications FOR INSERT
    WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications"
    ON public.app_notifications FOR UPDATE
    USING (
        user_id = auth.uid()
    );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Users can view workspace audit logs
CREATE POLICY "Users can view workspace audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- TOKEN USAGE POLICIES
-- ============================================

-- Users can view workspace token usage
CREATE POLICY "Users can view workspace token usage"
    ON public.token_usage FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- CROSS-TABLE POLICIES (for joins)
-- ============================================

-- Narrative clusters
CREATE POLICY "Users can view workspace narrative clusters"
    ON public.narrative_clusters FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Report templates
CREATE POLICY "Users can view workspace report templates"
    ON public.report_templates FOR SELECT
    USING (
        workspace_id IS NULL OR workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Integrations
CREATE POLICY "Users can view workspace integrations"
    ON public.integrations FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can manage workspace integrations"
    ON public.integrations FOR ALL
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Escalation matrices
CREATE POLICY "Users can view workspace escalation matrices"
    ON public.escalation_matrices FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can manage workspace escalation matrices"
    ON public.escalation_matrices FOR ALL
    USING (
        is_workspace_admin(workspace_id)
    );
