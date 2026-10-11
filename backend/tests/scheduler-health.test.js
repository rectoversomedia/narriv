import { schedulerHealth, ingestTrigger } from '../src/lib/scheduler-health.js';

// Scheduler observability: scheduled vs manual runs and missed slots are
// derived only from logged runs; nothing is assumed to have run.
const NOW = Date.parse('2026-10-11T13:30:00Z');
const run = (at, trigger, status = 'completed') => ({ created_at: at, status, metadata: { trigger, durationMs: 9000, keywords: 17 } });

describe('ingestTrigger', () => {
  it('trusts the Vercel scheduler user agent, not the slot parameter', () => {
    expect(ingestTrigger({ userAgent: 'vercel-cron/1.0', slot: '6' })).toBe('vercel-cron:6');
    expect(ingestTrigger({ userAgent: 'curl/8.0', slot: '6' })).toBe('manual:6');
    expect(ingestTrigger({ userAgent: undefined, slot: null })).toBe('manual');
  });
});

describe('schedulerHealth', () => {
  it('reports no missed slots when every elapsed slot has a scheduler run in its window', () => {
    const h = schedulerHealth([
      run('2026-10-11T12:40:00Z', 'vercel-cron:12'),
      run('2026-10-11T06:49:00Z', 'vercel-cron:6'),
      run('2026-10-11T00:05:00Z', 'vercel-cron:0'),
      run('2026-10-10T18:20:00Z', 'vercel-cron:18'),
    ], NOW);
    expect(h.missedSlotsLast24h).toEqual([]);
    expect(h.expectedSlotsLast24h).toBe(4);
    expect(h.lastScheduledRunAt).toBe('2026-10-11T12:40:00Z');
  });

  it('flags a slot with only a manual run as missed, and keeps scheduled and manual runs apart', () => {
    const h = schedulerHealth([
      run('2026-10-11T12:10:00Z', 'manual:12'),
      run('2026-10-11T06:49:00Z', 'vercel-cron:6'),
    ], NOW);
    expect(h.missedSlotsLast24h).toEqual(expect.arrayContaining(['2026-10-11T12:00:00.000Z', '2026-10-11T00:00:00.000Z', '2026-10-10T18:00:00.000Z']));
    expect(h.missedSlotsLast24h).not.toContain('2026-10-11T06:00:00.000Z');
    expect(h.lastManualRunAt).toBe('2026-10-11T12:10:00Z');
    expect(h.lastScheduledRunAt).toBe('2026-10-11T06:49:00Z');
  });

  it('does not count a slot as missed while its grace window is still open', () => {
    const h = schedulerHealth([], Date.parse('2026-10-11T12:30:00Z'));
    expect(h.missedSlotsLast24h).not.toContain('2026-10-11T12:00:00.000Z');
  });

  it('reports nothing as run when there are no logs', () => {
    const h = schedulerHealth([], NOW);
    expect(h.lastScheduledRunAt).toBeNull();
    expect(h.missedSlotsLast24h).toHaveLength(h.expectedSlotsLast24h);
  });
});
