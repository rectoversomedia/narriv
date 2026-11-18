/**
 * Journey: how an issue's tone moved over time. The records in time order (outlet, tone, headline), plus the moments
 * worth telling: the first record, the first negative one and how long after the start it came, the busiest day, and
 * whether the negative share rose or fell between the first and second half. No AI; from stored records only.
 */
import { recordTime } from "./report-window.js";

const tone = (r) => {
    const s = String(r.sentiment || "").toLowerCase();
    return ["positive", "neutral", "negative", "mixed"].includes(s) ? s : "neutral";
};
const outlet = (r) => r.metadata?.publisher || r.author || r.platform || null;

export function buildJourney(rows, { privacy = false } = {}) {
    const timed = (rows || []).map((r) => ({ r, t: Date.parse(recordTime(r)) })).filter((x) => Number.isFinite(x.t)).sort((a, b) => a.t - b.t);
    if (timed.length < 2) return null;
    const startAt = timed[0].t;
    const hours = (t) => Math.round(((t - startAt) / 3600000) * 10) / 10;
    const steps = timed.slice(0, 12).map(({ r, t }) => ({
        id: r.id, at: new Date(t).toISOString(), hoursAfterStart: hours(t), tone: tone(r),
        outlet: privacy && !r.metadata?.publisher ? null : outlet(r),
        title: r.title || null, url: privacy ? null : r.url || null,
    }));
    const firstNeg = timed.find(({ r }) => tone(r) === "negative");
    const byDay = new Map();
    for (const { t } of timed) { const d = new Date(t + 7 * 3600000).toISOString().slice(0, 10); byDay.set(d, (byDay.get(d) || 0) + 1); }
    const [peakDay, peakCount] = [...byDay.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const half = Math.ceil(timed.length / 2);
    const share = (xs) => Math.round((xs.filter(({ r }) => tone(r) === "negative").length / Math.max(1, xs.length)) * 100);
    const early = share(timed.slice(0, half)), late = share(timed.slice(half));
    return {
        records: timed.length,
        steps,
        firstNegative: firstNeg ? { at: new Date(firstNeg.t).toISOString(), hoursAfterStart: hours(firstNeg.t), outlet: outlet(firstNeg.r) } : null,
        peak: { day: peakDay, count: peakCount },
        negativeShare: { early, late, trend: late > early + 10 ? "rising" : late < early - 10 ? "falling" : "steady" },
        spanHours: hours(timed[timed.length - 1].t),
    };
}
