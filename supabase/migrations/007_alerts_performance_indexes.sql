-- ============================================
-- Migration: 007_alerts_performance_indexes.sql
-- CRITICAL PERFORMANCE: Add indexes for alerts table
-- ============================================
-- This migration adds critical indexes for alerts table
-- to prevent full table scans at scale (10K+ users)
-- Run with: supabase db push or psql

BEGIN;

-- ============================================
-- Alerts Table Indexes
-- ============================================

-- Primary lookup index for workspace + alert listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_id
ON alerts (workspace_id);

-- Critical: Composite index for workspace + created_at DESC (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_created
ON alerts (workspace_id, created_at DESC);

-- Critical: Composite index for workspace + status (alert filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_status
ON alerts (workspace_id, status);

-- Critical: Composite index for workspace + severity (severity filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_severity
ON alerts (workspace_id, severity);

-- Composite for workspace + status + severity (common dashboard query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_status_severity
ON alerts (workspace_id, status, severity);

-- Index for type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_type
ON alerts (type);

-- Index for status (dashboard counts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_status
ON alerts (status);

-- Index for severity (severity distribution)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_severity
ON alerts (severity);

-- Composite for deadline queries (SLA tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_deadline
ON alerts (workspace_id, deadline)
WHERE deadline IS NOT NULL;

-- Index for acknowledged_at (time to acknowledge metrics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_acknowledged_at
ON alerts (acknowledged_at)
WHERE acknowledged_at IS NOT NULL;

-- Index for resolved_at (resolution time metrics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_resolved_at
ON alerts (resolved_at)
WHERE resolved_at IS NOT NULL;

-- Index for assigned_to (user workload queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_assigned_to
ON alerts (assigned_to)
WHERE assigned_to IS NOT NULL;

-- Composite for my alerts queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_assigned_created
ON alerts (workspace_id, assigned_to, created_at DESC);

-- GIN index for metadata JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_metadata
ON alerts USING GIN (metadata jsonb_path_ops);

-- ============================================
-- Analytics Aggregation Indexes
-- ============================================

-- These indexes support efficient COUNT/GROUP BY queries for dashboard

-- Index for severity distribution by workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_severity_created
ON alerts (workspace_id, severity, created_at DESC);

-- Index for daily/hourly trend queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_workspace_created_hour
ON alerts (workspace_id, date_trunc('hour', created_at));

COMMIT;

-- ============================================
-- Index Usage Notes
-- ============================================
--
-- Alert List Query (paginated):
--   SELECT * FROM alerts WHERE workspace_id = $1
--     ORDER BY created_at DESC LIMIT 20 OFFSET 0
--   -- Uses idx_alerts_workspace_created
--
-- Alert Dashboard Counts:
--   SELECT status, count(*) FROM alerts
--     WHERE workspace_id = $1 GROUP BY status
--   -- Uses idx_alerts_workspace_status
--
-- Severity Distribution:
--   SELECT severity, count(*) FROM alerts
--     WHERE workspace_id = $1 GROUP BY severity
--   -- Uses idx_alerts_workspace_severity
--
-- My Alerts:
--   SELECT * FROM alerts WHERE assigned_to = $1
--     ORDER BY created_at DESC
--   -- Uses idx_alerts_assigned_to
--
-- SLA Monitoring:
--   SELECT * FROM alerts WHERE workspace_id = $1
--     AND deadline < NOW() AND status != 'resolved'
--   -- Uses idx_alerts_workspace_deadline
--
-- ============================================
