-- =============================================================================
-- Migration: 023_setup_alert_rules_cron.sql
-- Description: Automated Alert Rules Engine for Negative Sentiment Spikes & Anomalies
-- Notes: Integrated directly into existing pg_cron and alerts schema.
--        Zero new infrastructure or external services required.
-- =============================================================================

-- 1. Ensure alerts table has strategic analysis columns
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS what_happened TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS what_to_do TEXT,
ADD COLUMN IF NOT EXISTS sources TEXT[];

-- 2. Stored procedure for Automated Alert Rules Engine
CREATE OR REPLACE FUNCTION public.evaluate_automated_alert_rules()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_alert_id UUID;
    v_created_count INT := 0;
    v_title TEXT;
    v_desc TEXT;
    v_what_happened TEXT;
    v_severity TEXT;
BEGIN
    FOR r IN (
        SELECT 
            s.workspace_id,
            COALESCE(s.metadata->>'keyword', s.topics[1], 'General') AS topic_name,
            COUNT(*) AS total_signals,
            COUNT(*) FILTER (WHERE UPPER(s.sentiment) = 'NEGATIVE') AS negative_signals,
            COUNT(*) FILTER (WHERE LOWER(s.severity) IN ('high', 'critical')) AS high_severity_signals,
            ARRAY_AGG(s.id) FILTER (WHERE UPPER(s.sentiment) = 'NEGATIVE') AS negative_signal_ids
        FROM public.signals s
        WHERE s.captured_at >= NOW() - INTERVAL '24 hours'
        GROUP BY s.workspace_id, COALESCE(s.metadata->>'keyword', s.topics[1], 'General')
        HAV (
            COUNT(*) >= 2 AND 
            (COUNT(*) FILTER (WHERE UPPER(s.sentiment) = 'NEGATIVE')::FLOAT / COUNT(*)::FLOAT) >= 0.30
        ) OR (
            COUNT(*) FILTER (WHERE UPPER(s.sentiment) = 'NEGATIVE') >= 3
        )
    ) LOOP
        -- Skip if an open alert for this topic already exists in the last 12 hours
        IF NOT EXISTS (
            SELECT 1 FROM public.alerts a
            WHERE a.workspace_id = r.workspace_id
              AND a.title ILIKE '%' || r.topic_name || '%'
              AND a.status != 'resolved'
              AND a.created_at >= NOW() - INTERVAL '12 hours'
        ) THEN
            -- Calculate severity based on negative concentration and severity tags
            IF (r.negative_signals::FLOAT / r.total_signals::FLOAT) >= 0.50 OR r.high_severity_signals > 0 OR r.negative_signals >= 4 THEN
                v_severity := 'critical';
            ELSIF (r.negative_signals::FLOAT / r.total_signals::FLOAT) >= 0.35 OR r.negative_signals >= 2 THEN
                v_severity := 'high';
            ELSE
                v_severity := 'medium';
            END IF;

            v_title := 'Negative Sentiment Spike: ' || r.topic_name;
            v_desc := r.negative_signals || ' of ' || r.total_signals || ' signals (' || 
                      ROUND((r.negative_signals::NUMERIC / r.total_signals::NUMERIC) * 100) || '%) are negative.';
            v_what_happened := 'Detected negative sentiment spike of ' || 
                               ROUND((r.negative_signals::NUMERIC / r.total_signals::NUMERIC) * 100) || '% (' || 
                               r.negative_signals || ' negative out of ' || r.total_signals || 
                               ' total signals) for topic ' || r.topic_name || ' within the monitoring window.';

            INSERT INTO public.alerts (
                workspace_id,
                title,
                description,
                type,
                severity,
                status,
                what_happened,
                why_it_matters,
                what_to_do,
                sources,
                source,
                metadata
            ) VALUES (
                r.workspace_id,
                v_title,
                v_desc,
                'risk',
                v_severity,
                'open',
                v_what_happened,
                'A concentrated negative sentiment surge threatens brand trust and indicates an escalating crisis requiring immediate PR monitoring.',
                'Review incoming signals, draft a clarifying statement or holding response, and assign an incident lead.',
                ARRAY['news'],
                'news',
                jsonb_build_object(
                    'keyword', r.topic_name,
                    'negative_count', r.negative_signals,
                    'total_count', r.total_signals,
                    'negative_ratio', ROUND((r.negative_signals::NUMERIC / r.total_signals::NUMERIC) * 100),
                    'signal_ids', r.negative_signal_ids,
                    'rule_triggered', 'negative_sentiment_spike_30pct',
                    'triggered_by', 'pg_cron_automated_rules'
                )
            ) RETURNING id INTO v_alert_id;

            v_created_count := v_created_count + 1;
        END IF;
    END LOOP;

    RETURN v_created_count;
END;
$$;

-- 3. Update periodic RSS ingestion stored procedure to evaluate alert rules
CREATE OR REPLACE FUNCTION public.trigger_periodic_rss_ingestion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_keywords TEXT[];
    v_source_count INT;
    v_log_id UUID;
    v_alerts_created INT;
BEGIN
    SELECT ARRAY_AGG(DISTINCT kw)
    INTO v_keywords
    FROM (
        SELECT keyword AS kw FROM public.monitoring_keywords WHERE is_active = true
        UNION
        SELECT name AS kw FROM public.sources WHERE is_active = true AND type IN ('news', 'web', 'rss')
    ) sub
    WHERE kw IS NOT NULL AND TRIM(kw) != '';

    SELECT COUNT(*)
    INTO v_source_count
    FROM public.sources
    WHERE is_active = true AND type IN ('news', 'web', 'rss');

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

    UPDATE public.sources
    SET updated_at = NOW()
    WHERE is_active = true AND type IN ('news', 'web', 'rss');

    -- Run automated alert rules evaluation
    SELECT public.evaluate_automated_alert_rules() INTO v_alerts_created;
END;
$$;

-- 4. Register hourly pg_cron Job for Automated Alert Rules
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-automated-alert-rules') THEN
        PERFORM cron.unschedule('hourly-automated-alert-rules');
    END IF;

    PERFORM cron.schedule(
        'hourly-automated-alert-rules',
        '0 * * * *',
        'SELECT public.evaluate_automated_alert_rules();'
    );
END $$;
