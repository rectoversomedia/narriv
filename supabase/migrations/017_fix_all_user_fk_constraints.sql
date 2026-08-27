-- Migration: 017_fix_all_user_fk_constraints.sql
-- Fix ALL user_id FK constraints to explicitly reference public.users(id)
-- instead of auth.users(id).
--
-- PostgREST resolves unqualified FK references using its search_path,
-- which defaults to: auth, public, extensions, pg_catalog
-- This causes FK constraints on user_id columns to reference auth.users(id)
-- instead of public.users(id), breaking the app.
--
-- This migration drops and recreates each constraint with explicit schema.

BEGIN;

-- ==========================================
-- FIX: refresh_tokens.user_id
-- ==========================================
ALTER TABLE public.refresh_tokens
    DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey,
    ADD CONSTRAINT refresh_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

-- ==========================================
-- FIX: audit_logs.user_id
-- ==========================================
ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
    ADD CONSTRAINT audit_logs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL;

-- ==========================================
-- FIX: workspace_members.user_id
-- ==========================================
ALTER TABLE public.workspace_members
    DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey,
    ADD CONSTRAINT workspace_members_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

-- ==========================================
-- FIX: email_verification_tokens.user_id
-- ==========================================
ALTER TABLE public.email_verification_tokens
    DROP CONSTRAINT IF EXISTS email_verification_tokens_user_id_fkey,
    ADD CONSTRAINT email_verification_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

-- ==========================================
-- FIX: password_reset_tokens.user_id
-- ==========================================
ALTER TABLE public.password_reset_tokens
    DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey,
    ADD CONSTRAINT password_reset_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

-- ==========================================
-- FIX: oauth_accounts.user_id
-- ==========================================
ALTER TABLE public.oauth_accounts
    DROP CONSTRAINT IF EXISTS oauth_accounts_user_id_fkey,
    ADD CONSTRAINT oauth_accounts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

COMMIT;
