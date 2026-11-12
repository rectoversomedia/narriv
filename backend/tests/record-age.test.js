// A news search for a new keyword returns years-old articles too; only recent records are kept.
import { isStaleRecord, maxRecordAgeDays } from '../src/lib/record-age.js';

const DAY = 24 * 3600 * 1000;
const now = Date.parse('2026-11-12T09:00:00Z');

describe('record age limit', () => {
  test('defaults to 30 days and can be overridden', () => {
    const saved = process.env.MAX_RECORD_AGE_DAYS;
    delete process.env.MAX_RECORD_AGE_DAYS;
    expect(maxRecordAgeDays()).toBe(30);
    process.env.MAX_RECORD_AGE_DAYS = '7';
    expect(maxRecordAgeDays()).toBe(7);
    process.env.MAX_RECORD_AGE_DAYS = saved;
  });

  test('keeps recent records and drops old ones', () => {
    expect(isStaleRecord(new Date(now - 2 * DAY).toISOString(), now, 30)).toBe(false);
    expect(isStaleRecord(new Date(now - 29 * DAY).toISOString(), now, 30)).toBe(false);
    expect(isStaleRecord(new Date(now - 31 * DAY).toISOString(), now, 30)).toBe(true);
    expect(isStaleRecord('2020-04-07T07:00:00Z', now, 30)).toBe(true);
  });

  test('keeps records whose date is unknown or unreadable', () => {
    expect(isStaleRecord(null, now, 30)).toBe(false);
    expect(isStaleRecord(undefined, now, 30)).toBe(false);
    expect(isStaleRecord('not a date', now, 30)).toBe(false);
  });
});
