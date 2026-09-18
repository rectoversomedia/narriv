-- Migration 024: Add signal_id column to action_plans table
ALTER TABLE public.action_plans 
ADD COLUMN IF NOT EXISTS signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_action_plans_signal_id ON public.action_plans(signal_id);
