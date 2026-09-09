-- Migration: 018_add_alert_and_cluster_to_action_plans.sql
-- Add alert_id and cluster_id FK relations to action_plans

ALTER TABLE public.action_plans
ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.narrative_clusters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_plans_alert_id ON public.action_plans(alert_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_cluster_id ON public.action_plans(cluster_id);
