import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// BullMQ analysis worker: persists real analyses; on AI failure it records a
// failure log and writes no invented analysis or sentiment.
const db = createMemoryDb();
let processor = null;
const analyzeSignal = jest.fn();

jest.unstable_mockModule('bullmq', () => ({ Worker: class { constructor(_name, fn) { processor = fn; } on() {} } }));
jest.unstable_mockModule('../src/lib/redis.js', () => ({ default: {} }));
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
jest.unstable_mockModule('../src/modules/ai/ai.service.js', () => ({ analyzeSignal }));
jest.unstable_mockModule('../src/lib/confidence-calibration.js', () => ({ calibrateConfidence: async (_ws, _t, c) => c }));
jest.unstable_mockModule('../src/lib/analysis-cache.js', () => ({ generateContentHash: () => 'h', getCachedAnalysis: async () => null }));
const budget = { allowed: true };
jest.unstable_mockModule('../src/lib/cost-management.js', () => ({ checkAutoThrottle: async () => budget, estimateBatchCost: () => 0 }));
jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });

await import('../src/workers/ai-analysis.worker.js');

const WS = '00000000-0000-4000-8000-0000000000a1';
const SIG = '00000000-0000-4000-8000-0000000000d1';
const run = async () => {
  const p = processor({ id: 'job-1', timestamp: Date.now(), data: { signal_id: SIG } });
  await jest.runAllTimersAsync();
  return p;
};

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('signals').push({ id: SIG, workspace_id: WS, title: 'Outage', content: 'Service down', sentiment: null });
  analyzeSignal.mockReset();
  budget.allowed = true;
});

describe('ai-analysis worker', () => {
  it('persists a real analysis and updates signal sentiment', async () => {
    analyzeSignal.mockResolvedValue({ sentiment: 'NEGATIVE', narrative_type: 'Outage', stakeholder: 'Customers', impact: 'high', summary: 's', recommended_action: 'r', confidence_score: 0.9 });
    await run();
    expect(db.table('signal_analyses')).toHaveLength(1);
    expect(db.table('signals')[0].sentiment).toBe('NEGATIVE');
  });

  it('writes no analysis or sentiment when the AI call fails, and logs the failure', async () => {
    analyzeSignal.mockRejectedValue(new Error('503 upstream'));
    const out = await run();
    expect(out).toMatchObject({ analyzed: false, reason: 'ai_analysis_failed' });
    expect(db.table('signal_analyses')).toHaveLength(0);
    expect(db.table('signals')[0].sentiment).toBeNull();
    expect(db.table('ai_analysis_failure_logs')).toEqual([expect.objectContaining({ workspace_id: WS, signal_id: SIG })]);
  });

  it('defers without writing a placeholder analysis when the budget is exhausted', async () => {
    budget.allowed = false;
    const out = await run();
    expect(out).toMatchObject({ deferred: true });
    expect(analyzeSignal).not.toHaveBeenCalled();
    expect(db.table('signal_analyses')).toHaveLength(0);
  });
});
