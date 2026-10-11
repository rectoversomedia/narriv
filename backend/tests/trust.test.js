import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Trust sprint regressions: no fabricated confidence/narratives, honest
// analysis status, server-side RBAC, and persisted keyword management.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { toNarrativeItem } = await import('../src/modules/narratives/narratives.routes.js');
const { toSignalListItem } = await import('../src/modules/signals/signals.routes.js');

const WS = '00000000-0000-4000-8000-0000000000a1';
const OTHER_WS = '00000000-0000-4000-8000-0000000000b1';
const OWNER = '00000000-0000-4000-8000-000000000001';
const ADMIN = '00000000-0000-4000-8000-000000000002';
const ANALYST = '00000000-0000-4000-8000-000000000003';
const OUTSIDER = '00000000-0000-4000-8000-000000000004';
const OWNER_MEMBER_ID = '00000000-0000-4000-8000-0000000000c1';
const H = 3600 * 1000;

const as = (id, extra = {}) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com`, ...extra }, process.env.JWT_SECRET)}` });

function seed() {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('users').push(
    { id: OWNER, email: 'owner@example.com', name: 'Owner' },
    { id: ADMIN, email: 'admin@example.com', name: 'Admin' },
    { id: ANALYST, email: 'analyst@example.com', name: 'Analyst' },
    { id: OUTSIDER, email: 'outsider@example.com', name: 'Outsider' },
  );
  db.table('workspaces').push({ id: WS, name: 'A', onboarding_completed: true }, { id: OTHER_WS, name: 'B', onboarding_completed: true });
  db.table('workspace_members').push(
    { id: OWNER_MEMBER_ID, workspace_id: WS, user_id: OWNER, role: 'owner', created_at: '2026-01-01T00:00:00Z' },
    { id: 'm-admin', workspace_id: WS, user_id: ADMIN, role: 'admin', created_at: '2026-01-01T00:00:00Z' },
    { id: 'm-analyst', workspace_id: WS, user_id: ANALYST, role: 'analyst', created_at: '2026-01-01T00:00:00Z' },
    { id: 'm-outsider', workspace_id: OTHER_WS, user_id: OUTSIDER, role: 'owner', created_at: '2026-01-01T00:00:00Z' },
  );
}

describe('narrative items (no fabricated confidence or growth)', () => {
  const now = Date.now();
  const member = (id, hoursAgo, analyses) => ({ signal: { id, platform: 'news', captured_at: new Date(now - hoursAgo * H).toISOString(), analyses } });

  it('averages persisted confidence (analysis jsonb or column) and reports momentum from observations', () => {
    const item = toNarrativeItem({ id: 'c1', title: 'T', signal_count: 3, narrative_cluster_signals: [
      member('s1', 1, [{ confidence: 0.6, analysis: { confidence_score: 0.8 } }]),
      member('s2', 2, [{ confidence: 0.6, analysis: {} }]),
      member('s3', 30, []),
    ] }, now);
    expect(item.confidence).toBe(70); // (0.8 + 0.6) / 2
    expect(item.momentum).toMatchObject({ last24h: 2, prior24h: 1, changePct: 100 });
    expect(item.velocity).toBe('+100%');
    expect(item.sourceCount).toBe(1);
  });

  it('returns null confidence (not 72) when no member has an analysis', () => {
    const item = toNarrativeItem({ id: 'c2', title: 'T', narrative_cluster_signals: [member('s1', 1, [])] }, now);
    expect(item.confidence).toBeNull();
    expect(item.confidenceBasis).toMatch(/no analysed/);
  });

  it('reports the linked signal count, not a stored counter without evidence', () => {
    const item = toNarrativeItem({ id: 'c4', title: 'Seeded', signal_count: 24, narrative_cluster_signals: [] }, now);
    expect(item).toMatchObject({ signalCount: 0, storedSignalCount: 24, hasEvidence: false });
  });

  it('does not invent growth without observations', () => {
    const item = toNarrativeItem({ id: 'c3', title: 'T', narrative_cluster_signals: [] }, now);
    expect(item.velocity).toBe('—');
    expect(item.momentum.changePct).toBeNull();
  });
});

describe('signal list items', () => {
  it('shows only persisted narratives from the caller workspace and honest analysis status', () => {
    const item = toSignalListItem({
      id: 's1', workspace_id: WS, captured_at: '2026-10-10T00:00:00Z', published_at: '2026-10-09T00:00:00Z', url: 'https://news.example/a', sentiment: null,
      narrative_cluster_signals: [{ cluster: { id: 'c1', title: 'Own', workspace_id: WS } }, { cluster: { id: 'c9', title: 'Foreign', workspace_id: OTHER_WS } }],
      analyses: [],
    }, [WS]);
    expect(item.narratives).toEqual([{ id: 'c1', title: 'Own' }]);
    expect(item.analysisStatus).toBe('unanalyzed');
    expect(item.analysisConfidence).toBeNull();
    expect(item).toMatchObject({ capturedAt: '2026-10-10T00:00:00Z', publishedAt: '2026-10-09T00:00:00Z', url: 'https://news.example/a' });
    expect(item).not.toHaveProperty('narrative_cluster_signals');
  });

  it('marks analysed signals and validates confidence range', () => {
    expect(toSignalListItem({ id: 's', analyses: [{ confidence: 0.9, analysis: {} }] }).analysisConfidence).toBe(0.9);
    expect(toSignalListItem({ id: 's', analyses: [{ confidence: 7, analysis: {} }] }).analysisConfidence).toBeNull();
  });

  it('lists signals with filter-syntax characters in the search term without failing', async () => {
    seed();
    db.table('signals').push({ id: 'sx', workspace_id: WS, title: 'Bank (A), update', content: 'c', captured_at: new Date().toISOString() });
    const res = await request(app).get('/signals?keyword=Bank%20(A),%20x').set(as(OWNER));
    expect(res.status).toBe(200);
  });
});

describe('narrative detail evidence', () => {
  const CL_EMPTY = '00000000-0000-4000-8000-0000000000e1';
  const CL_LINKED = '00000000-0000-4000-8000-0000000000e2';
  const CL_FOREIGN = '00000000-0000-4000-8000-0000000000e3';
  beforeEach(() => {
    seed();
    const now = new Date().toISOString();
    db.table('signals').push(
      { id: 's-linked', workspace_id: WS, title: 'Linked', content: 'c', url: 'https://news.example/x', captured_at: now },
      { id: 's-unanalyzed', workspace_id: WS, title: 'Pending', content: 'c', captured_at: now },
      { id: 's-unrelated', workspace_id: WS, title: 'Unrelated', content: 'c', sentiment: 'NEGATIVE', captured_at: now },
    );
    db.table('signal_analyses').push({ id: 'an1', signal_id: 's-linked', confidence: 0.8, analysis: { sentiment: 'NEGATIVE', impact: 'high' } });
    db.table('narrative_clusters').push(
      { id: CL_EMPTY, workspace_id: WS, title: 'Empty', signal_count: 0 },
      { id: CL_LINKED, workspace_id: WS, title: 'Linked', signal_count: 2 },
      { id: CL_FOREIGN, workspace_id: OTHER_WS, title: 'Foreign', signal_count: 0 },
    );
    db.table('narrative_cluster_signals').push({ cluster_id: CL_LINKED, signal_id: 's-linked' }, { cluster_id: CL_LINKED, signal_id: 's-unanalyzed' });
  });

  it('does not substitute unrelated workspace signals as evidence', async () => {
    const res = await request(app).get(`/narratives/${CL_EMPTY}`).set(as(OWNER));
    expect(res.status).toBe(200);
    expect(res.body.relatedSignals).toEqual([]);
    expect(res.body.evidenceNote).toMatch(/No signals are linked/);
  });

  it('reports sentiment from the persisted analysis and counts unanalyzed honestly', async () => {
    const res = await request(app).get(`/narratives/${CL_LINKED}`).set(as(OWNER));
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.relatedSignals.map((x) => [x.id, x]));
    expect(byId['s-linked']).toMatchObject({ sentiment: 'negative', impact: 'high', analysisConfidence: 0.8, url: 'https://news.example/x' });
    expect(byId['s-unanalyzed']).toMatchObject({ sentiment: 'unanalyzed', analysisConfidence: null });
    expect(res.body.sentimentBreakdown).toMatchObject({ negative: 1, unanalyzed: 1, neutral: 0 });
  });

  it("returns 404 for another workspace's narrative", async () => {
    expect((await request(app).get(`/narratives/${CL_FOREIGN}`).set(as(OWNER))).status).toBe(404);
  });
});

describe('reputation without observations', () => {
  it('returns no score (not a 50/100 baseline) and the brief says so', async () => {
    seed();
    const { computeReputationIntelligence } = await import('../src/lib/reputation-intelligence.js');
    const { generateExecutiveBrief } = await import('../src/lib/executive-briefing.js');
    const rep = await computeReputationIntelligence({ workspaceId: WS, windowHours: 24 });
    expect(rep).toMatchObject({ reputationScore: null, reputationBand: 'insufficient_data' });
    const brief = await generateExecutiveBrief({ workspaceId: WS, windowHours: 24 });
    expect(JSON.stringify(brief)).toContain('Reputation: not enough data in this window.');
    expect(JSON.stringify(brief)).not.toMatch(/\(50\/100\)/);
  });
});

describe('signal summary metrics', () => {
  it('counts only POSITIVE signals as positive (neutral and unanalyzed are excluded)', async () => {
    seed();
    const now = new Date().toISOString();
    db.table('signals').push(
      { id: 'p1', workspace_id: WS, title: 'a', content: 'c', sentiment: 'POSITIVE', captured_at: now },
      { id: 'n1', workspace_id: WS, title: 'b', content: 'c', sentiment: 'NEGATIVE', captured_at: now },
      { id: 'u1', workspace_id: WS, title: 'c', content: 'c', sentiment: 'NEUTRAL', captured_at: now },
      { id: 'u2', workspace_id: WS, title: 'd', content: 'c', sentiment: null, captured_at: now },
      { id: 'x1', workspace_id: OTHER_WS, title: 'e', content: 'c', sentiment: 'POSITIVE', captured_at: now },
    );
    const res = await request(app).get('/signals/meta').set(as(OWNER));
    expect(res.status).toBe(200);
    expect((res.body.data || res.body).metrics).toMatchObject({ totalSignals24h: 4, positiveSignals24h: 1, negativeSignals24h: 1 });
  });
});

describe('RBAC on workspace management', () => {
  beforeEach(seed);
  const addMember = (who, role) => request(app).post('/workspace/members').set(as(who)).send({ workspaceId: WS, email: 'outsider@example.com', role });

  it('lets an owner add a member with any role', async () => {
    expect((await addMember(OWNER, 'owner')).status).toBe(201);
  });

  it('forbids an analyst from adding members', async () => {
    const res = await addMember(ANALYST, 'analyst');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_ROLE');
    expect(db.table('workspace_members').filter((m) => m.workspace_id === WS)).toHaveLength(3);
  });

  it('forbids an admin from granting the owner role (no escalation)', async () => {
    const res = await addMember(ADMIN, 'owner');
    expect(res.status).toBe(403);
    expect(db.table('workspace_members').some((m) => m.user_id === OUTSIDER && m.workspace_id === WS)).toBe(false);
  });

  it('lets an admin add an analyst', async () => {
    expect((await addMember(ADMIN, 'analyst')).status).toBe(201);
  });

  it('forbids an admin from removing an owner and protects the last owner', async () => {
    const byAdmin = await request(app).delete(`/workspace/members/${OWNER_MEMBER_ID}?workspaceId=${WS}`).set(as(ADMIN)).send({});
    expect(byAdmin.status).toBe(403);
    const byOwner = await request(app).delete(`/workspace/members/${OWNER_MEMBER_ID}?workspaceId=${WS}`).set(as(OWNER)).send({});
    expect(byOwner.status).toBe(409);
    expect(db.table('workspace_members').some((m) => m.id === OWNER_MEMBER_ID)).toBe(true);
  });

  it('forbids analysts and demo sessions from changing workspace settings', async () => {
    expect((await request(app).patch('/workspace/settings').set(as(ANALYST)).send({ workspaceId: WS, brandName: 'X' })).status).toBe(403);
    expect((await request(app).patch('/workspace/settings').set(as('demo_x', { isDemo: true })).send({ brandName: 'X' })).status).toBe(403);
  });

  it('does not let a member of another workspace manage this one', async () => {
    const res = await request(app).post('/workspace/members').set(as(OUTSIDER)).send({ workspaceId: WS, email: 'analyst@example.com', role: 'owner' });
    expect(res.status).toBe(403);
  });
});

describe('monitoring keywords', () => {
  beforeEach(seed);
  const post = (who, keyword, ws = WS) => request(app).post('/workspace/keywords').set(as(who)).send({ workspaceId: ws, keyword });

  it('creates, lists, renames, deactivates and deletes keywords (persisted, workspace-scoped)', async () => {
    const created = await post(OWNER, '  Bank   Mandiri ');
    expect(created.status).toBe(201);
    expect(created.body.keyword).toMatchObject({ keyword: 'Bank Mandiri', isActive: true, scheduled: true });
    const id = created.body.keyword.id;
    expect(db.table('monitoring_keywords')).toEqual([expect.objectContaining({ workspace_id: WS, keyword: 'Bank Mandiri' })]);

    const list = await request(app).get(`/workspace/keywords?workspaceId=${WS}`).set(as(ANALYST));
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({ canEdit: false, limits: { scheduledPerRun: 3 } });
    expect(list.body.data.map((k) => k.keyword)).toEqual(['Bank Mandiri']);

    expect((await request(app).patch(`/workspace/keywords/${id}`).set(as(ADMIN)).send({ workspaceId: WS, keyword: 'Bank Mandiri Tbk' })).status).toBe(200);
    expect((await request(app).patch(`/workspace/keywords/${id}`).set(as(ADMIN)).send({ workspaceId: WS, isActive: false })).status).toBe(200);
    expect(db.table('monitoring_keywords')[0]).toMatchObject({ keyword: 'Bank Mandiri Tbk', is_active: false });

    expect((await request(app).delete(`/workspace/keywords/${id}?workspaceId=${WS}`).set(as(OWNER)).send({})).status).toBe(200);
    expect(db.table('monitoring_keywords')).toHaveLength(0);
  });

  it('rejects duplicates case-insensitively and invalid input', async () => {
    await post(OWNER, 'Bank Mandiri');
    expect((await post(OWNER, 'bank mandiri')).status).toBe(409);
    expect((await post(OWNER, 'x')).status).toBe(400);
  });

  it('forbids analysts from editing keywords', async () => {
    expect((await post(ANALYST, 'Competitor X')).status).toBe(403);
    expect(db.table('monitoring_keywords')).toHaveLength(0);
  });

  it("cannot touch another workspace's keyword by id", async () => {
    db.table('monitoring_keywords').push({ id: '00000000-0000-4000-8000-0000000000d1', workspace_id: OTHER_WS, keyword: 'Foreign', is_active: true, created_at: '2026-01-01T00:00:00Z' });
    const res = await request(app).delete(`/workspace/keywords/00000000-0000-4000-8000-0000000000d1?workspaceId=${WS}`).set(as(OWNER)).send({});
    expect(res.status).toBe(404);
    expect(db.table('monitoring_keywords')).toHaveLength(1);
  });

  it('reports per-keyword monitoring status from the latest scheduled run results', async () => {
    db.table('monitoring_keywords').push(
      { id: '00000000-0000-4000-8000-0000000000f1', workspace_id: WS, keyword: 'Healthy', is_active: true, created_at: '2026-01-01T00:00:01Z' },
      { id: '00000000-0000-4000-8000-0000000000f2', workspace_id: WS, keyword: 'Broken', is_active: true, created_at: '2026-01-01T00:00:02Z' },
      { id: '00000000-0000-4000-8000-0000000000f3', workspace_id: WS, keyword: 'Brand new', is_active: true, created_at: '2026-01-01T00:00:03Z' },
      { id: '00000000-0000-4000-8000-0000000000f4', workspace_id: WS, keyword: 'Fourth', is_active: true, created_at: '2026-01-01T00:00:04Z' },
      { id: '00000000-0000-4000-8000-0000000000f5', workspace_id: WS, keyword: 'Paused', is_active: false, created_at: '2026-01-01T00:00:05Z' },
    );
    db.table('cron_ingestion_logs').push({ job_name: 'scheduled-rss-ingestion', status: 'completed_with_errors', created_at: '2026-10-11T06:49:00Z', metadata: { results: [
      { workspaceId: WS, keyword: 'healthy', status: 'ok', fetched: 8, inserted: 1, deduplicated: 7 },
      { workspaceId: WS, keyword: 'Broken', status: 'failed', errorCategory: 'network' },
      { workspaceId: OTHER_WS, keyword: 'Brand new', status: 'ok', fetched: 3, inserted: 3, deduplicated: 0 },
    ] } });
    const res = await request(app).get(`/workspace/keywords?workspaceId=${WS}`).set(as(OWNER));
    const by = Object.fromEntries(res.body.data.map((k) => [k.keyword, k]));
    expect(by.Healthy).toMatchObject({ monitoringStatus: 'active', lastRun: { fetched: 8, inserted: 1, deduplicated: 7 } });
    expect(by.Broken).toMatchObject({ monitoringStatus: 'failing', lastRun: { errorCategory: 'network' } });
    expect(by['Brand new']).toMatchObject({ monitoringStatus: 'awaiting_first_run', lastRun: null }); // other workspace's run is not used
    expect(by.Fourth.monitoringStatus).toBe('not_in_rotation');
    expect(by.Paused.monitoringStatus).toBe('paused');
  });

  it("marks as scheduled exactly the keywords the scheduler will ingest (paused excluded)", async () => {
    const { buildWorkList } = await import('../src/modules/ingestion/scheduled-ingestion.js');
    const kw = (n, active, t) => ({ id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`, workspace_id: WS, keyword: `kw-${n}`, is_active: active, created_at: `2026-01-01T00:00:${t}Z` });
    db.table('monitoring_keywords').push(kw(1, true, '01'), kw(2, false, '02'), kw(3, true, '03'), kw(4, true, '04'), kw(5, true, '05'));
    const res = await request(app).get(`/workspace/keywords?workspaceId=${WS}`).set(as(OWNER));
    const scheduled = res.body.data.filter((k) => k.scheduled).map((k) => k.keyword);
    const activeRows = db.table('monitoring_keywords').filter((k) => k.is_active).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const work = buildWorkList(activeRows).filter((w) => w.workspaceId === WS).map((w) => w.keyword);
    expect(scheduled).toEqual(['kw-1', 'kw-3', 'kw-4']);
    expect(work).toEqual(scheduled);
  });

  it('enforces the active keyword limit', async () => {
    for (let i = 0; i < 25; i++) db.table('monitoring_keywords').push({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, workspace_id: WS, keyword: `kw ${i}`, is_active: true, created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z` });
    expect((await post(OWNER, 'one more')).status).toBe(422);
  });
});
