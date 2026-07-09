# Supabase Database Setup Guide

Complete guide to set up Narriv's PostgreSQL database with Supabase.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Schema](#database-schema)
4. [Row-Level Security](#row-level-security)
5. [Database Functions](#database-functions)
6. [Triggers](#triggers)
7. [Migration Files](#migration-files)

---

## Overview

Narriv uses Supabase (PostgreSQL) with:

- **Row-Level Security (RLS)** for multi-tenant data isolation
- **Database functions** for complex business logic
- **Triggers** for automatic audit logging
- **Indexes** for query performance

---

## Prerequisites

- Supabase project created
- SQL Editor access (Dashboard > SQL Editor)
- Service role key (for migrations)

---

## Database Schema

### 1. Users & Authentication

```sql
-- Users table (managed by Supabase Auth, extended)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth accounts
CREATE TABLE public.oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Password reset tokens
CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Workspaces & Multi-tenancy

```sql
-- Workspaces (tenants)
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members
CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Workspace settings
CREATE TABLE public.workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    brand_name TEXT,
    industry TEXT,
    timezone TEXT DEFAULT 'Asia/Jakarta',
    language TEXT DEFAULT 'id',
    notification_email TEXT,
    whatsapp_pic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace notification settings
CREATE TABLE public.workspace_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT false,
    escalation_notifications BOOLEAN DEFAULT true,
    reminder_notifications BOOLEAN DEFAULT true,
    custom_rules JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Data Pipeline

```sql
-- Sources (data collection configuration)
CREATE TABLE public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Ingestion jobs
CREATE TABLE public.ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    items_processed INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw documents
CREATE TABLE public.raw_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    external_id TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals (processed intelligence)
CREATE TABLE public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    raw_document_id UUID REFERENCES public.raw_documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    platform TEXT,
    url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    sentiment TEXT,
    sentiment_score NUMERIC(3,2),
    severity TEXT,
    region TEXT,
    language TEXT,
    topics TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signal analyses
CREATE TABLE public.signal_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE,
    analysis JSONB NOT NULL,
    confidence NUMERIC(3,2),
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Core Features

```sql
-- Alerts
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    source TEXT,
    assigned_to UUID REFERENCES public.users(id),
    assigned_team TEXT,
    escalation_level TEXT,
    deadline TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation matrices
CREATE TABLE public.escalation_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    sla_minutes INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Narrative clusters
CREATE TABLE public.narrative_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    summary JSONB,
    priority TEXT,
    signal_count INT DEFAULT 0,
    velocity NUMERIC(5,2),
    impact TEXT,
    lifecycle TEXT,
    keywords TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Narrative cluster signals
CREATE TABLE public.narrative_cluster_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES public.narrative_clusters(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cluster_id, signal_id)
);
```

### 5. Reports

```sql
-- Reports
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    content JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report exports
CREATE TABLE public.report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    format TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    file_path TEXT,
    file_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Report templates
CREATE TABLE public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report schedules
CREATE TABLE public.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.report_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cadence TEXT NOT NULL,
    day_of_week INT,
    time_of_day TIME,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. Actions & Feedback

```sql
-- Action plans
CREATE TABLE public.action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    strategy JSONB,
    priority TEXT,
    status TEXT DEFAULT 'pending',
    assigned_to UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated assets
CREATE TABLE public.generated_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    action_plan_id UUID REFERENCES public.action_plans(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI feedback
CREATE TABLE public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    action_plan_id UUID REFERENCES public.action_plans(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis failure logs
CREATE TABLE public.ai_analysis_failure_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
    error_type TEXT,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. AI Visibility

```sql
-- AI visibility results
CREATE TABLE public.ai_visibility_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    query TEXT,
    result JSONB DEFAULT '{}',
    score NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt test runs
CREATE TABLE public.prompt_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    visibility_result_id UUID REFERENCES public.ai_visibility_results(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    response TEXT,
    response_id TEXT,
    sentiment TEXT,
    relevance_score NUMERIC(3,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. System Tables

```sql
-- Cases
CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT,
    assignee_id UUID REFERENCES public.users(id),
    signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
    deadline TIMESTAMPTZ,
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations
CREATE TABLE public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'disconnected',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token usage tracking
CREATE TABLE public.token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    operation TEXT NOT NULL,
    model TEXT,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cost NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App notifications
CREATE TABLE public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Row-Level Security

Enable RLS on all tables and create policies:

```sql
-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Users can view their workspaces
CREATE POLICY "Users can view own workspaces"
    ON public.workspaces FOR SELECT
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Users can update own workspaces
CREATE POLICY "Users can update own workspaces"
    ON public.workspaces FOR UPDATE
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Enable RLS on signals
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace signals"
    ON public.signals FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own workspace signals"
    ON public.signals FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace alerts"
    ON public.alerts FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Similar policies for all other tables...
-- Repeat pattern above for: sources, reports, action_plans, cases, etc.
```

---

## Database Functions

### Helper Functions

```sql
-- Get user's workspace IDs
CREATE OR REPLACE FUNCTION get_user_workspace_ids()
RETURNS TABLE(workspace_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Triggers

### Auto-update timestamps

```sql
-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER signals_updated_at
    BEFORE UPDATE ON public.signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Continue for other tables...
```

---

## Migration Files

Place migration files in `supabase/migrations/` directory:

```
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_rls_policies.sql
    ├── 003_functions.sql
    └── 004_triggers.sql
```

Run migrations:
```bash
supabase db push
# Or via SQL Editor in Supabase Dashboard
```

---

## Next Steps

- [Deployment Guide](deployment.md) - Deploy to production
- [API Documentation](api.md) - API reference
