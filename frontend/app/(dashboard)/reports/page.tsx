"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  Search,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ProgressBar, SectionHeader, StatusBadge } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner, type FeedbackMessage } from "@/components/ui/FeedbackBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { createReportExport, getReportExportStatus, getReports } from "@/lib/api-service";

type ReportFilter = "all" | "ready" | "review" | "pending";
type ReportExportStatus = "queued" | "running" | "completed" | "failed" | "storage_unavailable";
const PAGE_SIZE = 6;

interface ReportData {
  id?: string;
  title: string;
  sections: string;
  readiness: number;
  status: string;
}

function normalizeReports(data: unknown): ReportData[] {
  const list = Array.isArray(data) ? data : (data as { reports?: unknown[] } | null)?.reports;
  if (!Array.isArray(list)) return [];

  return list.filter((item): item is ReportData => {
    return Boolean(
      item &&
        typeof item === "object" &&
        "title" in item &&
        "sections" in item &&
        "readiness" in item &&
        "status" in item,
    );
  });
}

function reportFilter(report: ReportData): ReportFilter {
  if (report.readiness >= 85) return "ready";
  if (report.readiness >= 70) return "review";
  return "pending";
}

function readinessTone(readiness: number): "blue" | "green" | "amber" {
  if (readiness >= 85) return "green";
  if (readiness >= 70) return "blue";
  return "amber";
}

function filterDotClass(value: ReportFilter) {
  if (value === "ready") return "bg-[#12B76A]";
  if (value === "review") return "bg-[#465FFF]";
  if (value === "pending") return "bg-[#FDB022]";
  return "bg-[var(--muted-2)]";
}

function exportStatusTone(status: ReportExportStatus | undefined) {
  if (status === "failed" || status === "storage_unavailable") return "text-[#B42318] dark:text-[#FDA29B]";
  if (status === "completed") return "text-[#027A48] dark:text-[#6CE9A6]";
  return "text-[#465FFF]";
}

export default function ReportsPage() {
  const t = useTranslations("Reports");
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [packagePrepared, setPackagePrepared] = useState(false);
  const [exportStatusByReport, setExportStatusByReport] = useState<Record<string, ReportExportStatus>>({});
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getReports();
      setReports(normalizeReports(res));
      setIsLoading(false);
    }

    fetchData();
  }, [reloadKey]);

  const filteredReports = reports.filter((report) => {
    const matchesQuery = [report.title, report.sections, report.status]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || reportFilter(report) === filter;
    return matchesQuery && matchesFilter;
  });

  const readyCount = reports.filter((report) => report.readiness >= 85).length;
  const averageReadiness = reports.length
    ? Math.round(reports.reduce((total, report) => total + report.readiness, 0) / reports.length)
    : 0;
  const pendingCount = reports.filter((report) => report.readiness < 85).length;

  const filterOptions: { value: ReportFilter; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "ready", label: t("filters.ready") },
    { value: "review", label: t("filters.review") },
    { value: "pending", label: t("filters.pending") },
  ];
  const activeFilterLabel = filterOptions.find((option) => option.value === filter)?.label ?? t("filter");
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageReports = filteredReports.slice(startIndex, startIndex + PAGE_SIZE);
  const firstRow = filteredReports.length === 0 ? 0 : startIndex + 1;
  const lastRow = Math.min(startIndex + pageReports.length, filteredReports.length);

  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleFilter = (value: ReportFilter) => {
    setFilter(value);
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
    setPage(1);
  };

  const handleExportReport = async (report: ReportData) => {
    if (!report.id) return;

    setExportStatusByReport((current) => ({ ...current, [report.id as string]: "queued" }));
    const created = await createReportExport(report.id, "json");
    if (!created) {
      setExportStatusByReport((current) => ({ ...current, [report.id as string]: "storage_unavailable" }));
      setFeedback({ tone: "error", title: t("exportStorageUnavailable"), description: t("exportStorageUnavailableDesc") });
      return;
    }

    setFeedback({ tone: "info", title: t("exportStarted"), description: t("exportStartedDesc") });

    const status = await getReportExportStatus(created.jobId);
    const nextStatus = (status?.status ?? "queued") as ReportExportStatus;
    setExportStatusByReport((current) => ({ ...current, [report.id as string]: nextStatus }));
    if (status?.status === "completed") {
      setPackagePrepared(true);
      setFeedback({ tone: "success", title: t("exportReady"), description: t("exportReadyDesc") });
    } else if (status?.status === "failed") {
      setFeedback({ tone: "error", title: t("exportFailed"), description: status.errorMessage ?? t("exportFailedDesc") });
    }
  };

  const displayReportTitle = (report: ReportData) => {
    if (report.title === "Weekly Narrative Intelligence Brief") return t("templates.weeklyTitle");
    if (report.title === "AI Visibility Movement Report") return t("templates.visibilityTitle");
    if (report.title === "Predictive Risk Review") return t("templates.riskTitle");
    return report.title;
  };

  const displayReportSections = (report: ReportData) => {
    if (report.sections === "Signals, clusters, GEO, actions") return t("templates.weeklySections");
    if (report.sections === "Prompt set, citations, competitors") return t("templates.visibilitySections");
    if (report.sections === "Drivers, owner actions, learning loop") return t("templates.riskSections");
    return report.sections;
  };

  const displayReportStatus = (report: ReportData) => {
    if (report.status === "Ready for exec review") return t("templates.readyStatus");
    if (report.status === "Needs GEO annotations") return t("templates.geoStatus");
    if (report.status === "Awaiting comms feedback") return t("templates.feedbackStatus");
    return report.status;
  };

  const displayReadinessLabel = (readiness: number) => {
    if (readiness >= 85) return t("readiness.ready");
    if (readiness >= 70) return t("readiness.review");
    return t("readiness.pending");
  };

  const displayExportStatus = (status: ReportExportStatus | undefined) => {
    if (status === "queued") return t("exportQueued");
    if (status === "running") return t("exportRunning");
    if (status === "completed") return t("exportCompleted");
    if (status === "storage_unavailable") return t("exportStorageUnavailableShort");
    if (status === "failed") return t("exportFailed");
    return "";
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <FeedbackBanner message={feedback} />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-[132px] w-full" />
            <Skeleton className="h-[132px] w-full" />
            <Skeleton className="h-[132px] w-full" />
          </div>
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="search"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={(
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="rounded-lg bg-[#465FFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3547D8]">
              {t("retry")}
            </button>
          )}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [t("summary.templates"), String(reports.length), t("summary.templatesHelper")],
              [t("summary.ready"), String(readyCount), t("summary.readyHelper", { count: pendingCount })],
              [t("summary.average"), `${averageReadiness}%`, t("summary.averageHelper")],
            ].map(([label, value, helper]) => (
              <section key={label} className="theme-card rounded-xl border p-5">
                <p className="theme-muted text-sm">{label}</p>
                <p className="theme-text mt-2 text-3xl font-semibold tracking-tight">{value}</p>
                <p className="theme-muted mt-1 text-xs">{helper}</p>
              </section>
            ))}
          </div>

          <section className="theme-card relative rounded-xl border">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="theme-text flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <FileText size={18} className="theme-accent" />
                  {t("queueTitle")}
                </h2>
                <p className="theme-muted mt-1 text-sm">{t("queueDesc")}</p>
              </div>
              <div className="relative flex flex-col gap-2 sm:flex-row">
                <div className="theme-panel flex h-9 min-w-0 items-center gap-2 rounded-md border border-[var(--border)] px-3 sm:w-[280px]">
                  <Search size={15} className="theme-muted shrink-0" />
                  <input
                    value={query}
                    onChange={(event) => handleSearch(event.target.value)}
                    placeholder={t("search")}
                    className="theme-text min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen((value) => !value)}
                  className={`inline-flex h-9 w-full min-w-[148px] items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium transition-colors sm:w-auto ${filterOpen ? "border-[#465FFF]/50 bg-[#465FFF]/10 text-[#465FFF]" : "theme-card theme-hover theme-text"}`}
                  aria-expanded={filterOpen}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <SlidersHorizontal size={15} className="shrink-0" />
                    <span className="truncate">{activeFilterLabel}</span>
                  </span>
                  {filter !== "all" ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#465FFF]" /> : null}
                </button>

                {filterOpen ? (
                  <div className="absolute right-0 top-[44px] z-30 w-full min-w-[244px] rounded-xl border border-[var(--border)] bg-[var(--panel-bg)] p-2 shadow-[0_20px_50px_rgba(16,24,40,0.14)] ring-1 ring-black/5 sm:w-[244px]">
                    <div className="flex items-center justify-between gap-3 px-2 py-2">
                      <p className="theme-muted text-xs font-semibold uppercase tracking-[0.08em]">{t("readinessStatus")}</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-md px-1.5 py-1 text-xs font-medium text-[#465FFF] transition-colors hover:bg-[#465FFF14]"
                      >
                        {t("clear")}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {filterOptions.map((option) => {
                        const active = filter === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleFilter(option.value)}
                            className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${active ? "bg-[#465FFF14] text-[#465FFF]" : "theme-hover theme-text"}`}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${filterDotClass(option.value)}`} />
                              <span className="truncate font-medium">{option.label}</span>
                            </span>
                            {active ? <CheckCircle2 size={15} className="shrink-0 text-[#465FFF]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-10 text-center">
                <p className="theme-text font-medium">{t("noMatch")}</p>
                <p className="theme-muted mt-2 text-sm">{t("noMatchDesc")}</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[35%]" />
                      <col className="w-[24%]" />
                      <col className="w-[17%]" />
                      <col className="w-[16%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted)]">
                        <th className="px-5 py-3 font-medium">{t("table.report")}</th>
                        <th className="px-4 py-3 font-medium">{t("table.sections")}</th>
                        <th className="px-4 py-3 font-medium">{t("table.readiness")}</th>
                        <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                        <th className="px-5 py-3 text-center font-medium">{t("table.export")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageReports.map((report) => {
                        const exportStatus = report.id ? exportStatusByReport[report.id] : undefined;
                        const isExporting = exportStatus === "queued" || exportStatus === "running";
                        const hasExportError = exportStatus === "failed" || exportStatus === "storage_unavailable";

                        return (
                        <tr key={report.id ?? report.title} className="theme-row-hover border-b border-[var(--border)] last:border-0">
                          <td className="px-5 py-4 align-top">
                            <p className="theme-text font-medium">{displayReportTitle(report)}</p>
                            <p className="theme-muted mt-1 text-xs">{t("updatedSnapshot")}</p>
                          </td>
                          <td className="theme-muted px-4 py-4 align-top">{displayReportSections(report)}</td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1"><ProgressBar value={report.readiness} tone={readinessTone(report.readiness)} /></div>
                              <span className="theme-text w-10 text-right text-xs font-semibold">{report.readiness}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <StatusBadge tone={readinessTone(report.readiness)}>{displayReadinessLabel(report.readiness)}</StatusBadge>
                            <p className="theme-muted mt-2 text-xs">{displayReportStatus(report)}</p>
                          </td>
                          <td className="px-5 py-4 text-center align-top">
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleExportReport(report)}
                                disabled={!report.id || isExporting}
                                className={`theme-card theme-hover inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50 ${hasExportError ? "border-[#F04438]/30 text-[#B42318] dark:text-[#FDA29B]" : "theme-text"}`}
                                aria-label={t("exportAria", { title: displayReportTitle(report) })}
                                title={!report.id ? t("exportUnavailableNoId") : hasExportError ? displayExportStatus(exportStatus) : t("table.export")}
                              >
                                {isExporting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#465FFF]/30 border-t-[#465FFF]" /> : hasExportError ? <AlertCircle size={14} /> : <Download size={14} />}
                              </button>
                              {exportStatus ? (
                                <span className={`max-w-[96px] text-center text-[11px] font-medium leading-4 ${exportStatusTone(exportStatus)}`}>
                                  {displayExportStatus(exportStatus)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-[var(--border)] md:hidden">
                  {pageReports.map((report) => {
                    const exportStatus = report.id ? exportStatusByReport[report.id] : undefined;
                    const isExporting = exportStatus === "queued" || exportStatus === "running";
                    const hasExportError = exportStatus === "failed" || exportStatus === "storage_unavailable";

                    return (
                    <article key={report.id ?? report.title} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="theme-text line-clamp-2 text-sm font-medium leading-5">{displayReportTitle(report)}</p>
                          <p className="theme-muted mt-1 text-xs">{displayReportSections(report)}</p>
                        </div>
                        <StatusBadge tone={readinessTone(report.readiness)}>{report.readiness}%</StatusBadge>
                      </div>
                      <div className="mt-4"><ProgressBar value={report.readiness} tone={readinessTone(report.readiness)} /></div>
                      <p className="theme-muted mt-3 text-xs">{displayReportStatus(report)}</p>
                      <button
                        type="button"
                        onClick={() => void handleExportReport(report)}
                        disabled={!report.id || isExporting}
                        className={`theme-card theme-hover mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50 ${hasExportError ? "border-[#F04438]/30 text-[#B42318] dark:text-[#FDA29B]" : "theme-text"}`}
                        title={!report.id ? t("exportUnavailableNoId") : undefined}
                      >
                        {isExporting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#465FFF]/30 border-t-[#465FFF]" /> : hasExportError ? <AlertCircle size={14} /> : <Download size={14} />}
                        {t("table.export")}
                      </button>
                      {exportStatus ? <p className={`mt-2 text-xs font-medium ${exportStatusTone(exportStatus)}`}>{displayExportStatus(exportStatus)}</p> : null}
                    </article>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="theme-muted text-sm">
                    {firstRow}-{lastRow} {t("of")} {filteredReports.length} {t("rows")}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setPage(1)}
                      className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                      aria-label={t("firstPage")}
                    >
                      <ChevronsLeft size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                      aria-label={t("previousPage")}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="theme-muted px-2 text-sm">
                      {t("page")} <span className="theme-text font-medium">{safePage}</span> {t("of")} {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                      aria-label={t("nextPage")}
                    >
                      <ChevronRight size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => setPage(totalPages)}
                      className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                      aria-label={t("lastPage")}
                    >
                      <ChevronsRight size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <section className="theme-card rounded-xl border p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="theme-text text-lg font-semibold tracking-tight">{t("distributionTitle")}</h2>
                  <p className="theme-muted mt-1 text-sm">{t("distributionDesc")}</p>
                </div>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#465FFF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3B4DCD]"
                  type="button"
                  onClick={() => {
                    setPackagePrepared(true);
                    setFeedback({ tone: "success", title: t("packagePrepared"), description: t("packagePreparedDesc") });
                  }}
                >
                  <Send size={15} />
                  {packagePrepared ? t("packagePrepared") : t("preparePackage")}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  [FileText, t("package.pdf"), t("package.ready")],
                  [Mail, t("package.email"), t("package.drafted")],
                  [Archive, t("package.appendix"), t("package.attached")],
                  [CalendarDays, t("package.schedule"), t("package.scheduleTime")],
                ].map(([Icon, label, value]) => {
                  const ItemIcon = Icon as typeof FileText;

                  return (
                    <div key={String(label)} className="theme-subtle rounded-lg border border-[var(--border)] p-4">
                      <ItemIcon size={16} className="theme-accent" />
                      <p className="theme-text mt-3 text-sm font-medium">{String(label)}</p>
                      <p className="theme-muted mt-1 text-xs">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="theme-card rounded-xl border p-5">
              <h2 className="theme-text flex items-center gap-2 text-lg font-semibold tracking-tight">
                <CheckCircle2 size={18} className="text-[#12B76A]" />
                {t("exportReadiness")}
              </h2>
              <p className="theme-muted mt-2 text-sm leading-6">{t("exportReadinessDesc")}</p>
              <div className="mt-5 rounded-lg border border-[#465FFF33] bg-[#465FFF0F] p-4">
                <p className="theme-text text-sm font-medium">{t("backendContract")}</p>
                <p className="theme-muted mt-2 text-xs leading-5">{t("backendContractDesc")}</p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
