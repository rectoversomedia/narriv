/**
 * Report schedules on the production schema: report_schedules(template_id → report_templates, cadence,
 * day_of_week int 0-6, time_of_day time, is_active, last_run_at, next_run_at).
 *
 * System templates (executive_brief, …) are keys, not rows, so a schedule points at a per-workspace
 * report_templates row with is_system=true and type=<key>, created on first use. Records are returned in the shape
 * the web app reads (templateKey, dayOfWeek name, enabled, …). The daily cron calls runDueReportSchedules(), which
 * generates the report of every active schedule whose next_run_at has passed and moves next_run_at forward.
 * Times are interpreted in the workspace time zone (Asia/Jakarta by default); the daily cron decides the actual hour.
 */

import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { getReportTemplate } from "./report-templates.js";

export const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const JAKARTA_OFFSET_MIN = 7 * 60; // workspace time zones other than WIB are not modelled yet

export function dayIndex(day) {
    if (day === null || day === undefined || day === "") return null;
    if (typeof day === "number") return day >= 0 && day <= 6 ? day : null;
    const i = DAYS.indexOf(String(day).trim().toLowerCase());
    return i === -1 ? null : i;
}

/** The next run strictly after `from` for a cadence, day and "HH:MM" (WIB). Monthly runs on the 1st. */
export function nextRunAt({ cadence = "weekly", dayOfWeek = null, timeOfDay = "09:00" }, from = new Date()) {
    const [hh, mm] = String(timeOfDay || "09:00").split(":").map((n) => parseInt(n, 10) || 0);
    // work in WIB wall-clock by shifting the instant
    const local = new Date(from.getTime() + JAKARTA_OFFSET_MIN * 60000);
    const candidate = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hh, mm));
    const toInstant = (d) => new Date(d.getTime() - JAKARTA_OFFSET_MIN * 60000);
    if (cadence === "daily") {
        if (toInstant(candidate) <= from) candidate.setUTCDate(candidate.getUTCDate() + 1);
        return toInstant(candidate);
    }
    if (cadence === "monthly") {
        candidate.setUTCDate(1);
        if (toInstant(candidate) <= from) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
        return toInstant(candidate);
    }
    const target = dayIndex(dayOfWeek) ?? 1; // weekly, Monday by default
    let add = (target - candidate.getUTCDay() + 7) % 7;
    if (add === 0 && toInstant(candidate) <= from) add = 7;
    candidate.setUTCDate(candidate.getUTCDate() + add);
    return toInstant(candidate);
}

/** report_templates row id for a template key (system key → per-workspace system row; custom → its uuid). */
export async function templateRowId(workspaceId, templateKey, db = baseSupabaseAdmin) {
    if (/^[0-9a-f-]{36}$/i.test(templateKey)) {
        const { data } = await db.from("report_templates").select("id").eq("id", templateKey).eq("workspace_id", workspaceId).maybeSingle();
        return data?.id ?? null;
    }
    const system = getReportTemplate(templateKey);
    if (!system) return null;
    const { data: existing } = await db.from("report_templates").select("id")
        .eq("workspace_id", workspaceId).eq("type", templateKey).eq("is_system", true).maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await db.from("report_templates")
        .insert({ workspace_id: workspaceId, name: system.name, type: templateKey, is_system: true, content: { systemKey: templateKey } })
        .select("id").single();
    if (error) throw error;
    return created.id;
}

/** DB row (+ its template row) → the record the web app reads. */
export function toScheduleRecord(row, template) {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        templateKey: template ? (template.is_system ? template.type : template.id) : null,
        templateName: template?.name ?? null,
        name: row.name,
        cadence: row.cadence,
        dayOfWeek: row.day_of_week === null || row.day_of_week === undefined ? null : DAYS[row.day_of_week],
        timeOfDay: String(row.time_of_day || "09:00").slice(0, 5),
        timezone: "Asia/Jakarta",
        recipients: [],
        enabled: row.is_active !== false,
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function withTemplates(rows, db = baseSupabaseAdmin) {
    const ids = [...new Set(rows.map((r) => r.template_id).filter(Boolean))];
    const { data: templates } = ids.length ? await db.from("report_templates").select("id, name, type, is_system").in("id", ids) : { data: [] };
    const byId = new Map((templates || []).map((t) => [t.id, t]));
    return rows.map((r) => toScheduleRecord(r, byId.get(r.template_id)));
}

/** Generate the report of every active schedule that is due; advance next_run_at. */
export async function runDueReportSchedules({ now = new Date(), generate, db = baseSupabaseAdmin } = {}) {
    const { data: rows, error } = await db.from("report_schedules").select("*").eq("is_active", true).lte("next_run_at", now.toISOString()).limit(200);
    if (error) return { ok: false, error: error.message, ran: 0 };
    const results = [];
    for (const row of rows || []) {
        const [record] = await withTemplates([row], db);
        try {
            if (!record.templateKey || !getReportTemplate(record.templateKey)) throw new Error("schedule template is not a report template");
            const end = now;
            const span = row.cadence === "daily" ? 1 : row.cadence === "monthly" ? 30 : 7;
            const report = await generate({ workspaceId: row.workspace_id, templateKey: record.templateKey, options: { dateRange: { start: new Date(end.getTime() - span * 864e5).toISOString(), end: end.toISOString() } } });
            // Send it to its readers (notification email or owners), with the PDF attached.
            const { deliverScheduledReport } = await import("./report-delivery.js");
            const delivery = report?.id ? await deliverScheduledReport(report.id) : { sent: false, reason: "no_report" };
            results.push({ scheduleId: row.id, reportId: report?.id ?? null, status: "ok", emailed: delivery.sent, emailSkip: delivery.reason ?? null });
        } catch (err) {
            results.push({ scheduleId: row.id, status: "failed", error: String(err?.message || err).slice(0, 200) });
        }
        await db.from("report_schedules").update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt({ cadence: row.cadence, dayOfWeek: row.day_of_week, timeOfDay: row.time_of_day }, now).toISOString(),
        }).eq("id", row.id);
    }
    logStructured("info", "report_schedules_run", { due: (rows || []).length, ok: results.filter((r) => r.status === "ok").length });
    return { ok: true, ran: results.length, results };
}

/**
 * Every new workspace gets one weekly board report (Executive Brief, Monday 08:00 WIB) unless it already has a
 * schedule. The client can switch it off or change it on the Reports page. Never throws.
 */
export async function ensureWeeklyBoardReport(workspaceId, lang = "en", db = baseSupabaseAdmin) {
    try {
        const { count } = await db.from("report_schedules").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
        if ((count || 0) > 0) return { created: false, reason: "has_schedule" };
        const templateId = await templateRowId(workspaceId, "executive_brief", db);
        if (!templateId) return { created: false, reason: "no_template" };
        const plan = { cadence: "weekly", dayOfWeek: 1, timeOfDay: "08:00" };
        const { error } = await db.from("report_schedules").insert({
            workspace_id: workspaceId,
            template_id: templateId,
            name: lang === "en" ? "Weekly report for the board" : "Laporan mingguan untuk direksi",
            cadence: plan.cadence,
            day_of_week: plan.dayOfWeek,
            time_of_day: plan.timeOfDay,
            is_active: true,
            next_run_at: nextRunAt(plan).toISOString(),
        });
        if (error) throw error;
        return { created: true };
    } catch (error) {
        logStructured("warn", "weekly_board_report_setup_failed", { workspaceId, error: error?.message || error });
        return { created: false, reason: "error" };
    }
}
