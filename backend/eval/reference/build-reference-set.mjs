#!/usr/bin/env node
/**
 * Build the versioned reference set for semantic evaluation.
 *
 * Source: REAL, source-backed signals (url or raw document present) from the
 * DEMO workspace only, so no customer workspace data or monitored brands are
 * written to this (public) repository. Each item carries the production
 * prediction at build time and EMPTY human-review fields.
 *
 * Human review fills `review.*`; metrics are computed only on reviewed items.
 *
 * Usage (credentials are read from the environment, never written):
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node eval/reference/build-reference-set.mjs [--max 40]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DEMO_WORKSPACE_ID = "56bc14ee-5f16-4134-9828-a240f3c72240";
const VERSION = "ref-v1";
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, `reference-set.${VERSION}.json`);
const max = Number(process.argv[process.argv.indexOf("--max") + 1]) || 40;

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment.");
    process.exit(1);
}
const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
const get = async (q) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
};

const signals = await get(
    `signals?select=id,title,content,url,published_at,captured_at,sentiment,severity,signal_analyses(analysis,model,confidence),narrative_cluster_signals(cluster_id)` +
    `&workspace_id=eq.${DEMO_WORKSPACE_ID}&or=(url.not.is.null,raw_document_id.not.is.null)&order=captured_at.desc&limit=500`,
);

const items = signals
    .filter((s) => s.signal_analyses?.length)
    .map((s) => {
        const a = s.signal_analyses[0].analysis || {};
        return {
            id: s.id,
            title: s.title,
            snippet: String(s.content || "").replace(/\s*\(AI Summary:[\s\S]*$/, "").slice(0, 240),
            urlHost: s.url ? new URL(s.url).host : null,
            publishedAt: s.published_at,
            production: {
                model: s.signal_analyses[0].model,
                sentiment: String(a.sentiment || "").toLowerCase() || null,
                impact: String(a.impact || "").toLowerCase() || null,
                confidence: s.signal_analyses[0].confidence ?? null,
            },
            clusterIds: (s.narrative_cluster_signals || []).map((c) => c.cluster_id),
            review: { sentiment: null, severity: null, notes: null, reviewer: null, reviewedAt: null },
        };
    });

// Stratify by predicted sentiment and impact so every class is represented.
const buckets = new Map();
for (const it of items) {
    const key = `${it.production.sentiment}|${it.production.impact}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(it);
}
const selected = [];
while (selected.length < Math.min(max, items.length)) {
    let added = false;
    for (const list of buckets.values()) {
        if (list.length && selected.length < max) { selected.push(list.shift()); added = true; }
    }
    if (!added) break;
}

// Cluster pairs: same-cluster (predicted related) and cross-cluster (predicted unrelated).
const clustered = selected.filter((i) => i.clusterIds.length);
const pairs = [];
for (let i = 0; i < clustered.length && pairs.length < 30; i++) {
    for (let j = i + 1; j < clustered.length && pairs.length < 30; j++) {
        const same = clustered[i].clusterIds.some((c) => clustered[j].clusterIds.includes(c));
        if (same || pairs.filter((p) => !p.predictedSameNarrative).length < 15) {
            pairs.push({ a: clustered[i].id, b: clustered[j].id, predictedSameNarrative: same, review: { sameNarrative: null, reviewer: null } });
        }
    }
}

const dataset = {
    version: VERSION,
    createdAt: new Date().toISOString(),
    provenance: "Real Google News RSS articles ingested into the Narriv demo workspace; production gpt-4o-mini predictions captured at build time.",
    scope: "demo workspace only (no customer data)",
    reviewStatus: "unreviewed — fill review.* before computing semantic metrics",
    counts: {
        items: selected.length,
        bySentiment: selected.reduce((m, i) => ({ ...m, [i.production.sentiment]: (m[i.production.sentiment] || 0) + 1 }), {}),
        clusterPairs: pairs.length,
        relatedPairs: pairs.filter((p) => p.predictedSameNarrative).length,
    },
    items: selected,
    clusterPairs: pairs,
};
fs.writeFileSync(OUT, JSON.stringify(dataset, null, 2) + "\n");
console.log(JSON.stringify(dataset.counts));
console.log(`written ${path.relative(process.cwd(), OUT)}`);
