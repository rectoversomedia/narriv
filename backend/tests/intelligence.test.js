import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Intelligence quality tests: risk model, recommendation grounding,
// clustering idempotency/explainability, Claude request shaping, cost.
// All fixtures are synthetic and in-memory; nothing touches production.
const db = createMemoryDb();
const analyzeCluster = jest.fn();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
jest.unstable_mockModule('../src/modules/ai/ai.service.js', () => ({ analyzeCluster }));

const { computeRisk, velocity100, bandFor, RISK_MODEL_VERSION } = await import('../src/lib/risk-model.js');
const { deriveRecommendations } = await import('../src/lib/recommendation-engine.js');
const { computeNarrativeIntelligence } = await import('../src/lib/narrative-intelligence.js');
const { runClustering, explainMembership, extractKeywords } = await import('../src/modules/clustering/clustering.service.js');
const { buildClaudeRequest, createClaudeCompletion, modelCapabilities } = await import('../src/lib/anthropic-client.js');
const { calculateCost, isPricedModel } = await import('../src/lib/token-tracking.js');

const WS = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const sig = (id, sentiment, severity = 'low') => ({ id, sentiment, severity, platform: 'news', source_id: 'src-1' });

function reset() {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  analyzeCluster.mockReset();
}

describe('risk model', () => {
  const signals = [sig('s1', 'NEGATIVE', 'high'), sig('s2', 'NEGATIVE'), sig('s3', 'POSITIVE'), sig('s4', 'NEUTRAL', 'critical')];
  const alerts = [{ id: 'a1', severity: 'high', status: 'open' }, { id: 'a2', severity: 'high', status: 'resolved' }];
  const clusters = [{ id: 'c1', title: 'Outage', velocity: 85, signal_count: 4 }, { id: 'c2', title: 'Award', velocity: 65 }];

  it('returns zero risk with high uncertainty when there are no signals', () => {
    const r = computeRisk({ signals: [] });
    expect(r).toMatchObject({ score: 0, band: 'low', uncertainty: { level: 'high' } });
  });

  it('does not treat a missing baseline as a volume spike', () => {
    const r = computeRisk({ signals, priorCount: 0 });
    const volume = r.components.find((c) => c.key === 'volume_change');
    expect(volume.contribution).toBe(0);
    expect(volume.inputs.ratio).toBeNull();
    expect(r.uncertainty.reasons.join(' ')).toMatch(/baseline/i);
  });

  it('score equals the sum of named component contributions (traceable)', () => {
    const r = computeRisk({ signals, priorCount: 2, alerts, clusters });
    const sum = r.components.reduce((a, c) => a + c.contribution, 0);
    expect(r.score).toBe(Math.round(sum));
    expect(r.band).toBe(bandFor(r.score));
    expect(r.components.map((c) => c.key).sort()).toEqual(['active_alerts', 'narrative_momentum', 'negative_share', 'severity', 'volume_change']);
    expect(r.components.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1);
    for (const c of r.components) expect(typeof c.reason).toBe('string');
  });

  it('cites only real input records as evidence', () => {
    const r = computeRisk({ signals, priorCount: 2, alerts, clusters });
    const known = new Set([...signals, ...alerts, ...clusters].map((x) => x.id));
    for (const id of r.sourceIds) expect(known.has(id)).toBe(true);
    expect(r.components.find((c) => c.key === 'negative_share').evidenceIds).toEqual(['s1', 's2']);
    expect(r.components.find((c) => c.key === 'active_alerts').evidenceIds).toEqual(['a1']); // resolved alert excluded
  });

  it('uses the 0-100 velocity scale for emerging narratives (regression: 0.6 threshold made all clusters emerging)', () => {
    const r = computeRisk({ signals, clusters });
    expect(r.emergingClusters.map((c) => c.id)).toEqual(['c1']);
    expect(velocity100(0.8)).toBe(80);
    expect(velocity100(null)).toBeNull();
  });

  it('is deterministic and labels itself as a heuristic, not a probability', () => {
    const a = computeRisk({ signals, priorCount: 2, alerts, clusters });
    const b = computeRisk({ signals, priorCount: 2, alerts, clusters });
    expect(a).toEqual(b);
    expect(a.version).toBe(RISK_MODEL_VERSION);
    expect(a.limitations.join(' ')).toMatch(/not a calibrated probability/);
  });

  it('flags small samples and unanalyzed signals as uncertainty', () => {
    const r = computeRisk({ signals: [sig('x', null)], priorCount: 1 });
    expect(r.uncertainty.reasons.join(' ')).toMatch(/Small sample/);
    expect(r.uncertainty.reasons.join(' ')).toMatch(/no sentiment/);
  });
});

describe('recommendation grounding', () => {
  const risk = computeRisk({
    signals: [sig('s1', 'NEGATIVE', 'high'), sig('s2', 'NEGATIVE'), sig('s3', 'NEGATIVE')],
    priorCount: 1,
    alerts: [{ id: 'a1', severity: 'critical', status: 'open' }],
    clusters: [{ id: 'c1', velocity: 90 }],
  });

  it('cites real source IDs, stays a suggestion and requires approval', () => {
    const { recommendations } = deriveRecommendations({ riskScore: risk.score, riskBand: risk.band, activeAlerts: 1, emergingNarratives: 1, negativeShare: 1, risk });
    expect(recommendations.length).toBeGreaterThan(0);
    for (const r of recommendations) {
      expect(r.status).toBe('suggested');
      expect(r.requiresApproval).toBe(true);
      for (const id of r.sourceIds) expect(risk.sourceIds).toContain(id);
      expect(r.observedIssue).toEqual(expect.any(String));
      expect(r.monitorNext).toEqual(expect.any(String));
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
    const clarification = recommendations.find((r) => r.action === 'prepare_clarification');
    expect(clarification.sourceIds).toEqual(['s1', 's2', 's3']);
  });

  it('caps confidence when no individual record supports a non-monitor action', () => {
    const { recommendations } = deriveRecommendations({ volumeRatio: 3, risk });
    const volumeRec = recommendations.find((r) => r.evidence.includes('volume_ratio'));
    expect(volumeRec.sourceIds).toEqual([]);
    expect(volumeRec.confidence).toBeLessThanOrEqual(0.4);
    expect(volumeRec.limitations.join(' ')).toMatch(/aggregate/);
  });

  it('keeps the legacy shape when no risk model is passed', () => {
    const { recommendations } = deriveRecommendations({ riskBand: 'low' });
    expect(recommendations[0]).toMatchObject({ action: 'monitor', requiresApproval: true });
  });
});

describe('narrative intelligence', () => {
  beforeEach(reset);

  it('reads only the requested workspace and exposes an explainable risk model', async () => {
    const now = new Date().toISOString();
    db.table('signals').push(
      { id: 's1', workspace_id: WS, sentiment: 'NEGATIVE', severity: 'high', captured_at: now },
      { id: 's2', workspace_id: WS, sentiment: 'NEUTRAL', severity: 'low', captured_at: now },
      { id: 'foreign', workspace_id: OTHER, sentiment: 'NEGATIVE', severity: 'critical', captured_at: now },
    );
    db.table('alerts').push({ id: 'fa', workspace_id: OTHER, severity: 'critical', status: 'open', created_at: now });

    const out = await computeNarrativeIntelligence({ workspaceId: WS, windowHours: 24 });

    expect(out.riskModel.sourceIds).not.toContain('foreign');
    expect(out.riskModel.sourceIds).not.toContain('fa');
    expect(JSON.stringify(out)).not.toContain('foreign');
    expect(out.inferences.find((i) => i.kind === 'volume_ratio').ratio).toBeNull();
    expect(out.recommendations.every((r) => r.status === 'suggested')).toBe(true);
  });
});

describe('clustering', () => {
  beforeEach(reset);

  const now = () => new Date().toISOString();
  function seedSignals() {
    db.table('signals').push(
      { id: 'k1', workspace_id: WS, title: 'Bank Mandiri mobile app outage hits customers', content: 'mobile app outage customers transfer', sentiment: 'NEGATIVE', severity: 'high', captured_at: now(), analyses: [] },
      { id: 'k2', workspace_id: WS, title: 'Customers report Bank Mandiri mobile app outage', content: 'outage mobile app customers login', sentiment: 'NEGATIVE', severity: 'medium', captured_at: now(), analyses: [] },
      { id: 'k3', workspace_id: WS, title: 'Quarterly dividend announced by retailer', content: 'dividend shareholders retailer', sentiment: 'POSITIVE', severity: 'low', captured_at: now(), analyses: [] },
    );
  }

  it('explains membership with similarity and shared keywords', () => {
    const m = explainMembership({ id: 'x', keywords: extractKeywords('mobile app outage customers') }, extractKeywords('app outage mobile login'), 'keyword_jaccard_seed', 0.15);
    expect(m).toMatchObject({ signalId: 'x', method: 'keyword_jaccard_seed', threshold: 0.15 });
    expect(m.sharedKeywords).toEqual(['app', 'mobile', 'outage']);
    expect(m.similarity).toBeGreaterThan(0);
  });

  it('creates one supported cluster, records membership, and is idempotent on re-run', async () => {
    seedSignals();
    analyzeCluster.mockResolvedValue({ title: 'Mobile app outage', description: 'Customers report outage', dominant_sentiment: 'negative', impact: 'high' });

    const first = await runClustering(WS);
    const clusters = db.table('narrative_clusters');
    expect(first.clustersCreated).toBe(1);
    expect(clusters).toHaveLength(1);
    const links = db.table('narrative_cluster_signals').map((l) => l.signal_id).sort();
    expect(links).toEqual(['k1', 'k2']); // unrelated, low-severity k3 does not get its own narrative
    expect(clusters[0].metadata.membership.map((m) => m.signalId).sort()).toEqual(['k1', 'k2']);
    expect(clusters[0].metadata.labeledBy).toBe('ai');

    const second = await runClustering(WS);
    expect(second.clustersCreated || 0).toBe(0);
    expect(db.table('narrative_clusters')).toHaveLength(1);
    expect(db.table('narrative_cluster_signals')).toHaveLength(2);
  });

  it('falls back to a heuristic label (and says so) when the AI call fails', async () => {
    seedSignals();
    analyzeCluster.mockRejectedValue(new Error('provider timeout'));
    await runClustering(WS);
    const [cluster] = db.table('narrative_clusters');
    expect(cluster.metadata.labeledBy).toBe('heuristic_fallback');
    expect(cluster.title).toMatch(/Bank Mandiri|outage/i); // derived from a real member signal
  });

  it('never clusters another workspace\'s signals', async () => {
    seedSignals();
    db.table('signals').push({ id: 'foreign', workspace_id: OTHER, title: 'Bank Mandiri mobile app outage', content: 'mobile app outage', sentiment: 'NEGATIVE', severity: 'high', captured_at: now(), analyses: [] });
    analyzeCluster.mockResolvedValue(null);
    await runClustering(WS);
    expect(db.table('narrative_cluster_signals').map((l) => l.signal_id)).not.toContain('foreign');
  });
});

describe('Claude request shaping (Opus 5.5)', () => {
  it('omits sampling params and sets effort plus server-side fallback for claude-opus-5-5', () => {
    const req = buildClaudeRequest({ model: 'claude-opus-5-5', user: 'hi', temperature: 0.4, maxTokens: 512 });
    expect(req).not.toHaveProperty('temperature');
    expect(req.output_config).toEqual({ effort: 'medium' });
    expect(req.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(req.fallbacks).toBe('default');
    expect(req.max_tokens).toBe(512);
  });

  it('keeps temperature for models that accept sampling', () => {
    const req = buildClaudeRequest({ model: 'claude-legacy-x', user: 'hi', temperature: 0.4 });
    expect(req.temperature).toBe(0.4);
    expect(req).not.toHaveProperty('output_config');
    expect(modelCapabilities('claude-legacy-x').sampling).toBe(true);
  });

  it('returns refusals explicitly instead of as content', async () => {
    const client = { beta: { messages: { create: jest.fn(async () => ({ model: 'claude-opus-5-5', stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [], usage: { input_tokens: 5, output_tokens: 0 } })) } } };
    const out = await createClaudeCompletion({ model: 'claude-opus-5-5', user: 'x' }, client);
    expect(out).toMatchObject({ content: null, stopReason: 'refusal', refusal: { category: 'cyber' } });
  });

  it('joins text blocks and reports the serving model', async () => {
    const client = { beta: { messages: { create: jest.fn(async () => ({ model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'answer' }], usage: { input_tokens: 10, output_tokens: 3 } })) } } };
    const out = await createClaudeCompletion({ model: 'claude-opus-5-5', user: 'x' }, client);
    expect(out).toMatchObject({ content: 'answer', model: 'claude-opus-5-5', refusal: null });
  });
});

describe('model pricing', () => {
  it('prices Claude Opus 5.5 at $4 / $20 per million tokens', () => {
    expect(calculateCost('claude-opus-5-5', 1_000_000, 1_000_000)).toBeCloseTo(24);
    expect(calculateCost('gpt-4o-mini', 1000, 1000)).toBeCloseTo(0.00075);
  });

  it('does not silently price unknown models as another model', () => {
    expect(isPricedModel('some-new-model')).toBe(false);
    expect(calculateCost('some-new-model', 1000, 1000)).toBe(0);
  });
});
