/**
 * Daily sentiment counts for the last N UTC days from stored signal sentiment.
 * Unanalyzed signals are counted separately (never folded into neutral), and
 * every day in the window is present so a day without signals is explicit
 * (total: 0) rather than silently missing.
 */
export function buildSentimentTrend(rows, now = Date.now(), days = 7) {
    const end = new Date(now);
    end.setUTCHours(0, 0, 0, 0);
    const buckets = new Map();
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
        buckets.set(d, { date: d, positive: 0, neutral: 0, negative: 0, mixed: 0, unanalyzed: 0, total: 0 });
    }
    for (const row of rows || []) {
        if (!row?.captured_at) continue;
        const bucket = buckets.get(new Date(row.captured_at).toISOString().slice(0, 10));
        if (!bucket) continue;
        const s = String(row.sentiment || "").toLowerCase();
        const key = ["positive", "neutral", "negative", "mixed"].includes(s) ? s : "unanalyzed";
        bucket[key] += 1;
        bucket.total += 1;
    }
    return [...buckets.values()];
}

/** ISO start of the first day in the window (UTC midnight, days-1 days ago). */
export function sentimentTrendStart(now = Date.now(), days = 7) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    return new Date(d.getTime() - (days - 1) * 86400000).toISOString();
}
