"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, Filter, RefreshCcw, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/store/useUiStore";
import { getActivityLogs, type ActivityLogEntry } from "@/lib/api-service";
import { cn } from "@/lib/utils";

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
  "notification_settings_updated", "onboarding_workspace_created", "onboarding_sources_created", "onboarding_team_invited"
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

function eventVariant(event: string): "default" | "green" | "amber" | "red" | "purple" | "slate" {
  if (event.includes("failed") || event.includes("deleted") || event.includes("delete")) return "red";
  if (event.includes("created") || event.includes("success") || event.includes("uploaded")) return "green";
  if (event.includes("updated") || event.includes("change")) return "default";
  if (event.includes("login") || event.includes("logout")) return "purple";
  if (event.includes("reset") || event.includes("warning")) return "amber";
  return "slate";
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value: string, locale: string, t: ActivityTranslator) {
  const deltaSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
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

function metadataSummary(metadata: ActivityLogEntry["metadata"], t: ActivityTranslator) {
  if (!metadata) return t("noMetadata");

  const visibleEntries = Object.entries(metadata)
    .filter(([key]) => !["workspaceId", "userId"].includes(key))
    .slice(0, 3);

  if (visibleEntries.length === 0) return t("recordedMetadata");

  return visibleEntries
    .map(([key, value]) => `${formatEventName(key, t)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

function actorName(log: ActivityLogEntry) {
  return log.user?.name || log.user?.email || "System / Unknown";
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
    queryFn: () => getActivityLogs({
      page,
      limit: 12,
      eventType: eventType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  const rows = activityQuery.data?.data || emptyActivityRows;
  const meta = activityQuery.data?.meta;
  const isFiltered = Boolean(eventType || dateFrom || dateTo);

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const fallbackActors = new Set(rows.map((row) => row.userId || actorName(row))).size;
    const fallbackToday = rows.filter((row) => new Date(row.createdAt).toDateString() === today).length;
    const fallbackEventTypes = new Set(rows.map((row) => row.event)).size;

    return [
      { label: t("metricsTotal"), value: meta?.total ?? rows.length, helper: t("metricsTotalHelper"), tone: "blue", icon: Activity },
      { label: t("metricsActors"), value: meta?.summary?.actors ?? fallbackActors, helper: t("metricsActorsHelper"), tone: "purple", icon: UserRound },
      { label: t("metricsToday"), value: meta?.summary?.today ?? fallbackToday, helper: t("metricsTodayHelper"), tone: "green", icon: CalendarDays },
      { label: t("metricsTypes"), value: meta?.summary?.eventTypes ?? fallbackEventTypes, helper: t("metricsTypesHelper"), tone: "amber", icon: ShieldCheck },
    ];
  }, [meta?.summary?.actors, meta?.summary?.eventTypes, meta?.summary?.today, meta?.total, rows, t]);

  const resetFilters = () => {
    setEventType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-3 text-[28px] font-black tracking-tight text-slate-900">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {t("desc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => activityQuery.refetch()}
          disabled={activityQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={activityQuery.isFetching ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  metric.tone === "blue" && "bg-[#465FFF]/10 text-[#465FFF]",
                  metric.tone === "purple" && "bg-[#8B5CFF]/10 text-[#8B5CFF]",
                  metric.tone === "green" && "bg-[#10B981]/10 text-[#10B981]",
                  metric.tone === "amber" && "bg-[#F59E0B]/10 text-[#F59E0B]"
                )}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{metric.value.toLocaleString(uiLanguage === "id" ? "id-ID" : "en-US")}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-bold text-slate-500">{metric.helper}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-slate-400">
          <Filter size={14} />
          {t("filterTitle")}
        </div>
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">{t("filterEvent")}</span>
            <select
              value={eventType}
              onChange={(event) => { setEventType(event.target.value); setPage(1); }}
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-[16px] font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15 md:text-sm"
            >
              {eventOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">{t("filterFrom")}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => { setDateFrom(event.target.value); setPage(1); }}
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-[16px] font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15 md:text-sm"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">{t("filterTo")}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => { setDateTo(event.target.value); setPage(1); }}
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-[16px] font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15 md:text-sm"
            />
          </label>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!isFiltered}
            className="h-10 rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {t("filterReset")}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
        {activityQuery.isError || activityQuery.data === null ? (
          <DashboardErrorState
            title={t("errorTitle")}
            description={t("errorDesc")}
            onRetry={() => activityQuery.refetch()}
          />
        ) : activityQuery.isPending ? (
          <div className="p-4"><TableSkeleton rows={8} columns={4} /></div>
        ) : rows.length === 0 ? (
          <DashboardEmptyState
            title={t("emptyTitle")}
            description={t("emptyDesc")}
            icon="inbox"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("colEvent")}</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("colActor")}</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("colMeta")}</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{t("colTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
                          <Activity size={15} />
                        </span>
                        <div>
                          <Badge variant={eventVariant(log.event)} className="rounded-full normal-case tracking-normal">
                            {formatEventName(log.event, t)}
                          </Badge>
                          <p className="mt-2 text-[11px] font-bold text-slate-400">ID: {log.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-black text-slate-900">{actorName(log)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{log.user?.email || log.userId || t("systemGenerated")}</p>
                    </td>
                    <td className="max-w-[360px] px-6 py-4 align-top">
                      <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{metadataSummary(log.metadata, t)}</p>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <p className="font-black text-slate-900">{formatRelativeTime(log.createdAt, uiLanguage, t)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt, uiLanguage)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="border-t border-slate-100 p-4">
            <DashboardPagination pagination={meta} onPageChange={setPage} disabled={activityQuery.isFetching} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
