"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Download, FileText, RefreshCcw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { createReportExport, getReportById, getReportExportStatus, type ReportDetailSection } from "@/lib/api-service";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function textFromUnknown(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textFromUnknown).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = record.summary ?? record.text ?? record.content ?? record.description ?? record.title;
    if (preferred) return textFromUnknown(preferred);
    return Object.entries(record)
      .slice(0, 6)
      .map(([key, entry]) => `${key}: ${textFromUnknown(entry)}`)
      .filter((entry) => !entry.endsWith(": "))
      .join("\n");
  }
  return "";
}

function ReportSectionCard({ section, index }: { section: ReportDetailSection; index: number }) {
  const title = section.title || `Section ${index + 1}`;
  const body = textFromUnknown(section.summary ?? section.content ?? section.data);

  return (
    <section className="rounded-[16px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[12px] font-black text-[#465FFF]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{title}</h2>
          <p className={cn("mt-3 whitespace-pre-line text-[13px] font-semibold leading-6 text-[#53608C]", !body && "text-[#8A94B8]")}>
            {body || "-"}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const tr = useTranslations("Reports");
  const toast = useToast();
  const reportId = params.id;

  const reportQuery = useQuery({
    queryKey: ["report-detail", reportId],
    queryFn: () => getReportById(reportId),
    enabled: Boolean(reportId),
    staleTime: 30 * 1000,
  });

  const exportMutation = useMutation({
    mutationFn: ({ format }: { format: "json" | "pdf" }) => createReportExport(reportId, format),
    onSuccess: async (result) => {
      toast.success(tr("toast.exportStarted"));
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await getReportExportStatus(result.jobId);
        if (status.status === "completed" && status.signedUrl) {
          window.open(status.signedUrl, "_blank");
          toast.success(tr("toast.exportSuccess"));
          return;
        }
        if (status.status === "failed") {
          toast.error(tr("toast.exportFailed"));
          return;
        }
      }
      toast.info(tr("toast.exportProcessing"));
    },
    onError: () => toast.error(tr("toast.exportInitFailed")),
  });

  if (reportQuery.isPending) {
    return <PanelSkeleton className="min-h-[520px]" />;
  }

  if (!reportQuery.data) {
    return <DashboardErrorState title={tr("detail.unavailableTitle")} description={tr("detail.unavailableDesc")} onRetry={() => void reportQuery.refetch()} />;
  }

  const report = reportQuery.data;
  const sections = Array.isArray(report.sections) ? report.sections : [];

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      <header className="rounded-[18px] border border-[#DDE3EF] bg-white p-5 shadow-[0_2px_14px_rgba(16,24,40,0.04)]">
        <Link href="/reports" className="inline-flex items-center gap-2 text-[12px] font-black text-[#58648C] transition hover:text-[#465FFF]">
          <ArrowLeft size={15} /> {tr("detail.back")}
        </Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#465FFF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#465FFF]">
              <Sparkles size={13} /> {tr("detail.liveReport")}
            </div>
            <h1 className="text-[30px] font-black leading-tight tracking-[-0.045em] text-[#060A23]">{report.title}</h1>
            <p className="mt-3 max-w-[760px] text-[13px] font-semibold leading-6 text-[#68739F]">{textFromUnknown(report.summary) || tr("detail.defaultSummary")}</p>
          </div>
          <button
            type="button"
            onClick={() => exportMutation.mutate({ format: "pdf" })}
            disabled={exportMutation.isPending}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[9px] bg-[#465FFF] px-4 text-[12px] font-black text-white shadow-[0_10px_22px_rgba(70,95,255,0.20)] transition hover:bg-[#3B20EA] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportMutation.isPending ? <RefreshCcw size={15} className="animate-spin" /> : <Download size={15} />}
            {tr("preview.downloadPdf")}
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-[#E6EAF2] bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">{tr("detail.reportId")}</p>
          <p className="mt-2 truncate text-[13px] font-black text-[#101334]" title={report.id}>{report.id}</p>
        </div>
        <div className="rounded-[14px] border border-[#E6EAF2] bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">{tr("detail.createdAt")}</p>
          <p className="mt-2 text-[13px] font-black text-[#101334]">{formatDate(report.createdAt)}</p>
        </div>
        <div className="rounded-[14px] border border-[#E6EAF2] bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">{tr("detail.sections")}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-[13px] font-black text-[#101334]"><FileText size={15} /> {sections.length}</p>
        </div>
      </div>

      {sections.length > 0 ? (
        <div className="grid gap-4">
          {sections.map((section, index) => <ReportSectionCard key={section.id ?? `${section.title}-${index}`} section={section} index={index} />)}
        </div>
      ) : (
        <section className="flex min-h-[260px] flex-col items-center justify-center rounded-[16px] border border-dashed border-[#DDE3EF] bg-white p-8 text-center">
          <CalendarClock size={28} className="text-[#8A94B8]" />
          <h2 className="mt-4 text-[17px] font-black text-[#101334]">{tr("detail.emptySectionsTitle")}</h2>
          <p className="mt-2 max-w-[460px] text-[13px] font-semibold leading-6 text-[#68739F]">{tr("detail.emptySectionsDesc")}</p>
        </section>
      )}
    </div>
  );
}
