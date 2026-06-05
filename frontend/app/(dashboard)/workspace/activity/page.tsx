"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, Filter, RefreshCcw, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { getActivityLogs, type ActivityLogEntry } from "@/lib/api-service";
import { cn } from "@/lib/utils";

const emptyActivityRows: ActivityLogEntry[] = [];

const eventOptions = [
  { value: "", label: "Semua Event" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "register_success", label: "Registrasi" },
  { value: "password_change", label: "Password Change" },
  { value: "workspace_settings_updated", label: "Workspace Settings" },
  { value: "workspace_logo_uploaded", label: "Logo Upload" },
  { value: "workspace_member_created", label: "Member Added" },
  { value: "workspace_member_deleted", label: "Member Removed" },
  { value: "source_created", label: "Source Created" },
  { value: "source_updated", label: "Source Updated" },
  { value: "case_created", label: "Case Created" },
  { value: "case_updated", label: "Case Updated" },
  { value: "integration_created", label: "Integration Created" },
  { value: "integration_updated", label: "Integration Updated" },
];

function formatEventName(event: string) {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
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
      return new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" }).format(Math.round(deltaSeconds / seconds), unit);
    }
  }

  return "baru saja";
}

function metadataSummary(metadata: ActivityLogEntry["metadata"]) {
  if (!metadata) return "Tidak ada metadata tambahan";

  const visibleEntries = Object.entries(metadata)
    .filter(([key]) => !["workspaceId", "userId"].includes(key))
    .slice(0, 3);

  if (visibleEntries.length === 0) return "Metadata workspace tercatat";

  return visibleEntries
    .map(([key, value]) => `${formatEventName(key)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

function actorName(log: ActivityLogEntry) {
  return log.user?.name || log.user?.email || "System / Unknown";
}

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      { label: "Total Log", value: meta?.total ?? rows.length, helper: "Audit events tercatat", tone: "blue", icon: Activity },
      { label: "Actor Aktif", value: uniqueActors, helper: "User/system di halaman ini", tone: "purple", icon: UserRound },
      { label: "Hari Ini", value: todayCount, helper: "Event pada tanggal lokal", tone: "green", icon: CalendarDays },
      { label: "Jenis Event", value: eventCount, helper: "Kategori event tampil", tone: "amber", icon: ShieldCheck },
    ];
  }, [meta?.total, rows]);

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
          <span className="inline-flex rounded-full border border-[#465FFF]/15 bg-[#465FFF]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
            Workspace Audit Trail
          </span>
          <h1 className="mt-3 text-[28px] font-black tracking-tight text-slate-900">Activity Log</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Pantau perubahan penting di workspace: autentikasi, member, sumber data, kasus, integrasi, dan pengaturan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => activityQuery.refetch()}
          disabled={activityQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={activityQuery.isFetching ? "animate-spin" : ""} />
          Refresh
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
                  <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{metric.value.toLocaleString("id-ID")}</p>
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
          Filter Audit
        </div>
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">Event</span>
            <select
              value={eventType}
              onChange={(event) => { setEventType(event.target.value); setPage(1); }}
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
            >
              {eventOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">Dari Tanggal</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => { setDateFrom(event.target.value); setPage(1); }}
              className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black text-slate-500">Sampai Tanggal</span>
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
            Reset
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
        {activityQuery.isError || activityQuery.data === null ? (
          <DashboardErrorState
            title="Gagal memuat activity log"
            description="Audit log belum bisa diambil dari backend. Coba refresh atau periksa koneksi API."
            onRetry={() => activityQuery.refetch()}
          />
        ) : activityQuery.isPending ? (
          <div className="p-4"><TableSkeleton rows={8} columns={4} /></div>
        ) : rows.length === 0 ? (
          <DashboardEmptyState
            title="Belum ada activity log"
            description="Event audit akan muncul di sini setelah ada perubahan workspace atau aktivitas user."
            icon="inbox"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Event</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Actor</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Metadata</th>
                  <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Waktu</th>
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
                            {formatEventName(log.event)}
                          </Badge>
                          <p className="mt-2 text-[11px] font-bold text-slate-400">ID: {log.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <p className="font-black text-slate-900">{actorName(log)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{log.user?.email || log.userId || "System generated"}</p>
                    </td>
                    <td className="max-w-[360px] px-6 py-4 align-top">
                      <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{metadataSummary(log.metadata)}</p>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <p className="font-black text-slate-900">{formatRelativeTime(log.createdAt)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt)}</p>
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
