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

import { tr } from "./request-context.js";
import { narrativeMomentum, isEmerging } from "./narrative-momentum.js";
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
        baseSupabaseAdmin.from("narrative_clusters")
            .select("id, title, signal_count, narrative_cluster_signals(signal:signals(id, captured_at))")
            .eq("workspace_id", workspaceId)
            .order("updated_at", { ascending: false })
            .limit(50)
            .then((r) => (r.data || []).map((c) => ({
                id: c.id,
                title: c.title,
                signal_count: c.signal_count,
                momentum: narrativeMomentum((c.narrative_cluster_signals || []).map((l) => l.signal).filter(Boolean)),
            }))),
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
            label: tr("If current volume persists, the next window is likely to remain elevated.", "Jika volume saat ini berlanjut, periode berikutnya kemungkinan tetap tinggi."),
            confidence: clamp01(0.5 + 0.05 * (volRatio - 1.5)),
            timeframe: tr("next 24h", "24 jam ke depan"),
            supporting: ["signal_volume_ratio", "signals_table_query"],
            assumptions: ["No external shock event occurs", "Ingestion pipeline remains healthy"],
        });
        evidence.push({ type: "signals_volume", recent: recent.length, prev: prev.length, ratio: volRatio });
    }

    if (negShare >= 0.4 && volRatio >= 1.25) {
        signals.push({
            signal: "sentiment_escalation",
            label: tr("Concentrated negative sentiment combined with rising volume may indicate an emerging issue.", "Sentimen negatif yang terkonsentrasi ditambah volume yang naik bisa menandakan isu yang mulai muncul."),
            confidence: clamp01(0.4 + 0.3 * (negShare - 0.4)),
            timeframe: tr("next 24-72h", "24–72 jam ke depan"),
            supporting: ["sentiment_breakdown", "signal_volume_ratio"],
            assumptions: ["Sample size is representative", "Source mix is not shifting dramatically"],
        });
        evidence.push({ type: "sentiment_share", negShare, volRatio });
    }

    if (activeAlerts >= 3) {
        signals.push({
            signal: "alert_clustering",
            label: tr("Multiple active alerts suggest a possible coordinated or systemic issue.", "Beberapa peringatan aktif menandakan kemungkinan isu yang terkoordinasi atau sistemik."),
            confidence: clamp01(0.4 + 0.1 * activeAlerts),
            timeframe: tr("next 12-48h", "12–48 jam ke depan"),
            supporting: ["alerts_table_query"],
            assumptions: ["Alert thresholds have not changed in the window"],
        });
        for (const a of alerts.slice(0, 5)) evidence.push({ type: "alert", id: a.id });
    }

    // Rising = emerging by observed growth; clusters with the same title count once.
    const seenTitles = new Set();
    const risingClusters = clusters.filter((c) => {
        if (!isEmerging(c.momentum)) return false;
        const key = String(c.title || c.id).trim().toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
    });
    if (risingClusters.length >= 2) {
        signals.push({
            signal: "narrative_expansion",
            label: tr("Multiple narratives are gaining momentum; expect broader coverage if the trend continues.", "Beberapa narasi sedang naik; pemberitaan bisa meluas kalau tren ini berlanjut."),
            confidence: clamp01(0.4 + 0.1 * risingClusters.length),
            timeframe: tr("next 48-96h", "48–96 jam ke depan"),
            supporting: ["narrative_cluster_signals (captured_at, last 24h vs previous 24h)"],
            assumptions: ["Growth in distinct member signals continues at a similar rate"],
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
        disclaimer: tr("These are heuristic mentions, not scientific predictions. They are intended to focus human review, not replace it.", "Ini percakapan heuristik, bukan prediksi ilmiah. Tujuannya membantu fokus tinjauan manusia, bukan menggantikannya."),
    };
}
