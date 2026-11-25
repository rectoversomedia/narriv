import { aiCallLimit, assertWorkspaceQuota, forgetAiQuota, runWithAiWorkspace, currentAiWorkspace } from '../src/lib/ai-quota.js';

// AI calls per workspace per month follow the plan; past it, AI stops for that workspace only.
const fakeDb = (used, settings) => ({
  from: (t) => ({
    select: () => ({ eq: () => (t === 'token_usage' ? { gte: async () => ({ count: used }) } : { maybeSingle: async () => ({ data: { settings } }) }) }),
  }),
});

describe('AI quota per workspace', () => {
  test('limits by plan, with an override', () => {
    expect(aiCallLimit({ plan: 'starter' })).toBe(1000);
    expect(aiCallLimit({ plan: 'decision' })).toBe(15000);
    expect(aiCallLimit({})).toBe(40000);
    expect(aiCallLimit({ plan: 'pilot', aiCallLimit: 2500 })).toBe(2500);
  });

  test('refuses once the month is used; no workspace in context means no check', async () => {
    forgetAiQuota('w1'); forgetAiQuota('w2');
    await expect(assertWorkspaceQuota({ workspaceId: 'w1', db: fakeDb(1000, { plan: 'starter' }) })).rejects.toMatchObject({ code: 'AI_WORKSPACE_QUOTA' });
    await expect(assertWorkspaceQuota({ workspaceId: 'w2', db: fakeDb(10, { plan: 'starter' }) })).resolves.toBeUndefined();
    await expect(assertWorkspaceQuota({ workspaceId: null })).resolves.toBeUndefined();
  });

  test('the workspace travels with the call', async () => {
    await runWithAiWorkspace('w9', async () => { expect(currentAiWorkspace()).toBe('w9'); });
  });
});
