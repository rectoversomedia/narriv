/**
 * Precedents: earlier narratives in the same workspace that resemble this one, with how they unfolded (how many
 * hours from first record to peak, how long they stayed active, how negative they were) and what the team did
 * (action plans linked to them). From those, an expectation for the current narrative: "similar issues peaked about
 * N hours after they began".
 *
 * Only the workspace's own history is used. Resemblance is word overlap of titles, descriptions and keywords, so a
 * precedent is a pointer for a person to judge, and the response says how many precedents the numbers rest on.
 */
import { recordTime } from "./report-window.js";
import { topicTokens } from "./narrative-spread.js";

const BUCKET_H = 6;
const MIN_SIMILARITY = 0.12;
const MIN_RECORDS = 3;

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const clusterTokens = (c) => topicTokens([c.title, c.description, c.main_narrative, ...(c.keywords || [])].filter(Boolean).join(" "));

function overlap(a, b) {
    if (!a.size || !b.size) return { score: 0, shared: [] };
    const shared = [...a].filter((w) => b.has(w));
    return { score: shared.length / (a.size + b.size - shared.length), shared };
}

/** How one narrative unfolded, from its records' times and sentiment. */
export function lifecycle(signals) {
    const times = (signals || []).map((s) => new Date(recordTime(s)).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
    if (times.length < MIN_RECORDS) return null;
    const start = times[0];
    const buckets = new Map();
    for (const t of times) {
        const k = Math.floor((t - start) / (BUCKET_H * 3600000));
        buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    let peakIdx = 0, peak = 0;
    for (const [k, n] of buckets) if (n > peak || (n === peak && k < peakIdx)) { peak = n; peakIdx = k; }
    const sentiments = (signals || []).map((s) => String(s.sentiment || "").toLowerCase()).filter((v) => ["positive", "negative", "neutral", "mixed"].includes(v));
    return {
        records: times.length,
        firstAt: new Date(start).toISOString(),
        lastAt: new Date(times[times.length - 1]).toISOString(),
        hoursToPeak: peakIdx * BUCKET_H,
        peakRecords: peak,
        activeHours: Math.round((times[times.length - 1] - start) / 3600000),
        negativeShare: sentiments.length ? Math.round((sentiments.filter((v) => v === "negative").length / sentiments.length) * 100) : null,
    };
}

/**
 * @param current     the narrative being viewed: { id, title, description, keywords, firstSeen }
 * @param candidates  other narratives of the workspace, each with `signals` (published_at/captured_at, sentiment)
 * @param plans       action plans of those narratives: [{ cluster_id, title, status, type, created_at }]
 */
export function buildPrecedents(current, candidates, plans = [], now = Date.now()) {
    const mine = clusterTokens(current);
    const firstSeen = current.firstSeen ? new Date(current.firstSeen).getTime() : now;
    const items = [];
    for (const c of candidates || []) {
        if (c.id === current.id) continue;
        const life = lifecycle(c.signals);
        if (!life || new Date(life.firstAt).getTime() >= firstSeen) continue;
        const { score, shared } = overlap(mine, clusterTokens(c));
        if (score < MIN_SIMILARITY) continue;
        items.push({
            id: c.id,
            title: c.title,
            similarity: Math.round(score * 100) / 100,
            sharedWords: shared.slice(0, 6),
            sentiment: c.sentiment || null,
            ...life,
            actions: plans.filter((p) => p.cluster_id === c.id).slice(0, 3).map((p) => ({ title: p.title, status: p.status, type: p.type, createdAt: p.created_at })),
        });
    }
    items.sort((a, b) => b.similarity - a.similarity || b.records - a.records);
    const top = items.slice(0, 4);
    if (!top.length) return { precedents: [], expectation: null };

    const toPeak = median(top.map((p) => p.hoursToPeak));
    const active = median(top.map((p) => p.activeHours));
    const ageHours = Math.max(0, Math.round((now - firstSeen) / 3600000));
    return {
        precedents: top,
        expectation: {
            basedOn: top.length,
            medianHoursToPeak: toPeak,
            medianActiveHours: active,
            ageHours,
            // Positive: the peak is still ahead if this follows the precedents; zero or less: past the usual peak.
            hoursUntilTypicalPeak: toPeak === null ? null : Math.round(toPeak - ageHours),
            withActions: top.filter((p) => p.actions.length).length,
        },
    };
}
