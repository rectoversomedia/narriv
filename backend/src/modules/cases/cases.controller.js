import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";

export async function listCases(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { search, status, priority, page, limit } = req.query;
        const skip = (page - 1) * limit;

        let query = supabase
            .from("cases")
            .select("*", { count: "exact" })
            .eq("workspace_id", scopedWorkspaceId)
            .order("created_at", { ascending: false })
            .range(skip, skip + limit - 1);

        if (search) {
            query = query.or(
                `title.ilike.%${search}%,description.ilike.%${search}%,assigned_to.ilike.%${search}%,assigned_team.ilike.%${search}%`
            );
        }
        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);

        const { data: cases, error, count } = await query;

        if (error) {
            logStructured("error", "Error listing cases:", { error: error.message || error });
            return internalError(res);
        }

        const totalPages = Math.ceil((count || 0) / limit);

        return res.json({
            data: cases || [],
            meta: { page, limit, total: count || 0, totalPages },
        });
    } catch (error) {
        logStructured("error", "Error listing cases:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function getCase(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: caseRecord, error } = await supabase
            .from("cases")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error getting case:", { error: error.message || error });
            return internalError(res);
        }

        if (!caseRecord) {
            return notFound(res, "Case not found", "CASE_NOT_FOUND");
        }

        return res.json(caseRecord);
    } catch (error) {
        logStructured("error", "Error getting case:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createCase(req, res) {
    try {
        const { workspaceId, title, description, priority, sourceType, sourceId, assignedTo, assignedTeam, deadline } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: caseRecord, error } = await supabase
            .from("cases")
            .insert({
                workspace_id: scopedWorkspaceId,
                title,
                description: description || null,
                priority: priority || "medium",
                source_type: sourceType || null,
                source_id: sourceId || null,
                assigned_to: assignedTo || null,
                assigned_team: assignedTeam || null,
                deadline: deadline ? new Date(deadline).toISOString() : null,
            })
            .select()
            .single();

        if (error) {
            logStructured("error", "Error creating case:", { error: error.message || error });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "case_created",
            metadata: { workspace_id: scopedWorkspaceId, case_id: caseRecord.id, title },
        });

        return res.status(201).json(caseRecord);
    } catch (error) {
        logStructured("error", "Error creating case:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function updateCase(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: existing, error: findError } = await supabase
            .from("cases")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding case:", { error: findError.message || findError });
            return internalError(res);
        }

        if (!existing) {
            return notFound(res, "Case not found", "CASE_NOT_FOUND");
        }

        const { workspaceId, ...updateData } = req.body;

        // Convert snake_case for update
        const supabaseUpdateData = {};
        if (updateData.title !== undefined) supabaseUpdateData.title = updateData.title;
        if (updateData.description !== undefined) supabaseUpdateData.description = updateData.description;
        if (updateData.status !== undefined) supabaseUpdateData.status = updateData.status;
        if (updateData.priority !== undefined) supabaseUpdateData.priority = updateData.priority;
        if (updateData.assignedTo !== undefined) supabaseUpdateData.assigned_to = updateData.assignedTo;
        if (updateData.assignedTeam !== undefined) supabaseUpdateData.assigned_team = updateData.assignedTeam;
        if (updateData.deadline !== undefined) {
            supabaseUpdateData.deadline = updateData.deadline ? new Date(updateData.deadline).toISOString() : null;
        }
        if (updateData.resolution !== undefined) supabaseUpdateData.resolution = updateData.resolution;

        const { data: updated, error: updateError } = await supabase
            .from("cases")
            .update(supabaseUpdateData)
            .eq("id", req.params.id)
            .select()
            .single();

        if (updateError) {
            logStructured("error", "Error updating case:", { error: updateError.message || updateError });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "case_updated",
            metadata: { workspace_id: scopedWorkspaceId, case_id: updated.id, changes: updateData },
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating case:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function deleteCase(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: existing, error: findError } = await supabase
            .from("cases")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding case:", { error: findError.message || findError });
            return internalError(res);
        }

        if (!existing) {
            return notFound(res, "Case not found", "CASE_NOT_FOUND");
        }

        const { error: deleteError } = await supabase
            .from("cases")
            .delete()
            .eq("id", req.params.id);

        if (deleteError) {
            logStructured("error", "Error deleting case:", { error: deleteError.message || deleteError });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "case_deleted",
            metadata: { workspace_id: scopedWorkspaceId, case_id: req.params.id },
        });

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting case:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
