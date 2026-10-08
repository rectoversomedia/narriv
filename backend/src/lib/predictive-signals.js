/**
 * Predictive Signals (EVIDENCE-GROUNDED)
 *
 * Produces predictions (not "AI predictions" — that phrase is forbidden
 * in this module). Every prediction carries:
 *   - signal: short label
 *   - confidence: 0..1
 *   - timeframe: human-readable
 *   - supporting: array of evidence IDs / query refs
 *   - assumptions: array of strings
 *
 * This module NEVER fabricates data. If inputs are insufficient it
 * returns an empty list with status "insufficient_data".
 */

import { baseSupabaseAdmin } from "./supabase.js";

function clamp01(n) {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export async function computePredictiveSignals({ workspaceId, windowHours = 24 }) {
    if (!workspaceId) return { status: "insufficient_data", signals: [] };

    const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const prevSinceIso = new Date(Date.now() - windowHours * 2 * 3600 * 1000).toISOString();

    const [recent, prev, alerts, clusters] = await Promise.all([
        baseSupabaseAdmin.from("signals").select("id, sentiment, captured_at").eq("workspace_id", workspaceId).gte("captured_at", sinceIso).then((r) => r.data || []),
        baseSupabaseAdmin.from("signals").select("id").eq("workspace_id", workspaceId).lt("captured_at", sinceIso).gte("captured_at", prevSinceIso).then((r) => r.data || []),
        baseSupabaseAdmin.from("alerts").select("id, severity, status, created_at").eq("workspace_id", workspaceId).gte("created_at", sinceIso).then((r) => r.data || []),
        baseSupabaseAdmin.from("narrative_clusters").select("id, title, momentum, sentiment_score, signal_count").eq("workspace_id", workspaceId).order("momentum", { ascending: false }).limit(10).then((r) => r.data || []),
    ]);

    const signals = [];
    const evidence = [];

    if (recent.length === 0 && alerts.length === 0) {
        return { status: "insufficient_data", signals: [], evidence: [] };
    }

    const volRatio = prev.length > 0 ? recent.length / prev.length : 1;
    const negCount = recent.filter((s) => String(s.sentiment || "").toUpperCase() === "NEGATIVE").length;
    const negShare = recent.length > 0 ? negCount / recent.length : 0;
    const activeAlerts = alerts.filter((a) => a.status !== "resolved").length;

    if (volRatio >= 1.5 && recent.length >= 5) {
        signals.push({
            signal: "volume_continuation",
            label: "If current volume persists, the next window is likely to remain elevated.",
            confidence: clamp01(0.5 + 0.05 * (volRatio - 1.5)),
            timeframe: "next 24h",
            supporting: ["signal_volume_ratio", "signals_table_query"],
            assumptions: ["No external shock event occurs", "Ingestion pipeline remains healthy"],
        });
        evidence.push({ type: "signals_volume", recent: recent.length, prev: prev.length, ratio: volRatio });
    }

    if (negShare >= 0.4 && volRatio >= 1.25) {
        signals.push({
            signal: "sentiment_escalation",
            label: "Concentrated negative sentiment combined with rising volume may indicate an emerging issue.",
            confidence: clamp01(0.4 + 0.3 * (negShare - 0.4)),
            timeframe: "next 24-72h",
            supporting: ["sentiment_breakdown", "signal_volume_ratio"],
            assumptions: ["Sample size is representative", "Source mix is not shifting dramatically"],
        });
        evidence.push({ type: "sentiment_share", negShare, volRatio });
    }

    if (activeAlerts >= 3) {
        signals.push({
            signal: "alert_clustering",
            label: "Multiple active alerts suggest a possible coordinated or systemic issue.",
            confidence: clamp01(0.4 + 0.1 * activeAlerts),
            timeframe: "next 12-48h",
            supporting: ["alerts_table_query"],
            assumptions: ["Alert thresholds have not changed in the window"],
        });
        for (const a of alerts.slice(0, 5)) evidence.push({ type: "alert", id: a.id });
    }

    const risingClusters = clusters.filter((c) => safeNumber(c.momentum, 0) > 0.6);
    if (risingClusters.length >= 2) {
        signals.push({
            signal: "narrative_expansion",
            label: "Multiple narratives are gaining momentum; expect broader coverage if the trend continues.",
            confidence: clamp01(0.4 + 0.1 * risingClusters.length),
            timeframe: "next 48-96h",
            supporting: ["narrative_clusters_table_query"],
            assumptions: ["Cluster momentum is computed consistently across the window"],
        });
        for (const c of risingClusters.slice(0, 5)) evidence.push({ type: "narrative_cluster", id: c.id });
    }

    return {
        status: "ok",
        label: "predictive_signals",
        generatedAt: new Date().toISOString(),
        windowHours,
        signals,
        evidence,
        disclaimer: "These are heuristic signals, not scientific predictions. They are intended to focus human review, not replace it.",
    };
}
