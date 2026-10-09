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

import { computeRisk } from "./risk-model.js";
import { deriveRecommendations } from "./recommendation-engine.js";
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
            .select("id, sentiment, severity, platform, captured_at, source_id")
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
            .select("id, title, signal_count, momentum:velocity, updated_at, created_at")
            .eq("workspace_id", workspaceId)
            .order("velocity", { ascending: false, nullsFirst: false })
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

    // Explainable risk model: every component carries its reason and evidence IDs.
    const risk = computeRisk({ signals: signalsRecent, priorCount: signalsPrev.length, alerts, clusters });
    const volume = risk.components.find((c) => c.key === "volume_change");
    const ratio = volume.inputs.ratio; // null when there is no baseline window

    inferences.push({
        kind: "volume_ratio",
        label: ratio === null
            ? "No signals in the previous window; volume change cannot be assessed yet."
            : ratio >= 2
                ? "Mention volume has doubled or more vs the prior window."
                : ratio >= 1.25
                    ? "Mention volume is moderately elevated."
                    : ratio <= 0.5
                        ? "Mention volume has dropped vs the prior window."
                        : "Mention volume is stable.",
        ratio,
        current: signalsRecent.length,
        prior: signalsPrev.length,
    });
    evidence.push({ type: "signals_table_query", since: sinceIso, count: signalsRecent.length });

    const negShare = clamp01(sentimentCounts.NEGATIVE / signalsRecent.length);
    inferences.push({
        kind: "negative_sentiment_share",
        label: negShare >= 0.5
            ? "More than half of recent signals are negative."
            : negShare >= 0.25
                ? "A meaningful share of recent signals are negative."
                : "Negative sentiment is not dominant in the window.",
        value: Number(negShare.toFixed(2)),
        signalIds: risk.components.find((c) => c.key === "negative_share").evidenceIds,
    });

    // Emerging narratives: clusters above the (0-100) velocity threshold.
    const emerging = risk.emergingClusters.slice(0, 5).map((c) => ({
        clusterId: c.id, title: c.title, momentum: c.velocity, signalCount: c.signalCount,
    }));
    if (emerging.length > 0) {
        inferences.push({
            kind: "emerging_narratives",
            label: `${emerging.length} narrative cluster(s) currently showing elevated momentum.`,
            items: emerging,
        });
        for (const e of emerging) evidence.push({ type: "narrative_cluster", id: e.clusterId });
    }

    const activeAlerts = alerts.filter((a) => a.status !== "resolved");
    if (activeAlerts.length > 0) {
        facts.push({ kind: "active_alerts", value: activeAlerts.length });
        for (const a of activeAlerts.slice(0, 5)) evidence.push({ type: "alert", id: a.id });
    }

    const riskScore = risk.score;
    const riskBand = risk.band;
    inferences.push({
        kind: "risk_score",
        label: "Heuristic composite risk index (0-100). Not a probability and not empirically calibrated.",
        score: riskScore,
        band: riskBand,
        modelVersion: risk.version,
        components: risk.components,
        uncertainty: risk.uncertainty,
    });

    // PREDICTIONS — labeled with confidence, time-bound.
    if (ratio !== null && ratio >= 2) {
        predictions.push({
            kind: "volume_continuation",
            label: "If the current pace persists, volume in the next window is likely to be elevated.",
            confidence: clamp01(0.5 + 0.1 * (ratio - 2)),
            timeframe: "next 24h",
            evidence: ["volume_ratio", "signals_table_query"],
        });
    }
    if (negShare >= 0.5 && ratio !== null && ratio >= 1.25) {
        predictions.push({
            kind: "sentiment_escalation",
            label: "Concentrated negative sentiment combined with rising volume may indicate an emerging issue.",
            confidence: clamp01(0.4 + 0.2 * (negShare - 0.5)),
            timeframe: "next 24-72h",
            evidence: ["sentiment_breakdown", "volume_ratio"],
        });
    }

    // RECOMMENDATIONS — gated, never auto-executed; each cites real record IDs.
    recommendations.push(...deriveRecommendations({
        riskScore,
        riskBand,
        activeAlerts: activeAlerts.length,
        emergingNarratives: emerging.length,
        negativeShare: negShare,
        volumeRatio: ratio ?? 1,
        risk,
    }).recommendations);

    return {
        label: "narrative_intelligence",
        status: "ok",
        riskScore,
        riskBand,
        riskModel: {
            version: risk.version,
            components: risk.components,
            uncertainty: risk.uncertainty,
            limitations: risk.limitations,
            sourceIds: risk.sourceIds,
        },
        facts,
        inferences,
        predictions,
        recommendations,
        evidence,
        generatedAt: new Date().toISOString(),
        windowHours,
    };
}
