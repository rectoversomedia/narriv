/**
 * Narrative Intelligence Layer (NIL)
 *
 * Builds on existing Narriv data (signals, alerts, narrative clusters,
 * action plans) to produce risk assessment, predictive signals, and
 * evidence-grounded recommendations.
 *
 * IMPORTANT DESIGN PRINCIPLES:
 * - ADDITIVE: does not modify any existing AI workflow, call site, or
 *   database schema. Pure read-only queries against existing tables.
 * - GROUNDED: every output includes a chain of evidence (signal IDs,
 *   cluster IDs, alert IDs) that the user can verify. If data is
 *   insufficient, the output says so.
 * - LABELED: outputs are explicitly tagged as FACT / INFERENCE /
 *   PREDICTION / RECOMMENDATION so downstream UI can render them
 *   honestly.
 *
 * Heuristic scoring only. This is NOT a scientifically-validated risk
 * model. Treat all numbers as guidance for human review.
 */

import { baseSupabaseAdmin } from "./supabase.js";

const WINDOW_HOURS_DEFAULT = 24;

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function clamp01(n) {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

function emptyBbox(label, reason) {
    return {
        label,
        status: "insufficient_data",
        reason,
        facts: [],
        inferences: [],
        predictions: [],
        recommendations: [],
        evidence: [],
    };
}

/**
 * Compute narrative intelligence for a workspace.
 *
 * Returns a structured payload with:
 *   - riskScore: 0..100 heuristic risk number
 *   - riskBand: 'low' | 'medium' | 'high' | 'critical'
 *   - signals: detected patterns (volume spike, sentiment shift, etc.)
 *   - emergingNarratives: cluster IDs with acceleration
 *   - recommendations: list of {action, evidence, confidence}
 *   - generatedAt: ISO timestamp
 *
 * Every claim carries an evidence[] array of source IDs/queries.
 */
export async function computeNarrativeIntelligence({ workspaceId, windowHours = WINDOW_HOURS_DEFAULT }) {
    if (!workspaceId) {
        return emptyBbox("missing_workspace", "workspaceId is required");
    }

    const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

    const [signalsRecent, signalsPrev, alerts, clusters] = await Promise.all([
        baseSupabaseAdmin
            .from("signals")
            .select("id, sentiment, platform, captured_at, source_id")
            .eq("workspace_id", workspaceId)
            .gte("captured_at", sinceIso)
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("signals")
            .select("id")
            .eq("workspace_id", workspaceId)
            .lt("captured_at", sinceIso)
            .gte("captured_at", new Date(Date.now() - windowHours * 2 * 3600 * 1000).toISOString())
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("alerts")
            .select("id, severity, status, created_at")
            .eq("workspace_id", workspaceId)
            .gte("created_at", sinceIso)
            .then((r) => r.data || []),
        baseSupabaseAdmin
            .from("narrative_clusters")
            .select("id, title, signal_count, sentiment_score, momentum, updated_at, created_at")
            .eq("workspace_id", workspaceId)
            .order("momentum", { ascending: false })
            .limit(10)
            .then((r) => r.data || []),
    ]);

    const evidence = [];
    const facts = [];
    const inferences = [];
    const predictions = [];
    const recommendations = [];

    // FACTS — pure counts from the database.
    facts.push({ kind: "signal_count_window", value: signalsRecent.length, windowHours });
    facts.push({ kind: "alert_count_window", value: alerts.length, windowHours });
    facts.push({ kind: "narrative_clusters_tracked", value: clusters.length });

    if (signalsRecent.length === 0) {
        return {
            label: "narrative_intelligence",
            status: "ok",
            riskScore: 0,
            riskBand: "low",
            facts,
            inferences,
            predictions,
            recommendations,
            evidence,
            generatedAt: new Date().toISOString(),
            windowHours,
            note: "No signals in the window — no intelligence can be derived.",
        };
    }

    // Sentiment breakdown (FACT).
    const sentimentCounts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0 };
    for (const s of signalsRecent) {
        const k = String(s.sentiment || "NEUTRAL").toUpperCase();
        if (k in sentimentCounts) sentimentCounts[k] += 1;
        else sentimentCounts.NEUTRAL += 1;
    }
    facts.push({ kind: "sentiment_breakdown", value: sentimentCounts });

    // Volume ratio (INFERENCE): current window vs prior window.
    const ratio = signalsPrev.length > 0
        ? signalsRecent.length / signalsPrev.length
        : (signalsRecent.length > 0 ? 2 : 0);
    const volumeSignal = {
        kind: "volume_ratio",
        label: ratio >= 2
            ? "Mention volume has doubled or more vs the prior window."
            : ratio >= 1.25
                ? "Mention volume is moderately elevated."
                : ratio <= 0.5
                    ? "Mention volume has dropped vs the prior window."
                    : "Mention volume is stable.",
        ratio: Number(ratio.toFixed(2)),
        current: signalsRecent.length,
        prior: signalsPrev.length,
    };
    inferences.push(volumeSignal);
    evidence.push({ type: "signals_table_query", since: sinceIso, count: signalsRecent.length });

    // Negative sentiment share (INFERENCE).
    const negShare = clamp01(sentimentCounts.NEGATIVE / signalsRecent.length);
    inferences.push({
        kind: "negative_sentiment_share",
        label: negShare >= 0.5
            ? "More than half of recent signals are negative."
            : negShare >= 0.25
                ? "A meaningful share of recent signals are negative."
                : "Negative sentiment is not dominant in the window.",
        value: Number(negShare.toFixed(2)),
    });

    // Emerging narratives (FACT + INFERENCE): clusters with high momentum.
    const emerging = clusters
        .filter((c) => safeNumber(c.momentum, 0) > 0.6)
        .slice(0, 5)
        .map((c) => ({
            clusterId: c.id,
            title: c.title,
            momentum: safeNumber(c.momentum, 0),
            signalCount: safeNumber(c.signal_count, 0),
        }));
    if (emerging.length > 0) {
        inferences.push({
            kind: "emerging_narratives",
            label: `${emerging.length} narrative cluster(s) currently showing elevated momentum.`,
            items: emerging,
        });
        for (const e of emerging) evidence.push({ type: "narrative_cluster", id: e.clusterId });
    }

    // Active alerts (FACT).
    const activeAlerts = alerts.filter((a) => a.status !== "resolved");
    if (activeAlerts.length > 0) {
        facts.push({ kind: "active_alerts", value: activeAlerts.length });
        for (const a of activeAlerts.slice(0, 5)) evidence.push({ type: "alert", id: a.id });
    }

    // Risk score (heuristic, label as INFERENCE — explicitly NOT validated).
    const components = [
        clamp01(ratio / 3) * 0.30,
        negShare * 0.30,
        clamp01(activeAlerts.length / 5) * 0.20,
        clamp01(emerging.length / 3) * 0.20,
    ];
    const riskScore = Math.round(components.reduce((a, b) => a + b, 0) * 100);
    const riskBand = riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";

    inferences.push({
        kind: "risk_score",
        label: "Heuristic composite risk score. NOT scientifically validated.",
        score: riskScore,
        band: riskBand,
        components: components.map((c) => Number(c.toFixed(3))),
    });

    // PREDICTIONS — labeled with confidence, time-bound.
    if (ratio >= 2) {
        predictions.push({
            kind: "volume_continuation",
            label: "If the current pace persists, volume in the next window is likely to be elevated.",
            confidence: clamp01(0.5 + 0.1 * (ratio - 2)),
            timeframe: "next 24h",
            evidence: ["volume_ratio", "signals_table_query"],
        });
    }
    if (negShare >= 0.5 && ratio >= 1.25) {
        predictions.push({
            kind: "sentiment_escalation",
            label: "Concentrated negative sentiment combined with rising volume may indicate an emerging issue.",
            confidence: clamp01(0.4 + 0.2 * (negShare - 0.5)),
            timeframe: "next 24-72h",
            evidence: ["sentiment_breakdown", "volume_ratio"],
        });
    }

    // RECOMMENDATIONS — gated, never auto-execute.
    if (riskBand === "high" || riskBand === "critical") {
        recommendations.push({
            action: "investigate",
            label: "Investigate the high-risk signals contributing to the score.",
            confidence: 0.7,
            evidence: ["risk_score", "active_alerts"],
            requiresApproval: true,
        });
    }
    if (activeAlerts.length > 0) {
        recommendations.push({
            action: "review_alerts",
            label: `Review the ${activeAlerts.length} active alert(s) in the alert center.`,
            confidence: 0.8,
            evidence: ["active_alerts"],
            requiresApproval: true,
        });
    }
    if (emerging.length > 0) {
        recommendations.push({
            action: "monitor",
            label: `Continue monitoring the ${emerging.length} emerging narrative cluster(s) for further momentum.`,
            confidence: 0.6,
            evidence: ["emerging_narratives"],
            requiresApproval: true,
        });
    }

    return {
        label: "narrative_intelligence",
        status: "ok",
        riskScore,
        riskBand,
        facts,
        inferences,
        predictions,
        recommendations,
        evidence,
        generatedAt: new Date().toISOString(),
        windowHours,
    };
}
