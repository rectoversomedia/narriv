"use client";

import { humanReportSummary } from "@/lib/report-summary";
import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar, CalendarClock, ChevronDown, Clock, Download, FileText, Mail, Plus, RefreshCcw, Search, Share2, Trash2, Edit2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton, formatPaginationSummary } from "@/components/dashboard/dashboard-states";
import { getReports, getReportTemplates, createReportTemplate, updateReportTemplate, deleteReportTemplate, getReportsAnalytics, createReportExport, getReportExportStatus, downloadReportFile, getNarratives, getDashboardSummary, getReportSchedules, createReportSchedule, updateReportSchedule, deleteReportSchedule, toggleReportSchedule, generateReportFromTemplate, sendReportEmail, sendTestScheduleEmail, type PaginationInfo, type ReportRecord, type ReportsAnalyticsResponse, type NarrativeRecord, type DashboardSummary, type ReportTemplate, type ReportScheduleRecord } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { DemoBanner } from "@/components/ui/demo-banner";
import { ModalShell } from "@/components/ui/modal-shell";
import { intlLocale } from "@/store/useUiStore";
import { pickL } from "@/lib/use-l";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type ReportStatus = "READY" | "REVIEW" | "DRAFT" | "SCHEDULED" | "ARCHIVED";

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
  text: string;
  border: string;
};


const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#3B52F5]", border: "border-[#E6EAF2]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#6E44E8]", border: "border-[#E6EAF2]" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#047857]", border: "border-[#E6EAF2]" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#C81E1E]", border: "border-[#E6EAF2]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#A04606]", border: "border-[#E6EAF2]" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-[#5A6478]", border: "border-slate-200" },
};

type ReportRow = {
  id: number | string;
  title: string;
  description: string;
  type: string;
  period: string;
  status: ReportStatus;
  created: string;
  createdTime: string;
  tone: Tone;
};

const reportsApiLimit = 10;

const quickActions = [
  { key: "shareStakeholder", descKey: "shareDesc", icon: Share2, color: "text-[#3B52F5] bg-[#465FFF]/10" },
  { key: "scheduleReport", descKey: "scheduleDesc", icon: CalendarClock, color: "text-[#047857] bg-[#10B981]/10" },
  { key: "customReport", descKey: "customDesc", icon: Plus, color: "text-[#6E44E8] bg-[#8B5CFF]/10" },
  { key: "viewHistory", descKey: "historyDesc", icon: Clock, color: "text-[#A04606] bg-[#F59E0B]/10" },
];

type FormatDistributionItem = { name: string; value: string; color: string };
const formatDistributionColors: Record<string, string> = {
  PDF: "#465FFF",
  JSON: "#8B5CFF",
};

type PopularReportItem = { title: string; views: string };

function statusFromApi(status: string): ReportStatus {
  const value = status.toLowerCase();
  if (value.includes("ready") || value.includes("siap")) return "READY";
  if (value.includes("review")) return "REVIEW";
  if (value.includes("scheduled")) return "SCHEDULED";
  if (value.includes("archived")) return "ARCHIVED";
  return "DRAFT";
}

function toneFromStatus(status: ReportStatus): Tone {
  if (status === "READY") return "green";
  if (status === "REVIEW") return "amber";
  if (status === "SCHEDULED") return "blue";
  if (status === "ARCHIVED") return "slate";
  return "purple";
}

const REPORT_TYPE_LABELS: Record<string, [string, string]> = {
  executive_brief: ["Executive brief", "Ringkasan eksekutif"],
  weekly: ["Weekly", "Mingguan"],
  weekly_digest: ["Weekly digest", "Rangkuman mingguan"],
  monthly: ["Monthly", "Bulanan"],
  incident: ["Incident", "Insiden"],
  risk_review: ["Risk review", "Tinjauan risiko"],
  intelligence: ["Intelligence", "Intelijen"],
  custom: ["Custom", "Kustom"],
};

function buildApiReportRows(
  reports: ReportRecord[],
  fallbacks: { description: string },
  locale: string,
): ReportRow[] {
  const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : null);
  const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "");
  const id = locale.startsWith("id");
  return reports.map((report) => {
    const status = statusFromApi(report.status);
    const typeLabel = REPORT_TYPE_LABELS[report.type ?? ""];
    const start = day(report.periodStart);
    const end = day(report.periodEnd);
    return {
      id: report.id,
      title: report.title,
      description: report.summary?.trim() ? humanReportSummary(report.summary, id) : report.sections || fallbacks.description,
      type: typeLabel ? typeLabel[id ? 1 : 0] : report.type || "-",
      period: start && end ? `${start} – ${end}` : start || end || "-",
      status,
      created: day(report.createdAt) || "-",
      createdTime: time(report.createdAt),
      tone: toneFromStatus(status),
    };
  });
}

function Panel({ children, className, ...props }: ComponentPropsWithoutRef<"section"> & { children: ReactNode }) {
  return (
    <section className={cn(BOX, className)} {...props}>
      {children}
    </section>
  );
}

function MetricCard({ label, value, helper, tone }: { label: string; value: string; helper: string; icon?: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="min-h-[120px] flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
      <p className="text-[11px] font-black" style={{ color: style.color }}>{label}</p>
      <p className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
      <p className="mt-2 text-[11px] font-bold text-[#5A6478]">{helper}</p>
    </div>
  );
}



function AIReportSummary({ narratives, dashboard }: { narratives?: NarrativeRecord[] | null, dashboard?: DashboardSummary | null }) {
  const L = (en: string, id: string) => pickL(en, id);
  const k = dashboard?.kpis;
  const neg = Math.round(k?.negative_percentage ?? 0);
  const pos = Math.round(k?.positive_percentage ?? 0);
  const other = Math.max(0, 100 - neg - pos);
  const net = pos - neg;
  const verdict = !k || (k.total_signals ?? 0) === 0
    ? { word: L("No data", "Belum ada data"), color: "#5A6478", bg: "#F1F4FA" }
    : net <= -15 ? { word: L("Negative", "Negatif"), color: "#C81E1E", bg: "#FDECEC" }
      : net >= 15 ? { word: L("Positive", "Positif"), color: "#047857", bg: "#E5F6EE" }
        : { word: L("Balanced", "Seimbang"), color: "#31406B", bg: "#EEF1F8" };
  const list = narratives ?? [];
  const top = list[0];
  const totalInIssues = list.reduce((sum, n) => sum + (n.signalCount || 0), 0) || 1;
  const risk = list.find((n) => /neg/i.test(n.sentiment));
  const fastest = [...list].sort((a, b) => (parseFloat(b.velocity) || 0) - (parseFloat(a.velocity) || 0))[0];
  const days = dashboard?.sentiment_trend ?? [];
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  return (
    <Panel className="p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{L("This period at a glance", "Ringkasan periode ini")}</h2>
            <span className="rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#6E44E8]">{L("From your data", "Dari data Anda")}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-[10px] px-3 py-1.5 text-[20px] font-black leading-none" style={{ color: verdict.color, background: verdict.bg }}>{verdict.word}</span>
            <span className="text-[13px] font-bold text-[#3A4566]">{L(`overall tone of ${(k?.total_signals ?? 0).toLocaleString("en-US")} mentions`, `nada keseluruhan dari ${(k?.total_signals ?? 0).toLocaleString("id-ID")} percakapan`)}</span>
          </div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#EEF1F7]">
            <span style={{ width: `${neg}%`, background: "#E5484D" }} /><span style={{ width: `${pos}%`, background: "#12A66A" }} /><span style={{ width: `${other}%`, background: "#B8C0D4" }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 text-[12px] font-bold text-[#3A4566]">
            <span><b className="text-[#C81E1E]">{neg}%</b> {L("negative", "negatif")}</span>
            <span><b className="text-[#047857]">{pos}%</b> {L("positive", "positif")}</span>
            <span><b className="text-[#5A6478]">{other}%</b> {L("neutral & other", "netral & lainnya")}</span>
          </div>

          {top ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
                <p className="text-[34px] font-black leading-none text-[#3B52F5]">{Math.round((top.signalCount / totalInIssues) * 100)}%</p>
                <p className="mt-2 text-[13px] font-bold text-[#101334]">{L("Main Issue", "Isu Utama")}</p>
                <p className="mt-1 line-clamp-2 text-[12px] font-bold leading-snug text-[#3A4566]">{top.title}</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
                <p className="text-[34px] font-black leading-none text-[#C81E1E]">{risk ? risk.signalCount : 0}</p>
                <p className="mt-2 text-[13px] font-bold text-[#101334]">{L("Biggest Risk", "Risiko Terbesar")}</p>
                <p className="mt-1 line-clamp-2 text-[12px] font-bold leading-snug text-[#3A4566]">{risk ? risk.title : L("No negative issue", "Tidak ada isu negatif")}</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
                <p className="text-[34px] font-black leading-none text-[#A04606]">{fastest?.velocity || "—"}</p>
                <p className="mt-2 text-[13px] font-bold text-[#101334]">{L("Fastest Rising", "Naik Paling Cepat")}</p>
                <p className="mt-1 line-clamp-2 text-[12px] font-bold leading-snug text-[#3A4566]">{fastest?.title}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[13px] font-semibold text-[#5A6478]">{L("No issue has formed in this period yet.", "Belum ada isu yang terbentuk pada periode ini.")}</p>
          )}
        </div>

        <div className="min-w-0 rounded-[14px] bg-[#F7F8FC] p-4">
          <p className="text-[12px] font-black text-[#101334]">{L("Mentions per day, last 7 days", "Percakapan per hari, 7 hari terakhir")}</p>
          {days.length === 0 || !days.some((d) => d.total > 0) ? (
            <p className="mt-6 text-[12px] font-semibold text-[#5A6478]">{L("No mentions in the last 7 days.", "Belum ada percakapan dalam 7 hari terakhir.")}</p>
          ) : (
            <>
              <div className="mt-3 flex h-[150px] items-end gap-2">
                {days.map((d) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.total}`}>
                    <span className="text-[11px] font-black text-[#101334]">{d.total}</span>
                    <div className="flex w-full max-w-[34px] flex-col-reverse overflow-hidden rounded-t-[6px]" style={{ height: `${Math.max(4, (d.total / maxDay) * 100)}%` }}>
                      <span style={{ flex: d.negative, background: "#E5484D" }} />
                      <span style={{ flex: d.positive, background: "#12A66A" }} />
                      <span style={{ flex: d.neutral + d.mixed + d.unanalyzed, background: "#B8C0D4" }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#5A6478]">{new Date(d.date).toLocaleDateString(pickL("en-US", "id-ID"), { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] font-bold text-[#3A4566]">
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#E5484D]" />{L("Negative", "Negatif")}</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#12A66A]" />{L("Positive", "Positif")}</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#B8C0D4]" />{L("Neutral & other", "Netral & lainnya")}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}


function ReportPreviewSidebar({
  latestReport,
  onExportPdf,
  onExportFile,
  isPending,
}: {
  latestReport?: { id: string; title: string; status: string; sections?: string | unknown; summary?: string | null };
  onExportPdf?: () => void;
  onExportFile?: (format: "csv" | "xlsx") => void;
  isPending?: boolean;
}) {
  const tr = useTranslations("Reports");

  const reportTitle = latestReport?.title || tr("preview.executiveBrief");
  const reportStatus = latestReport ? statusFromApi(latestReport.status) : null;
  const reportSections = latestReport?.sections
    ? String(latestReport.sections).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <Panel className="p-4">
      <h3 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{tr("preview.title")}</h3>
      
      {isPending ? (
        <div className="mt-4 flex h-[200px] items-center justify-center">
          <RefreshCcw className="animate-spin text-[#647099]" size={20} />
        </div>
      ) : latestReport ? (
        <>
          <div className="mt-4 rounded-[12px] bg-[#EEF1FF] p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[14px] font-black leading-snug text-[#101334]">{reportTitle}</p>
                <p className="mt-0.5 text-[10px] font-bold text-[#5F6B94]">{tr("preview.latestReport")}</p>
              </div>
              {reportStatus && <StatusBadge status={reportStatus} />}
            </div>

            {reportSections.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {reportSections.slice(0, 6).map((section) => <span key={section} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#31406B]">{section}</span>)}
              </div>
            ) : (
              latestReport.summary?.trim() ? (
                <p className="mt-3 line-clamp-3 text-[12px] font-bold leading-snug text-[#31406B]">{humanReportSummary(latestReport.summary, intlLocale().startsWith("id"))}</p>
              ) : null
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <Link href={`/reports/${latestReport.id}`} className="flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-[#465FFF] text-[12px] font-black text-white shadow-sm transition hover:bg-[#3B20EA]">
              {tr("preview.viewPreview")}
            </Link>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={onExportPdf} className="flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[#E6EAF2] bg-white text-[11px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
                PDF
              </button>
              <button type="button" onClick={() => onExportFile?.("csv")} className="flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[#E6EAF2] bg-white text-[11px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
                CSV
              </button>
              <button type="button" onClick={() => onExportFile?.("xlsx")} className="flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[#E6EAF2] bg-white text-[11px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
                Excel
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[12px] font-bold text-[#53608C]">{tr("preview.emptyTitle")}</p>
          <p className="mt-1 text-[10px] font-bold text-[#647099]">{tr("preview.emptyDesc")}</p>
        </div>
      )}
    </Panel>
  );
}

function QuickActions({ onShare, onSchedule, onCreate, onViewHistory }: { onShare: () => void; onSchedule: () => void; onCreate: () => void; onViewHistory: () => void }) {
  const tr = useTranslations("Reports");
  const actionHandlers: Record<string, () => void> = {
    shareStakeholder: onShare,
    scheduleReport: onSchedule,
    customReport: onCreate,
    viewHistory: onViewHistory,
  };
  return (
    <Panel className="p-4">
      <h3 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{tr("quickActions.title")}</h3>
      <div className="mt-4 space-y-2">
        {quickActions.map((action) => {
          return (
            <button
              key={action.key}
              type="button"
              onClick={actionHandlers[action.key]}
              className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 text-left transition hover:border-[#DDE3EF] hover:bg-[#F8FAFF]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <span className="block truncate text-[12px] font-black text-[#101334]">{tr(`quickActions.${action.key}`)}</span>
                  <span className="mt-0.5 block truncate text-[9.5px] font-bold text-[#58648C]">{tr(`quickActions.${action.descKey}`)}</span>
                </div>
              </div>
              <ArrowRight size={13} className="text-[#647099] shrink-0" />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const tr = useTranslations("Reports");
  const styles: Record<ReportStatus, string> = {
    READY: "bg-[#10B981]/10 text-[#047857]",
    REVIEW: "bg-[#F59E0B]/10 text-[#A04606]",
    DRAFT: "bg-[#8B5CFF]/10 text-[#6E44E8]",
    SCHEDULED: "bg-[#465FFF]/10 text-[#3B52F5]",
    ARCHIVED: "bg-slate-100 text-slate-600",
  };
  return <span className={cn("rounded-[7px] px-2 py-0.5 text-[9.5px] font-black tracking-[0.05em]", styles[status])}>{tr(`statusBadge.${status}`)}</span>;
}


function ReportsTable({
  rows,
  footerText,
  pagination,
  onPageChange,
  isFetching,
  onExport,
  onExportFile,
}: {
  rows: ReportRow[];
  footerText: string;
  pagination?: PaginationInfo | null;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
  onExport: (reportId: string) => void;
  onExportFile?: (reportId: string, format: "csv" | "xlsx") => void;
}) {
  const tr = useTranslations("Reports");
  type TabValue = "all" | ReportStatus;
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const tabs: Array<{ key: string; value: TabValue }> = [
    { key: "all", value: "all" },
    { key: "ready", value: "READY" },
    { key: "review", value: "REVIEW" },
    { key: "draft", value: "DRAFT" },
    { key: "scheduled", value: "SCHEDULED" },
    { key: "archived", value: "ARCHIVED" },
  ];
  const filteredRows = rows
    .filter((report) => activeTab === "all" || report.status === activeTab)
    .filter((report) => typeFilter === "all" || report.type === typeFilter)
    .filter((report) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return [report.title, report.description, report.type, report.period, report.created].some((value) => value.toLowerCase().includes(term));
    });
  const visibleRows = sortDirection === "desc" ? filteredRows : [...filteredRows].reverse();
  const hasLocalFilters = activeTab !== "all" || searchTerm.trim().length > 0 || typeFilter !== "all";

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{tr("table.title")}</h2>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="relative block w-full sm:w-[180px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#647099]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={tr("filter.search")}
              className="h-8 w-full rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] pl-8 pr-3 text-[10px] font-bold text-[#101334] outline-none transition placeholder:text-[#647099] focus:border-[#465FFF] focus:bg-white"
            />
          </label>
          <div className="relative flex-1 sm:flex-none">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label={pickL("Filter report type", "Saring jenis laporan")}
              className="h-8 w-full rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-2.5 text-[10px] font-black text-[#58648C] outline-none transition hover:bg-[#F7F8FC] focus:border-[#465FFF] sm:w-auto"
            >
              <option value="all">{pickL("All types", "Semua jenis")}</option>
              {Object.entries(REPORT_TYPE_LABELS).map(([key, [en, id]]) => <option key={key} value={pickL(en, id)}>{pickL(en, id)}</option>)}
            </select>
          </div>
          {hasLocalFilters ? (
            <button
              type="button"
              onClick={() => { setActiveTab("all"); setSearchTerm(""); setTypeFilter("all"); }}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-[7px] border border-transparent bg-[#FFF5F5] px-2.5 text-[10px] font-black text-[#B42318] transition hover:bg-[#FFEBEB] sm:flex-none"
            >
              {tr("clear") || "Reset"}
            </button>
          ) : null}
          <button type="button" onClick={() => setSortDirection((value) => value === "desc" ? "asc" : "desc")} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-2.5 text-[10px] font-black text-[#58648C] transition hover:bg-[#F7F8FC] sm:flex-none">
            {sortDirection === "desc" ? tr("filter.latest") : tr("filter.oldest")} <ChevronDown size={12} className={cn("transition", sortDirection === "asc" && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-[#EDF1F7] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "h-7 rounded-[7px] px-3 text-[10.5px] font-black transition",
              activeTab === tab.value
                ? "bg-[#465FFF] text-white shadow-sm"
                : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#58648C] hover:bg-[#F7F8FC]"
            )}
          >
            {tr(`filter.${tab.key}`)}
          </button>
        ))}
      </div>

      {/* Phone: one card per report */}
      <div className="mt-4 space-y-2.5 md:hidden">
        {visibleRows.length > 0 ? visibleRows.map((report) => (
          <div key={report.id} className="rounded-[12px] border border-[#E6EAF2] bg-white p-3.5">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/reports/${report.id}`} className="min-w-0 text-[13px] font-black leading-snug text-[#101334] hover:text-[#3B52F5]">
                {report.title}
              </Link>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-[#5F6B94]">{report.type} · {report.period}</p>
            <p className="mt-0.5 text-[10.5px] font-bold text-[#647099]">{report.created} {report.createdTime}</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <Link href={`/reports/${report.id}`} className="inline-flex items-center justify-center rounded-md bg-[#465FFF] px-2 py-2 text-[11px] font-black text-white">
                {pickL("Open", "Buka")}
              </Link>
              {(["pdf", "xlsx", "csv"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => (format === "pdf" ? onExport(String(report.id)) : onExportFile?.(String(report.id), format))}
                  disabled={isFetching}
                  className="inline-flex items-center justify-center rounded-md border border-[#DDE3EF] bg-white px-2 py-2 text-[11px] font-black text-[#5F6B94] disabled:opacity-50"
                >
                  {format === "xlsx" ? "Excel" : format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )) : (
          <div className="rounded-[12px] border border-dashed border-[#DDE3EF] px-4 py-8 text-center">
            <p className="text-[13px] font-black text-[#101334]">{tr("noMatch")}</p>
            <p className="mt-1 text-[11px] font-bold text-[#5F6B94]">{tr("noMatchDesc")}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[9.5px] font-black text-[#5F6B94]">
              <th className="px-3 py-3 w-[280px]">{tr("table.report")}</th>
              <th className="px-3 py-3">{tr("table.type")}</th>
              <th className="px-3 py-3">{tr("table.period")}</th>
              <th className="px-3 py-3">{tr("table.status")}</th>
              <th className="px-3 py-3">{tr("table.created")}</th>
              <th className="px-3 py-3 text-right">{tr("table.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7]">
            {visibleRows.length > 0 ? visibleRows.map((report) => (
              <tr key={report.id} className="transition hover:bg-[#F8FAFF]">
                <td className="min-w-[220px] px-3 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <Link href={`/reports/${report.id}`} className="text-[12.5px] font-black leading-snug text-[#101334] hover:text-[#3B52F5] transition-colors">
                        {report.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] font-bold leading-snug text-[#5F6B94]">{report.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-black text-[#31406B]">{report.type}</td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-bold text-[#5F6B94]">{report.period}</td>
                <td className="px-3 py-3.5 align-middle"><StatusBadge status={report.status} /></td>
                <td className="px-3 py-3.5 align-middle">
                  <span className="block text-[11px] font-black text-[#31406B]">{report.created}</span>
                  <span className="mt-0.5 block text-[9.5px] font-bold text-[#647099]">{report.createdTime}</span>
                </td>
                <td className="px-3 py-3.5 text-right align-middle">
                  <div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onExportFile?.(String(report.id), "csv")}
                      disabled={isFetching}
                      className="inline-flex items-center gap-1 rounded-md border border-[#DDE3EF] bg-white px-1.5 py-1.5 text-[10px] font-black text-[#5F6B94] transition hover:bg-[#EEF2FF] hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
                      title={`${tr("downloadReady")} CSV`}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportFile?.(String(report.id), "xlsx")}
                      disabled={isFetching}
                      className="inline-flex items-center gap-1 rounded-md border border-[#DDE3EF] bg-white px-1.5 py-1.5 text-[10px] font-black text-[#5F6B94] transition hover:bg-[#EEF2FF] hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
                      title={`${tr("downloadReady")} Excel`}
                    >
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => onExport(String(report.id))}
                      disabled={isFetching}
                      className="inline-flex items-center gap-1 rounded-md border border-[#DDE3EF] bg-white px-1.5 py-1.5 text-[10px] font-black text-[#5F6B94] transition hover:bg-[#EEF2FF] hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={tr("exportAria", { title: report.title })}
                      title={`${tr("downloadReady")} PDF`}
                    >
                      PDF
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center">
                  <p className="text-[13px] font-black text-[#101334]">{tr("noMatch")}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#5F6B94]">{tr("noMatchDesc")}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row">
        <p className="text-[11px] font-bold text-[#5F6B94]">{footerText}</p>
        <DashboardPagination pagination={pagination} onPageChange={onPageChange} disabled={isFetching} />
      </div>
    </Panel>
  );
}

function FormatDonut({ distribution }: { distribution: Array<{ name: string; value: string; color: string }> }) {
  const tr = useTranslations("Reports");
  
  const totalForPercent = distribution.reduce((acc, item) => {
    const num = parseInt(item.value, 10);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const hasData = distribution.length > 0 && totalForPercent > 0;

  // Build dynamic conic-gradient
  let gradient = "conic-gradient(#E6EAF2 0 100%)";
  if (hasData) {
    let cursor = 0;
    const stops = distribution.map((item) => {
      const num = parseInt(item.value, 10);
      const pct = totalForPercent > 0 ? (num / totalForPercent) * 100 : 0;
      const next = Math.min(100, cursor + pct);
      const stop = `${item.color} ${cursor}% ${next}%`;
      cursor = next;
      return stop;
    });
    if (cursor < 100) stops.push(`#E6EAF2 ${cursor}% 100%`);
    gradient = `conic-gradient(${stops.join(", ")})`;
  }

  return (
    <Panel className="p-4">
      <h3 className="text-[16px] font-black text-[#101334]">{tr("formatDonut.title")}</h3>
      <div className="mt-5 grid gap-5 sm:grid-cols-[136px_minmax(0,1fr)] md:grid-cols-1 xl:grid-cols-[136px_minmax(0,1fr)]">
        {hasData ? (
          <>
            <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full" style={{ background: gradient }}>
              <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
              <span className="relative text-center">
                <b className="block text-[22px] font-black text-[#101334]">{totalForPercent}</b>
                <span className="text-[10px] font-bold text-[#5F6B94]">{tr("formatDonut.total")}</span>
              </span>
            </div>
            <div className="space-y-2.5 self-center">
              {distribution.map((item) => {
                const num = parseInt(item.value, 10);
                const pct = totalForPercent > 0 ? Math.round((num / totalForPercent) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-2 text-[#31406B]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-[#5F6B94]">{num} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center sm:col-span-2 xl:col-span-2">
            <p className="text-[13px] font-bold text-[#53608C]">{tr("formatDonut.noData")}</p>
            <p className="mt-1 text-[11px] font-bold text-[#647099]">{tr("formatDonut.noDataDesc")}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function formatChartDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function TimelineChart({ data }: { data: ReportsAnalyticsResponse["trend_timeline"] }) {
  const tr = useTranslations("Reports");
  const series = data.map((item) => item.count);
  const hasData = series.some((v) => v > 0);
  const max = Math.max(1, ...series);
  const total = series.reduce((sum, v) => sum + v, 0);
  const every = Math.max(1, Math.ceil(data.length / 7));
  return (
    <Panel className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{tr("timeline.title")} <span className="text-[11px] font-bold text-[#5F6B94]">{tr("timeline.period")}</span></h3>
        {hasData ? <span className="text-[13px] font-black text-[#101334]">{total} <span className="font-bold text-[#5A6478]">{pickL("reports", "laporan")}</span></span> : null}
      </div>
      {!hasData ? (
        <p className="mt-6 text-[12px] font-semibold text-[#5A6478]">{pickL("No report created in this period.", "Belum ada laporan dibuat pada periode ini.")}</p>
      ) : (
        <>
          <div className="mt-4 flex h-[150px] items-end gap-1.5 rounded-[12px] bg-[#F7F8FC] px-2 pt-3">
            {data.map((d, i) => (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${formatChartDate(d.date)}: ${d.count}`}>
                {d.count > 0 ? <span className="text-[10px] font-black text-[#101334]">{d.count}</span> : null}
                <div className="w-full rounded-t-[4px]" style={{ height: d.count > 0 ? `${Math.max(8, (d.count / max) * 100)}%` : "2px", background: d.count === max ? "#465FFF" : d.count > 0 ? "#9AA9FF" : "#E3E7F1" }} />
                <span className="sr-only">{i}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5 px-2 text-[10px] font-bold text-[#5F6B94]">
            {data.map((d, i) => <span key={d.date} className="flex-1 text-center">{i % every === 0 ? formatChartDate(d.date) : ""}</span>)}
          </div>
        </>
      )}
    </Panel>
  );
}

function PopularReports({ reports, onViewAll }: { reports: PopularReportItem[]; onViewAll: () => void }) {
  const tr = useTranslations("Reports");
  return (
    <Panel className="p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-[16px] font-black text-[#101334]">{tr("popular.title")}</h3>
        
        <div className="mt-5 space-y-3">
          {reports.length > 0 ? reports.slice(0, 5).map((report, idx) => (
            <div key={`${report.title}:${idx}`} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[11px] font-black text-[#3B52F5]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-black text-[#101334]">{report.title}</span>
              </div>
              <span className="text-[11px] font-bold text-[#5F6B94] shrink-0">{report.views}</span>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-[11px] font-bold text-[#647099]">{tr("popular.noData")}</p>
            </div>
          )}
        </div>
      </div>

      {reports.length > 0 ? (
        <div className="mt-6 border-t border-[#EDF1F7] pt-4">
          <button type="button" onClick={onViewAll} className="flex w-full items-center justify-between text-[11px] font-black text-[#3B52F5] hover:text-[#3B20EA] transition-colors">
            <span>{tr("popular.viewAll")}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </Panel>
  );
}

export default function ReportsPage() {
  const t = useTranslations("DemoApp");
  const tr = useTranslations("Reports");
  const tds = useTranslations("DashboardStates");
  const toastHook = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

  // Custom Template State
  const [editingTemplate, setEditingTemplate] = useState<Partial<ReportTemplate> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Schedule State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<ReportScheduleRecord> | null>(null);

  // Popular Reports Modal
  const [isPopularModalOpen, setIsPopularModalOpen] = useState(false);

  // Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const mountedId = window.setTimeout(() => setMounted(true), 0);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTemplatesModalOpen(false);
        setIsCreateModalOpen(false);
        setIsScheduleModalOpen(false);
        setIsScheduleFormOpen(false);
        setIsPopularModalOpen(false);
        setIsShareModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(mountedId);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    if (type === "info") { toastHook.info(message); return; }
    toastHook.success(message);
  };

  const exportMutation = useMutation({
    mutationFn: ({ reportId, format }: { reportId: string; format: "json" | "pdf" }) => createReportExport(reportId, format),
    onSuccess: async (result) => {
      if (result?.jobId) {
        showToast(tr("toast.exportStarted"));
        const pollStatus = async () => {
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const status = await getReportExportStatus(result.jobId);
            if (status.status === "completed" && status.signedUrl) {
              window.open(status.signedUrl, "_blank");
              showToast(tr("toast.exportSuccess"));
              return;
            }
            if (status.status === "failed") {
              showToast(tr("toast.exportFailed"), "error");
              return;
            }
          }
          showToast(tr("toast.exportProcessing"), "info");
        };
        pollStatus();
      } else {
        showToast(tr("toast.exportInitFailed"), "error");
      }
    },
    onError: () => showToast(tr("toast.exportInitFailed"), "error"),
  });

  const handleExportFile = async (reportId: string, format: "pdf" | "csv" | "xlsx") => {
    const name = format === "xlsx" ? "Excel" : format.toUpperCase();
    try {
      showToast(pickL(`Preparing the ${name} file…`, `Menyiapkan file ${name}…`));
      await downloadReportFile(reportId, format);
      showToast(pickL(`${name} file downloaded`, `File ${name} berhasil diunduh`));
    } catch {
      showToast(pickL(`The ${name} file could not be downloaded`, `File ${name} gagal diunduh`), "error");
    }
  };
  const reportsQuery = useQuery({
    queryKey: ["reports", { page, limit: reportsApiLimit }],
    queryFn: async () => {
      return await getReports({ page, limit: reportsApiLimit });
    },
    staleTime: 30 * 1000,
  });
  const templatesQuery = useQuery({
    queryKey: ["report-templates"],
    queryFn: getReportTemplates,
    staleTime: 5 * 60 * 1000,
  });
  const analyticsQuery = useQuery({
    queryKey: ["report-analytics"],
    queryFn: () => getReportsAnalytics(),
    staleTime: 60 * 1000,
  });
  
  // Custom Template Mutations
  const { refetch: refetchTemplates } = templatesQuery;
  const createTemplateMutation = useMutation({
    mutationFn: (data: Partial<ReportTemplate>) => createReportTemplate(data),
    onSuccess: () => {
      showToast(tr("toast.templateSaved"));
      setIsFormOpen(false);
      void refetchTemplates();
      void queryClient.invalidateQueries({ queryKey: ["report-analytics"] });
    },
    onError: () => showToast(tr("toast.templateSaveFailed"), "error")
  });
  const updateTemplateMutation = useMutation({
    mutationFn: (data: { id: string, payload: Partial<ReportTemplate> }) => updateReportTemplate(data.id, data.payload),
    onSuccess: () => {
      showToast(tr("toast.templateUpdated"));
      setIsFormOpen(false);
      void refetchTemplates();
    },
    onError: () => showToast(tr("toast.templateUpdateFailed"), "error")
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteReportTemplate(id),
    onSuccess: () => {
      showToast(tr("toast.templateDeleted"));
      void refetchTemplates();
    },
    onError: () => showToast(tr("toast.templateDeleteFailed"), "error")
  });
  
  const handleSaveTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      format: formData.get("format") as string,
      cadence: formData.get("cadence") as string,
    };
    if (editingTemplate?.key) {
      updateTemplateMutation.mutate({ id: editingTemplate.key, payload });
    } else {
      createTemplateMutation.mutate(payload);
    }
  };

  // Schedule Queries & Mutations
  const schedulesQuery = useQuery({
    queryKey: ["report-schedules"],
    queryFn: getReportSchedules,
    staleTime: 30 * 1000,
  });
  const { refetch: refetchSchedules } = schedulesQuery;
  const createScheduleMutation = useMutation({
    mutationFn: (data: Partial<ReportScheduleRecord>) => createReportSchedule(data),
    onSuccess: () => {
      showToast(tr("scheduleToast.saved"));
      setIsScheduleFormOpen(false);
      setEditingSchedule(null);
      void refetchSchedules();
    },
    onError: () => showToast(tr("scheduleToast.saveFailed"), "error")
  });
  const updateScheduleMutation = useMutation({
    mutationFn: (data: { id: string, payload: Partial<ReportScheduleRecord> }) => updateReportSchedule(data.id, data.payload),
    onSuccess: () => {
      showToast(tr("scheduleToast.updated"));
      setIsScheduleFormOpen(false);
      setEditingSchedule(null);
      void refetchSchedules();
    },
    onError: () => showToast(tr("scheduleToast.updateFailed"), "error")
  });
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => deleteReportSchedule(id),
    onSuccess: () => {
      showToast(tr("scheduleToast.deleted"));
      void refetchSchedules();
    },
    onError: () => showToast(tr("scheduleToast.deleteFailed"), "error")
  });
  const toggleScheduleMutation = useMutation({
    mutationFn: (id: string) => toggleReportSchedule(id),
    onSuccess: () => {
      showToast(tr("scheduleToast.toggled"));
      void refetchSchedules();
    },
    onError: () => showToast(tr("scheduleToast.toggleFailed"), "error")
  });
  const sendTestEmailMutation = useMutation({
    mutationFn: (scheduleId: string) => sendTestScheduleEmail(scheduleId),
    onSuccess: (result) => {
      if (result.success) {
        showToast(tr("scheduleToast.testEmailSent"));
      } else {
        showToast(result.message || tr("scheduleToast.testEmailFailed"), "error");
      }
    },
    onError: () => showToast(tr("scheduleToast.testEmailFailed"), "error")
  });

  const handleSaveSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const recipientsStr = formData.get("recipients") as string;
    const ccRecipientsStr = formData.get("ccRecipients") as string;
    const bccRecipientsStr = formData.get("bccRecipients") as string;

    const parseEmails = (str: string): string[] => {
      return str.split(",").map(e => e.trim()).filter(Boolean);
    };

    const payload = {
      templateKey: formData.get("templateKey") as string,
      name: formData.get("name") as string,
      cadence: formData.get("cadence") as string,
      dayOfWeek: formData.get("dayOfWeek") as string || null,
      timeOfDay: formData.get("timeOfDay") as string,
      timezone: formData.get("timezone") as string || Intl.DateTimeFormat().resolvedOptions().timeZone,
      recipients: parseEmails(recipientsStr),
      ccRecipients: parseEmails(ccRecipientsStr),
      bccRecipients: parseEmails(bccRecipientsStr),
    };
    if (editingSchedule?.id) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, payload });
    } else {
      createScheduleMutation.mutate(payload);
    }
  };

  // Generate Report Mutation
  const generateReportMutation = useMutation({
    mutationFn: (data: { templateKey: string; dateRange?: { start: string; end: string } }) =>
      generateReportFromTemplate({ templateKey: data.templateKey, dateRange: data.dateRange }),
    onSuccess: () => {
      showToast(tr("createModal.success"));
      setIsCreateModalOpen(false);
      void reportsQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["report-analytics"] });
    },
    onError: () => showToast(tr("createModal.failed"), "error")
  });

  const handleGenerateReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const templateKey = formData.get("templateKey") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (!templateKey) return;
    if ((startDate && !endDate) || (!startDate && endDate)) {
      showToast(tr("createModal.dateRangeInvalid"), "error");
      return;
    }

    const dateRange = (startDate && endDate)
      ? { start: new Date(startDate).toISOString(), end: new Date(endDate).toISOString() }
      : undefined;
    if (dateRange && new Date(dateRange.start).getTime() > new Date(dateRange.end).getTime()) {
      showToast(tr("createModal.dateRangeInvalid"), "error");
      return;
    }

    generateReportMutation.mutate({ templateKey, dateRange });
  };

  // Share Report Mutation
  const shareReportMutation = useMutation({
    mutationFn: (data: { reportId: string; recipientEmail: string; subject?: string }) =>
      sendReportEmail({ reportId: data.reportId, recipientEmail: data.recipientEmail, subject: data.subject }),
    onSuccess: (result) => {
      if (result?.sent) {
        showToast(tr("shareModal.success"));
        setIsShareModalOpen(false);
      } else {
        showToast(tr("shareModal.failed"), "error");
      }
    },
    onError: () => showToast(tr("shareModal.failed"), "error")
  });

  const handleShareReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const subject = formData.get("subject") as string;
    const firstRow = rows[0];
    if (!email || !firstRow) return;
    shareReportMutation.mutate({ reportId: String(firstRow.id), recipientEmail: email, subject: subject || undefined });
  };
  const narrativesQuery = useQuery({
    queryKey: ["reports-narratives-summary"],
    queryFn: () => getNarratives({ limit: 10, days: 7 }),
    staleTime: 60 * 1000,
  });
  const dashboardQuery = useQuery({
    queryKey: ["reports-dashboard-summary"],
    queryFn: () => getDashboardSummary(),
    staleTime: 60 * 1000,
  });
  
  const isLiveUnavailable = reportsQuery.data === null;
  const rows = reportsQuery.data?.data
    ? buildApiReportRows(reportsQuery.data.data, { description: tr("preview.liveFallback") }, intlLocale())
    : [];

  const templatesValue = templatesQuery.isPending ? "..." : String(templatesQuery.data?.data.length ?? 0);
  const totalReportsValue = reportsQuery.isPending ? "..." : String(reportsQuery.data?.pagination.total ?? 0);
  const inProgressValue = reportsQuery.isPending ? "..." : String(rows.filter((r) => r.status === "REVIEW" || r.status === "DRAFT").length);
  const readyValue = reportsQuery.isPending ? "..." : String(rows.filter((r) => r.status === "READY").length);

  const liveMetricCards = [
    { key: "templates", value: templatesValue, icon: FileText, tone: "purple" as const },
    { key: "reportsCreated", value: totalReportsValue, icon: Download, tone: "green" as const },
    { key: "inProgress", value: inProgressValue, icon: Calendar, tone: "purple" as const },
    { key: "ready", value: readyValue, icon: FileText, tone: "blue" as const },
  ];

  // Derive live chart data from analytics endpoint
  const analytics = analyticsQuery.data;
  const liveFormatDistribution: FormatDistributionItem[] = analytics
    ? [
        ...(analytics.format_distribution.pdf > 0
          ? [{ name: "PDF", value: `${analytics.format_distribution.pdf}`, color: formatDistributionColors.PDF }]
          : []),
        ...(analytics.format_distribution.json > 0
          ? [{ name: "JSON", value: `${analytics.format_distribution.json}`, color: formatDistributionColors.JSON }]
          : []),
      ]
    : [];
  const livePopularReports: PopularReportItem[] = analytics
    ? analytics.popular_templates.map((t) => ({ title: t.name, views: tr("popular.created", { count: t.count }) }))
    : [];
  const liveTrendTimeline = analytics?.trend_timeline ?? [];
  const footerText = reportsQuery.data?.pagination
    ? formatPaginationSummary(reportsQuery.data.pagination, tr("paginationExtended.labelLive"), (values) => tds("pagination.summary", values))
    : isLiveUnavailable
      ? tr("liveData.fallback")
      : tr("paginationExtended.sampleSummary");

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {isDemoSession && (
        <DemoBanner />
      )}
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{t("pages.reports.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setIsTemplatesModalOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:bg-[#F8FAFF]">
            {tr("buttons.manageTemplates")}
          </button>
          <button type="button" onClick={() => setIsScheduleModalOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:bg-[#F8FAFF]">
            {tr("buttons.scheduleSettings")}
          </button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90">
            {tr("buttons.createNew")}
          </button>
        </div>
      </header>

      {/* AI Summary and Preview */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <AIReportSummary narratives={narrativesQuery.data?.data} dashboard={dashboardQuery.data} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {liveMetricCards.map((metric) => {
              const labelKey = `liveMetrics.${metric.key}`;
              const helperKey = `liveMetrics.${metric.key}Helper`;
              return (
                <MetricCard
                  key={metric.key}
                  label={tr(labelKey)}
                  helper={tr(helperKey)}
                  value={metric.value}
                  icon={metric.icon}
                  tone={metric.tone}
                />
              );
            })}
          </div>
          {reportsQuery.isPending ? (
            <TableSkeleton rows={6} columns={7} />
          ) : reportsQuery.data && rows.length === 0 ? (
            <DashboardEmptyState title={tr("empty.title")} description={tr("empty.desc")} icon="search" minHeight="min-h-[420px]" />
          ) : (
            <>
              {isLiveUnavailable ? <DashboardErrorState title={tr("error.title")} description={tr("error.desc")} onRetry={() => void reportsQuery.refetch()} minHeight="min-h-[150px]" /> : null}
              <ReportsTable
                rows={rows}
                footerText={footerText}
                pagination={reportsQuery.data?.pagination}
                onPageChange={setPage}
                isFetching={reportsQuery.isFetching || exportMutation.isPending}
                onExport={(reportId) => void handleExportFile(reportId, "pdf")}
                onExportFile={handleExportFile}
              />
            </>
          )}
        </div>
        <div className="space-y-4">
          <ReportPreviewSidebar
            latestReport={reportsQuery.data?.data?.[0]}
            onExportPdf={() => { const firstRow = rows[0]; if (firstRow) void handleExportFile(String(firstRow.id), "pdf"); }}
            onExportFile={(fmt) => { const firstRow = rows[0]; if (firstRow) void handleExportFile(String(firstRow.id), fmt); }}
            isPending={reportsQuery.isPending}
          />
          <QuickActions
            onShare={() => setIsShareModalOpen(true)}
            onSchedule={() => setIsScheduleModalOpen(true)}
            onCreate={() => setIsCreateModalOpen(true)}
            onViewHistory={() => router.push("/workspace/activity")}
          />
        </div>
      </div>

      {/* Bottom Distribution charts */}
      <div className={cn("grid gap-4", liveFormatDistribution.length > 0 ? "lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]" : "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>
        {liveFormatDistribution.length > 0 ? <FormatDonut distribution={liveFormatDistribution} /> : null}
        <TimelineChart data={liveTrendTimeline} />
            <PopularReports reports={livePopularReports} onViewAll={() => setIsPopularModalOpen(true)} />
        </div>

      {/* Schedule Settings Modal */}
      <ModalShell open={mounted && isScheduleModalOpen} onClose={() => { setIsScheduleModalOpen(false); setIsScheduleFormOpen(false); }} size="md" title={tr("scheduleModal.title")}>
<div className="mb-4 flex justify-end">{!isScheduleFormOpen && (
                  <button type="button" onClick={() => { setEditingSchedule(null); setIsScheduleFormOpen(true); }} className="flex h-7 items-center justify-center gap-1.5 rounded-[6px] bg-[#465FFF] hover:bg-[#3B52F5] px-2.5 text-[10px] font-black text-white shadow-sm transition hover:opacity-90">
                    {tr("scheduleModal.addSchedule")}
                  </button>
                )}</div>
{isScheduleFormOpen ? (
                <form onSubmit={handleSaveSchedule} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("scheduleModal.nameLabel")}</label>
                    <input name="name" required defaultValue={editingSchedule?.name || ""} placeholder={tr("scheduleModal.namePlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("scheduleModal.templateLabel")}</label>
                    <select name="templateKey" required defaultValue={editingSchedule?.templateKey || ""} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="" disabled>{tr("scheduleModal.templatePlaceholder")}</option>
                      {templatesQuery.data?.data.map((tpl) => (
                        <option key={tpl.key} value={tpl.key}>{tpl.name} ({tpl.isSystem ? tr("scheduleModal.systemTemplate") : tr("scheduleModal.customTemplate")})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("scheduleModal.cadenceLabel")}</label>
                      <select name="cadence" defaultValue={editingSchedule?.cadence || "weekly"} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                        <option value="daily">{tr("scheduleModal.daily")}</option>
                        <option value="weekly">{tr("scheduleModal.weekly")}</option>
                        <option value="monthly">{tr("scheduleModal.monthly")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("scheduleModal.dayLabel")}</label>
                      <select name="dayOfWeek" defaultValue={editingSchedule?.dayOfWeek || "monday"} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                        <option value="monday">{tr("scheduleModal.monday")}</option>
                        <option value="tuesday">{tr("scheduleModal.tuesday")}</option>
                        <option value="wednesday">{tr("scheduleModal.wednesday")}</option>
                        <option value="thursday">{tr("scheduleModal.thursday")}</option>
                        <option value="friday">{tr("scheduleModal.friday")}</option>
                        <option value="saturday">{tr("scheduleModal.saturday")}</option>
                        <option value="sunday">{tr("scheduleModal.sunday")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("scheduleModal.timeLabel")}</label>
                      <input name="timeOfDay" type="time" defaultValue={editingSchedule?.timeOfDay || "09:00"} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("scheduleModal.timezoneLabel")}</label>
                    <select name="timezone" defaultValue={editingSchedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                      <option value="Asia/Makassar">Asia/Makassar (GMT+8)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (GMT+9)</option>
                      <option value="Asia/Shanghai">Asia/Shanghai (GMT+8)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                      <option value="Asia/Hong_Kong">Asia/Hong_Kong (GMT+8)</option>
                      <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
                      <option value="Europe/London">Europe/London (GMT+0)</option>
                      <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                      <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                      <option value="America/Chicago">America/Chicago (GMT-6)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                    </select>
                  </div>
                  {/* Email Recipients Section */}
                  <div className="rounded-[10px] border border-[#EEF1F7] bg-[#FAFBFF] p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-black text-[#31406B]">{tr("scheduleModal.recipientsLabel")}</span>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#647099]">{tr("scheduleModal.toLabel")}</label>
                      <input name="recipients" defaultValue={editingSchedule?.recipients?.join(", ") || ""} placeholder="email@example.com, email2@example.com" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-[#647099]">{tr("scheduleModal.ccLabel")}</label>
                        <input name="ccRecipients" defaultValue={editingSchedule?.ccRecipients?.join(", ") || ""} placeholder="cc@example.com" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-[#647099]">{tr("scheduleModal.bccLabel")}</label>
                        <input name="bccRecipients" defaultValue={editingSchedule?.bccRecipients?.join(", ") || ""} placeholder="bcc@example.com" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                      </div>
                    </div>
                  </div>
                  {editingSchedule?.id && (
                    <div className="rounded-[8px] border border-transparent bg-[#10B981]/5 p-3">
                      <button
                        type="button"
                        onClick={() => sendTestEmailMutation.mutate(editingSchedule.id!)}
                        disabled={sendTestEmailMutation.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-white px-4 py-2 text-[11px] font-black text-[#047857] border border-[#E6EAF2] transition hover:bg-[#10B981]/10 disabled:opacity-50"
                      >
                        {sendTestEmailMutation.isPending ? (
                          <RefreshCcw size={13} className="animate-spin" />
                        ) : (
                          <Mail size={13} />
                        )}
                        {sendTestEmailMutation.isPending ? tr("scheduleModal.sendingTest") : tr("scheduleModal.sendTestEmail")}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                    <button type="button" onClick={() => { setIsScheduleFormOpen(false); setEditingSchedule(null); }} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                      {tr("scheduleModal.cancel")}
                    </button>
                    <button type="submit" disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                      {(createScheduleMutation.isPending || updateScheduleMutation.isPending) ? tr("scheduleModal.saving") : tr("scheduleModal.save")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-3">
                  {schedulesQuery.isPending ? (
                    <div className="flex h-40 items-center justify-center">
                      <RefreshCcw className="animate-spin text-[#647099]" size={24} />
                    </div>
                  ) : schedulesQuery.data && schedulesQuery.data.data.length > 0 ? (
                    schedulesQuery.data.data.map((schedule) => (
                      <div key={schedule.id} className="rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-[#DCE2F0] hover:bg-[#F7F8FC] transition shadow-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-[#101334] text-[13px] truncate">{schedule.name}</h3>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black", schedule.enabled ? "bg-[#10B981]/10 text-[#047857]" : "bg-[#EF4444]/10 text-[#C81E1E]")}>
                              {schedule.enabled ? tr("scheduleModal.enabled") : tr("scheduleModal.disabled")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#465FFF]/10 text-[#3B52F5] px-2.5 py-1.5 rounded-[6px] font-black">
                              {tr(`scheduleModal.${schedule.cadence}`)}
                            </span>
                            {schedule.dayOfWeek && (
                              <span className="flex items-center gap-1.5 text-[9.5px] bg-[#8B5CFF]/10 text-[#6E44E8] px-2.5 py-1.5 rounded-[6px] font-black">
                                {tr(`scheduleModal.${schedule.dayOfWeek}`)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#F59E0B]/10 text-[#A04606] px-2.5 py-1.5 rounded-[6px] font-black">
                              {schedule.timeOfDay}
                            </span>
                            {schedule.timezone && (
                              <span className="flex items-center gap-1.5 text-[9.5px] bg-[#64748B]/10 text-[#64748B] px-2.5 py-1.5 rounded-[6px] font-black">
                                {schedule.timezone.split("/").pop()?.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          {/* Recipients display */}
                          {schedule.recipients && schedule.recipients.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-[9.5px] font-bold text-[#647099] truncate">
                                {schedule.recipients.slice(0, 2).join(", ")}
                                {schedule.recipients.length > 2 && ` +${schedule.recipients.length - 2}`}
                              </span>
                              {(schedule.ccRecipients?.length ?? 0) > 0 && (
                                <span className="text-[9.5px] font-bold text-[#647099]">
                                  {" "}(CC: {schedule.ccRecipients!.length})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-[#647099]">
                            <span>{tr("scheduleModal.lastRun")}: {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : tr("scheduleModal.never")}</span>
                          </div>
                          <div className="text-[10px] font-bold text-[#047857] mt-0.5">
                            {tr("scheduleModal.nextRun")}: {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : tr("scheduleModal.never")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => sendTestEmailMutation.mutate(schedule.id)}
                            disabled={sendTestEmailMutation.isPending}
                            className="flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#E6EAF2] bg-white px-2.5 text-[10px] font-black text-[#047857] transition hover:bg-[#ECFDF5] disabled:opacity-50"
                            title={tr("scheduleModal.sendTestEmail")}
                          >
                            <Mail size={13} />
                          </button>
                          <button type="button" onClick={() => toggleScheduleMutation.mutate(schedule.id)} className={cn("flex h-8 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 text-[10px] font-black transition", schedule.enabled ? "border-[#E6EAF2] bg-white text-[#C81E1E] hover:bg-[#FFF4F4]" : "border-[#E6EAF2] bg-white text-[#047857] hover:bg-[#ECFDF5]")}>
                            {schedule.enabled ? tr("scheduleModal.disable") : tr("scheduleModal.enable")}
                          </button>
                          <button type="button" onClick={() => { setEditingSchedule(schedule); setIsScheduleFormOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#3B52F5] transition hover:bg-[#F5F7FC]" aria-label={tr("actions.editSchedule")}>
                            <Edit2 size={13} />
                          </button>
                          <button type="button" onClick={() => { if (window.confirm(tr("confirm.deleteSchedule"))) deleteScheduleMutation.mutate(schedule.id); }} disabled={deleteScheduleMutation.isPending} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#C81E1E] transition hover:bg-[#FFF4F4]" aria-label={tr("actions.deleteSchedule")}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-center">
                      <p className="text-[13px] font-bold text-[#53608C]">{tr("scheduleModal.empty")}</p>
                      <p className="text-[11px] font-bold text-[#647099] mt-1">{tr("scheduleModal.emptyDesc")}</p>
                    </div>
                  )}
                </div>
              )}
</ModalShell>

      {/* Popular Reports Modal */}
      <ModalShell open={mounted && isPopularModalOpen} onClose={() => setIsPopularModalOpen(false)} size="md" title={tr("popular.title")} description={tr("popular.desc")}>
{livePopularReports.length > 0 ? (
                <div className="space-y-3">
                  {livePopularReports.map((report, idx) => (
                    <div key={`${report.title}:${idx}`} className="flex items-center gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3 hover:border-[#DCE2F0] hover:bg-[#F7F8FC] transition">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[12px] font-black text-[#3B52F5]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-black text-[#101334]">{report.title}</span>
                      </div>
                      <span className="text-[12px] font-bold text-[#5F6B94] shrink-0">{report.views}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[13px] font-bold text-[#53608C]">{tr("popular.noData")}</p>
                </div>
              )}
</ModalShell>

      {/* Share Report Modal */}
      <ModalShell open={mounted && isShareModalOpen} onClose={() => setIsShareModalOpen(false)} size="sm" title={tr("shareModal.title")} description={tr("shareModal.desc")}>
{rows.length > 0 ? (
                <form onSubmit={handleShareReport} className="space-y-4">
                  <div className="rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3">
                    <p className="text-[10px] font-bold text-[#647099]">{tr("shareModal.title")}</p>
                    <p className="mt-1 text-[12px] font-black text-[#101334] truncate">{rows[0].title}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("shareModal.emailLabel")}</label>
                    <input name="email" type="email" required placeholder={tr("shareModal.emailPlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("shareModal.subjectLabel")}</label>
                    <input name="subject" placeholder={tr("shareModal.subjectPlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                    <button type="button" onClick={() => setIsShareModalOpen(false)} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                      {tr("shareModal.cancel")}
                    </button>
                    <button type="submit" disabled={shareReportMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                      {shareReportMutation.isPending ? tr("shareModal.sending") : tr("shareModal.send")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-[13px] font-bold text-[#53608C]">{tr("shareModal.noReport")}</p>
                </div>
              )}
</ModalShell>

      {/* Screen Reader AI image slot */}

      {/* Modals */}
      <ModalShell open={mounted && isTemplatesModalOpen} onClose={() => setIsTemplatesModalOpen(false)} size="md" title={tr("buttons.manageTemplates")}>
<div className="mb-4 flex justify-end">{!isFormOpen && (
                  <button type="button" onClick={() => { setEditingTemplate(null); setIsFormOpen(true); }} className="flex h-7 items-center justify-center gap-1.5 rounded-[6px] bg-[#465FFF] hover:bg-[#3B52F5] px-2.5 text-[10px] font-black text-white shadow-sm transition hover:opacity-90">
                    {tr("templateForm.addCustom")}
                  </button>
                )}</div>
{isFormOpen ? (
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("templateForm.nameLabel")}</label>
                    <input name="name" required defaultValue={editingTemplate?.name || ""} placeholder={tr("templateForm.namePlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("templateForm.descLabel")}</label>
                    <input name="description" defaultValue={editingTemplate?.description || ""} placeholder={tr("templateForm.descPlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("templateForm.formatLabel")}</label>
                      <div className="flex h-9 w-full items-center rounded-[8px] border border-[#DDE3EF] bg-[#F5F7FC] px-3 text-[12px] font-bold text-[#647099]">
                        PDF
                      </div>
                      <input type="hidden" name="format" value="PDF" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("templateForm.cadenceLabel")}</label>
                      <select name="cadence" defaultValue={editingTemplate?.cadence || "On-demand"} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                        <option value="On-demand">{tr("templateForm.onDemand")}</option>
                        <option value="Daily">{tr("templateForm.daily")}</option>
                        <option value="Weekly">{tr("templateForm.weekly")}</option>
                        <option value="Monthly">{tr("templateForm.monthly")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                      {tr("templateForm.cancel")}
                    </button>
                    <button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                      {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? tr("templateForm.saving") : tr("templateForm.save")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-3">
                  {templatesQuery.isPending ? (
                    <div className="flex h-40 items-center justify-center">
                      <RefreshCcw className="animate-spin text-[#647099]" size={24} />
                    </div>
                  ) : templatesQuery.data && templatesQuery.data.data.length > 0 ? (
                    templatesQuery.data.data.map((template) => (
                      <div key={template.key} className="rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#DCE2F0] hover:bg-[#F7F8FC] transition shadow-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-[#101334] text-[13px] truncate">{template.name}</h3>
                            <span className="shrink-0 rounded-full bg-[#E6EAF2] px-2 py-0.5 text-[9px] font-black text-[#58648C]">
                              {pickL(`${template.sectionCount} sections`, `${template.sectionCount} bagian`)}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-[#5F6B94] mt-1 leading-relaxed">{template.description}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#465FFF]/10 text-[#3B52F5] px-2.5 py-1.5 rounded-[6px] font-black">
                              {template.format}
                            </span>
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#8B5CFF]/10 text-[#6E44E8] px-2.5 py-1.5 rounded-[6px] font-black">
                              {template.cadence}
                            </span>
                          </div>
                        </div>
                        {template.isSystem ? (
                          <span className="shrink-0 self-start sm:self-center rounded-[8px] bg-[#F5F7FC] px-3 py-1.5 text-[10px] font-black text-[#647099] border border-[#E6EAF2]">
                            {tr("buttons.systemTemplate")}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button type="button" onClick={() => { setEditingTemplate(template); setIsFormOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#3B52F5] transition hover:bg-[#F5F7FC]" aria-label={tr("actions.editTemplate")}>
                              <Edit2 size={13} />
                            </button>
                            <button type="button" onClick={() => { if (window.confirm(tr("confirm.deleteTemplate"))) deleteTemplateMutation.mutate(template.key); }} disabled={deleteTemplateMutation.isPending} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#C81E1E] transition hover:bg-[#FFF4F4]" aria-label={tr("actions.deleteTemplate")}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-center">
                      <p className="text-sm font-bold text-[#53608C]">{tr("empty.title")}</p>
                    </div>
                  )}
                </div>
              )}
</ModalShell>

      <ModalShell open={mounted && isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="md" title={tr("createModal.title")} description={tr("createModal.desc")}>
<form onSubmit={handleGenerateReport} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("createModal.templateLabel")}</label>
                  <select name="templateKey" required defaultValue="" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                    <option value="" disabled>{tr("createModal.templatePlaceholder")}</option>
                    {templatesQuery.data?.data.map((tpl) => (
                      <option key={tpl.key} value={tpl.key}>{tpl.name}</option>
                    ))}
                  </select>
                  {!templatesQuery.isPending && (!templatesQuery.data || templatesQuery.data.data.length === 0) && (
                    <p className="mt-1.5 text-[10px] font-bold text-[#C81E1E]">{tr("createModal.noTemplates")}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("createModal.dateRangeLabel")}</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#647099]">{tr("createModal.startLabel")}</label>
                      <input name="startDate" type="date" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#647099]">{tr("createModal.endLabel")}</label>
                      <input name="endDate" type="date" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                    {tr("createModal.cancel")}
                  </button>
                  <button type="submit" disabled={generateReportMutation.isPending || !templatesQuery.data?.data.length} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                    {generateReportMutation.isPending ? tr("createModal.generating") : tr("createModal.generate")}
                  </button>
                </div>
              </form>
</ModalShell>
    </div>
  );
}
