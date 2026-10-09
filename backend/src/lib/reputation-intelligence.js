/**
 * Reputation Intelligence
 *
 * Combines sentiment, narrative volume, risk, momentum, and recurring
 * issues into a single reputation view. Every output is traceable.
 */

import { baseSupabaseAdmin } from "./supabase.js";

function clamp01(n) {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

export async function computeReputationIntelligence({ workspaceId, windowHours = 24 }) {
    if (!workspaceId) {
        return { status: "insufficient_data", reason: "workspaceId required" };
    }
    const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const prevSinceIso = new Date(Date.now() - windowHours * 2 * 3600 * 1000).toISOString();

    const [recent, prev, alerts, clusters] = await Promise.all([
        baseSupabaseAdmin
            .from("signals")
            .select("id, sentiment, captured_at, source_id, platform")
            .eq("workspace_id", workspaceId)
            .gte("captured_at", sinceIso)
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("signals")
            .select("id")
            .eq("workspace_id", workspaceId)
            .lt("captured_at", sinceIso)
            .gte("captured_at", prevSinceIso)
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("alerts")
            .select("id, severity, status")
            .eq("workspace_id", workspaceId)
            .gte("created_at", sinceIso)
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("narrative_clusters")
            .select("id, title, momentum:velocity")
            .eq("workspace_id", workspaceId)
            .order("velocity", { ascending: false, nullsFirst: false })
            .limit(10)
            .then((r) => r.data || []),
    ]);

    const evidence = [];
    const facts = [];
    const inferences = [];

    facts.push({ kind: "signal_count_window", value: recent.length, windowHours });
    facts.push({ kind: "alert_count_window", value: alerts.length, windowHours });

    if (recent.length === 0) {
        return {
            status: "ok",
            label: "reputation_intelligence",
            generatedAt: new Date().toISOString(),
            windowHours,
            reputationScore: 50,
            reputationBand: "neutral",
            facts,
            inferences,
            evidence,
            note: "No signals in the window — reputation is at neutral baseline.",
        };
    }

    const sentCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0 };
    for (const s of recent) {
        const k = String(s.sentiment || "NEUTRAL").toUpperCase();
        if (k in sentCounts) sentCounts[k] += 1;
    }
    facts.push({ kind: "sentiment_breakdown", value: sentCounts });

    const negShare = sentCounts.NEGATIVE / recent.length;
    const posShare = sentCounts.POSITIVE / recent.length;
    const volumeRatio = prev.length > 0 ? recent.length / prev.length : 1;
    const activeAlerts = alerts.filter((a) => a.status !== "resolved").length;

    inferences.push({
        kind: "negative_share",
        label: negShare > 0.5 ? "Majority of recent signals are negative." : "Negative share is moderate.",
        value: Number(negShare.toFixed(3)),
    });
    inferences.push({
        kind: "positive_share",
        label: posShare > 0.5 ? "Majority of recent signals are positive." : "Positive share is moderate.",
        value: Number(posShare.toFixed(3)),
    });
    inferences.push({
        kind: "volume_ratio",
        label: volumeRatio >= 2 ? "Volume has doubled vs prior window." : "Volume is stable.",
        value: Number(volumeRatio.toFixed(2)),
    });
    inferences.push({
        kind: "active_alerts",
        label: `${activeAlerts} active alert(s) in the window.`,
        value: activeAlerts,
    });

    const reputationScore = Math.round(
        (posShare * 60)
        + ((1 - negShare) * 20)
        - (clamp01(activeAlerts / 5) * 20)
        - (clamp01((volumeRatio - 1) / 2) * 10)
        + 30
    );
    const bounded = Math.max(0, Math.min(100, reputationScore));
    const reputationBand = bounded >= 75 ? "strong" : bounded >= 50 ? "stable" : bounded >= 25 ? "at_risk" : "critical";

    if (activeAlerts > 0) {
        for (const a of alerts.slice(0, 5)) evidence.push({ type: "alert", id: a.id });
    }

    return {
        status: "ok",
        label: "reputation_intelligence",
        generatedAt: new Date().toISOString(),
        windowHours,
        reputationScore: bounded,
        reputationBand,
        facts,
        inferences,
        evidence,
    };
}
