import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Client-demo workflow: one admin owns several client workspaces, every
// request reads exactly one of them, and the cost-bearing controls are
// owner/admin only.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const ingestCalls = [];
const failingKeywords = new Set();
let ingestDelayMs = 0;
let noKeyword = false;
jest.unstable_mockModule('../src/modules/ingestion/rss-ingestion.service.js', () => ({
  ingestRssSignals: jest.fn(async (args) => {
    ingestCalls.push(args);
    if (noKeyword) throw Object.assign(new Error('No monitoring keyword is configured for this workspace. Add a keyword first.'), { code: 'NO_KEYWORD' });
    if (ingestDelayMs) await new Promise((r) => setTimeout(r, ingestDelayMs));
    // Same error shape as an unreachable Google News feed.
    if (failingKeywords.has(args.keyword)) throw new Error('Google News RSS fetch failed: HTTP 503');
    return { totalFetched: 4, newSignalsCreated: 3, skippedDuplicates: 1, analyzed: 3, analysisFailed: 0, insertFailed: 0, clustering: { clustersCreated: 1 }, alerts: [] };
  }),
}));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { MAX_OWNED_WORKSPACES } = await import('../src/modules/workspaces/workspaces.routes.js');
const { categorizeProviderError } = await import('../src/modules/ai/ai.routes.js');
const collection = await import('../src/modules/ingestion/apify-collection.service.js');

const ADMIN = '00000000-0000-4000-8000-0000000000c1';
const ANALYST = '00000000-0000-4000-8000-0000000000c2';
const WS_A = '00000000-0000-4000-8000-00000000a001';
const WS_B = '00000000-0000-4000-8000-00000000b001';
const WS_OTHER = '00000000-0000-4000-8000-00000000f001';
const as = (id, extra = {}) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com`, ...extra }, process.env.JWT_SECRET)}` });
const demo = () => ({ Authorization: `Bearer ${jwt.sign({ id: 'demo_x', email: 'demo@narriv.ai', isDemo: true }, process.env.JWT_SECRET)}` });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  ingestCalls.length = 0;
  failingKeywords.clear();
  ingestDelayMs = 0;
  delete process.env.TEST_WORKERS_DISABLED;
  db.table('workspaces').push(
    { id: WS_A, name: 'Client A', onboarding_completed: true, created_at: '2026-10-01T00:00:00Z' },
    { id: WS_B, name: 'Client B', onboarding_completed: true, created_at: '2026-10-02T00:00:00Z' },
    { id: WS_OTHER, name: 'Someone else', onboarding_completed: true, created_at: '2026-10-03T00:00:00Z' },
  );
  db.table('workspace_members').push(
    { id: 'm1', workspace_id: WS_A, user_id: ADMIN, role: 'owner', created_at: '2026-10-01T00:00:00Z' },
    { id: 'm2', workspace_id: WS_B, user_id: ADMIN, role: 'owner', created_at: '2026-10-02T00:00:00Z' },
    { id: 'm3', workspace_id: WS_A, user_id: ANALYST, role: 'analyst', created_at: '2026-10-01T00:00:00Z' },
  );
  db.table('sources').push(
    { id: '00000000-0000-4000-8000-00000000aa01', workspace_id: WS_A, name: 'A news', type: 'news', is_active: true, created_at: '2026-10-01T00:00:00Z' },
    { id: 's-b', workspace_id: WS_B, name: 'B news', type: 'news', is_active: true, created_at: '2026-10-02T00:00:00Z' },
    { id: 's-o', workspace_id: WS_OTHER, name: 'Other news', type: 'news', is_active: true, created_at: '2026-10-03T00:00:00Z' },
  );
});

const sourceNames = (res) => (res.body.data || []).map((s) => s.name).sort();

describe('workspace isolation', () => {
  it('reads exactly one workspace: the default when none is selected', async () => {
    const res = await request(app).get('/sources').set(as(ADMIN));
    expect(res.status).toBe(200);
    expect(sourceNames(res)).toHaveLength(1); // never A and B mixed
  });

  it('reads the workspace selected with X-Workspace-Id', async () => {
    expect(sourceNames(await request(app).get('/sources').set(as(ADMIN)).set('X-Workspace-Id', WS_A))).toEqual(['A news']);
    expect(sourceNames(await request(app).get('/sources').set(as(ADMIN)).set('X-Workspace-Id', WS_B))).toEqual(['B news']);
  });

  it('a selected workspace the user does not belong to yields nothing', async () => {
    const res = await request(app).get('/sources').set(as(ADMIN)).set('X-Workspace-Id', WS_OTHER);
    expect(sourceNames(res)).toEqual([]);
    const kw = await request(app).get('/workspace/keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_OTHER);
    expect(kw.status).toBe(403);
  });
});

describe('client workspaces', () => {
  it('lists the caller\'s workspaces with roles', async () => {
    const res = await request(app).get('/workspaces').set(as(ADMIN)).set('X-Workspace-Id', WS_B);
    expect(res.status).toBe(200);
    expect(res.body.data.map((w) => [w.name, w.role])).toEqual([['Client A', 'owner'], ['Client B', 'owner']]);
    expect(res.body.currentWorkspaceId).toBe(WS_B);
  });

  it('creates a client workspace owned by the caller, with settings', async () => {
    const res = await request(app).post('/workspaces').set(as(ADMIN)).send({ name: '  PT Contoh   Klien ', industry: 'Banking', timezone: 'Asia/Jakarta (GMT+7)' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'PT Contoh Klien', role: 'owner' });
    const id = res.body.data.id;
    expect(db.table('workspace_members').find((m) => m.workspace_id === id)).toMatchObject({ user_id: ADMIN, role: 'owner' });
    expect(db.table('workspace_settings').find((s) => s.workspace_id === id)).toMatchObject({ brand_name: 'PT Contoh Klien', industry: 'Banking', timezone: 'Asia/Jakarta' });
    expect(db.table('workspaces').find((w) => w.id === id).onboarding_completed).toBe(true);
  });

  it('validates the name, enforces the owned-workspace limit, and refuses demo sessions', async () => {
    expect((await request(app).post('/workspaces').set(as(ADMIN)).send({ name: 'x' })).status).toBe(400);
    for (let i = 0; i < MAX_OWNED_WORKSPACES - 2; i += 1) {
      db.table('workspace_members').push({ id: `extra-${i}`, workspace_id: `00000000-0000-4000-8000-0000000e${String(i).padStart(4, '0')}`, user_id: ADMIN, role: 'owner' });
    }
    const limited = await request(app).post('/workspaces').set(as(ADMIN)).send({ name: 'One too many' });
    expect(limited.status).toBe(409);
    expect(limited.body.code).toBe('WORKSPACE_LIMIT');
    expect((await request(app).post('/workspaces').set(demo()).send({ name: 'Demo try' })).status).toBe(403);
  });
});

describe('ingestion controls', () => {
  it('manual fetch is owner/admin only and never takes a feed URL from the request', async () => {
    expect((await request(app).post('/ingestion/fetch').set(as(ANALYST)).set('X-Workspace-Id', WS_A).send({})).status).toBe(403);
    expect((await request(app).post('/ingestion/fetch').set(demo()).send({})).status).toBe(403);
    const res = await request(app).post('/ingestion/fetch').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({ keyword: 'Bank A', rssUrl: 'http://169.254.169.254/latest/meta-data' });
    expect(res.status).toBe(200);
    expect(ingestCalls[0]).toMatchObject({ workspaceId: WS_A, keyword: 'Bank A', rssUrl: null });
  });

  it('run-keywords requires active keywords', async () => {
    const res = await request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('no_keywords');
  });

  it('run-keywords processes only this workspace\'s keywords, logs the run, then cools down', async () => {
    db.table('monitoring_keywords').push(
      { id: 'k1', workspace_id: WS_A, keyword: 'Bank A', is_active: true, created_at: '2026-10-01T00:00:00Z' },
      { id: 'k2', workspace_id: WS_A, keyword: 'Bank A gold', is_active: true, created_at: '2026-10-01T00:01:00Z' },
      { id: 'k3', workspace_id: WS_A, keyword: 'Paused topic', is_active: false, created_at: '2026-10-01T00:02:00Z' },
      { id: 'k4', workspace_id: WS_B, keyword: 'Client B only', is_active: true, created_at: '2026-10-01T00:00:00Z' },
    );
    const res = await request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(ingestCalls.map((c) => [c.workspaceId, c.keyword])).toEqual([[WS_A, 'Bank A'], [WS_A, 'Bank A gold']]);
    expect(res.body.totals).toMatchObject({ fetched: 8, inserted: 6, deduplicated: 2, analyzed: 6 });
    const log = db.table('cron_ingestion_logs').find((l) => l.metadata?.workspaceId === WS_A);
    expect(log).toMatchObject({ status: 'completed' });
    expect(log.metadata.trigger).toBe(`manual:${ADMIN}`);

    const again = await request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
    expect(again.status).toBe(429);
    expect(again.body.status).toBe('cooldown');
    // Another workspace is not affected by A's cooldown.
    expect((await request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_B).send({})).status).toBe(200);
  });

  const seedKeywords = (...words) => words.forEach((keyword, i) => db.table('monitoring_keywords').push({ id: `kw-${i}`, workspace_id: WS_A, keyword, is_active: true, created_at: `2026-10-01T00:0${i}:00Z` }));

  it('two simultaneous runs for one workspace: one runs, the other is told it is in progress', async () => {
    seedKeywords('Bank A');
    ingestDelayMs = 150;
    const [a, b] = await Promise.all([
      request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({}),
      request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({}),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 429]);
    expect(ingestCalls).toHaveLength(1); // the keyword was fetched once, not twice
  });

  it('an upstream failure for one keyword is reported per keyword; the others still save', async () => {
    seedKeywords('Bank A', 'Down topic');
    failingKeywords.add('Down topic');
    const res = await request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed_with_errors');
    const byKeyword = Object.fromEntries(res.body.results.map((r) => [r.keyword, r]));
    expect(byKeyword['Bank A']).toMatchObject({ status: 'ok', inserted: 3 });
    expect(byKeyword['Down topic']).toMatchObject({ status: 'failed', errorCategory: 'source_unavailable' });
    expect(res.body.totals).toMatchObject({ inserted: 3, failedKeywords: 1 });
  });

  it('when every keyword fails the run is failed and existing articles are untouched', async () => {
    seedKeywords('Down 1', 'Down 2');
    failingKeywords.add('Down 1'); failingKeywords.add('Down 2');
    db.table('signals').push({ id: 'existing-1', workspace_id: WS_A, title: 'Earlier article', url: 'https://news.example/earlier' });
    const res = await request(app).post('/ingestion/run-keywords').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
    expect(res.body.status).toBe('failed');
    expect(res.body.totals).toMatchObject({ inserted: 0, failedKeywords: 2 });
    expect(db.table('signals').map((x) => x.id)).toEqual(['existing-1']);
  });

  it('run-keywords is refused to analysts and demo sessions', async () => {
    expect((await request(app).post('/ingestion/run-keywords').set(as(ANALYST)).set('X-Workspace-Id', WS_A).send({})).status).toBe(403);
    expect((await request(app).post('/ingestion/run-keywords').set(demo()).send({})).status).toBe(403);
  });

  it('source runs say workers are unavailable instead of reporting a job that never runs', async () => {
    process.env.TEST_WORKERS_DISABLED = '1';
    const res = await request(app).post('/ingestion/run/00000000-0000-4000-8000-00000000aa01').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('WORKERS_DISABLED');
    expect(db.table('ingestion_jobs')).toHaveLength(0);
  });
});

describe('AI endpoints', () => {
  it('the generic completion endpoint is closed to demo sessions and analysts', async () => {
    expect((await request(app).post('/ai/complete').set(demo()).send({ user: 'hello' })).status).toBe(403);
    expect((await request(app).post('/ai/complete').set(as(ANALYST)).set('X-Workspace-Id', WS_A).send({ user: 'hello' })).status).toBe(403);
  });

  it('provider check is owner/admin only and reports unconfigured providers honestly', async () => {
    expect((await request(app).post('/ai/providers/check').set(as(ANALYST)).set('X-Workspace-Id', WS_A).send({})).status).toBe(403);
    const keys = { o: process.env.OPENAI_API_KEY, a: process.env.ANTHROPIC_API_KEY, p1: process.env.APIFY_TOKEN, p2: process.env.APIFY_API_TOKEN };
    delete process.env.OPENAI_API_KEY; delete process.env.ANTHROPIC_API_KEY; delete process.env.APIFY_TOKEN; delete process.env.APIFY_API_TOKEN;
    try {
      const res = await request(app).post('/ai/providers/check').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
      expect(res.status).toBe(200);
      expect(res.body.results.openai).toEqual({ configured: false });
      expect(res.body.results.anthropic).toEqual({ configured: false });
      expect(res.body.results.apify).toEqual({ configured: false });
    } finally {
      if (keys.o !== undefined) process.env.OPENAI_API_KEY = keys.o;
      if (keys.a !== undefined) process.env.ANTHROPIC_API_KEY = keys.a;
      if (keys.p1 !== undefined) process.env.APIFY_TOKEN = keys.p1;
      if (keys.p2 !== undefined) process.env.APIFY_API_TOKEN = keys.p2;
    }
  });

  it('lists what each workflow actually runs on', async () => {
    const res = await request(app).get('/ai/providers').set(as(ADMIN)).set('X-Workspace-Id', WS_A);
    expect(res.status).toBe(200);
    const byName = Object.fromEntries(res.body.workflows.map((w) => [w.workflow, w]));
    expect(byName.signal_analysis_and_sentiment).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini', routed: false });
    expect(byName.ask_narriv.routed).toBe(true);
    expect(byName.narrative_clustering.model).toBeNull();
  });

  it('reduces provider errors to categories', () => {
    expect(categorizeProviderError({ status: 401, message: 'invalid x-api-key' })).toBe('authentication_failed');
    expect(categorizeProviderError({ status: 400, message: 'Your credit balance is too low' })).toBe('billing_or_quota');
    expect(categorizeProviderError({ status: 404, message: 'model not found' })).toBe('model_not_found');
    expect(categorizeProviderError({ status: 429, message: 'rate' })).toBe('rate_limited');
    expect(categorizeProviderError({ status: 529, message: 'overloaded' })).toBe('provider_unavailable');
  });
});

describe('platform collection routes', () => {
  const starts = [];
  beforeEach(() => {
    starts.length = 0;
    process.env.APIFY_TOKEN = 'test-token';
    collection.setApifyClientFactory(() => ({
      actor: (actorId) => ({ start: async (input) => { starts.push({ actorId, input }); return { id: 'run-x', defaultDatasetId: 'ds-x', status: 'READY' }; } }),
      run: () => ({ get: async () => ({ id: 'run-x', status: 'RUNNING' }) }),
    }));
    db.table('monitoring_keywords').push(
      { id: 'kw-a', workspace_id: WS_A, keyword: 'Bank A', is_active: true, created_at: '2026-10-01T00:00:00Z' },
      { id: 'kw-b', workspace_id: WS_B, keyword: 'Bank B', is_active: true, created_at: '2026-10-01T00:00:00Z' },
    );
  });
  afterAll(() => { delete process.env.APIFY_TOKEN; collection.setApifyClientFactory(null); });

  it('starting a collection is owner/admin only', async () => {
    expect((await request(app).post('/ingestion/collect').set(as(ANALYST)).set('X-Workspace-Id', WS_A).send({ preset: 'tiktok-hashtag' })).status).toBe(403);
    expect((await request(app).post('/ingestion/collect').set(demo()).send({ preset: 'tiktok-hashtag' })).status).toBe(403);
    expect(starts).toHaveLength(0);
    const res = await request(app).post('/ingestion/collect').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({ preset: 'tiktok-hashtag' });
    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({ status: 'running', platform: 'tiktok', keyword: 'Bank A' });
    expect(starts[0].input.hashtags).toEqual(['Bank A']);
    const again = await request(app).post('/ingestion/collect').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({ preset: 'youtube-search' });
    expect(again.status).toBe(409);
    expect((await request(app).post('/ingestion/collect').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({ preset: 'nope' })).status).toBe(400);
  });

  it('history and status stay inside the selected workspace', async () => {
    const started = await request(app).post('/ingestion/collect').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({ preset: 'instagram-posts' });
    const id = started.body.data.id;
    const listA = await request(app).get('/ingestion/collect').set(as(ANALYST)).set('X-Workspace-Id', WS_A);
    expect(listA.status).toBe(200);
    expect(listA.body.configured).toBe(true);
    expect(listA.body.data.map((r) => r.id)).toEqual([id]);
    const listB = await request(app).get('/ingestion/collect').set(as(ADMIN)).set('X-Workspace-Id', WS_B);
    expect(listB.body.data).toEqual([]);
    expect((await request(app).get(`/ingestion/collect/${id}`).set(as(ADMIN)).set('X-Workspace-Id', WS_B)).status).toBe(404);
    expect((await request(app).get(`/ingestion/collect/${id}`).set(demo())).status).toBe(404);
    const status = await request(app).get(`/ingestion/collect/${id}`).set(as(ANALYST)).set('X-Workspace-Id', WS_A);
    expect(status.body.data).toMatchObject({ status: 'running', apifyStatus: 'RUNNING' });
  });

  it('manual fetch without any keyword answers 400, not 500', async () => {
    noKeyword = true;
    try {
      const res = await request(app).post('/ingestion/fetch').set(as(ADMIN)).set('X-Workspace-Id', WS_A).send({});
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('no_keywords');
    } finally {
      noKeyword = false;
    }
  });
});
