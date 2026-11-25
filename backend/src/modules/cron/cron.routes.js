/**
 * Vercel Cron route handlers.
 *
 * Vercel Cron invokes these endpoints at configured intervals.
 * Each cron job verifies CRON_SECRET before processing.
 */

import { Router } from "express";
import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { ingestTrigger } from "../../lib/scheduler-health.js";

const router = Router();

// Keep each invocation inside the 300s function limit.
const DAILY_BACKFILL_BUDGET_MS = 150000;
const INGEST_BUDGET_MS = 230000;

function verifyCronSecret(req) {
    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; the Cloudflare scheduler that runs the hourly jobs
    // (Vercel Hobby allows only daily crons) sends SCHEDULER_SECRET the same way; manual callers may use x-cron-secret.
    const auth = req.headers.authorization || "";
    const secret = auth.startsWith("Bearer ") ? auth.slice(7) : req.headers["x-cron-secret"];
    const accepted = [process.env.CRON_SECRET, process.env.SCHEDULER_SECRET].filter(Boolean);
    const expected = accepted.length > 0;
    // Caller identity without secrets: tells a Vercel scheduler call (vercel-cron/1.0)
    // apart from manual requests when diagnosing scheduled runs.
    const caller = {
        path: req.path,
        slot: req.query?.slot ?? null,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 80),
        authScheme: auth ? auth.split(" ")[0] : (req.headers["x-cron-secret"] ? "x-cron-secret" : "none"),
    };
    if (!expected) {
        logStructured("error", "cron_no_secret_configured", caller);
        return false;
    }
    if (!secret || !accepted.includes(secret)) {
        logStructured("warn", "cron_auth_failed", caller);
        return false;
    }
    logStructured("info", "cron_auth_ok", caller);
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

        // 2b. Retry failed alert notifications (bounded attempts per alert)
        try {
            const { retryFailedNotifications } = await import("../alerts/alerts.service.js");
            const { data: wsN } = await supabase.from("workspaces").select("id").limit(50);
            let retried = 0;
            for (const w of wsN || []) {
                try { retried += (await retryFailedNotifications(w.id)).retried || 0; } catch (_) {}
            }
            results.notificationRetries = { retried };
        } catch (e) { results.notificationRetries = { error: e.message }; }

        // 2c. Data kept per plan: mentions past the plan's window (plus a grace period) are removed (lib/retention.js).
        try {
            const { runRetention } = await import("../../lib/retention.js");
            const r = await runRetention();
            results.retention = { workspaces: r.workspaces, removed: r.removed };
        } catch (e) { results.retention = { error: e.message }; }

        // 3. Cleanup expired exports
        try {
            const { cleanupExpiredReportExports } = await import("../reports/report-export-storage.service.js");
            results.cleanup = await cleanupExpiredReportExports(200);
        } catch (e) { results.cleanup = { error: e.message }; }

        // 3b. Scheduled reports whose next run has passed (the schedule page promised these; nothing ran them).
        try {
            const { runDueReportSchedules } = await import("../reports/report-schedules.js");
            const { generateReport } = await import("../reports/report-generation.js");
            const run = await runDueReportSchedules({ generate: generateReport });
            results.reportSchedules = { ran: run.ran, failed: (run.results || []).filter((r) => r.status === "failed").length, error: run.error };
        } catch (e) { results.reportSchedules = { error: e.message }; }

        // 3c. Each demo scenario is reseeded with fresh dates once its newest record is a day old.
        try {
            const { refreshDemoWorkspaceIfStale } = await import("../demo/demo-seed.js");
            results.demo = await refreshDemoWorkspaceIfStale();
        } catch (e) { results.demo = { error: e.message }; }

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

        // 5b. Default follow-up on the issues just clustered.
        results.followUps = await runFollowUps({ deadline: start + 200000, topVideos: true });

        // 5c. Daily self-check of the newer pipelines, so a silent failure shows up in the logs the next morning.
        results.selfCheck = await selfCheck();

        // 5d. Narriv Radar: once a day, the top risky stories as "found → do" on every enabled channel (active workspaces only).
        try {
            const { buildRadar } = await import("../../lib/narrative-radar.js");
            const { notifyRadar } = await import("../notifications/notification-dispatch.service.js");
            const { data: rws } = await supabase.from("workspaces").select("id, settings").limit(200);
            let sent = 0;
            for (const w of rws || []) {
                if (w.settings?.monitoringPaused || Date.now() > start + 240000) continue;
                const radar = await buildRadar(w.id);
                if (radar.items.length) { await notifyRadar({ workspaceId: w.id, radar }).catch(() => null); sent++; }
            }
            results.radar = { sent };
        } catch (e) { results.radar = { error: e.message }; }

        // 5e. Brand logos: workspaces with a brand name and no logo get the brand's real logo (at most 5 a day).
        try {
            const { ensureBrandLogo } = await import("../../lib/brand-logo.js");
            const { data: lws } = await supabase.from("workspaces").select("id, logo_url, settings").is("logo_url", null).limit(50);
            let set = 0, tried = 0;
            for (const w of lws || []) {
                if (w.settings?.logo_auto || tried >= 5 || Date.now() > start + 240000) continue;
                tried++;
                if (await ensureBrandLogo(w.id).catch(() => null)) set++;
            }
            results.brandLogos = { tried, set };
        } catch (e) { results.brandLogos = { error: e.message }; }

        // 6. Store finished Apify collections nobody checked from the browser.
        try {
            const { syncPendingCollections } = await import("../ingestion/apify-collection.service.js");
            results.apifyCollections = await syncPendingCollections({ deadline: start + 240000 });
        } catch (e) { results.apifyCollections = { error: e.message }; }

        logStructured("info", "cron_daily_done", { results, durationMs: Date.now() - start });
        res.json({ ok: true, results, durationMs: Date.now() - start });
    } catch (error) {
        logStructured("error", "cron_daily_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
};

router.get("/daily", runDaily);
router.post("/daily", runDaily);

// Report schedules (daily brief, Monday board report) that are due. Run from the frequent ingest call as well as the
// once-a-day Vercel cron, so a 07:00 or Monday 08:00 schedule goes out within the next ingest run, not at 10:00 WIB.
async function runDueSchedules() {
    try {
        const { runDueReportSchedules } = await import("../reports/report-schedules.js");
        const { generateReport } = await import("../reports/report-generation.js");
        const run = await runDueReportSchedules({ generate: generateReport });
        return { ran: run.ran, failed: (run.results || []).filter((r) => r.status === "failed").length, error: run.error };
    } catch (error) {
        logStructured("warn", "cron_report_schedules_failed", { error: error.message });
        return { error: error.message };
    }
}

// High alerts wait for the next run and go out as one email per workspace (see sendPendingAlertDigests).
async function sendDigests() {
    try {
        const { sendPendingAlertDigests } = await import("../alerts/alerts.service.js");
        return await sendPendingAlertDigests();
    } catch (error) {
        logStructured("warn", "cron_alert_digest_failed", { error: error.message });
        return { error: error.message };
    }
}

// Default follow-up after new data: positive issues → opportunities, risky issues → a case and an AI action plan
// (one plan per workspace per run). Bounded by a time budget so the ingest call stays inside its limit.
async function runFollowUps({ deadline, topVideos = false }) {
    const totals = { workspaces: 0, comments: 0, opportunities: 0, cases: 0, plans: 0 };
    try {
        const { runIssueFollowUp } = await import("../../lib/issue-follow-up.js");
        const { detectOpportunities } = await import("../alerts/alerts.service.js");
        const { generateActionPlan } = await import("../actions/actions.service.js");
        const { anyAiConfigured } = await import("../../lib/chat-client.js");
        const { collectYouTubeComments } = await import("../network/youtube-comments.service.js");
        const { refreshCampSummaries } = await import("../network/network.service.js");
        const { runNarrativeDefense } = await import("../../lib/narrative-defense.js");
        const { enrichHeadlineRecords } = await import("../ingestion/publisher-rss.service.js");
        const { data: ws } = await supabase.from("workspaces").select("id, settings").limit(200);
        for (const w of ws || []) {
            if (Date.now() > deadline) break;
            try {
                // Free social data: comments under the workspace's YouTube videos (skipped for paused workspaces).
                if (!w.settings?.monitoringPaused) {
                    const c = await collectYouTubeComments(w.id, { maxVideos: 5, withTopVideos: topVideos, deadline: Math.min(deadline, Date.now() + 60000) });
                    totals.comments += c.comments || 0;
                    if (c.videos) await refreshCampSummaries(w.id);
                }
                totals.opportunities += (await detectOpportunities(w.id)).length;
                // Headline-only news records get the article summary from the publisher feeds (free).
                if (!w.settings?.monitoringPaused) totals.enriched = (totals.enriched || 0) + await enrichHeadlineRecords(w.id).catch(() => 0);
                // Coordination per issue, claim checks and narrative-attack alerts (paused workspaces too: no new data, no AI).
                if (!w.settings?.monitoringPaused && Date.now() < deadline - 20000) {
                    const d = await runNarrativeDefense(w.id);
                    totals.attacks = (totals.attacks || 0) + d.attacks;
                }
                // An AI plan takes up to ~40s: only start one when that still fits the call's time budget.
                const planFits = anyAiConfigured() && Date.now() < deadline - 45000;
                const r = await runIssueFollowUp(w.id, { generatePlan: planFits ? generateActionPlan : null });
                totals.cases += r.cases;
                totals.plans += r.plans;
                totals.workspaces++;
            } catch (error) {
                logStructured("warn", "cron_follow_up_workspace_failed", { workspaceId: w.id, error: error.message });
            }
        }
    } catch (error) {
        logStructured("warn", "cron_follow_up_failed", { error: error.message });
        return { error: error.message };
    }
    return totals;
}

async function selfCheck() {
    const out = {};
    try {
        const { factChecks } = await import("../../lib/claim-check.js");
        out.factCheckFeeds = (await factChecks()).length;
    } catch (e) { out.factCheckFeeds = `error: ${e.message}`; }
    try {
        const { anyAiConfigured } = await import("../../lib/chat-client.js");
        const { monthlyCallsUsed } = await import("../../lib/chat-client.js");
        out.ai = anyAiConfigured();
        out.aiCallsThisMonth = await monthlyCallsUsed().catch(() => null);
    } catch (e) { out.ai = `error: ${e.message}`; }
    try {
        const { isCommentCollectionConfigured } = await import("../network/youtube-comments.service.js");
        out.youtube = isCommentCollectionConfigured();
    } catch (e) { out.youtube = `error: ${e.message}`; }
    try {
        const { data } = await supabase.from("signals").select("captured_at").order("captured_at", { ascending: false }).limit(1);
        out.lastRecordHoursAgo = data?.[0] ? Math.round((Date.now() - Date.parse(data[0].captured_at)) / 3600000) : null;
    } catch (e) { out.lastRecordHoursAgo = `error: ${e.message}`; }
    const failing = Object.entries(out).filter(([k, v]) => v === false || v === 0 || String(v).startsWith("error") || (k === "lastRecordHoursAgo" && v > 26));
    logStructured(failing.length ? "warn" : "info", "self_check", { ...out, failing: failing.map(([k]) => k) });
    return { ...out, ok: failing.length === 0 };
}

// Scheduled real-data ingestion (Vercel Cron, every hour).
const runIngest = async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    const started = Date.now();
    try {
        const { runScheduledIngestion } = await import("../ingestion/scheduled-ingestion.js");
        const perKeywordLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 15);
        const summary = await runScheduledIngestion({ budgetMs: INGEST_BUDGET_MS, perKeywordLimit, trigger: ingestTrigger({ userAgent: req.headers["user-agent"], slot: req.query.slot ?? null }) });
        summary.alertDigests = await sendDigests();
        summary.reportSchedules = await runDueSchedules();
        summary.followUps = await runFollowUps({ deadline: started + 285000 });
        // The demo never looks stale: reseeded here too (cheap check) when its newest record is 20 hours old.
        try {
            const { refreshDemoWorkspaceIfStale } = await import("../demo/demo-seed.js");
            summary.demo = await refreshDemoWorkspaceIfStale();
        } catch (e) { summary.demo = { error: e.message }; }
        res.status(summary.status === "failed" ? 500 : 200).json(summary);
    } catch (error) {
        logStructured("error", "cron_ingest_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
};

router.get("/ingest", runIngest);
router.post("/ingest", runIngest);

// Scheduled social collection for the workspaces the Narriv team enabled (hourly at :30, capped per month).
const runSocial = async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { runSocialSchedule } = await import("../ingestion/social-schedule.service.js");
        const summary = await runSocialSchedule();
        res.json({ ...summary, alertDigests: await sendDigests() });
    } catch (error) {
        logStructured("error", "cron_social_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
};
router.get("/social", runSocial);
router.post("/social", runSocial);

// Nightly demo refresh (03:00 WIB): reseeds every demo scenario so dates stay recent and visitors' changes reset.
// Database writes only; no AI or paid provider is called.
const runDemoRefresh = async (req, res) => {
    if (!verifyCronSecret(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { seedAllDemoWorkspaces } = await import("../demo/demo-seed.js");
        res.json({ seeded: await seedAllDemoWorkspaces() });
    } catch (error) {
        logStructured("error", "cron_demo_refresh_failed", { error: error.message });
        res.status(500).json({ error: "Internal server error" });
    }
};
router.get("/demo-refresh", runDemoRefresh);
router.post("/demo-refresh", runDemoRefresh);
