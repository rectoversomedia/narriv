import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const now = Date.parse('2026-11-18T12:00:00Z');
const recent = '2026-11-17T12:00:00Z';
const WS = 'ws-1';
const seed = () => ({
  workspace_settings: [{ workspace_id: WS, language: 'id' }],
  narrative_clusters: [
    { id: 'kur', workspace_id: WS, title: 'Sorotan KUR ASN', description: 'CBA menyoroti penyaluran KUR.', sentiment: 'mixed', impact: 'HIGH', signal_count: 3, updated_at: recent },
    { id: 'gold', workspace_id: WS, title: 'ATM Emas', sentiment: 'positive', impact: 'LOW', signal_count: 4, updated_at: recent },
    { id: 'tiny', workspace_id: WS, title: 'Satu berita', sentiment: 'negative', impact: 'LOW', signal_count: 1, updated_at: recent },
  ],
  narrative_cluster_signals: [{ cluster_id: 'kur', signal_id: 's1' }, { cluster_id: 'kur', signal_id: 's2' }, { cluster_id: 'gold', signal_id: 's3' }],
  action_plans: [],
  cases: [],
});

const db = createMemoryDb(seed());
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const { runIssueFollowUp, strategyFor, casePriority } = await import('../src/lib/issue-follow-up.js');

describe('default issue follow-up', () => {
  it('gives a risky issue a case and an AI plan, once, and leaves positive and one-record issues alone', async () => {
    const generatePlan = jest.fn(async ({ clusterId }) => { await db.from('action_plans').insert({ workspace_id: WS, cluster_id: clusterId }); });
    const first = await runIssueFollowUp(WS, { db, generatePlan, now });
    expect(first).toMatchObject({ cases: 1, plans: 1 });
    expect(generatePlan).toHaveBeenCalledWith({ workspaceId: WS, strategyType: 'pr_response', clusterId: 'kur' });
    const { data: cases } = await db.from('cases').select('*').eq('workspace_id', WS);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({ title: 'Sorotan KUR ASN', priority: 'high', signal_id: 's1', status: 'open' });
    expect(cases[0].description).toContain('Langkah');

    const again = await runIssueFollowUp(WS, { db, generatePlan, now });
    expect(again).toMatchObject({ cases: 0, plans: 0 });
    expect(generatePlan).toHaveBeenCalledTimes(1);
  });

  it('picks crisis response only for a high-impact negative issue', () => {
    expect(strategyFor({ sentiment: 'negative', impact: 'CRITICAL' })).toBe('crisis_response');
    expect(strategyFor({ sentiment: 'mixed', impact: 'HIGH' })).toBe('pr_response');
    expect(casePriority({ sentiment: 'negative', impact: 'LOW' })).toBe('medium');
  });
});
