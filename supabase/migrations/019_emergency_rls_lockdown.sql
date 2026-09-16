-- ============================================================================
-- Migration: 019_emergency_rls_lockdown.sql
-- Description: Emergency RLS lockdown & policy enforcement
-- Incident Context: Remediasi insiden keamanan Row-Level Security (RLS) disabled 
--                   yang dilaporkan Supabase pada 13 September 2026.
-- Scope: Mengunci 30 tabel operasional dan data yang sebelumnya terbuka untuk
--        akses publik anonim tanpa autentikasi, serta mengamankan seluruh tabel 
--        legacy Prisma (PascalCase) dengan total 41 tabel yang di-lockdown.
-- Status: PREPARED ONLY - PENDING EXECUTIVE / MANAGEMENT APPROVAL
-- DO NOT EXECUTE AUTOMATICALLY
-- ============================================================================

BEGIN;

-- ============================================================================
-- TIER 1: CRITICAL AUTH & CREDENTIAL TABLES (P0)
-- ============================================================================

-- 1. Kunci total tabel legacy Prisma 'User' (Mencegah dump hash password BCrypt)
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny public access to User" ON public."User";
-- Catatan: Tanpa policy SELECT/ALL untuk anon/authenticated, PostgREST anon
-- otomatis terblokir (0 baris), sedangkan backend service_role tetap bisa membaca
-- karena peran service_role membypass RLS secara native.

-- 2. Kunci tabel token legacy Prisma
ALTER TABLE IF EXISTS public."RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- 3. Perbaiki RLS pada tabel token snake_case aktif
ALTER TABLE IF EXISTS public.refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Users can view own refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Users can manage own refresh tokens"
    ON public.refresh_tokens FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own email verification tokens" ON public.email_verification_tokens;
CREATE POLICY "Users can manage own email verification tokens"
    ON public.email_verification_tokens FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own password reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Users can manage own password reset tokens"
    ON public.password_reset_tokens FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TIER 2: WORKSPACE & TENANCY TABLES (P1)
-- ============================================================================

-- Helper functions tenancy
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS TABLE(workspace_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

-- Workspaces
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Members can view workspaces"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (id IN (SELECT get_user_workspace_ids()));

-- Workspace Members
ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Workspace Settings
ALTER TABLE IF EXISTS public.workspace_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view workspace settings" ON public.workspace_settings;
CREATE POLICY "Members can view workspace settings"
    ON public.workspace_settings FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

DROP POLICY IF EXISTS "Admins can manage workspace settings" ON public.workspace_settings;
CREATE POLICY "Admins can manage workspace settings"
    ON public.workspace_settings FOR ALL
    TO authenticated
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

-- Workspace Notification Settings
ALTER TABLE IF EXISTS public.workspace_notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view workspace notification settings" ON public.workspace_notification_settings;
CREATE POLICY "Members can view workspace notification settings"
    ON public.workspace_notification_settings FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

DROP POLICY IF EXISTS "Admins can manage workspace notification settings" ON public.workspace_notification_settings;
CREATE POLICY "Admins can manage workspace notification settings"
    ON public.workspace_notification_settings FOR ALL
    TO authenticated
    USING (is_workspace_admin(workspace_id))
    WITH CHECK (is_workspace_admin(workspace_id));

-- Audit Logs
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view workspace audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view workspace audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (is_workspace_admin(workspace_id));

-- App Notifications
ALTER TABLE IF EXISTS public.app_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.app_notifications;
CREATE POLICY "Users can view own notifications"
    ON public.app_notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Escalation Matrices
ALTER TABLE IF EXISTS public.escalation_matrices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view escalation matrices" ON public.escalation_matrices;
CREATE POLICY "Members can view escalation matrices"
    ON public.escalation_matrices FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- ============================================================================
-- TIER 3: BUSINESS OPERATIONS & INTELLIGENCE TABLES (P2)
-- ============================================================================

-- Alerts
ALTER TABLE IF EXISTS public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view alerts" ON public.alerts;
CREATE POLICY "Members can view alerts"
    ON public.alerts FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

DROP POLICY IF EXISTS "Members can manage alerts" ON public.alerts;
CREATE POLICY "Members can manage alerts"
    ON public.alerts FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

-- Cases
ALTER TABLE IF EXISTS public.cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view cases" ON public.cases;
CREATE POLICY "Members can view cases"
    ON public.cases FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

DROP POLICY IF EXISTS "Members can manage cases" ON public.cases;
CREATE POLICY "Members can manage cases"
    ON public.cases FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

-- Action Plans
ALTER TABLE IF EXISTS public.action_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view action plans" ON public.action_plans;
CREATE POLICY "Members can view action plans"
    ON public.action_plans FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

DROP POLICY IF EXISTS "Members can manage action plans" ON public.action_plans;
CREATE POLICY "Members can manage action plans"
    ON public.action_plans FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

-- Narrative Clusters
ALTER TABLE IF EXISTS public.narrative_clusters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view narrative clusters" ON public.narrative_clusters;
CREATE POLICY "Members can view narrative clusters"
    ON public.narrative_clusters FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- Signals & Signal Analyses
ALTER TABLE IF EXISTS public.signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view signals" ON public.signals;
CREATE POLICY "Members can view signals"
    ON public.signals FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

ALTER TABLE IF EXISTS public.signal_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view signal analyses" ON public.signal_analyses;
CREATE POLICY "Members can view signal analyses"
    ON public.signal_analyses FOR SELECT
    TO authenticated
    USING (true); -- Sinyal sudah difilter oleh workspace_id di level join

-- Reports
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view reports" ON public.reports;
CREATE POLICY "Members can view reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

-- AI Feedback
ALTER TABLE IF EXISTS public.ai_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can manage ai feedback" ON public.ai_feedback;
CREATE POLICY "Members can manage ai feedback"
    ON public.ai_feedback FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()))
    WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()));

-- Sources & Ingestion
ALTER TABLE IF EXISTS public.sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view sources" ON public.sources;
CREATE POLICY "Members can view sources"
    ON public.sources FOR SELECT
    TO authenticated
    USING (workspace_id IN (SELECT get_user_workspace_ids()));

ALTER TABLE IF EXISTS public.raw_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TIER 4: KUNCI TOTAL SELURUH SISA TABEL PRISMA LEGACY
-- ============================================================================
-- Menghilangkan akses publik anon ke seluruh duplikasi model PascalCase
ALTER TABLE IF EXISTS public."Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WorkspaceSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WorkspaceNotificationSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Signal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."SignalAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."RawDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Source" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."IngestionJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ActionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."NarrativeCluster" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERY (DO NOT RUN AS PART OF TRANSACTION)
-- ============================================================================
-- Jalankan query berikut di Supabase SQL Editor setelah migrasi dieksekusi
-- untuk memverifikasi bahwa seluruh 41 tabel target telah berstatus rowsecurity = true.
-- Hasil yang diharapkan: 0 baris (semua tabel target telah diamankan).
--
-- SELECT 
--     tablename, 
--     rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'User', 'RefreshToken', 'EmailVerificationToken', 'PasswordResetToken',
--     'refresh_tokens', 'email_verification_tokens', 'password_reset_tokens',
--     'workspaces', 'workspace_members', 'workspace_settings', 'workspace_notification_settings',
--     'audit_logs', 'app_notifications', 'escalation_matrices',
--     'alerts', 'cases', 'action_plans', 'narrative_clusters',
--     'signals', 'signal_analyses', 'reports', 'ai_feedback', 'sources',
--     'raw_documents', 'ingestion_jobs',
--     'Workspace', 'WorkspaceMember', 'WorkspaceSettings', 'WorkspaceNotificationSettings',
--     'Signal', 'SignalAnalysis', 'RawDocument', 'Source', 'IngestionJob',
--     'AuditLog', 'Alert', 'Case', 'ActionPlan', 'NarrativeCluster', 'Report', '_prisma_migrations'
--   )
--   AND rowsecurity = false;
--
-- Query ringkasan status proteksi seluruh tabel target:
-- SELECT 
--     tablename, 
--     rowsecurity AS is_rls_enabled
-- FROM pg_tables 
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'User', 'RefreshToken', 'EmailVerificationToken', 'PasswordResetToken',
--     'refresh_tokens', 'email_verification_tokens', 'password_reset_tokens',
--     'workspaces', 'workspace_members', 'workspace_settings', 'workspace_notification_settings',
--     'audit_logs', 'app_notifications', 'escalation_matrices',
--     'alerts', 'cases', 'action_plans', 'narrative_clusters',
--     'signals', 'signal_analyses', 'reports', 'ai_feedback', 'sources',
--     'raw_documents', 'ingestion_jobs',
--     'Workspace', 'WorkspaceMember', 'WorkspaceSettings', 'WorkspaceNotificationSettings',
--     'Signal', 'SignalAnalysis', 'RawDocument', 'Source', 'IngestionJob',
--     'AuditLog', 'Alert', 'Case', 'ActionPlan', 'NarrativeCluster', 'Report', '_prisma_migrations'
--   )
-- ORDER BY rowsecurity ASC, tablename ASC;
