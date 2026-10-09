/**
 * Admin / Backfill Intelligence Endpoints (Phase 7)
 *
 * - POST /api/ai/retroanalyze  : analyze signals that lack signal_analysis rows
 * - POST /api/ai/cluster        : invoke the existing narrative clustering service
 *
 * Both endpoints are auth-required and workspace-scoped.
 * They invoke existing production code paths (ai-analysis.worker, clustering.service)
 * and never fabricate data.
 *
 * These are safe to call repeatedly:
 *   retroanalyze  - idempotent, only processes signals without an analysis row
 *   cluster       - safe to run repeatedly; clustering service is idempotent per period
 */

import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { runClustering } from "../clustering/clustering.service.js";
import { analyzeSignal } from "./ai.service.js";

const router = express.Router();
router.use(verifyToken);

async function resolveWs(req, res) {
    const userId = req.user?.id || req.userId;
    if (!userId) {
        res.status(401).json({ error: "auth required" });
        return null;
    }
    const requested = req.query.workspaceId || req.workspaceId || req.body?.workspaceId || null;
    const workspaceId = await resolveWorkspaceIdForUser(userId, requested);
    if (!workspaceId) {
        res.status(403).json({ error: "no accessible workspace" });
        return null;
    }
    return workspaceId;
}

function pickAnalysisText(signal) {
    const title = String(signal.title || "").trim();
    const content = String(signal.content || "").trim();
    if (title && content) return `${title}\n\n${content}`;
    if (content) return content;
    return title || "";
}

function pickPublishedAt(signal) {
    return signal.published_at || signal.captured_at || null;
}

function pickPlatform(signal) {
    return signal.platform || null;
}

/**
 * POST /api/ai/retroanalyze
 * Body: { limit?: number, onlyUnanalyzed?: boolean }
 * Default: process every signal in the workspace that has no signal_analysis row.
 * Idempotent. Returns counts: { found, processed, failed, alreadyAnalyzed, remaining }.
 */
router.post("/retroanalyze", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 100, 1), 500);

        // Fetch recent signals
        const { data: signals, error: sigErr } = await baseSupabaseAdmin
            .from("signals")
            .select("id, title, content, platform, captured_at, published_at, source_id")
            .eq("workspace_id", ws)
            .order("captured_at", { ascending: false })
            .limit(limit);
        if (sigErr) {
            logStructured("error", "retroanalyze: signals query failed", { error: sigErr.message });
            return res.status(500).json({ error: "Failed to fetch signals" });
        }
        if (!signals || signals.length === 0) {
            return res.json({ workspaceId: ws, found: 0, processed: 0, failed: 0, alreadyAnalyzed: 0, remaining: 0 });
        }

        // Fetch existing analysis ids
        const { data: existing, error: exErr } = await baseSupabaseAdmin
            .from("signal_analysis")
            .select("signal_id")
            .eq("workspace_id", ws)
            .in("signal_id", signals.map((s) => s.id));
        if (exErr) {
            logStructured("error", "retroanalyze: analysis query failed", { error: exErr.message });
            return res.status(500).json({ error: "Failed to fetch analysis state" });
        }
        const alreadyAnalyzed = new Set((existing || []).map((e) => e.signal_id));
        const toProcess = signals.filter((s) => !alreadyAnalyzed.has(s.id));

        let processed = 0;
        let failed = 0;
        const failures = [];

        for (const signal of toProcess) {
            try {
                const text = pickAnalysisText(signal);
                if (!text) {
                    failed += 1;
                    failures.push({ signalId: signal.id, reason: "no text content" });
                    continue;
                }
                const result = await analyzeSignal(signal.title || null, text);
                const sentiment = result?.sentiment || "neutral";
                const narrativeType = result?.narrative_type || "general";
                const impact = result?.impact || "low";
                const stakeholder = result?.stakeholder || null;
                const summary = result?.summary || null;
                const recommendedAction = result?.recommended_action || null;
                const confidence = typeof result?.confidence_score === "number" ? result.confidence_score : null;

                const row = {
                    workspace_id: ws,
                    signal_id: signal.id,
                    sentiment: String(sentiment).toLowerCase(),
                    narrative_type: String(narrativeType).toLowerCase(),
                    impact: String(impact).toLowerCase(),
                    stakeholder: stakeholder ? String(stakeholder) : null,
                    summary,
                    recommended_action: recommendedAction,
                    confidence_score: confidence,
                    platform: pickPlatform(signal),
                    published_at: pickPublishedAt(signal),
                };

                const { error: insErr } = await baseSupabaseAdmin
                    .from("signal_analysis")
                    .upsert(row, { onConflict: "signal_id" });
                if (insErr) {
                    failed += 1;
                    failures.push({ signalId: signal.id, reason: insErr.message });
                    continue;
                }
                processed += 1;
            } catch (err) {
                failed += 1;
                failures.push({ signalId: signal.id, reason: err?.message || String(err) });
            }
        }

        logStructured("info", "retroanalyze_done", {
            workspaceId: ws,
            found: signals.length,
            processed,
            failed,
            alreadyAnalyzed: alreadyAnalyzed.size,
        });

        return res.json({
            workspaceId: ws,
            found: signals.length,
            alreadyAnalyzed: alreadyAnalyzed.size,
            processed,
            failed,
            remaining: Math.max(0, toProcess.length - processed - failed),
            failures: failures.slice(0, 25),
        });
    } catch (err) {
        logStructured("error", "retroanalyze: outer error", { error: err?.message });
        return res.status(500).json({ error: err?.message || "retroanalyze failed" });
    }
});

/**
 * POST /api/ai/cluster
 * Body: { limit?: number }
 * Runs the existing narrative clustering service against the workspace.
 * Returns the count of clusters produced.
 */
router.post("/cluster", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const before = await baseSupabaseAdmin
            .from("narrative_clusters")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", ws);
        const beforeCount = before?.count || 0;

        const result = await runClustering(ws);

        const after = await baseSupabaseAdmin
            .from("narrative_clusters")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", ws);
        const afterCount = after?.count || 0;

        logStructured("info", "cluster_done", {
            workspaceId: ws,
            before: beforeCount,
            after: afterCount,
            delta: afterCount - beforeCount,
            result: result?.success ?? null,
        });

        return res.json({
            workspaceId: ws,
            success: result?.success ?? true,
            clustersBefore: beforeCount,
            clustersAfter: afterCount,
            newClusters: Math.max(0, afterCount - beforeCount),
            message: result?.message || null,
        });
    } catch (err) {
        logStructured("error", "cluster: outer error", { error: err?.message });
        return res.status(500).json({ error: err?.message || "cluster failed" });
    }
});

export default router;
