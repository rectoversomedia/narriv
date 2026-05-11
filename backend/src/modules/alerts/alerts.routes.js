import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { z } from "zod";

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
        console.error("Error fetching alerts:", error);
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
        console.error("Error fetching alert:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/alerts/:id/status - Update alert status
router.patch("/:id/status", async (req, res) => {
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
        console.error("Error updating alert status:", error);
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
                event: "alert_assignment_updated",
                metadata: {
                    alertId: updated.id,
                    workspaceId: updated.workspaceId,
                    assignedTo: updated.assignedTo,
                    assignedTeam: updated.assignedTeam,
                    deadline: updated.deadline,
                    escalationLevel: updated.escalationLevel,
                }
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error("Error updating alert assignment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
