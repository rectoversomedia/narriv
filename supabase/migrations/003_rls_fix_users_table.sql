-- Narriv RLS Fix Migration
-- Migration: 003_rls_fix_users_table.sql
-- SECURITY FIX: Correct RLS policies to use user_profiles instead of users

-- ============================================
-- DROP INCORRECT POLICIES ON public.users
-- ============================================

-- First, check if policies exist and drop them
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Disable RLS on the incorrect table (it shouldn't exist anyway)
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX workspace_settings vs workspaces_settings INCONSISTENCY
-- ============================================

-- The initial schema uses 'workspace_settings' but RLS/triggers use 'workspaces_settings'
-- Fix the triggers to use correct table name
DROP TRIGGER IF EXISTS update_workspace_settings_updated_at ON public.workspace_settings;

CREATE TRIGGER update_workspace_settings_updated_at
    BEFORE UPDATE ON public.workspace_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix RLS policies to use correct table name
DROP POLICY IF EXISTS "Users can view workspace settings" ON public.workspaces_settings;
DROP POLICY IF EXISTS "Workspace admins can update settings" ON public.workspaces_settings;
ALTER TABLE IF EXISTS public.workspaces_settings DISABLE ROW LEVEL SECURITY;

-- Enable RLS on correct table
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Create policies on correct table
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

-- Also create insert policy for settings
CREATE POLICY "Workspace admins can insert settings"
    ON public.workspace_settings FOR INSERT
    WITH CHECK (
        is_workspace_admin(workspace_id)
    );

-- ============================================
-- ENABLE RLS ON user_profiles TABLE
-- ============================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE CORRECT POLICIES FOR user_profiles
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (id = auth.uid());

-- Users can insert their own profile (for signup flow)
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================
-- ADDITIONAL SECURITY POLICIES
-- ============================================

-- Ensure users can only see their own refresh tokens
CREATE POLICY "Users can view own refresh tokens"
    ON public.refresh_tokens FOR SELECT
    USING (user_id = auth.uid());

-- Users can only manage their own refresh tokens
CREATE POLICY "Users can manage own refresh tokens"
    ON public.refresh_tokens FOR ALL
    USING (user_id = auth.uid());

-- OAuth accounts - users can only see their own
CREATE POLICY "Users can view own oauth accounts"
    ON public.oauth_accounts FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- NOTES
-- ============================================
-- The 'users' table should either:
-- 1. Be removed if not needed (Supabase uses auth.users)
-- 2. Or be renamed to user_profiles if it's a custom extension
--
-- This migration ensures RLS is correctly applied to user_profiles
-- which is the actual table referenced in backend/src/lib/supabase.js TABLE_MAP
