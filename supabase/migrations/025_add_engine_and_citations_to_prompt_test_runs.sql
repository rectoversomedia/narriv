-- Migration 025: Add engine and citations columns to prompt_test_runs
-- Supports Phase 4 GEO visibility persistence and citation tracking

ALTER TABLE public.prompt_test_runs 
ADD COLUMN IF NOT EXISTS engine TEXT DEFAULT 'gpt-4o-mini-simulated';

ALTER TABLE public.prompt_test_runs 
ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]';

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_workspace_id 
ON public.prompt_test_runs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_visibility_result_id 
ON public.prompt_test_runs(visibility_result_id);

CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_created_at 
ON public.prompt_test_runs(created_at DESC);
