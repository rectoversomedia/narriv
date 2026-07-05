import supabase from "../../lib/supabase.js";
import { badRequest, internalError } from "../../lib/api-error.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";

export async function createOnboardingWorkspace(req, res) {
    try {
        const { brandName, industry, timezone } = req.body;

        // Create workspace
        const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .insert({
                name: brandName,
                slug: `workspace-${req.user.id}-${Date.now()}`,
            })
            .select()
            .single();

        if (workspaceError) {
            logStructured("error", "Error creating workspace:", { error: workspaceError?.message || workspaceError });
            return internalError(res);
        }

        // Create workspace settings
        const { data: settings, error: settingsError } = await supabase
            .from("workspace_settings")
            .insert({
                workspace_id: workspace.id,
                brand_name: brandName,
                industry: industry || null,
                timezone: timezone || "Asia/Jakarta (GMT+7)",
            })
            .select()
            .single();

        if (settingsError) {
            logStructured("error", "Error creating workspace settings:", { error: settingsError?.message || settingsError });
            // Continue anyway, settings can be created later
        }

        // Create notification settings
        const { data: notificationSettings, error: nsError } = await supabase
            .from("workspace_notification_settings")
            .insert({
                workspace_id: workspace.id,
            })
            .select()
            .single();

        if (nsError) {
            logStructured("error", "Error creating notification settings:", { error: nsError?.message || nsError });
            // Continue anyway
        }

        // Create member with user_id
        const { data: member, error: memberError } = await supabase
            .from("workspace_members")
            .insert({
                workspace_id: workspace.id,
                user_id: req.user.id,
                role: "admin",
            })
            .select()
            .single();

        if (memberError) {
            logStructured("error", "Error creating workspace member:", { error: memberError?.message || memberError });
            // Continue anyway
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: workspace.id,
            event: "onboarding_workspace_created",
            metadata: { workspaceId: workspace.id, brandName, industry },
        });

        return res.status(201).json({
            ...workspace,
            settings: settings || null,
            notificationSettings: notificationSettings || null,
            members: member ? [member] : [],
        });
    } catch (error) {
        logStructured("error", "Error creating onboarding workspace:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createOnboardingSources(req, res) {
    try {
        const { sources } = req.body;
        const workspaceId = req.body.workspaceId;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("user_id", req.user.id)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (memberError) {
            logStructured("error", "Error checking membership:", { error: memberError?.message || memberError });
        }
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const sourcesData = sources.map((source) => ({
            workspace_id: workspaceId,
            name: source.name,
            type: source.type,
            actor_id: source.actorId || null,
            input_config: source.inputConfig || {},
            is_active: true,
        }));

        const { data: created, error: createError } = await supabase
            .from("sources")
            .insert(sourcesData)
            .select();

        if (createError) {
            logStructured("error", "Error creating sources:", { error: createError?.message || createError });
            return internalError(res);
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId,
            event: "onboarding_sources_created",
            metadata: { workspaceId, count: created?.length || 0 },
        });

        return res.status(201).json({ count: created?.length || 0 });
    } catch (error) {
        logStructured("error", "Error creating onboarding sources:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createOnboardingNotifications(req, res) {
    try {
        const { workspaceId, emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("user_id", req.user.id)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (memberError) {
            logStructured("error", "Error checking membership:", { error: memberError?.message || memberError });
        }
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        // Check if settings exist
        const { data: existing } = await supabase
            .from("workspace_notification_settings")
            .select("id")
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        let settings;
        if (existing) {
            const { data, error } = await supabase
                .from("workspace_notification_settings")
                .update({
                    email_enabled: emailEnabled,
                    whatsapp_enabled: whatsappEnabled,
                    escalation_notifications: escalationNotifications,
                    reminder_notifications: reminderNotifications,
                })
                .eq("workspace_id", workspaceId)
                .select()
                .single();

            if (error) {
                logStructured("error", "Error updating notification settings:", { error: error?.message || error });
                return internalError(res);
            }
            settings = data;
        } else {
            const { data, error } = await supabase
                .from("workspace_notification_settings")
                .insert({
                    workspace_id: workspaceId,
                    email_enabled: emailEnabled ?? true,
                    whatsapp_enabled: whatsappEnabled ?? false,
                    escalation_notifications: escalationNotifications ?? true,
                    reminder_notifications: reminderNotifications ?? true,
                })
                .select()
                .single();

            if (error) {
                logStructured("error", "Error creating notification settings:", { error: error?.message || error });
                return internalError(res);
            }
            settings = data;
        }

        return res.json(settings);
    } catch (error) {
        logStructured("error", "Error creating onboarding notifications:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function createOnboardingTeam(req, res) {
    try {
        const { members, workspaceId } = req.body;

        if (!workspaceId) {
            return badRequest(res, "workspaceId is required.", "WORKSPACE_ID_REQUIRED");
        }

        const { data: membership, error: memberError } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("user_id", req.user.id)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (memberError) {
            logStructured("error", "Error checking membership:", { error: memberError?.message || memberError });
        }
        if (!membership) {
            return badRequest(res, "Workspace access denied.", "WORKSPACE_ACCESS_DENIED");
        }

        const results = [];
        for (const member of members) {
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("email", member.email)
                .maybeSingle();

            if (userError) {
                logStructured("error", "Error finding user:", { error: userError?.message || userError });
            }

            if (!user) {
                results.push({ email: member.email, status: "user_not_found" });
                continue;
            }

            const { data: existing } = await supabase
                .from("workspace_members")
                .select("id")
                .eq("workspace_id", workspaceId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (existing) {
                results.push({ email: member.email, status: "already_member" });
                continue;
            }

            const { data: newMember, error: createMemberError } = await supabase
                .from("workspace_members")
                .insert({
                    workspace_id: workspaceId,
                    user_id: user.id,
                    role: member.role,
                })
                .select()
                .single();

            if (createMemberError) {
                logStructured("error", "Error creating workspace member:", { error: createMemberError?.message || createMemberError });
                results.push({ email: member.email, status: "error" });
                continue;
            }

            results.push({ email: member.email, status: "added", role: member.role });
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId,
            event: "onboarding_team_invited",
            metadata: { workspaceId, memberCount: members.length, results },
        });

        return res.json({ results });
    } catch (error) {
        logStructured("error", "Error creating onboarding team:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
