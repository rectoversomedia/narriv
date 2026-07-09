-- Narriv Database Functions
-- Migration: 003_functions.sql

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's primary workspace
CREATE OR REPLACE FUNCTION public.get_user_primary_workspace()
RETURNS TABLE(
    id UUID,
    name TEXT,
    slug TEXT,
    logo_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id, w.name, w.slug, w.logo_url
    FROM public.workspaces w
    INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
    ORDER BY wm.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get workspace member count
CREATE OR REPLACE FUNCTION public.get_workspace_member_count(p_workspace_id UUID)
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- SIGNAL FUNCTIONS
-- ============================================

-- Function to get signal count by sentiment
CREATE OR REPLACE FUNCTION public.get_signal_sentiment_stats(
    p_workspace_id UUID,
    p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
    p_date_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    sentiment TEXT,
    count BIGINT,
    percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH sentiment_counts AS (
        SELECT
            COALESCE(s.sentiment, 'neutral') as sentiment,
            COUNT(*) as cnt
        FROM public.signals s
        WHERE s.workspace_id = p_workspace_id
          AND s.created_at BETWEEN p_date_from AND p_date_to
        GROUP BY COALESCE(s.sentiment, 'neutral')
    ),
    total AS (
        SELECT SUM(cnt) as total_count FROM sentiment_counts
    )
    SELECT
        sc.sentiment,
        sc.cnt as count,
        CASE
            WHEN t.total_count > 0 THEN ROUND((sc.cnt::NUMERIC / t.total_count) * 100, 2)
            ELSE 0
        END as percentage
    FROM sentiment_counts sc
    CROSS JOIN total t
    ORDER BY sc.cnt DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get top signals
CREATE OR REPLACE FUNCTION public.get_top_signals(
    p_workspace_id UUID,
    p_limit INT DEFAULT 10,
    p_sentiment TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    platform TEXT,
    sentiment TEXT,
    sentiment_score NUMERIC(3,2),
    severity TEXT,
    published_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.content,
        s.platform,
        s.sentiment,
        s.sentiment_score,
        s.severity,
        s.published_at
    FROM public.signals s
    WHERE s.workspace_id = p_workspace_id
      AND (p_sentiment IS NULL OR s.sentiment = p_sentiment)
    ORDER BY s.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to search signals
CREATE OR REPLACE FUNCTION public.search_signals(
    p_workspace_id UUID,
    p_keyword TEXT,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    content TEXT,
    platform TEXT,
    sentiment TEXT,
    published_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.content,
        s.platform,
        s.sentiment,
        s.published_at
    FROM public.signals s
    WHERE s.workspace_id = p_workspace_id
      AND (
          s.title ILIKE '%' || p_keyword || '%' OR
          s.content ILIKE '%' || p_keyword || '%'
      )
    ORDER BY s.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- ALERT FUNCTIONS
-- ============================================

-- Function to get alert statistics
CREATE OR REPLACE FUNCTION public.get_alert_stats(p_workspace_id UUID)
RETURNS TABLE(
    status TEXT,
    severity TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.status,
        a.severity,
        COUNT(*) as count
    FROM public.alerts a
    WHERE a.workspace_id = p_workspace_id
    GROUP BY a.status, a.severity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get overdue alerts
CREATE OR REPLACE FUNCTION public.get_overdue_alerts(p_workspace_id UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    severity TEXT,
    deadline TIMESTAMPTZ,
    assigned_to UUID,
    escalation_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.severity,
        a.deadline,
        a.assigned_to,
        a.escalation_level
    FROM public.alerts a
    WHERE a.workspace_id = p_workspace_id
      AND a.status NOT IN ('resolved')
      AND a.deadline < NOW()
    ORDER BY a.deadline ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- REPORT FUNCTIONS
-- ============================================

-- Function to get report analytics
CREATE OR REPLACE FUNCTION public.get_report_analytics(p_workspace_id UUID)
RETURNS TABLE(
    format TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        re.format,
        COUNT(*) as count
    FROM public.report_exports re
    INNER JOIN public.reports r ON re.report_id = r.id
    WHERE r.workspace_id = p_workspace_id
    GROUP BY re.format;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- TOKEN USAGE FUNCTIONS
-- ============================================

-- Function to track token usage
CREATE OR REPLACE FUNCTION public.track_token_usage(
    p_workspace_id UUID,
    p_operation TEXT,
    p_model TEXT,
    p_input_tokens INT,
    p_output_tokens INT,
    p_cost NUMERIC(10,2)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.token_usage (
        workspace_id,
        operation,
        model,
        input_tokens,
        output_tokens,
        cost
    ) VALUES (
        p_workspace_id,
        p_operation,
        p_model,
        p_input_tokens,
        p_output_tokens,
        p_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get token usage summary
CREATE OR REPLACE FUNCTION public.get_token_usage_summary(
    p_workspace_id UUID,
    p_days INT DEFAULT 30
)
RETURNS TABLE(
    operation TEXT,
    model TEXT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cost NUMERIC(10,2),
    request_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tu.operation,
        tu.model,
        SUM(tu.input_tokens)::BIGINT as total_input_tokens,
        SUM(tu.output_tokens)::BIGINT as total_output_tokens,
        SUM(tu.cost) as total_cost,
        COUNT(*)::BIGINT as request_count
    FROM public.token_usage tu
    WHERE tu.workspace_id = p_workspace_id
      AND tu.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY tu.operation, tu.model
    ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- AUDIT FUNCTIONS
-- ============================================

-- Function to record audit log
CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_workspace_id UUID,
    p_event TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO public.audit_logs (
        workspace_id,
        user_id,
        event,
        metadata
    ) VALUES (
        p_workspace_id,
        v_user_id,
        p_event,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SOURCE HEALTH FUNCTIONS
-- ============================================

-- Function to get source health status
CREATE OR REPLACE FUNCTION public.get_source_health(p_workspace_id UUID)
RETURNS TABLE(
    source_id UUID,
    source_name TEXT,
    status TEXT,
    last_sync_at TIMESTAMPTZ,
    signal_count BIGINT,
    health_score NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as source_id,
        s.name as source_name,
        s.last_status as status,
        s.last_sync_at,
        COUNT(sig.id)::BIGINT as signal_count,
        CASE
            WHEN s.last_sync_at IS NULL THEN 0
            WHEN s.last_sync_at < NOW() - INTERVAL '1 day' THEN 50
            WHEN s.last_status = 'success' THEN 100
            ELSE 75
        END as health_score
    FROM public.sources s
    LEFT JOIN public.signals sig ON sig.source_id = s.id
        AND sig.created_at > NOW() - INTERVAL '7 days'
    WHERE s.workspace_id = p_workspace_id
      AND s.deleted_at IS NULL
    GROUP BY s.id, s.name, s.last_status, s.last_sync_at
    ORDER BY health_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- NOTIFICATION FUNCTIONS
-- ============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_workspace_id UUID,
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.app_notifications (
        workspace_id,
        user_id,
        title,
        message,
        type,
        data
    ) VALUES (
        p_workspace_id,
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_data
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
