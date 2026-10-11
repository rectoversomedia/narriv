import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Ask Narriv: only verified, workspace-scoped citations; no raw model text or
// provider errors surfaced as answers; usage metered through the AI gateway.
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'; // fake; client is injected
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const { askNarriv } = await import('../src/lib/ask-narriv.js');

const WS = '11111111-1111-1111-1111-111111111111';
const ctx = {
  sinceIso: '2026-10-01T00:00:00Z', windowHours: 168,
  signals: [{ id: 'sig-own', sentiment: 'NEGATIVE', platform: 'news', title: 'Outage report' }],
  alerts: [{ id: 'al-own', severity: 'high', status: 'open' }],
  clusters: [{ id: 'cl-own', title: 'Outage', signal_count: 4 }],
};
const openaiReturning = (content) => ({ chat: { completions: { create: jest.fn(async () => ({ model: 'gpt-4o-mini', usage: { prompt_tokens: 50, completion_tokens: 10 }, choices: [{ message: { content } }] })) } } });
const deps = (openai, extra = {}) => ({ openai, gatherContext: async () => ctx, checkBudget: async () => ({ allowed: true }), recordUsage: jest.fn(async () => {}), ...extra });

describe('askNarriv', () => {
  it('keeps only citations present in this workspace context and reports the serving model', async () => {
    const d = deps(openaiReturning(JSON.stringify({ answer: 'One outage narrative.', grounded: true, sources: [{ id: 'sig-own', kind: 'signal' }, { id: 'sig-other-workspace', kind: 'signal' }] })));
    const r = await askNarriv({ workspaceId: WS, question: 'What is happening?', windowHours: 168 }, d);
    expect(r).toMatchObject({ answer: 'One outage narrative.', grounded: true, meta: { model: 'gpt-4o-mini' } });
    expect(r.sources).toEqual([{ id: 'sig-own', kind: 'signal' }]);
    expect(d.recordUsage).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS, operation: 'ask_narriv', inputTokens: 50, outputTokens: 10 }));
  });

  it('is not grounded when every citation is unknown, even if the model claims it is', async () => {
    const r = await askNarriv({ workspaceId: WS, question: 'q' }, deps(openaiReturning(JSON.stringify({ answer: 'x', grounded: true, sources: ['foreign-id'] }))));
    expect(r.grounded).toBe(false);
    expect(r.sources).toEqual([]);
  });

  it('discards unparseable model output instead of returning it as an answer', async () => {
    const r = await askNarriv({ workspaceId: WS, question: 'q' }, deps(openaiReturning('Revenue fell 40% due to fraud.')));
    expect(r).toMatchObject({ grounded: false, code: 'malformed_output' });
    expect(r).not.toHaveProperty('answer');
    expect(JSON.stringify(r)).not.toContain('Revenue fell');
  });

  it('returns a clear error without leaking raw provider details', async () => {
    const openai = { chat: { completions: { create: jest.fn(async () => { throw new Error('401 Incorrect API key provided: sk-abc'); }) } } };
    const r = await askNarriv({ workspaceId: WS, question: 'q' }, deps(openai));
    expect(r).toMatchObject({ grounded: false, code: 'provider_error' });
    expect(r.error).not.toMatch(/sk-|Incorrect API key/);
  });

  it('does not call the model when the workspace budget is exhausted', async () => {
    const openai = openaiReturning('{}');
    const r = await askNarriv({ workspaceId: WS, question: 'q' }, deps(openai, { checkBudget: async () => ({ allowed: false, reason: 'cap' }) }));
    expect(r.code).toBe('budget_exceeded');
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it('answers honestly without a model call when the window has no data', async () => {
    const openai = openaiReturning('{}');
    const r = await askNarriv({ workspaceId: WS, question: 'q' }, { ...deps(openai), gatherContext: async () => ({ ...ctx, signals: [], alerts: [], clusters: [] }) });
    expect(r.answer).toMatch(/no data/);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });
});
