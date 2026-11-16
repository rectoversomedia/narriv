import supabase from "../../lib/supabase.js";
import { createNotificationProviders } from "./notification-providers.js";
import { logStructured } from "../../lib/logger.js";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { formatAlertText } from "../../lib/notifications/chat-channels.js";
import { appUrl, emailButton, emailHero, emailLayout, emailList, emailSection, emailStats, esc } from "../../lib/email-layout.js";

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
        const lang = await workspaceLanguage(workspaceId);
        for (const to of emailTargets) {
            results.push(await providers.email.send({ to, subject, message, html, metadata: { ...metadata, workspaceId, brandName: ctx.brandName, lang } }));
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

const SEV_COLOR = { critical: "#B42318", high: "#C2410C" };
const PLATFORM = { x: "X", twitter: "X", tiktok: "TikTok", instagram: "Instagram", threads: "Threads", youtube: "YouTube", facebook: "Facebook", web: "Web", news: "News", reddit: "Reddit" };
const platformName = (p, lang) => (p === "news" && lang === "id" ? "Berita" : PLATFORM[String(p || "").toLowerCase()] || String(p || "").replace(/^./, (c) => c.toUpperCase()));
const jakartaTime = (iso, lang) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
    const time = d.toLocaleTimeString(lang === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
    return `${day}, ${time} WIB`;
};

/**
 * The alert email, in the workspace language: severity and headline, the numbers behind it, what happened, why it
 * matters, the next step, a few of the mentions that set it off, and a button to the alert.
 */
export function alertEmailHtml({ lang, brandName, alertId, title, severity, whatHappened, whyItMatters, whatToDo, stats, sources, mentions, detectedAt }) {
    const w = (en, idText) => (lang === "id" ? idText : en);
    const sev = String(severity || "").toLowerCase();
    const chip = { critical: w("Critical alert", "Peringatan kritis"), high: w("High-risk alert", "Peringatan risiko tinggi") }[sev] || w("Alert", "Peringatan");
    const when = jakartaTime(detectedAt, lang);
    const srcList = (sources || []).filter(Boolean).map((p) => platformName(p, lang));
    const lead = [when && w(`Detected ${esc(when)}`, `Terdeteksi ${esc(when)}`), srcList.length && `${w("from", "dari")} ${esc(srcList.join(", "))}`].filter(Boolean).join(" ");
    let body = emailHero({ chip, chipColor: SEV_COLOR[sev] || "#465FFF", title: title || w("New alert", "Peringatan baru"), lead: lead || null });
    if (stats && Number(stats.total) > 0) {
        body += emailStats([
            [String(stats.negative ?? 0), w("negative mentions", "percakapan negatif"), "#B42318"],
            [String(stats.total), w("mentions checked", "percakapan dicek")],
            [`${Math.round(Number(stats.ratio) || 0)}%`, w("negative share", "porsi negatif"), "#B42318"],
        ]);
    }
    if (whatHappened) body += emailSection(w("What happened", "Apa yang terjadi"), esc(whatHappened));
    if (whyItMatters) body += emailSection(w("Why it matters", "Mengapa ini penting"), esc(whyItMatters));
    if (whatToDo) body += emailSection(w("Recommended next step", "Langkah yang disarankan"), `<div style="background:#F5F7FF;border-left:4px solid #465FFF;border-radius:8px;padding:12px 14px;color:#101334;font-weight:600">${esc(whatToDo)}</div>`);
    if (mentions?.length) {
        body += emailSection(w("Mentions behind this alert", "Contoh percakapan pemicu"), emailList(mentions.map((m) => ({
            tag: platformName(m.platform, lang),
            tagColor: "#465FFF",
            title: String(m.title || "").slice(0, 140),
            href: m.url || null,
            meta: [m.author && esc(m.author), m.at && esc(jakartaTime(m.at, lang))].filter(Boolean).join(" · ") || null,
        }))));
    }
    body += emailButton(`${appUrl()}/alerts/${encodeURIComponent(alertId || "")}`, w("Open the alert in Narriv", "Buka peringatan di Narriv"), w("Assign an owner and track the response there.", "Tunjuk penanggung jawab dan pantau penanganannya di sana."));
    return emailLayout({
        lang,
        title: `${chip}: ${title || ""}`,
        preheader: whatHappened || title,
        kicker: brandName,
        body,
        reason: w(
            `You get this email because alerts are switched on for the ${esc(brandName)} workspace. Only critical and high-risk alerts are emailed.`,
            `Anda menerima email ini karena notifikasi aktif untuk workspace ${esc(brandName)}. Hanya peringatan kritis dan risiko tinggi yang dikirim lewat email.`,
        ),
    });
}

/** The alert row, the numbers behind it and up to three of the negative mentions that set it off. */
async function alertDetails(alertId) {
    if (!alertId) return {};
    const { data: alert } = await baseSupabaseAdmin.from("alerts").select("why_it_matters, sources, metadata, created_at").eq("id", alertId).maybeSingle();
    if (!alert) return {};
    const m = alert.metadata || {};
    let mentions = [];
    const ids = Array.isArray(m.signal_ids) ? m.signal_ids.slice(0, 3) : [];
    if (ids.length) {
        const { data } = await baseSupabaseAdmin.from("signals").select("title, url, platform, author, published_at, captured_at").in("id", ids);
        mentions = (data || []).map((s) => ({ title: s.title, url: s.url, platform: s.platform, author: s.author, at: s.published_at || s.captured_at }));
    }
    return {
        whyItMatters: alert.why_it_matters || null,
        sources: Array.isArray(alert.sources) ? alert.sources : [],
        stats: m.total_count ? { negative: m.negative_count, total: m.total_count, ratio: m.negative_ratio } : null,
        mentions,
        detectedAt: m.detected_at || alert.created_at,
    };
}

export async function notifyNewHighRiskAlert({ workspaceId, alertId, title, severity, whatHappened, whatToDo = null }) {
    const lang = await workspaceLanguage(workspaceId);
    const { data: ws } = await baseSupabaseAdmin.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
    const details = await alertDetails(alertId).catch(() => ({}));
    const sevWord = { critical: lang === "en" ? "CRITICAL" : "KRITIS", high: lang === "en" ? "HIGH" : "TINGGI" }[severity] || (lang === "en" ? "ALERT" : "PERINGATAN");
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Narriv] ${sevWord}: ${title || (lang === "en" ? "New alert" : "Peringatan baru")}`,
        message: `${whatHappened || ""}${whatToDo ? `\n${lang === "en" ? "Next step" : "Langkah"}: ${whatToDo}` : ""}`,
        html: alertEmailHtml({ lang, brandName: ws?.brand_name || "Narriv", alertId, title, severity, whatHappened, whatToDo, ...details }),
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

