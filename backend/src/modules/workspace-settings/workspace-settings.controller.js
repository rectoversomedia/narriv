import supabase from "../../lib/supabase.js";
import { badRequest, forbidden, internalError, notFound } from "../../lib/api-error.js";
import { recordAuditLog } from "../../lib/audit.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";

function toSafeDefaults(workspaceId) {
    return {
        workspace_id: workspaceId,
        brand_name: null,
        industry: null,
        timezone: "UTC",
        notification_email: null,
        whatsapp_pic: null,
        logo_url: null,
        created_at: null,
        updated_at: null,
    };
}

export async function getWorkspaceSettings(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: settings, error } = await supabase
            .from("workspace_settings")
            .select("*")
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error fetching workspace settings:", { error: error?.message || error });
            return internalError(res);
        }

        if (!settings) {
            return res.json(toSafeDefaults(scopedWorkspaceId));
        }

        return res.json(settings);
    } catch (error) {
        logStructured("error", "Error fetching workspace settings:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function updateWorkspaceSettings(req, res) {
    try {
        const { workspaceId, brandName, industry, timezone, notificationEmail, whatsappPIC } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        // Check if settings exist
        const { data: existing } = await supabase
            .from("workspace_settings")
            .select("id")
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        let updated;
        if (existing) {
            const updates = {};
            if (brandName !== undefined) updates.brand_name = brandName;
            if (industry !== undefined) updates.industry = industry;
            if (timezone !== undefined) updates.timezone = timezone;
            if (notificationEmail !== undefined) updates.notification_email = notificationEmail;
            if (whatsappPIC !== undefined) updates.whatsapp_pic = whatsappPIC;

            const { data, error } = await supabase
                .from("workspace_settings")
                .update(updates)
                .eq("workspace_id", scopedWorkspaceId)
                .select()
                .single();

            if (error) {
                logStructured("error", "Error updating workspace settings:", { error: error?.message || error });
                return internalError(res);
            }
            updated = data;
        } else {
            const { data, error } = await supabase
                .from("workspace_settings")
                .insert({
                    workspace_id: scopedWorkspaceId,
                    brand_name: brandName ?? null,
                    industry: industry ?? null,
                    timezone: timezone ?? "UTC",
                    notification_email: notificationEmail ?? null,
                    whatsapp_pic: whatsappPIC ?? null,
                })
                .select()
                .single();

            if (error) {
                logStructured("error", "Error creating workspace settings:", { error: error?.message || error });
                return internalError(res);
            }
            updated = data;
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: scopedWorkspaceId,
            event: "workspace_settings_updated",
            metadata: {
                workspace_id: scopedWorkspaceId,
                brand_name: updated.brand_name,
                industry: updated.industry,
                timezone: updated.timezone,
                notification_email: updated.notification_email,
                whatsapp_pic: updated.whatsapp_pic,
            }
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating workspace settings:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function listWorkspaceMembers(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: members, error } = await supabase
            .from("workspace_members")
            .select(`
                id,
                workspace_id,
                user_id,
                role,
                created_at,
                users (
                    id,
                    email,
                    name
                )
            `)
            .eq("workspace_id", scopedWorkspaceId)
            .order("created_at", { ascending: true });

        if (error) {
            logStructured("error", "Error listing workspace members:", { error: error?.message || error });
            return internalError(res);
        }

        return res.json({
            data: members.map((member) => ({
                id: member.id,
                workspace_id: member.workspace_id,
                user_id: member.user_id,
                role: member.role,
                created_at: member.created_at,
                user: member.users,
            }))
        });
    } catch (error) {
        logStructured("error", "Error listing workspace members:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createWorkspaceMember(req, res) {
    try {
        const { workspaceId, userId, email, name, role } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : null;

        // Find user by id or email
        let user;
        if (userId) {
            const { data, error } = await supabase
                .from("users")
                .select("id, email, name")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                logStructured("error", "Error finding user by id:", { error: error?.message || error });
            }
            user = data;
        } else if (normalizedEmail) {
            const { data, error } = await supabase
                .from("users")
                .select("id, email, name")
                .eq("email", normalizedEmail)
                .maybeSingle();

            if (error) {
                logStructured("error", "Error finding user by email:", { error: error?.message || error });
            }
            user = data;
        }

        if (!user) {
            return notFound(res, "User not found. Ask the user to sign up before adding them to this workspace.", "USER_NOT_FOUND", normalizedEmail ? { email: normalizedEmail } : undefined);
        }

        const { data: existing } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("workspace_id", scopedWorkspaceId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (existing) {
            return badRequest(res, "User is already a member of this workspace", "DUPLICATE_MEMBERSHIP");
        }

        const { data: member, error: createError } = await supabase
            .from("workspace_members")
            .insert({
                workspace_id: scopedWorkspaceId,
                user_id: user.id,
                role,
            })
            .select()
            .single();

        if (createError) {
            logStructured("error", "Error creating workspace member:", { error: createError?.message || createError });
            return internalError(res);
        }

        await recordAuditLog({
            userId: req.user.id,
            event: "workspace_member_added",
            workspaceId: scopedWorkspaceId,
            metadata: { memberId: member.id, addedUserId: user.id, email: user.email || normalizedEmail, invitedName: name || null, role },
        });

        return res.status(201).json({ ...member, user });
    } catch (error) {
        logStructured("error", "Error creating workspace member:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function deleteWorkspaceMember(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: member, error: findError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("id", req.params.id)
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (findError) {
            logStructured("error", "Error finding workspace member:", { error: findError?.message || findError });
        }

        if (!member) {
            return notFound(res, "Workspace member not found", "WORKSPACE_MEMBER_NOT_FOUND");
        }

        const { error: deleteError } = await supabase
            .from("workspace_members")
            .delete()
            .eq("id", member.id);

        if (deleteError) {
            logStructured("error", "Error deleting workspace member:", { error: deleteError?.message || deleteError });
            return internalError(res);
        }

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error deleting workspace member:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function deleteWorkspace(req, res) {
    try {
        const { workspaceId, reason } = req.body;
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        // Count tenant data across multiple tables
        const countPromises = [
            supabase.from("sources").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("ingestion_jobs").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("raw_documents").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("signals").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("alerts").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("narrative_clusters").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("reports").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("action_plans").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("generated_assets").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("ai_visibility_results").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("prompt_test_runs").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
            supabase.from("ai_feedback").select("id", { count: "exact", head: true }).eq("workspace_id", scopedWorkspaceId),
        ];

        const countResults = await Promise.all(countPromises);
        const counts = countResults.map((r) => r.count || 0);

        const hasTenantData = counts.some((count) => count > 0);
        if (hasTenantData) {
            await recordAuditLog({
                userId: req.user.id,
                workspaceId: scopedWorkspaceId,
                event: "workspace_delete_restricted",
                metadata: {
                    workspace_id: scopedWorkspaceId,
                    reason,
                    dataCounts: {
                        sources: counts[0],
                        ingestionJobs: counts[1],
                        rawDocuments: counts[2],
                        signals: counts[3],
                        alerts: counts[4],
                        narrativeClusters: counts[5],
                        reports: counts[6],
                        actionPlans: counts[7],
                        generatedAssets: counts[8],
                        visibilityResults: counts[9],
                        promptTestRuns: counts[10],
                        aiFeedback: counts[11],
                    }
                }
            });

            return res.status(409).json({
                error: "Workspace deletion is restricted because tenant data still exists.",
                code: "WORKSPACE_DELETE_RESTRICTED",
                details: {
                    workspace_id: scopedWorkspaceId,
                    rule: "restrict_delete",
                }
            });
        }

        // Delete workspace-related records in order (respecting foreign keys)
        const deletePromises = [
            supabase.from("workspace_settings").delete().eq("workspace_id", scopedWorkspaceId),
            supabase.from("workspace_notification_settings").delete().eq("workspace_id", scopedWorkspaceId),
            supabase.from("workspace_members").delete().eq("workspace_id", scopedWorkspaceId),
        ];

        await Promise.all(deletePromises);

        // Delete workspace
        const { error: deleteWorkspaceError } = await supabase
            .from("workspaces")
            .delete()
            .eq("id", scopedWorkspaceId);

        if (deleteWorkspaceError) {
            logStructured("error", "Error deleting workspace:", { error: deleteWorkspaceError?.message || deleteWorkspaceError });
            return internalError(res);
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: scopedWorkspaceId,
            event: "workspace_deleted",
            metadata: {
                workspace_id: scopedWorkspaceId,
                reason,
                strategy: "restrict_delete",
            }
        });

        return res.json({ success: true, workspace_id: scopedWorkspaceId });
    } catch (error) {
        logStructured("error", "Error deleting workspace:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
