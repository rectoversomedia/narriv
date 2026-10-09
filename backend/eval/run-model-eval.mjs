#!/usr/bin/env node
/**
 * Semantic model evaluation against the versioned reference set.
 *
 * Arms:
 *   current — production analysis path (POST /api/ai/analyze, gpt-4o-mini)
 *   premium — only if /api/ai/providers reports a configured provider routed to
 *             the premium tier; otherwise recorded as "not run" with the reason
 *
 * Metrics:
 *   consistency  agreement of fresh predictions with the stored production
 *                prediction (stability, NOT accuracy)
 *   accuracy     per-class precision/recall/F1 (sentiment), severity accuracy,
 *                cluster-pair precision/recall — ONLY over human-reviewed items;
 *                reported as insufficient below 30 reviewed items
 *   latency      measured per request; cost from token_usage rows written
 *                during the run (requires SUPABASE_URL/SUPABASE_SERVICE_KEY)
 *
 * Usage: NARRIV_API_URL=https://narriv-api.vercel.app/api node eval/run-model-eval.mjs [--limit N]
 * Runs against the demo workspace; ~13s between requests to respect the AI rate limit.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(here, "reference", "reference-set.ref-v1.json");
const API = process.env.NARRIV_API_URL || "https://narriv-api.vercel.app/api";
const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || Infinity;
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS || 13000);
const MIN_REVIEWED = 30;

const ref = JSON.parse(fs.readFileSync(REF, "utf8"));
const items = ref.items.slice(0, limit);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (v) => (v == null ? null : String(v).toLowerCase());

async function demoToken() {
    const r = await fetch(`${API}/auth/demo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    return (await r.json()).accessToken;
}

export function classMetrics(pairs) {
    // pairs: [{ expected, predicted }]
    const classes = [...new Set(pairs.flatMap((p) => [p.expected, p.predicted]).filter(Boolean))];
    const per = {};
    for (const c of classes) {
        const tp = pairs.filter((p) => p.predicted === c && p.expected === c).length;
        const fp = pairs.filter((p) => p.predicted === c && p.expected !== c).length;
        const fn = pairs.filter((p) => p.predicted !== c && p.expected === c).length;
        const precision = tp + fp ? tp / (tp + fp) : null;
        const recall = tp + fn ? tp / (tp + fn) : null;
        const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : precision === 0 || recall === 0 ? 0 : null;
        per[c] = { tp, fp, fn, precision, recall, f1 };
    }
    const f1s = Object.values(per).map((m) => m.f1).filter((x) => x != null);
    return { n: pairs.length, perClass: per, macroF1: f1s.length ? f1s.reduce((a, b) => a + b, 0) / f1s.length : null };
}

const pct = (arr, q) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

async function runCurrentArm(token) {
    const out = [];
    for (const [i, it] of items.entries()) {
        if (i > 0) await sleep(PAUSE_MS);
        const started = Date.now();
        const r = await fetch(`${API}/ai/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: it.title, content: it.snippet || it.title }),
        });
        const latencyMs = Date.now() - started;
        const body = await r.json().catch(() => ({}));
        out.push({
            id: it.id,
            status: r.status,
            latencyMs,
            model: body.meta?.model || null,
            sentiment: norm(body.result?.sentiment),
            impact: norm(body.result?.impact),
            error: r.ok ? null : body.error || `HTTP ${r.status}`,
        });
        process.stderr.write(`current ${i + 1}/${items.length} ${r.status} ${latencyMs}ms\n`);
    }
    return out;
}

async function measuredCost(sinceIso) {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { available: false, reason: "SUPABASE credentials not provided" };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/token_usage?select=model,input_tokens,output_tokens&operation=eq.interactive_analysis&created_at=gte.${sinceIso}`, {
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    const rows = await r.json();
    const { calculateCost } = await import("../src/lib/token-tracking.js");
    const cost = rows.reduce((s, x) => s + calculateCost(x.model, x.input_tokens, x.output_tokens), 0);
    return {
        available: true,
        calls: rows.length,
        inputTokens: rows.reduce((s, x) => s + x.input_tokens, 0),
        outputTokens: rows.reduce((s, x) => s + x.output_tokens, 0),
        totalUsd: Number(cost.toFixed(6)),
        perCallUsd: rows.length ? Number((cost / rows.length).toFixed(6)) : null,
    };
}

function summarize(preds) {
    const ok = preds.filter((p) => !p.error);
    const byId = new Map(items.map((it) => [it.id, it]));
    const agreeS = ok.filter((p) => p.sentiment === byId.get(p.id).production.sentiment).length;
    const agreeI = ok.filter((p) => p.impact === byId.get(p.id).production.impact).length;
    const reviewedS = ok.filter((p) => byId.get(p.id).review?.sentiment).map((p) => ({ expected: norm(byId.get(p.id).review.sentiment), predicted: p.sentiment }));
    const reviewedSev = ok.filter((p) => byId.get(p.id).review?.severity).map((p) => ({ expected: norm(byId.get(p.id).review.severity), predicted: p.impact }));
    return {
        requests: preds.length,
        errors: preds.length - ok.length,
        models: [...new Set(ok.map((p) => p.model))],
        consistency: {
            note: "agreement with the stored production prediction (stability, not accuracy)",
            sentiment: ok.length ? Number((agreeS / ok.length).toFixed(3)) : null,
            impact: ok.length ? Number((agreeI / ok.length).toFixed(3)) : null,
        },
        accuracy: {
            reviewedSentiment: reviewedS.length,
            reviewedSeverity: reviewedSev.length,
            sufficient: reviewedS.length >= MIN_REVIEWED,
            sentiment: reviewedS.length ? classMetrics(reviewedS) : null,
            severityAccuracy: reviewedSev.length ? reviewedSev.filter((p) => p.expected === p.predicted).length / reviewedSev.length : null,
            note: reviewedS.length < MIN_REVIEWED ? `Only ${reviewedS.length} human-reviewed items; at least ${MIN_REVIEWED} are needed before accuracy metrics are meaningful.` : null,
        },
        latencyMs: { p50: pct(ok.map((p) => p.latencyMs), 0.5), p95: pct(ok.map((p) => p.latencyMs), 0.95) },
    };
}

function clusterPairMetrics() {
    const reviewed = ref.clusterPairs.filter((p) => p.review?.sameNarrative != null);
    if (!reviewed.length) return { reviewedPairs: 0, note: "No human-reviewed cluster pairs yet." };
    const tp = reviewed.filter((p) => p.predictedSameNarrative && p.review.sameNarrative).length;
    const fp = reviewed.filter((p) => p.predictedSameNarrative && !p.review.sameNarrative).length;
    const fn = reviewed.filter((p) => !p.predictedSameNarrative && p.review.sameNarrative).length;
    return { reviewedPairs: reviewed.length, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const startedAt = new Date().toISOString();
    const token = await demoToken();
    const providers = await (await fetch(`${API}/ai/providers`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const premiumRouted = providers?.providers?.anthropic?.configured && (providers?.tiers || []).some((t) => t.name === "premium");

    const current = await runCurrentArm(token);
    const report = {
        referenceSet: ref.version,
        items: items.length,
        startedAt,
        finishedAt: new Date().toISOString(),
        arms: {
            current: { ...summarize(current), cost: await measuredCost(startedAt) },
            premium: premiumRouted
                ? { status: "not implemented in harness for this run" }
                : { status: "not run", reason: "premium tier not configured in production (Anthropic key and/or AI_MODEL_PREMIUM missing)" },
        },
        clusterPairs: clusterPairMetrics(),
        predictions: { current },
    };
    const outDir = path.join(here, "results");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `model-eval-${ref.version}-${startedAt.slice(0, 10)}.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
    const { predictions, ...summary } = report;
    console.log(JSON.stringify(summary, null, 2));
    console.log(`written ${path.relative(process.cwd(), outFile)}`);
}
