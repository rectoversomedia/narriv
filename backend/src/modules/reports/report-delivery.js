/**
 * Emails a scheduled report to the people who read it: the workspace's notification email, or its owners when none
 * is set. The email carries the headline numbers and the three decisions, links to Narriv, and attaches the PDF.
 * Skipped (never thrown) when email is switched off for the workspace or no email provider is configured.
 */
import { baseSupabaseAdmin as db } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { buildReportPdf, collectReportData, reportFileName } from "./report-files.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function recipients(workspaceId) {
    const { data: settings } = await db.from("workspace_settings").select("notification_email").eq("workspace_id", workspaceId).maybeSingle();
    if (settings?.notification_email) return [settings.notification_email];
    const { data: owners } = await db.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("role", "owner");
    const ids = (owners || []).map((o) => o.user_id);
    if (!ids.length) return [];
    const { data: users } = await db.from("users").select("email").in("id", ids);
    return (users || []).map((u) => u.email).filter(Boolean);
}

export function reportEmailHtml(data, lang, appUrl) {
    const id = lang !== "en";
    const w = (en, idText) => (id ? idText : en);
    const t = data.totals;
    const p = data.previous;
    const change = p && p.signals ? (t.negative - p.negative) : null;
    const open = (data.alerts || []).filter((a) => a.status !== "resolved").slice(0, 3);
    const sev = { critical: w("Critical", "Kritis"), high: w("High", "Tinggi"), medium: w("Medium", "Sedang"), low: w("Low", "Rendah") };
    const tile = (v, l, color = "#101334") => `<td style="padding:6px"><div style="background:#F5F7FF;border-radius:12px;padding:14px 12px"><div style="font-size:24px;font-weight:800;color:${color}">${v}</div><div style="font-size:12px;color:#5F6B94;margin-top:4px">${l}</div></div></td>`;
    const decisions = open.length
        ? open.map((a, i) => `<tr><td style="padding:10px 0;border-top:1px solid #EEF1F6"><div style="font-size:12px;font-weight:700;color:#B42318">${i + 1} · ${esc(sev[a.severity] || a.severity || "")}</div><div style="font-size:15px;font-weight:700;color:#101334;margin-top:2px">${esc(a.title)}</div><div style="font-size:13px;color:#5F6B94;margin-top:2px">${w("Owner", "PJ")}: ${esc(a.owner || w("no owner yet", "belum ada PJ"))}${a.whatToDo ? ` · ${esc(a.whatToDo)}` : ""}</div></td></tr>`).join("")
        : `<tr><td style="padding:10px 0;color:#5F6B94;font-size:14px">${w("Nothing open needs a decision.", "Tidak ada peringatan terbuka yang perlu diputuskan.")}</td></tr>`;
    return `<!doctype html><html><body style="margin:0;background:#F5F7FC;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FC;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#101334;padding:24px 28px;color:#ffffff">
<div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#A5B4FF">NARRIV</div>
<div style="font-size:22px;font-weight:800;margin-top:6px">${esc(data.brand || data.title)}</div>
<div style="font-size:13px;color:#C9D0F5;margin-top:4px">${esc(data.title)}</div></td></tr>
<tr><td style="padding:20px 22px 4px"><table role="presentation" width="100%"><tr>
${tile(t.signals, w("mentions", "percakapan"))}${tile(`${t.negative}%`, w("negative", "negatif"), "#B42318")}${tile(t.alerts, w("alerts", "peringatan"))}
</tr></table>
${change === null ? "" : `<p style="font-size:14px;color:#31406B;margin:8px 6px 0">${change === 0 ? w("Negative share unchanged from the previous period.", "Porsi negatif sama dengan periode sebelumnya.") : w(`Negative share ${change > 0 ? "up" : "down"} ${Math.abs(change)} points from the previous period.`, `Porsi negatif ${change > 0 ? "naik" : "turun"} ${Math.abs(change)} poin dari periode sebelumnya.`)}</p>`}
</td></tr>
<tr><td style="padding:16px 28px 4px"><div style="font-size:16px;font-weight:800;color:#101334">${w("To decide", "Yang perlu diputuskan")}</div>
<table role="presentation" width="100%">${decisions}</table></td></tr>
<tr><td style="padding:18px 28px 26px"><a href="${appUrl}/reports" style="display:inline-block;background:#465FFF;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px">${w("Open in Narriv", "Buka di Narriv")}</a>
<div style="font-size:12px;color:#8A93B5;margin-top:14px">${w("The full report is attached as a PDF.", "Laporan lengkap terlampir dalam PDF.")}</div></td></tr>
</table></td></tr></table></body></html>`;
}

export async function deliverScheduledReport(reportId) {
    try {
        const { data: report } = await db.from("reports").select("*").eq("id", reportId).maybeSingle();
        if (!report) return { sent: false, reason: "report_not_found" };
        const { data: notif } = await db.from("workspace_notification_settings").select("email_enabled").eq("workspace_id", report.workspace_id).maybeSingle();
        if (notif && notif.email_enabled === false) return { sent: false, reason: "email_disabled" };
        const { sendEmail, isEmailConfigured } = await import("../../lib/email.js");
        if (!isEmailConfigured()) return { sent: false, reason: "email_provider_not_configured" };
        const to = await recipients(report.workspace_id);
        if (!to.length) return { sent: false, reason: "no_recipient" };

        const lang = await workspaceLanguage(report.workspace_id);
        const data = await collectReportData(report);
        const pdf = await buildReportPdf(data, lang);
        const appUrl = (process.env.FRONTEND_URL || process.env.APP_URL || "https://www.narriv.digital").replace(/\/$/, "");
        const subject = lang === "en" ? `${data.brand || "Narriv"}: weekly report` : `${data.brand || "Narriv"}: laporan mingguan`;
        const html = reportEmailHtml(data, lang, appUrl);
        let sent = 0;
        for (const email of to) {
            const r = await sendEmail({ to: email, subject, html, attachments: [{ filename: reportFileName(data, "pdf"), content: pdf }] });
            if (r?.id) sent++;
        }
        await db.from("audit_logs").insert({ user_id: null, workspace_id: report.workspace_id, event: "report_email_sent", metadata: { reportId, recipients: to.length, sent, scheduled: true } });
        return { sent: sent > 0, recipients: to.length, delivered: sent };
    } catch (error) {
        logStructured("warn", "scheduled_report_delivery_failed", { reportId, error: error?.message || error });
        return { sent: false, reason: "error" };
    }
}
