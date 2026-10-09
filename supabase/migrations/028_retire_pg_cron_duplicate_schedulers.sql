-- =============================================================================
-- Migration: 028_retire_pg_cron_duplicate_schedulers.sql
-- Description: Make Vercel Cron the single scheduler for the intelligence
--              pipeline by unscheduling the two pg_cron jobs.
--
-- Why:
--   * periodic-rss-news-ingestion (021/023) never fetched anything: it only
--     wrote a cron_ingestion_logs row, bumped sources.updated_at and ran the
--     SQL alert rules. Real ingestion now runs in the backend
--     (/api/cron/ingest every 6h via Vercel Cron).
--   * hourly-automated-alert-rules (023) is a second alert engine. It uses a
--     12-hour dedup window (the backend uses "any unresolved alert in 7
--     days"), so it re-raises unresolved alerts, and alerts it creates are
--     never dispatched to notification integrations.
--
-- Safe: only removes schedules. Functions, tables and existing rows are kept,
-- so this is reversible by re-running the cron.schedule calls in 021/023.
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'periodic-rss-news-ingestion') THEN
        PERFORM cron.unschedule('periodic-rss-news-ingestion');
    END IF;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-automated-alert-rules') THEN
        PERFORM cron.unschedule('hourly-automated-alert-rules');
    END IF;
END $$;
