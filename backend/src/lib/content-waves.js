/**
 * Waves worth riding: narratives that are growing right now and are not mostly negative, for marketing teams that
 * want to join a conversation while it lasts. Each wave carries:
 *
 * - momentum: records in the last 24 hours against the 24 hours before (narrative-momentum.js);
 * - a risk check before joining: "avoid" when the conversation is largely negative, "careful" when it touches a
 *   sensitive subject (grief, disaster, religion, ethnicity, politics, violence) or shows near-identical posts from
 *   several accounts, "go" otherwise. The reasons are listed so a person can judge;
 * - a time window: when the current burst began (records with no gap over a day, counting back from the latest),
 *   against how many hours after starting this workspace's past narratives usually peaked. Joining before the
 *   peak is the point of riding a wave.
 *
 * Content ideas are generated separately, on request (ai.service.js suggestContentAngles).
 */
import { isEmerging, narrativeMomentum } from "./narrative-momentum.js";
import { lifecycle } from "./narrative-precedents.js";
import { findTextClusters, interactions } from "./narrative-spread.js";
import { recordTime } from "./report-window.js";

// Whole words (Indonesian and English) that make joining a conversation risky for a brand.
const SENSITIVE = [
    ["grief", ["meninggal", "wafat", "duka", "berduka", "tewas", "korban", "jenazah", "death", "died", "dies", "killed", "funeral", "tragedy", "tragedi"]],
    ["disaster", ["bencana", "banjir", "gempa", "longsor", "tsunami", "erupsi", "kebakaran", "disaster", "flood", "earthquake", "wildfire"]],
    ["religion", ["agama", "masjid", "gereja", "pura", "vihara", "ulama", "pendeta", "religion", "religious", "penistaan", "blasphemy"]],
    ["ethnicity", ["sara", "rasis", "rasisme", "etnis", "racist", "racism", "ethnic"]],
    ["politics", ["pemilu", "pilkada", "pilpres", "capres", "cawapres", "partai", "dpr", "election", "politik", "political"]],
    ["violence", ["kekerasan", "pelecehan", "pemerkosaan", "pembunuhan", "teror", "terorisme", "bom", "violence", "harassment", "assault", "murder", "terror"]],
];

export function sensitiveTopics(text) {
    const words = new Set(String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/));
    return SENSITIVE.filter(([, terms]) => terms.some((t) => words.has(t))).map(([topic]) => topic);
}

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The risk of joining one conversation, with its reasons (codes the client words). */
export function waveRisk({ negativeShare, topics, coordination }) {
    const reasons = [];
    if (negativeShare !== null && negativeShare >= 40) reasons.push({ code: "negative", value: negativeShare });
    for (const t of topics) reasons.push({ code: "sensitive", value: t });
    if (coordination > 0) reasons.push({ code: "coordination", value: coordination });
    const level = negativeShare !== null && negativeShare >= 40 ? "avoid" : reasons.length ? "careful" : "go";
    return { level, reasons };
}

const BURST_GAP_H = 24;
const MIN_LAST_24H = 4;
const MIN_GROWTH = 1.3;

/** When the current burst began: walking back from the latest record until a gap longer than a day. */
export function burstStart(times) {
    const t = [...times].sort((a, b) => b - a);
    if (!t.length) return null;
    let start = t[0];
    for (let i = 1; i < t.length; i++) {
        if (start - t[i] > BURST_GAP_H * 3600000) break;
        start = t[i];
    }
    return start;
}

/** Growing now: enough records in the last 24 hours and clearly more than the 24 hours before. */
export function isRising(momentum) {
    if (!momentum || momentum.last24h < MIN_LAST_24H) return false;
    return isEmerging(momentum) || momentum.prior24h === 0 || momentum.last24h >= momentum.prior24h * MIN_GROWTH;
}

/**
 * @param clusters narratives of the workspace with `signals` (title, content, platform, sentiment, author, metadata,
 *                 published_at, captured_at)
 */
export function buildWaves(clusters, now = Date.now()) {
    // Hours from start to peak of past narratives (the middle of the 6-hour peak bucket).
    const peaks = (clusters || []).map((c) => lifecycle(c.signals)).filter((l) => l && l.records >= 5).map((l) => l.hoursToPeak + 3);
    const typicalPeakHours = median(peaks);
    const waves = [];
    for (const c of clusters || []) {
        const signals = c.signals || [];
        const momentum = narrativeMomentum(signals, now);
        if (!isRising(momentum)) continue;
        const sentiments = signals.map((s) => String(s.sentiment || "").toLowerCase()).filter((v) => ["positive", "negative", "neutral", "mixed"].includes(v));
        const share = (v) => (sentiments.length ? Math.round((sentiments.filter((x) => x === v).length / sentiments.length) * 100) : null);
        const negativeShare = share("negative");
        const topics = sensitiveTopics([c.title, c.description, ...signals.slice(0, 30).map((s) => `${s.title || ""} ${s.content || ""}`)].join(" "));
        const coordination = findTextClusters(signals).filter((g) => g.kind === "coordination").length;
        const times = signals.map((s) => new Date(recordTime(s)).getTime()).filter(Number.isFinite);
        const start = burstStart(times.filter((t) => t <= now));
        const burstAgeHours = start === null ? null : Math.max(0, Math.round((now - start) / 3600000));
        const platforms = [...new Set(signals.map((s) => s.platform).filter(Boolean))];
        waves.push({
            id: c.id,
            title: c.title,
            description: c.description || c.main_narrative || "",
            records: signals.length,
            momentum,
            positiveShare: share("positive"),
            negativeShare,
            interactions: signals.reduce((n, s) => n + interactions(s.metadata), 0),
            platforms,
            risk: waveRisk({ negativeShare, topics, coordination }),
            window: {
                burstAgeHours,
                typicalPeakHours,
                // Positive: hours left before the usual peak (the window to join); zero or less: past it.
                hoursToTypicalPeak: typicalPeakHours === null || burstAgeHours === null ? null : Math.round(typicalPeakHours - burstAgeHours),
                basedOn: peaks.length,
            },
            samples: signals
                .slice()
                .sort((a, b) => interactions(b.metadata) - interactions(a.metadata))
                .slice(0, 3)
                .map((s) => ({ title: s.title || String(s.content || "").slice(0, 160), platform: s.platform || null, url: s.url || null })),
        });
    }
    const order = { go: 0, careful: 1, avoid: 2 };
    return waves.sort((a, b) => order[a.risk.level] - order[b.risk.level] || b.momentum.last24h - a.momentum.last24h).slice(0, 8);
}
