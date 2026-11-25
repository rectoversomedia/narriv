import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const { planWorkspace, roundsDue, runSpend, socialConfig, SOCIAL_PRESETS } = await import('../src/modules/ingestion/social-schedule.service.js');

const at = (h) => Date.UTC(2026, 10, 4, h, 30);
const run = (preset, extra = {}) => ({ status: 'completed', metadata: { preset, scheduled: true, ...extra } });

describe('social schedule', () => {
  test('one daily round (08:00 WIB), every hour during a crisis', () => {
    expect(roundsDue(at(0), false)).toBe(0);
    expect(roundsDue(at(1), false)).toBe(1);
    expect(roundsDue(at(20), false)).toBe(1);
    expect(roundsDue(at(10), true)).toBe(11);
  });

  test('starts every platform once when the day round is due, and not again the same day', () => {
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 0, totalSpendUsd: 0 }).start).toEqual(SOCIAL_PRESETS);
    expect(planWorkspace({ now: at(6), crisis: false, todayScheduledRuns: SOCIAL_PRESETS.map((p) => run(p)), monthSpendUsd: 0, totalSpendUsd: 0 }).start).toEqual([]);
  });

  test('a crisis adds hourly rounds only from runs beyond what the daily rounds still need this month', () => {
    const done = SOCIAL_PRESETS.map((p) => run(p));
    // 4 Nov: 26 days left x 3 platforms = 78 runs kept for the daily rounds.
    expect(planWorkspace({ now: at(6), crisis: true, todayScheduledRuns: done, monthSpendUsd: 0, totalSpendUsd: 0, quota: 400, runsUsed: 20 }).start).toHaveLength(3);
    expect(planWorkspace({ now: at(6), crisis: true, todayScheduledRuns: done, monthSpendUsd: 0, totalSpendUsd: 0, quota: 90, runsUsed: 20 }).start).toEqual([]);
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 0, totalSpendUsd: 0, quota: 90, runsUsed: 90 }).reason).toBe('quota_reached');
  });

  test('stops at the workspace cap and at the global cap', () => {
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 25, totalSpendUsd: 25, capUsd: 25 }).reason).toBe('cap_reached');
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 1, totalSpendUsd: 2000 }).reason).toBe('cap_reached');
    // Room for only one more run: only one platform starts.
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 9.7, totalSpendUsd: 9.7, capUsd: 10 }).start).toHaveLength(1);
  });

  test('a run without a bill counts at its full cap; a run that never started costs nothing', () => {
    expect(runSpend({ status: 'running', metadata: { maxTotalChargeUsd: 0.25 } })).toBe(0.25);
    expect(runSpend({ status: 'completed', metadata: { costUsd: 0.07 } })).toBe(0.07);
    expect(runSpend({ status: 'failed', metadata: {} })).toBe(0);
  });

  test('workspace config follows the plan; below Intelligence only with the add-on', () => {
    expect(socialConfig({}).enabled).toBe(false);
    expect(socialConfig({ plan: 'pilot' }).enabled).toBe(false);
    expect(socialConfig({ plan: 'trial' }).enabled).toBe(false);
    expect(socialConfig({ plan: 'pilot', socialAuto: true })).toMatchObject({ enabled: true, tier: 'lite', platforms: ['x', 'tiktok'], monthlyRuns: 90 });
    expect(socialConfig({ plan: 'intelligence' })).toMatchObject({ enabled: true, platforms: ['x', 'tiktok', 'instagram'], monthlyRuns: 180 });
    expect(socialConfig({ plan: 'command' }).platforms).toHaveLength(6);
    expect(socialConfig({ plan: 'decision', socialPaused: true }).enabled).toBe(false);
    const month = new Date(Date.UTC(2026, 10, 4)).toISOString().slice(0, 7);
    expect(socialConfig({ plan: 'decision', socialExtra: { month, runs: 100 } }, Date.UTC(2026, 10, 4)).monthlyRuns).toBe(500);
    expect(socialConfig({ socialAuto: true, socialConfig: { platforms: ['x', 'bogus'], monthlyCapUsd: 9999 } })).toMatchObject({ platforms: ['x'], monthlyCapUsd: 2000 });
  });
});
