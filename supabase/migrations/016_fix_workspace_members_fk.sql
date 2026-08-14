-- Migration: 016_fix_workspace_members_fk.sql
-- Fix workspace_members.user_id FK to explicitly reference public.users(id)
-- The FK may have been created with search_path resolution that pointed to auth.users
-- instead of public.users. This migration drops and recreates the FK with explicit schema.

BEGIN;

-- Drop existing FK constraints on workspace_members that reference users
ALTER TABLE public.workspace_members
    DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey,
    ADD CONSTRAINT workspace_members_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

-- Also fix email_verification_tokens FK
ALTER TABLE public.email_verification_tokens
    DROP CONSTRAINT IF EXISTS email_verification_tokens_user_id_fkey,
    ADD CONSTRAINT email_verification_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;

-- Also fix audit_logs FK
ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
    ADD CONSTRAINT audit_logs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL;

COMMIT;
