import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// AI gateway: routing, premium fallback, budgets, refusals, malformed output,
// usage/cost recording. Provider clients are fakes; no real AI calls.
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'; // fake; clients are injected
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

const { runAiTask, resolveTaskRoute, premiumSpendThisMonth } = await import('../src/lib/ai-gateway.js');
const { routeForTask, listTiers } = await import('../src/lib/ai-routing.js');

const WS = '11111111-1111-1111-1111-111111111111';

const openaiReturning = (content, usage = { prompt_tokens: 100, completion_tokens: 20 }) => ({
  chat: { completions: { create: jest.fn(async () => ({ model: 'gpt-4o-mini', usage, choices: [{ message: { content } }] })) } },
});
const allow = async () => ({ allowed: true });

beforeEach(() => {
  delete process.env.AI_MODEL_PREMIUM;
  delete process.env.AI_PROVIDER_PREMIUM;
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
});

describe('task routing', () => {
  it('keeps production defaults: routine/narrative/executive tasks on the economical model', () => {
    expect(routeForTask('routine_classification').model).toBe('gpt-4o-mini');
    expect(routeForTask('narrative_analysis').model).toBe('gpt-4o-mini');
    expect(routeForTask('executive_synthesis').model).toBe('gpt-4o-mini');
  });

  it('falls back from premium to complex when no premium model is configured, and says why', () => {
    const { route, fallbackReason } = resolveTaskRoute('reputation_investigation');
    expect(route.meta.complexity).toBe('complex');
    expect(fallbackReason).toMatch(/AI_MODEL_PREMIUM unset/);
    expect(listTiers().map((t) => t.name)).not.toContain('premium');
  });

  it('falls back when the premium provider has no credentials', () => {
    process.env.AI_MODEL_PREMIUM = 'claude-opus-5-5';
    const { route, fallbackReason } = resolveTaskRoute('reputation_investigation');
    expect(route.meta.complexity).toBe('complex');
    expect(fallbackReason).toMatch(/anthropic not configured/);
  });
});

describe('runAiTask', () => {
  it('records usage against the serving model and task, with cost and latency', async () => {
    const recordUsage = jest.fn(async () => {});
    const r = await runAiTask({ task: 'narrative_analysis', workspaceId: WS, user: 'x' }, { openai: openaiReturning('hello'), checkBudget: allow, recordUsage });
    expect(r).toMatchObject({ ok: true, content: 'hello', model: 'gpt-4o-mini', servedModel: 'gpt-4o-mini', usage: { input: 100, output: 20 } });
    expect(r.costUsd).toBeCloseTo((100 * 0.00015 + 20 * 0.0006) / 1000, 8);
    expect(r.latencyMs).toEqual(expect.any(Number));
    expect(recordUsage).toHaveBeenCalledWith({ workspaceId: WS, operation: 'narrative_analysis', model: 'gpt-4o-mini', inputTokens: 100, outputTokens: 20 });
  });

  it('requires a workspace (no unattributed AI spend)', async () => {
    const r = await runAiTask({ task: 'narrative_analysis', user: 'x' });
    expect(r).toMatchObject({ ok: false, error: 'workspaceId is required' });
  });

  it('blocks the call when the workspace budget is exceeded', async () => {
    const openai = openaiReturning('never');
    const r = await runAiTask({ task: 'narrative_analysis', workspaceId: WS, user: 'x' }, { openai, checkBudget: async () => ({ allowed: false, reason: 'Monthly budget exceeded.' }) });
    expect(r).toMatchObject({ ok: false, error: 'budget_exceeded' });
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it('enforces the separate premium monthly cap', async () => {
    process.env.AI_MODEL_PREMIUM = 'gpt-4o'; // premium routed to a configured provider for this test
    const openai = openaiReturning('never');
    const r = await runAiTask({ task: 'reputation_investigation', workspaceId: WS, user: 'x' }, { openai, checkBudget: allow, premiumSpend: async () => ({ spend: 99, error: null }) });
    expect(r).toMatchObject({ ok: false, error: 'premium_budget_exceeded', tier: 'premium' });
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });

  it('fails closed when premium spend cannot be determined', async () => {
    process.env.AI_MODEL_PREMIUM = 'gpt-4o';
    const r = await runAiTask({ task: 'reputation_investigation', workspaceId: WS, user: 'x' }, { openai: openaiReturning('x'), checkBudget: allow, premiumSpend: async () => ({ spend: null, error: 'db down' }) });
    expect(r).toMatchObject({ ok: false, error: 'premium_budget_unknown' });
  });

  it('returns malformed structured output as an error, not as data', async () => {
    const r = await runAiTask({ task: 'routine_classification', workspaceId: WS, user: 'x', json: true }, { openai: openaiReturning('not json at all'), checkBudget: allow, recordUsage: async () => {} });
    expect(r).toMatchObject({ ok: false, error: 'malformed_output' });
    expect(r).not.toHaveProperty('data');
  });

  it('rejects JSON that fails the structural validator', async () => {
    const r = await runAiTask(
      { task: 'routine_classification', workspaceId: WS, user: 'x', json: true, validate: (o) => ['positive', 'negative', 'neutral'].includes(o.sentiment) },
      { openai: openaiReturning('{"sentiment":"ecstatic"}'), checkBudget: allow, recordUsage: async () => {} },
    );
    expect(r.error).toBe('malformed_output');
  });

  it('parses valid fenced JSON', async () => {
    const r = await runAiTask({ task: 'routine_classification', workspaceId: WS, user: 'x', json: true }, { openai: openaiReturning('```json\n{"sentiment":"neutral"}\n```'), checkBudget: allow, recordUsage: async () => {} });
    expect(r).toMatchObject({ ok: true, data: { sentiment: 'neutral' } });
  });

  it('reports provider errors without recording usage', async () => {
    const recordUsage = jest.fn();
    const openai = { chat: { completions: { create: jest.fn(async () => { throw new Error('503 upstream'); }) } } };
    const r = await runAiTask({ task: 'narrative_analysis', workspaceId: WS, user: 'x' }, { openai, checkBudget: allow, recordUsage });
    expect(r).toMatchObject({ ok: false, error: 'provider_error', detail: '503 upstream' });
    expect(recordUsage).not.toHaveBeenCalled();
  });
});

describe('premium spend', () => {
  it('sums only this month\'s premium-model usage for the workspace', async () => {
    const now = new Date().toISOString();
    db.table('token_usage').push(
      { workspace_id: WS, model: 'claude-opus-5-5', input_tokens: 1_000_000, output_tokens: 0, created_at: now },
      { workspace_id: WS, model: 'gpt-4o-mini', input_tokens: 1_000_000, output_tokens: 0, created_at: now },
      { workspace_id: 'other', model: 'claude-opus-5-5', input_tokens: 1_000_000, output_tokens: 0, created_at: now },
      { workspace_id: WS, model: 'claude-opus-5-5', input_tokens: 1_000_000, output_tokens: 0, created_at: '2000-01-01T00:00:00Z' },
    );
    const { spend } = await premiumSpendThisMonth(WS, 'claude-opus-5-5', db);
    expect(spend).toBeCloseTo(4);
  });
});
