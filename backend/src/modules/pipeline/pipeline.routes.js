/**
 * GET /pipeline/status — operational health of the intelligence pipeline for
 * the caller's workspace (last ingestion / analysis / clustering / alert,
 * scheduled run results, failures, AI usage). Read-only, workspace-scoped,
 * built on existing tables. Counts are exact; nothing is estimated.
 */

import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { getTokenUsageSummary } from "../../lib/token-tracking.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

const REAL_SIGNAL_FILTER = "url.not.is.null,raw_document_id.not.is.null";

const latest = (rows, field = "created_at") => rows?.[0]?.[field] || null;

router.get("/status", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user?.id, req.query.workspaceId || null);
        if (!ws) return res.status(403).json({ error: "no accessible workspace" });
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

        const [rawDoc, analysis, realSignals, unanalyzed, failures, cluster, clusterCount, alert, openAlerts, notifFailures, integrations, runs, usage] = await Promise.all([
            db.from("raw_documents").select("created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1),
            db.from("signal_analyses").select("created_at, signals!inner(workspace_id)").eq("signals.workspace_id", ws).order("created_at", { ascending: false }).limit(1),
            db.from("signals").select("id", { count: "exact", head: true }).eq("workspace_id", ws).or(REAL_SIGNAL_FILTER),
            db.from("signals").select("id, signal_analyses!left(id)", { count: "exact", head: true }).eq("workspace_id", ws).or(REAL_SIGNAL_FILTER).is("signal_analyses", null),
            db.from("ai_analysis_failure_logs").select("id", { count: "exact", head: true }).eq("workspace_id", ws).gte("created_at", sevenDaysAgo),
            db.from("narrative_clusters").select("updated_at").eq("workspace_id", ws).order("updated_at", { ascending: false, nullsFirst: false }).limit(1),
            db.from("narrative_clusters").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
            db.from("alerts").select("created_at").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(1),
            db.from("alerts").select("id", { count: "exact", head: true }).eq("workspace_id", ws).neq("status", "resolved"),
            db.from("alerts").select("id", { count: "exact", head: true }).eq("workspace_id", ws).gte("created_at", sevenDaysAgo).in("metadata->notification->>status", ["failed", "error"]),
            db.from("integrations").select("id", { count: "exact", head: true }).eq("workspace_id", ws).eq("status", "active"),
            db.from("cron_ingestion_logs").select("status, created_at, metadata").eq("job_name", "scheduled-rss-ingestion").order("created_at", { ascending: false }).limit(30),
            getTokenUsageSummary(ws, 30),
        ]);

        const queryErrors = [rawDoc, analysis, realSignals, unanalyzed, failures, cluster, clusterCount, alert, openAlerts, notifFailures, integrations, runs]
            .map((r) => r.error?.message).filter(Boolean);

        // Scheduled runs are global; expose only this workspace's per-keyword results.
        const runRows = runs.data || [];
        const wsRuns = runRows
            .map((r) => ({ at: r.created_at, status: r.status, results: (r.metadata?.results || []).filter((x) => x.workspaceId === ws) }))
            .filter((r) => r.results.length > 0);
        const lastOk = wsRuns.find((r) => r.results.some((x) => x.status === "ok"));

        res.json({
            workspaceId: ws,
            generatedAt: new Date().toISOString(),
            scheduler: {
                lastRunAt: runRows[0]?.created_at || null,
                lastRunStatus: runRows[0]?.status || null,
                lastRunForWorkspace: wsRuns[0] || null,
                lastSuccessfulIngestionForWorkspace: lastOk ? lastOk.at : null,
            },
            ingestion: { lastRawDocumentAt: latest(rawDoc.data) },
            analysis: {
                lastAnalysisAt: latest(analysis.data),
                realSignals: realSignals.count ?? null,
                unanalyzedRealSignals: unanalyzed.count ?? null,
                analysisFailuresLast7d: failures.count ?? null,
            },
            clustering: { lastClusterUpdateAt: latest(cluster.data, "updated_at"), clusters: clusterCount.count ?? null },
            alerts: {
                lastAlertAt: latest(alert.data),
                unresolved: openAlerts.count ?? null,
                notificationFailuresLast7d: notifFailures.count ?? null,
                activeNotificationIntegrations: integrations.count ?? null,
            },
            aiUsageLast30d: { calls: usage.totalCalls, tokens: usage.totalTokens, estimatedCostUsd: usage.estimatedCost },
            partial: queryErrors.length > 0,
            errors: queryErrors,
        });
    } catch (err) {
        logStructured("error", "pipeline_status_failed", { error: err?.message });
        res.status(500).json({ error: "Failed to load pipeline status" });
    }
});

export default router;
