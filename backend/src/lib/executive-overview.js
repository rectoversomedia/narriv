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
 *
 * Findings are about the brand: records are classified by brand relevance
 * (see brand-relevance.js) and the main issue must be one whose own records
 * name the brand. When none qualifies the overview says so rather than
 * promoting the largest unrelated topic.
 */
import { baseSupabaseAdmin } from "./supabase.js";
import { computeNarrativeIntelligence } from "./narrative-intelligence.js";
import { computeReputationIntelligence } from "./reputation-intelligence.js";
import { computePredictiveSignals } from "./predictive-signals.js";
import { deriveRecommendations } from "./recommendation-engine.js";
import { classifyRecord, loadRelevanceContext } from "./brand-relevance.js";

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


const isSevere = (s) => ["high", "critical"].includes(String(s.severity || "").toLowerCase());
const OPEN_PLAN = new Set(["pending", "approved", "in_progress", "in-progress", "blocked"]);
const DONE_PLAN = new Set(["done", "completed"]);
const OPEN_CASE = new Set(["open", "in_progress"]);
const DONE_CASE = new Set(["resolved", "closed"]);

/**
 * Follow-ups already recorded for a finding: action plans and cases linked to
 * its narrative, records or warnings. The stage only reflects stored status;
 * an outcome is never assumed.
 */
function followUpFor({ narrativeIds = [], signalIds = [], alertIds = [] }, plans, cases) {
    const n = new Set(narrativeIds), s = new Set(signalIds), a = new Set(alertIds);
    const linkedPlans = plans.filter((p) => n.has(p.cluster_id) || s.has(p.signal_id) || a.has(p.alert_id));
    const linkedCases = cases.filter((c) => s.has(c.signal_id));
    const planStatus = (p) => String(p.status || "pending").toLowerCase();
    const caseStatus = (c) => String(c.status || "open").toLowerCase();
    const open = linkedPlans.filter((p) => OPEN_PLAN.has(planStatus(p))).length + linkedCases.filter((c) => OPEN_CASE.has(caseStatus(c))).length;
    const done = linkedPlans.filter((p) => DONE_PLAN.has(planStatus(p))).length + linkedCases.filter((c) => DONE_CASE.has(caseStatus(c))).length;
    const openSince = [...linkedPlans.filter((p) => OPEN_PLAN.has(planStatus(p))), ...linkedCases.filter((c) => OPEN_CASE.has(caseStatus(c)))]
        .map((x) => x.created_at).filter(Boolean).sort()[0] || null;
    return {
        stage: open > 0 ? "in_progress" : done > 0 ? "completed" : "none",
        openSince,
        plans: linkedPlans.slice(0, 3).map((p) => ({ id: p.id, title: p.title || null, status: planStatus(p), createdAt: p.created_at || null })),
        cases: linkedCases.slice(0, 3).map((c) => ({ id: c.id, title: c.title || null, status: caseStatus(c), hasResolution: Boolean(c.resolution), createdAt: c.created_at || null })),
    };
}

export async function computeExecutiveOverview({ workspaceId, windowHours = 168 }, deps = {}) {
    const db = deps.db || baseSupabaseAdmin;
    const now = Date.now();
    const since = new Date(now - windowHours * 3600 * 1000).toISOString();
    const priorSince = new Date(now - 2 * windowHours * 3600 * 1000).toISOString();

    const [current, prior, clustersRes, alertsRes, ctx, plansRes, casesRes] = await Promise.all([
        db.from("signals").select("id, title, content, url, platform, author, sentiment, severity, published_at, captured_at")
            .eq("workspace_id", workspaceId).gte("captured_at", since).order("captured_at", { ascending: false }).limit(1000),
        db.from("signals").select("id, title, content, sentiment, platform")
            .eq("workspace_id", workspaceId).gte("captured_at", priorSince).lt("captured_at", since).limit(1000),
        db.from("narrative_clusters").select("id, title, sentiment, created_at, updated_at, narrative_cluster_signals(signal_id)")
            .eq("workspace_id", workspaceId).order("updated_at", { ascending: false, nullsFirst: false }).limit(100),
        db.from("alerts").select("id, title, severity, status, created_at")
            .eq("workspace_id", workspaceId).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
        (deps.loadRelevanceContext || loadRelevanceContext)(db, workspaceId),
        db.from("action_plans").select("id, title, status, cluster_id, signal_id, alert_id, created_at")
            .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200),
        db.from("cases").select("id, title, status, signal_id, resolution, created_at")
            .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200),
    ]);
    for (const r of [current, prior, clustersRes, alertsRes]) if (r.error) throw new Error(r.error.message);
    // Follow-ups are context, not the briefing itself: unreadable means "none shown".
    const plans = plansRes.error ? [] : plansRes.data || [];
    const cases = casesRes.error ? [] : casesRes.data || [];

    const signals = current.data || [];
    const priorSignals = prior.data || [];
    const byId = new Map(signals.map((s) => [s.id, s]));
    const priorIds = new Set(priorSignals.map((s) => s.id));
    const rel = new Map(signals.map((s) => [s.id, classifyRecord(s, ctx)]));
    const relevanceOf = (s) => rel.get(s.id)?.relevance || "unconfirmed";
    // Without a configured brand nothing can be confirmed, so every record counts.
    const isFocus = (s) => !ctx.configured || relevanceOf(s) === "direct";
    const evidence = (s) => ({ ...evidenceOf(s), relevance: ctx.configured ? relevanceOf(s) : null });
    // Records naming the brand first, each group ranked by severity and recency.
    const rank = (list) => [...rankEvidence(list.filter(isFocus)), ...rankEvidence(list.filter((s) => !isFocus(s)))];

    const platforms = {};
    for (const s of signals) platforms[s.platform || "unknown"] = (platforms[s.platform || "unknown"] || 0) + 1;
    const relCounts = { direct: 0, indirect: 0, competitor: 0, unconfirmed: 0 };
    for (const s of signals) relCounts[relevanceOf(s)]++;
    const coverage = {
        signals: signals.length,
        platforms,
        newsOnly: signals.length > 0 && Object.keys(platforms).every((p) => p === "news"),
        relevance: {
            configured: ctx.configured,
            brandSource: ctx.brandSource,
            brand: ctx.brandTerms[0] || null,
            keywords: ctx.keywordTerms,
            competitorsConfigured: ctx.competitorTerms.length,
            counts: ctx.configured ? relCounts : null,
        },
    };
    const period = { from: since, to: new Date(now).toISOString(), windowHours };

    if (signals.length < MIN_SIGNALS_FOR_SUMMARY) {
        return { status: "insufficient_data", period, coverage, minimumSignals: MIN_SIGNALS_FOR_SUMMARY, happening: null, matters: [], changed: null, actions: [], uncertainty: null };
    }

    const focus = signals.filter(isFocus);
    const counts = sentimentCounts(focus);

    // --- A. What is happening: the issue most clearly about the brand. Volume
    // alone never decides it: an issue qualifies only when its own records name
    // the brand (at least two of them, or at least half), and qualifying issues
    // are ordered by brand mentions, then high severity, publishers, volume.
    const clusters = (clustersRes.data || []).map(({ narrative_cluster_signals: links, ...c }) => {
        const ids = (links || []).map((l) => l.signal_id);
        const inWindow = ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
        const direct = inWindow.filter(isFocus).length;
        return {
            ...c,
            inWindow,
            direct,
            severe: inWindow.filter(isSevere).length,
            publishers: new Set(inWindow.map((s) => s.author).filter(Boolean)).size,
            priorCount: ids.filter((id) => priorIds.has(id)).length,
        };
    });
    const qualifies = (c) => !ctx.configured || c.direct >= 2 || (c.direct >= 1 && c.direct * 2 >= c.inWindow.length);
    const candidates = clusters.filter((c) => c.inWindow.length >= 2);
    const top = candidates.filter(qualifies).sort((a, b) =>
        b.direct - a.direct || b.severe - a.severe || b.publishers - a.publishers || b.inWindow.length - a.inWindow.length)[0] || null;
    const eligibleIds = new Set(candidates.filter(qualifies).map((c) => c.id));

    const main = top ? {
        kind: "narrative",
        id: top.id,
        title: top.title,
        signals: top.inWindow.length,
        brandSignals: ctx.configured ? top.direct : null,
        negative: top.inWindow.filter((s) => upper(s.sentiment) === "NEGATIVE").length,
        severe: top.severe,
        // Distinct publishers reporting, not independent people discussing.
        publishers: top.publishers,
        platforms: [...new Set(top.inWindow.map((s) => s.platform || "unknown"))],
        isNew: new Date(top.created_at) >= new Date(since) && top.priorCount === 0,
        previousSignals: top.priorCount,
        rankedBy: ctx.configured ? ["brand_mentions", "severity", "publishers", "volume"] : ["volume"],
        evidence: rank(top.inWindow).slice(0, 3).map(evidence),
        evidenceIds: top.inWindow.map((s) => s.id),
        followUp: followUpFor({ narrativeIds: [top.id], signalIds: top.inWindow.map((s) => s.id) }, plans, cases),
    } : null;
    // Larger topics left out because their records do not name the brand.
    const excluded = ctx.configured
        ? candidates.filter((c) => !qualifies(c) && c.inWindow.length > (top?.inWindow.length || 0))
            .sort((a, b) => b.inWindow.length - a.inWindow.length).slice(0, 2)
            .map((c) => ({ id: c.id, title: c.title, signals: c.inWindow.length, brandSignals: c.direct }))
        : [];
    const happening = { main, counts, excluded, topEvidence: rankEvidence(focus).slice(0, 3).map(evidence) };

    // --- B. Why it matters: facts first, then cautious interpretations, all
    // about the records that name the brand.
    const { out: recs, narrative } = await (deps.computeRecommendations || computeWorkspaceRecommendations)({ workspaceId, windowHours });
    const ids = (list) => list.slice(0, 10).map((s) => s.id);
    const negative = focus.filter((s) => upper(s.sentiment) === "NEGATIVE");
    const severe = focus.filter(isSevere);
    const analyzed = counts.total - counts.unanalyzed;
    const unresolvedAlerts = (alertsRes.data || []).filter((a) => !["resolved", "dismissed", "closed"].includes(String(a.status || "").toLowerCase()));
    const emerging = (narrative.inferences?.find((i) => i.kind === "emerging_narratives")?.items || [])
        .filter((e) => !ctx.configured || eligibleIds.has(e.clusterId));

    const matters = [];
    if (ctx.configured) {
        matters.push({ code: focus.length ? "brand_relevance" : "no_brand_records", type: "fact", values: { brand: ctx.brandTerms[0], ...relCounts, total: signals.length }, evidenceIds: ids(focus) });
    }
    if (main && focus.length > 0) {
        matters.push({ code: "main_issue_weight", type: "fact", values: { title: main.title, records: ctx.configured ? main.brandSignals : main.signals, of: focus.length, share: share(ctx.configured ? main.brandSignals : main.signals, focus.length), negative: main.negative }, evidenceIds: main.evidenceIds.slice(0, 10) });
    }
    if (analyzed > 0) {
        const negShare = share(counts.negative, analyzed);
        // Fewer than 10 analysed records: shares are stated, but flagged as thin.
        const small = analyzed < 10;
        matters.push({ code: "negative_share", type: "fact", values: { negative: counts.negative, analyzed, share: negShare, small }, evidenceIds: ids(negative) });
        if (negShare >= NEGATIVE_ATTENTION_SHARE && counts.negative >= 2) {
            matters.push({ code: "perception_pressure", type: "interpretation", values: { share: negShare, small }, evidenceIds: ids(negative) });
        }
        const posShare = share(counts.positive, analyzed);
        if (posShare >= POSITIVE_OPPORTUNITY_SHARE && counts.positive >= 2) {
            matters.push({ code: "positive_opportunity", type: "interpretation", values: { positive: counts.positive, analyzed, share: posShare, small }, evidenceIds: ids(focus.filter((s) => upper(s.sentiment) === "POSITIVE")) });
        }
    }
    if (severe.length > 0) matters.push({ code: "high_severity", type: "fact", values: { count: severe.length }, evidenceIds: ids(severe) });
    if (unresolvedAlerts.length > 0) matters.push({ code: "open_warnings", type: "fact", values: { count: unresolvedAlerts.length }, evidenceIds: unresolvedAlerts.slice(0, 10).map((a) => a.id) });
    for (const e of emerging.slice(0, 2)) {
        if (main && e.clusterId === main.id) continue; // already the main issue
        matters.push({ code: "emerging_issue", type: "fact", values: { title: e.title, last24h: e.last24h, prior24h: e.prior24h }, evidenceIds: [e.clusterId] });
    }
    if (counts.unanalyzed > 0) matters.push({ code: "awaiting_analysis", type: "fact", values: { count: counts.unanalyzed }, evidenceIds: [] });

    // --- C. What changed: only against a previous period that has data.
    const priorFocus = priorSignals.filter((s) => !ctx.configured || classifyRecord(s, ctx).relevance === "direct");
    const priorCounts = sentimentCounts(priorFocus);
    const hasBaseline = priorSignals.length > 0;
    const changed = {
        baseline: hasBaseline,
        comparison: { current: period, previous: { from: priorSince, to: since } },
        current: { signals: signals.length, brandSignals: ctx.configured ? focus.length : null, negativeShare: share(counts.negative, analyzed) },
        previous: hasBaseline ? {
            signals: priorSignals.length,
            brandSignals: ctx.configured ? priorFocus.length : null,
            negativeShare: share(priorCounts.negative, priorCounts.total - priorCounts.unanalyzed),
        } : null,
        mainIssue: main ? { title: main.title, isNew: main.isNew, previousSignals: main.previousSignals } : null,
        newNarratives: clusters
            .filter((c) => eligibleIds.has(c.id) && c.id !== main?.id && c.priorCount === 0 && new Date(c.created_at) >= new Date(since))
            .sort((a, b) => b.direct - a.direct || b.inWindow.length - a.inWindow.length)
            .slice(0, 3)
            .map((c) => ({ id: c.id, title: c.title, signals: c.inWindow.length })),
        newWarnings: unresolvedAlerts.length,
    };

    // --- D. What to do next: at most three, each backed by records that
    // concern the brand, one per action type, with any follow-up already recorded.
    const alertById = new Map((alertsRes.data || []).map((a) => [a.id, a]));
    const clusterById = new Map(clusters.map((c) => [c.id, c]));
    const resolveEvidence = (sourceIds) => (sourceIds || []).map((id) => {
        if (byId.has(id)) return isFocus(byId.get(id)) || relevanceOf(byId.get(id)) !== "unconfirmed" ? byId.get(id) : null;
        if (alertById.has(id)) return { id, kind: "alert", title: alertById.get(id).title || null, url: null };
        if (clusterById.has(id) && (!ctx.configured || eligibleIds.has(id))) return { id, kind: "narrative", title: clusterById.get(id).title || null, url: null };
        return null; // outside this workspace's period, or not about the brand: never shown
    }).filter(Boolean);
    const seen = new Set();
    const actions = [];
    for (const r of recs.recommendations || []) {
        if (actions.length >= 3) break;
        if (seen.has(r.action)) continue;
        const found = resolveEvidence(r.sourceIds);
        const sigs = found.filter((e) => !e.kind);
        const others = found.filter((e) => e.kind);
        if (found.length === 0) continue;
        seen.add(r.action);
        // The issue these records belong to: one named in the evidence, else the
        // qualifying issue containing most of them. Never an unrelated issue.
        const sigIds = new Set(sigs.map((x) => x.id));
        const owner = candidates.filter((c) => !ctx.configured || eligibleIds.has(c.id))
            .map((c) => ({ c, overlap: c.inWindow.filter((x) => sigIds.has(x.id)).length }))
            .filter((o) => o.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap)[0]?.c;
        const narrativeRef = others.find((e) => e.kind === "narrative") || (owner ? { id: owner.id, kind: "narrative", title: owner.title } : null);
        const followUp = followUpFor({
            narrativeIds: narrativeRef ? [narrativeRef.id] : [],
            signalIds: sigs.map((s) => s.id),
            alertIds: others.filter((e) => e.kind === "alert").map((e) => e.id),
        }, plans, cases);
        // An open follow-up with no newer evidence: the issue has not changed
        // since someone took it on, so this is not a new recommendation.
        const newestEvidence = sigs.map((s) => s.captured_at).filter(Boolean).sort().pop() || null;
        const unchangedSinceFollowUp = followUp.stage === "in_progress" && Boolean(followUp.openSince) && (!newestEvidence || newestEvidence <= followUp.openSince);
        actions.push({
            action: r.action,
            priority: r.priority,
            urgency: r.urgency,
            whyItMatters: r.whyItMatters,
            observedIssue: r.observedIssue,
            monitorNext: r.monitorNext || null,
            requiresApproval: r.requiresApproval !== false,
            limitations: r.limitations || [],
            evidence: rank(sigs).slice(0, 3).map(evidence).concat(others.slice(0, 3)),
            evidenceCount: found.length,
            signalIds: sigs.map((s) => s.id),
            relatedNarrative: narrativeRef,
            followUp,
            unchangedSinceFollowUp,
        });
    }

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
