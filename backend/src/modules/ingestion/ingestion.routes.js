import express from "express";
import { triggerIngestion, triggerBatchIngestion, getIngestionStatus, cancelIngestion } from "./ingestion.controller.js";
import { handleWebhook } from "./custom-sources.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { MANAGER_ROLES, requireWorkspaceRole, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { runScheduledIngestion } from "./scheduled-ingestion.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import supabaseAdmin from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { addAnalysisJob } from "../../lib/queue.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { wrapAsync } from "../../lib/sentry.js";
import {
    cancelIngestionBodySchema,
    cancelIngestionParamsSchema,
    batchTriggerIngestionBodySchema,
    triggerIngestionParamsSchema
} from "./ingestion.schema.js";
import { ingestRssSignals } from "./rss-ingestion.service.js";
import { CollectionError, COLLECTION_PLATFORMS, isCollectionConfigured, listCollections, startCollection, syncCollection } from "./apify-collection.service.js";

const router = express.Router();
router.use(verifyToken);

// POST /ingestion/fetch — On-demand Google News ingestion (owner/admin; each run
// costs AI analysis). Feed URLs are never taken from the browser: only the
// keyword or a configured source of this workspace (no server-side fetch of
// arbitrary URLs).
router.post("/fetch", requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const scopedWorkspaceId = req.scopedWorkspaceId;
        const { keyword, sourceId, limit } = req.body || {};
        const result = await ingestRssSignals({
            workspaceId: scopedWorkspaceId,
            sourceId: sourceId || null,
            keyword: keyword || null,
            rssUrl: null,
            limit: Math.min(Math.max(1, Number(limit) || 10), 30),
            userId: req.user.id,
        });

        return res.json(result);
    } catch (err) {
        if (err?.code === "NO_KEYWORD") return res.status(400).json({ status: "no_keywords", error: err.message });
        logStructured("error", "rss_fetch_endpoint_failed", { error: err.message });
        return res.status(500).json({ error: err.message || "Failed to fetch live signals" });
    }
});

// POST /ingestion/rss/:sourceId — Ingest from specific source
router.post("/rss/:sourceId", requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const { sourceId } = req.params;
        const scopedWorkspaceId = req.scopedWorkspaceId;
        // The feed URL comes from the stored source config, never the request.
        const { maxItems, keyword } = req.body || {};
        const result = await ingestRssSignals({
            workspaceId: scopedWorkspaceId,
            sourceId,
            rssUrl: null,
            keyword: keyword || null,
            limit: Math.min(Math.max(1, Number(maxItems) || 10), 30),
            userId: req.user.id,
        });

        return res.json({
            fetched: result.totalFetched,
            created: result.newSignalsCreated,
            ...result,
        });
    } catch (err) {
        if (err?.code === "NO_KEYWORD") return res.status(400).json({ status: "no_keywords", error: err.message });
        logStructured("error", "rss_source_endpoint_failed", { error: err.message });
        return res.status(500).json({ error: err.message || "Failed to ingest RSS source" });
    }
});

// POST /ingestion/run-keywords — "Run monitoring now" for this workspace's
// active keywords, through the same pipeline and log as the scheduled runs.
// Owner/admin only; bounded (3 keywords x 8 articles) and one run per
// workspace per cooldown window, because every article costs AI analysis.
export const MANUAL_RUN_COOLDOWN_MS = 10 * 60 * 1000;
router.post("/run-keywords", requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const workspaceId = req.scopedWorkspaceId;
        const { data: active, error: kwError } = await baseSupabaseAdmin
            .from("monitoring_keywords")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("is_active", true)
            .limit(1);
        if (kwError) throw kwError;
        if (!active || active.length === 0) {
            return res.status(400).json({ status: "no_keywords", error: "Add at least one active monitoring keyword before running monitoring." });
        }

        const since = new Date(Date.now() - MANUAL_RUN_COOLDOWN_MS).toISOString();
        const { data: recent } = await baseSupabaseAdmin
            .from("cron_ingestion_logs")
            .select("created_at, metadata")
            .eq("job_name", "scheduled-rss-ingestion")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(50);
        const lastManual = (recent || []).find((r) => r.metadata?.workspaceId === workspaceId);
        if (lastManual) {
            const retryAt = new Date(new Date(lastManual.created_at).getTime() + MANUAL_RUN_COOLDOWN_MS).toISOString();
            return res.status(429).json({ status: "cooldown", error: "A monitoring run for this workspace started less than 10 minutes ago.", retryAt });
        }

        const result = await runScheduledIngestion({
            workspaceId,
            trigger: `manual:${req.user.id}`,
            budgetMs: 90000,
            perKeywordLimit: 8,
            maxKeywordsPerWorkspace: 3,
        });
        if (result.status === "skipped_overlap") {
            // A simultaneous request for this workspace won the race and is running.
            return res.status(429).json({ status: "cooldown", error: "A monitoring run for this workspace is already in progress." });
        }
        return res.json(result);
    } catch (err) {
        logStructured("error", "manual_keyword_run_failed", { error: err?.message || err });
        return res.status(500).json({ status: "failed", error: "Monitoring run failed to start." });
    }
});

// Platform collection through Apify (X, TikTok, Instagram, Threads, YouTube,
// Facebook, web, Indonesian news). The actor run happens on Apify's side; the
// status endpoint stores its dataset once it has finished. Owner/admin start
// runs (each one costs Apify credit); every member can read the history.
const collectionErrorResponse = (res, err, event) => {
    if (err instanceof CollectionError) {
        return res.status(err.httpStatus).json({ status: "error", code: err.code, error: err.message, category: err.category });
    }
    logStructured("error", event, { error: err?.message || err });
    return res.status(500).json({ status: "error", error: "Collection request failed." });
};

const memberWorkspace = async (req, res, next) => {
    try {
        req.scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, null);
        if (!req.scopedWorkspaceId) return res.status(403).json({ error: "Workspace access denied", code: "WORKSPACE_ACCESS_DENIED" });
        return next();
    } catch (err) {
        return next(err);
    }
};

router.get("/collect", memberWorkspace, async (req, res) => {
    try {
        const data = await listCollections(req.scopedWorkspaceId);
        return res.json({ configured: isCollectionConfigured(), presets: Object.entries(COLLECTION_PLATFORMS).map(([key, platform]) => ({ key, platform })), data });
    } catch (err) {
        return collectionErrorResponse(res, err, "apify_collection_list_failed");
    }
});

router.post("/collect", requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const { preset, keyword } = req.body || {};
        const data = await startCollection({ workspaceId: req.scopedWorkspaceId, presetKey: String(preset || ""), keyword: keyword || null, userId: req.user.id });
        return res.status(202).json({ data });
    } catch (err) {
        return collectionErrorResponse(res, err, "apify_collection_start_route_failed");
    }
});

router.get("/collect/:id", memberWorkspace, async (req, res) => {
    try {
        const data = await syncCollection({ workspaceId: req.scopedWorkspaceId, id: req.params.id });
        return res.json({ data });
    } catch (err) {
        return collectionErrorResponse(res, err, "apify_collection_sync_route_failed");
    }
});

router.post(
    "/run",
    requireWorkspaceRole(MANAGER_ROLES),
    validateRequest({ body: batchTriggerIngestionBodySchema }),
    triggerBatchIngestion
);
router.post(
    "/run/:sourceId",
    requireWorkspaceRole(MANAGER_ROLES),
    validateRequest({ params: triggerIngestionParamsSchema }),
    triggerIngestion
);
router.get("/status/:jobId", wrapAsync(getIngestionStatus));
router.post(
    "/cancel/:jobId",
    validateRequest({ params: cancelIngestionParamsSchema, body: cancelIngestionBodySchema }),
    cancelIngestion
);

// POST /ingestion/webhook/:sourceId — Receive webhook payload
router.post("/webhook/:sourceId", async (req, res) => {
    try {
        const { sourceId } = req.params;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: source, error } = await supabaseAdmin
            .from("sources")
            .select()
            .eq("id", sourceId)
            .eq("workspace_id", scopedWorkspaceId)
            .eq("is_active", true)
            .neq("type", "deleted")
            .maybeSingle();

        if (error || !source) {
            return res.status(404).json({ error: "Source not found" });
        }

        const items = await handleWebhook({
            workspaceId: scopedWorkspaceId,
            sourceId,
            payload: req.body,
        });

        // Store items as signals
        let createdCount = 0;
        for (const item of items) {
            try {
                const { data: rawDoc, error: rawDocError } = await supabaseAdmin
                    .from("raw_documents")
                    .insert({
                        workspace_id: scopedWorkspaceId,
                        source_id: sourceId,
                        external_id: item.externalId || `webhook_${Date.now()}_${createdCount}`,
                        title: item.title,
                        content: item.content,
                        url: item.url || null,
                        platform: "webhook",
                        author: item.author || null,
                        published_at: item.publishedDate ? new Date(item.publishedDate).toISOString() : null,
                    })
                    .select()
                    .single();

                if (rawDocError || !rawDoc) {
                    throw new Error(rawDocError?.message || "Failed to create raw document");
                }

                const { data: signal, error: signalError } = await supabaseAdmin
                    .from("signals")
                    .insert({
                        workspace_id: scopedWorkspaceId,
                        raw_document_id: rawDoc.id,
                        title: item.title,
                        content: item.content,
                        sentiment: "neutral",
                        platform: "webhook",
                    })
                    .select()
                    .single();

                if (signalError || !signal) {
                    throw new Error(signalError?.message || "Failed to create signal");
                }

                await addAnalysisJob(signal.id);
                createdCount++;
            } catch (itemError) {
                logStructured("warn", "webhook_item_failed", { sourceId, error: itemError.message });
            }
        }

        return res.json({ received: items.length, created: createdCount });
    } catch (error) {
        logStructured("error", "webhook_endpoint_failed", { error: error.message });
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
