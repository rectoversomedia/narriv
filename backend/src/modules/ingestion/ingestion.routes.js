import express from "express";
import { triggerIngestion, triggerBatchIngestion, getIngestionStatus, cancelIngestion } from "./ingestion.controller.js";
import { handleWebhook } from "./custom-sources.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import prisma from "../../prisma.js";
import { logStructured } from "../../lib/logger.js";
import { addAnalysisJob } from "../../lib/queue.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import {
    cancelIngestionBodySchema,
    cancelIngestionParamsSchema,
    batchTriggerIngestionBodySchema,
    triggerIngestionParamsSchema
} from "./ingestion.schema.js";

const router = express.Router();
router.use(verifyToken);

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
router.get("/status/:jobId", getIngestionStatus);
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

        const source = await prisma.source.findFirst({
            where: { id: sourceId, workspaceId: scopedWorkspaceId, isActive: true, type: { not: "deleted" } },
        });
        if (!source) {
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
                const rawDoc = await prisma.rawDocument.create({
                    data: {
                        workspaceId: scopedWorkspaceId,
                        sourceId,
                        externalId: item.externalId || `webhook_${Date.now()}_${createdCount}`,
                        title: item.title,
                        content: item.content,
                        url: item.url || null,
                        platform: "webhook",
                        author: item.author || null,
                        publishedAt: item.publishedDate ? new Date(item.publishedDate) : null,
                    },
                });

                const signal = await prisma.signal.create({
                    data: {
                        workspaceId: scopedWorkspaceId,
                        rawDocumentId: rawDoc.id,
                        title: item.title,
                        content: item.content,
                        sentiment: "neutral",
                        platform: "webhook",
                    },
                });

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
