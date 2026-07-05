import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";

export async function listIntegrations(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { platform, status } = req.query;

        let query = supabase
            .from("integrations")
            .select("*")
            .eq("workspace_id", scopedWorkspaceId)
            .order("created_at", { ascending: false });

        if (platform) query = query.eq("platform", platform);
        if (status) query = query.eq("status", status);

        const { data: integrations, error } = await query;

        if (error) {
            logStructured("error", "Error listing integrations:", { error: error.message || error });
            return internalError(res);
        }

        return res.json({ data: integrations || [] });
    } catch (error) {
        logStructured("error", "Error listing integrations:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function getIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: integration, error } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error getting integration:", { error: error.message || error });
            return internalError(res);
        }

        if (!integration) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        return res.json(integration);
    } catch (error) {
        logStructured("error", "Error getting integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createIntegration(req, res) {
    try {
        const { workspaceId, name, platform, config } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: integration, error } = await supabase
            .from("integrations")
            .insert({
                workspace_id: scopedWorkspaceId,
                name,
                platform,
                config: config || {},
            })
            .select()
            .single();

        if (error) {
            logStructured("error", "Error creating integration:", { error: error.message || error });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_created",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: integration.id, name, platform },
        });

        return res.status(201).json(integration);
    } catch (error) {
        logStructured("error", "Error creating integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function updateIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: existing, error: findError } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding integration:", { error: findError.message || findError });
            return internalError(res);
        }

        if (!existing) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        const { workspaceId, ...updateData } = req.body;

        const { data: updated, error: updateError } = await supabase
            .from("integrations")
            .update(updateData)
            .eq("id", req.params.id)
            .select()
            .single();

        if (updateError) {
            logStructured("error", "Error updating integration:", { error: updateError.message || updateError });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_updated",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: updated.id, changes: updateData },
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function deleteIntegration(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: existing, error: findError } = await supabase
            .from("integrations")
            .select("*")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding integration:", { error: findError.message || findError });
            return internalError(res);
        }

        if (!existing) {
            return notFound(res, "Integration not found", "INTEGRATION_NOT_FOUND");
        }

        const { error: deleteError } = await supabase
            .from("integrations")
            .delete()
            .eq("id", req.params.id);

        if (deleteError) {
            logStructured("error", "Error deleting integration:", { error: deleteError.message || deleteError });
            return internalError(res);
        }

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: scopedWorkspaceId,
            event: "integration_deleted",
            metadata: { workspace_id: scopedWorkspaceId, integration_id: req.params.id },
        });

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting integration:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
