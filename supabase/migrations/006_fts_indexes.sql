-- ============================================
-- Migration: 006_fts_indexes.sql
-- Full-Text Search Indexes for Signals
-- ============================================
-- This migration adds GIN indexes for efficient full-text search on signals table
-- Run with: supabase db push or psql

BEGIN;

-- ============================================
-- Enable required extensions
-- ============================================

-- Enable pg_trgm for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Full-Text Search Indexes
-- ============================================

-- Main GIN index for full-text search with english stemming
-- This enables efficient ts_match queries on title and content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_fts_title_content
ON signals
USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
);

-- Separate FTS index on title for title-specific searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_fts_title
ON signals
USING GIN (
    to_tsvector('english', coalesce(title, ''))
);

-- Separate FTS index on content for content-specific searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_fts_content
ON signals
USING GIN (
    to_tsvector('english', coalesce(content, ''))
);

-- ============================================
-- Trigram Indexes for Fuzzy Search
-- ============================================

-- Trigram GIN index on title for LIKE/ILIKE and fuzzy matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_title_trgm
ON signals
USING GIN (title gin_trgm_ops);

-- Trigram GIN index on content for LIKE/ILIKE and fuzzy matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_content_trgm
ON signals
USING GIN (content gin_trgm_ops);

-- ============================================
-- Composite Indexes for Common Query Patterns
-- ============================================

-- Workspace + created_at for timeline queries within workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_workspace_created
ON signals (workspace_id, created_at DESC);

-- Workspace + captured_at for signal timeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_workspace_captured
ON signals (workspace_id, captured_at DESC);

-- Workspace + sentiment for filtered views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_workspace_sentiment
ON signals (workspace_id, sentiment);

-- Workspace + platform for platform-filtered views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_workspace_platform
ON signals (workspace_id, platform);

-- ============================================
-- JSONB Indexes for Metadata
-- ============================================

-- GIN index on metadata for JSON path queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_metadata
ON signals
USING GIN (metadata jsonb_path_ops);

-- ============================================
-- Additional Performance Indexes
-- ============================================

-- Index on captured_at for time-series queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_captured_at
ON signals (captured_at DESC);

-- Index on platform for platform distribution queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_platform
ON signals (platform);

-- Index on sentiment for sentiment distribution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_sentiment
ON signals (sentiment);

-- Composite index for workspace + platform + sentiment (common dashboard query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_workspace_platform_sentiment
ON signals (workspace_id, platform, sentiment);

COMMIT;

-- ============================================
-- Index Usage Notes
-- ============================================
--
-- Full-Text Search Queries:
--   SELECT * FROM signals WHERE
--     to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', 'crisis & management')
--
-- Fuzzy Search Queries:
--   SELECT * FROM signals WHERE title ILIKE '%manage%'  -- Uses trigram index
--   SELECT * FROM signals WHERE similarity(title, 'crisis') > 0.3  -- Uses trigram
--
-- Timeline Queries:
--   SELECT * FROM signals WHERE workspace_id = $1
--     ORDER BY captured_at DESC LIMIT 100  -- Uses idx_signals_workspace_captured
--
-- Dashboard Aggregations:
--   SELECT platform, count(*) FROM signals
--     WHERE workspace_id = $1 GROUP BY platform  -- Uses idx_signals_workspace_platform
--
-- ============================================
