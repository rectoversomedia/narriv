/**
 * Trend / Momentum Engine (DETERMINISTIC)
 *
 * Computes direction, velocity, acceleration, and anomaly signals for
 * Narriv metrics WITHOUT any AI calls. All formulas are explainable
 * arithmetic so the UI can show "why" a number is what it is.
 *
 * Status semantics:
 *   EMERGING    - new activity, low prior baseline
 *   ACCELERATING - growth rate is rising
 *   STABLE      - within +/-20% of prior window
 *   DECLINING   - falling
 *   SPIKING     - >3x prior window
 */

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function classify(current, prior) {
    if (current <= 0) return "STABLE";
    if (prior <= 0) return current > 0 ? "EMERGING" : "STABLE";
    const ratio = current / prior;
    if (ratio >= 3) return "SPIKING";
    if (ratio >= 1.5) return "ACCELERATING";
    if (ratio >= 0.8) return "STABLE";
    if (ratio >= 0.3) return "DECLINING";
    return "DECLINING";
}

function acceleration(current, prior, baseline) {
    if (baseline <= 0) return null;
    const firstDelta = prior - baseline;
    const secondDelta = current - prior;
    if (firstDelta === 0) return 0;
    return Number(((secondDelta - firstDelta) / Math.abs(firstDelta)).toFixed(3));
}

/**
 * Compute trend metrics for a single time series of (window, count) tuples.
 * Returns { status, ratio, acceleration, deltas[] }.
 */
export function computeTrend(series) {
    if (!Array.isArray(series) || series.length < 2) {
        return {
            status: "STABLE",
            ratio: 1,
            acceleration: null,
            deltas: [],
            note: "insufficient data for trend",
        };
    }
    const counts = series.map((s) => safeNumber(s.count, 0));
    const current = counts[counts.length - 1];
    const prior = counts[counts.length - 2];
    const baseline = counts[0];
    return {
        status: classify(current, prior),
        ratio: prior > 0 ? Number((current / prior).toFixed(3)) : null,
        acceleration: acceleration(current, prior, baseline),
        deltas: counts.slice(1).map((c, i) => c - counts[i]),
    };
}

/**
 * Build a series of (label, count) from rows that have a capturedAt or
 * createdAt field. The caller passes the rows, the bucketing function
 * (e.g. by hour or day), and a window size.
 */
export function bucketByTime(rows, { bucketMs, sinceMs, accessor = (r) => r.captured_at || r.created_at }) {
    const out = new Map();
    const startBucket = Math.floor(sinceMs / bucketMs);
    const endBucket = Math.floor(Date.now() / bucketMs);
    for (let b = startBucket; b <= endBucket; b++) out.set(b, 0);
    for (const r of rows || []) {
        const ts = accessor(r);
        if (!ts) continue;
        const t = new Date(ts).getTime();
        const b = Math.floor(t / bucketMs);
        if (out.has(b)) out.set(b, out.get(b) + 1);
    }
    return Array.from(out.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([bucket, count]) => ({ t: bucket, count }));
}

/**
 * Compute sentiment velocity: how fast the negative share is changing.
 * Returns { negShare, negShareDelta, velocity }.
 */
export function sentimentVelocity(sentimentCountsPrev, sentimentCountsCurr) {
    const totalPrev = Object.values(sentimentCountsPrev || {}).reduce((a, b) => a + b, 0) || 1;
    const totalCurr = Object.values(sentimentCountsCurr || {}).reduce((a, b) => a + b, 0) || 1;
    const negPrev = safeNumber(sentimentCountsPrev?.NEGATIVE, 0) / totalPrev;
    const negCurr = safeNumber(sentimentCountsCurr?.NEGATIVE, 0) / totalCurr;
    return {
        negSharePrev: Number(negPrev.toFixed(3)),
        negShareCurr: Number(negCurr.toFixed(3)),
        negShareDelta: Number((negCurr - negPrev).toFixed(3)),
        velocity: Number((negCurr - negPrev).toFixed(3)),
    };
}
