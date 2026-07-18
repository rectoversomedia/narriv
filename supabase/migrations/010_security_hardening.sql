-- Narriv Security Hardening
-- Migration: 009_security_hardening.sql

-- ============================================
-- PASSWORD HISTORY TABLE
-- ============================================
-- Stores hashed previous passwords to prevent reuse

CREATE TABLE IF NOT EXISTS public.password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
CREATE INDEX IF NOT EXISTS idx_password_history_user ON public.password_history(user_id);
);

-- RLS for password history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own password history (for display purposes)
CREATE POLICY "Users can view own password history"
    ON public.password_history FOR SELECT
    USING (user_id = auth.uid());

-- System can insert password history
CREATE POLICY "System can insert password history"
    ON public.password_history FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- PASSWORD RESET REQUEST TRACKING
-- ============================================
-- Tracks password reset attempts to prevent abuse

CREATE TABLE IF NOT EXISTS public.password_reset_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    attempt_count INT DEFAULT 1,
    locked_until TIMESTAMPTZ,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for password reset tracking
ALTER TABLE public.password_reset_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own reset tracking
CREATE POLICY "Users can view own reset tracking"
    ON public.password_reset_tracking FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- REFRESH TOKEN CLEANUP
-- ============================================
-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires
    ON public.refresh_tokens(user_id, expires_at)
    WHERE revoked_at IS NULL;

-- ============================================
-- SESSION TRACKING INDEX
-- ============================================
-- Add index for session lookup by user
CREATE INDEX IF NOT EXISTS idx_active_sessions
    ON public.users(id)
    WHERE email_verified = true;
