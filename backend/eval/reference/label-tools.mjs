#!/usr/bin/env node
/**
 * Human labelling round-trip for the reference set.
 *
 *   node eval/reference/label-tools.mjs export [--set ref-v1]
 *       Writes eval/reference/labels-<set>-items.csv and -pairs.csv.
 *       The sheets are BLIND: model predictions are not included, so reviewers
 *       are not anchored by them.
 *
 *   node eval/reference/label-tools.mjs import --reviewer "<name>" [--set ref-v1] [--force]
 *       Reads the filled CSVs back, validates every value, and writes
 *       review.* fields into reference-set.<set>.json. Blank rows are skipped
 *       (never defaulted). Existing reviews are kept unless --force is given.
 *
 * Labels are only ever entered by people; this tool never generates them.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SENTIMENTS = ["positive", "negative", "neutral", "mixed"];
export const SEVERITIES = ["low", "medium", "high", "critical"];

function csvEscape(v) {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, header) {
    return [header.join(","), ...rows.map((r) => header.map((h) => csvEscape(r[h])).join(","))].join("\n") + "\n";
}

export function parseCsv(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ",") { row.push(cur); cur = ""; }
        else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(cur); cur = "";
            if (row.some((c) => c !== "")) rows.push(row);
            row = [];
        } else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); if (row.some((c) => c !== "")) rows.push(row); }
    const [header, ...body] = rows;
    return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export function exportSheets(ref) {
    const items = ref.items.map((it) => ({ id: it.id, title: it.title, snippet: it.snippet, publishedAt: it.publishedAt, sentiment: "", severity: "", notes: "" }));
    const byId = new Map(ref.items.map((it) => [it.id, it]));
    const pairs = ref.clusterPairs.map((p, idx) => ({ pair: idx, titleA: byId.get(p.a)?.title ?? p.a, titleB: byId.get(p.b)?.title ?? p.b, sameNarrative: "" }));
    return {
        items: toCsv(items, ["id", "title", "snippet", "publishedAt", "sentiment", "severity", "notes"]),
        pairs: toCsv(pairs, ["pair", "titleA", "titleB", "sameNarrative"]),
    };
}

/** Apply filled sheets to a reference set. Returns { ref, applied, skipped, errors }. */
export function applyLabels(ref, { itemRows = [], pairRows = [], reviewer, force = false, now = new Date().toISOString() }) {
    if (!reviewer || !String(reviewer).trim()) throw new Error("--reviewer is required");
    const out = structuredClone(ref);
    const errors = [];
    let applied = 0;
    let skipped = 0;
    const items = new Map(out.items.map((it) => [it.id, it]));
    for (const [n, row] of itemRows.entries()) {
        const sentiment = row.sentiment.toLowerCase();
        const severity = row.severity.toLowerCase();
        if (!sentiment && !severity) { skipped++; continue; }
        const it = items.get(row.id);
        if (!it) { errors.push(`items row ${n + 2}: unknown id ${row.id}`); continue; }
        if (sentiment && !SENTIMENTS.includes(sentiment)) { errors.push(`items row ${n + 2}: sentiment must be one of ${SENTIMENTS.join("/")}`); continue; }
        if (severity && !SEVERITIES.includes(severity)) { errors.push(`items row ${n + 2}: severity must be one of ${SEVERITIES.join("/")}`); continue; }
        if (it.review?.reviewedAt && !force) { skipped++; continue; }
        it.review = { sentiment: sentiment || null, severity: severity || null, notes: row.notes || null, reviewer: String(reviewer).trim(), reviewedAt: now };
        applied++;
    }
    for (const [n, row] of pairRows.entries()) {
        const v = row.sameNarrative.toLowerCase();
        if (!v) { skipped++; continue; }
        const p = out.clusterPairs[Number(row.pair)];
        if (!p) { errors.push(`pairs row ${n + 2}: unknown pair ${row.pair}`); continue; }
        if (!["yes", "no"].includes(v)) { errors.push(`pairs row ${n + 2}: sameNarrative must be yes or no`); continue; }
        if (p.review?.sameNarrative != null && !force) { skipped++; continue; }
        p.review = { sameNarrative: v === "yes", reviewer: String(reviewer).trim(), reviewedAt: now };
        applied++;
    }
    const reviewedItems = out.items.filter((it) => it.review?.sentiment).length;
    out.reviewStatus = reviewedItems ? `partially reviewed: ${reviewedItems}/${out.items.length} items` : out.reviewStatus;
    return { ref: out, applied, skipped, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const args = process.argv.slice(2);
    const cmd = args[0];
    const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
    const set = opt("--set") || "ref-v1";
    const refPath = path.join(here, `reference-set.${set}.json`);
    const itemsCsv = path.join(here, `labels-${set}-items.csv`);
    const pairsCsv = path.join(here, `labels-${set}-pairs.csv`);
    const ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
    if (cmd === "export") {
        const sheets = exportSheets(ref);
        fs.writeFileSync(itemsCsv, sheets.items);
        fs.writeFileSync(pairsCsv, sheets.pairs);
        console.log(`wrote ${path.relative(process.cwd(), itemsCsv)} and ${path.relative(process.cwd(), pairsCsv)} (blind: no model predictions)`);
    } else if (cmd === "import") {
        const result = applyLabels(ref, {
            itemRows: fs.existsSync(itemsCsv) ? parseCsv(fs.readFileSync(itemsCsv, "utf8")) : [],
            pairRows: fs.existsSync(pairsCsv) ? parseCsv(fs.readFileSync(pairsCsv, "utf8")) : [],
            reviewer: opt("--reviewer"),
            force: args.includes("--force"),
        });
        if (result.errors.length) {
            console.error(result.errors.join("\n"));
            console.error("No changes written; fix the rows above.");
            process.exitCode = 1;
        } else {
            fs.writeFileSync(refPath, JSON.stringify(result.ref, null, 2) + "\n");
            console.log(`applied ${result.applied} label(s), skipped ${result.skipped} blank/already-reviewed row(s)`);
        }
    } else {
        console.error("usage: label-tools.mjs export|import [--set ref-v1] [--reviewer NAME] [--force]");
        process.exitCode = 2;
    }
}
