import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Action plan generation: workspace-verified evidence, drafts only, metered
// usage, and no template text persisted when the AI call fails.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const { generateActionPlan } = await import('../src/modules/actions/actions.service.js');

const WS = '00000000-0000-4000-8000-0000000000a1';
const OTHER = '00000000-0000-4000-8000-0000000000b1';
const CL = '00000000-0000-4000-8000-0000000000c1';
const SIG = '00000000-0000-4000-8000-0000000000d1';
const FOREIGN_SIG = '00000000-0000-4000-8000-0000000000d2';

const okOption = { title: 'Holding statement', executive_summary: 'Acknowledge and commit to update.', key_messages: ['a'], talking_points: ['b'], media_channels: ['Website'], timeline: '24h', risk_considerations: 'r' };
const completeWith = (content) => jest.fn(async () => ({ usage: { prompt_tokens: 100, completion_tokens: 50 }, choices: [{ message: { content } }] }));
const baseDeps = (complete) => ({ complete, checkBudget: async () => ({ allowed: true }), recordUsage: jest.fn(async () => {}) });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('signals').push({ id: SIG, workspace_id: WS, title: 'Outage', content: 'c', sentiment: 'NEGATIVE' }, { id: FOREIGN_SIG, workspace_id: OTHER, title: 'Secret', content: 'x' });
  db.table('narrative_clusters').push({ id: CL, workspace_id: WS, title: 'Outage narrative', signal_count: 1 });
  db.table('narrative_cluster_signals').push({ cluster_id: CL, signal_id: SIG });
});

describe('generateActionPlan', () => {
  it('saves a draft linked to its narrative evidence and records token usage', async () => {
    const deps = baseDeps(completeWith(JSON.stringify(okOption)));
    const plan = await generateActionPlan({ workspaceId: WS, strategyType: 'pr_response', clusterId: CL }, deps);
    expect(plan).toMatchObject({ draft: true, evidence: { clusterId: CL, signalIds: [SIG] }, failedOptions: [] });
    const saved = db.table('action_plans')[0];
    expect(saved).toMatchObject({ workspace_id: WS, cluster_id: CL, status: 'pending' });
    expect(JSON.parse(saved.strategy)).toMatchObject({ draft: true, evidence: { signalIds: [SIG] } });
    expect(deps.recordUsage).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS, operation: 'action_plan_generation', inputTokens: 300, outputTokens: 150 }));
  });

  it('rejects a signal from another workspace', async () => {
    await expect(generateActionPlan({ workspaceId: WS, strategyType: 'pr_response', signalId: FOREIGN_SIG }, baseDeps(completeWith(JSON.stringify(okOption))))).rejects.toThrow('Signal not found');
    expect(db.table('action_plans')).toHaveLength(0);
  });

  it('persists nothing when every AI option fails (no template fallback)', async () => {
    const complete = jest.fn(async () => { throw new Error('503 upstream'); });
    await expect(generateActionPlan({ workspaceId: WS, strategyType: 'pr_response', clusterId: CL }, baseDeps(complete))).rejects.toMatchObject({ code: 'AI_GENERATION_FAILED' });
    expect(db.table('action_plans')).toHaveLength(0);
  });

  it('reports failed options instead of filling them with template text', async () => {
    let n = 0;
    const complete = jest.fn(async () => { n += 1; if (n === 1) throw new Error('timeout'); return { usage: {}, choices: [{ message: { content: JSON.stringify(okOption) } }] }; });
    const plan = await generateActionPlan({ workspaceId: WS, strategyType: 'pr_response', clusterId: CL }, baseDeps(complete));
    expect(plan.failedOptions).toHaveLength(1);
    expect(Object.values(plan.options).filter(Boolean)).toHaveLength(2);
    expect(JSON.stringify(plan)).not.toContain('backup template');
  });

  it('does not call the model when the workspace budget is exhausted', async () => {
    const complete = completeWith(JSON.stringify(okOption));
    await expect(generateActionPlan({ workspaceId: WS, strategyType: 'pr_response' }, { ...baseDeps(complete), checkBudget: async () => ({ allowed: false }) })).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' });
    expect(complete).not.toHaveBeenCalled();
  });
});
