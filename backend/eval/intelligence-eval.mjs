#!/usr/bin/env node
/**
 * Intelligence evaluation (deterministic, no AI calls, no database).
 *
 * Runs fixed synthetic scenarios through the risk model and recommendation
 * engine and reports structural quality metrics. Compare runs across model or
 * scoring changes with:   node eval/intelligence-eval.mjs --compare
 *
 * What this measures: traceability (every cited ID exists in the input),
 * unsupported recommendations, expected risk bands, determinism.
 * What it does NOT measure: semantic accuracy of AI-generated analysis —
 * that needs a labeled eval set with human judgments.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { computeRisk, RISK_MODEL_VERSION } from "../src/lib/risk-model.js";
import { deriveRecommendations } from "../src/lib/recommendation-engine.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(here, "intelligence-eval.baseline.json");

const s = (id, sentiment, severity = "low") => ({ id, sentiment, severity });
const SCENARIOS = [
    { name: "quiet_positive", expectBands: ["low"], input: { signals: [s("p1", "POSITIVE"), s("p2", "NEUTRAL"), s("p3", "POSITIVE")], priorCount: 3, alerts: [], clusters: [] } },
    { name: "first_window_no_baseline", expectBands: ["low", "medium"], input: { signals: [s("n1", "NEUTRAL"), s("n2", "POSITIVE")], priorCount: 0, alerts: [], clusters: [] } },
    { name: "negative_spike_with_alert", expectBands: ["high", "critical"], input: {
        signals: Array.from({ length: 12 }, (_, i) => s(`x${i}`, i < 9 ? "NEGATIVE" : "NEUTRAL", i < 4 ? "high" : "low")),
        priorCount: 4, alerts: [{ id: "al1", severity: "critical", status: "open" }, { id: "al2", severity: "high", status: "open" }],
        clusters: [{ id: "cl1", velocity: 88 }, { id: "cl2", velocity: 91 }] } },
    { name: "resolved_alerts_only", expectBands: ["low", "medium"], input: { signals: [s("r1", "NEGATIVE"), s("r2", "NEUTRAL"), s("r3", "POSITIVE"), s("r4", "NEUTRAL")], priorCount: 4, alerts: [{ id: "old", severity: "critical", status: "resolved" }], clusters: [] } },
    { name: "momentum_without_negativity", expectBands: ["low", "medium"], input: { signals: [s("m1", "POSITIVE"), s("m2", "POSITIVE"), s("m3", "NEUTRAL")], priorCount: 3, alerts: [], clusters: [{ id: "cm", velocity: 95 }, { id: "cl", velocity: 40 }] } },
    { name: "unanalyzed_signals", expectBands: ["low"], input: { signals: [s("u1", null), s("u2", null)], priorCount: 2, alerts: [], clusters: [] } },
];

function evaluate(sc) {
    const risk = computeRisk(sc.input);
    const known = new Set([...sc.input.signals, ...sc.input.alerts, ...sc.input.clusters].map((x) => x.id));
    const negShare = sc.input.signals.filter((x) => x.sentiment === "NEGATIVE").length / Math.max(1, sc.input.signals.length);
    const vol = risk.components.find((c) => c.key === "volume_change")?.inputs?.ratio;
    const { recommendations } = deriveRecommendations({
        riskScore: risk.score, riskBand: risk.band,
        activeAlerts: sc.input.alerts.filter((a) => a.status !== "resolved").length,
        emergingNarratives: risk.emergingClusters.length, negativeShare: negShare, volumeRatio: vol ?? 1, risk,
    });
    const cited = [...risk.sourceIds, ...recommendations.flatMap((r) => r.sourceIds || [])];
    const invalidIds = cited.filter((id) => !known.has(id));
    const unsupported = recommendations.filter((r) => r.action !== "monitor" && (r.sourceIds || []).length === 0);
    const rerun = computeRisk(sc.input);
    return {
        scenario: sc.name,
        score: risk.score,
        band: risk.band,
        bandOk: sc.expectBands.includes(risk.band),
        uncertainty: risk.uncertainty.level,
        recommendations: recommendations.map((r) => r.action),
        citedIds: cited.length,
        invalidCitedIds: invalidIds.length,
        unsupportedRecommendations: unsupported.length,
        deterministic: JSON.stringify(rerun) === JSON.stringify(risk),
    };
}

const results = SCENARIOS.map(evaluate);
const summary = {
    riskModelVersion: RISK_MODEL_VERSION,
    scenarios: results.length,
    bandAccuracy: `${results.filter((r) => r.bandOk).length}/${results.length}`,
    invalidCitedIds: results.reduce((a, r) => a + r.invalidCitedIds, 0),
    unsupportedRecommendations: results.reduce((a, r) => a + r.unsupportedRecommendations, 0),
    allDeterministic: results.every((r) => r.deterministic),
};

console.table(results.map(({ recommendations, ...r }) => ({ ...r, recommendations: recommendations.join(",") })));
console.log(JSON.stringify(summary, null, 2));

if (process.argv.includes("--write-baseline")) {
    fs.writeFileSync(BASELINE, JSON.stringify({ summary, results }, null, 2) + "\n");
    console.log(`baseline written: ${path.relative(process.cwd(), BASELINE)}`);
}
if (process.argv.includes("--compare") && fs.existsSync(BASELINE)) {
    const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    const changed = results.filter((r) => {
        const b = base.results.find((x) => x.scenario === r.scenario);
        return !b || b.score !== r.score || b.band !== r.band || b.recommendations.join() !== r.recommendations.join();
    });
    console.log(changed.length ? `CHANGED vs baseline (${base.summary.riskModelVersion}): ${changed.map((c) => c.scenario).join(", ")}` : `No changes vs baseline (${base.summary.riskModelVersion}).`);
}
process.exitCode = summary.invalidCitedIds === 0 && summary.allDeterministic && results.every((r) => r.bandOk) ? 0 : 1;
