import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Data Sources status comes from runs and stored documents, never from the
// on/off switch alone.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { connectorStatus } = await import('../src/lib/source-health.js');

const OWNER = '00000000-0000-4000-8000-0000000000e1';
const WS = '00000000-0000-4000-8000-00000000e001';
const OTHER = '00000000-0000-4000-8000-00000000e002';
const id = (n) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ id: OWNER, email: 'o@example.com' }, process.env.JWT_SECRET)}` });
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const card = (n, name, actor, extra = {}) => ({ id: id(n), workspace_id: WS, name, type: 'social', actor_id: actor, input_config: {}, is_active: true, created_at: ago(5000), ...extra });
const collection = (status, metadata, min) => ({ id: crypto.randomUUID(), job_name: 'apify-collection', status, created_at: ago(min), metadata: { workspaceId: WS, startedAt: ago(min), ...metadata } });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner' });
  db.table('sources').push(
    card(1, 'X / Twitter Latest', 'apidojo/twitter-scraper-lite'),
    card(2, 'TikTok Hashtag', 'clockworks/tiktok-scraper'),
    card(3, 'Instagram Posts', 'apify/instagram-scraper'),
    card(4, 'YouTube Search', 'streamers/youtube-scraper'),
    card(5, 'Threads Search', 'automation-lab/threads-scraper'),
    card(6, 'Facebook Posts', 'apify/facebook-posts-scraper', { is_active: false }),
    card(7, 'Indonesia News', 'nadpra/indonews'),
    { ...card(8, 'Other client X', 'apidojo/twitter-scraper-lite'), workspace_id: OTHER },
  );
  db.table('cron_ingestion_logs').push(
    collection('completed', { sourceId: id(1), actorId: 'apidojo/twitter-scraper-lite', platform: 'x', finishedAt: ago(30), totals: { inserted: 2 } }, 31),
    collection('completed_empty', { sourceId: id(2), actorId: 'clockworks/tiktok-scraper', platform: 'tiktok', finishedAt: ago(20) }, 21),
    collection('failed', { sourceId: id(3), actorId: 'apify/instagram-scraper', platform: 'instagram', error: 'actor_not_rented', finishedAt: ago(10) }, 11),
    collection('failed', { sourceId: id(4), actorId: 'streamers/youtube-scraper', platform: 'youtube', error: 'timeout', finishedAt: ago(5) }, 6),
    collection('running', { sourceId: id(5), actorId: 'automation-lab/threads-scraper', platform: 'threads' }, 2),
    // Another client's run of the same actor never counts here.
    { ...collection('completed', { sourceId: id(8), actorId: 'apidojo/twitter-scraper-lite', finishedAt: ago(1) }, 2), metadata: { workspaceId: OTHER, sourceId: id(8), actorId: 'apidojo/twitter-scraper-lite', finishedAt: ago(1) } },
    // Google News keyword monitoring for this workspace (scheduled).
    { id: 'kw-run', job_name: 'scheduled-rss-ingestion', status: 'completed', created_at: ago(60), metadata: { trigger: 'vercel-cron:0', finishedAt: ago(59), results: [{ workspaceId: WS, keyword: 'Bank A', status: 'ok', inserted: 3 }, { workspaceId: OTHER, keyword: 'B', status: 'ok', inserted: 9 }] } },
  );
  db.table('raw_documents').push(
    { id: 'd1', workspace_id: WS, source_id: id(1), created_at: ago(30) },
    { id: 'd2', workspace_id: WS, source_id: id(1), created_at: ago(30) },
    { id: 'd3', workspace_id: WS, source_id: null, created_at: ago(59) }, // Google News: no card
    { id: 'd4', workspace_id: OTHER, source_id: id(8), created_at: ago(1) },
  );
  db.table('signals').push(
    { id: 's1', workspace_id: WS, platform: 'x', captured_at: ago(30) },
    { id: 's2', workspace_id: WS, platform: 'x', captured_at: ago(30) },
    { id: 's3', workspace_id: WS, platform: 'news', captured_at: ago(59) },
    { id: 's4', workspace_id: WS, platform: 'news', captured_at: ago(60 * 24 * 10) }, // outside 7 days
    { id: 's5', workspace_id: OTHER, platform: 'x', captured_at: ago(1) },
  );
});

describe('GET /sources/health', () => {
  it('derives each card status from its runs', async () => {
    const res = await request(app).get('/sources/health').set(auth());
    expect(res.status).toBe(200);
    const byName = Object.fromEntries(res.body.sources.map((s) => [s.name, s.connector]));
    expect(byName['X / Twitter Latest']).toMatchObject({ status: 'operational', documents: 2 });
    expect(byName['TikTok Hashtag']).toMatchObject({ status: 'no_results', documents: 0 });
    expect(byName['Instagram Posts']).toMatchObject({ status: 'access_restricted', lastError: 'actor_not_rented' });
    expect(byName['YouTube Search']).toMatchObject({ status: 'failed', lastError: 'timeout' });
    expect(byName['Threads Search'].status).toBe('collecting');
    expect(byName['Facebook Posts'].status).toBe('paused');
    expect(byName['Indonesia News']).toMatchObject({ status: 'not_tested', lastRunAt: null, lastSuccessAt: null });
    expect(byName['Other client X']).toBeUndefined();
    // Zero matching results is not unhealthy.
    const tiktok = res.body.sources.find((s) => s.name === 'TikTok Hashtag');
    expect(tiktok.health.health).toBe('healthy');
    expect(res.body.summary.byStatus).toMatchObject({ operational: 1, no_results: 1, access_restricted: 1, failed: 1, collecting: 1, paused: 1, not_tested: 1 });
  });

  it('last sync is the latest finished run, never a config edit time', async () => {
    const res = await request(app).get('/sources/health').set(auth());
    const x = res.body.sources.find((s) => s.name === 'X / Twitter Latest');
    const news = res.body.sources.find((s) => s.name === 'Indonesia News');
    expect(new Date(x.health.lastSyncAt).getTime()).toBeGreaterThan(Date.now() - 31 * 60000);
    expect(news.health.lastSyncAt).toBeNull();
    // Workspace last sync: the YouTube failure 5 minutes ago (the other client's run 1 minute ago is ignored).
    expect(new Date(res.body.lastSyncAt).getTime()).toBeLessThan(Date.now() - 4 * 60000);
  });

  it('recent activity lists real runs, including Google News keyword monitoring for this workspace only', async () => {
    const res = await request(app).get('/sources/health').set(auth());
    const names = res.body.activity.map((a) => a.name);
    expect(names).toContain('Google News (keyword monitoring)');
    expect(names).not.toContain('Other client X');
    const kw = res.body.activity.find((a) => a.kind === 'keyword_monitoring');
    expect(kw).toMatchObject({ outcome: 'success', inserted: 3, trigger: 'scheduled' });
    expect(res.body.keywordMonitoring.lastOutcome).toBe('success');
  });
});

describe('GET /sources/coverage', () => {
  it('counts every stored document and 7-day signal volume per platform', async () => {
    const res = await request(app).get('/sources/coverage').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalDocuments: 3, unattributedDocuments: 1, windowDays: 7, platformVolume: { x: 2, news: 1 } });
    expect(res.body.totalSources).toBe(7);
  });

  it('an empty workspace reports zeros, not errors', async () => {
    for (const t of ['raw_documents', 'signals', 'cron_ingestion_logs']) db.table(t).length = 0;
    const res = await request(app).get('/sources/coverage').set(auth());
    expect(res.body).toMatchObject({ totalDocuments: 0, platformVolume: {} });
  });
});

describe('connectorStatus', () => {
  it('documents without run history still count as operational', () => {
    expect(connectorStatus({ isActive: true, events: [], documents: 4 })).toBe('operational');
    expect(connectorStatus({ isActive: true, events: [], documents: 0 })).toBe('not_tested');
    expect(connectorStatus({ isActive: true, events: [{ outcome: 'failed', error: 'billing_or_quota' }], documents: 9 })).toBe('access_restricted');
  });
});
