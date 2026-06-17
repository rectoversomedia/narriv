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

const getEventOptions = (t: any) => [
  { value: "", label: t("allEvents") },
  { value: "login", label: t("event_login") },
  { value: "logout", label: t("event_logout") },
  { value: "register_success", label: t("event_register_success") },
  { value: "password_change", label: t("event_password_change") },
  { value: "workspace_settings_updated", label: t("event_workspace_settings_updated") },
  { value: "workspace_logo_uploaded", label: t("event_workspace_logo_uploaded") },
  { value: "workspace_member_created", label: t("event_workspace_member_created") },
  { value: "workspace_member_deleted", label: t("event_workspace_member_deleted") },
  { value: "source_created", label: t("event_source_created") },
  { value: "source_updated", label: t("event_source_updated") },
  { value: "case_created", label: t("event_case_created") },
  { value: "case_updated", label: t("event_case_updated") },
  { value: "integration_created", label: t("event_integration_created") },
  { value: "integration_updated", label: t("event_integration_updated") },
];

const knownEvents = [
  "login", "logout", "register_success", "password_change",
  "workspace_settings_updated", "workspace_logo_uploaded",
  "workspace_member_created", "workspace_member_deleted",
  "source_created", "source_updated", "source_deleted",
  "case_created", "case_updated", "integration_created", "integration_updated"
];

function formatEventName(event: string, t?: any) {
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

function formatRelativeTime(value: string, locale: string, t: any) {
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

function metadataSummary(metadata: ActivityLogEntry["metadata"], t: any) {
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
    const uniqueActors = new Set(rows.map((row) => row.userId || actorName(row))).size;
    const todayCount = rows.filter((row) => new Date(row.createdAt).toDateString() === today).length;
    const eventCount = new Set(rows.map((row) => row.event)).size;

    return [
      { label: t("metricsTotal"), value: meta?.total ?? rows.length, helper: t("metricsTotalHelper"), tone: "blue", icon: Activity },
      { label: t("metricsActors"), value: uniqueActors, helper: t("metricsActorsHelper"), tone: "purple", icon: UserRound },
      { label: t("metricsToday"), value: todayCount, helper: t("metricsTodayHelper"), tone: "green", icon: CalendarDays },
      { label: t("metricsTypes"), value: eventCount, helper: t("metricsTypesHelper"), tone: "amber", icon: ShieldCheck },
    ];
  }, [meta?.total, rows, t]);

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
          <span className="inline-flex rounded-full border-[#465FFF]/15 bg-[#465FFF]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
            {t("subtitle")}
          </span>
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
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
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
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">{t("filterTo")}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => { setDateTo(event.target.value); setPage(1); }}
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
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
