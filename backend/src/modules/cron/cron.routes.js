/**
 * Vercel Cron route handlers.
 *
 * Vercel Cron invokes these endpoints at configured intervals.
 * Each cron job verifies CRON_SECRET before processing.
 */

import { Router } from "express";
import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

const router = Router();

// Keep each invocation inside the 300s function limit.
const DAILY_BACKFILL_BUDGET_MS = 150000;
const INGEST_BUDGET_MS = 230000;

function verifyCronSecret(req) {
    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; manual callers may use x-cron-secret.
    const auth = req.headers.authorization || "";
    const secret = auth.startsWith("Bearer ") ? auth.slice(7) : req.headers["x-cron-secret"];
    const expected = process.env.CRON_SECRET;
    if (!expected) {
        logStructured("error", "cron_no_secret_configured", { path: req.path });
        return false;
    }
    if (!secret || secret !== expected) {
        logStructured("warn", "cron_auth_failed", { path: req.path });
        return false;
    }
    return true;
}

router.post("/alerts", async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    const start = Date.now();
    try {
        const { detectAlerts } = await import("../alerts/alerts.service.js");
        const { data: workspaces } = await supabase.from("workspaces").select("id, name").limit(50);
        if (!workspaces?.length) return res.json({ ok: true, processed: 0, durationMs: Date.now() - start });
        let totalAlerts = 0;
        for (const ws of workspaces) {
            try { const alerts = await detectAlerts(ws.id); totalAlerts += alerts.length; }
            catch (_) { /* continue */ }
        }
        logStructured("info", "cron_alerts_done", { processed: workspaces.length, totalAlerts, durationMs: Date.now() - start });
        res.json({ ok: true, processed: workspaces.length, totalAlerts, durationMs: Date.now() - start });
    } catch (error) {
        logStructured("error", "cron_alerts_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/escalate", async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    const start = Date.now();
    try {
        const { escalateAlertsForWorkspace } = await import("../alerts/alerts.service.js");
        const { data: workspaces } = await supabase.from("workspaces").select("id, name").limit(50);
        if (!workspaces?.length) return res.json({ ok: true, escalated: 0, durationMs: Date.now() - start });
        let totalEscalated = 0;
        for (const ws of workspaces) {
            try { const result = await escalateAlertsForWorkspace(ws.id); totalEscalated += result?.totalEscalated || 0; }
            catch (_) { /* continue */ }
        }
        logStructured("info", "cron_escalate_done", { processed: workspaces.length, totalEscalated, durationMs: Date.now() - start });
        res.json({ ok: true, processed: workspaces.length, totalEscalated, durationMs: Date.now() - start });
    } catch (error) {
        logStructured("error", "cron_escalate_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/cleanup-exports", async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    const start = Date.now();
    try {
        const { cleanupExpiredReportExports } = await import("../reports/report-export-storage.service.js");
        const result = await cleanupExpiredReportExports(200);
        logStructured("info", "cron_cleanup_done", { cleaned: result.cleaned, durationMs: Date.now() - start });
        res.json({ ok: true, cleaned: result.cleaned, durationMs: Date.now() - start });
    } catch (error) {
        logStructured("error", "cron_cleanup_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/health-check", async (req, res) => {
    const start = Date.now();
    try {
        await supabase.from("workspaces").select("id").limit(1);
        res.json({ ok: true, latencyMs: Date.now() - start });
    } catch (error) {
        res.status(503).json({ ok: false, error: error.message });
    }
});

export default router;

// Hobby plan: single daily cron runs all jobs sequentially.
// Vercel Cron invokes with GET; POST is kept for manual triggers.
const runDaily = async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    const start = Date.now();
    const results = {};

    try {
        // 1. Alert detection
        try {
            const { detectAlerts } = await import("../alerts/alerts.service.js");
            const { data: ws } = await supabase.from("workspaces").select("id").limit(50);
            if (ws?.length) {
                let total = 0;
                for (const w of ws) { try { total += (await detectAlerts(w.id)).length; } catch (_) {} }
                results.alerts = { processed: ws.length, total };
            }
        } catch (e) { results.alerts = { error: e.message }; }

        // 2. Alert escalation
        try {
            const { escalateAlertsForWorkspace } = await import("../alerts/alerts.service.js");
            const { data: ws2 } = await supabase.from("workspaces").select("id").limit(50);
            if (ws2?.length) {
                let escalated = 0;
                for (const w of ws2) { try { escalated += (await escalateAlertsForWorkspace(w.id))?.totalEscalated || 0; } catch (_) {} }
                results.escalate = { processed: ws2.length, escalated };
            }
        } catch (e) { results.escalate = { error: e.message }; }

        // 3. Cleanup expired exports
        try {
            const { cleanupExpiredReportExports } = await import("../reports/report-export-storage.service.js");
            results.cleanup = await cleanupExpiredReportExports(200);
        } catch (e) { results.cleanup = { error: e.message }; }

        // 4. AI backfill: analyze real signals that lack a signal_analyses row.
        // Idempotent and time-bounded; anything left over is picked up next run.
        try {
            const { handleRetroanalyze } = await import("../ai/backfill.worker.js");
            const { data: ws3 } = await supabase.from("workspaces").select("id").limit(50);
            if (ws3?.length) {
                const deadline = start + DAILY_BACKFILL_BUDGET_MS;
                const totals = { processed: 0, failed: 0, deferred: 0 };
                for (const w of ws3) {
                    try {
                        const r = await handleRetroanalyze(w.id, { limit: 50, deadline });
                        totals.processed += r.processed || 0;
                        totals.failed += r.failed || 0;
                        totals.deferred += r.deferred || 0;
                    } catch (e) {
                        totals.failed += 1;
                        logStructured("warn", "cron_daily_retroanalyze_workspace_failed", { workspaceId: w.id, error: e.message });
                    }
                }
                results.retroanalyze = totals;
            }
        } catch (e) { results.retroanalyze = { error: e.message }; }

        // 5. Narrative clustering (Phase 7). Idempotent, safe to repeat.
        try {
            const { runClustering } = await import("../clustering/clustering.service.js");
            const { data: ws4 } = await supabase.from("workspaces").select("id").limit(50);
            if (ws4?.length) {
                let totalClusters = 0;
                for (const w of ws4) {
                    try { totalClusters += (await runClustering(w.id))?.clustersCreated || 0; } catch (_) {}
                }
                results.cluster = { clusters: totalClusters };
            }
        } catch (e) { results.cluster = { error: e.message }; }

        logStructured("info", "cron_daily_done", { results, durationMs: Date.now() - start });
        res.json({ ok: true, results, durationMs: Date.now() - start });
    } catch (error) {
        logStructured("error", "cron_daily_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
};

router.get("/daily", runDaily);
router.post("/daily", runDaily);

// Scheduled real-data ingestion (Vercel Cron, every 6 hours via four daily slots).
const runIngest = async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { runScheduledIngestion } = await import("../ingestion/scheduled-ingestion.js");
        const perKeywordLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 15);
        const summary = await runScheduledIngestion({ budgetMs: INGEST_BUDGET_MS, perKeywordLimit, trigger: req.query.slot ? `vercel-cron:${req.query.slot}` : "manual" });
        res.status(summary.status === "failed" ? 500 : 200).json(summary);
    } catch (error) {
        logStructured("error", "cron_ingest_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
};

router.get("/ingest", runIngest);
router.post("/ingest", runIngest);
