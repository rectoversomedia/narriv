import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Executive Overview: every statement comes from this workspace's records.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const { computeExecutiveOverview } = await import('../src/lib/executive-overview.js');

const WS = '00000000-0000-4000-8000-00000000f101';
const OTHER = '00000000-0000-4000-8000-00000000f102';
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
let n = 0;
const sig = (extra) => ({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, workspace_id: WS, platform: 'news', title: `Article ${n}`, url: `https://news.example/${n}`, author: `Publisher ${n % 3}`, sentiment: 'NEUTRAL', severity: 'low', published_at: hoursAgo(30), captured_at: hoursAgo(24), ...extra });

let recs;
const computeRecommendations = async () => ({ out: { recommendations: recs }, narrative: { inferences: [{ kind: 'emerging_narratives', items: [] }], riskModel: { uncertainty: { level: 'medium', reasons: ['No baseline window: volume change is unknown.'] }, limitations: ['Heuristic index'] } } });
const run = (windowHours = 168) => computeExecutiveOverview({ workspaceId: WS, windowHours }, { computeRecommendations });

beforeEach(() => {
  for (const t of Object.keys(db.tables)) db.tables[t].length = 0;
  n = 0;
  recs = [];
});

it('refuses to summarise fewer than three records', async () => {
  db.table('signals').push(sig(), sig());
  const out = await run();
  expect(out.status).toBe('insufficient_data');
  expect(out.happening).toBeNull();
  expect(out.actions).toEqual([]);
});

it('names the main narrative with its evidence, labels news-only coverage, and states facts', async () => {
  const s = [sig({ sentiment: 'NEGATIVE', severity: 'high' }), sig({ sentiment: 'NEGATIVE' }), sig(), sig({ sentiment: 'POSITIVE' })];
  db.table('signals').push(...s, { ...sig(), workspace_id: OTHER });
  db.table('narrative_clusters').push({ id: 'c1', workspace_id: WS, title: 'App outage complaints', created_at: hoursAgo(20), updated_at: hoursAgo(1) });
  db.table('narrative_cluster_signals').push({ narrative_cluster_id: 'c1', signal_id: s[0].id }, { narrative_cluster_id: 'c1', signal_id: s[1].id });
  const out = await run();
  expect(out.status).toBe('ok');
  expect(out.coverage).toMatchObject({ signals: 4, newsOnly: true, platforms: { news: 4 } });
  expect(out.happening.main).toMatchObject({ title: 'App outage complaints', signals: 2, negative: 2, isNew: true });
  expect(out.happening.main.evidence[0]).toMatchObject({ url: s[0].url, severity: 'high' });
  const codes = out.matters.map((m) => `${m.type}:${m.code}`);
  expect(codes).toEqual(expect.arrayContaining(['fact:negative_share', 'interpretation:perception_pressure', 'fact:high_severity']));
  expect(out.matters.find((m) => m.code === 'negative_share').values).toMatchObject({ negative: 2, analyzed: 4, share: 0.5 });
});

it('makes no comparison without a previous period, and compares when there is one', async () => {
  db.table('signals').push(sig(), sig(), sig());
  let out = await run(24);
  expect(out.changed).toMatchObject({ baseline: false, previous: null });
  db.table('signals').push(sig({ captured_at: hoursAgo(30), sentiment: 'NEGATIVE' }));
  out = await run(24);
  expect(out.changed).toMatchObject({ baseline: true, previous: { signals: 1, negativeShare: 1 }, current: { signals: 3, negativeShare: 0 } });
});

it('shows at most three actions, each only with evidence from this workspace', async () => {
  const s = [sig({ sentiment: 'NEGATIVE' }), sig(), sig()];
  db.table('signals').push(...s);
  db.table('alerts').push({ id: 'a1', workspace_id: WS, title: 'Spike', status: 'open', created_at: hoursAgo(2) });
  recs = [
    { action: 'escalate_internal', priority: 'critical', urgency: 'immediate', whyItMatters: 'w', observedIssue: 'o', sourceIds: [s[0].id, 'a1', 'foreign-id'] },
    { action: 'monitor', priority: 'medium', urgency: 'this_week', sourceIds: ['foreign-only'] }, // nothing verifiable: dropped
    { action: 'investigate', sourceIds: [s[1].id] },
    { action: 'prepare_statement', sourceIds: [s[2].id] },
    { action: 'brief_spokesperson', sourceIds: [s[2].id] },
  ];
  const out = await run();
  expect(out.actions.map((a) => a.action)).toEqual(['escalate_internal', 'investigate', 'prepare_statement']);
  expect(out.actions[0].evidence.map((e) => e.id)).toEqual([s[0].id, 'a1']);
  expect(out.matters.find((m) => m.code === 'open_warnings').values.count).toBe(1);
});

it('reports records awaiting analysis instead of counting them as neutral', async () => {
  db.table('signals').push(sig({ sentiment: null }), sig({ sentiment: null }), sig());
  const out = await run();
  expect(out.matters.find((m) => m.code === 'awaiting_analysis').values.count).toBe(2);
  expect(out.matters.find((m) => m.code === 'negative_share').values.analyzed).toBe(1);
});
