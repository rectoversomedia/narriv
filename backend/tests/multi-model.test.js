import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Multi-model routing: profiles, task tiers, provider fallbacks, Opus budget
// cap, metering with the serving model, provider failures. Fake clients only.
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const { runAiTask, runAiTier, resolveTaskRoute, resolveTierRoute } = await import('../src/lib/ai-gateway.js');
const { activeProfile } = await import('../src/lib/ai-routing.js');

const WS = '11111111-1111-1111-1111-111111111111';
const allow = async () => ({ allowed: true });
const claudeReturning = (text) => ({
  messages: { create: jest.fn(async (req) => ({ model: req.model, stop_reason: 'end_turn', usage: { input_tokens: 200, output_tokens: 50 }, content: [{ type: 'text', text }] })) },
  beta: { messages: { create: jest.fn(async (req) => ({ model: req.model, stop_reason: 'end_turn', usage: { input_tokens: 200, output_tokens: 50 }, content: [{ type: 'text', text }] })) } },
});
const openaiReturning = (content) => ({ chat: { completions: { create: jest.fn(async () => ({ model: 'gpt-4o-mini', usage: { prompt_tokens: 10, completion_tokens: 5 }, choices: [{ message: { content } }] })) } } });
const ENV_KEYS = ['AI_ROUTING_PROFILE', 'ANTHROPIC_API_KEY', 'AI_MODEL_PREMIUM', 'AI_MODEL_SIMPLE', 'AI_MODEL_BALANCED', 'AI_MODEL_COMPLEX', 'AI_PROVIDER_PREMIUM'];

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
});

describe('default (openai) profile keeps production behavior', () => {
  it('routes every task to gpt-4o-mini and strategic tasks fall back from premium', () => {
    expect(activeProfile()).toBe('openai');
    for (const task of ['routine_classification', 'narrative_analysis', 'ask_narriv', 'executive_synthesis', 'executive_briefing', 'reputation_investigation']) {
      expect(resolveTaskRoute(task).route).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' });
    }
    expect(resolveTaskRoute('executive_synthesis').fallbackReason).toMatch(/AI_MODEL_PREMIUM unset/);
  });
});

describe('claude profile', () => {
  beforeEach(() => { process.env.AI_ROUTING_PROFILE = 'claude'; process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'; });

  it('maps Haiku to routine work, Sonnet to contextual analysis and Opus to strategic synthesis', () => {
    expect(resolveTaskRoute('routine_classification').route).toMatchObject({ provider: 'anthropic', model: 'claude-haiku-5-5' });
    expect(resolveTaskRoute('narrative_analysis').route).toMatchObject({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    expect(resolveTaskRoute('ask_narriv').route).toMatchObject({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    expect(resolveTaskRoute('executive_synthesis').route).toMatchObject({ provider: 'anthropic', model: 'claude-opus-5-5' });
  });

  it('falls back to the economical OpenAI model per tier when Anthropic is not configured, and says why', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = resolveTaskRoute('routine_classification');
    expect(r.route).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' });
    expect(r.fallbackReason).toMatch(/anthropic not configured/);
    expect(resolveTaskRoute('executive_synthesis').route.model).toBe('gpt-4o-mini');
  });

  it('lets a per-tier env override win over the profile', () => {
    process.env.AI_MODEL_SIMPLE = 'gpt-4o-mini';
    expect(resolveTierRoute('simple').route).toMatchObject({ provider: 'openai', model: 'gpt-4o-mini' });
  });

  it('runs on the routed Claude model and meters tokens and cost against it', async () => {
    const claude = claudeReturning('ok');
    const recordUsage = jest.fn(async () => {});
    const r = await runAiTask({ task: 'routine_classification', workspaceId: WS, user: 'x' }, { claude, checkBudget: allow, recordUsage });
    expect(r).toMatchObject({ ok: true, content: 'ok', model: 'claude-haiku-5-5', servedModel: 'claude-haiku-5-5', usage: { input: 200, output: 50 } });
    expect(r.costUsd).toBeCloseTo((200 * 0.0001 + 50 * 0.0005) / 1000, 9);
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WS, model: 'claude-haiku-5-5', inputTokens: 200, outputTokens: 50 }));
  });

  it('asks Claude for bare JSON on structured tasks and parses it', async () => {
    const claude = claudeReturning('```json\n{"sentiment":"neutral"}\n```');
    const r = await runAiTask({ task: 'narrative_analysis', workspaceId: WS, user: 'x', system: 'Classify.', json: true }, { claude, checkBudget: allow, recordUsage: async () => {} });
    expect(r).toMatchObject({ ok: true, data: { sentiment: 'neutral' }, model: 'claude-sonnet-5-5' });
    const req = claude.beta.messages.create.mock.calls[0]?.[0] || claude.messages.create.mock.calls[0][0];
    expect(req.system).toMatch(/single JSON object only/);
  });

  it('enforces the premium monthly cap on Opus before calling the provider', async () => {
    const claude = claudeReturning('never');
    const r = await runAiTask({ task: 'executive_synthesis', workspaceId: WS, user: 'x' }, { claude, checkBudget: allow, premiumSpend: async () => ({ spend: 999, error: null }) });
    expect(r).toMatchObject({ ok: false, error: 'premium_budget_exceeded', model: 'claude-opus-5-5' });
    expect(claude.messages.create).not.toHaveBeenCalled();
    expect(claude.beta.messages.create).not.toHaveBeenCalled();
  });

  it('blocks all tiers when the workspace budget is exhausted', async () => {
    const claude = claudeReturning('never');
    const r = await runAiTier({ tier: 'simple', workspaceId: WS, user: 'x' }, { claude, checkBudget: async () => ({ allowed: false, reason: 'cap' }) });
    expect(r).toMatchObject({ ok: false, error: 'budget_exceeded' });
    expect(claude.messages.create).not.toHaveBeenCalled();
  });

  it('reports a Claude provider failure without recording usage', async () => {
    const recordUsage = jest.fn();
    const failing = { messages: { create: jest.fn(async () => { throw new Error('529 overloaded'); }) }, beta: { messages: { create: jest.fn(async () => { throw new Error('529 overloaded'); }) } } };
    const r = await runAiTier({ tier: 'balanced', workspaceId: WS, user: 'x' }, { claude: failing, checkBudget: allow, recordUsage });
    expect(r).toMatchObject({ ok: false, error: 'provider_error', model: 'claude-sonnet-5-5' });
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it('caps requested max tokens to the tier limit', async () => {
    const claude = claudeReturning('ok');
    await runAiTier({ tier: 'simple', workspaceId: WS, user: 'x', maxTokens: 999999 }, { claude, checkBudget: allow, recordUsage: async () => {} });
    const req = claude.messages.create.mock.calls[0]?.[0] || claude.beta.messages.create.mock.calls[0][0];
    expect(req.max_tokens).toBe(1024);
  });
});

describe('workspace attribution', () => {
  it('requires a workspace for tier calls', async () => {
    expect(await runAiTier({ tier: 'simple', user: 'x' })).toMatchObject({ ok: false, error: 'workspaceId is required' });
  });

  it('keeps OpenAI tiers working under the default profile', async () => {
    const r = await runAiTier({ tier: 'complex', workspaceId: WS, user: 'x' }, { openai: openaiReturning('hi'), checkBudget: allow, recordUsage: async () => {} });
    expect(r).toMatchObject({ ok: true, content: 'hi', model: 'gpt-4o-mini' });
  });
});
