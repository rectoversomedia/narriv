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
const sig = (extra) => ({ id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, workspace_id: WS, platform: 'news', title: `Article ${n}`, url: `https://news.example/${n}`, author: `Publisher ${n % 3}`, sentiment: 'NEUTRAL', severity: 'low', published_at: hoursAgo(30), captured_at: hoursAgo(20), ...extra });

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

describe('brand relevance in the overview', () => {
  const brand = (extra) => sig({ title: `Bank Mandiri ${n + 1} update`, ...extra });
  const setup = () => {
    db.table('workspace_settings').push({ workspace_id: WS, brand_name: 'Narriv' });
    db.table('monitoring_keywords').push({ workspace_id: WS, keyword: 'Bank Mandiri', is_active: true });
  };
  const cluster = (id, title, list, created = hoursAgo(20)) => {
    db.table('narrative_clusters').push({ id, workspace_id: WS, title, created_at: created, updated_at: hoursAgo(1) });
    db.table('narrative_cluster_signals').push(...list.map((s) => ({ narrative_cluster_id: id, signal_id: s.id })));
  };

  it('does not promote a larger topic whose records never name the brand', async () => {
    setup();
    const unrelated = [1, 2, 3, 4, 5, 6].map(() => sig({ title: "Haji Isam's Shares Plummet", content: 'Coal shares fell.', sentiment: 'NEGATIVE' }));
    const related = [brand({ sentiment: 'NEGATIVE' }), brand()];
    db.table('signals').push(...unrelated, ...related);
    cluster('c-unrelated', "Haji Isam's Shares Plummet", unrelated);
    cluster('c-brand', 'Bank Mandiri service complaints', related);
    const out = await run();
    expect(out.happening.main).toMatchObject({ id: 'c-brand', signals: 2, brandSignals: 2 });
    expect(out.happening.excluded).toEqual([{ id: 'c-unrelated', title: "Haji Isam's Shares Plummet", signals: 6, brandSignals: 0 }]);
    expect(out.coverage.relevance).toMatchObject({ configured: true, brandSource: 'keywords', brand: 'bank mandiri', counts: { direct: 2, unconfirmed: 6 } });
    // Sentiment facts describe the brand's records, not the unrelated topic.
    expect(out.matters.find((m) => m.code === 'negative_share').values).toMatchObject({ negative: 1, analyzed: 2, small: true });
    expect(out.matters.find((m) => m.code === 'brand_relevance').values).toMatchObject({ direct: 2, total: 8 });
    expect(out.happening.main.evidence.every((e) => e.relevance === 'direct')).toBe(true);
  });

  it('says no relevant issue exists instead of forcing an unrelated one', async () => {
    setup();
    const unrelated = [1, 2, 3, 4].map(() => sig({ title: 'Harga batu bara turun' }));
    db.table('signals').push(...unrelated);
    cluster('c-unrelated', 'Harga batu bara', unrelated);
    const out = await run();
    expect(out.status).toBe('ok');
    expect(out.happening.main).toBeNull();
    expect(out.happening.excluded.map((e) => e.id)).toEqual(['c-unrelated']);
    expect(out.happening.topEvidence).toEqual([]);
    expect(out.matters.map((m) => m.code)).toEqual(['no_brand_records']);
  });

  it('drops actions whose only evidence does not concern the brand', async () => {
    setup();
    const unrelated = sig({ title: 'Harga batu bara turun', sentiment: 'NEGATIVE' });
    const related = [brand({ sentiment: 'NEGATIVE' }), brand(), brand()];
    db.table('signals').push(unrelated, ...related);
    recs = [
      { action: 'escalate_internal', sourceIds: [unrelated.id] },
      { action: 'investigate', sourceIds: [related[0].id, unrelated.id] },
      { action: 'investigate', sourceIds: [related[1].id] }, // same action again: not repeated
    ];
    const out = await run();
    expect(out.actions.map((a) => a.action)).toEqual(['investigate']);
    expect(out.actions[0].evidence.map((e) => e.id)).toEqual([related[0].id]);
  });

  it('ranks qualifying issues by brand mentions and severity before volume', async () => {
    setup();
    const big = [brand(), sig({ title: 'Sektor perbankan' }), sig({ title: 'Sektor perbankan' }), brand()];
    const severe = [brand({ severity: 'high' }), brand({ severity: 'critical' })];
    db.table('signals').push(...big, ...severe);
    cluster('c-big', 'Perbankan secara umum', big);
    cluster('c-severe', 'Gangguan layanan Bank Mandiri', severe);
    const out = await run();
    expect(out.happening.main).toMatchObject({ id: 'c-severe', severe: 2, rankedBy: ['brand_mentions', 'severity', 'publishers', 'volume'] });
  });
});

describe('follow-up on recommendations', () => {
  it('reports linked plans and cases, and flags an unchanged issue already being handled', async () => {
    const s = [sig({ sentiment: 'NEGATIVE', captured_at: hoursAgo(10) }), sig(), sig()];
    db.table('signals').push(...s);
    db.table('narrative_clusters').push({ id: 'c1', workspace_id: WS, title: 'Outage', created_at: hoursAgo(20), updated_at: hoursAgo(1) });
    db.table('narrative_cluster_signals').push({ narrative_cluster_id: 'c1', signal_id: s[0].id }, { narrative_cluster_id: 'c1', signal_id: s[1].id });
    db.table('action_plans').push(
      { id: 'p1', workspace_id: WS, title: 'Crisis plan', status: 'in_progress', cluster_id: 'c1', created_at: hoursAgo(2) },
      { id: 'p-other', workspace_id: OTHER, title: 'Other client plan', status: 'pending', cluster_id: 'c1', created_at: hoursAgo(2) },
    );
    db.table('cases').push({ id: 'k1', workspace_id: WS, title: 'Check outage', status: 'resolved', signal_id: s[0].id, resolution: 'Fixed', created_at: hoursAgo(5) });
    recs = [{ action: 'investigate', sourceIds: [s[0].id] }];
    const out = await run();
    expect(out.happening.main.followUp).toMatchObject({ stage: 'in_progress', plans: [{ id: 'p1', status: 'in_progress' }], cases: [{ id: 'k1', status: 'resolved', hasResolution: true }] });
    expect(out.actions[0]).toMatchObject({ unchangedSinceFollowUp: true, followUp: { stage: 'in_progress' } });

    // Newer evidence after the plan was opened: the recommendation is live again.
    db.table('signals')[0].captured_at = hoursAgo(1);
    const again = await run();
    expect(again.actions[0].unchangedSinceFollowUp).toBe(false);
  });

  it('never claims an outcome without a recorded follow-up', async () => {
    const s = [sig(), sig(), sig()];
    db.table('signals').push(...s);
    recs = [{ action: 'monitor', sourceIds: [s[0].id] }];
    const out = await run();
    expect(out.actions[0].followUp).toEqual({ stage: 'none', openSince: null, plans: [], cases: [] });
  });
});

it('links an action only to the issue its records belong to', async () => {
  const inIssue = [sig(), sig()];
  const outside = sig({ sentiment: 'NEGATIVE' });
  db.table('signals').push(...inIssue, outside);
  db.table('narrative_clusters').push({ id: 'c1', workspace_id: WS, title: 'Main issue', created_at: hoursAgo(20), updated_at: hoursAgo(1) });
  db.table('narrative_cluster_signals').push(...inIssue.map((x) => ({ narrative_cluster_id: 'c1', signal_id: x.id })));
  recs = [{ action: 'escalate_internal', sourceIds: [outside.id] }, { action: 'investigate', sourceIds: [inIssue[0].id] }];
  const out = await run();
  expect(out.happening.main.id).toBe('c1');
  expect(out.actions.find((a) => a.action === 'escalate_internal').relatedNarrative).toBeNull();
  expect(out.actions.find((a) => a.action === 'investigate').relatedNarrative).toMatchObject({ id: 'c1' });
});
