-- Account-level conversation under monitored posts (YouTube comments and replies, free through the YouTube Data API).
-- It feeds the conversation network (who replies to whom, camps, most influential accounts, coordinated posting).
-- Kept apart from signals: comments are not news items and must not inflate mention counts.
create table if not exists public.social_comments (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    signal_id uuid references public.signals(id) on delete cascade,
    platform text not null,
    external_id text not null,
    parent_external_id text,
    author_id text,
    author_name text,
    reply_to_author_id text,
    reply_to_author_name text,
    text text,
    like_count integer not null default 0,
    reply_count integer not null default 0,
    published_at timestamptz,
    sentiment text,
    created_at timestamptz not null default now(),
    unique (workspace_id, platform, external_id)
);

create index if not exists social_comments_workspace_published_idx on public.social_comments (workspace_id, published_at desc);
create index if not exists social_comments_signal_idx on public.social_comments (signal_id);

-- Read and written by the backend's service role only.
alter table public.social_comments enable row level security;
