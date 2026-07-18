-- Narriv Database Triggers
-- Migration: 004_triggers.sql

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Users updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Workspaces updated_at
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Workspace settings updated_at
CREATE TRIGGER update_workspace_settings_updated_at
    BEFORE UPDATE ON public.workspace_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Workspace notification settings updated_at
CREATE TRIGGER update_workspace_notification_settings_updated_at
    BEFORE UPDATE ON public.workspace_notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Sources updated_at
CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON public.sources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Signals updated_at
CREATE TRIGGER update_signals_updated_at
    BEFORE UPDATE ON public.signals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Alerts updated_at
CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Narrative clusters updated_at
CREATE TRIGGER update_narrative_clusters_updated_at
    BEFORE UPDATE ON public.narrative_clusters
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Reports updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Report templates updated_at
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON public.report_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Report schedules updated_at
CREATE TRIGGER update_report_schedules_updated_at
    BEFORE UPDATE ON public.report_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Action plans updated_at
CREATE TRIGGER update_action_plans_updated_at
    BEFORE UPDATE ON public.action_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Cases updated_at
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Integrations updated_at
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
# AUTO-CREATE USER RECORD ON SIGNUP
-- ============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
# AUDIT LOG TRIGGERS
-- ============================================

-- Function to log signal creation
CREATE OR REPLACE FUNCTION public.log_signal_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.record_audit_log(
        NEW.workspace_id,
        'signal_created',
        jsonb_build_object(
            'signal_id', NEW.id,
            'title', NEW.title,
            'platform', NEW.platform
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_signal_created
    AFTER INSERT ON public.signals
    FOR EACH ROW EXECUTE FUNCTION public.log_signal_created();

-- Function to log alert status changes
CREATE OR REPLACE FUNCTION public.log_alert_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.record_audit_log(
            NEW.workspace_id,
            'alert_status_changed',
            jsonb_build_object(
                'alert_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_alert_status_change
    AFTER UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.log_alert_status_change();

-- Function to log workspace member changes
CREATE OR REPLACE FUNCTION public.log_workspace_member_added()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.record_audit_log(
        NEW.workspace_id,
        'member_added',
        jsonb_build_object(
            'user_id', NEW.user_id,
            'role', NEW.role
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_workspace_member_added
    AFTER INSERT ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.log_workspace_member_added();

-- ============================================
# COUNTER TRIGGERS
-- ============================================

-- Function to update narrative cluster signal count
CREATE OR REPLACE FUNCTION public.update_cluster_signal_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.narrative_clusters
        SET signal_count = signal_count + 1
        WHERE id = NEW.cluster_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.narrative_clusters
        SET signal_count = signal_count - 1
        WHERE id = OLD.cluster_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_cluster_signal_count
    AFTER INSERT OR DELETE ON public.narrative_cluster_signals
    FOR EACH ROW EXECUTE FUNCTION public.update_cluster_signal_count();

-- ============================================
# SOURCE HEALTH TRIGGERS
-- ============================================

-- Function to update source last sync info
CREATE OR REPLACE FUNCTION public.update_source_sync_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' THEN
        UPDATE public.sources
        SET last_sync_at = NOW(),
            last_status = 'success'
        WHERE id = NEW.source_id;
    ELSIF NEW.status = 'failed' THEN
        UPDATE public.sources
        SET last_status = 'failed'
        WHERE id = NEW.source_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_source_sync_status
    AFTER UPDATE ON public.ingestion_jobs
    FOR EACH ROW
    WHEN (NEW.status IN ('success', 'failed'))
    EXECUTE FUNCTION public.update_source_sync_status();
