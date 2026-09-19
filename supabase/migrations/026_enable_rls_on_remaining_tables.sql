-- Migration 026: Enable Row-Level Security on Remaining Operational Tables
-- Security incident follow-up and Phase 5 hardening

-- 1. Enable RLS on operational tables
ALTER TABLE IF EXISTS public.ai_visibility_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prompt_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_analysis_failure_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.narrative_cluster_signals ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on PascalCase legacy residues if present
ALTER TABLE IF EXISTS public."AIAnalysisFailureLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AIFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AIVisibilityResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AppNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."EscalationMatrix" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."GeneratedAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PromptTestRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."NarrativeClusterSignal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."TokenUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ReportExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."OAuthAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ReportTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ReportSchedule" ENABLE ROW LEVEL SECURITY;

-- 3. Tenant isolation policies for workspace-scoped tables
DO $$ 
BEGIN
    -- ai_visibility_results
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_visibility_results' AND policyname = 'Users can access ai_visibility_results in their workspace') THEN
        CREATE POLICY "Users can access ai_visibility_results in their workspace"
        ON public.ai_visibility_results
        FOR ALL
        TO authenticated
        USING (
            workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
        WITH CHECK (
            workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        );
    END IF;

    -- prompt_test_runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompt_test_runs' AND policyname = 'Users can access prompt_test_runs in their workspace') THEN
        CREATE POLICY "Users can access prompt_test_runs in their workspace"
        ON public.prompt_test_runs
        FOR ALL
        TO authenticated
        USING (
            workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
        WITH CHECK (
            workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        );
    END IF;

    -- integrations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'integrations' AND policyname = 'Users can access integrations in their workspace') THEN
        CREATE POLICY "Users can access integrations in their workspace"
        ON public.integrations
        FOR ALL
        TO authenticated
        USING (
            workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
        WITH CHECK (
            workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;
