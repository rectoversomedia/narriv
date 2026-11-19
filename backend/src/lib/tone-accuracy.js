/** Tone accuracy from human reviews: share the AI got right, with n and a 95% Wilson interval, overall and per tone. */
const TONES = ["positive", "neutral", "negative", "mixed"];

export function normalTone(t) {
    const s = String(t || "").toLowerCase();
    return TONES.includes(s) ? s : null;
}

export function wilson(k, n, z = 1.96) {
    if (!n) return null;
    const p = k / n;
    const d = 1 + (z * z) / n;
    const c = p + (z * z) / (2 * n);
    const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return { low: Math.round(((c - m) / d) * 100), high: Math.round(((c + m) / d) * 100) };
}

export function toneAccuracy(reviews) {
    const list = (reviews || []).filter((r) => r && normalTone(r.ai) && normalTone(r.human));
    const n = list.length;
    const k = list.filter((r) => r.ai === r.human).length;
    const byTone = Object.fromEntries(TONES.map((t) => {
        const rows = list.filter((r) => r.ai === t);
        const ok = rows.filter((r) => r.human === t).length;
        return [t, { n: rows.length, accuracy: rows.length ? Math.round((ok / rows.length) * 100) : null }];
    }));
    // Negative mistakes matter most: a negative story the AI called neutral is a missed risk.
    const missedNegative = list.filter((r) => r.human === "negative" && r.ai !== "negative").length;
    return {
        n,
        accuracy: n ? Math.round((k / n) * 100) : null,
        interval: wilson(k, n),
        byTone,
        missedNegative,
        enough: n >= 50,
    };
}
