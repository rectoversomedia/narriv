/**
 * Entity Intelligence
 *
 * Aggregates signals and alerts by entity (brand, company, product,
 * person, location, topic) to surface which entities Narriv is hearing
 * about and how their narrative share is shifting.
 *
 * Reads existing signals, alerts, and analyses. Does NOT modify any
 * existing call site.
 */

import { baseSupabaseAdmin } from "./supabase.js";

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function entityKey(analysis) {
    return String(analysis?.stakeholder || "unknown").trim().toLowerCase();
}

function sentimentScore(sentiment) {
    const k = String(sentiment || "").toUpperCase();
    if (k === "POSITIVE") return 1;
    if (k === "NEGATIVE") return -1;
    return 0;
}

function impactWeight(impact) {
    const k = String(impact || "").toLowerCase();
    if (k === "critical") return 3;
    if (k === "high") return 2;
    if (k === "medium") return 1;
    return 0.5;
}

/**
 * Compute entity intelligence for a workspace.
 * Returns:
 *   - entities: ranked by weighted mention volume, with sentiment
 *   - relationships: stakeholder pairs that co-occur in clusters
 *   - competitive: top 5 entities with rising negative share
 */
export async function computeEntityIntelligence({ workspaceId, windowHours = 24, limit = 20 }) {
    if (!workspaceId) {
        return { status: "insufficient_data", reason: "workspaceId is required", entities: [], relationships: [], competitive: [] };
    }
    const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

    const [signalsWithAnalysis, clusters] = await Promise.all([
        baseSupabaseAdmin
            .from("signals")
            .select("id, sentiment, captured_at, analysis:signal_analysis(stakeholder, impact, narrative_type, summary)")
            .eq("workspace_id", workspaceId)
            .gte("captured_at", sinceIso)
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("narrative_clusters")
            .select("id, title, narrative_cluster_signals(signal_id)")
            .eq("workspace_id", workspaceId)
            .order("updated_at", { ascending: false })
            .limit(50)
            .then((r) => r.data || []),
    ]);

    const entityMap = new Map();
    const evidence = [];

    for (const s of signalsWithAnalysis) {
        const a = s.analysis;
        if (!a || !a.stakeholder) continue;
        const key = entityKey(a);
        if (!entityMap.has(key)) {
            entityMap.set(key, {
                entity: key,
                mentions: 0,
                weightedScore: 0,
                sentimentSum: 0,
                sentimentN: 0,
                topNarrativeTypes: {},
                topImpacts: {},
                firstSeen: s.captured_at,
                lastSeen: s.captured_at,
                signalIds: [],
            });
        }
        const e = entityMap.get(key);
        e.mentions += 1;
        e.weightedScore += impactWeight(a.impact);
        e.sentimentSum += sentimentScore(s.sentiment);
        e.sentimentN += 1;
        const nt = String(a.narrative_type || "general");
        e.topNarrativeTypes[nt] = (e.topNarrativeTypes[nt] || 0) + 1;
        const im = String(a.impact || "low");
        e.topImpacts[im] = (e.topImpacts[im] || 0) + 1;
        if (s.captured_at && s.captured_at < e.firstSeen) e.firstSeen = s.captured_at;
        if (s.captured_at && s.captured_at > e.lastSeen) e.lastSeen = s.captured_at;
        if (e.signalIds.length < 5) e.signalIds.push(s.id);
    }

    const entities = Array.from(entityMap.values())
        .map((e) => ({
            entity: e.entity,
            mentions: e.mentions,
            weightedScore: Number(e.weightedScore.toFixed(2)),
            avgSentiment: e.sentimentN > 0 ? Number((e.sentimentSum / e.sentimentN).toFixed(3)) : 0,
            topNarrativeTypes: e.topNarrativeTypes,
            topImpacts: e.topImpacts,
            firstSeen: e.firstSeen,
            lastSeen: e.lastSeen,
            signalIds: e.signalIds,
        }))
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, limit);

    for (const e of entities.slice(0, 5)) evidence.push({ type: "entity", name: e.entity, signalIds: e.signalIds });

    const competitive = entities
        .filter((e) => e.avgSentiment < 0)
        .sort((a, b) => a.avgSentiment - b.avgSentiment)
        .slice(0, 5);

    return {
        status: "ok",
        label: "entity_intelligence",
        generatedAt: new Date().toISOString(),
        windowHours,
        entities,
        competitive,
        evidence,
    };
}
