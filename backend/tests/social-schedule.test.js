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
  test('one round a day at 08:00 WIB, three during a crisis', () => {
    expect(roundsDue(at(0), false)).toBe(0);
    expect(roundsDue(at(1), false)).toBe(1);
    expect(roundsDue(at(20), false)).toBe(1);
    expect(roundsDue(at(6), true)).toBe(2);
    expect(roundsDue(at(10), true)).toBe(3);
  });

  test('starts every platform once when the day round is due', () => {
    const plan = planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 0, totalSpendUsd: 0 });
    expect(plan.start).toEqual(SOCIAL_PRESETS);
  });

  test('does not repeat a platform that already ran today', () => {
    const plan = planWorkspace({ now: at(3), crisis: false, todayScheduledRuns: [run('twitter-x-latest'), run('tiktok-hashtag')], monthSpendUsd: 0, totalSpendUsd: 0 });
    expect(plan.start).toEqual(['instagram-posts']);
  });

  test('stops at the workspace cap and at the global cap', () => {
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 25, totalSpendUsd: 25, capUsd: 25 }).reason).toBe('cap_reached');
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 1, totalSpendUsd: 75 }).reason).toBe('cap_reached');
    // Room for only one more run: only one platform starts.
    expect(planWorkspace({ now: at(1), crisis: false, todayScheduledRuns: [], monthSpendUsd: 9.7, totalSpendUsd: 9.7, capUsd: 10 }).start).toHaveLength(1);
  });

  test('a run without a bill counts at its full cap; a run that never started costs nothing', () => {
    expect(runSpend({ status: 'running', metadata: { maxTotalChargeUsd: 0.25 } })).toBe(0.25);
    expect(runSpend({ status: 'completed', metadata: { costUsd: 0.07 } })).toBe(0.07);
    expect(runSpend({ status: 'failed', metadata: {} })).toBe(0);
  });

  test('workspace config: off by default, platforms and cap are respected', () => {
    expect(socialConfig({}).enabled).toBe(false);
    const cfg = socialConfig({ socialAuto: true, socialConfig: { platforms: ['x', 'bogus'], monthlyCapUsd: 10, crisisMode: false } });
    expect(cfg).toMatchObject({ enabled: true, platforms: ['x'], presets: ['twitter-x-latest'], monthlyCapUsd: 10, crisisMode: false });
    expect(socialConfig({ socialAuto: true, socialConfig: { monthlyCapUsd: 999 } }).monthlyCapUsd).toBe(75);
  });
});
