import { jest } from '@jest/globals';
import { createFakeSupabase, supabaseModuleFor } from './helpers/fake-supabase.js';

// Isolated alert-engine tests: in-memory database, mocked AI enhancement and
// mocked notification dispatch (no real Slack/Teams/webhook calls are made).
let respond = () => ({ data: [], error: null });
const fake = createFakeSupabase((q) => respond(q));
const enhanceAlert = jest.fn(async () => ({ whyItMatters: null, whatToDo: null }));
const dispatchAlertToWebhooks = jest.fn(async () => ({ dispatched: 0, total: 0, results: [] }));

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(fake));
jest.unstable_mockModule('../src/modules/ai/ai.service.js', () => ({ enhanceAlert }));
jest.unstable_mockModule('../src/modules/integrations/webhook-dispatcher.service.js', () => ({ dispatchAlertToWebhooks }));
jest.unstable_mockModule('../src/modules/app-notifications/app-notifications.events.js', () => ({ globalEvents: { emit: jest.fn() } }));

const { detectAlerts, signalSentiment, notifyAndRecord, retryFailedNotifications } = await import('../src/modules/alerts/alerts.service.js');
const { assertPublicHttpUrl } = await import('../src/lib/url-safety.js');

const WS = '11111111-1111-1111-1111-111111111111';
const now = Date.now();
const sig = (id, sentiment, extra = {}) => ({
  id, workspace_id: WS, title: `t-${id}`, content: 'c', platform: 'news', sentiment: null, severity: null,
  topics: [], metadata: { keyword: 'Bank A' }, captured_at: new Date(now - 3600 * 1000).toISOString(),
  analyses: sentiment ? [{ confidence: 0.9, analysis: { sentiment } }] : [],
  ...extra,
});

function db({ signals = [], existingAlerts = [], dedupError = null } = {}) {
  return (q) => {
    if (q.table === 'signals') return { data: signals, error: null };
    if (q.table === 'alerts' && q.op === 'select') return dedupError ? { data: null, error: dedupError } : { data: existingAlerts, error: null };
    if (q.table === 'alerts' && q.op === 'insert') return { data: [{ id: 'alert-1', ...q.payload }], error: null };
    return { data: null, error: null };
  };
}
const inserts = () => fake.calls.filter((c) => c.table === 'alerts' && c.op === 'insert');

beforeEach(() => {
  fake.calls.length = 0;
  respond = () => ({ data: [], error: null });
  dispatchAlertToWebhooks.mockClear();
  enhanceAlert.mockClear();
});

describe('alert rule evaluation', () => {
  it('reads sentiment from the AI analysis jsonb before signals.sentiment', () => {
    expect(signalSentiment({ sentiment: 'POSITIVE', analyses: [{ analysis: { sentiment: 'negative' } }] })).toBe('NEGATIVE');
    expect(signalSentiment({ sentiment: 'NEUTRAL', analyses: [] })).toBe('NEUTRAL');
  });

  it('raises a workspace-scoped alert with evidence links for a qualifying negative spike', async () => {
    respond = db({ signals: [sig('s1', 'negative'), sig('s2', 'negative'), sig('s3', 'negative'), sig('s4', 'positive')] });
    const created = await detectAlerts(WS);
    expect(created).toHaveLength(1);
    const [{ payload }] = inserts();
    expect(payload).toMatchObject({ workspace_id: WS, type: 'risk', severity: 'critical', status: 'open', title: 'Negative Sentiment Spike: Bank A' });
    expect(payload.metadata.signal_ids).toEqual(['s1', 's2', 's3']);
    const signalQuery = fake.calls.find((c) => c.table === 'signals');
    expect(signalQuery.filters).toContainEqual({ name: 'eq', args: ['workspace_id', WS] });
  });

  it('does not alert on non-qualifying (all positive/neutral) signals', async () => {
    respond = db({ signals: [sig('s1', 'positive'), sig('s2', 'neutral'), sig('s3', 'positive')] });
    expect(await detectAlerts(WS)).toEqual([]);
    expect(inserts()).toHaveLength(0);
  });

  it('does not alert on a single signal', async () => {
    respond = db({ signals: [sig('s1', 'negative')] });
    expect(await detectAlerts(WS)).toEqual([]);
  });

  it('does not recreate an existing unresolved alert on repeated runs', async () => {
    respond = db({ signals: [sig('s1', 'negative'), sig('s2', 'negative')], existingAlerts: [{ id: 'open-1', status: 'open' }] });
    expect(await detectAlerts(WS)).toEqual([]);
    const dedup = fake.calls.find((c) => c.table === 'alerts' && c.op === 'select');
    expect(dedup.filters).toContainEqual({ name: 'neq', args: ['status', 'resolved'] });
    expect(dedup.filters).toContainEqual({ name: 'eq', args: ['workspace_id', WS] });
  });

  it('raises a new alert when the previous one for the topic was resolved', async () => {
    // Resolved alerts are excluded by the dedup query, so the engine sees none.
    respond = db({ signals: [sig('s1', 'negative'), sig('s2', 'negative')], existingAlerts: [] });
    expect(await detectAlerts(WS)).toHaveLength(1);
  });

  it('skips creation when the dedup lookup fails (no duplicate on DB errors)', async () => {
    respond = db({ signals: [sig('s1', 'negative'), sig('s2', 'negative')], dedupError: { message: 'timeout' } });
    expect(await detectAlerts(WS)).toEqual([]);
    expect(inserts()).toHaveLength(0);
  });
});

describe('alert notifications', () => {
  const alert = { id: 'alert-1', workspace_id: WS, metadata: { keyword: 'Bank A' } };

  it('records "no_active_integrations" instead of claiming delivery', async () => {
    const n = await notifyAndRecord(alert);
    expect(n).toMatchObject({ status: 'no_active_integrations', delivered: 0, attempts: 1 });
    const update = fake.calls.find((c) => c.table === 'alerts' && c.op === 'update');
    expect(update.payload.metadata).toMatchObject({ keyword: 'Bank A', notification: { status: 'no_active_integrations' } });
    expect(update.filters).toContainEqual({ name: 'eq', args: ['workspace_id', WS] });
  });

  it('records failed integrations so they can be retried', async () => {
    dispatchAlertToWebhooks.mockResolvedValueOnce({ dispatched: 0, total: 1, results: [{ integrationId: 'int-1', status: 'failed', error: '500' }] });
    const n = await notifyAndRecord(alert);
    expect(n).toMatchObject({ status: 'failed', failedIntegrationIds: ['int-1'] });
  });

  it('retries failed notifications with a bounded attempt count', async () => {
    respond = (q) => (q.table === 'alerts' && q.op === 'select'
      ? { data: [
        { ...alert, id: 'a-retry', metadata: { notification: { status: 'failed', attempts: 1 } } },
        { ...alert, id: 'a-exhausted', metadata: { notification: { status: 'failed', attempts: 3 } } },
      ], error: null }
      : { data: null, error: null });
    const r = await retryFailedNotifications(WS);
    expect(r).toEqual({ retried: 1 });
    expect(dispatchAlertToWebhooks).toHaveBeenCalledTimes(1);
    expect(dispatchAlertToWebhooks.mock.calls[0][0].id).toBe('a-retry');
  });
});

describe('webhook URL SSRF guard', () => {
  it('rejects internal targets for generic webhooks', async () => {
    await expect(assertPublicHttpUrl('http://10.0.0.1/hook')).rejects.toThrow('public host');
    await expect(assertPublicHttpUrl('http://localhost/hook', async () => [{ address: '127.0.0.1' }])).rejects.toThrow('public host');
  });
});
