-- Narriv Workspace Subscriptions
-- Migration: 013_workspace_subscriptions.sql
-- Links workspaces to subscription plans

BEGIN;

-- ============================================
-- WORKSPACE SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'trial')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    usage_key TEXT NOT NULL,
    usage_value INTEGER DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, usage_key, period_start)
);

-- ============================================
-- INVOICES (for billing)
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspace_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.workspace_subscriptions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount_idr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace
    ON public.workspace_subscriptions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_status
    ON public.workspace_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace
    ON public.workspace_usage(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_usage_period
    ON public.workspace_usage(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_workspace_invoices_workspace
    ON public.workspace_invoices(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invoices_status
    ON public.workspace_invoices(status);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their workspace subscription
CREATE POLICY "Users can view own workspace subscription"
    ON public.workspace_subscriptions FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can view own workspace usage"
    ON public.workspace_usage FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

CREATE POLICY "Users can view own invoices"
    ON public.workspace_invoices FOR SELECT
    USING (
        workspace_id IN (SELECT get_user_workspace_ids())
    );

-- System can manage subscriptions
CREATE POLICY "System can manage subscriptions"
    ON public.workspace_subscriptions FOR ALL
    USING (true);

CREATE POLICY "System can manage usage"
    ON public.workspace_usage FOR ALL
    USING (true);

CREATE POLICY "System can manage invoices"
    ON public.workspace_invoices FOR ALL
    USING (true);

-- ============================================
-- FUNCTION: Get current subscription for workspace
-- ============================================

CREATE OR REPLACE FUNCTION public.get_workspace_subscription(p_workspace_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_key TEXT,
    plan_name TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_trial BOOLEAN,
    trial_ends_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ws.id,
        sp.plan_key,
        sp.name,
        ws.status,
        ws.started_at,
        ws.expires_at,
        ws.status = 'trial' AS is_trial,
        ws.trial_ends_at
    FROM public.workspace_subscriptions ws
    JOIN public.subscription_plans sp ON sp.id = ws.plan_id
    WHERE ws.workspace_id = p_workspace_id
    AND ws.status IN ('active', 'trial')
    ORDER BY ws.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get plan limits for workspace
-- ============================================

CREATE OR REPLACE FUNCTION public.get_workspace_limits(p_workspace_id UUID)
RETURNS TABLE (
    limit_key TEXT,
    limit_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pl.limit_key,
        pl.limit_value
    FROM public.workspace_subscriptions ws
    JOIN public.subscription_plans sp ON sp.id = ws.plan_id
    JOIN public.plan_limits pl ON pl.plan_id = sp.id
    WHERE ws.workspace_id = p_workspace_id
    AND ws.status IN ('active', 'trial')
    ORDER BY pl.limit_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get plan features for workspace
-- ============================================

CREATE OR REPLACE FUNCTION public.get_workspace_features(p_workspace_id UUID)
RETURNS TABLE (
    feature_key TEXT,
    feature_value BOOLEAN,
    feature_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pf.feature_key,
        pf.feature_value,
        pf.feature_metadata
    FROM public.workspace_subscriptions ws
    JOIN public.subscription_plans sp ON sp.id = ws.plan_id
    JOIN public.plan_features pf ON pf.plan_id = sp.id
    WHERE ws.workspace_id = p_workspace_id
    AND ws.status IN ('active', 'trial')
    ORDER BY pf.feature_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check if workspace has feature
-- ============================================

CREATE OR REPLACE FUNCTION public.workspace_has_feature(
    p_workspace_id UUID,
    p_feature_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    has_feature BOOLEAN;
BEGIN
    SELECT pf.feature_value INTO has_feature
    FROM public.workspace_subscriptions ws
    JOIN public.subscription_plans sp ON sp.id = ws.plan_id
    JOIN public.plan_features pf ON pf.plan_id = sp.id
    WHERE ws.workspace_id = p_workspace_id
    AND ws.status IN ('active', 'trial')
    AND pf.feature_key = p_feature_key
    LIMIT 1;

    RETURN COALESCE(has_feature, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- FUNCTION: Check if workspace has limit capacity
-- ============================================

CREATE OR REPLACE FUNCTION public.workspace_has_limit(
    p_workspace_id UUID,
    p_limit_key TEXT,
    p_requested_value INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    limit_value TEXT;
    limit_int INTEGER;
    current_usage INTEGER;
BEGIN
    -- Get the limit from plan
    SELECT pl.limit_value INTO limit_value
    FROM public.workspace_subscriptions ws
    JOIN public.subscription_plans sp ON sp.id = ws.plan_id
    JOIN public.plan_limits pl ON pl.plan_id = sp.id
    WHERE ws.workspace_id = p_workspace_id
    AND ws.status IN ('active', 'trial')
    AND pl.limit_key = p_limit_key
    LIMIT 1;

    -- If no limit found, deny by default
    IF limit_value IS NULL THEN
        RETURN false;
    END IF;

    -- -1 means unlimited
    IF limit_value = '-1' THEN
        RETURN true;
    END IF;

    -- Parse limit value
    limit_int := limit_value::INTEGER;

    -- Get current usage
    SELECT COALESCE(SUM(usage_value), 0) INTO current_usage
    FROM public.workspace_usage
    WHERE workspace_id = p_workspace_id
    AND usage_key = p_limit_key
    AND period_start >= DATE_TRUNC('month', NOW())
    AND period_end <= DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

    -- Check if we have capacity
    RETURN (current_usage + p_requested_value) <= limit_int;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
