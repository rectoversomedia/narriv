/**
 * Explainable narrative risk model (deterministic, no AI calls).
 *
 * Produces a 0-100 heuristic RISK INDEX — not a probability and not
 * empirically calibrated. Every component reports its inputs, its weight,
 * its contribution, a plain-language reason and the IDs of the real records
 * that drove it, so each point of the score is traceable.
 *
 * Inputs are plain arrays already scoped to one workspace by the caller.
 */

export const RISK_MODEL_VERSION = "risk-v2.1";

// Weights sum to 1. Changing them changes every score: bump RISK_MODEL_VERSION.
const WEIGHTS = {
    negative_share: 0.30,
    severity: 0.20,
    volume_change: 0.15,
    active_alerts: 0.20,
    narrative_momentum: 0.15,
};

const EMERGING_VELOCITY = 70; // narrative_clusters.velocity is stored on a 0-100 scale
const MIN_SIGNALS_FOR_CONFIDENCE = 10;
const MAX_IDS = 10;

const clamp01 = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const upper = (v) => String(v || "").toUpperCase();
const lower = (v) => String(v || "").toLowerCase();

/** Normalize a cluster velocity to 0-100 (tolerates legacy 0-1 values). */
export function velocity100(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n <= 1 ? n * 100 : n;
}

export function bandFor(score) {
    return score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
}

/**
 * @param {object} p
 * @param {Array<{id,sentiment,severity,source_id,platform}>} p.signals  current window
 * @param {number} p.priorCount   signal count in the previous window of equal length
 * @param {Array<{id,severity,status}>} p.alerts  alerts in the window
 * @param {Array<{id,title,velocity|momentum,signal_count}>} p.clusters
 */
export function computeRisk({ signals = [], priorCount = 0, alerts = [], clusters = [] }) {
    const n = signals.length;
    const components = [];
    const uncertainty = [];
    const limitations = [
        "Source credibility is not modeled (no credibility data in the schema); all sources are weighted equally.",
        "Heuristic index for prioritization, not a calibrated probability of harm.",
    ];

    if (n === 0) {
        return {
            version: RISK_MODEL_VERSION,
            score: 0,
            band: "low",
            components: [],
            uncertainty: { level: "high", reasons: ["No signals in the window."] },
            limitations,
            sourceIds: [],
        };
    }

    const add = (key, value, reason, ids = [], inputs = {}) => {
        const v = clamp01(value);
        components.push({
            key,
            weight: WEIGHTS[key],
            value: Number(v.toFixed(3)),
            contribution: Number((v * WEIGHTS[key] * 100).toFixed(1)),
            reason,
            inputs,
            evidenceIds: ids.slice(0, MAX_IDS),
        });
    };

    // 1. Negative sentiment share.
    const negatives = signals.filter((s) => upper(s.sentiment) === "NEGATIVE");
    const negShare = negatives.length / n;
    add("negative_share", negShare,
        `${negatives.length} of ${n} signals in the window are negative.`,
        negatives.map((s) => s.id), { negative: negatives.length, total: n });

    // 2. Severity of underlying issues (as assessed during analysis).
    const severe = signals.filter((s) => ["high", "critical"].includes(lower(s.severity)));
    const critical = severe.filter((s) => lower(s.severity) === "critical").length;
    // High counts once, critical twice; normalized by window size (capped at 1).
    add("severity", (severe.length + critical) / n,
        severe.length
            ? `${severe.length} signal(s) rated high/critical severity (${critical} critical).`
            : "No signals rated high or critical severity.",
        severe.map((s) => s.id), { highOrCritical: severe.length, critical });

    // 3. Volume change vs the previous equal window. No baseline => no score
    // contribution (a first window must not look like a doubling).
    if (priorCount > 0) {
        const ratio = n / priorCount;
        add("volume_change", (ratio - 1) / 2,
            ratio >= 2 ? `Volume is ${ratio.toFixed(1)}x the previous window.`
                : ratio > 1 ? `Volume is up ${Math.round((ratio - 1) * 100)}% vs the previous window.`
                    : "Volume is not above the previous window.",
            [], { current: n, prior: priorCount, ratio: Number(ratio.toFixed(2)) });
    } else {
        add("volume_change", 0, "No signals in the previous window, so volume change cannot be assessed.", [], { current: n, prior: 0, ratio: null });
        uncertainty.push("No baseline window: volume change is unknown.");
    }

    // 4. Active (unresolved) alerts, weighted by severity.
    const active = alerts.filter((a) => lower(a.status) !== "resolved");
    const sevWeight = { critical: 1, high: 0.75, medium: 0.4, low: 0.2 };
    const alertLoad = active.reduce((sum, a) => sum + (sevWeight[lower(a.severity)] ?? 0.4), 0);
    add("active_alerts", alertLoad / 3,
        active.length ? `${active.length} unresolved alert(s) in the window.` : "No unresolved alerts in the window.",
        active.map((a) => a.id), { unresolved: active.length });

    // 5. Narrative momentum: clusters with high velocity. Clusters sharing a
    // normalized title are one narrative (duplicates must not inflate risk).
    const hot = clusters.filter((c) => (velocity100(c.velocity ?? c.momentum) ?? 0) >= EMERGING_VELOCITY);
    const byTitle = new Map();
    for (const c of hot) {
        const key = String(c.title || c.id).trim().toLowerCase().replace(/\s+/g, " ");
        const prev = byTitle.get(key);
        const v = velocity100(c.velocity ?? c.momentum);
        if (!prev) byTitle.set(key, { ...c, velocity: v, duplicateIds: [] });
        else {
            prev.duplicateIds.push(c.id);
            if (v > prev.velocity) prev.velocity = v;
        }
    }
    const emerging = [...byTitle.values()];
    const duplicates = emerging.reduce((n, c) => n + c.duplicateIds.length, 0);
    if (duplicates > 0) uncertainty.push(`${duplicates} duplicate narrative cluster(s) share a title with another cluster and were merged.`);
    add("narrative_momentum", emerging.length / 3,
        emerging.length
            ? `${emerging.length} distinct narrative(s) with velocity >= ${EMERGING_VELOCITY}/100.`
            : "No narrative clusters above the momentum threshold.",
        emerging.flatMap((c) => [c.id, ...c.duplicateIds]), { emergingNarratives: emerging.length, duplicateClusters: duplicates, threshold: EMERGING_VELOCITY });

    if (n < MIN_SIGNALS_FOR_CONFIDENCE) uncertainty.push(`Small sample: only ${n} signal(s) in the window.`);
    const unrated = signals.filter((s) => !s.sentiment).length;
    if (unrated > 0) uncertainty.push(`${unrated} signal(s) have no sentiment yet (unanalyzed).`);

    const score = Math.round(components.reduce((sum, c) => sum + c.contribution, 0));
    const level = uncertainty.length === 0 ? "low" : uncertainty.length === 1 ? "medium" : "high";
    const sourceIds = [...new Set(components.flatMap((c) => c.evidenceIds))];

    return {
        version: RISK_MODEL_VERSION,
        score,
        band: bandFor(score),
        components,
        uncertainty: { level, reasons: uncertainty },
        limitations,
        sourceIds,
        emergingClusters: emerging.map((c) => ({ id: c.id, title: c.title, velocity: c.velocity, signalCount: c.signal_count ?? null, duplicateIds: c.duplicateIds })),
    };
}
