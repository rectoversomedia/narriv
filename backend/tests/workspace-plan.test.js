import { newTrialSettings, trialExpired, planStatus, monitoringStopped, TRIAL_DAYS } from '../src/lib/workspace-plan.js';

const NOW = Date.parse('2026-11-06T00:00:00Z');
const DAY = 86400000;

describe('workspace plan and trial', () => {
  it('starts a new workspace on a 14-day trial', () => {
    const s = newTrialSettings(NOW);
    expect(s.plan).toBe('trial');
    expect(Date.parse(s.trialEndsAt) - NOW).toBe(TRIAL_DAYS * DAY);
  });

  it('stops monitoring only when a trial has run out or the owner paused it', () => {
    expect(trialExpired({ plan: 'trial', trialEndsAt: new Date(NOW - 1).toISOString() }, NOW)).toBe(true);
    expect(trialExpired({ plan: 'trial', trialEndsAt: new Date(NOW + DAY).toISOString() }, NOW)).toBe(false);
    // A paid plan, or a workspace from before plans existed, is never stopped by the trial rule.
    expect(trialExpired({ plan: 'pilot', trialEndsAt: new Date(NOW - DAY).toISOString() }, NOW)).toBe(false);
    expect(trialExpired({}, NOW)).toBe(false);
    expect(monitoringStopped({ monitoringPaused: true }, NOW)).toBe(true);
    expect(monitoringStopped({ plan: 'decision' }, NOW)).toBe(false);
  });

  it('reports whole days left, rounded up and never negative', () => {
    expect(planStatus({ plan: 'trial', trialEndsAt: new Date(NOW + 2.2 * DAY).toISOString() }, NOW)).toMatchObject({ plan: 'trial', trialDaysLeft: 3, trialExpired: false });
    expect(planStatus({ plan: 'trial', trialEndsAt: new Date(NOW - DAY).toISOString() }, NOW)).toMatchObject({ trialDaysLeft: 0, trialExpired: true });
    expect(planStatus({ plan: 'intelligence' }, NOW)).toMatchObject({ plan: 'intelligence', trialEndsAt: null, trialDaysLeft: null });
    expect(planStatus({ plan: 'nonsense' }, NOW).plan).toBe(null);
  });
});
