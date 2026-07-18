-- Narriv Subscription Plans Schema
-- Migration: 012_subscription_plans.sql
-- Creates subscription plans matching the pricing tiers

BEGIN;

-- ============================================
-- SUBSCRIPTION PLANS
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    price_idr INTEGER NOT NULL,
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAN LIMITS
-- ============================================

CREATE TABLE IF NOT EXISTS public.plan_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    limit_key TEXT NOT NULL,
    limit_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, limit_key)
);

-- ============================================
-- PLAN FEATURES
-- ============================================

CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    feature_value BOOLEAN DEFAULT false,
    feature_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, feature_key)
);

-- ============================================
-- SEED INITIAL PLANS
-- ============================================

-- PILOT Plan
INSERT INTO public.subscription_plans (plan_key, name, tagline, price_idr, sort_order, is_featured)
VALUES ('pilot', 'PILOT', 'Validate the value', 5000000, 1, false)
ON CONFLICT (plan_key) DO NOTHING;

-- INTELLIGENCE Plan
INSERT INTO public.subscription_plans (plan_key, name, tagline, price_idr, sort_order, is_featured)
VALUES ('intelligence', 'INTELLIGENCE', 'Understand what matters', 25000000, 2, true)
ON CONFLICT (plan_key) DO NOTHING;

-- DECISION Plan
INSERT INTO public.subscription_plans (plan_key, name, tagline, price_idr, sort_order, is_featured)
VALUES ('decision', 'DECISION', 'Turn intelligence into action', 50000000, 3, false)
ON CONFLICT (plan_key) DO NOTHING;

-- COMMAND Plan
INSERT INTO public.subscription_plans (plan_key, name, tagline, price_idr, sort_order, is_featured)
VALUES ('command', 'COMMAND', 'Operationalize intelligence', 100000000, 4, false)
ON CONFLICT (plan_key) DO NOTHING;

-- ============================================
-- SEED PLAN LIMITS
-- ============================================

-- Get plan IDs
DO $$
DECLARE
    pilot_id UUID;
    intelligence_id UUID;
    decision_id UUID;
    command_id UUID;
BEGIN
    SELECT id INTO pilot_id FROM subscription_plans WHERE plan_key = 'pilot';
    SELECT id INTO intelligence_id FROM subscription_plans WHERE plan_key = 'intelligence';
    SELECT id INTO decision_id FROM subscription_plans WHERE plan_key = 'decision';
    SELECT id INTO command_id FROM subscription_plans WHERE plan_key = 'command';

    -- PILOT limits
    INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
        (pilot_id, 'max_topics', '5'),
        (pilot_id, 'max_users', '1'),
        (pilot_id, 'max_data_retention_days', '30'),
        (pilot_id, 'max_signals_per_month', '10000'),
        (pilot_id, 'max_alerts_per_month', '100'),
        (pilot_id, 'max_reports_per_month', '10'),
        (pilot_id, 'max_ai_analyses_per_month', '500')
    ON CONFLICT DO NOTHING;

    -- INTELLIGENCE limits
    INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
        (intelligence_id, 'max_topics', '50'),
        (intelligence_id, 'max_users', '10'),
        (intelligence_id, 'max_data_retention_days', '365'),
        (intelligence_id, 'max_signals_per_month', '100000'),
        (intelligence_id, 'max_alerts_per_month', '1000'),
        (intelligence_id, 'max_reports_per_month', '100'),
        (intelligence_id, 'max_ai_analyses_per_month', '5000')
    ON CONFLICT DO NOTHING;

    -- DECISION limits
    INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
        (decision_id, 'max_topics', '200'),
        (decision_id, 'max_users', '50'),
        (decision_id, 'max_data_retention_days', '365'),
        (decision_id, 'max_signals_per_month', '500000'),
        (decision_id, 'max_alerts_per_month', '5000'),
        (decision_id, 'max_reports_per_month', '500'),
        (decision_id, 'max_ai_analyses_per_month', '20000')
    ON CONFLICT DO NOTHING;

    -- COMMAND limits (unlimited = -1)
    INSERT INTO plan_limits (plan_id, limit_key, limit_value) VALUES
        (command_id, 'max_topics', '-1'),
        (command_id, 'max_users', '-1'),
        (command_id, 'max_data_retention_days', '-1'),
        (command_id, 'max_signals_per_month', '-1'),
        (command_id, 'max_alerts_per_month', '-1'),
        (command_id, 'max_reports_per_month', '-1'),
        (command_id, 'max_ai_analyses_per_month', '-1')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- SEED PLAN FEATURES
-- ============================================

DO $$
DECLARE
    pilot_id UUID;
    intelligence_id UUID;
    decision_id UUID;
    command_id UUID;
BEGIN
    SELECT id INTO pilot_id FROM subscription_plans WHERE plan_key = 'pilot';
    SELECT id INTO intelligence_id FROM subscription_plans WHERE plan_key = 'intelligence';
    SELECT id INTO decision_id FROM subscription_plans WHERE plan_key = 'decision';
    SELECT id INTO command_id FROM subscription_plans WHERE plan_key = 'command';

    -- PILOT features
    INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES
        (pilot_id, 'signals_monitoring', true),
        (pilot_id, 'alerts', true),
        (pilot_id, 'email_notifications', true),
        (pilot_id, 'intelligence', false),
        (pilot_id, 'ai_visibility', false),
        (pilot_id, 'whatsapp_notifications', false),
        (pilot_id, 'monthly_report', false),
        (pilot_id, 'action_center', false),
        (pilot_id, 'escalation_workflow', false),
        (pilot_id, 'slack_integration', false),
        (pilot_id, 'teams_integration', false),
        (pilot_id, 'weekly_report', false),
        (pilot_id, 'custom_ai_models', false),
        (pilot_id, 'api_access', false),
        (pilot_id, 'dedicated_infrastructure', false),
        (pilot_id, 'enterprise_sla', false),
        (pilot_id, 'dedicated_success_manager', false),
        (pilot_id, 'quarterly_review', false)
    ON CONFLICT DO NOTHING;

    -- INTELLIGENCE features
    INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES
        (intelligence_id, 'signals_monitoring', true),
        (intelligence_id, 'alerts', true),
        (intelligence_id, 'email_notifications', true),
        (intelligence_id, 'intelligence', true),
        (intelligence_id, 'ai_visibility', true),
        (intelligence_id, 'whatsapp_notifications', true),
        (intelligence_id, 'monthly_report', true),
        (intelligence_id, 'action_center', false),
        (intelligence_id, 'escalation_workflow', false),
        (intelligence_id, 'slack_integration', false),
        (intelligence_id, 'teams_integration', false),
        (intelligence_id, 'weekly_report', false),
        (intelligence_id, 'custom_ai_models', false),
        (intelligence_id, 'api_access', false),
        (intelligence_id, 'dedicated_infrastructure', false),
        (intelligence_id, 'enterprise_sla', false),
        (intelligence_id, 'dedicated_success_manager', false),
        (intelligence_id, 'quarterly_review', false)
    ON CONFLICT DO NOTHING;

    -- DECISION features
    INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES
        (decision_id, 'signals_monitoring', true),
        (decision_id, 'alerts', true),
        (decision_id, 'email_notifications', true),
        (decision_id, 'intelligence', true),
        (decision_id, 'ai_visibility', true),
        (decision_id, 'whatsapp_notifications', true),
        (decision_id, 'monthly_report', true),
        (decision_id, 'action_center', true),
        (decision_id, 'escalation_workflow', true),
        (decision_id, 'slack_integration', true),
        (decision_id, 'teams_integration', true),
        (decision_id, 'weekly_report', true),
        (decision_id, 'custom_ai_models', false),
        (decision_id, 'api_access', false),
        (decision_id, 'dedicated_infrastructure', false),
        (decision_id, 'enterprise_sla', false),
        (decision_id, 'dedicated_success_manager', false),
        (decision_id, 'quarterly_review', false)
    ON CONFLICT DO NOTHING;

    -- COMMAND features (all true except specific enterprise-only)
    INSERT INTO plan_features (plan_id, feature_key, feature_value) VALUES
        (command_id, 'signals_monitoring', true),
        (command_id, 'alerts', true),
        (command_id, 'email_notifications', true),
        (command_id, 'intelligence', true),
        (command_id, 'ai_visibility', true),
        (command_id, 'whatsapp_notifications', true),
        (command_id, 'monthly_report', true),
        (command_id, 'action_center', true),
        (command_id, 'escalation_workflow', true),
        (command_id, 'slack_integration', true),
        (command_id, 'teams_integration', true),
        (command_id, 'weekly_report', true),
        (command_id, 'custom_ai_models', true),
        (command_id, 'api_access', true),
        (command_id, 'dedicated_infrastructure', true),
        (command_id, 'enterprise_sla', true),
        (command_id, 'dedicated_success_manager', true),
        (command_id, 'quarterly_review', true)
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Everyone can view plans (for pricing page)
CREATE POLICY "Anyone can view subscription plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);

CREATE POLICY "Anyone can view plan limits"
    ON public.plan_limits FOR SELECT
    USING (plan_id IN (SELECT id FROM public.subscription_plans WHERE is_active = true));

CREATE POLICY "Anyone can view plan features"
    ON public.plan_features FOR SELECT
    USING (plan_id IN (SELECT id FROM public.subscription_plans WHERE is_active = true));

-- Only service role can modify
CREATE POLICY "Service role can manage plans"
    ON public.subscription_plans FOR ALL
    USING (true);

CREATE POLICY "Service role can manage limits"
    ON public.plan_limits FOR ALL
    USING (true);

CREATE POLICY "Service role can manage features"
    ON public.plan_features FOR ALL
    USING (true);

COMMIT;
