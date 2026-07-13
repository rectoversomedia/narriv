import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { badRequest, forbidden, notFound, internalError } from "../../lib/api-error.js";
import {
    listWebhooks,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    rotateWebhookSecret,
    testWebhook,
    getWebhookDeliveries,
    getWebhookStats,
    WEBHOOK_EVENTS,
    WEBHOOK_EVENT_DESCRIPTIONS,
} from "./webhooks.service.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// List webhooks
router.get(
    "/webhooks",
    validateRequest({ query: webhookQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const webhooks = await listWebhooks(scopedWorkspaceId);

            // Mask secrets in response
            const masked = webhooks.map(w => ({
                ...w,
                secret: w.secret ? "********" : null,
            }));

            return res.json({
                data: masked,
                events: WEBHOOK_EVENTS.map(event => ({
                    name: event,
                    description: WEBHOOK_EVENT_DESCRIPTIONS[event],
                })),
            });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Get single webhook
router.get(
    "/webhooks/:id",
    validateRequest({ params: webhookIdParamsSchema, query: webhookQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const webhook = await getWebhook(req.params.id, scopedWorkspaceId);
            if (!webhook) {
                return notFound(res, "Webhook not found", "WEBHOOK_NOT_FOUND");
            }

            return res.json({
                ...webhook,
                secret: "********",
            });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Create webhook
router.post(
    "/webhooks",
    validateRequest({ body: createWebhookBodySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const { url, events, description } = req.body;
            const webhook = await createWebhook(scopedWorkspaceId, url, events, description);

            return res.status(201).json({
                ...webhook,
                // Return secret only on creation
            });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Update webhook
router.patch(
    "/webhooks/:id",
    validateRequest({ params: webhookIdParamsSchema, body: updateWebhookBodySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const webhook = await getWebhook(req.params.id, scopedWorkspaceId);
            if (!webhook) {
                return notFound(res, "Webhook not found", "WEBHOOK_NOT_FOUND");
            }

            const updated = await updateWebhook(req.params.id, scopedWorkspaceId, req.body);

            return res.json({
                ...updated,
                secret: "********",
            });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Delete webhook
router.delete(
    "/webhooks/:id",
    validateRequest({ params: webhookIdParamsSchema, query: webhookQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const webhook = await getWebhook(req.params.id, scopedWorkspaceId);
            if (!webhook) {
                return notFound(res, "Webhook not found", "WEBHOOK_NOT_FOUND");
            }

            await deleteWebhook(req.params.id, scopedWorkspaceId);

            return res.json({ success: true });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Rotate webhook secret
router.post(
    "/webhooks/:id/rotate",
    validateRequest({ params: webhookIdParamsSchema, query: webhookQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const webhook = await getWebhook(req.params.id, scopedWorkspaceId);
            if (!webhook) {
                return notFound(res, "Webhook not found", "WEBHOOK_NOT_FOUND");
            }

            const rotated = await rotateWebhookSecret(req.params.id, scopedWorkspaceId);

            return res.json({
                ...rotated,
                secret: rotated.secret, // Return new secret
            });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Test webhook
router.post(
    "/webhooks/:id/test",
    validateRequest({ params: webhookIdParamsSchema, query: webhookQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const result = await testWebhook(req.params.id, scopedWorkspaceId);

            return res.json(result);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
);

// Get webhook deliveries
router.get(
    "/webhooks/:id/deliveries",
    validateRequest({ params: webhookIdParamsSchema, query: webhookDeliveryQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const webhook = await getWebhook(req.params.id, scopedWorkspaceId);
            if (!webhook) {
                return notFound(res, "Webhook not found", "WEBHOOK_NOT_FOUND");
            }

            const deliveries = await getWebhookDeliveries(
                req.params.id,
                scopedWorkspaceId,
                req.query.limit
            );

            return res.json({ data: deliveries });
        } catch (error) {
            return internalError(res);
        }
    }
);

// Get webhook stats
router.get(
    "/webhooks/:id/stats",
    validateRequest({ params: webhookIdParamsSchema, query: webhookQuerySchema }),
    async (req, res) => {
        try {
            const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
            if (!scopedWorkspaceId) {
                return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
            }

            const stats = await getWebhookStats(req.params.id, scopedWorkspaceId);

            return res.json(stats);
        } catch (error) {
            return res.status(400).json({
                error: error.message,
            });
        }
    }
);

export default router;
