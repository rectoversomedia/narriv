import supabase from "../../lib/supabase.js";
import { forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { logStructured } from "../../lib/logger.js";
import { recordAuditLog } from "../../lib/audit.js";

function toSafeDefaults(workspace_id) {
    return {
        workspace_id,
        email_enabled: true,
        whatsapp_enabled: false,
        escalation_notifications: true,
        reminder_notifications: true,
    };
}

export async function getNotificationSettings(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const { data: settings, error } = await supabase
            .from("workspace_notification_settings")
            .select("*")
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        if (error) {
            logStructured("error", "Error fetching notification settings:", { error: error?.message || error });
            return internalError(res);
        }

        if (!settings) {
            return res.json(toSafeDefaults(scopedWorkspaceId));
        }

        return res.json(settings);
    } catch (error) {
        logStructured("error", "Error fetching notification settings:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}

export async function updateNotificationSettings(req, res) {
    try {
        const { workspaceId, emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications, customRules } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        // Check if settings exist
        const { data: existing } = await supabase
            .from("workspace_notification_settings")
            .select("id")
            .eq("workspace_id", scopedWorkspaceId)
            .maybeSingle();

        let updated;
        if (existing) {
            // Update existing
            const updates = {};
            if (emailEnabled !== undefined) updates.email_enabled = emailEnabled;
            if (whatsappEnabled !== undefined) updates.whatsapp_enabled = whatsappEnabled;
            if (escalationNotifications !== undefined) updates.escalation_notifications = escalationNotifications;
            if (reminderNotifications !== undefined) updates.reminder_notifications = reminderNotifications;
            if (customRules !== undefined) updates.custom_rules = customRules;

            const { data, error } = await supabase
                .from("workspace_notification_settings")
                .update(updates)
                .eq("workspace_id", scopedWorkspaceId)
                .select()
                .single();

            if (error) {
                logStructured("error", "Error updating notification settings:", { error: error?.message || error });
                return internalError(res);
            }
            updated = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from("workspace_notification_settings")
                .insert({
                    workspace_id: scopedWorkspaceId,
                    email_enabled: emailEnabled ?? true,
                    whatsapp_enabled: whatsappEnabled ?? false,
                    escalation_notifications: escalationNotifications ?? true,
                    reminder_notifications: reminderNotifications ?? true,
                    custom_rules: customRules ?? [],
                })
                .select()
                .single();

            if (error) {
                logStructured("error", "Error creating notification settings:", { error: error?.message || error });
                return internalError(res);
            }
            updated = data;
        }

        await recordAuditLog({
            userId: req.user.id,
            workspaceId: scopedWorkspaceId,
            event: "notification_settings_updated",
            metadata: {
                workspace_id: scopedWorkspaceId,
                email_enabled: updated.email_enabled,
                whatsapp_enabled: updated.whatsapp_enabled,
                escalation_notifications: updated.escalation_notifications,
                reminder_notifications: updated.reminder_notifications,
            }
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating notification settings:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
