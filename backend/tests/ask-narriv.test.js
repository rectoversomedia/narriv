import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Ask Narriv: only verified, workspace-scoped citations; no raw model text or
// provider errors surfaced as answers; usage metered through the AI gateway.
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'; // fake; client is injected
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const { askNarriv, dedupeClustersByTitle } = await import('../src/lib/ask-narriv.js');

const WS = '11111111-1111-1111-1111-111111111111';
const ctx = {
  sinceIso: '2026-10-01T00:00:00Z', windowHours: 168,
  signals: [{ id: 'sig-own', sentiment: 'NEGATIVE', platform: 'news', title: 'Outage report', url: 'https://news.example/outage' }],
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
    expect(r.sources).toEqual([{ id: 'sig-own', kind: 'signal', title: 'Outage report', url: 'https://news.example/outage' }]);
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

  it('merges duplicate narrative titles so one narrative is not presented twice', () => {
    const out = dedupeClustersByTitle([{ id: 'a', title: 'Election Impact', signal_count: 3 }, { id: 'b', title: ' election impact', signal_count: 9 }, { id: 'c', title: 'Other', signal_count: 1 }]);
    expect(out.map((c) => c.id)).toEqual(['b', 'c']);
  });

  it('offers the model only clusters with linked evidence, ranked by linked signals', async () => {
    const now = new Date().toISOString();
    db.table('signals').push({ id: 'sig-a', workspace_id: WS, title: 'A', sentiment: 'NEGATIVE', captured_at: now });
    db.table('narrative_clusters').push(
      { id: 'cl-seeded', workspace_id: WS, title: 'Seeded fixture', signal_count: 24, updated_at: now },
      { id: 'cl-real', workspace_id: WS, title: 'Real narrative', signal_count: 1, updated_at: now },
    );
    db.table('narrative_cluster_signals').push({ cluster_id: 'cl-real', signal_id: 'sig-a' });
    const openai = openaiReturning(JSON.stringify({ answer: 'ok', grounded: true, sources: [{ id: 'cl-real', kind: 'cluster' }] }));
    const r = await askNarriv({ workspaceId: WS, question: 'q', windowHours: 168 }, { openai, checkBudget: async () => ({ allowed: true }), recordUsage: async () => {} });
    const prompt = openai.chat.completions.create.mock.calls[0][0].messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('cl-real | n=1 | Real narrative');
    expect(prompt).not.toContain('cl-seeded');
    expect(r.sources).toEqual([{ id: 'cl-real', kind: 'narrative', title: 'Real narrative', url: null }]);
  });
});
