"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/store/useUiStore";
import { getActivityLogs, type ActivityLogEntry } from "@/lib/api-service";
import { intlLocale } from "@/store/useUiStore";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

const emptyActivityRows: ActivityLogEntry[] = [];
type ActivityTranslator = ReturnType<typeof useTranslations<"ActivityLog">>;

const getEventOptions = (t: ActivityTranslator) => [
  { value: "", label: t("allEvents") },
  { value: "login", label: t("event_login") },
  { value: "logout", label: t("event_logout") },
  { value: "register_success", label: t("event_register_success") },
  { value: "failed_login", label: t("event_failed_login") },
  { value: "password_reset_requested", label: t("event_password_reset_requested") },
  { value: "password_reset_completed", label: t("event_password_reset_completed") },
  { value: "password_change", label: t("event_password_change") },
  { value: "workspace_settings_updated", label: t("event_workspace_settings_updated") },
  { value: "workspace_logo_uploaded", label: t("event_workspace_logo_uploaded") },
  { value: "workspace_member_added", label: t("event_workspace_member_added") },
  { value: "workspace_member_deleted", label: t("event_workspace_member_deleted") },
  { value: "workspace_delete_restricted", label: t("event_workspace_delete_restricted") },
  { value: "workspace_deleted", label: t("event_workspace_deleted") },
  { value: "source_created", label: t("event_source_created") },
  { value: "source_updated", label: t("event_source_updated") },
  { value: "source_deleted", label: t("event_source_deleted") },
  { value: "default_sources_bootstrapped", label: t("event_default_sources_bootstrapped") },
  { value: "ingestion_job_queued", label: t("event_ingestion_job_queued") },
  { value: "ingestion_job_cancelled", label: t("event_ingestion_job_cancelled") },
  { value: "alert_created", label: t("event_alert_created") },
  { value: "assignment_change", label: t("event_assignment_change") },
  { value: "escalation_change", label: t("event_escalation_change") },
  { value: "alert_escalated_overdue", label: t("event_alert_escalated_overdue") },
  { value: "alert_escalated_unresolved_critical_risk", label: t("event_alert_escalated_unresolved_critical_risk") },
  { value: "case_created", label: t("event_case_created") },
  { value: "case_updated", label: t("event_case_updated") },
  { value: "case_deleted", label: t("event_case_deleted") },
  { value: "integration_created", label: t("event_integration_created") },
  { value: "integration_updated", label: t("event_integration_updated") },
  { value: "integration_deleted", label: t("event_integration_deleted") },
  { value: "action_generated", label: t("event_action_generated") },
  { value: "action_status_updated", label: t("event_action_status_updated") },
  { value: "action_plan_generated", label: t("event_action_plan_generated") },
  { value: "multi_step_action_plan_generated", label: t("event_multi_step_action_plan_generated") },
  { value: "ai_feedback_submitted", label: t("event_ai_feedback_submitted") },
  { value: "report_created", label: t("event_report_created") },
  { value: "report_generated_from_template", label: t("event_report_generated_from_template") },
  { value: "report_export_created", label: t("event_report_export_created") },
  { value: "report_email_sent", label: t("event_report_email_sent") },
  { value: "notification_settings_updated", label: t("event_notification_settings_updated") },
  { value: "onboarding_workspace_created", label: t("event_onboarding_workspace_created") },
  { value: "onboarding_sources_created", label: t("event_onboarding_sources_created") },
  { value: "onboarding_team_invited", label: t("event_onboarding_team_invited") },
];

const knownEvents = [
  "login", "logout", "register_success", "failed_login",
  "password_reset_requested", "password_reset_completed", "password_change",
  "workspace_settings_updated", "workspace_logo_uploaded",
  "workspace_member_added", "workspace_member_deleted",
  "workspace_delete_restricted", "workspace_deleted",
  "source_created", "source_updated", "source_deleted", "default_sources_bootstrapped",
  "ingestion_job_queued", "ingestion_job_cancelled",
  "alert_created", "assignment_change", "escalation_change",
  "alert_escalated_overdue", "alert_escalated_unresolved_critical_risk",
  "case_created", "case_updated", "case_deleted",
  "integration_created", "integration_updated", "integration_deleted",
  "action_generated", "action_status_updated", "action_plan_generated",
  "multi_step_action_plan_generated", "ai_feedback_submitted",
  "report_created", "report_generated_from_template", "report_export_created", "report_email_sent",
  "notification_settings_updated", "onboarding_workspace_created", "onboarding_sources_created", "onboarding_team_invited",
  "action_plan_learning_viewed", "action_plan_status_change", "deadline_reminder", "integration_tested", "monitoring_keyword_created", "monitoring_keyword_deleted", "monitoring_keyword_updated", "narrative_created", "narrative_deleted", "narrative_updated", "new_high_risk_alert", "onboarding_completed", "onboarding_keywords_created", "onboarding_workspace_configured", "signal_deleted", "signal_updated", "signals_bulk_deleted", "template_deleted", "workspace_created", "workspace_owner_recovered", "workspace_monitoring_paused", "workspace_monitoring_resumed"
];

function formatEventName(event: string, t?: ActivityTranslator) {
  if (t && knownEvents.includes(event)) {
    return t(`event_${event}`);
  }
  return event
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelativeTime(value: string, locale: string, t: ActivityTranslator) {
  if (!value) return t("justNow");
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return t("justNow");
  const deltaSeconds = Math.round((time - Date.now()) / 1000);
  if (!Number.isFinite(deltaSeconds)) return t("justNow");

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of ranges) {
    if (Math.abs(deltaSeconds) >= seconds || unit === "minute") {
      return new Intl.RelativeTimeFormat(locale === "id" ? "id-ID" : "en-US", { numeric: "always" }).format(Math.round(deltaSeconds / seconds), unit);
    }
  }

  return t("justNow");
}

function actorName(log: ActivityLogEntry) {
  if (log.user?.name || log.user?.email) return log.user.name || log.user.email;
  if (log.userId?.startsWith("demo")) return pickL("Demo visitor", "Pengunjung demo");
  return log.userId ? pickL("Former member", "Mantan anggota") : pickL("System", "Sistem");
}

// What happened, as a verb a person would say, and the colour of its group.
const VERBS: Record<string, [string, string]> = {
  alert_created: ["raised the alert", "membuat peringatan"],
  new_high_risk_alert: ["flagged a high-risk alert", "menandai peringatan berisiko tinggi"],
  alert_escalated_overdue: ["escalated an overdue alert", "mengeskalasi peringatan yang lewat tenggat"],
  alert_escalated_unresolved_critical_risk: ["escalated a critical alert", "mengeskalasi peringatan kritis"],
  assignment_change: ["changed the owner of", "mengubah penanggung jawab"],
  escalation_change: ["changed the escalation of", "mengubah eskalasi"],
  case_created: ["opened the case", "membuka kasus"],
  case_updated: ["updated the case", "memperbarui kasus"],
  case_deleted: ["deleted the case", "menghapus kasus"],
  action_plan_generated: ["created the plan", "membuat rencana"],
  multi_step_action_plan_generated: ["created the plan", "membuat rencana"],
  action_plan_status_change: ["moved the plan", "memindahkan status rencana"],
  action_status_updated: ["updated an action", "memperbarui aksi"],
  report_created: ["created the report", "membuat laporan"],
  report_generated_from_template: ["created from a template", "membuat laporan dari templat"],
  report_export_created: ["exported a report", "mengekspor laporan"],
  report_email_sent: ["emailed a report", "mengirim laporan lewat email"],
  monitoring_keyword_created: ["added the keyword", "menambah kata kunci"],
  monitoring_keyword_updated: ["changed the keyword", "mengubah kata kunci"],
  monitoring_keyword_deleted: ["removed the keyword", "menghapus kata kunci"],
  source_created: ["added the source", "menambah sumber"],
  source_updated: ["changed the source", "mengubah sumber"],
  source_deleted: ["removed the source", "menghapus sumber"],
  default_sources_bootstrapped: ["set up the default sources", "memasang sumber bawaan"],
  workspace_member_added: ["added a member as", "menambah anggota sebagai"],
  workspace_member_deleted: ["removed a member", "mengeluarkan anggota"],
  workspace_settings_updated: ["updated the workspace", "memperbarui workspace"],
  workspace_logo_uploaded: ["uploaded a new logo", "mengunggah logo baru"],
  integration_created: ["connected", "menghubungkan"],
  integration_deleted: ["disconnected", "memutus"],
  integration_tested: ["sent a test to", "mengirim uji ke"],
  login: ["signed in", "masuk"],
  logout: ["signed out", "keluar"],
  failed_login: ["failed to sign in", "gagal masuk"],
  password_change: ["changed their password", "mengganti kata sandi"],
};

const GROUPS: Array<{ key: string; label: [string, string]; color: string; test: (e: string) => boolean }> = [
  { key: "alerts", label: ["Alerts & cases", "Peringatan & kasus"], color: "#E5484D", test: (e) => /alert|case|escalat|assignment/.test(e) },
  { key: "actions", label: ["Plans", "Rencana"], color: "#12A66A", test: (e) => /action/.test(e) },
  { key: "reports", label: ["Reports", "Laporan"], color: "#465FFF", test: (e) => /report|template/.test(e) },
  { key: "sources", label: ["Sources & keywords", "Sumber & kata kunci"], color: "#8B5CFF", test: (e) => /source|keyword|ingestion|integration/.test(e) },
  { key: "team", label: ["Team & access", "Tim & akses"], color: "#64748B", test: () => true },
];
const groupOf = (event: string) => GROUPS.find((g) => g.test(event)) ?? GROUPS[GROUPS.length - 1];

/** The object the event acted on, from the descriptive metadata (never an id). */
function objectOf(log: ActivityLogEntry) {
  const m = (log.metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof m[k] === "string" && m[k] ? String(m[k]) : null);
  const title = pick("title") || pick("name") || pick("keyword") || pick("brandName") || pick("brand_name");
  const format = pick("format");
  const role = pick("role");
  const ROLE: Record<string, [string, string]> = { owner: ["Owner", "Pemilik"], admin: ["Admin", "Admin"], analyst: ["Analyst", "Analis"], viewer: ["Viewer", "Pembaca"] };
  return { title, extra: format ? format.toUpperCase() : role ? (ROLE[role] ? pickL(...ROLE[role]) : role) : null };
}

function personOf(log: ActivityLogEntry) {
  const full = actorName(log);
  const [name, ...role] = full.split(" · ");
  return { name, role: role.join(" · ") || null };
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return pickL("Today", "Hari ini");
  if (d.toDateString() === yesterday.toDateString()) return pickL("Yesterday", "Kemarin");
  return d.toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" });
}

export default function ActivityPage() {
  const t = useTranslations("ActivityLog");
  const uiLanguage = useUiStore((state) => state.language);
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const eventOptions = getEventOptions(t);

  const activityQuery = useQuery({
    queryKey: ["activity-logs", { page, eventType, dateFrom, dateTo }],
    queryFn: () => getActivityLogs({ page, limit: 20, eventType: eventType || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  });

  const rows = activityQuery.data?.data || emptyActivityRows;
  const meta = activityQuery.data?.meta;
  const isFiltered = Boolean(eventType || dateFrom || dateTo);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const byGroup = new Map<string, number>();
    rows.forEach((r) => { const g = groupOf(r.event).key; byGroup.set(g, (byGroup.get(g) ?? 0) + 1); });
    const busiest = [...byGroup.entries()].sort((a, b) => b[1] - a[1])[0];
    const people = new Map<string, number>();
    rows.forEach((r) => { const n = personOf(r).name; people.set(n, (people.get(n) ?? 0) + 1); });
    const topPerson = [...people.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total: meta?.total ?? rows.length,
      today: meta?.summary?.today ?? rows.filter((r) => new Date(r.createdAt).toDateString() === today).length,
      actors: meta?.summary?.actors ?? people.size,
      busiest: busiest ? GROUPS.find((g) => g.key === busiest[0]) ?? null : null,
      topPerson: topPerson?.[0] ?? null,
    };
  }, [rows, meta]);

  // Rows grouped under their day, newest first (the API already sorts).
  const days = useMemo(() => {
    const out: Array<{ label: string; items: ActivityLogEntry[] }> = [];
    rows.forEach((r) => {
      const label = dayLabel(r.createdAt);
      if (out.at(-1)?.label === label) out.at(-1)!.items.push(r);
      else out.push({ label, items: [r] });
    });
    return out;
  }, [rows]);

  const resetFilters = () => { setEventType(""); setDateFrom(""); setDateTo(""); setPage(1); };
  const field = "h-10 rounded-[10px] bg-[#F4F6FC] px-3 text-[13px] font-bold text-[#101334] outline-none focus:ring-2 focus:ring-[#465FFF]/30";
  const tiles = [
    { label: pickL("Activities", "Aktivitas"), value: stats.total.toLocaleString(intlLocale()), sub: pickL("recorded in total", "tercatat seluruhnya"), rgb: "70,95,255", color: "#3B52F5" },
    { label: pickL("Today", "Hari ini"), value: String(stats.today), sub: stats.today ? pickL("actions today", "aksi hari ini") : pickL("quiet so far", "belum ada aksi"), rgb: "18,166,106", color: "#047857" },
    { label: pickL("Most active", "Paling aktif"), value: stats.topPerson ?? "—", sub: pickL(`${stats.actors} people acted`, `${stats.actors} orang beraksi`), rgb: "139,92,255", color: "#6E44E8" },
    { label: pickL("Most frequent", "Paling sering"), value: stats.busiest ? pickL(...stats.busiest.label) : "—", sub: pickL("on this page", "di halaman ini"), rgb: "245,158,11", color: "#A04606" },
  ];

  return (
    <div className="space-y-5 pb-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{t("title")}</h1>
        <button type="button" onClick={() => activityQuery.refetch()} disabled={activityQuery.isFetching} className="h-10 rounded-[10px] bg-white px-4 text-[13px] font-black text-[#101334] shadow-sm transition hover:bg-[#F8FAFF] disabled:opacity-60">
          {t("refresh")}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center shadow-[0_1px_2px_rgba(16,19,52,0.06),0_10px_24px_-16px_rgba(16,19,52,0.25)]">
            <p className="text-[11px] font-black" style={{ color: tile.color }}>{tile.label}</p>
            {/* Numbers stay big; a name or event wraps at a smaller size instead of being cut off. */}
            <p className={cn("mt-2 font-black tracking-[-0.03em] text-[#101334]", /^[\d.,\s—]+$/.test(tile.value) ? "truncate text-[26px] leading-none" : "line-clamp-2 text-[17px] leading-tight sm:text-[20px]")} title={tile.value}>{tile.value}</p>
            <p className="mt-2 text-[12px] font-bold text-[#5A6478]">{tile.sub}</p>
          </div>
        ))}
      </section>

      <section className={BOX}>
        <div className="flex flex-wrap items-end gap-3 border-b border-[#F0F2F8] p-4">
          <label className="grid min-w-[220px] flex-1 gap-1">
            <span className="text-[11px] font-black text-[#5A6478]">{t("filterEvent")}</span>
            <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} className={field}>
              {eventOptions.map((o) => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-black text-[#5A6478]">{t("filterFrom")}</span>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={field} />
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-black text-[#5A6478]">{t("filterTo")}</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={field} />
          </label>
          {isFiltered ? <button type="button" onClick={resetFilters} className="h-10 rounded-[10px] px-3 text-[12px] font-black text-[#3B52F5] hover:bg-[#EEF1FF]">{t("filterReset")}</button> : null}
          <div className="ml-auto hidden flex-wrap gap-2 lg:flex">
            {GROUPS.map((g) => <span key={g.key} className="flex items-center gap-1.5 text-[11px] font-bold text-[#5A6478]"><span className="size-2.5 rounded-full" style={{ background: g.color }} />{pickL(...g.label)}</span>)}
          </div>
        </div>

        {activityQuery.isError || activityQuery.data === null ? (
          <div className="p-5"><DashboardErrorState title={t("errorTitle")} description={t("errorDesc")} onRetry={() => activityQuery.refetch()} /></div>
        ) : activityQuery.isPending ? (
          <div className="p-5"><TableSkeleton rows={8} columns={3} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><DashboardEmptyState title={t("emptyTitle")} description={t("emptyDesc")} icon="inbox" /></div>
        ) : (
          <div className="p-5">
            {days.map((day) => (
              <div key={day.label} className="mb-5 last:mb-0">
                <p className="mb-2 text-[11px] font-black text-[#8A93AD]">{day.label}</p>
                <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-0.5 before:bg-[#EEF1F7]">
                  {day.items.map((log) => {
                    const g = groupOf(log.event);
                    const who = personOf(log);
                    const obj = objectOf(log);
                    const verb = VERBS[log.event] ? pickL(...VERBS[log.event]) : formatEventName(log.event, t).toLowerCase();
                    return (
                      <li key={log.id} className="relative flex items-start gap-3 rounded-[12px] px-1 py-2 transition hover:bg-[#FAFBFF]">
                        <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white ring-4 ring-white" style={{ background: g.color }}>{initials(who.name)}</span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-[13px] leading-snug text-[#3A4566]">
                            <b className="font-black text-[#101334]">{who.name}</b> {verb}
                            {obj.title ? <> <b className="font-black text-[#101334]">«{obj.title}»</b></> : null}
                            {obj.extra ? <span className="ml-1.5 rounded-full bg-[#EEF1F7] px-2 py-0.5 text-[10px] font-black text-[#31406B]">{obj.extra}</span> : null}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold text-[#8A93AD]">
                            {who.role ? `${who.role} · ` : ""}{formatRelativeTime(log.createdAt, uiLanguage, t)} · {new Date(log.createdAt).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="mt-1 hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black sm:inline" style={{ background: `${g.color}1A`, color: g.color === "#64748B" ? "#475569" : g.color }}>{pickL(...g.label)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="border-t border-[#F0F2F8] p-4">
            <DashboardPagination pagination={meta} onPageChange={setPage} disabled={activityQuery.isFetching} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
