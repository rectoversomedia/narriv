-- Migration 027: Add actor_id and input_config to sources table
-- Resolves BUG-NU-02: Missing actor_id and input_config columns in sources table schema

ALTER TABLE public.sources 
ADD COLUMN IF NOT EXISTS actor_id TEXT,
ADD COLUMN IF NOT EXISTS input_config JSONB DEFAULT '{}'::jsonb;

-- Index on actor_id for search and lookups
CREATE INDEX IF NOT EXISTS idx_sources_actor_id ON public.sources(actor_id) WHERE actor_id IS NOT NULL;

-- Unblock existing users who completed onboarding on a secondary workspace
-- Ensure their primary/registration workspaces are also marked onboarding_completed = true
UPDATE public.workspaces 
SET onboarding_completed = true, onboarding_step = 100, updated_at = NOW()
WHERE id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm 
  WHERE wm.user_id IN (
    SELECT wm2.user_id FROM public.workspace_members wm2 
    JOIN public.workspaces w2 ON w2.id = wm2.workspace_id 
    WHERE w2.onboarding_completed = true
  )
) AND onboarding_completed IS NOT TRUE;
