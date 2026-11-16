/**
 * Emails a scheduled report to the people who read it: the workspace's notification email, or its owners when none
 * is set. The email carries the headline numbers and the three decisions, links to Narriv, and attaches the PDF.
 * Skipped (never thrown) when email is switched off for the workspace or no email provider is configured.
 */
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { buildReportPdf, collectReportData, reportFileName } from "./report-files.js";
import { emailButton, emailHero, emailLayout, emailList, emailSection, emailStats, esc } from "../../lib/email-layout.js";


async function recipients(workspaceId) {
    const { data: settings } = await db.from("workspace_settings").select("notification_email").eq("workspace_id", workspaceId).maybeSingle();
    if (settings?.notification_email) return [settings.notification_email];
    const { data: owners } = await db.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("role", "owner");
    const ids = (owners || []).map((o) => o.user_id);
    if (!ids.length) return [];
    const { data: users } = await db.from("users").select("email").in("id", ids);
    return (users || []).map((u) => u.email).filter(Boolean);
}

const period = (data, lang) => {
    const fmt = (iso, opts) => new Date(iso).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { ...opts, timeZone: "Asia/Jakarta" });
    if (!data.periodStart || !data.periodEnd || Number.isNaN(new Date(data.periodStart).getTime())) return "";
    return `${fmt(data.periodStart, { day: "numeric", month: "short" })} – ${fmt(data.periodEnd, { day: "numeric", month: "short", year: "numeric" })}`;
};

/** The report email: headline numbers, the change from last period, top issues, what to decide, and the PDF note. */
export function reportEmailHtml(data, lang, appUrl) {
    const id = lang !== "en";
    const w = (en, idText) => (id ? idText : en);
    const t = data.totals;
    const p = data.previous;
    const change = p && p.signals ? (t.negative - p.negative) : null;
    const open = (data.alerts || []).filter((a) => a.status !== "resolved").slice(0, 3);
    const sev = { critical: w("Critical", "Kritis"), high: w("High", "Tinggi"), medium: w("Medium", "Sedang"), low: w("Low", "Rendah") };
    const sevColor = { critical: "#B42318", high: "#C2410C", medium: "#B54708", low: "#5F6B94" };
    const brand = data.brand || "Narriv";
    const range = period(data, lang);

    let body = emailHero({
        chip: w("Report", "Laporan"),
        title: brand,
        lead: [esc(data.title), range && esc(range)].filter(Boolean).join(" · "),
    });
    body += emailStats([
        [String(t.signals), w("mentions", "percakapan")],
        [`${t.negative}%`, w("negative", "negatif"), "#B42318"],
        [`${t.positive ?? 0}%`, w("positive", "positif"), "#12A150"],
        [String(t.alerts), w("alerts", "peringatan")],
    ]);
    if (change !== null) {
        const line = change === 0
            ? w("Negative share unchanged from the previous period.", "Porsi negatif sama dengan periode sebelumnya.")
            : w(`Negative share is ${change > 0 ? "up" : "down"} ${Math.abs(change)} points from the previous period.`, `Porsi negatif ${change > 0 ? "naik" : "turun"} ${Math.abs(change)} poin dari periode sebelumnya.`);
        body += `<p style="margin:16px 0 0;text-align:center;font-size:14px;color:${change > 0 ? "#B42318" : "#5F6B94"};font-weight:600">${line}</p>`;
    }
    const issues = (data.issues || []).slice(0, 3);
    if (issues.length) {
        body += emailSection(w("Top issues", "Isu teratas"), emailList(issues.map((i) => ({
            title: i.title,
            meta: `${i.signals} ${w("mentions", "percakapan")}${i.impact ? ` · ${esc(i.impact)}` : ""}`,
        }))));
    }
    body += emailSection(w("Decisions needed", "Yang perlu diputuskan"), open.length
        ? emailList(open.map((a, i) => ({
            tag: `${i + 1} · ${sev[a.severity] || a.severity || ""}`,
            tagColor: sevColor[a.severity] || "#5F6B94",
            title: a.title,
            meta: `${w("Owner", "PJ")}: ${esc(a.owner || w("not assigned yet", "belum ditetapkan"))}${a.whatToDo ? `<br>${esc(a.whatToDo)}` : ""}`,
        })))
        : w("No open alerts require a decision this week.", "Tidak ada peringatan terbuka yang memerlukan keputusan minggu ini."));
    const asOf = data.freshness?.dataAsOf
        ? new Date(data.freshness.dataAsOf).toLocaleString(id ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
        : null;
    const note = [
        w("The full report is attached as a PDF.", "Laporan lengkap terlampir dalam PDF."),
        asOf ? w(`Data as of ${asOf} WIB, counted by publication date. Posts that arrive late appear on the report page in Narriv.`, `Data per ${asOf} WIB, dihitung berdasarkan tanggal terbit. Postingan yang terlambat masuk tetap muncul di halaman laporan Narriv.`) : null,
    ].filter(Boolean).join("<br>");
    body += emailButton(`${appUrl}/reports`, w("View report in Narriv", "Lihat laporan di Narriv"), note);
    return emailLayout({
        lang: id ? "id" : "en",
        title: `${brand}: ${data.title || w("Report", "Laporan")}`,
        preheader: `${t.signals} ${w("mentions", "percakapan")}, ${t.negative}% ${w("negative", "negatif")}, ${t.alerts} ${w("alerts", "peringatan")}${range ? ` · ${range}` : ""}`,
        kicker: brand,
        body,
        reason: w(`You are receiving this email because you are a scheduled report recipient for ${esc(brand)}.`, `Anda menerima email ini karena terdaftar sebagai penerima laporan terjadwal ${esc(brand)}.`),
    });
}

/** Builds the report email (numbers, decisions, PDF attached) in the report's language and sends it to each address. */
export async function emailReport(report, to, { subjectPrefix = "" } = {}) {
    const { sendEmail } = await import("../../lib/email.js");
    const lang = report.content?.language || await workspaceLanguage(report.workspace_id);
    const data = await collectReportData(report);
    const pdf = await buildReportPdf(data, lang);
    const appUrl = (process.env.FRONTEND_URL || process.env.APP_URL || "https://www.narriv.digital").replace(/\/$/, "");
    const subject = `${subjectPrefix}${data.brand || "Narriv"}: ${data.title || (lang === "en" ? "Report" : "Laporan")}`;
    const html = reportEmailHtml(data, lang, appUrl);
    let sent = 0;
    for (const email of to) {
        const r = await sendEmail({ to: email, subject, html, attachments: [{ filename: reportFileName(data, "pdf"), content: pdf }] });
        if (r?.id) sent++;
    }
    return sent;
}

export async function deliverScheduledReport(reportId) {
    try {
        const { data: report } = await db.from("reports").select("*").eq("id", reportId).maybeSingle();
        if (!report) return { sent: false, reason: "report_not_found" };
        const { data: notif } = await db.from("workspace_notification_settings").select("email_enabled").eq("workspace_id", report.workspace_id).maybeSingle();
        if (notif && notif.email_enabled === false) return { sent: false, reason: "email_disabled" };
        const { isEmailConfigured } = await import("../../lib/email.js");
        if (!isEmailConfigured()) return { sent: false, reason: "email_provider_not_configured" };
        const to = await recipients(report.workspace_id);
        if (!to.length) return { sent: false, reason: "no_recipient" };

        const sent = await emailReport(report, to);
        await db.from("audit_logs").insert({ user_id: null, workspace_id: report.workspace_id, event: "report_email_sent", metadata: { reportId, recipients: to.length, sent, scheduled: true } });
        return { sent: sent > 0, recipients: to.length, delivered: sent };
    } catch (error) {
        logStructured("warn", "scheduled_report_delivery_failed", { reportId, error: error?.message || error });
        return { sent: false, reason: "error" };
    }
}
