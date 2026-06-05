import prisma from "../../prisma.js";
import { forbidden, internalError } from "../../lib/api-error.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

function toSafeDefaults(workspaceId) {
    return {
        workspaceId,
        emailEnabled: true,
        whatsappEnabled: false,
        escalationNotifications: true,
        reminderNotifications: true,
    };
}

export async function getNotificationSettings(req, res) {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const settings = await prisma.workspaceNotificationSettings.findUnique({
            where: { workspaceId: scopedWorkspaceId },
        });

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
        const { workspaceId, emailEnabled, whatsappEnabled, escalationNotifications, reminderNotifications } = req.body;

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return forbidden(res, "Workspace access denied", "WORKSPACE_ACCESS_DENIED");
        }

        const updated = await prisma.workspaceNotificationSettings.upsert({
            where: { workspaceId: scopedWorkspaceId },
            update: {
                ...(emailEnabled !== undefined && { emailEnabled }),
                ...(whatsappEnabled !== undefined && { whatsappEnabled }),
                ...(escalationNotifications !== undefined && { escalationNotifications }),
                ...(reminderNotifications !== undefined && { reminderNotifications }),
            },
            create: {
                workspaceId: scopedWorkspaceId,
                emailEnabled: emailEnabled ?? true,
                whatsappEnabled: whatsappEnabled ?? false,
                escalationNotifications: escalationNotifications ?? true,
                reminderNotifications: reminderNotifications ?? true,
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "notification_settings_updated",
                metadata: {
                    workspaceId: scopedWorkspaceId,
                    emailEnabled: updated.emailEnabled,
                    whatsappEnabled: updated.whatsappEnabled,
                    escalationNotifications: updated.escalationNotifications,
                    reminderNotifications: updated.reminderNotifications,
                }
            }
        });

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating notification settings:", { error: error?.message || error, stack: error?.stack });
        return internalError(res);
    }
}
