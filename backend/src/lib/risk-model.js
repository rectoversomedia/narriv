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

export const RISK_MODEL_VERSION = "risk-v3";

// Weights sum to 1. Changing them changes every score: bump RISK_MODEL_VERSION.
const WEIGHTS = {
    negative_share: 0.30,
    severity: 0.20,
    volume_change: 0.15,
    active_alerts: 0.20,
    narrative_momentum: 0.15,
};

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

import { tr } from "./request-context.js";
import { isEmerging, EMERGING_MIN_SIGNALS_24H, EMERGING_MIN_GROWTH_PCT } from "./narrative-momentum.js";

/**
 * @param {object} p
 * @param {Array<{id,sentiment,severity,source_id,platform}>} p.signals  current window
 * @param {number} p.priorCount   signal count in the previous window of equal length
 * @param {Array<{id,severity,status}>} p.alerts  alerts in the window
 * @param {Array<{id,title,signal_count,momentum:{last24h,prior24h,changePct}}>} p.clusters  momentum from member observations
 */
export function computeRisk({ signals = [], priorCount = 0, alerts = [], clusters = [] }) {
    const n = signals.length;
    const components = [];
    const uncertainty = [];
    const limitations = [
        tr("Source credibility is not modeled (no credibility data in the schema); all sources are weighted equally.", "Kredibilitas sumber belum diperhitungkan; semua sumber diberi bobot yang sama."),
        tr("Heuristic index for prioritization, not a calibrated probability of harm.", "Indeks heuristik untuk menentukan prioritas, bukan probabilitas kerugian yang terkalibrasi."),
    ];

    if (n === 0) {
        return {
            version: RISK_MODEL_VERSION,
            score: 0,
            band: "low",
            components: [],
            uncertainty: { level: "high", reasons: [tr("No signals in the window.", "Tidak ada sinyal di periode ini.")] },
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
        tr(`${negatives.length} of ${n} signals in the window are negative.`, `${negatives.length} dari ${n} sinyal di periode ini bernada negatif.`),
        negatives.map((s) => s.id), { negative: negatives.length, total: n });

    // 2. Severity of underlying issues (as assessed during analysis).
    const severe = signals.filter((s) => ["high", "critical"].includes(lower(s.severity)));
    const critical = severe.filter((s) => lower(s.severity) === "critical").length;
    // High counts once, critical twice; normalized by window size (capped at 1).
    add("severity", (severe.length + critical) / n,
        severe.length
            ? tr(`${severe.length} signal(s) rated high/critical severity (${critical} critical).`, `${severe.length} sinyal bertingkat keparahan tinggi/kritis (${critical} kritis).`)
            : tr("No signals rated high or critical severity.", "Tidak ada sinyal bertingkat keparahan tinggi atau kritis."),
        severe.map((s) => s.id), { highOrCritical: severe.length, critical });

    // 3. Volume change vs the previous equal window. No baseline => no score
    // contribution (a first window must not look like a doubling).
    if (priorCount > 0) {
        const ratio = n / priorCount;
        add("volume_change", (ratio - 1) / 2,
            ratio >= 2 ? tr(`Volume is ${ratio.toFixed(1)}x the previous window.`, `Volume ${ratio.toFixed(1)}x periode sebelumnya.`)
                : ratio > 1 ? tr(`Volume is up ${Math.round((ratio - 1) * 100)}% vs the previous window.`, `Volume naik ${Math.round((ratio - 1) * 100)}% dibanding periode sebelumnya.`)
                    : tr("Volume is not above the previous window.", "Volume tidak lebih tinggi dari periode sebelumnya."),
            [], { current: n, prior: priorCount, ratio: Number(ratio.toFixed(2)) });
    } else {
        add("volume_change", 0, tr("No signals in the previous window, so volume change cannot be assessed.", "Tidak ada sinyal di periode sebelumnya, jadi perubahan volume belum bisa dinilai."), [], { current: n, prior: 0, ratio: null });
        uncertainty.push(tr("No baseline window: volume change is unknown.", "Belum ada periode pembanding: perubahan volume belum diketahui."));
    }

    // 4. Active (unresolved) alerts, weighted by severity.
    const active = alerts.filter((a) => lower(a.status) !== "resolved");
    const sevWeight = { critical: 1, high: 0.75, medium: 0.4, low: 0.2 };
    const alertLoad = active.reduce((sum, a) => sum + (sevWeight[lower(a.severity)] ?? 0.4), 0);
    add("active_alerts", alertLoad / 3,
        active.length ? tr(`${active.length} unresolved alert(s) in the window.`, `${active.length} peringatan belum selesai di periode ini.`) : tr("No unresolved alerts in the window.", "Tidak ada peringatan yang belum selesai di periode ini."),
        active.map((a) => a.id), { unresolved: active.length });

    // 5. Narrative momentum from timestamped member observations (last 24h vs
    // previous 24h). Stored cluster velocity is not used: it is not derived
    // from observations. Clusters sharing a normalized title count once.
    const withMomentum = clusters.filter((c) => c.momentum);
    const hot = withMomentum.filter((c) => isEmerging(c.momentum));
    const byTitle = new Map();
    for (const c of hot) {
        const key = String(c.title || c.id).trim().toLowerCase().replace(/\s+/g, " ");
        const prev = byTitle.get(key);
        if (!prev) byTitle.set(key, { ...c, duplicateIds: [] });
        else prev.duplicateIds.push(c.id);
    }
    const emerging = [...byTitle.values()];
    const duplicates = emerging.reduce((n, c) => n + c.duplicateIds.length, 0);
    if (duplicates > 0) uncertainty.push(tr(`${duplicates} duplicate narrative cluster(s) share a title with another cluster and were merged.`, `${duplicates} klaster narasi duplikat (judulnya sama dengan klaster lain) digabung.`));
    if (clusters.length > 0 && withMomentum.length === 0) uncertainty.push(tr("Narrative momentum unavailable: no member observations for the tracked clusters.", "Momentum narasi belum tersedia: belum ada pengamatan untuk klaster yang dipantau."));
    add("narrative_momentum", emerging.length / 3,
        emerging.length
            ? tr(`${emerging.length} narrative(s) emerging: at least ${EMERGING_MIN_SIGNALS_24H} new signals in 24h and growth >= ${EMERGING_MIN_GROWTH_PCT}% vs the previous 24h (or newly appeared).`, `${emerging.length} narasi mulai muncul: minimal ${EMERGING_MIN_SIGNALS_24H} sinyal baru dalam 24 jam dan tumbuh ≥ ${EMERGING_MIN_GROWTH_PCT}% dibanding 24 jam sebelumnya (atau baru muncul).`)
            : tr("No narrative meets the emerging criteria (fresh volume plus growth vs the previous 24h).", "Belum ada narasi yang memenuhi kriteria narasi baru (volume baru plus pertumbuhan dibanding 24 jam sebelumnya)."),
        emerging.flatMap((c) => [c.id, ...c.duplicateIds]),
        { emergingNarratives: emerging.length, duplicateClusters: duplicates, clustersWithObservations: withMomentum.length, minSignals24h: EMERGING_MIN_SIGNALS_24H, minGrowthPct: EMERGING_MIN_GROWTH_PCT });

    if (n < MIN_SIGNALS_FOR_CONFIDENCE) uncertainty.push(tr(`Small sample: only ${n} signal(s) in the window.`, `Sampel kecil: hanya ${n} sinyal di periode ini.`));
    const unrated = signals.filter((s) => !s.sentiment).length;
    if (unrated > 0) uncertainty.push(tr(`${unrated} signal(s) have no sentiment yet (unanalyzed).`, `${unrated} sinyal belum punya sentimen (belum dianalisis).`));

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
        emergingClusters: emerging.map((c) => ({ id: c.id, title: c.title, momentum: c.momentum, signalCount: c.signal_count ?? null, duplicateIds: c.duplicateIds })),
    };
}
