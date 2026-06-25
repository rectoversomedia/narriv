import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { z } from "zod";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

const escalationLevelSchema = z.object({
    level: z.string().trim().min(1, "level is required").max(10),
    roleName: z.string().trim().min(1, "roleName is required").max(100),
    slaMinutes: z.number().int().min(1, "slaMinutes must be at least 1"),
    isActive: z.boolean().optional().default(true),
    order: z.number().int().min(0),
}).strict();

const updateEscalationLevelSchema = z.object({
    roleName: z.string().trim().min(1).max(100).optional(),
    slaMinutes: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
}).strict();

// GET /api/alerts/escalation-matrix - Get escalation matrix for workspace
router.get("/escalation-matrix", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const levels = await prisma.escalationMatrix.findMany({
            where: { workspaceId: scopedWorkspaceId },
            orderBy: { order: "asc" }
        });

        return res.json({ data: levels });
    } catch (error) {
        logStructured("error", "Error fetching escalation matrix:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/alerts/escalation-matrix - Create or update escalation matrix levels
router.post("/escalation-matrix", validateRequest({ body: z.object({ levels: z.array(escalationLevelSchema).min(1).max(5) }) }), async (req, res) => {
    try {
        const { levels } = req.body;
        const { workspaceId } = req.query;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        // Delete levels that are no longer in the payload
        const incomingLevels = levels.map((l) => l.level);
        await prisma.escalationMatrix.deleteMany({
            where: {
                workspaceId: scopedWorkspaceId,
                level: { notIn: incomingLevels }
            }
        });

        // Upsert each level
        const results = await Promise.all(
            levels.map((level) =>
                prisma.escalationMatrix.upsert({
                    where: {
                        workspaceId_level: {
                            workspaceId: scopedWorkspaceId,
                            level: level.level,
                        }
                    },
                    update: {
                        roleName: level.roleName,
                        slaMinutes: level.slaMinutes,
                        isActive: level.isActive,
                        order: level.order,
                    },
                    create: {
                        workspaceId: scopedWorkspaceId,
                        level: level.level,
                        roleName: level.roleName,
                        slaMinutes: level.slaMinutes,
                        isActive: level.isActive,
                        order: level.order,
                    }
                })
            )
        );

        return res.json({ data: results });
    } catch (error) {
        logStructured("error", "Error updating escalation matrix:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// PATCH /api/alerts/escalation-matrix/:level - Update single level
router.patch("/escalation-matrix/:level", validateRequest({ 
    params: z.object({ level: z.string() }),
    body: updateEscalationLevelSchema 
}), async (req, res) => {
    try {
        const { level } = req.params;
        const { roleName, slaMinutes, isActive, order } = req.body;
        const { workspaceId } = req.query;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const existing = await prisma.escalationMatrix.findUnique({
            where: { workspaceId_level: { workspaceId: scopedWorkspaceId, level } }
        });
        if (!existing) {
            return res.status(404).json({ error: "Level not found" });
        }

        const updated = await prisma.escalationMatrix.update({
            where: { workspaceId_level: { workspaceId: scopedWorkspaceId, level } },
            data: {
                ...(roleName !== undefined && { roleName }),
                ...(slaMinutes !== undefined && { slaMinutes }),
                ...(isActive !== undefined && { isActive }),
                ...(order !== undefined && { order }),
            }
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating escalation level:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/alerts/escalation-matrix/:level - Delete single level
router.delete("/escalation-matrix/:level", async (req, res) => {
    try {
        const { level } = req.params;
        const { workspaceId } = req.query;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        await prisma.escalationMatrix.delete({
            where: { workspaceId_level: { workspaceId: scopedWorkspaceId, level } }
        });

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting escalation level:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
