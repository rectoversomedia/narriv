/**
 * Executive Overview: what is happening, why it matters, what changed and
 * what to do next, for one workspace and period.
 *
 * Deterministic and evidence-first (no language model): every statement is
 * a structured finding with the numbers and record ids behind it, and the
 * browser turns the codes into text. Findings are typed:
 *   fact            counted directly from stored records
 *   interpretation  a reading of those facts, never a confirmed impact
 * Comparisons are only made when the previous period has data.
 */
import { baseSupabaseAdmin } from "./supabase.js";
import { computeNarrativeIntelligence } from "./narrative-intelligence.js";
import { computeReputationIntelligence } from "./reputation-intelligence.js";
import { computePredictiveSignals } from "./predictive-signals.js";
import { deriveRecommendations } from "./recommendation-engine.js";

export const MIN_SIGNALS_FOR_SUMMARY = 3;
const NEGATIVE_ATTENTION_SHARE = 0.3;
const POSITIVE_OPPORTUNITY_SHARE = 0.5;

/** Shared by GET /ai/recommendations and the overview. */
export async function computeWorkspaceRecommendations({ workspaceId, windowHours }) {
    const [narrative, rep, predictions] = await Promise.all([
        computeNarrativeIntelligence({ workspaceId, windowHours }),
        computeReputationIntelligence({ workspaceId, windowHours }),
        computePredictiveSignals({ workspaceId, windowHours }),
    ]);
    const signalCount = narrative.facts.find((f) => f.kind === "signal_count_window")?.value || 0;
    const negCount = narrative.facts.find((f) => f.kind === "sentiment_breakdown")?.value?.NEGATIVE || 0;
    const out = deriveRecommendations({
        riskScore: narrative.riskScore || 0,
        riskBand: narrative.riskBand || "low",
        reputationBand: rep.reputationBand || "neutral",
        // Unresolved alerts only (alert_count_window also counts resolved ones).
        activeAlerts: narrative.facts.find((f) => f.kind === "active_alerts")?.value || 0,
        emergingNarratives: narrative.inferences.find((i) => i.kind === "emerging_narratives")?.items?.length || 0,
        negativeShare: signalCount > 0 ? negCount / signalCount : 0,
        volumeRatio: narrative.inferences.find((i) => i.kind === "volume_ratio")?.ratio || 1,
        risk: narrative.riskModel || null,
    });
    return { out, narrative, rep, predictions };
}

const share = (n, d) => (d > 0 ? Math.round((n / d) * 100) / 100 : null);
const upper = (v) => String(v || "").toUpperCase();

function sentimentCounts(signals) {
    const c = { total: signals.length, negative: 0, positive: 0, neutral: 0, mixed: 0, unanalyzed: 0, highSeverity: 0 };
    for (const s of signals) {
        const sent = upper(s.sentiment);
        if (sent === "NEGATIVE") c.negative++;
        else if (sent === "POSITIVE") c.positive++;
        else if (sent === "NEUTRAL") c.neutral++;
        else if (sent === "MIXED") c.mixed++;
        else c.unanalyzed++;
        if (["high", "critical"].includes(String(s.severity || "").toLowerCase())) c.highSeverity++;
    }
    return c;
}

const evidenceOf = (s) => ({
    id: s.id,
    kind: "signal",
    title: s.title || null,
    url: s.url || null,
    platform: s.platform || null,
    publisher: s.author || null,
    publishedAt: s.published_at || null,
    collectedAt: s.captured_at || null,
    sentiment: s.sentiment ? upper(s.sentiment) : null,
    severity: s.severity || null,
});

// Most relevant first: high severity, then negative, then most recent.
function rankEvidence(signals) {
    const sev = (s) => ({ critical: 3, high: 2, medium: 1 }[String(s.severity || "").toLowerCase()] || 0);
    return [...signals].sort((a, b) =>
        sev(b) - sev(a)
        || (upper(b.sentiment) === "NEGATIVE") - (upper(a.sentiment) === "NEGATIVE")
        || new Date(b.captured_at) - new Date(a.captured_at));
}

export async function computeExecutiveOverview({ workspaceId, windowHours = 168 }, deps = {}) {
    const db = deps.db || baseSupabaseAdmin;
    const now = Date.now();
    const since = new Date(now - windowHours * 3600 * 1000).toISOString();
    const priorSince = new Date(now - 2 * windowHours * 3600 * 1000).toISOString();

    const [current, prior, clustersRes, alertsRes] = await Promise.all([
        db.from("signals").select("id, title, url, platform, author, sentiment, severity, published_at, captured_at")
            .eq("workspace_id", workspaceId).gte("captured_at", since).order("captured_at", { ascending: false }).limit(1000),
        db.from("signals").select("id, sentiment, platform")
            .eq("workspace_id", workspaceId).gte("captured_at", priorSince).lt("captured_at", since).limit(1000),
        db.from("narrative_clusters").select("id, title, sentiment, created_at, updated_at, narrative_cluster_signals(signal_id)")
            .eq("workspace_id", workspaceId).order("updated_at", { ascending: false, nullsFirst: false }).limit(100),
        db.from("alerts").select("id, title, severity, status, created_at")
            .eq("workspace_id", workspaceId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
    ]);
    for (const r of [current, prior, clustersRes, alertsRes]) if (r.error) throw new Error(r.error.message);

    const signals = current.data || [];
    const priorSignals = prior.data || [];
    const byId = new Map(signals.map((s) => [s.id, s]));
    const priorIds = new Set(priorSignals.map((s) => s.id));
    const counts = sentimentCounts(signals);
    const priorCounts = sentimentCounts(priorSignals);

    const platforms = {};
    for (const s of signals) platforms[s.platform || "unknown"] = (platforms[s.platform || "unknown"] || 0) + 1;
    const coverage = {
        signals: signals.length,
        platforms,
        newsOnly: signals.length > 0 && Object.keys(platforms).every((p) => p === "news"),
    };
    const period = { from: since, to: new Date(now).toISOString(), windowHours };

    if (signals.length < MIN_SIGNALS_FOR_SUMMARY) {
        return { status: "insufficient_data", period, coverage, minimumSignals: MIN_SIGNALS_FOR_SUMMARY, happening: null, matters: [], changed: null, actions: [], uncertainty: null };
    }

    // --- A. What is happening: the narrative with the most records in the period.
    const clusters = (clustersRes.data || []).map(({ narrative_cluster_signals: links, ...c }) => {
        const ids = (links || []).map((l) => l.signal_id);
        const inWindow = ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
        return { ...c, inWindow, priorCount: ids.filter((id) => priorIds.has(id)).length };
    });
    const top = clusters.filter((c) => c.inWindow.length >= 2).sort((a, b) => b.inWindow.length - a.inWindow.length)[0] || null;
    const main = top ? {
        kind: "narrative",
        id: top.id,
        title: top.title,
        signals: top.inWindow.length,
        negative: top.inWindow.filter((s) => upper(s.sentiment) === "NEGATIVE").length,
        // Distinct publishers reporting, not independent people discussing.
        publishers: new Set(top.inWindow.map((s) => s.author).filter(Boolean)).size,
        platforms: [...new Set(top.inWindow.map((s) => s.platform || "unknown"))],
        isNew: new Date(top.created_at) >= new Date(since) && top.priorCount === 0,
        evidence: rankEvidence(top.inWindow).slice(0, 3).map(evidenceOf),
    } : null;
    const happening = { main, counts, topEvidence: rankEvidence(signals).slice(0, 3).map(evidenceOf) };

    // --- B. Why it matters: facts first, then cautious interpretations.
    const { out: recs, narrative } = await (deps.computeRecommendations || computeWorkspaceRecommendations)({ workspaceId, windowHours });
    const negativeIds = signals.filter((s) => upper(s.sentiment) === "NEGATIVE").map((s) => s.id);
    const severeIds = signals.filter((s) => ["high", "critical"].includes(String(s.severity || "").toLowerCase())).map((s) => s.id);
    const analyzed = counts.total - counts.unanalyzed;
    const unresolvedAlerts = (alertsRes.data || []).filter((a) => !["resolved", "dismissed", "closed"].includes(String(a.status || "").toLowerCase()));
    const emerging = narrative.inferences?.find((i) => i.kind === "emerging_narratives")?.items || [];

    const matters = [];
    if (analyzed > 0) {
        const negShare = share(counts.negative, analyzed);
        matters.push({ code: "negative_share", type: "fact", values: { negative: counts.negative, analyzed, share: negShare }, evidenceIds: negativeIds.slice(0, 10) });
        if (negShare >= NEGATIVE_ATTENTION_SHARE) {
            matters.push({ code: "perception_pressure", type: "interpretation", values: { share: negShare }, evidenceIds: negativeIds.slice(0, 10) });
        }
        const posShare = share(counts.positive, analyzed);
        if (posShare >= POSITIVE_OPPORTUNITY_SHARE) {
            matters.push({ code: "positive_opportunity", type: "interpretation", values: { positive: counts.positive, analyzed, share: posShare }, evidenceIds: signals.filter((s) => upper(s.sentiment) === "POSITIVE").slice(0, 10).map((s) => s.id) });
        }
    }
    if (severeIds.length > 0) matters.push({ code: "high_severity", type: "fact", values: { count: severeIds.length }, evidenceIds: severeIds.slice(0, 10) });
    if (unresolvedAlerts.length > 0) matters.push({ code: "open_warnings", type: "fact", values: { count: unresolvedAlerts.length }, evidenceIds: unresolvedAlerts.slice(0, 10).map((a) => a.id) });
    for (const e of emerging.slice(0, 2)) {
        matters.push({ code: "emerging_issue", type: "fact", values: { title: e.title, last24h: e.last24h, prior24h: e.prior24h }, evidenceIds: [e.clusterId] });
    }
    if (counts.unanalyzed > 0) matters.push({ code: "awaiting_analysis", type: "fact", values: { count: counts.unanalyzed }, evidenceIds: [] });

    // --- C. What changed: only against a previous period that has data.
    const hasBaseline = priorSignals.length > 0;
    const priorAnalyzed = priorCounts.total - priorCounts.unanalyzed;
    const changed = {
        baseline: hasBaseline,
        comparison: { current: period, previous: { from: priorSince, to: since } },
        current: { signals: counts.total, negativeShare: share(counts.negative, analyzed) },
        previous: hasBaseline ? { signals: priorCounts.total, negativeShare: share(priorCounts.negative, priorAnalyzed) } : null,
        newNarratives: clusters
            .filter((c) => c.inWindow.length >= 2 && c.priorCount === 0 && new Date(c.created_at) >= new Date(since))
            .sort((a, b) => b.inWindow.length - a.inWindow.length)
            .slice(0, 3)
            .map((c) => ({ id: c.id, title: c.title, signals: c.inWindow.length })),
        newWarnings: unresolvedAlerts.length,
    };

    // --- D. What to do next: at most three, each with its evidence.
    const alertById = new Map((alertsRes.data || []).map((a) => [a.id, a]));
    const clusterById = new Map(clusters.map((c) => [c.id, c]));
    const resolveEvidence = (ids) => (ids || []).map((id) => {
        if (byId.has(id)) return evidenceOf(byId.get(id));
        if (alertById.has(id)) return { id, kind: "alert", title: alertById.get(id).title || null, url: null };
        if (clusterById.has(id)) return { id, kind: "narrative", title: clusterById.get(id).title || null, url: null };
        return null; // not in this workspace's period: never shown
    }).filter(Boolean);
    const actions = (recs.recommendations || []).map((r) => {
        const evidence = resolveEvidence(r.sourceIds);
        return {
            action: r.action,
            priority: r.priority,
            urgency: r.urgency,
            whyItMatters: r.whyItMatters,
            observedIssue: r.observedIssue,
            monitorNext: r.monitorNext || null,
            requiresApproval: r.requiresApproval !== false,
            limitations: r.limitations || [],
            evidence: rankEvidence(evidence.filter((e) => e.kind === "signal")).slice(0, 3).concat(evidence.filter((e) => e.kind !== "signal").slice(0, 3)),
            evidenceCount: evidence.length,
            relatedNarrative: evidence.find((e) => e.kind === "narrative") || (main ? { id: main.id, kind: "narrative", title: main.title } : null),
        };
    }).filter((a) => a.evidenceCount > 0).slice(0, 3);

    return {
        status: "ok",
        period,
        coverage,
        happening,
        matters,
        changed,
        actions,
        uncertainty: narrative.riskModel?.uncertainty || null,
        limitations: narrative.riskModel?.limitations || [],
        generatedAt: new Date(now).toISOString(),
    };
}
