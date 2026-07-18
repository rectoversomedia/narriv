-- Narriv RLS Fix Migration
-- Migration: 003b_rls_fix_users_table.sql
-- SECURITY FIX: Correct workspace_settings policies

-- ============================================
-- FIX workspace_settings vs workspaces_settings INCONSISTENCY
-- ============================================

-- The initial schema uses 'workspace_settings' but there were references to 'workspaces_settings'
-- This migration ensures all references use the correct table name

-- Drop any incorrect triggers on wrong table name (ignore if doesn't exist)
DROP TRIGGER IF EXISTS update_workspace_settings_updated_at ON public.workspaces_settings;

-- Fix RLS policies to use correct table name (ignore errors if don't exist)
DROP POLICY IF EXISTS "Users can view workspace settings" ON public.workspaces_settings;
DROP POLICY IF EXISTS "Workspace admins can update settings" ON public.workspaces_settings;
ALTER TABLE IF EXISTS public.workspaces_settings DISABLE ROW LEVEL SECURITY;

-- Ensure workspace_settings has RLS enabled (may already be enabled)
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for clean recreation)
DROP POLICY IF EXISTS "Users can view workspace settings" ON public.workspace_settings;
DROP POLICY IF EXISTS "Workspace admins can update settings" ON public.workspace_settings;
DROP POLICY IF EXISTS "Workspace admins can insert settings" ON public.workspace_settings;

-- Create correct policies on workspace_settings
CREATE POLICY "Users can view workspace settings"
    ON public.workspace_settings FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Workspace admins can update settings"
    ON public.workspace_settings FOR UPDATE
    USING (
        is_workspace_admin(workspace_id)
    );

CREATE POLICY "Workspace admins can insert settings"
    ON public.workspace_settings FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id)
    );

-- Also fix workspace_notification_settings policies if needed
ALTER TABLE public.workspace_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notification settings" ON public.workspace_notification_settings;
DROP POLICY IF EXISTS "Workspace admins can manage notification settings" ON public.workspace_notification_settings;

CREATE POLICY "Users can view notification settings"
    ON public.workspace_notification_settings FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Workspace admins can manage notification settings"
    ON public.workspace_notification_settings FOR ALL
    USING (
        is_workspace_admin(workspace_id)
    );

-- ============================================
-- REFRESH TOKENS POLICIES
-- ============================================

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Users can manage own refresh tokens" ON public.refresh_tokens;

CREATE POLICY "Users can view own refresh tokens"
    ON public.refresh_tokens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own refresh tokens"
    ON public.refresh_tokens FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- OAUTH ACCOUNTS POLICIES
-- ============================================

ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own oauth accounts" ON public.oauth_accounts;

CREATE POLICY "Users can view own oauth accounts"
    ON public.oauth_accounts FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- PASSWORD RESET TOKENS POLICIES
-- ============================================

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own password reset tokens" ON public.password_reset_tokens;

CREATE POLICY "Users can manage own password reset tokens"
    ON public.password_reset_tokens FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- EMAIL VERIFICATION TOKENS POLICIES
-- ============================================

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own email verification tokens" ON public.email_verification_tokens;

CREATE POLICY "Users can manage own email verification tokens"
    ON public.email_verification_tokens FOR ALL
    USING (user_id = auth.uid());
