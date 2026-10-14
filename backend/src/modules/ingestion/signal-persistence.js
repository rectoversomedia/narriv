/**
 * Shared persistence for collected public records (news articles, social
 * posts, videos). One path for every source so deduplication, provenance,
 * AI analysis and failure accounting behave the same everywhere:
 *
 *   dedup (external id, then URL) -> raw_documents -> AI analysis ->
 *   signals (+ signal_analyses) -> failures logged, never fabricated
 *
 * Unknown values stay unknown: no invented publication dates, sentiment or
 * engagement. Clustering and alert rules run once per batch afterwards.
 */
import supabaseAdmin from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { checkBudgetAllowance } from "../../lib/cost-management.js";
import { analyzeSignal } from "../ai/ai.service.js";
import { runClustering } from "../clustering/clustering.service.js";
import { detectAlerts } from "../alerts/alerts.service.js";

// Max records analyzed in parallel per call (AI analysis dominates the time).
const INGEST_CONCURRENCY = Math.max(1, Number(process.env.INGEST_CONCURRENCY || 4));

/** Run `fn` over `items` with at most `limit` in flight. */
export async function runWithConcurrency(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * True when this record already exists in the workspace (raw_documents by
 * external id or URL, or a legacy signal with the same URL).
 */
export async function existsInWorkspace(workspaceId, externalId, url) {
  const checks = [
    supabaseAdmin.from("raw_documents").select("id").eq("workspace_id", workspaceId).eq("external_id", externalId).limit(1),
  ];
  if (url) {
    checks.push(supabaseAdmin.from("raw_documents").select("id").eq("workspace_id", workspaceId).eq("url", url).limit(1));
    checks.push(supabaseAdmin.from("signals").select("id").eq("workspace_id", workspaceId).eq("url", url).limit(1));
  }
  const results = await Promise.all(checks);
  const failed = results.find((r) => r.error);
  if (failed) {
    // Fail closed: skipping an item is safer than inserting a possible duplicate.
    logStructured("warn", "rss_dedup_check_failed", { error: failed.error.message, workspaceId });
    return true;
  }
  return results.some((r) => (r.data || []).length > 0);
}

/** The URL if it is an absolute http(s) URL, else null (no javascript:, data:, relative paths). */
export function safeRecordUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Persist normalized records for one workspace.
 *
 * record: { externalId, title, content, url, author, publishedAt (ISO|null),
 *           language?, region?, metadata? }
 * options: { workspaceId, sourceId, platform, keyword, ingestionType,
 *            signalDefaults?: { region, language }, runFollowUps = true }
 */
export async function persistCollectedRecords(records, {
  workspaceId,
  sourceId = null,
  platform,
  keyword = null,
  ingestionType,
  signalDefaults = {},
  runFollowUps = true,
}) {
  if (!workspaceId) throw new Error("workspaceId is required to persist records");

  const createdSignals = [];
  const createdRawDocs = [];
  let skippedDuplicates = 0;
  let analyzed = 0;
  let analysisFailed = 0;
  let insertFailed = 0;
  let skippedInvalid = 0;

  // Budget gate: when the workspace's AI budget is exhausted, records are
  // still stored (unanalyzed) so the backfill can analyze them later.
  const budget = await checkBudgetAllowance(workspaceId).catch(() => ({ allowed: true }));
  const aiAllowed = budget?.allowed !== false;
  if (!aiAllowed) logStructured("warn", "ingestion_ai_skipped_budget", { workspaceId, reason: budget.reason });

  // Records repeated inside one batch: claimed synchronously, before any await,
  // because the database check below runs concurrently for several records.
  const seenInBatch = new Set();

  const processRecord = async (record) => {
    try {
      const content = String(record.content || record.title || "").trim();
      if (!content || !record.externalId) {
        skippedInvalid++;
        return;
      }
      const url = safeRecordUrl(record.url);
      const batchKeys = [`id:${record.externalId}`, url ? `url:${url}` : null].filter(Boolean);
      if (batchKeys.some((k) => seenInBatch.has(k))) {
        skippedDuplicates++;
        return;
      }
      batchKeys.forEach((k) => seenInBatch.add(k));

      if (await existsInWorkspace(workspaceId, record.externalId, url)) {
        skippedDuplicates++;
        return;
      }

      const { data: rawDoc, error: rawDocErr } = await supabaseAdmin
        .from("raw_documents")
        .insert({
          workspace_id: workspaceId,
          source_id: sourceId,
          external_id: record.externalId,
          title: record.title || null,
          content,
          url,
          author: record.author || null,
          published_at: record.publishedAt || null,
          metadata: {
            ingestion_type: ingestionType,
            keyword,
            platform,
            ingested_at: new Date().toISOString(),
            ...(record.metadata || {}),
          },
        })
        .select()
        .single();

      if (rawDocErr || !rawDoc) {
        logStructured("warn", "raw_doc_insert_failed", { error: rawDocErr?.message });
        insertFailed++;
        return;
      }
      createdRawDocs.push(rawDoc);

      // AI analysis. On failure the record is stored without an analysis so the
      // backfill can retry it later; no heuristic result is ever stored as AI output.
      let aiResult = null;
      let aiError = null;
      try {
        if (!aiAllowed) throw new Error("budget_exceeded: AI analysis paused for this workspace");
        aiResult = await analyzeSignal(record.title || content.slice(0, 140), content, { workspaceId, operation: "ingestion_analysis" });
      } catch (aiErr) {
        aiError = aiErr;
        logStructured("warn", "ai_signal_analysis_failed", { error: aiErr.message, workspaceId });
      }

      const dbSentiment = aiResult ? String(aiResult.sentiment || "NEUTRAL").toUpperCase() : null;
      const rawImpact = String(aiResult?.impact || "").toLowerCase();
      const dbSeverity = aiResult ? (["critical", "high", "medium", "low"].includes(rawImpact) ? rawImpact : "low") : null;
      const sentimentScore = aiResult && typeof aiResult.confidence_score === "number"
        ? (dbSentiment === "NEGATIVE" ? -Math.abs(aiResult.confidence_score) : Math.abs(aiResult.confidence_score))
        : null;

      const { data: signal, error: signalErr } = await supabaseAdmin
        .from("signals")
        .insert({
          workspace_id: workspaceId,
          source_id: sourceId,
          raw_document_id: rawDoc.id,
          title: record.title || content.slice(0, 140),
          content: aiResult?.summary ? `${content} (AI Summary: ${aiResult.summary})` : content,
          platform,
          url,
          author: record.author || null,
          published_at: record.publishedAt || null,
          captured_at: new Date().toISOString(),
          sentiment: dbSentiment,
          sentiment_score: sentimentScore,
          severity: dbSeverity,
          region: record.region ?? signalDefaults.region ?? null,
          language: record.language ?? signalDefaults.language ?? null,
          topics: [keyword, aiResult?.narrative_type || null].filter(Boolean),
          metadata: {
            ai_summary: aiResult?.summary || null,
            narrative_type: aiResult?.narrative_type || null,
            stakeholder: aiResult?.stakeholder || null,
            recommended_action: aiResult?.recommended_action || null,
            ingestion_type: ingestionType,
            keyword,
            ...(record.metadata || {}),
          },
        })
        .select()
        .single();

      if (signalErr || !signal) {
        logStructured("warn", "signal_insert_failed", { error: signalErr?.message });
        insertFailed++;
        return;
      }
      createdSignals.push(signal);

      if (aiResult) {
        const { error: analysisErr } = await supabaseAdmin
          .from("signal_analyses")
          .insert({
            signal_id: signal.id,
            analysis: aiResult,
            confidence: aiResult.confidence_score || 0.85,
            model: "gpt-4o-mini",
          });
        if (analysisErr) {
          analysisFailed++;
          logStructured("warn", "signal_analysis_insert_failed", { error: analysisErr.message, signalId: signal.id });
        } else {
          analyzed++;
        }
      } else {
        analysisFailed++;
        await supabaseAdmin.from("ai_analysis_failure_logs").insert({
          workspace_id: workspaceId,
          signal_id: signal.id,
          error_type: "ingestion_analysis",
          error_message: String(aiError?.message || "AI analysis failed").slice(0, 500),
          retry_count: 0,
        });
      }
    } catch (itemErr) {
      insertFailed++;
      logStructured("warn", "record_processing_failed", { error: itemErr.message, title: record.title });
    }
  };
  await runWithConcurrency(records, INGEST_CONCURRENCY, processRecord);

  let clusteringResult = null;
  let detectedAlerts = [];
  if (runFollowUps && createdSignals.length > 0) {
    try {
      logStructured("info", "triggering_dynamic_clustering_post_ingestion", { workspaceId, newSignalsCount: createdSignals.length });
      clusteringResult = await runClustering(workspaceId);
    } catch (clusterErr) {
      logStructured("warn", "dynamic_clustering_post_ingestion_failed", { error: clusterErr.message, workspaceId });
    }
    try {
      logStructured("info", "evaluating_alert_rules_post_ingestion", { workspaceId, newSignalsCount: createdSignals.length });
      detectedAlerts = await detectAlerts(workspaceId);
    } catch (alertErr) {
      logStructured("warn", "evaluating_alert_rules_post_ingestion_failed", { error: alertErr.message, workspaceId });
    }
  }

  return {
    createdSignals,
    createdRawDocs,
    skippedDuplicates,
    skippedInvalid,
    analyzed,
    analysisFailed,
    insertFailed,
    clustering: clusteringResult,
    alerts: detectedAlerts,
  };
}
