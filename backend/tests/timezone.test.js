import { normalizeTimezone } from '../src/lib/timezone.js';

describe('normalizeTimezone', () => {
  it('accepts IANA ids and strips display labels', () => {
    expect(normalizeTimezone('Asia/Jakarta')).toBe('Asia/Jakarta');
    expect(normalizeTimezone('Asia/Jakarta (GMT+7)')).toBe('Asia/Jakarta');
    expect(normalizeTimezone('UTC (GMT+0)')).toBe('UTC');
  });

  it('rejects unknown or empty values', () => {
    expect(normalizeTimezone('Mars/Olympus')).toBeNull();
    expect(normalizeTimezone('')).toBeNull();
    expect(normalizeTimezone(null)).toBeNull();
  });
});
