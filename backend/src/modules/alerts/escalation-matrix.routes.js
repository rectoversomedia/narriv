import express from "express";
import supabase from "../../lib/supabase.js";
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

        const { data: levels, error } = await supabase
            .from('escalation_matrices')
            .select('*')
            .eq('workspace_id', scopedWorkspaceId)
            .order('sort_order', { ascending: true });

        if (error) {
            logStructured("error", "Error fetching escalation matrix:", { error: error?.message || error, stack: error?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

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

        const { error: deleteError } = await supabase
            .from('escalation_matrices')
            .delete()
            .eq('workspace_id', scopedWorkspaceId)
            .not('level', 'in', `(${incomingLevels.map(l => `'${l}'`).join(',')})`);

        if (deleteError) {
            logStructured("error", "Error deleting old escalation levels:", { error: deleteError?.message || deleteError });
        }

        // Upsert each level
        const results = [];
        for (const level of levels) {
            // First try to update existing
            const { data: existing } = await supabase
                .from('escalation_matrices')
                .select('id')
                .eq('workspace_id', scopedWorkspaceId)
                .eq('level', level.level)
                .single();

            if (existing) {
                // Update existing
                const { data: updated, error: updateError } = await supabase
                    .from('escalation_matrices')
                    .update({
                        role_name: level.roleName,
                        sla_minutes: level.slaMinutes,
                        is_active: level.isActive,
                        order: level.order,
                    })
                    .eq('workspace_id', scopedWorkspaceId)
                    .eq('level', level.level)
                    .select()
                    .single();

                if (!updateError && updated) {
                    results.push(updated);
                }
            } else {
                // Insert new
                const { data: created, error: insertError } = await supabase
                    .from('escalation_matrices')
                    .insert({
                        workspace_id: scopedWorkspaceId,
                        level: level.level,
                        role_name: level.roleName,
                        sla_minutes: level.slaMinutes,
                        is_active: level.isActive,
                        order: level.order,
                    })
                    .select()
                    .single();

                if (!insertError && created) {
                    results.push(created);
                }
            }
        }

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

        const { data: existing, error: existingError } = await supabase
            .from('escalation_matrices')
            .select('id')
            .eq('workspace_id', scopedWorkspaceId)
            .eq('level', level)
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: "Level not found" });
        }

        const updateData = {};
        if (roleName !== undefined) updateData.role_name = roleName;
        if (slaMinutes !== undefined) updateData.sla_minutes = slaMinutes;
        if (isActive !== undefined) updateData.is_active = isActive;
        if (order !== undefined) updateData.order = order;

        const { data: updated, error: updateError } = await supabase
            .from('escalation_matrices')
            .update(updateData)
            .eq('workspace_id', scopedWorkspaceId)
            .eq('level', level)
            .select()
            .single();

        if (updateError) {
            logStructured("error", "Error updating escalation level:", { error: updateError?.message || updateError, stack: updateError?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

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

        const { error: deleteError } = await supabase
            .from('escalation_matrices')
            .delete()
            .eq('workspace_id', scopedWorkspaceId)
            .eq('level', level);

        if (deleteError) {
            logStructured("error", "Error deleting escalation level:", { error: deleteError?.message || deleteError, stack: deleteError?.stack });
            return res.status(500).json({ error: "Internal server error" });
        }

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting escalation level:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
