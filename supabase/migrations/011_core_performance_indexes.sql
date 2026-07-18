-- ============================================
-- Migration: 011_core_performance_indexes.sql
-- CRITICAL PERFORMANCE: Add indexes for core tables
-- ============================================
-- This migration adds critical indexes for commonly queried tables
-- Run with: supabase db push or psql
-- Fixed: Removed references to non-existent columns

BEGIN;

-- ============================================
-- Workspaces Table Indexes
-- ============================================

-- Index for workspace slug lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_slug
ON workspaces (slug)
WHERE slug IS NOT NULL;

-- ============================================
-- Workspace Members Indexes
-- ============================================

-- Critical: User workspace membership lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_user
ON workspace_members (user_id);

-- Critical: Workspace member list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_workspace
ON workspace_members (workspace_id);

-- Composite for role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_workspace_role
ON workspace_members (workspace_id, role);

-- ============================================
-- Sources Table Indexes
-- ============================================

-- Critical: Workspace source listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_workspace
ON sources (workspace_id);

-- Index for source status (using last_status column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_status
ON sources (last_status);

-- Composite for workspace + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_workspace_status
ON sources (workspace_id, last_status);

-- Index for source type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_type
ON sources (type);

-- ============================================
-- Cases Table Indexes
-- ============================================

-- Critical: Workspace case listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_workspace
ON cases (workspace_id);

-- Index for case status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_status
ON cases (status);

-- Index for case priority
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_priority
ON cases (priority);

-- Composite for workspace + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_workspace_status
ON cases (workspace_id, status);

-- Composite for workspace + created
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_workspace_created
ON cases (workspace_id, created_at DESC);

-- ============================================
-- Reports Table Indexes
-- ============================================

-- Critical: Workspace report listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_workspace
ON reports (workspace_id);

-- Index for report status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_status
ON reports (status);

-- Composite for workspace + created
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_workspace_created
ON reports (workspace_id, created_at DESC);

-- ============================================
-- Action Plans Table Indexes
-- ============================================

-- Critical: Workspace action plan listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_workspace
ON action_plans (workspace_id);

-- Index for action plan status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_status
ON action_plans (status);

-- Composite for workspace + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_workspace_status
ON action_plans (workspace_id, status);

-- ============================================
-- App Notifications Indexes
-- ============================================

-- Critical: User notification listing (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_notifications_user
ON app_notifications (user_id);

-- Critical: User unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_notifications_user_unread
ON app_notifications (user_id, is_read)
WHERE is_read = false;

-- Composite for user + created
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_notifications_user_created
ON app_notifications (user_id, created_at DESC);

-- ============================================
-- Audit Logs Indexes
-- ============================================

-- Critical: Workspace audit log listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_workspace
ON audit_logs (workspace_id);

-- Index for event type (using event column, not action)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_event
ON audit_logs (event);

-- Composite for workspace + created
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_workspace_created
ON audit_logs (workspace_id, created_at DESC);

-- Composite for user event lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_event
ON audit_logs (user_id, event, created_at DESC);

-- ============================================
-- Refresh Tokens Indexes
-- ============================================

-- Critical: Token lookup by hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_hash
ON refresh_tokens (token_hash);

-- Index for user token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user
ON refresh_tokens (user_id);

-- Index for expired token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_expires
ON refresh_tokens (expires_at)
WHERE expires_at < NOW();

-- ============================================
-- New indexes for additional tables
-- ============================================

-- Ingestion jobs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingestion_jobs_workspace
ON ingestion_jobs (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingestion_jobs_status
ON ingestion_jobs (status);

-- Signals indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_workspace_created
ON signals (workspace_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_published
ON signals (published_at DESC);

-- Alerts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_created
ON alerts (workspace_id, created_at DESC);

-- Token usage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_workspace
ON token_usage (workspace_id);

-- Monitoring keywords indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_keywords_workspace
ON monitoring_keywords (workspace_id);

-- Workspace sources indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_sources_workspace
ON workspace_sources (workspace_id);

-- Onboarding progress indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_workspace
ON onboarding_progress (workspace_id);

-- Workspace subscriptions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_subscriptions_workspace
ON workspace_subscriptions (workspace_id);

-- Workspace usage indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_usage_workspace
ON workspace_usage (workspace_id);

COMMIT;

-- ============================================
-- Index Usage Notes
-- ============================================
--
-- User Workspaces Query:
--   SELECT w.* FROM workspaces w
--     JOIN workspace_members wm ON w.id = wm.workspace_id
--     WHERE wm.user_id = $1
--   -- Uses idx_workspace_members_user
--
-- Unread Notifications:
--   SELECT * FROM app_notifications
--     WHERE user_id = $1 AND is_read = false
--   -- Uses idx_app_notifications_user_unread
--
-- Audit Trail:
--   SELECT * FROM audit_logs
--     WHERE workspace_id = $1
--     ORDER BY created_at DESC LIMIT 50
--   -- Uses idx_audit_logs_workspace_created
--
-- ============================================
