import { createChatClient, providerOrder, toClaudeRequest, isProviderSideFailure } from '../src/lib/chat-client.js';

const okClaude = async () => ({ content: '```json\n{"a":1}\n```', model: 'claude-haiku-5-5', usage: { input_tokens: 10, output_tokens: 5 }, stopReason: 'end_turn', refusal: null });
const failingOpenAI = (status, message) => ({ chat: { completions: { create: async () => { throw Object.assign(new Error(message), { status }); } } } });

describe('chat client', () => {
  it('stops at the monthly call cap without calling any provider', async () => {
    let called = false;
    const client = createChatClient({ monthlyCallsUsed: async () => 3000, order: ['anthropic'], claude: async () => { called = true; return okClaude(); } });
    await expect(client.chat.completions.create({ messages: [{ role: 'user', content: 'u' }] })).rejects.toThrow('Monthly AI limit');
    expect(called).toBe(false);
  });

  it('falls back to Claude when OpenAI has no credits, in OpenAI response shape', async () => {
    const client = createChatClient({ monthlyCallsUsed: async () => 0, order: ['openai', 'anthropic'], openai: failingOpenAI(429, 'You have no credits remaining'), claude: okClaude });
    const res = await client.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], response_format: { type: 'json_object' } });
    expect(res.provider).toBe('anthropic');
    expect(JSON.parse(res.choices[0].message.content)).toEqual({ a: 1 });
    expect(res.usage.total_tokens).toBe(15);
  });

  it('does not hide a bad request behind the other provider', async () => {
    const client = createChatClient({ monthlyCallsUsed: async () => 0, order: ['openai', 'anthropic'], openai: failingOpenAI(400, 'invalid'), claude: okClaude });
    await expect(client.chat.completions.create({ messages: [{ role: 'user', content: 'u' }] })).rejects.toThrow('invalid');
  });

  it('uses Claude first when chosen, and only configured providers', () => {
    expect(providerOrder({ AI_PRIMARY_PROVIDER: 'anthropic' }, { openai: true, anthropic: true })).toEqual(['anthropic', 'openai']);
    expect(providerOrder({}, { openai: false, anthropic: true })).toEqual(['anthropic']);
  });

  it('maps messages and JSON mode to a Claude request', () => {
    const req = toClaudeRequest({ messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }], response_format: { type: 'json_object' }, max_tokens: 300 });
    expect(req.user).toBe('U');
    expect(req.system).toMatch(/^S/);
    expect(req.system).toMatch(/JSON/);
    expect(req.maxTokens).toBe(4096); // room for thinking before a short JSON answer
    expect(isProviderSideFailure({ status: 503 })).toBe(true);
    expect(isProviderSideFailure({ status: 400 })).toBe(false);
  });
});
