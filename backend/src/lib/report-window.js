/**
 * Which records belong to a report period, and how fresh the data behind it is.
 *
 * A record belongs to the period it was PUBLISHED in. Collection time (captured_at) only stands in when the source
 * gave no publication date. Counting by collection time put a Sunday post that Narriv collected on Monday into the
 * next week's report, and left posts that arrived late out of a report that was already sent.
 *
 * Platforms deliver posts with a delay (news within the hour, some social collections hours later), so a report also
 * says when its data was last updated and how late each platform typically is.
 */
const iso = (v) => new Date(v).toISOString();

/**
 * Restrict a Supabase query on `signals` to records of the period: published in [start, end], or without a
 * publication date and collected in it. `endExclusive` uses < for the end (back-to-back windows).
 */
export function inReportWindow(query, start, end, { endExclusive = false } = {}) {
    const s = iso(start), e = iso(end);
    const lt = endExclusive ? "lt" : "lte";
    return query.or(`and(published_at.gte.${s},published_at.${lt}.${e}),and(published_at.is.null,captured_at.gte.${s},captured_at.${lt}.${e})`);
}

/** When a record happened: its publication time, else when it was collected. */
export const recordTime = (row) => row?.published_at || row?.publishedAt || row?.captured_at || row?.capturedAt || null;

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (xs, q) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const round1 = (n) => (n === null ? null : Math.round(n * 10) / 10);

/**
 * Typical delay between publication and collection per platform, from rows with both times. Only posts collected
 * within 7 days of publication count: an old article found by a new keyword is not a delivery delay.
 */
export function platformLatency(rows) {
    const by = new Map();
    for (const r of rows || []) {
        if (!r.published_at || !r.captured_at) continue;
        const hours = (new Date(r.captured_at).getTime() - new Date(r.published_at).getTime()) / 3600000;
        if (!Number.isFinite(hours) || hours < 0 || hours > 24 * 7) continue;
        const key = r.platform || "unknown";
        if (!by.has(key)) by.set(key, []);
        by.get(key).push(hours);
    }
    return [...by.entries()]
        .map(([platform, hours]) => ({ platform, medianHours: round1(median(hours)), p90Hours: round1(quantile(hours, 0.9)), sample: hours.length }))
        .filter((p) => p.sample >= 3)
        .sort((a, b) => b.sample - a.sample);
}

/**
 * Freshness of a report: when the workspace last received data, the typical delay per platform (last 14 days), and
 * how many records of the period arrived after `since` (when the report was created and sent).
 */
export async function reportFreshness(workspaceId, { start, end, since = null } = {}, db = null) {
    // Loaded here so the pure helpers above stay importable without database settings.
    db ??= (await import("./supabase.js")).baseSupabaseAdmin;
    const fortnight = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const [latest, recent, late] = await Promise.all([
        db.from("signals").select("captured_at").eq("workspace_id", workspaceId).order("captured_at", { ascending: false }).limit(1),
        db.from("signals").select("platform, published_at, captured_at").eq("workspace_id", workspaceId).gte("captured_at", fortnight).not("published_at", "is", null).limit(5000),
        since && start && end
            ? inReportWindow(db.from("signals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId), start, end).gt("captured_at", iso(since))
            : Promise.resolve({ count: null }),
    ]);
    return {
        dataAsOf: latest.data?.[0]?.captured_at || null,
        latency: latest.error || recent.error ? [] : platformLatency(recent.data),
        lateArrivals: late.error ? null : late.count ?? null,
        basis: "published_at",
    };
}
