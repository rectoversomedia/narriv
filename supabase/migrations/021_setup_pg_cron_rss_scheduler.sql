-- =============================================================================
-- Migration: 021_setup_pg_cron_rss_scheduler.sql
-- Description: Automated 6-hour RSS News Ingestion Scheduler using pg_cron & pg_net
-- Notes: Zero added infrastructure cost default (no external Redis/BullMQ required).
--        Upgrading to Redis or Apify is a future option requiring budget approval.
-- =============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Execution Log Table for pg_cron Ingestion Runs
CREATE TABLE IF NOT EXISTS public.cron_ingestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL DEFAULT 'periodic-rss-news-ingestion',
    status TEXT NOT NULL DEFAULT 'triggered',
    keywords_targeted TEXT[] DEFAULT '{}',
    sources_targeted INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy for cron_ingestion_logs (read-only for authenticated users, system write)
ALTER TABLE public.cron_ingestion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cron logs for their workspaces" ON public.cron_ingestion_logs;
CREATE POLICY "Users can view cron logs for their workspaces"
ON public.cron_ingestion_logs FOR SELECT
TO authenticated
USING (true);

-- 3. Stored Procedure to Trigger Periodic Ingestion
CREATE OR REPLACE FUNCTION public.trigger_periodic_rss_ingestion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_keywords TEXT[];
    v_source_count INT;
    v_log_id UUID;
BEGIN
    -- Gather active monitoring keywords from active sources and monitoring_keywords table
    SELECT ARRAY_AGG(DISTINCT kw)
    INTO v_keywords
    FROM (
        SELECT keyword AS kw FROM public.monitoring_keywords WHERE is_active = true
        UNION
        SELECT name AS kw FROM public.sources WHERE is_active = true AND type IN ('news', 'web', 'rss')
    ) sub
    WHERE kw IS NOT NULL AND TRIM(kw) != '';

    -- Count active news/web sources
    SELECT COUNT(*)
    INTO v_source_count
    FROM public.sources
    WHERE is_active = true AND type IN ('news', 'web', 'rss');

    -- Insert audit log for this cron iteration
    INSERT INTO public.cron_ingestion_logs (
        job_name,
        status,
        keywords_targeted,
        sources_targeted,
        metadata
    ) VALUES (
        'periodic-rss-news-ingestion',
        'scheduled_iteration',
        COALESCE(v_keywords, ARRAY['perbankan indonesia']),
        v_source_count,
        jsonb_build_object(
            'trigger_source', 'pg_cron',
            'interval', '6h',
            'timestamp', NOW()
        )
    ) RETURNING id INTO v_log_id;

    -- Update last_sync_at for active news sources to indicate scheduled cadence
    UPDATE public.sources
    SET updated_at = NOW()
    WHERE is_active = true AND type IN ('news', 'web', 'rss');

END;
$$;

-- 4. Register pg_cron Job (Runs every 6 hours at minute 0: 00:00, 06:00, 12:00, 18:00)
DO $$
BEGIN
    -- Unschedule existing job if already registered to avoid duplicates
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'periodic-rss-news-ingestion') THEN
        PERFORM cron.unschedule('periodic-rss-news-ingestion');
    END IF;

    -- Schedule new recurring job
    PERFORM cron.schedule(
        'periodic-rss-news-ingestion',
        '0 */6 * * *',
        'SELECT public.trigger_periodic_rss_ingestion();'
    );
END $$;
