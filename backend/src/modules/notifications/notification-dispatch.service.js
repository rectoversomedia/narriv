import prisma from "../../prisma.js";
import { createNotificationProviders } from "./notification-providers.js";
import { logStructured } from "../../lib/logger.js";

const providers = createNotificationProviders();

async function getWorkspaceNotificationContext(workspaceId) {
    const [notificationSettings, workspaceSettings] = await Promise.all([
        prisma.workspaceNotificationSettings.findUnique({
            where: { workspaceId },
        }),
        prisma.workspaceSettings.findUnique({
            where: { workspaceId },
            select: {
                notificationEmail: true,
                whatsappPIC: true,
                brandName: true,
            }
        })
    ]);

    return {
        workspaceId,
        brandName: workspaceSettings?.brandName || "Your Workspace",
        emailTo: workspaceSettings?.notificationEmail || null,
        whatsappTo: workspaceSettings?.whatsappPIC || null,
        settings: {
            emailEnabled: notificationSettings?.emailEnabled ?? true,
            whatsappEnabled: notificationSettings?.whatsappEnabled ?? false,
            escalationNotifications: notificationSettings?.escalationNotifications ?? true,
            reminderNotifications: notificationSettings?.reminderNotifications ?? true,
        }
    };
}

async function dispatchByEnabledChannels({
    workspaceId,
    subject,
    message,
    metadata,
    requireEscalationToggle = false,
    requireReminderToggle = false,
}) {
    const ctx = await getWorkspaceNotificationContext(workspaceId);
    const results = [];

    const escalationBlocked = requireEscalationToggle && !ctx.settings.escalationNotifications;
    const reminderBlocked = requireReminderToggle && !ctx.settings.reminderNotifications;

    if (escalationBlocked || reminderBlocked) {
        logStructured("info", "dispatch_skipped_by_toggle", {
            workspaceId,
            requireEscalationToggle,
            requireReminderToggle,
            settings: ctx.settings,
        });
        return { delivered: false, results: [] };
    }

    if (ctx.settings.emailEnabled && ctx.emailTo) {
        results.push(await providers.email.send({
            to: ctx.emailTo,
            subject,
            message,
            metadata: { ...metadata, workspaceId, brandName: ctx.brandName },
        }));
    }

    if (ctx.settings.whatsappEnabled && ctx.whatsappTo) {
        results.push(await providers.whatsapp.send({
            to: ctx.whatsappTo,
            subject,
            message,
            metadata: { ...metadata, workspaceId, brandName: ctx.brandName },
        }));
    }

    logStructured("info", "dispatch_processed", {
        workspaceId,
        channelsAttempted: results.length,
        settings: ctx.settings,
    });

    return {
        delivered: results.some((item) => item.delivered),
        results,
    };
}

export async function notifyNewHighRiskAlert({ workspaceId, alertId, title, severity, whatHappened }) {
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[High Risk Alert] ${title || "Untitled Alert"}`,
        message: `Severity: ${severity || "high"}\nSummary: ${whatHappened || "-"}`,
        metadata: {
            event: "new_high_risk_alert",
            alertId,
            severity: severity || "high",
        },
        requireEscalationToggle: true,
    });
}

export async function notifyAssignmentChange({
    workspaceId,
    targetType,
    targetId,
    assignedTo,
    assignedTeam,
    deadline,
    escalationLevel,
}) {
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Assignment Updated] ${targetType} ${targetId}`,
        message: `Assigned to: ${assignedTo || "-"}\nTeam: ${assignedTeam || "-"}\nDeadline: ${deadline || "-"}\nEscalation: ${escalationLevel || "-"}`,
        metadata: {
            event: "assignment_change",
            targetType,
            targetId,
            assignedTo,
            assignedTeam,
            deadline,
            escalationLevel,
        },
    });
}

export async function notifyEscalationChange({
    workspaceId,
    targetType,
    targetId,
    previousEscalationLevel,
    escalationLevel,
}) {
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Escalation Updated] ${targetType} ${targetId}`,
        message: `Escalation changed from ${previousEscalationLevel || "-"} to ${escalationLevel || "-"}.`,
        metadata: {
            event: "escalation_change",
            targetType,
            targetId,
            previousEscalationLevel,
            escalationLevel,
        },
        requireEscalationToggle: true,
    });
}

export async function notifyDeadlineReminder({
    workspaceId,
    targetType,
    targetId,
    assignedTo,
    deadline,
}) {
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Deadline Reminder] ${targetType} ${targetId}`,
        message: `Reminder: ${targetType} ${targetId} is due at ${deadline || "-"}. PIC: ${assignedTo || "-"}`,
        metadata: {
            event: "deadline_reminder",
            targetType,
            targetId,
            assignedTo,
            deadline,
        },
        requireReminderToggle: true,
    });
}

