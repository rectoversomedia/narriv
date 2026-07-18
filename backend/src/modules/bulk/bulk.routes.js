/**
 * Bulk Operations Routes for Narriv
 * Handles batch operations for signals, alerts, and action plans
 */

import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import {
    bulkDeleteSignals,
    bulkUpdateSignals,
    bulkAnalyzeSignals,
    bulkCreateAlertsFromSignals,
    bulkUpdateAlerts,
    bulkAssignAlerts,
    bulkUpdateActionPlans,
    bulkFeedbackActionPlans,
    streamExportSignals,
} from "../../lib/bulk-operations.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/bulk/signals/delete
 * Bulk delete signals
 * Rate limited: 20/minute
 */
router.post("/signals/delete", rateLimiters.apiDefault(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { signalIds } = req.body;

        if (!signalIds || !Array.isArray(signalIds)) {
            return res.status(400).json({
                error: "signalIds must be an array",
                code: "INVALID_SIGNAL_IDS"
            });
        }

        const result = await bulkDeleteSignals(workspaceId, signalIds);

        logStructured("info", "bulk_delete_signals_api", {
            userId: req.user.id,
            workspaceId,
            count: result.deleted
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_delete_signals_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/bulk/signals
 * Bulk update signals (add tags, update metadata)
 * Rate limited: 30/minute
 */
router.patch("/signals", rateLimiters.search(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { signalIds, updates } = req.body;

        if (!signalIds || !Array.isArray(signalIds)) {
            return res.status(400).json({
                error: "signalIds must be an array",
                code: "INVALID_SIGNAL_IDS"
            });
        }

        if (!updates || typeof updates !== "object") {
            return res.status(400).json({
                error: "updates must be an object",
                code: "INVALID_UPDATES"
            });
        }

        const result = await bulkUpdateSignals(workspaceId, signalIds, updates);

        logStructured("info", "bulk_update_signals_api", {
            userId: req.user.id,
            workspaceId,
            count: result.updated,
            updates
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_update_signals_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bulk/signals/analyze
 * Bulk analyze signals
 * Rate limited: 10/minute (AI operations are expensive)
 */
router.post("/signals/analyze", rateLimiters.aiGeneration(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { signalIds, options } = req.body;

        if (!signalIds || !Array.isArray(signalIds)) {
            return res.status(400).json({
                error: "signalIds must be an array",
                code: "INVALID_SIGNAL_IDS"
            });
        }

        const result = await bulkAnalyzeSignals(workspaceId, signalIds, options || {});

        logStructured("info", "bulk_analyze_signals_api", {
            userId: req.user.id,
            workspaceId,
            queued: result.queued
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_analyze_signals_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bulk/signals/create-alerts
 * Bulk create alerts from signals
 * Rate limited: 20/minute
 */
router.post("/signals/create-alerts", rateLimiters.apiDefault(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { signalIds, alertData } = req.body;

        if (!signalIds || !Array.isArray(signalIds)) {
            return res.status(400).json({
                error: "signalIds must be an array",
                code: "INVALID_SIGNAL_IDS"
            });
        }

        const result = await bulkCreateAlertsFromSignals(workspaceId, signalIds, alertData || {});

        logStructured("info", "bulk_create_alerts_api", {
            userId: req.user.id,
            workspaceId,
            created: result.created
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_create_alerts_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/bulk/alerts
 * Bulk update alerts (status, etc)
 * Rate limited: 30/minute
 */
router.patch("/alerts", rateLimiters.search(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { alertIds, updates } = req.body;

        if (!alertIds || !Array.isArray(alertIds)) {
            return res.status(400).json({
                error: "alertIds must be an array",
                code: "INVALID_ALERT_IDS"
            });
        }

        if (!updates || typeof updates !== "object") {
            return res.status(400).json({
                error: "updates must be an object",
                code: "INVALID_UPDATES"
            });
        }

        const result = await bulkUpdateAlerts(workspaceId, alertIds, updates);

        logStructured("info", "bulk_update_alerts_api", {
            userId: req.user.id,
            workspaceId,
            count: result.updated,
            updates
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_update_alerts_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bulk/alerts/assign
 * Bulk assign alerts
 * Rate limited: 20/minute
 */
router.post("/alerts/assign", rateLimiters.apiDefault(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { alertIds, assignment } = req.body;

        if (!alertIds || !Array.isArray(alertIds)) {
            return res.status(400).json({
                error: "alertIds must be an array",
                code: "INVALID_ALERT_IDS"
            });
        }

        if (!assignment || typeof assignment !== "object") {
            return res.status(400).json({
                error: "assignment must be an object",
                code: "INVALID_ASSIGNMENT"
            });
        }

        const result = await bulkAssignAlerts(workspaceId, alertIds, assignment);

        logStructured("info", "bulk_assign_alerts_api", {
            userId: req.user.id,
            workspaceId,
            count: result.assigned,
            assignment
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_assign_alerts_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/bulk/action-plans
 * Bulk update action plans
 * Rate limited: 20/minute
 */
router.patch("/action-plans", rateLimiters.apiDefault(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { planIds, updates } = req.body;

        if (!planIds || !Array.isArray(planIds)) {
            return res.status(400).json({
                error: "planIds must be an array",
                code: "INVALID_PLAN_IDS"
            });
        }

        if (!updates || typeof updates !== "object") {
            return res.status(400).json({
                error: "updates must be an object",
                code: "INVALID_UPDATES"
            });
        }

        const result = await bulkUpdateActionPlans(workspaceId, planIds, updates);

        logStructured("info", "bulk_update_action_plans_api", {
            userId: req.user.id,
            workspaceId,
            count: result.updated
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_update_action_plans_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bulk/action-plans/feedback
 * Bulk submit feedback for action plans
 * Rate limited: 30/minute
 */
router.post("/action-plans/feedback", rateLimiters.feedback(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { planIds, feedback } = req.body;

        if (!planIds || !Array.isArray(planIds)) {
            return res.status(400).json({
                error: "planIds must be an array",
                code: "INVALID_PLAN_IDS"
            });
        }

        if (!feedback || typeof feedback !== "object") {
            return res.status(400).json({
                error: "feedback must be an object",
                code: "INVALID_FEEDBACK"
            });
        }

        const result = await bulkFeedbackActionPlans(workspaceId, planIds, feedback);

        logStructured("info", "bulk_feedback_action_plans_api", {
            userId: req.user.id,
            workspaceId,
            count: result.feedback
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "bulk_feedback_action_plans_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/bulk/export/signals
 * Export signals to CSV/JSON
 * Rate limited: 10/minute (expensive operation)
 */
router.get("/export/signals", rateLimiters.export(), async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { format, platform, sentiment, dateFrom, dateTo } = req.query;

        const filters = {};
        if (platform) filters.platform = platform;
        if (sentiment) filters.sentiment = sentiment;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const data = await streamExportSignals(workspaceId, {
            format: format || "csv",
            filters
        });

        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="signals-${Date.now()}.json"`);
        } else {
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="signals-${Date.now()}.csv"`);
        }

        res.send(data);
    } catch (error) {
        logStructured("error", "bulk_export_signals_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

export default router;
