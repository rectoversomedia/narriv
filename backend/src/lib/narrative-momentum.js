/**
 * Narrative momentum and confidence from persisted observations only.
 * Shared by the narratives API and the risk model so both use one definition.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Confidence (0-1) from a persisted analysis row, or null when unavailable. */
export function analysisConfidence(a) {
    const raw = a?.analysis?.confidence_score ?? a?.confidence ?? a?.confidence_score;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

/**
 * Momentum from timestamped member observations: distinct member signals
 * captured in the last 24h vs the 24h before. No percentage is reported when
 * the prior window is empty (that is "new", not infinite growth).
 */
export function narrativeMomentum(signals, now = Date.now()) {
    const seen = new Set();
    let last24h = 0;
    let prior24h = 0;
    for (const s of signals) {
        if (!s?.id || seen.has(s.id) || !s.captured_at) continue;
        seen.add(s.id);
        const age = now - new Date(s.captured_at).getTime();
        if (age >= 0 && age < DAY_MS) last24h += 1;
        else if (age >= DAY_MS && age < 2 * DAY_MS) prior24h += 1;
    }
    let changePct = null;
    let label = "—";
    if (prior24h > 0) {
        changePct = Math.round(((last24h - prior24h) / prior24h) * 100);
        label = `${changePct >= 0 ? "+" : ""}${changePct}%`;
    } else if (last24h > 0) {
        label = "new";
    }
    return { last24h, prior24h, changePct, label, basis: "distinct member signals by captured_at, last 24h vs previous 24h" };
}

// A narrative is "emerging" only with enough fresh observations AND growth
// versus the previous window (or no prior observations at all).
export const EMERGING_MIN_SIGNALS_24H = 3;
export const EMERGING_MIN_GROWTH_PCT = 50;

export function isEmerging(momentum) {
    if (!momentum || momentum.last24h < EMERGING_MIN_SIGNALS_24H) return false;
    return momentum.prior24h === 0 || (momentum.changePct ?? 0) >= EMERGING_MIN_GROWTH_PCT;
}

