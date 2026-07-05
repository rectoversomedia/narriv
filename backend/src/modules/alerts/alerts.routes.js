import express from "express";
import supabase from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { z } from "zod";
import { alertIdParamsSchema, updateAlertStatusBodySchema } from "./alerts.schema.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

const assignAlertParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

const assignAlertBodySchema = z.object({
    assignedTo: z.string().trim().min(1, "assignedTo cannot be empty.").max(120, "assignedTo is too long.").optional().nullable(),
    assignedTeam: z.string().trim().min(1, "assignedTeam cannot be empty.").max(120, "assignedTeam is too long.").optional().nullable(),
    deadline: z.string().datetime("deadline must be a valid ISO datetime.").optional().nullable(),
    escalationLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
});

function buildHourlyAlertTimeline(alerts, now = new Date()) {
    const bucketCount = 24;
    const hourMs = 60 * 60 * 1000;
    const currentTime = now.getTime();
    const timeline = Array.from({ length: bucketCount }, () => 0);
    const timelineLabels = Array.from({ length: bucketCount }, (_, index) => {
        const bucketDate = new Date(currentTime - (bucketCount - 1 - index) * hourMs);
        return `${bucketDate.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false })}:00`;
    });

    alerts.forEach((alert) => {
        const createdAt = new Date(alert.created_at);
        if (Number.isNaN(createdAt.getTime())) return;
        const hoursAgo = Math.floor((currentTime - createdAt.getTime()) / hourMs);
        const bucketIndex = bucketCount - 1 - hoursAgo;
        if (bucketIndex < 0 || bucketIndex >= bucketCount) return;
        timeline[bucketIndex] += 1;
    });

    return { timeline, timelineLabels };
}

// POST /api/alerts - Create a new alert
const createAlertBodySchema = z.object({
    title: z.string().trim().min(1, "title is required").max(200, "title is too long"),
    type: z.enum(["risk", "opportunity", "positioning"]).default("risk"),
    severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    whatHappened: z.string().trim().max(2000).optional().nullable(),
    whyItMatters: z.string().trim().max(2000).optional().nullable(),
    whatToDo: z.string().trim().max(2000).optional().nullable(),
    assignedTo: z.string().trim().max(120).optional().nullable(),
    assignedTeam: z.string().trim().max(120).optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    sources: z.array(z.string()).optional().default([]),
    workspaceId: z.string().uuid().optional(),
}).strict();

router.post("/", validateRequest({ body: createAlertBodySchema }), async (req, res) => {
    try {
        const { title, type, severity, whatHappened, whyItMatters, whatToDo, assignedTo, assignedTeam, deadline, sources, workspaceId } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: alert, error: alertError } = await supabase
            .from('alerts')
            .insert({
                workspace_id: scopedWorkspaceId,
                title,
                type,
                severity,
                what_happened: whatHappened || null,
                why_it_matters: whyItMatters || null,
                what_to_do: whatToDo || null,
                assigned_to: assignedTo || null,
                assigned_team: assignedTeam || null,
                deadline: deadline ? new Date(deadline).toISOString() : null,
                status: "open",
                sources: sources || [],
            })
            .select()
            .single();

        if (alertError || !alert) {
            logStructured("error", "Error creating alert:", { error: alertError?.message || alertError });
            return res.status(500).json({ error: "Internal server error" });
        }

        await supabase.from('audit_logs').insert({
            user_id: req.user.id,
            workspace_id: alert.workspace_id,
            event: "alert_created",
            metadata: {
                target_type: "alert",
                alert_id: alert.id,
                workspace_id: alert.workspace_id,
                title: alert.title,
                severity: alert.severity,
            }
        });

        res.status(201).json(alert);
    } catch (error) {
        logStructured("error", "Error creating alert:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/alerts - Get list of alerts with filtering and pagination
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const { type, severity, status, workspaceId, search } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            const safeLimit = Math.min(Math.max(1, limit), 100);
            return res.json({
                data: [],
                pagination: { page: 1, limit: safeLimit, total: 0, totalPages: 0 }
            });
        }

        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const skip = (safePage - 1) * safeLimit;

        // Build Supabase query
        let query = supabase
            .from('alerts')
            .select('*', { count: 'exact' })
            .in('workspace_id', scopedWorkspaceIds);

        if (type) {
            query = query.eq('type', type);
        }

        if (severity) {
            query = query.eq('severity', severity);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (typeof search === "string" && search.trim()) {
            const searchTerm = search.trim();
            query = query.or(`title.ilike.%${searchTerm}%,what_happened.ilike.%${searchTerm}%,why_it_matters.ilike.%${searchTerm}%,what_to_do.ilike.%${searchTerm}%,assigned_to.ilike.%${searchTerm}%,assigned_team.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`);
        }

        query = query.order('created_at', { ascending: false }).range(skip, skip + safeLimit - 1);

        const { data: dataResult, error: dataError, count } = await query;

        if (dataError) {
            logStructured("error", "Error fetching alerts:", { error: dataError?.message || dataError, stack: dataError?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

        res.json({
            data: dataResult || [],
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / safeLimit)
            }
        });
    } catch (error) {
        logStructured("error", "Error fetching alerts:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/alerts/summary - Aggregate metrics for the workspace
router.get("/summary", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({
                total: 0,
                by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
                by_status: { open: 0, in_progress: 0, resolved: 0 },
                by_type: {},
                timeline: [],
                timeline_labels: [],
                last_7_days: 0,
                previous_7_days: 0,
                trend_delta: 0,
                acknowledged_count: 0,
                resolved_count: 0,
                escalated_count: 0,
                overdue_count: 0,
                avg_response_time_minutes: null,
                delivery_success_rate: 0,
                acknowledgment_rate: 0,
                sla_target_minutes: null,
            });
        }

        // Fetch all alerts for the workspace
        const { data: all, error: allError } = await supabase
            .from('alerts')
            .select('severity, status, type, created_at, acknowledged_at, resolved_at, escalation_level, deadline')
            .in('workspace_id', scopedWorkspaceIds);

        if (allError) {
            logStructured("error", "Error fetching alerts summary:", { error: allError?.message || allError, stack: allError?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

        // Fetch escalation matrices for SLA targets
        const { data: escalationLevels, error: matrixError } = await supabase
            .from('escalation_matrices')
            .select('sla_minutes, "order"')
            .in('workspace_id', scopedWorkspaceIds)
            .eq('is_active', true)
            .order('order', { ascending: true });

        if (matrixError) {
            logStructured("error", "Error fetching escalation matrices:", { error: matrixError?.message || matrixError, stack: matrixError?.stack });
        }

        // Group by type manually (Supabase doesn't support groupBy like Prisma)
        const byTypeObj = {};
        for (const alert of (all || [])) {
            const t = alert.type || "unknown";
            byTypeObj[t] = (byTypeObj[t] || 0) + 1;
        }

        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        const byStatus = { open: 0, in_progress: 0, resolved: 0 };
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let last7Days = 0;
        let previous7Days = 0;
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        let totalResponseTimeMs = 0;
        let acknowledgedCountForTime = 0;
        let acknowledgedCount = 0;
        let resolvedCount = 0;
        let escalatedCount = 0;
        let overdueCount = 0;
        const now = Date.now();

        for (const a of all || []) {
            const sev = String(a.severity || "").toLowerCase();
            if (sev === "critical") bySeverity.critical += 1;
            else if (sev === "high") bySeverity.high += 1;
            else if (sev === "medium") bySeverity.medium += 1;
            else if (sev === "low") bySeverity.low += 1;
            else bySeverity.info += 1;

            const stt = String(a.status || "").toLowerCase();
            if (stt === "open") byStatus.open += 1;
            else if (stt === "in_progress" || stt === "in-progress" || stt === "acknowledged") byStatus.in_progress += 1;
            else if (stt === "resolved") byStatus.resolved += 1;
            if (a.acknowledged_at) acknowledgedCount += 1;
            if (a.resolved_at || stt === "resolved") resolvedCount += 1;
            if (["high", "critical"].includes(String(a.escalation_level || "").toLowerCase())) escalatedCount += 1;
            if (a.deadline && stt !== "resolved") {
                const deadline = new Date(a.deadline);
                if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < now) overdueCount += 1;
            }

            const t = new Date(a.created_at);
            if (Number.isNaN(t.getTime())) continue;
            if (t >= sevenDaysAgo) last7Days += 1;
            else if (t >= fourteenDaysAgo) previous7Days += 1;

            if (a.acknowledged_at) {
                const created = new Date(a.created_at);
                const acked = new Date(a.acknowledged_at);
                if (!Number.isNaN(created.getTime()) && !Number.isNaN(acked.getTime())) {
                    totalResponseTimeMs += Math.max(0, acked.getTime() - created.getTime());
                    acknowledgedCountForTime += 1;
                }
            }
        }

        const avgResponseTimeMinutes = acknowledgedCountForTime > 0
            ? Math.round(totalResponseTimeMs / (acknowledgedCountForTime * 60 * 1000))
            : null;
        const deliverySuccessRate = (all?.length || 0) > 0 ? Math.round(((acknowledgedCount + resolvedCount) / ((all?.length || 0) * 2)) * 100) : 0;
        const acknowledgmentRate = (all?.length || 0) > 0 ? Math.round((acknowledgedCount / (all?.length || 0)) * 100) : 0;
        const slaTargetMinutes = (escalationLevels?.length || 0) > 0
            ? Math.min(...escalationLevels.map((level) => level.sla_minutes).filter((value) => Number.isFinite(value) && value > 0))
            : null;

        const trendDelta = previous7Days === 0 ? (last7Days > 0 ? 1 : 0) : (last7Days - previous7Days) / previous7Days;
        const { timeline, timelineLabels } = buildHourlyAlertTimeline(all || []);

        return res.json({
            total: all?.length || 0,
            by_severity: bySeverity,
            by_status: byStatus,
            by_type: byTypeObj,
            last_7_days: last7Days,
            previous_7_days: previous7Days,
            trend_delta: trendDelta,
            timeline,
            timeline_labels: timelineLabels,
            acknowledged_count: acknowledgedCount,
            resolved_count: resolvedCount,
            escalated_count: escalatedCount,
            overdue_count: overdueCount,
            avg_response_time_minutes: avgResponseTimeMinutes,
            delivery_success_rate: deliverySuccessRate,
            acknowledgment_rate: acknowledgmentRate,
            sla_target_minutes: slaTargetMinutes,
        });
    } catch (error) {
        logStructured("error", "Error fetching alerts summary:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/alerts/:id - Get a single alert by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: alert, error } = await supabase
            .from('alerts')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !alert) {
            return res.status(404).json({ error: "Alert not found" });
        }

        if (!scopedWorkspaceIds.includes(alert.workspace_id)) {
            return res.status(404).json({ error: "Alert not found" });
        }

        res.json(alert);
    } catch (error) {
        logStructured("error", "Error fetching alert:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/alerts/:id/status - Update alert status
router.patch("/:id/status", validateRequest({ params: alertIdParamsSchema, body: updateAlertStatusBodySchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const validStatuses = ["open", "acknowledged", "resolved"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const { data: existing, error: existingError } = await supabase
            .from('alerts')
            .select('id, workspace_id, acknowledged_at')
            .eq('id', id)
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: "Alert not found" });
        }

        if (!scopedWorkspaceIds.includes(existing.workspace_id)) {
            return res.status(404).json({ error: "Alert not found" });
        }

        const updateData = { status };
        if (status === "acknowledged") {
            updateData.acknowledged_at = new Date().toISOString();
            updateData.resolved_at = null;
        } else if (status === "resolved") {
            if (!existing.acknowledged_at) {
                updateData.acknowledged_at = new Date().toISOString();
            }
            updateData.resolved_at = new Date().toISOString();
        } else if (status === "open") {
            updateData.acknowledged_at = null;
            updateData.resolved_at = null;
        }

        const { data: updatedAlert, error: updateError } = await supabase
            .from('alerts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logStructured("error", "Error updating alert status:", { error: updateError?.message || updateError, stack: updateError?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

        res.json(updatedAlert);
    } catch (error) {
        logStructured("error", "Error updating alert status:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/alerts/:id/assign - Update assignment workflow fields
router.patch("/:id/assign", validateRequest({ params: assignAlertParamsSchema, body: assignAlertBodySchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo, assignedTeam, deadline, escalationLevel } = req.body;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: existing, error: existingError } = await supabase
            .from('alerts')
            .select('id, workspace_id, escalation_level')
            .eq('id', id)
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: "Alert not found" });
        }

        if (!scopedWorkspaceIds.includes(existing.workspace_id)) {
            return res.status(404).json({ error: "Alert not found" });
        }

        const { data: updated, error: updateError } = await supabase
            .from('alerts')
            .update({
                assigned_to: assignedTo ?? null,
                assigned_team: assignedTeam ?? null,
                deadline: deadline ? new Date(deadline).toISOString() : null,
                escalation_level: escalationLevel ?? existing.escalation_level,
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logStructured("error", "Error updating alert assignment:", { error: updateError?.message || updateError, stack: updateError?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

        await supabase.from('audit_logs').insert({
            user_id: req.user.id,
            workspace_id: updated.workspace_id,
            event: "assignment_change",
            metadata: {
                target_type: "alert",
                alert_id: updated.id,
                workspace_id: updated.workspace_id,
                assigned_to: updated.assigned_to,
                assigned_team: updated.assigned_team,
                deadline: updated.deadline,
                escalation_level: updated.escalation_level,
            }
        });

        if (escalationLevel && escalationLevel !== existing.escalation_level) {
            await supabase.from('audit_logs').insert({
                user_id: req.user.id,
                workspace_id: updated.workspace_id,
                event: "escalation_change",
                metadata: {
                    target_type: "alert",
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: existing.escalation_level,
                    escalation_level: updated.escalation_level,
                }
            });
        }

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating alert assignment:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
