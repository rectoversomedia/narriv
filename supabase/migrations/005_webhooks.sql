-- Webhooks and Webhook Deliveries
-- Enables real-time event notifications to external systems

-- Webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook deliveries table (for delivery history)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON public.webhooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON public.webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON public.webhooks USING GIN(events);

-- Indexes for webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered ON public.webhook_deliveries(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_success ON public.webhook_deliveries(success) WHERE success = false;

-- RLS policies for webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Helper function to check webhook access
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
RETURN EXISTS (
  SELECT 1 FROM public.workspace_members
  WHERE workspace_id = p_workspace_id
  AND user_id = auth.uid()
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Webhooks policies
CREATE POLICY "Workspace members can view own webhooks"
ON public.webhooks FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can create webhooks"
ON public.webhooks FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can update own webhooks"
ON public.webhooks FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can delete own webhooks"
ON public.webhooks FOR DELETE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Webhook deliveries policies (read-only through webhooks)
CREATE POLICY "Access webhook deliveries through webhook ownership"
ON public.webhook_deliveries FOR SELECT
USING (webhook_id IN (
  SELECT id FROM public.webhooks
  WHERE workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
));

-- Insert policy for system (used by backend)
CREATE POLICY "System can insert webhook deliveries"
ON public.webhook_deliveries FOR INSERT
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webhooks_updated_at();
