import { buildSentimentTrend, sentimentTrendStart } from '../src/lib/sentiment-trend.js';

// Per-day sentiment: real stored values only; unanalyzed kept separate; every
// day in the window present so empty days are explicit, not invented.
const NOW = Date.parse('2026-10-12T15:00:00Z');

describe('buildSentimentTrend', () => {
  it('counts stored sentiment per UTC day and keeps unanalyzed separate', () => {
    const t = buildSentimentTrend([
      { sentiment: 'POSITIVE', captured_at: '2026-10-12T01:00:00Z' },
      { sentiment: 'negative', captured_at: '2026-10-12T09:00:00Z' },
      { sentiment: null, captured_at: '2026-10-12T10:00:00Z' },
      { sentiment: 'NEUTRAL', captured_at: '2026-10-10T23:59:00Z' },
      { sentiment: 'POSITIVE', captured_at: '2026-10-01T00:00:00Z' }, // outside the window
    ], NOW);
    expect(t).toHaveLength(7);
    expect(t[0].date).toBe('2026-10-06');
    expect(t[6]).toEqual({ date: '2026-10-12', positive: 1, neutral: 0, negative: 1, mixed: 0, unanalyzed: 1, total: 3 });
    expect(t.find((d) => d.date === '2026-10-10')).toMatchObject({ neutral: 1, total: 1 });
    expect(t.find((d) => d.date === '2026-10-11')).toMatchObject({ total: 0 });
  });

  it('starts the query window at UTC midnight six days back', () => {
    expect(sentimentTrendStart(NOW)).toBe('2026-10-06T00:00:00.000Z');
  });
});
