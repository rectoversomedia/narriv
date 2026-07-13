-- Migration: 008_monitoring_setup.sql
-- Add monitoring_keywords table and update workspaces for guided onboarding

BEGIN;

-- ============================================
-- MONITORING KEYWORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.monitoring_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_keywords_workspace ON public.monitoring_keywords(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_keywords_active ON public.monitoring_keywords(is_active) WHERE is_active = true;

-- ============================================
-- UPDATE WORKSPACES TABLE
-- ============================================
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- ============================================
-- PRE-CONFIGURED SOURCE TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.source_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'news', 'social', 'forum', 'review'
    default_keywords TEXT[], -- suggested keywords for this source
    config JSONB DEFAULT '{}', -- source-specific config
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Indonesia Media Pack templates
INSERT INTO public.source_templates (name, slug, description, category, default_keywords, config) VALUES
-- News Sources
('Kompas.com', 'kompas', 'Indonesian daily newspaper', 'news',
 ARRAY['kompas', 'berita hari ini', 'indonesia news'],
 '{"domain": "kompas.com", "type": "news"}'),

('Detik.com', 'detik', 'Indonesian news portal', 'news',
 ARRAY['detik', 'berita', 'indonesia news'],
 '{"domain": "detik.com", "type": "news"}'),

('Tribun News', 'tribun', 'Indonesian regional news', 'news',
 ARRAY['tribun', 'berita daerah', 'indonesia'],
 '{"domain": "tribunnews.com", "type": "news"}'),

('CNN Indonesia', 'cnn', 'CNN Indonesia', 'news',
 ARRAY['cnn indonesia', 'berita nasional', 'politik'],
 '{"domain": "cnnindonesia.com", "type": "news"}'),

('BBC Indonesia', 'bbc-indonesia', 'BBC Indonesia service', 'news',
 ARRAY['bbc indonesia', 'world news', 'indonesia'],
 '{"domain": "bbc.com/indonesia", "type": "news"}'),

-- Social Sources
('Twitter/X Indonesia', 'twitter-indonesia', 'Indonesian Twitter trends', 'social',
 ARRAY['twitter', 'trending', 'viral'],
 '{"platform": "twitter", "type": "social"}'),

('Instagram Indonesia', 'instagram-indonesia', 'Indonesian Instagram discussions', 'social',
 ARRAY['instagram', 'viral', 'trending'],
 '{"platform": "instagram", "type": "social"}'),

-- Forums
('Kaskus', 'kaskus', 'Indonesian largest forum', 'forum',
 ARRAY['kaskus', 'forum indonesia', 'diskusi'],
 '{"domain": "kaskus.co.id", "type": "forum"}'),

-- Reviews
('Google Reviews', 'google-reviews', 'Google business reviews', 'review',
 ARRAY['google reviews', 'rating', 'ulasan'],
 '{"platform": "google", "type": "review"}'),

('App Store', 'app-store', 'App Store reviews', 'review',
 ARRAY['app store', 'mobile app', 'rating'],
 '{"platform": "appstore", "type": "review"}')

ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- WORKSPACE SOURCE TEMPLATE LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.workspace_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_template_id UUID REFERENCES public.source_templates(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    keywords TEXT[], -- which keywords this source monitors
    last_sync_at TIMESTAMPTZ,
    last_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_sources_workspace ON public.workspace_sources(workspace_id);

-- ============================================
-- ONBOARDING PROGRESS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    completed_steps TEXT[] DEFAULT '{}',
    company_name TEXT,
    industry TEXT,
    keywords_added TEXT[] DEFAULT '{}',
    sources_selected TEXT[] DEFAULT '{}',
    alerts_configured BOOLEAN DEFAULT false,
    reports_template TEXT,
    setup_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAMPLE/DEMO REPORT TEMPLATE
-- ============================================
INSERT INTO public.report_templates (name, type, content, is_system) VALUES
('Eksekutif Summary', 'executive',
 '{"sections": ["Overview", "Key Metrics", "Sentiment Analysis", "Top Topics", "Recommendations"], "format": "slides", "duration": "5 min"}', true),

('Detailed Analysis', 'detailed',
 '{"sections": ["Executive Summary", "Methodology", "Data Overview", "Sentiment Deep Dive", "Topic Analysis", "Trend Analysis", "Risk Assessment", "Action Items"], "format": "document", "duration": "20 min"}', true),

('Crisis Report', 'crisis',
 '{"sections": ["Timeline", "Impact Assessment", "Sentiment Spike", "Stakeholder Reactions", "Recommended Response"], "format": "urgent", "duration": "3 min"}', true),

('Weekly Digest', 'weekly',
 '{"sections": ["This Week at a Glance", "Top Performing Topics", "Sentiment Trends", "Notable Mentions", "Next Week Outlook"], "format": "digest", "duration": "10 min"}', true)

ON CONFLICT DO NOTHING;

COMMIT;
