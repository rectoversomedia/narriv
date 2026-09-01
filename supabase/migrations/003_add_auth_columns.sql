-- Migration: Add missing auth columns + onboarding support tables
-- Required so the register and onboarding endpoints work in production

-- ============================================
-- AUTH COLUMNS (users table)
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email_login ON public.users(email);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT WITH CHECK (true);

-- ============================================
-- RLS HELPER FUNCTIONS (may be missing from 002)
-- ============================================

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

-- ============================================
-- WORKSPACE MEMBERS POLICY (service role insert)
-- ============================================

CREATE POLICY "Service can insert workspace members"
    ON public.workspace_members FOR INSERT WITH CHECK (true);

-- ============================================
-- ONBOARDING SUPPORT TABLES
-- ============================================

-- Add onboarding columns to workspaces table
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Monitoring keywords table (used by onboarding)
CREATE TABLE IF NOT EXISTS public.monitoring_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, keyword)
);

-- Onboarding progress table (used by completeOnboarding)
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    completed_steps TEXT[] DEFAULT '{}',
    setup_completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERT policy for monitoring_keywords (for onboarding flow)
CREATE POLICY "Service can insert monitoring keywords"
    ON public.monitoring_keywords FOR INSERT
    WITH CHECK (true);

-- INSERT policy for onboarding_progress (for onboarding flow)
CREATE POLICY "Service can insert onboarding progress"
    ON public.onboarding_progress FOR INSERT
    WITH CHECK (true);

-- RLS: monitoring_keywords (users can see/manage their workspace's keywords)
ALTER TABLE public.monitoring_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace keywords"
    ON public.monitoring_keywords FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can insert monitoring keywords"
    ON public.monitoring_keywords FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- RLS: onboarding_progress (users can manage their workspace's onboarding)
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace onboarding progress"
    ON public.onboarding_progress FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can insert onboarding progress"
    ON public.onboarding_progress FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can update own workspace onboarding progress"
    ON public.onboarding_progress FOR UPDATE
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- ============================================
-- WORKSPACE & INGESTION POLICIES
-- ============================================

-- Allow workspace owners/admins to update onboarding status
CREATE POLICY "Users can update own workspace onboarding status"
    ON public.workspaces FOR UPDATE
    USING (
        is_workspace_admin(id)
    );

-- Allow users to insert ingestion jobs for their workspace
CREATE POLICY "Users can insert ingestion jobs"
    ON public.ingestion_jobs FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- Allow workspace admins to insert workspace settings (used by onboarding)
CREATE POLICY "Users can insert workspace settings"
    ON public.workspace_settings FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id)
    );

-- Allow workspace admins to insert notification settings (used by onboarding)
CREATE POLICY "Users can insert workspace notification settings"
    ON public.workspace_notification_settings FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id)
    );
