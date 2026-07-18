-- ============================================
-- Migration: 014_rls_complete.sql
-- COMPLETE RLS POLICIES - Security Hardening
-- ============================================
-- This migration adds comprehensive RLS policies to ALL tables
-- Fixes: 15 tables without RLS + 10 tables with incomplete RLS

BEGIN;

-- ============================================
-- ENABLE RLS ON TABLES WITHOUT IT
-- ============================================

-- Enable RLS where not already enabled
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_failure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_visibility_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_cluster_signals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INGESTION_JOBS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view ingestion jobs"
    ON public.ingestion_jobs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create ingestion jobs"
    ON public.ingestion_jobs FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ingestion jobs"
    ON public.ingestion_jobs FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ingestion jobs"
    ON public.ingestion_jobs FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- RAW_DOCUMENTS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view raw documents"
    ON public.raw_documents FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create raw documents"
    ON public.raw_documents FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update raw documents"
    ON public.raw_documents FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete raw documents"
    ON public.raw_documents FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- SIGNAL_ANALYSES RLS POLICIES
-- ============================================

CREATE POLICY "Users can view signal analyses"
    ON public.signal_analyses FOR SELECT
    USING (
        signal_id IN (
            SELECT s.id FROM public.signals s
            JOIN public.workspace_members wm ON s.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create signal analyses"
    ON public.signal_analyses FOR INSERT
    WITH CHECK (
        signal_id IN (
            SELECT s.id FROM public.signals s
            JOIN public.workspace_members wm ON s.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

-- ============================================
-- REPORT_EXPORTS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view report exports"
    ON public.report_exports FOR SELECT
    USING (
        report_id IN (
            SELECT r.id FROM public.reports r
            JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create report exports"
    ON public.report_exports FOR INSERT
    WITH CHECK (
        report_id IN (
            SELECT r.id FROM public.reports r
            JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete report exports"
    ON public.report_exports FOR DELETE
    USING (
        report_id IN (
            SELECT r.id FROM public.reports r
            JOIN public.workspace_members wm ON r.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

-- ============================================
-- REPORT_SCHEDULES RLS POLICIES
-- ============================================

CREATE POLICY "Users can view report schedules"
    ON public.report_schedules FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create report schedules"
    ON public.report_schedules FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update report schedules"
    ON public.report_schedules FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete report schedules"
    ON public.report_schedules FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- GENERATED_ASSETS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view generated assets"
    ON public.generated_assets FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create generated assets"
    ON public.generated_assets FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update generated assets"
    ON public.generated_assets FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete generated assets"
    ON public.generated_assets FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- AI_FEEDBACK RLS POLICIES
-- ============================================

CREATE POLICY "Users can view ai feedback"
    ON public.ai_feedback FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create ai feedback"
    ON public.ai_feedback FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ai feedback"
    ON public.ai_feedback FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ai feedback"
    ON public.ai_feedback FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- AI_ANALYSIS_FAILURE_LOGS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view ai analysis failure logs"
    ON public.ai_analysis_failure_logs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert ai analysis failure logs"
    ON public.ai_analysis_failure_logs FOR INSERT
    WITH CHECK (true); -- System insertion allowed

-- ============================================
-- AI_VISIBILITY_RESULTS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view ai visibility results"
    ON public.ai_visibility_results FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create ai visibility results"
    ON public.ai_visibility_results FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ai visibility results"
    ON public.ai_visibility_results FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ai visibility results"
    ON public.ai_visibility_results FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- PROMPT_TEST_RUNS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view prompt test runs"
    ON public.prompt_test_runs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create prompt test runs"
    ON public.prompt_test_runs FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update prompt test runs"
    ON public.prompt_test_runs FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete prompt test runs"
    ON public.prompt_test_runs FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- MONITORING_KEYWORDS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view monitoring keywords"
    ON public.monitoring_keywords FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create monitoring keywords"
    ON public.monitoring_keywords FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update monitoring keywords"
    ON public.monitoring_keywords FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete monitoring keywords"
    ON public.monitoring_keywords FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- SOURCE_TEMPLATES RLS POLICIES
-- ============================================

-- Source templates are system-level, visible to all authenticated users
CREATE POLICY "Users can view source templates"
    ON public.source_templates FOR SELECT
    USING (true);

-- ============================================
-- WORKSPACE_SOURCES RLS POLICIES
-- ============================================

CREATE POLICY "Users can view workspace sources"
    ON public.workspace_sources FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspace sources"
    ON public.workspace_sources FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workspace sources"
    ON public.workspace_sources FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete workspace sources"
    ON public.workspace_sources FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- ONBOARDING_PROGRESS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view onboarding progress"
    ON public.onboarding_progress FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create onboarding progress"
    ON public.onboarding_progress FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update onboarding progress"
    ON public.onboarding_progress FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- NARRATIVE_CLUSTER_SIGNALS RLS POLICIES
-- ============================================

CREATE POLICY "Users can view narrative cluster signals"
    ON public.narrative_cluster_signals FOR SELECT
    USING (
        cluster_id IN (
            SELECT nc.id FROM public.narrative_clusters nc
            JOIN public.workspace_members wm ON nc.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create narrative cluster signals"
    ON public.narrative_cluster_signals FOR INSERT
    WITH CHECK (
        cluster_id IN (
            SELECT nc.id FROM public.narrative_clusters nc
            JOIN public.workspace_members wm ON nc.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete narrative cluster signals"
    ON public.narrative_cluster_signals FOR DELETE
    USING (
        cluster_id IN (
            SELECT nc.id FROM public.narrative_clusters nc
            JOIN public.workspace_members wm ON nc.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );

-- ============================================
-- FIX INCOMPLETE RLS POLICIES
-- ============================================

-- OAuth Accounts - Add missing INSERT policy
CREATE POLICY "Users can create oauth accounts"
    ON public.oauth_accounts FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- OAuth Accounts - Add missing UPDATE policy
CREATE POLICY "Users can update oauth accounts"
    ON public.oauth_accounts FOR UPDATE
    USING (user_id = auth.uid());

-- OAuth Accounts - Add missing DELETE policy
CREATE POLICY "Users can delete oauth accounts"
    ON public.oauth_accounts FOR DELETE
    USING (user_id = auth.uid());

-- Workspace Members - Add UPDATE policy for role changes
CREATE POLICY "Workspace admins can update member roles"
    ON public.workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Narrative Clusters - Add missing INSERT policy
CREATE POLICY "Users can create narrative clusters"
    ON public.narrative_clusters FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Narrative Clusters - Add missing UPDATE policy
CREATE POLICY "Users can update narrative clusters"
    ON public.narrative_clusters FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Narrative Clusters - Add missing DELETE policy
CREATE POLICY "Users can delete narrative clusters"
    ON public.narrative_clusters FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Report Templates - Add missing INSERT policy
CREATE POLICY "Users can create report templates"
    ON public.report_templates FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Report Templates - Add missing UPDATE policy (exclude system templates)
CREATE POLICY "Users can update report templates"
    ON public.report_templates FOR UPDATE
    USING (
        (is_system = false OR is_system IS NULL) AND
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Report Templates - Add missing DELETE policy (exclude system templates)
CREATE POLICY "Users can delete report templates"
    ON public.report_templates FOR DELETE
    USING (
        (is_system = false OR is_system IS NULL) AND
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Webhook Deliveries - Add missing UPDATE policy
CREATE POLICY "System can update webhook deliveries"
    ON public.webhook_deliveries FOR UPDATE
    USING (true); -- System updates allowed

-- Webhook Deliveries - Add missing DELETE policy
CREATE POLICY "System can delete webhook deliveries"
    ON public.webhook_deliveries FOR DELETE
    USING (true); -- System deletion allowed

-- Token Usage - Add INSERT policy for tracking
CREATE POLICY "System can insert token usage"
    ON public.token_usage FOR INSERT
    WITH CHECK (true); -- System insertion allowed

-- App Notifications - Add missing DELETE policy
CREATE POLICY "Users can delete notifications"
    ON public.app_notifications FOR DELETE
    USING (user_id = auth.uid());

-- Password Reset Tracking - Add INSERT policy for system
CREATE POLICY "System can create password reset tracking"
    ON public.password_reset_tracking FOR INSERT
    WITH CHECK (true); -- System insertion allowed

-- Password Reset Tracking - Add UPDATE policy for system
CREATE POLICY "System can update password reset tracking"
    ON public.password_reset_tracking FOR UPDATE
    USING (true); -- System updates allowed

-- Password Reset Tracking - Add DELETE policy for cleanup
CREATE POLICY "System can delete password reset tracking"
    ON public.password_reset_tracking FOR DELETE
    USING (true); -- System deletion allowed

COMMIT;
