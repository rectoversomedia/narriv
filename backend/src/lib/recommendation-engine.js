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

import { tr } from "./request-context.js";

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

export function deriveRecommendations({ riskScore = 0, riskBand = "low", reputationBand = "neutral", activeAlerts = 0, emergingNarratives = 0, negativeShare = 0, volumeRatio = 1, risk = null }) {
    const out = [];
    const evidence = [];

    if (riskBand === "critical" || activeAlerts >= 3) {
        out.push({
            action: "escalate_internal",
            reason: tr("Critical risk score or multiple active alerts warrant immediate internal escalation.", "Skor risiko kritis atau beberapa peringatan aktif perlu segera dieskalasi secara internal."),
            priority: priorityFromScore(Math.max(riskScore, 75)),
            urgency: "immediate",
            expectedOutcome: tr("Decision-maker is briefed within 1h and the situation is assigned an owner.", "Pengambil keputusan mendapat briefing dalam 1 jam dan situasi ini punya penanggung jawab."),
            evidence: ["risk_score", "active_alerts"],
            confidence: 0.8,
            requiresApproval: true,
        });
    }

    if (riskBand === "high" || riskBand === "critical") {
        out.push({
            action: "investigate",
            reason: tr("Elevated risk score; an investigator should examine the contributing mentions.", "Skor risiko meningkat; perlu ada yang memeriksa percakapan-percakapan pemicunya."),
            priority: priorityFromScore(riskScore),
            urgency: urgencyFromBand(riskBand),
            expectedOutcome: tr("Root cause is identified within 24h or the risk is downgraded.", "Akar masalah teridentifikasi dalam 24 jam atau tingkat risikonya diturunkan."),
            evidence: ["risk_score"],
            confidence: 0.7,
            requiresApproval: true,
        });
    }

    if (negativeShare >= 0.5) {
        out.push({
            action: "prepare_clarification",
            reason: tr("More than half of recent mentions are negative. A clarification may pre-empt further escalation.", "Lebih dari separuh percakapan terbaru bernada negatif. Klarifikasi bisa mencegah eskalasi lebih lanjut."),
            priority: "high",
            urgency: "today",
            expectedOutcome: tr("Clarification draft is ready for review before any external amplification.", "Draf klarifikasi siap ditinjau sebelum isu makin menyebar."),
            evidence: ["sentiment_breakdown"],
            confidence: 0.65,
            requiresApproval: true,
        });
    }

    if (emergingNarratives > 0) {
        out.push({
            action: "monitor",
            reason: tr(`${emergingNarratives} emerging narrative cluster(s) detected. Continue monitoring for further momentum.`, `${emergingNarratives} klaster narasi baru terdeteksi. Lanjutkan pemantauan untuk melihat perkembangannya.`),
            priority: "medium",
            urgency: "this_week",
            expectedOutcome: tr("Continued observation produces an updated brief within 24h.", "Pemantauan lanjutan menghasilkan briefing terbaru dalam 24 jam."),
            evidence: ["narrative_clusters_table_query"],
            confidence: 0.6,
            requiresApproval: true,
        });
    }

    if (reputationBand === "at_risk" || reputationBand === "critical") {
        out.push({
            action: "prepare_statement",
            reason: tr("Reputation has declined; prepare a statement draft in case the situation escalates.", "Reputasi menurun; siapkan draf pernyataan kalau situasinya membesar."),
            priority: "high",
            urgency: "today",
            expectedOutcome: tr("Statement draft is ready for executive review.", "Draf pernyataan siap ditinjau pimpinan."),
            evidence: ["reputation_intelligence"],
            confidence: 0.7,
            requiresApproval: true,
        });
        out.push({
            action: "brief_spokesperson",
            reason: tr("Reputation decline requires spokesperson alignment.", "Penurunan reputasi perlu penyelarasan juru bicara."),
            priority: "medium",
            urgency: "this_week",
            expectedOutcome: tr("Spokesperson is briefed and aligned with current narrative position.", "Juru bicara mendapat briefing dan selaras dengan posisi narasi saat ini."),
            evidence: ["reputation_intelligence"],
            confidence: 0.6,
            requiresApproval: true,
        });
    }

    if (volumeRatio >= 2) {
        out.push({
            action: "investigate",
            reason: tr("Volume has doubled; the source mix may have shifted. Investigate before responding.", "Volume naik dua kali lipat; komposisi sumber mungkin berubah. Selidiki dulu sebelum merespons."),
            priority: "medium",
            urgency: "this_week",
            expectedOutcome: tr("Source mix is mapped; whether the increase is organic or coordinated is determined.", "Komposisi sumber terpetakan; jelas apakah kenaikannya organik atau terkoordinasi."),
            evidence: ["volume_ratio"],
            confidence: 0.55,
            requiresApproval: true,
        });
    }

    if (out.length === 0) {
        out.push({
            action: "monitor",
            reason: tr("No risk mentions elevated. Continue routine monitoring.", "Tidak ada percakapan risiko yang meningkat. Lanjutkan pemantauan rutin."),
            priority: "low",
            urgency: "monitor",
            expectedOutcome: tr("Next scheduled intelligence run.", "Run intelijen terjadwal berikutnya."),
            evidence: ["risk_score"],
            confidence: 0.5,
            requiresApproval: true,
        });
    }

    const grounded = risk ? out.map((r) => groundRecommendation(r, risk)) : out;
    for (const r of grounded) {
        evidence.push({ type: "recommendation", action: r.action });
    }

    return { recommendations: grounded, evidence };
}

// Evidence tag -> risk-model components whose records support it.
const TAG_COMPONENTS = {
    risk_score: ["negative_share", "severity", "active_alerts", "narrative_momentum"],
    active_alerts: ["active_alerts"],
    sentiment_breakdown: ["negative_share"],
    reputation_intelligence: ["negative_share", "severity"],
    narrative_clusters_table_query: ["narrative_momentum"],
    emerging_narratives: ["narrative_momentum"],
    volume_ratio: ["volume_change"],
};

const MONITOR_NEXT = {
    escalate_internal: ["Unresolved alert count and negative share in the next run.", "Jumlah peringatan yang belum selesai dan porsi negatif di run berikutnya."],
    investigate: ["Whether the cited mentions are followed by more coverage from additional sources.", "Apakah percakapan yang dirujuk diikuti pemberitaan dari sumber lain."],
    prepare_clarification: ["Negative share and the narratives behind the cited mentions.", "Porsi negatif dan narasi di balik percakapan yang dirujuk."],
    monitor: ["Velocity and mention count of the cited narrative clusters.", "Kecepatan dan jumlah percakapan di klaster narasi yang dirujuk."],
    prepare_statement: ["Reputation band and negative share in the next run.", "Tingkat reputasi dan porsi negatif di run berikutnya."],
    brief_spokesperson: ["Media pickup of the cited mentions.", "Seberapa banyak media mengangkat percakapan yang dirujuk."],
};

/**
 * Attach the real record IDs, the observed issue and limitations to a
 * recommendation, and derive confidence from the evidence instead of a fixed
 * number. Recommendations are suggestions only; nothing is executed.
 */
export function groundRecommendation(rec, risk) {
    const keys = [...new Set((rec.evidence || []).flatMap((tag) => TAG_COMPONENTS[tag] || []))];
    const components = (risk.components || []).filter((c) => keys.includes(c.key));
    const sourceIds = [...new Set(components.flatMap((c) => c.evidenceIds || []))].slice(0, 10);
    const observedIssue = components.filter((c) => c.contribution > 0).map((c) => c.reason).join(" ")
        || tr("No elevated risk component; routine monitoring.", "Tidak ada komponen risiko yang meningkat; pemantauan rutin.");

    const limitations = [...(risk.uncertainty?.reasons || [])];
    let confidence = rec.confidence;
    if (risk.uncertainty?.level === "high") confidence *= 0.7;
    else if (risk.uncertainty?.level === "medium") confidence *= 0.85;
    if (sourceIds.length === 0 && rec.action !== "monitor") {
        confidence = Math.min(confidence, 0.4);
        limitations.push(tr("No individual records directly support this recommendation; it is based on aggregate metrics.", "Tidak ada catatan spesifik yang mendukung rekomendasi ini; dasarnya metrik agregat."));
    }

    return {
        ...rec,
        status: "suggested",
        observedIssue,
        whyItMatters: rec.reason,
        recommendedAction: rec.action,
        sourceIds,
        confidence: Number(confidence.toFixed(2)),
        confidenceBasis: `risk model ${risk.version}, uncertainty ${risk.uncertainty?.level || "unknown"}, ${sourceIds.length} supporting record(s)`,
        limitations,
        monitorNext: MONITOR_NEXT[rec.action] ? tr(...MONITOR_NEXT[rec.action]) : tr("Re-run the intelligence brief after the next ingestion.", "Jalankan ulang briefing intelijen setelah pengambilan data berikutnya."),
    };
}
