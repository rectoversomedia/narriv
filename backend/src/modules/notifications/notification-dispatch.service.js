import supabase from "../../lib/supabase.js";
import { createNotificationProviders } from "./notification-providers.js";
import { logStructured } from "../../lib/logger.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { formatAlertText } from "../../lib/notifications/chat-channels.js";

/** The workspace's owners' emails, used when no notification email is set. */
async function ownerEmails(workspaceId) {
    const { data: owners } = await baseSupabaseAdmin.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("role", "owner");
    const ids = (owners || []).map((o) => o.user_id);
    if (!ids.length) return [];
    const { data: users } = await baseSupabaseAdmin.from("users").select("email").in("id", ids);
    return (users || []).map((u) => u.email).filter(Boolean);
}

const providers = createNotificationProviders();

async function getWorkspaceNotificationContext(workspaceId) {
    const [{ data: notificationSettings, error: nsError }, { data: workspaceSettings, error: wsError }] = await Promise.all([
        supabase
            .from("workspace_notification_settings")
            .select("*")
            .eq("workspace_id", workspaceId)
            .maybeSingle(),
        supabase
            .from("workspace_settings")
            .select("notification_email, whatsapp_pic, brand_name")
            .eq("workspace_id", workspaceId)
            .maybeSingle(),
    ]);

    if (nsError) {
        logStructured("error", "Error fetching notification settings:", { error: nsError?.message || nsError });
    }
    if (wsError) {
        logStructured("error", "Error fetching workspace settings:", { error: wsError?.message || wsError });
    }

    return {
        workspaceId,
        brandName: workspaceSettings?.brand_name || "Your Workspace",
        emailTo: workspaceSettings?.notification_email || null,
        ownerEmails: workspaceSettings?.notification_email ? [] : await ownerEmails(workspaceId),
        whatsappTo: workspaceSettings?.whatsapp_pic || null,
        settings: {
            emailEnabled: notificationSettings?.email_enabled ?? true,
            whatsappEnabled: notificationSettings?.whatsapp_enabled ?? false,
            escalationNotifications: notificationSettings?.escalation_notifications ?? true,
            reminderNotifications: notificationSettings?.reminder_notifications ?? true,
        }
    };
}

async function dispatchByEnabledChannels({
    workspaceId,
    subject,
    message,
    html = null,
    text = null,
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

    const emailTargets = ctx.emailTo ? [ctx.emailTo] : ctx.ownerEmails || [];
    if (ctx.settings.emailEnabled) {
        for (const to of emailTargets) {
            results.push(await providers.email.send({ to, subject, message, html, metadata: { ...metadata, workspaceId, brandName: ctx.brandName } }));
        }
    }

    if (ctx.settings.whatsappEnabled && ctx.whatsappTo) {
        results.push(await providers.whatsapp.send({
            to: ctx.whatsappTo,
            subject,
            message,
            text,
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

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** The alert email: severity, title, what happened, the next step and a button to the alert, in the workspace language. */
export function alertEmailHtml({ lang, brandName, alertId, title, severity, whatHappened, whatToDo }) {
    const id = lang !== "en";
    const sev = { critical: id ? "KRITIS" : "CRITICAL", high: id ? "TINGGI" : "HIGH" }[severity] || (id ? "PERINGATAN" : "ALERT");
    const appUrl = (process.env.FRONTEND_URL || process.env.APP_URL || "https://www.narriv.digital").replace(/\/$/, "");
    return `<!doctype html><html><body style="margin:0;background:#F5F7FC;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#101334;padding:20px 26px;color:#fff"><div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#A5B4FF">NARRIV · ${esc(brandName)}</div></td></tr>
<tr><td style="padding:24px 26px 8px"><span style="display:inline-block;background:#B42318;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:6px">${sev}</span>
<div style="font-size:20px;font-weight:800;color:#101334;margin-top:10px">${esc(title)}</div>
${whatHappened ? `<p style="font-size:15px;line-height:1.5;color:#31406B;margin:10px 0 0">${esc(whatHappened)}</p>` : ""}
${whatToDo ? `<p style="font-size:15px;line-height:1.5;color:#101334;margin:12px 0 0"><b>${id ? "Langkah" : "Next step"}:</b> ${esc(whatToDo)}</p>` : ""}</td></tr>
<tr><td style="padding:18px 26px 26px"><a href="${appUrl}/alerts/${esc(alertId)}" style="display:inline-block;background:#465FFF;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px">${id ? "Buka peringatan" : "Open the alert"}</a></td></tr>
</table></td></tr></table></body></html>`;
}

export async function notifyNewHighRiskAlert({ workspaceId, alertId, title, severity, whatHappened, whatToDo = null }) {
    const lang = await workspaceLanguage(workspaceId);
    const { data: ws } = await baseSupabaseAdmin.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
    const sevWord = { critical: lang === "en" ? "CRITICAL" : "KRITIS", high: lang === "en" ? "HIGH" : "TINGGI" }[severity] || (lang === "en" ? "ALERT" : "PERINGATAN");
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Narriv] ${sevWord}: ${title || (lang === "en" ? "New alert" : "Peringatan baru")}`,
        message: `${whatHappened || ""}${whatToDo ? `\n${lang === "en" ? "Next step" : "Langkah"}: ${whatToDo}` : ""}`,
        html: alertEmailHtml({ lang, brandName: ws?.brand_name || "Narriv", alertId, title, severity, whatHappened, whatToDo }),
        text: formatAlertText({ id: alertId, title, severity, what_happened: whatHappened, what_to_do: whatToDo }),
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

