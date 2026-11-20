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
        telegramChats: await supabase.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle().then(({ data }) => (data?.settings?.telegram?.chats || []).map((c) => c.id)).catch(() => []),
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

    if (ctx.telegramChats.length) {
        results.push(await providers.telegram.send({ chatIds: ctx.telegramChats, subject, message, text, metadata: { ...metadata, workspaceId } }));
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
    return lang === "id" ? `${day} pukul ${time} WIB` : `${day} at ${time} WIB`;
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
    const lead = [when && w(`Detected on ${esc(when)}`, `Terdeteksi ${esc(when)}`), srcList.length && `${w("Sources", "Sumber")}: ${esc(srcList.join(", "))}`].filter(Boolean).join(" · ");
    let body = emailHero({ chip, chipColor: SEV_COLOR[sev] || "#465FFF", title: title || w("New alert", "Peringatan baru"), lead: lead || null });
    if (stats && Number(stats.total) > 0) {
        body += emailStats([
            [String(stats.negative ?? 0), w("negative mentions", "percakapan negatif"), "#B42318"],
            [String(stats.total), w("mentions reviewed", "percakapan ditinjau")],
            [`${Math.round(Number(stats.ratio) || 0)}%`, w("negative share", "porsi negatif"), "#B42318"],
        ]);
    }
    if (whatHappened) body += emailSection(w("What happened", "Apa yang terjadi"), esc(whatHappened));
    if (whyItMatters) body += emailSection(w("Why it matters", "Mengapa ini penting"), esc(whyItMatters));
    if (whatToDo) body += emailSection(w("Recommended action", "Tindakan yang disarankan"), `<div style="background:#F5F7FF;border-left:4px solid #465FFF;border-radius:8px;padding:12px 14px;color:#101334;font-weight:600">${esc(whatToDo)}</div>`);
    if (mentions?.length) {
        body += emailSection(w("Mentions that triggered this alert", "Percakapan yang memicu peringatan ini"), emailList(mentions.map((m) => ({
            tag: platformName(m.platform, lang),
            tagColor: "#465FFF",
            title: String(m.title || "").slice(0, 140),
            href: m.url || null,
            meta: [m.author && esc(m.author), m.at && esc(jakartaTime(m.at, lang))].filter(Boolean).join(" · ") || null,
        }))));
    }
    body += emailButton(`${appUrl()}/alerts/${encodeURIComponent(alertId || "")}`, w("View alert in Narriv", "Lihat peringatan di Narriv"), w("Assign an owner and track the response from the alert page.", "Tetapkan penanggung jawab dan pantau penanganannya dari halaman peringatan."));
    return emailLayout({
        lang,
        title: `${chip}: ${title || ""}`,
        preheader: whatHappened || title,
        kicker: brandName,
        body,
        reason: w(
            `You are receiving this email because alert notifications are enabled for the ${esc(brandName)} workspace. Only critical and high-risk alerts are sent by email.`,
            `Anda menerima email ini karena notifikasi peringatan aktif untuk workspace ${esc(brandName)}. Hanya peringatan kritis dan berisiko tinggi yang dikirim melalui email.`,
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
    const sevWord = { critical: lang === "en" ? "Critical Alert" : "Peringatan Kritis", high: lang === "en" ? "High-Risk Alert" : "Peringatan Risiko Tinggi" }[severity] || (lang === "en" ? "Alert" : "Peringatan");
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Narriv] ${sevWord}: ${title || (lang === "en" ? "New Alert" : "Peringatan Baru")}`,
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

/** Several alerts in one email: each with its severity, what happened and a link, then a button to all alerts. */
export function alertDigestEmailHtml({ lang, brandName, alerts }) {
    const w = (en, idText) => (lang === "id" ? idText : en);
    const n = alerts.length;
    const sevName = { critical: w("Critical", "Kritis"), high: w("High risk", "Risiko tinggi") };
    let body = emailHero({
        chip: w("Alert summary", "Ringkasan peringatan"),
        chipColor: "#C2410C",
        title: w(`${n} new alerts need your attention`, `${n} peringatan baru perlu perhatian Anda`),
        lead: w("Grouped into one email so your inbox stays readable. Open each alert to see the full details and assign an owner.", "Digabung dalam satu email agar kotak masuk Anda tetap rapi. Buka setiap peringatan untuk melihat detail lengkap dan menetapkan penanggung jawab."),
    });
    body += `<div style="margin-top:26px">${emailList(alerts.map((a) => {
        const sev = String(a.severity || "").toLowerCase();
        const what = String(a.what_happened || a.description || "");
        return {
            tag: `${sevName[sev] || sev}${a.created_at ? ` · ${jakartaTime(a.created_at, lang)}` : ""}`,
            tagColor: SEV_COLOR[sev] || "#5F6B94",
            title: a.title,
            href: `${appUrl()}/alerts/${encodeURIComponent(a.id)}`,
            meta: what ? esc(what.length > 180 ? `${what.slice(0, 177)}...` : what) : null,
        };
    }))}</div>`;
    body += emailButton(`${appUrl()}/alerts`, w("View all alerts in Narriv", "Lihat semua peringatan di Narriv"));
    return emailLayout({
        lang,
        title: w(`${n} new alerts`, `${n} peringatan baru`),
        preheader: alerts.map((a) => a.title).join(" · "),
        kicker: brandName,
        body,
        reason: w(
            `You are receiving this email because alert notifications are enabled for the ${esc(brandName)} workspace. High-risk alerts are grouped into one summary; critical alerts are sent right away.`,
            `Anda menerima email ini karena notifikasi peringatan aktif untuk workspace ${esc(brandName)}. Peringatan risiko tinggi digabung dalam satu ringkasan; peringatan kritis dikirim langsung.`,
        ),
    });
}

export async function notifyAlertDigest({ workspaceId, alerts }) {
    const lang = await workspaceLanguage(workspaceId);
    const { data: ws } = await baseSupabaseAdmin.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
    const brandName = ws?.brand_name || "Narriv";
    const n = alerts.length;
    const lines = alerts.map((a, i) => `${i + 1}. ${a.title}`).join("\n");
    return dispatchByEnabledChannels({
        workspaceId,
        subject: lang === "en" ? `[Narriv] ${n} New Alerts: ${brandName}` : `[Narriv] ${n} Peringatan Baru: ${brandName}`,
        message: lines,
        html: alertDigestEmailHtml({ lang, brandName, alerts }),
        text: `${lang === "en" ? `[Narriv] ${n} new alerts for ${brandName}` : `[Narriv] ${n} peringatan baru untuk ${brandName}`}\n\n${lines}\n\n${appUrl()}/alerts`,
        metadata: { event: "alert_digest", count: n },
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


/** Narriv Radar: the day's top risky stories as "what we found → what to do", on every enabled channel. */
export async function notifyRadar({ workspaceId, radar }) {
    const { radarText } = await import("../../lib/narrative-radar.js");
    const { data: ws } = await baseSupabaseAdmin.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
    const brandName = ws?.brand_name || "Narriv";
    const text = radarText(radar, brandName);
    const html = emailLayout({
        lang: "id",
        title: "Narriv Radar",
        preheader: `Narriv Radar: ${radar.items.length} isu perlu perhatian`,
        body: [
            emailHero({ chip: "Narriv Radar", title: `${radar.items.length} isu perlu perhatian hari ini`, lead: `Ringkasan narrative intelligence untuk ${esc(brandName)}.` }),
            ...radar.items.map((it, i) => emailSection(`${i + 1}. ${esc(it.title)} · risiko ${it.score}`, `<p><b>Temuan:</b> ${esc(it.finding)}</p><p><b>Langkah:</b> ${esc(it.action)}</p>`)),
            emailButton(`${appUrl()}/feed`, "Buka Feed Narasi"),
        ].join(""),
    });
    const { dispatchTextToWebhooks } = await import("../integrations/webhook-dispatcher.service.js");
    await dispatchTextToWebhooks(workspaceId, `${text}\n${appUrl()}/feed`).catch(() => null);
    return dispatchByEnabledChannels({
        workspaceId,
        subject: `[Narriv Radar] ${radar.items.length} isu perlu perhatian: ${brandName}`,
        message: text,
        html,
        text: `${text}\n${appUrl()}/feed`,
        metadata: { event: "narrative_radar", count: radar.items.length },
    });
}
