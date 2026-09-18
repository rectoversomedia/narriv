-- Migration 022: Add sentiment and main_narrative to narrative_clusters table

ALTER TABLE public.narrative_clusters 
ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS main_narrative TEXT;

CREATE INDEX IF NOT EXISTS idx_narrative_clusters_sentiment 
ON public.narrative_clusters(workspace_id, sentiment);
