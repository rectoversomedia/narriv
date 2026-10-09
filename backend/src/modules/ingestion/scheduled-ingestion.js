/**
 * Scheduled real-data ingestion (invoked by Vercel Cron via /cron/ingest).
 *
 * For every workspace with explicitly configured active monitoring keywords,
 * fetch Google News RSS per keyword through the existing ingestRssSignals()
 * pipeline (dedup -> persist -> AI analysis -> clustering -> alert rules).
 *
 * Bounded: stops starting new keywords once the time budget is spent and
 * reports the rest as deferred. One failing keyword never stops the others.
 * Workspaces without configured keywords are skipped (no default topic is
 * ever ingested on their behalf). Each run is logged to cron_ingestion_logs.
 */

import crypto from "crypto";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { ingestRssSignals } from "./rss-ingestion.service.js";

const JOB_NAME = "scheduled-rss-ingestion";

function categorizeError(err) {
    const msg = String(err?.message || err || "");
    if (/abort|timeout|ENOTFOUND|ECONN|fetch failed|HTTP \d{3}|status \d{3}/i.test(msg)) return "source_unavailable";
    if (/openai|api key|rate limit/i.test(msg)) return "ai_provider";
    return "processing_error";
}

/**
 * Build the ordered (workspace, keyword) work list. The starting offset
 * rotates per run so a time-limited run does not always favor the same
 * workspaces.
 */
export function buildWorkList(keywordRows, { maxKeywordsPerWorkspace = 3, maxWorkspaces = 25, rotation = 0 } = {}) {
    const byWorkspace = new Map();
    for (const row of keywordRows || []) {
        const keyword = String(row.keyword || "").trim();
        if (!row.workspace_id || !keyword) continue;
        const list = byWorkspace.get(row.workspace_id) || [];
        if (!list.some((k) => k.toLowerCase() === keyword.toLowerCase()) && list.length < maxKeywordsPerWorkspace) {
            list.push(keyword);
        }
        byWorkspace.set(row.workspace_id, list);
    }
    const workspaces = [...byWorkspace.keys()].sort();
    const offset = workspaces.length ? rotation % workspaces.length : 0;
    const ordered = [...workspaces.slice(offset), ...workspaces.slice(0, offset)].slice(0, maxWorkspaces);
    return ordered.flatMap((workspaceId) => byWorkspace.get(workspaceId).map((keyword) => ({ workspaceId, keyword })));
}

export async function runScheduledIngestion({
    budgetMs = 240000,
    perKeywordLimit = 8,
    maxKeywordsPerWorkspace = 3,
    maxWorkspaces = 25,
    trigger = "cron",
    ingest = ingestRssSignals,
} = {}) {
    const runId = crypto.randomUUID();
    const start = Date.now();

    const { data: keywordRows, error: kwErr } = await baseSupabaseAdmin
        .from("monitoring_keywords")
        .select("workspace_id, keyword")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1000);

    const totals = { fetched: 0, inserted: 0, deduplicated: 0, analyzed: 0, analysisFailed: 0, insertFailed: 0, clustersCreated: 0, alerts: 0, failedKeywords: 0, deferredKeywords: 0 };
    const results = [];
    let work = [];

    if (kwErr) {
        results.push({ error: kwErr.message, errorCategory: "keyword_query_failed" });
    } else {
        work = buildWorkList(keywordRows, {
            maxKeywordsPerWorkspace,
            maxWorkspaces,
            rotation: Math.floor(start / (6 * 3600 * 1000)),
        });
    }

    for (const { workspaceId, keyword } of work) {
        if (Date.now() - start > budgetMs) {
            totals.deferredKeywords += 1;
            results.push({ workspaceId, keyword, status: "deferred" });
            continue;
        }
        const itemStart = Date.now();
        try {
            const r = await ingest({ workspaceId, keyword, limit: perKeywordLimit });
            const row = {
                workspaceId,
                keyword,
                status: "ok",
                fetched: r.totalFetched || 0,
                inserted: r.newSignalsCreated || 0,
                deduplicated: r.skippedDuplicates || 0,
                analyzed: r.analyzed || 0,
                analysisFailed: r.analysisFailed || 0,
                insertFailed: r.insertFailed || 0,
                clustersCreated: r.clustering?.clustersCreated || 0,
                alerts: Array.isArray(r.alerts) ? r.alerts.length : 0,
                durationMs: Date.now() - itemStart,
            };
            for (const k of ["fetched", "inserted", "deduplicated", "analyzed", "analysisFailed", "insertFailed", "clustersCreated", "alerts"]) totals[k] += row[k];
            results.push(row);
        } catch (err) {
            totals.failedKeywords += 1;
            results.push({ workspaceId, keyword, status: "failed", error: String(err?.message || err).slice(0, 300), errorCategory: categorizeError(err), durationMs: Date.now() - itemStart });
        }
    }

    const durationMs = Date.now() - start;
    let status = "completed";
    if (kwErr || (work.length > 0 && totals.failedKeywords === work.length)) status = "failed";
    else if (totals.failedKeywords > 0 || totals.analysisFailed > 0 || totals.insertFailed > 0) status = "completed_with_errors";
    else if (totals.deferredKeywords > 0) status = "partial";

    const summary = { runId, trigger, status, workspaces: new Set(work.map((w) => w.workspaceId)).size, keywords: work.length, totals, durationMs };

    const { error: logErr } = await baseSupabaseAdmin.from("cron_ingestion_logs").insert({
        job_name: JOB_NAME,
        status,
        keywords_targeted: work.map((w) => w.keyword).slice(0, 100),
        sources_targeted: work.length,
        metadata: { ...summary, results: results.slice(0, 100) },
    });
    if (logErr) logStructured("warn", "scheduled_ingestion_log_failed", { runId, error: logErr.message });

    logStructured(status === "failed" ? "error" : "info", "scheduled_ingestion_done", summary);
    return { ...summary, results };
}
