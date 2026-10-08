/**
 * Recommendation Engine
 *
 * Produces actionable recommendations grounded in the other intelligence
 * modules. NEVER auto-executes external actions — every recommendation
 * requires human approval (per program rule).
 *
 * Each recommendation:
 *   { action, reason, priority, urgency, expectedOutcome, evidence, confidence, requiresApproval: true }
 *
 * Action types follow the program specification:
 *   monitor, investigate, escalate, prepare_response, prepare_clarification,
 *   prepare_statement, brief_spokesperson, engage_media, prepare_social,
 *   adjust_campaign, monitor_competitor, escalate_internal
 */

function priorityFromScore(score) {
    if (score >= 75) return "critical";
    if (score >= 50) return "high";
    if (score >= 25) return "medium";
    return "low";
}

function urgencyFromBand(band) {
    if (band === "critical") return "immediate";
    if (band === "high") return "today";
    if (band === "medium") return "this_week";
    return "monitor";
}

export function deriveRecommendations({ riskScore = 0, riskBand = "low", reputationBand = "neutral", activeAlerts = 0, emergingNarratives = 0, negativeShare = 0, volumeRatio = 1 }) {
    const out = [];
    const evidence = [];

    if (riskBand === "critical" || activeAlerts >= 3) {
        out.push({
            action: "escalate_internal",
            reason: "Critical risk score or multiple active alerts warrant immediate internal escalation.",
            priority: priorityFromScore(Math.max(riskScore, 75)),
            urgency: "immediate",
            expectedOutcome: "Decision-maker is briefed within 1h and the situation is assigned an owner.",
            evidence: ["risk_score", "active_alerts"],
            confidence: 0.8,
            requiresApproval: true,
        });
    }

    if (riskBand === "high" || riskBand === "critical") {
        out.push({
            action: "investigate",
            reason: "Elevated risk score; an investigator should examine the contributing signals.",
            priority: priorityFromScore(riskScore),
            urgency: urgencyFromBand(riskBand),
            expectedOutcome: "Root cause is identified within 24h or the risk is downgraded.",
            evidence: ["risk_score"],
            confidence: 0.7,
            requiresApproval: true,
        });
    }

    if (negativeShare >= 0.5) {
        out.push({
            action: "prepare_clarification",
            reason: "More than half of recent signals are negative. A clarification may pre-empt further escalation.",
            priority: "high",
            urgency: "today",
            expectedOutcome: "Clarification draft is ready for review before any external amplification.",
            evidence: ["sentiment_breakdown"],
            confidence: 0.65,
            requiresApproval: true,
        });
    }

    if (emergingNarratives > 0) {
        out.push({
            action: "monitor",
            reason: `${emergingNarratives} emerging narrative cluster(s) detected. Continue monitoring for further momentum.`,
            priority: "medium",
            urgency: "this_week",
            expectedOutcome: "Continued observation produces an updated brief within 24h.",
            evidence: ["narrative_clusters_table_query"],
            confidence: 0.6,
            requiresApproval: true,
        });
    }

    if (reputationBand === "at_risk" || reputationBand === "critical") {
        out.push({
            action: "prepare_statement",
            reason: "Reputation has declined; prepare a statement draft in case the situation escalates.",
            priority: "high",
            urgency: "today",
            expectedOutcome: "Statement draft is ready for executive review.",
            evidence: ["reputation_intelligence"],
            confidence: 0.7,
            requiresApproval: true,
        });
        out.push({
            action: "brief_spokesperson",
            reason: "Reputation decline requires spokesperson alignment.",
            priority: "medium",
            urgency: "this_week",
            expectedOutcome: "Spokesperson is briefed and aligned with current narrative position.",
            evidence: ["reputation_intelligence"],
            confidence: 0.6,
            requiresApproval: true,
        });
    }

    if (volumeRatio >= 2) {
        out.push({
            action: "investigate",
            reason: "Volume has doubled; the source mix may have shifted. Investigate before responding.",
            priority: "medium",
            urgency: "this_week",
            expectedOutcome: "Source mix is mapped; whether the increase is organic or coordinated is determined.",
            evidence: ["volume_ratio"],
            confidence: 0.55,
            requiresApproval: true,
        });
    }

    if (out.length === 0) {
        out.push({
            action: "monitor",
            reason: "No risk signals elevated. Continue routine monitoring.",
            priority: "low",
            urgency: "monitor",
            expectedOutcome: "Next scheduled intelligence run.",
            evidence: ["risk_score"],
            confidence: 0.5,
            requiresApproval: true,
        });
    }

    for (const r of out) {
        evidence.push({ type: "recommendation", action: r.action });
    }

    return { recommendations: out, evidence };
}
