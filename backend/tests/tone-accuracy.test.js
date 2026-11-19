import { toneAccuracy, wilson } from '../src/lib/tone-accuracy.js';

describe('tone accuracy', () => {
  it('measures the share right with n, interval and missed negatives', () => {
    const r = [
      ...Array.from({ length: 40 }, () => ({ ai: 'negative', human: 'negative' })),
      ...Array.from({ length: 8 }, () => ({ ai: 'neutral', human: 'neutral' })),
      { ai: 'neutral', human: 'negative' }, { ai: 'positive', human: 'neutral' },
    ];
    const a = toneAccuracy(r);
    expect(a).toMatchObject({ n: 50, accuracy: 96, missedNegative: 1, enough: true });
    expect(a.byTone.negative).toEqual({ n: 40, accuracy: 100 });
    expect(a.interval.low).toBeLessThan(96);
    expect(wilson(0, 0)).toBeNull();
  });
});
