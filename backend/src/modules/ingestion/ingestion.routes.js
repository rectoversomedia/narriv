import express from "express";
import { triggerIngestion, triggerBatchIngestion, getIngestionStatus, cancelIngestion } from "./ingestion.controller.js";
import { handleWebhook } from "./custom-sources.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
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

const router = express.Router();
router.use(verifyToken);

// POST /ingestion/fetch — On-demand RSS / Google News live ingestion
router.post("/fetch", async (req, res) => {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body?.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { keyword, sourceId, rssUrl, limit } = req.body || {};
        const result = await ingestRssSignals({
            workspaceId: scopedWorkspaceId,
            sourceId: sourceId || null,
            keyword: keyword || null,
            rssUrl: rssUrl || null,
            limit: Math.min(Math.max(1, Number(limit) || 10), 30),
            userId: req.user.id,
        });

        return res.json(result);
    } catch (err) {
        logStructured("error", "rss_fetch_endpoint_failed", { error: err.message });
        return res.status(500).json({ error: err.message || "Failed to fetch live signals" });
    }
});

// POST /ingestion/rss/:sourceId — Ingest from specific source
router.post("/rss/:sourceId", async (req, res) => {
    try {
        const { sourceId } = req.params;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body?.workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { url, maxItems, keyword } = req.body || {};
        const result = await ingestRssSignals({
            workspaceId: scopedWorkspaceId,
            sourceId,
            rssUrl: url || null,
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
        logStructured("error", "rss_source_endpoint_failed", { error: err.message });
        return res.status(500).json({ error: err.message || "Failed to ingest RSS source" });
    }
});

router.post(
    "/run",
    validateRequest({ body: batchTriggerIngestionBodySchema }),
    triggerBatchIngestion
);
router.post(
    "/run/:sourceId",
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
