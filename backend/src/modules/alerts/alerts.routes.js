import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
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
        const createdAt = new Date(alert.createdAt);
        if (Number.isNaN(createdAt.getTime())) return;
        const hoursAgo = Math.floor((currentTime - createdAt.getTime()) / hourMs);
        const bucketIndex = bucketCount - 1 - hoursAgo;
        if (bucketIndex < 0 || bucketIndex >= bucketCount) return;
        timeline[bucketIndex] += 1;
    });

    return { timeline, timelineLabels };
}

// GET /api/alerts - Get list of alerts with filtering and pagination
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        
        const { type, severity, status, workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            const safeLimit = Math.max(1, limit);
            return res.json({
                data: [],
                pagination: { page: 1, limit: safeLimit, total: 0, totalPages: 0 }
            });
        }
        
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic where clause
        const whereClause = {};

        if (type) {
            whereClause.type = type;
        }

        if (severity) {
            whereClause.severity = severity;
        }

        if (status) {
            whereClause.status = status;
        }
        
        whereClause.workspaceId = { in: scopedWorkspaceIds };

        const [data, total] = await Promise.all([
            prisma.alert.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.alert.count({
                where: whereClause
            })
        ]);

        res.json({
            data: data || [],
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: total || 0,
                totalPages: Math.ceil((total || 0) / safeLimit)
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
            });
        }

        const where = { workspaceId: { in: scopedWorkspaceIds } };

        const [all, byType] = await Promise.all([
            prisma.alert.findMany({
                where,
                select: { severity: true, status: true, type: true, createdAt: true },
            }),
            prisma.alert.groupBy({
                by: ["type"],
                where,
                _count: { _all: true },
            }),
        ]);

        const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        const byStatus = { open: 0, in_progress: 0, resolved: 0 };
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let last7Days = 0;
        let previous7Days = 0;
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        for (const a of all) {
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

            const t = new Date(a.createdAt);
            if (Number.isNaN(t.getTime())) continue;
            if (t >= sevenDaysAgo) last7Days += 1;
            else if (t >= fourteenDaysAgo) previous7Days += 1;
        }

        const typeMap = {};
        for (const row of byType) {
            typeMap[row.type] = row._count._all;
        }

        const trendDelta = previous7Days === 0 ? (last7Days > 0 ? 1 : 0) : (last7Days - previous7Days) / previous7Days;
        const { timeline, timelineLabels } = buildHourlyAlertTimeline(all);

        return res.json({
            total: all.length,
            by_severity: bySeverity,
            by_status: byStatus,
            by_type: typeMap,
            last_7_days: last7Days,
            previous_7_days: previous7Days,
            trend_delta: trendDelta,
            timeline,
            timeline_labels: timelineLabels,
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

        const alert = await prisma.alert.findUnique({
            where: { id },
        });

        if (!alert || !scopedWorkspaceIds.includes(alert.workspaceId)) {
            return res.status(404).json({ error: "Alert not found" });
        }

        // Prisma automatically includes all scalar fields, which covers:
        // title, whatHappened, whyItMatters, whatToDo, severity, etc.
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

        const existing = await prisma.alert.findUnique({ where: { id } });
        if (!existing || !scopedWorkspaceIds.includes(existing.workspaceId)) {
            return res.status(404).json({ error: "Alert not found" });
        }

        const updatedAlert = await prisma.alert.update({
            where: { id },
            data: { status },
        });

        res.json(updatedAlert);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Alert not found" });
        }
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

        const existing = await prisma.alert.findUnique({ where: { id } });
        if (!existing || !scopedWorkspaceIds.includes(existing.workspaceId)) {
            return res.status(404).json({ error: "Alert not found" });
        }

        const updated = await prisma.alert.update({
            where: { id },
            data: {
                assignedTo: assignedTo ?? null,
                assignedTeam: assignedTeam ?? null,
                deadline: deadline ? new Date(deadline) : null,
                escalationLevel: escalationLevel ?? existing.escalationLevel,
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "assignment_change",
                metadata: {
                    targetType: "alert",
                    alertId: updated.id,
                    workspaceId: updated.workspaceId,
                    assignedTo: updated.assignedTo,
                    assignedTeam: updated.assignedTeam,
                    deadline: updated.deadline,
                    escalationLevel: updated.escalationLevel,
                }
            }
        });

        if (escalationLevel && escalationLevel !== existing.escalationLevel) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    event: "escalation_change",
                    metadata: {
                        targetType: "alert",
                        alertId: updated.id,
                        workspaceId: updated.workspaceId,
                        previousEscalationLevel: existing.escalationLevel,
                        escalationLevel: updated.escalationLevel,
                    }
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
