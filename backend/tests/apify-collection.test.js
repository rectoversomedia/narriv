import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Apify platform collection: start on Apify's side, store the dataset once
// the run succeeded. The Apify client is a fake; no actor ever runs here.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
let analyzeFails = false;
const analyzeSignal = jest.fn(async () => {
  if (analyzeFails) throw new Error('openai 500');
  return { sentiment: 'negative', impact: 'high', confidence_score: 0.8, summary: 'Complaint', narrative_type: 'service' };
});
jest.unstable_mockModule('../src/modules/ai/ai.service.js', () => ({ analyzeSignal }));
const runClustering = jest.fn(async () => ({ clustersCreated: 1 }));
jest.unstable_mockModule('../src/modules/clustering/clustering.service.js', () => ({ runClustering }));
const detectAlerts = jest.fn(async () => []);
jest.unstable_mockModule('../src/modules/alerts/alerts.service.js', () => ({ detectAlerts }));
jest.unstable_mockModule('../src/lib/cost-management.js', () => ({ checkBudgetAllowance: async () => ({ allowed: true }) }));

const svc = await import('../src/modules/ingestion/apify-collection.service.js');

const WS_A = '00000000-0000-4000-8000-00000000a001';
const WS_B = '00000000-0000-4000-8000-00000000b001';
const USER = '00000000-0000-4000-8000-0000000000c1';

function fakeApify({ startError = null, run = { status: 'RUNNING' }, items = [], datasetError = null, getError = null } = {}) {
  const calls = { start: [], get: 0, list: 0 };
  const state = { run: { id: 'run-1', defaultDatasetId: 'ds-1', usageTotalUsd: 0.0123, ...run }, items };
  const client = {
    actor: (actorId) => ({
      start: async (input, options) => {
        calls.start.push({ actorId, input, options });
        if (startError) throw startError;
        return { id: 'run-1', defaultDatasetId: 'ds-1', status: 'READY' };
      },
    }),
    run: () => ({ get: async () => { calls.get += 1; if (getError) throw getError; return state.run; } }),
    dataset: () => ({ listItems: async () => { calls.list += 1; if (datasetError) throw datasetError; return { items: state.items }; } }),
  };
  svc.setApifyClientFactory(() => client);
  return { calls, state };
}

const tweet = (id, extra = {}) => ({ id, text: `Layanan app error lagi ${id}`, url: `https://x.com/u/status/${id}`, author: { userName: 'nasabah' }, createdAt: '2026-10-13T08:00:00.000Z', likeCount: 5, ...extra });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  analyzeFails = false;
  jest.clearAllMocks();
  process.env.APIFY_TOKEN = 'test-token';
  db.table('monitoring_keywords').push(
    { id: 'k1', workspace_id: WS_A, keyword: 'Bank A', is_active: true, created_at: '2026-10-01T00:00:00Z' },
    { id: 'k2', workspace_id: WS_A, keyword: 'Bank A Mobile', is_active: true, created_at: '2026-10-02T00:00:00Z' },
    { id: 'k3', workspace_id: WS_B, keyword: 'Client B', is_active: true, created_at: '2026-10-01T00:00:00Z' },
  );
});

afterAll(() => { delete process.env.APIFY_TOKEN; svc.setApifyClientFactory(null); });

const start = (extra = {}) => svc.startCollection({ workspaceId: WS_A, presetKey: 'twitter-x-latest', userId: USER, ...extra });

describe('starting a collection', () => {
  it('starts the actor with capped input and records the run', async () => {
    const { calls } = fakeApify();
    const res = await start();
    expect(res).toMatchObject({ status: 'running', platform: 'x', keyword: 'Bank A', preset: 'twitter-x-latest' });
    expect(calls.start[0].actorId).toBe('apidojo/twitter-scraper-lite');
    expect(calls.start[0].input.searchTerms).toEqual(['Bank A']);
    expect(calls.start[0].input.maxItems).toBe(svc.COLLECTION_MAX_ITEMS); // preset asks for 1000
    expect(calls.start[0].options).toMatchObject({ maxItems: 20, maxTotalChargeUsd: 0.25 });
    const row = db.table('cron_ingestion_logs')[0];
    expect(row).toMatchObject({ job_name: 'apify-collection', status: 'running' });
    expect(row.metadata).toMatchObject({ workspaceId: WS_A, apifyRunId: 'run-1', datasetId: 'ds-1' });
  });

  it('collects only this workspace\'s own keywords', async () => {
    fakeApify();
    expect((await start({ keyword: 'bank a mobile' })).keyword).toBe('Bank A Mobile');
    await expect(svc.startCollection({ workspaceId: WS_A, presetKey: 'tiktok-hashtag', keyword: 'Client B', userId: USER })).rejects.toMatchObject({ code: 'UNKNOWN_KEYWORD', httpStatus: 400 });
  });

  it('refuses without a keyword, an unknown preset, or an Apify token', async () => {
    fakeApify();
    db.table('monitoring_keywords').length = 0;
    await expect(start()).rejects.toMatchObject({ code: 'NO_KEYWORD', httpStatus: 400 });
    await expect(start({ presetKey: 'shopee-search' })).rejects.toMatchObject({ code: 'UNKNOWN_PRESET' });
    delete process.env.APIFY_TOKEN;
    delete process.env.APIFY_API_TOKEN;
    await expect(start()).rejects.toMatchObject({ code: 'APIFY_NOT_CONFIGURED', httpStatus: 503 });
  });

  it('allows one active collection per workspace and a daily cap', async () => {
    fakeApify();
    await start();
    await expect(start({ presetKey: 'tiktok-hashtag' })).rejects.toMatchObject({ code: 'COLLECTION_ACTIVE', httpStatus: 409 });
    // Another client is not blocked by this one.
    expect((await svc.startCollection({ workspaceId: WS_B, presetKey: 'tiktok-hashtag', userId: USER })).status).toBe('running');

    db.table('cron_ingestion_logs').forEach((r) => { r.status = 'completed'; });
    for (let i = 0; i < 9; i += 1) db.table('cron_ingestion_logs').push({ id: `old-${i}`, job_name: 'apify-collection', status: 'completed', created_at: new Date().toISOString(), metadata: { workspaceId: WS_A } });
    await expect(start()).rejects.toMatchObject({ code: 'DAILY_LIMIT', httpStatus: 429 });
  });

  it('records a provider rejection as a category, never the raw error', async () => {
    fakeApify({ startError: Object.assign(new Error('secret detail'), { statusCode: 402, type: 'not-enough-usage-to-run-paid-actor' }) });
    await expect(start()).rejects.toMatchObject({ code: 'APIFY_START_FAILED', category: 'billing_or_quota' });
    const row = db.table('cron_ingestion_logs')[0];
    expect(row.status).toBe('failed');
    expect(JSON.stringify(row.metadata)).not.toContain('secret detail');
  });

  it('categorizes Apify errors', () => {
    expect(svc.categorizeApifyError({ statusCode: 401 })).toBe('authentication_failed');
    expect(svc.categorizeApifyError({ statusCode: 403, type: 'actor-is-not-rented' })).toBe('actor_not_rented');
    expect(svc.categorizeApifyError({ statusCode: 404 })).toBe('actor_not_found');
    expect(svc.categorizeApifyError({ statusCode: 429 })).toBe('rate_limited');
    expect(svc.categorizeApifyError({ statusCode: 503 })).toBe('provider_unavailable');
  });
});

describe('syncing a collection', () => {
  it('stays running while Apify is still working', async () => {
    fakeApify({ run: { status: 'RUNNING' } });
    const { id } = await start();
    expect(await svc.syncCollection({ workspaceId: WS_A, id })).toMatchObject({ status: 'running', apifyStatus: 'RUNNING' });
    expect(db.table('signals')).toHaveLength(0);
  });

  it('never shows or syncs another workspace\'s collection', async () => {
    fakeApify();
    const { id } = await start();
    await expect(svc.syncCollection({ workspaceId: WS_B, id })).rejects.toMatchObject({ httpStatus: 404 });
    await expect(svc.syncCollection({ workspaceId: WS_A, id: 'not-a-uuid' })).rejects.toMatchObject({ httpStatus: 404 });
    expect(await svc.listCollections(WS_B)).toEqual([]);
  });

  it('stores a succeeded dataset once, with provenance and unknowns kept unknown', async () => {
    const { calls, state } = fakeApify({ run: { status: 'RUNNING' } });
    const { id } = await start();
    state.run.status = 'SUCCEEDED';
    state.items = [
      tweet('1'),
      tweet('2', { likeCount: undefined, createdAt: undefined, scrapedAt: '2026-10-14T01:00:00Z' }), // no engagement, no date
      tweet('1'), // duplicate within the dataset
      { id: '3', text: '', url: 'javascript:alert(1)' }, // nothing to store
    ];
    const res = await svc.syncCollection({ workspaceId: WS_A, id });
    expect(res.status).toBe('completed');
    expect(res.totals).toMatchObject({ datasetItems: 4, inserted: 2, analyzed: 2, invalid: 1 });
    expect(res.costUsd).toBe(0.0123);

    const signals = db.table('signals');
    expect(signals.every((s) => s.workspace_id === WS_A && s.platform === 'x')).toBe(true);
    const first = signals.find((s) => s.url === 'https://x.com/u/status/1');
    expect(first.published_at).toBe('2026-10-13T08:00:00.000Z');
    expect(first.metadata).toMatchObject({ collection: 'apify', preset: 'twitter-x-latest', apifyRunId: 'run-1', engagement: { likes: 5 } });
    const second = signals.find((s) => s.url === 'https://x.com/u/status/2');
    expect(second.published_at).toBeNull(); // scrapedAt is not a publication date
    expect(second.metadata.engagement).toBeNull(); // unknown, not zero
    expect(second.captured_at).toBeTruthy();

    // A second sync (or a racing one) does not store the dataset again.
    const again = await svc.syncCollection({ workspaceId: WS_A, id });
    expect(again.status).toBe('completed');
    expect(calls.list).toBe(1);
    expect(db.table('signals')).toHaveLength(2);
    expect(runClustering).toHaveBeenCalledWith(WS_A);
  });

  it('dedups against records already in the workspace', async () => {
    const { state } = fakeApify();
    const { id } = await start();
    db.table('signals').push({ id: 'existing', workspace_id: WS_A, url: 'https://x.com/u/status/1' });
    state.run.status = 'SUCCEEDED';
    state.items = [tweet('1'), tweet('9')];
    const res = await svc.syncCollection({ workspaceId: WS_A, id });
    expect(res.totals).toMatchObject({ inserted: 1, deduplicated: 1 });
  });

  it('stores records unanalyzed and reports it when AI analysis fails', async () => {
    const { state } = fakeApify();
    const { id } = await start();
    analyzeFails = true;
    state.run.status = 'SUCCEEDED';
    state.items = [tweet('5')];
    const res = await svc.syncCollection({ workspaceId: WS_A, id });
    expect(res.status).toBe('completed_with_errors');
    expect(db.table('signals')[0].sentiment).toBeNull();
    expect(db.table('ai_analysis_failure_logs')).toHaveLength(1);
  });

  it('records failed, timed-out and empty runs honestly', async () => {
    const { state } = fakeApify();
    const { id } = await start();
    state.run.status = 'TIMED-OUT';
    expect(await svc.syncCollection({ workspaceId: WS_A, id })).toMatchObject({ status: 'failed', error: 'timeout' });

    db.table('cron_ingestion_logs')[0].status = 'completed';
    const second = await start({ presetKey: 'youtube-search' });
    state.run.status = 'SUCCEEDED';
    state.items = [];
    expect(await svc.syncCollection({ workspaceId: WS_A, id: second.id })).toMatchObject({ status: 'completed_empty', totals: { inserted: 0 } });
    expect(db.table('signals')).toHaveLength(0);
  });

  it('keeps a run pending when Apify cannot be reached', async () => {
    fakeApify({ getError: Object.assign(new Error('x'), { statusCode: 503 }) });
    const { id } = await start();
    expect(await svc.syncCollection({ workspaceId: WS_A, id })).toMatchObject({ status: 'running', checkError: 'provider_unavailable' });
  });

  it('the daily cron finishes runs nobody checked', async () => {
    const { state } = fakeApify();
    await start();
    state.run.status = 'SUCCEEDED';
    state.items = [tweet('7')];
    expect(await svc.syncPendingCollections()).toMatchObject({ checked: 1, completed: 1 });
    expect(db.table('signals')).toHaveLength(1);
  });
});
