// Only recent records are kept: a news search for a new keyword also returns years-old articles, which would otherwise
// be analyzed as if they were today's conversation and raise alerts about events long past. Records without a
// publication date are kept (the date is unknown, not old). MAX_RECORD_AGE_DAYS overrides the 30-day default.
export const DEFAULT_MAX_RECORD_AGE_DAYS = 30;

export function maxRecordAgeDays() {
  const days = Number(process.env.MAX_RECORD_AGE_DAYS);
  return Number.isFinite(days) && days >= 1 ? days : DEFAULT_MAX_RECORD_AGE_DAYS;
}

/** True when the record was published more than `days` ago. */
export function isStaleRecord(publishedAt, now = Date.now(), days = maxRecordAgeDays()) {
  if (!publishedAt) return false;
  const t = new Date(publishedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t > days * 24 * 3600 * 1000;
}
