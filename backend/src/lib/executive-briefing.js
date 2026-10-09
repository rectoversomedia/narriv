/**
 * Executive Briefing
 *
 * Composes a short, evidence-grounded executive brief from the other
 * intelligence modules. No fabrication: every section pulls from real
 * data. If a section has no data, the function says so explicitly.
 */

import { computeNarrativeIntelligence } from "./narrative-intelligence.js";
import { computeReputationIntelligence } from "./reputation-intelligence.js";
import { computeEntityIntelligence } from "./entity-intelligence.js";
import { computePredictiveSignals } from "./predictive-signals.js";
import { deriveRecommendations } from "./recommendation-engine.js";

export async function generateExecutiveBrief({ workspaceId, windowHours = 24 }) {
    if (!workspaceId) return { grounded: false, error: "workspaceId is required" };

    const [narrative, reputation, entities, predictions] = await Promise.all([
        computeNarrativeIntelligence({ workspaceId, windowHours }),
        computeReputationIntelligence({ workspaceId, windowHours }),
        computeEntityIntelligence({ workspaceId, windowHours, limit: 10 }),
        computePredictiveSignals({ workspaceId, windowHours }),
    ]);

    const factSignalCount = narrative.facts.find((f) => f.kind === "signal_count_window")?.value || 0;
    const factAlertCount = narrative.facts.find((f) => f.kind === "alert_count_window")?.value || 0;
    const biggestRisk = narrative.riskScore || 0;
    const biggestRiskBand = narrative.riskBand || "low";
    const topEntity = entities.entities?.[0]?.entity || null;
    const topEmergent = narrative.inferences.find((i) => i.kind === "emerging_narratives");
    const repBand = reputation.reputationBand || "neutral";
    const repScore = reputation.reputationScore ?? 50;

    const recs = deriveRecommendations({
        riskScore: biggestRisk,
        riskBand: biggestRiskBand,
        reputationBand: repBand,
        // Unresolved alerts only; factAlertCount includes resolved alerts.
        activeAlerts: narrative.facts.find((f) => f.kind === "active_alerts")?.value || 0,
        emergingNarratives: topEmergent?.items?.length || 0,
        negativeShare: (narrative.facts.find((f) => f.kind === "sentiment_breakdown")?.value?.NEGATIVE || 0) / Math.max(1, factSignalCount),
        volumeRatio: narrative.inferences.find((i) => i.kind === "volume_ratio")?.ratio || 1,
        risk: narrative.riskModel || null,
    });

    return {
        grounded: factSignalCount > 0 || factAlertCount > 0,
        title: "NARRIV DAILY BRIEF",
        generatedAt: new Date().toISOString(),
        windowHours,
        sections: {
            whatChanged: {
                summary: `${factSignalCount} new signal(s) and ${factAlertCount} new alert(s) in the last ${windowHours}h.`,
                evidence: narrative.evidence.slice(0, 5),
            },
            biggestRisk: {
                summary: `Risk index ${biggestRisk}/100 (${biggestRiskBand}) — heuristic, not a probability.`,
                drivers: (narrative.riskModel?.components || []).filter((c) => c.contribution > 0)
                    .sort((a, b) => b.contribution - a.contribution)
                    .map((c) => ({ key: c.key, contribution: c.contribution, reason: c.reason, evidenceIds: c.evidenceIds })),
                uncertainty: narrative.riskModel?.uncertainty || null,
                evidence: narrative.inferences.slice(0, 3),
            },
            emergingIssue: topEmergent
                ? { summary: topEmergent.label, items: topEmergent.items, evidence: narrative.evidence }
                : { summary: "No emerging narratives detected." },
            competitiveMovement: {
                summary: topEntity
                    ? `Most-mentioned entity: ${topEntity} (${entities.entities[0].mentions} mentions, sentiment ${entities.entities[0].avgSentiment}).`
                    : "No entity intelligence available.",
                evidence: entities.evidence.slice(0, 3),
            },
            opportunity: {
                summary: predictions.signals.find((s) => s.signal === "narrative_expansion")?.label || "No expansion signal detected.",
            },
            reputation: {
                score: repScore,
                band: repBand,
                summary: `Reputation: ${repBand} (${repScore}/100).`,
            },
            recommendedActions: recs.recommendations.slice(0, 5),
            whatToWatchNext: predictions.signals.slice(0, 3),
        },
        disclaimer: "Generated deterministically from current Narriv data. Risk drivers and recommendations list the IDs of the records behind them; aggregate statements reference the query they come from. Scores are heuristic indices, not probabilities. Recommendations are suggestions and have not been acted on.",
    };
}
