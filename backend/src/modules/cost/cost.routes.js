/**
 * Cost Management API Routes
 *
 * Endpoints for workspace cost management:
 * - GET /api/workspace/cost - Get current budget status
 * - GET /api/workspace/cost/breakdown - Get detailed cost breakdown
 * - PATCH /api/workspace/cost - Update budget settings
 * - GET /api/workspace/cost/alerts - Get active alerts
 * - GET /api/workspace/sources/schedule - Get sync schedule
 * - PATCH /api/workspace/sources/:id/sync-settings - Update sync settings
 */

import express from "express";
import { getBudgetStatus, getCostBreakdown, getWorkspaceBudget } from "../../lib/cost-management.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { updateSourceSyncSettings, getWorkspaceSyncSchedule, getFrequencyOptions, canSyncSource } from "../../lib/source-cost-controls.js";
import { logStructured } from "../../lib/logger.js";
import { badRequest, forbidden, internalError } from "../../lib/api-error.js";

const router = express.Router();

/**
 * GET /api/workspace/cost
 * Get current budget status for workspace
 */
router.get("/cost", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const status = await getBudgetStatus(workspaceId);
        res.json(status);
    } catch (error) {
        logStructured("error", "get_cost_status_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * GET /api/workspace/cost/breakdown
 * Get detailed cost breakdown by model and day
 */
router.get("/cost/breakdown", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
        const breakdown = await getCostBreakdown(workspaceId, days);
        res.json(breakdown);
    } catch (error) {
        logStructured("error", "get_cost_breakdown_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * GET /api/workspace/cost/settings
 * Get budget settings for workspace
 */
router.get("/cost/settings", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const budget = await getWorkspaceBudget(workspaceId);
        res.json({
            monthlyBudget: budget.monthlyBudget,
            alertEnabled: budget.alertEnabled,
            autoThrottle: budget.autoThrottle,
            tier: budget.tier,
        });
    } catch (error) {
        logStructured("error", "get_cost_settings_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * PATCH /api/workspace/cost/settings
 * Update budget settings (admin only)
 */
router.patch("/cost/settings", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const { monthlyBudget, alertEnabled, autoThrottle } = req.body;

        // Validate monthly budget
        if (monthlyBudget !== undefined) {
            if (typeof monthlyBudget !== "number" || monthlyBudget < 0) {
                return badRequest(res, "Invalid monthly budget value");
            }
            // Max $10,000 per month
            if (monthlyBudget > 10000) {
                return badRequest(res, "Monthly budget cannot exceed $10,000");
            }
        }

        // Validate alert enabled
        if (alertEnabled !== undefined && typeof alertEnabled !== "boolean") {
            return badRequest(res, "alertEnabled must be boolean");
        }

        // Validate auto throttle
        if (autoThrottle !== undefined && typeof autoThrottle !== "boolean") {
            return badRequest(res, "autoThrottle must be boolean");
        }

        // Update in database
        const { default: supabase } = await import("../../lib/supabase.js");
        const { data, error } = await supabase
            .from("workspace_settings")
            .update({
                cost_budget_monthly: monthlyBudget,
                cost_alert_enabled: alertEnabled,
                cost_auto_throttle: autoThrottle,
                updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", workspaceId)
            .select()
            .single();

        if (error) {
            logStructured("error", "update_cost_settings_failed", { error: error.message });
            return internalError(res);
        }

        logStructured("info", "cost_settings_updated", { workspaceId });

        res.json({
            success: true,
            settings: {
                monthlyBudget: data.cost_budget_monthly,
                alertEnabled: data.cost_alert_enabled,
                autoThrottle: data.cost_auto_throttle,
            },
        });
    } catch (error) {
        logStructured("error", "update_cost_settings_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * GET /api/workspace/cost/alerts
 * Get active cost alerts
 */
router.get("/cost/alerts", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const status = await getBudgetStatus(workspaceId);
        res.json({
            alerts: status.alerts,
            status: status.status,
            utilization: status.metrics.utilization,
        });
    } catch (error) {
        logStructured("error", "get_cost_alerts_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * GET /api/workspace/sources/schedule
 * Get sync schedule for all workspace sources
 */
router.get("/sources/schedule", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const schedule = await getWorkspaceSyncSchedule(workspaceId);
        res.json(schedule);
    } catch (error) {
        logStructured("error", "get_sync_schedule_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * GET /api/workspace/sources/frequency-options
 * Get available sync frequency options
 */
router.get("/sources/frequency-options", async (req, res) => {
    res.json(getFrequencyOptions());
});

/**
 * PATCH /api/workspace/sources/:sourceId/sync-settings
 * Update sync settings for a source
 */
router.patch("/sources/:sourceId/sync-settings", async (req, res) => {
    try {
        const { sourceId } = req.params;
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        const { frequency, maxResults, enabled } = req.body;

        // Validate frequency
        if (frequency !== undefined) {
            const validFrequencies = ["realtime", "hourly", "daily", "weekly", "manual"];
            if (!validFrequencies.includes(frequency)) {
                return badRequest(res, `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}`);
            }
        }

        // Validate maxResults
        if (maxResults !== undefined) {
            if (typeof maxResults !== "number" || maxResults < 1 || maxResults > 5000) {
                return badRequest(res, "maxResults must be between 1 and 5000");
            }
        }

        // Validate enabled
        if (enabled !== undefined && typeof enabled !== "boolean") {
            return badRequest(res, "enabled must be boolean");
        }

        const result = await updateSourceSyncSettings(sourceId, workspaceId, {
            frequency,
            maxResults,
            enabled,
        });

        if (!result.success) {
            return badRequest(res, result.reason);
        }

        logStructured("info", "source_sync_settings_updated_api", {
            sourceId,
            workspaceId,
            changes: { frequency, maxResults, enabled },
        });

        res.json({
            success: true,
            sourceId,
            settings: { frequency, maxResults, enabled },
        });
    } catch (error) {
        logStructured("error", "update_source_sync_settings_failed", { error: error.message });
        return internalError(res);
    }
});

/**
 * GET /api/workspace/sources/:sourceId/sync-status
 * Check if a source can be synced
 */
router.get("/sources/:sourceId/sync-status", async (req, res) => {
    try {
        const { sourceId } = req.params;
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!workspaceId) {
            return forbidden(res, "Workspace access denied");
        }

        // Verify source belongs to workspace
        const { default: supabase } = await import("../../lib/supabase.js");
        const { data: source, error } = await supabase
            .from("sources")
            .select("id")
            .eq("id", sourceId)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (error || !source) {
            return badRequest(res, "Source not found or access denied");
        }

        const status = await canSyncSource(sourceId);
        res.json({
            sourceId,
            ...status,
        });
    } catch (error) {
        logStructured("error", "get_sync_status_failed", { error: error.message });
        return internalError(res);
    }
});

export default router;
