import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { createFakeSupabase, supabaseModuleFor } from './helpers/fake-supabase.js';

// Every test sets `respond` to control what the fake database returns.
let respond = () => ({ data: [], error: null });
const fake = createFakeSupabase((q) => respond(q));

const analyzeSignal = jest.fn();
const runClustering = jest.fn(async () => ({ clustersCreated: 0 }));
const detectAlerts = jest.fn(async () => []);

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(fake));
jest.unstable_mockModule('../src/modules/ai/ai.service.js', () => ({ analyzeSignal }));
jest.unstable_mockModule('../src/modules/clustering/clustering.service.js', () => ({ runClustering }));
jest.unstable_mockModule('../src/modules/alerts/alerts.service.js', () => ({ detectAlerts }));

const { buildWorkList, runScheduledIngestion } = await import('../src/modules/ingestion/scheduled-ingestion.js');
const { existsInWorkspace, ingestRssSignals, assertPublicHttpUrl } = await import('../src/modules/ingestion/rss-ingestion.service.js');
const { buildAnalysisRow, saveAnalysis, handleRetroanalyze, REAL_SIGNAL_FILTER } = await import('../src/modules/ai/backfill.worker.js');
const { resolveWorkspaceIdForUser, DEMO_WORKSPACE_ID } = await import('../src/lib/workspace-access.js');
const { recordTokenUsage, calculateCost } = await import('../src/lib/token-tracking.js');
const { parseModelJson, keepKnownSources } = await import('../src/lib/ask-narriv.js');

const WS_A = '11111111-1111-1111-1111-111111111111';
const WS_B = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  fake.calls.length = 0;
  respond = () => ({ data: [], error: null });
  analyzeSignal.mockReset();
  runClustering.mockClear();
  detectAlerts.mockClear();
});

const writesTo = (table, op) => fake.calls.filter((c) => c.table === table && c.op === op);

describe('analysis table references', () => {
  it('no source file queries the non-existent signal_analysis table', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (full.endsWith('.js') && /from\(\s*["']signal_analysis["']\s*\)/.test(fs.readFileSync(full, 'utf8'))) offenders.push(full);
      }
    };
    walk(path.resolve('src'));
    expect(offenders).toEqual([]);
  });
});

describe('scheduled ingestion work list', () => {
  it('skips blank keywords, dedups case-insensitively and caps per workspace', () => {
    const work = buildWorkList([
      { workspace_id: WS_A, keyword: 'Bank A' },
      { workspace_id: WS_A, keyword: 'bank a' },
      { workspace_id: WS_A, keyword: '  ' },
      { workspace_id: WS_A, keyword: 'Bank B' },
      { workspace_id: WS_A, keyword: 'Bank C' },
      { workspace_id: WS_B, keyword: 'Brand X' },
    ], { maxKeywordsPerWorkspace: 2 });
    expect(work).toEqual([
      { workspaceId: WS_A, keyword: 'Bank A' },
      { workspaceId: WS_A, keyword: 'Bank B' },
      { workspaceId: WS_B, keyword: 'Brand X' },
    ]);
  });

  it('rotates the starting workspace between runs', () => {
    const rows = [{ workspace_id: WS_A, keyword: 'a' }, { workspace_id: WS_B, keyword: 'b' }];
    expect(buildWorkList(rows, { rotation: 1 })[0].workspaceId).toBe(WS_B);
  });
});

describe('runScheduledIngestion', () => {
  const keywords = [
    { workspace_id: WS_A, keyword: 'ok-keyword' },
    { workspace_id: WS_B, keyword: 'broken-feed' },
  ];

  it('isolates a failing source, keeps workspace ownership and logs the run', async () => {
    respond = (q) => (q.table === 'monitoring_keywords' ? { data: keywords, error: null } : { data: null, error: null });
    const ingest = jest.fn(async ({ workspaceId, keyword }) => {
      if (keyword === 'broken-feed') throw new Error('RSS fetch failed: HTTP 503');
      return { totalFetched: 5, newSignalsCreated: 2, skippedDuplicates: 3, analyzed: 2, analysisFailed: 0, insertFailed: 0, alerts: [] , workspaceId };
    });

    const summary = await runScheduledIngestion({ ingest, budgetMs: 60000, trigger: 'test', pauseMs: 0 });

    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS_A, keyword: 'ok-keyword' }));
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS_B, keyword: 'broken-feed' }));
    expect(summary.status).toBe('completed_with_errors');
    expect(summary.totals).toMatchObject({ fetched: 5, inserted: 2, deduplicated: 3, analyzed: 2, failedKeywords: 1 });
    const failed = summary.results.find((r) => r.keyword === 'broken-feed');
    expect(failed).toMatchObject({ status: 'failed', errorCategory: 'source_unavailable', workspaceId: WS_B });

    const logs = writesTo('cron_ingestion_logs', 'insert');
    expect(logs[0].payload).toMatchObject({ job_name: 'scheduled-rss-ingestion', status: 'running' });
    const final = logs[logs.length - 1].payload;
    expect(final).toMatchObject({ job_name: 'scheduled-rss-ingestion', status: 'completed_with_errors' });
    expect(final.metadata.runId).toBe(summary.runId);
    expect(final.metadata.finishedAt).toBeDefined();
  });

  it('finishes the claimed run row (start and finish on one record)', async () => {
    respond = (q) => {
      if (q.table === 'monitoring_keywords') return { data: [keywords[0]], error: null };
      if (q.table === 'cron_ingestion_logs' && q.op === 'insert') return { data: [{ id: 'run-row-1' }], error: null };
      if (q.table === 'cron_ingestion_logs' && q.op === 'select') return { data: [{ id: 'run-row-1' }], error: null };
      return { data: null, error: null };
    };
    const ingest = jest.fn(async () => ({ totalFetched: 1, newSignalsCreated: 1, skippedDuplicates: 0, analyzed: 1 }));
    const summary = await runScheduledIngestion({ ingest, pauseMs: 0 });
    expect(summary.status).toBe('completed');
    const [update] = writesTo('cron_ingestion_logs', 'update');
    expect(update.filters).toContainEqual({ name: 'eq', args: ['id', 'run-row-1'] });
    expect(update.payload.status).toBe('completed');
  });

  it('skips when another scheduled run already holds the lock', async () => {
    respond = (q) => {
      if (q.table === 'cron_ingestion_logs' && q.op === 'insert') return { data: [{ id: 'mine' }], error: null };
      if (q.table === 'cron_ingestion_logs' && q.op === 'select') return { data: [{ id: 'earlier-run' }], error: null };
      return { data: keywords, error: null };
    };
    const ingest = jest.fn();
    const summary = await runScheduledIngestion({ ingest });
    expect(summary.status).toBe('skipped_overlap');
    expect(ingest).not.toHaveBeenCalled();
    expect(writesTo('cron_ingestion_logs', 'update')[0].payload.status).toBe('skipped_overlap');
  });

  it('defers remaining keywords once the time budget is spent', async () => {
    respond = (q) => (q.table === 'monitoring_keywords' ? { data: keywords, error: null } : { data: null, error: null });
    const ingest = jest.fn();
    const summary = await runScheduledIngestion({ ingest, budgetMs: -1 });
    expect(ingest).not.toHaveBeenCalled();
    expect(summary.status).toBe('partial');
    expect(summary.totals.deferredKeywords).toBe(2);
  });

  it('reports a keyword query error as a failed run, not a zero-result run', async () => {
    respond = (q) => (q.table === 'monitoring_keywords' ? { data: null, error: { message: 'db down' } } : { data: null, error: null });
    const summary = await runScheduledIngestion({ ingest: jest.fn() });
    expect(summary.status).toBe('failed');
  });
});

describe('ingestion deduplication', () => {
  it('detects an existing article by external id or URL', async () => {
    respond = (q) => ({ data: q.table === 'signals' ? [{ id: 's1' }] : [], error: null });
    await expect(existsInWorkspace(WS_A, 'rss_abc', 'https://news.example/a')).resolves.toBe(true);
    for (const c of fake.calls) expect(c.filters).toContainEqual({ name: 'eq', args: ['workspace_id', WS_A] });
  });

  it('returns false for a new article', async () => {
    await expect(existsInWorkspace(WS_A, 'rss_new', 'https://news.example/new')).resolves.toBe(false);
  });

  it('fails closed (treats as duplicate) when the check errors', async () => {
    respond = () => ({ data: null, error: { message: 'timeout' } });
    await expect(existsInWorkspace(WS_A, 'rss_x', 'https://news.example/x')).resolves.toBe(true);
  });
});

describe('ingestRssSignals real-data behavior', () => {
  const rss = `<?xml version="1.0"?><rss><channel>
    <item><title>Bank A outage - Example News</title><link>https://news.example/a</link><guid>https://news.example/a</guid>
    <pubDate>Wed, 08 Oct 2026 10:00:00 GMT</pubDate><description>Customers report outage</description><source>Example News</source></item>
  </channel></rss>`;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => rss }));
  });

  it('stores no fabricated analysis when the AI call fails and logs the failure', async () => {
    analyzeSignal.mockRejectedValue(new Error('OpenAI 500'));
    respond = (q) => {
      if (q.op === 'insert' && q.table === 'raw_documents') return { data: [{ id: 'raw-1' }], error: null };
      if (q.op === 'insert' && q.table === 'signals') return { data: [{ id: 'sig-1', ...q.payload }], error: null };
      if (q.op === 'insert' && q.table === 'ingestion_jobs') return { data: [{ id: 'job-1' }], error: null };
      return { data: [], error: null };
    };

    const result = await ingestRssSignals({ workspaceId: WS_A, keyword: 'Bank A', limit: 5 });

    expect(result).toMatchObject({ newSignalsCreated: 1, analyzed: 0, analysisFailed: 1 });
    expect(writesTo('signal_analyses', 'insert')).toHaveLength(0);
    const [signal] = writesTo('signals', 'insert');
    expect(signal.payload).toMatchObject({ workspace_id: WS_A, url: 'https://news.example/a', sentiment: null, severity: null, raw_document_id: 'raw-1' });
    expect(signal.payload.published_at).toBe(new Date('Wed, 08 Oct 2026 10:00:00 GMT').toISOString());
    expect(writesTo('ai_analysis_failure_logs', 'insert')[0].payload).toMatchObject({ workspace_id: WS_A, signal_id: 'sig-1' });
  });

  it('does not insert anything when the article already exists', async () => {
    respond = (q) => (q.table === 'raw_documents' && q.op === 'select' ? { data: [{ id: 'existing' }], error: null } : { data: [{ id: 'job-1' }], error: null });
    const result = await ingestRssSignals({ workspaceId: WS_A, keyword: 'Bank A', limit: 5 });
    expect(result).toMatchObject({ newSignalsCreated: 0, skippedDuplicates: 1 });
    expect(writesTo('signals', 'insert')).toHaveLength(0);
    expect(analyzeSignal).not.toHaveBeenCalled();
  });

  it('surfaces an unavailable source as an error instead of substituting data', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503, text: async () => '' }));
    await expect(ingestRssSignals({ workspaceId: WS_A, keyword: 'Bank A' })).rejects.toThrow();
    expect(writesTo('signals', 'insert')).toHaveLength(0);
  });
});

describe('analysis backfill idempotency', () => {
  it('builds rows in the signal_analyses jsonb shape', () => {
    const row = buildAnalysisRow('sig-1', { sentiment: 'NEGATIVE', confidence_score: 0.9, stakeholder: 'customers' });
    expect(row).toMatchObject({ signal_id: 'sig-1', confidence: 0.9, model: 'gpt-4o-mini', analysis: { sentiment: 'negative', stakeholder: 'customers' } });
    expect(row).not.toHaveProperty('workspace_id');
  });

  it('does not insert when an analysis appeared while the AI call was running', async () => {
    respond = (q) => (q.table === 'signal_analyses' && q.op === 'select' ? { data: [{ id: 'a1' }], error: null } : { data: null, error: null });
    const r = await saveAnalysis('sig-1', { sentiment: 'neutral' });
    expect(r).toMatchObject({ skipped: true });
    expect(writesTo('signal_analyses', 'insert')).toHaveLength(0);
  });

  it('never overwrites an existing signal sentiment', async () => {
    await saveAnalysis('sig-1', { sentiment: 'positive' });
    const [update] = writesTo('signals', 'update');
    expect(update.filters).toContainEqual({ name: 'is', args: ['sentiment', null] });
  });

  it('only selects real signals and skips already analyzed ones', async () => {
    respond = (q) => {
      if (q.table === 'signals' && q.op === 'select') return { data: [{ id: 'done', title: 't', content: 'c' }, { id: 'todo', title: 't', content: 'c' }], error: null };
      // Bulk "already analyzed" lookup uses in(); the per-signal pre-insert check uses eq().
      if (q.table === 'signal_analyses' && q.op === 'select') {
        return { data: q.filters.some((f) => f.name === 'in') ? [{ signal_id: 'done' }] : [], error: null };
      }
      return { data: null, error: null };
    };
    analyzeSignal.mockResolvedValue({ sentiment: 'neutral' });

    const r = await handleRetroanalyze(WS_A, { limit: 10 });

    expect(fake.calls.find((c) => c.table === 'signals' && c.op === 'select').filters).toContainEqual({ name: 'or', args: [REAL_SIGNAL_FILTER] });
    expect(analyzeSignal).toHaveBeenCalledTimes(1);
    expect(analyzeSignal).toHaveBeenCalledWith('t', 't\n\nc', { workspaceId: WS_A, operation: 'backfill_analysis' });
    expect(r).toMatchObject({ found: 2, alreadyAnalyzed: 1, processed: 1, failed: 0 });
    expect(writesTo('signal_analyses', 'insert')[0].payload.signal_id).toBe('todo');
  });

  it('counts a failed AI call without writing, so a retry can pick it up', async () => {
    respond = (q) => (q.table === 'signals' && q.op === 'select' ? { data: [{ id: 'todo', title: 't', content: 'c' }], error: null } : { data: [], error: null });
    analyzeSignal.mockRejectedValue(new Error('rate limited'));
    const r = await handleRetroanalyze(WS_A);
    expect(r).toMatchObject({ processed: 0, failed: 1 });
    expect(writesTo('signal_analyses', 'insert')).toHaveLength(0);
  });

  it('defers work after the deadline', async () => {
    respond = (q) => (q.table === 'signals' && q.op === 'select' ? { data: [{ id: 'todo', title: 't', content: 'c' }], error: null } : { data: [], error: null });
    const r = await handleRetroanalyze(WS_A, { deadline: Date.now() - 1 });
    expect(analyzeSignal).not.toHaveBeenCalled();
    expect(r.deferred).toBe(1);
  });
});

describe('workspace isolation', () => {
  it('pins demo sessions to the demo workspace regardless of the requested id', async () => {
    await expect(resolveWorkspaceIdForUser('demo_abc', WS_B)).resolves.toBe(DEMO_WORKSPACE_ID);
    expect(fake.calls).toHaveLength(0);
  });

  it('denies a real user a workspace they are not a member of', async () => {
    respond = () => ({ data: null, error: { code: 'PGRST116' } });
    await expect(resolveWorkspaceIdForUser('user-1', WS_B)).resolves.toBeNull();
    expect(fake.calls[0].filters).toEqual(expect.arrayContaining([
      { name: 'eq', args: ['user_id', 'user-1'] },
      { name: 'eq', args: ['workspace_id', WS_B] },
    ]));
  });
});

describe('Ask Narriv source grounding', () => {
  const ctx = { signals: [{ id: 'sig-a' }], alerts: [{ id: 'alert-a' }], clusters: [{ id: 'cl-a' }] };

  it('parses JSON wrapped in code fences', () => {
    expect(parseModelJson('```json\n{"answer":"x","sources":[]}\n```')).toEqual({ answer: 'x', sources: [] });
    expect(parseModelJson('no json here')).toBeNull();
  });

  it('drops cited ids that were not in the workspace data context', () => {
    expect(keepKnownSources([{ id: 'sig-a', kind: 'signal' }, { id: 'other-ws-signal' }, 'cl-a'], ctx))
      .toEqual([{ id: 'sig-a', kind: 'signal' }, { id: 'cl-a' }]);
  });
});

describe('AI cost tracking', () => {
  it('records one token_usage row per call using the real schema', async () => {
    await recordTokenUsage({ workspaceId: WS_A, operation: 'signal_analysis', model: 'gpt-4o-mini', inputTokens: 1000, outputTokens: 500 });
    const [row] = writesTo('token_usage', 'insert');
    expect(row.payload).toEqual({ workspace_id: WS_A, operation: 'signal_analysis', model: 'gpt-4o-mini', input_tokens: 1000, output_tokens: 500, cost: 0.00045 });
    expect(calculateCost('gpt-4o-mini', 1000, 500)).toBeCloseTo(0.00045);
  });

  it('skips recording without a workspace and never throws on DB errors', async () => {
    await recordTokenUsage({ inputTokens: 10 });
    expect(fake.calls).toHaveLength(0);
    respond = () => ({ data: null, error: { message: 'insert failed' } });
    await expect(recordTokenUsage({ workspaceId: WS_A, inputTokens: 1 })).resolves.toBeUndefined();
  });
});

describe('RSS URL SSRF guard', () => {
  const lookupTo = (address) => async () => [{ address }];

  it.each([
    ['http://127.0.0.1/feed', null],
    ['http://169.254.169.254/latest/meta-data', null],
    ['http://[::1]/feed', null],
    ['file:///etc/passwd', null],
    ['https://internal.example/feed', '10.0.0.5'],
    ['https://cgnat.example/feed', '100.64.1.1'],
    ['https://mapped.example/feed', '::ffff:192.168.1.1'],
  ])('rejects %s', async (url, resolved) => {
    await expect(assertPublicHttpUrl(url, lookupTo(resolved || '127.0.0.1'))).rejects.toThrow();
  });

  it('allows a public feed host', async () => {
    await expect(assertPublicHttpUrl('https://news.example/rss', lookupTo('93.184.216.34'))).resolves.toBe('https://news.example/rss');
  });

  it('never fetches a rejected caller-supplied URL', async () => {
    global.fetch = jest.fn();
    await expect(ingestRssSignals({ workspaceId: WS_A, rssUrl: 'http://127.0.0.1:8080/admin' })).rejects.toThrow('public host');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
