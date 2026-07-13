"use client";

import Image from "next/image";
import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Trash2,
  Edit2,
  SlidersHorizontal,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton, formatPaginationSummary } from "@/components/dashboard/dashboard-states";
import { getReports, getReportTemplates, createReportTemplate, updateReportTemplate, deleteReportTemplate, getReportsAnalytics, createReportExport, getReportExportStatus, getNarratives, getDashboardSummary, getReportSchedules, createReportSchedule, updateReportSchedule, deleteReportSchedule, toggleReportSchedule, generateReportFromTemplate, sendReportEmail, sendTestScheduleEmail, type PaginationInfo, type ReportRecord, type ReportsAnalyticsResponse, type NarrativeRecord, type DashboardSummary, type ReportTemplate, type ReportScheduleRecord } from "@/lib/api-service";
import { isDemoMode, getMockReports } from "@/lib/demo-mock-data";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type ReportStatus = "READY" | "REVIEW" | "DRAFT" | "SCHEDULED" | "ARCHIVED";

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
  text: string;
  border: string;
};

const aiAgentImage = "/mainapp/reports-ai-agent.png";

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#465FFF]", border: "border-[#465FFF]/15" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#8B5CFF]", border: "border-[#8B5CFF]/15" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/15" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/15" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/15" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

type ReportRow = {
  id: number | string;
  title: string;
  description: string;
  type: string;
  period: string;
  status: ReportStatus;
  progress: number | null;
  created: string;
  createdTime: string;
  tone: Tone;
};

const reportsApiLimit = 10;

const quickActions = [
  { key: "shareStakeholder", descKey: "shareDesc", icon: Share2, color: "text-[#465FFF] bg-[#465FFF]/10" },
  { key: "scheduleReport", descKey: "scheduleDesc", icon: CalendarClock, color: "text-[#10B981] bg-[#10B981]/10" },
  { key: "customReport", descKey: "customDesc", icon: Plus, color: "text-[#8B5CFF] bg-[#8B5CFF]/10" },
  { key: "viewHistory", descKey: "historyDesc", icon: Clock, color: "text-[#F59E0B] bg-[#F59E0B]/10" },
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

function buildApiReportRows(
  reports: ReportRecord[],
  fallbacks: { description: string; type: string; period: string; created: string },
): ReportRow[] {
  return reports.map((report) => {
    const status = statusFromApi(report.status);
    return {
      id: report.id,
      title: report.title,
      description: report.sections || fallbacks.description,
      type: fallbacks.type,
      period: fallbacks.period,
      status,
      progress: report.readiness,
      created: fallbacks.created,
      createdTime: "API",
      tone: toneFromStatus(status),
    };
  });
}

function Panel({ children, className, ...props }: ComponentPropsWithoutRef<"section"> & { children: ReactNode }) {
  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)} {...props}>
      {children}
    </section>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  const isTrend = helper.startsWith("▲") || helper.startsWith("▼");

  return (
    <Panel className="flex min-h-[88px] items-center gap-3.5 p-4">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-[0_10px_26px_rgba(70,95,255,0.05)]", style.soft, style.text, style.border)}>
        <Icon size={19} strokeWidth={2.35} />
      </span>
      <div className="min-w-0">
        <span className="block text-[10px] font-extrabold text-[#68739F]">{label}</span>
        <span className="mt-0.5 block text-[24px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</span>
        <span className={cn("mt-1.5 flex items-center gap-1 text-[10px] font-black", isTrend ? "text-[#10B981]" : "text-[#58648C]")}>
          {isTrend && <span className="h-1 w-1 rounded-full bg-[#10B981]" />}
          {helper}
        </span>
      </div>
    </Panel>
  );
}

function SentimentChart({ dashboard }: { dashboard?: DashboardSummary | null }) {
  const tr = useTranslations("Reports");
  
  // Straight flat lines for empty state instead of fake curves
  let posPath = "M 10 70 L 150 70";
  let neuPath = "M 10 70 L 150 70";
  let negPath = "M 10 70 L 150 70";
  let posEnd = 70, neuEnd = 70, negEnd = 70;
  
  const labels = ["-", "-", "-", "-"];

  if (dashboard?.trends && dashboard.trends.length > 0) {
    const totalPos = dashboard.sentiment_distribution.positive || 1;
    const totalNeu = dashboard.sentiment_distribution.neutral || 1;
    const totalNeg = dashboard.sentiment_distribution.negative || 1;
    const total = totalPos + totalNeu + totalNeg || 1;
    
    // Use last 4 points max
    const points = dashboard.trends.slice(-4);
    if (points.length > 1) {
      const maxVal = Math.max(...points.map(t => t.count), 1);
      const w = 140, h = 80;
      
      // Calculate variance and scale lines
      const generatePath = (ratio: number, offset: number) => {
         const mapped = points.map((p, i) => {
           const x = 10 + (i * (w / Math.max(1, points.length - 1)));
           const scaled = Math.min(1, Math.max(0.1, ((p.count / maxVal) * ratio) + offset));
           const y = h - 10 - (scaled * (h - 20));
           return { x, y };
         });
         
         const pathStr = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
         return { path: pathStr, endY: mapped[mapped.length - 1].y, endX: mapped[mapped.length - 1].x };
      };
      
      const pos = generatePath(totalPos / total, 0.4);
      const neu = generatePath(totalNeu / total, 0.2);
      const neg = generatePath(totalNeg / total, 0.6);
      
      posPath = pos.path; posEnd = pos.endY;
      neuPath = neu.path; neuEnd = neu.endY;
      negPath = neg.path; negEnd = neg.endY;
      
      labels.length = 0;
      points.forEach(p => {
        labels.push(new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }));
      });
      while (labels.length < 4) labels.unshift("");
    }
  }

  return (
    <div className="flex flex-col justify-between h-full min-h-[160px] border-l border-[#D8DEEF] pl-5">
      <h4 className="text-[11px] font-extrabold text-[#101334]">{tr("sentimentChart.title")}</h4>
      
      <div className="relative flex-1 mt-2 min-h-[90px]">
        {/* Y Axis Grid/Labels */}
        <div className="absolute inset-0 flex flex-col justify-between text-[8px] font-bold text-[#8B95B8] pointer-events-none">
          <div className="flex items-center justify-between border-b border-dashed border-[#EDF1F7] pb-1">
            <span>100%</span>
            <span className="w-full border-t border-dashed border-[#EDF1F7] mx-2" />
          </div>
          <div className="flex items-center justify-between border-b border-dashed border-[#EDF1F7] py-1">
            <span>50%</span>
            <span className="w-full border-t border-dashed border-[#EDF1F7] mx-2" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span>0%</span>
            <span className="w-full border-t border-dashed border-[#EDF1F7] mx-2" />
          </div>
        </div>

        {/* SVG Lines */}
        <svg className="chart-enter chart-line-draw absolute inset-0 w-full h-full" viewBox="0 0 160 80" preserveAspectRatio="none">
          {/* Positif (Green) */}
          <path d={posPath} fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="150" cy={posEnd} r="3" fill="#10B981" />

          {/* Netral (Blue) */}
          <path d={neuPath} fill="none" stroke="#465FFF" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="150" cy={neuEnd} r="3" fill="#465FFF" />

          {/* Negatif (Red) */}
          <path d={negPath} fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="150" cy={negEnd} r="3" fill="#EF4444" />
        </svg>
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between text-[8px] font-bold text-[#8B95B8] mt-1.5">
        {labels.map((label, i) => <span key={i}>{label}</span>)}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[8.5px] font-black text-[#58648C] mt-2">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />{tr("sentimentChart.positive")}</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#465FFF]" />{tr("sentimentChart.neutral")}</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />{tr("sentimentChart.negative")}</span>
      </div>
    </div>
  );
}

function ReportAgentImage() {
  const tr = useTranslations("Reports");
  return (
    <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#465FFF]/10 bg-linear-to-b from-[#EEF0FF] via-white to-[#F1EEFF] shadow-[inset_0_0_24px_rgba(70,95,255,0.10)]">
      <Image
        src={aiAgentImage}
        alt={tr("preview.imageAlt")}
        width={96}
        height={96}
        sizes="96px"
        unoptimized
        className="relative h-full w-full object-cover"
        style={{ transform: "scale(1.35)" }}
      />
    </div>
  );
}

function AIReportSummary({ narratives, dashboard }: { narratives?: NarrativeRecord[] | null, dashboard?: DashboardSummary | null }) {
  const tr = useTranslations("Reports");
  
  let insightText = tr("aiSummaryDynamic.emptyInsight");
  let riskText = tr("aiSummaryDynamic.emptyRisk");
  let movementText = tr("aiSummaryDynamic.emptyMovement");
  let recommendationText = tr("aiSummaryDynamic.emptyRec");
  let bodyText = tr("aiSummaryDynamic.emptyBody");

  if (narratives && narratives.length > 0) {
    const top = narratives[0];
    const negative = narratives.filter(n => n.sentiment === "negative" || n.sentiment === "negatif")[0];
    const sortedGrowth = [...narratives].sort((a,b) => parseFloat(b.velocity) - parseFloat(a.velocity));
    const fastest = sortedGrowth[0];

    insightText = tr("aiSummaryDynamic.insightText", { title: top.title, count: top.signalCount.toLocaleString() });
    riskText = negative ? tr("aiSummaryDynamic.riskText", { title: negative.title }) : tr("aiSummaryDynamic.noRiskText");
    movementText = tr("aiSummaryDynamic.movementText", { title: fastest.title, velocity: fastest.velocity });
    recommendationText = tr("aiSummaryDynamic.recommendationText", { rec: top.recommendedFocus || "-" });
    bodyText = tr("aiSummaryDynamic.body", { title: top.title, otherCount: Math.max(0, narratives.length - 1) });
  }

  return (
    <Panel className="p-5">
      <div className="grid gap-5 md:grid-cols-[1fr_190px] lg:grid-cols-[96px_1fr_214px]">
        <div className="flex justify-center md:justify-start">
          <ReportAgentImage />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{tr("aiSummary.title")}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#8B5CFF]">
              <Sparkles size={12} /> {tr("aiSummary.generated")}
            </span>
          </div>
          <p className="mt-3 max-w-[660px] text-[13.5px] font-black leading-relaxed text-[#101334]">
            {bodyText}
          </p>
          <div className="mt-5 grid gap-x-4 gap-y-3 lg:grid-cols-4">
            <SummaryPoint color="#465FFF" title={tr("aiSummary.insightTitle")} text={insightText} />
            <SummaryPoint color="#EF4444" title={tr("aiSummary.riskTitle")} text={riskText} />
            <SummaryPoint color="#F59E0B" title={tr("aiSummary.movementTitle")} text={movementText} />
            <SummaryPoint color="#10B981" title={tr("aiSummary.recommendationTitle")} text={recommendationText} />
          </div>
        </div>
        <div className="w-full pt-4 border-t md:pt-0 md:border-t-0">
          <SentimentChart dashboard={dashboard} />
        </div>
      </div>
    </Panel>
  );
}

function SummaryPoint({ color, title, text }: { color: string; title: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="text-[11px] font-black text-[#101334]">{title}</p>
        <p className="mt-1 text-[11px] font-bold leading-normal text-[#58648C]">{text}</p>
      </div>
    </div>
  );
}

function ReportPreviewSidebar({ latestReport, onExportPdf, isPending }: { latestReport: ReportRecord | null | undefined; onExportPdf?: () => void; isPending?: boolean }) {
  const tr = useTranslations("Reports");

  const reportTitle = latestReport?.title || tr("preview.executiveBrief");
  const reportStatus = latestReport ? statusFromApi(latestReport.status) : null;
  const reportSections = latestReport?.sections
    ? latestReport.sections.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <Panel className="p-4">
      <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{tr("preview.title")}</h3>
      <p className="mt-1 text-[11.5px] font-bold text-[#68739F]">{tr("preview.desc")}</p>
      
      {isPending ? (
        <div className="mt-4 flex h-[200px] items-center justify-center">
          <RefreshCcw className="animate-spin text-[#8A94B8]" size={20} />
        </div>
      ) : latestReport ? (
        <>
          <div className="mt-4 rounded-[12px] border border-[#DDE3EF] bg-[#F8FAFF] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#465FFF]/10 text-[#465FFF]"><FileText size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-[#101334]">{reportTitle}</p>
                <p className="mt-0.5 text-[10px] font-bold text-[#68739F]">{tr("preview.latestReport")}</p>
              </div>
              {reportStatus && <StatusBadge status={reportStatus} />}
            </div>

            {reportSections.length > 0 ? (
              <div className="mt-4 grid grid-cols-[82px_1fr] gap-4">
                <div className="relative h-[108px] w-[82px] shrink-0 select-none overflow-hidden rounded-[6px] border border-[#E6EAF2] bg-white p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-1 border-b border-[#EDF1F7] pb-1">
                    <span className="h-2 w-2 rounded-full bg-[#465FFF]" />
                    <span className="h-1 w-8 rounded-full bg-[#D8DEEF]" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 py-2">
                    <span className="h-10 rounded-[4px] bg-[#EEF0FF]" />
                    <span className="space-y-1.5">
                      <span className="block h-1 w-full rounded-full bg-[#D8DEEF]" />
                      <span className="block h-1 w-5/6 rounded-full bg-[#EDF1F7]" />
                      <span className="block h-1 w-4/6 rounded-full bg-[#EDF1F7]" />
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="block h-1 w-full rounded-full bg-[#EDF1F7]" />
                    <span className="block h-1 w-5/6 rounded-full bg-[#EDF1F7]" />
                  </div>
                </div>

                <div className="min-w-0 space-y-2.5 self-center">
                  {reportSections.slice(0, 4).map((section) => (
                    <div key={section} className="flex items-center justify-between gap-2 text-[9.5px] font-black text-[#31406B]">
                      <span className="flex min-w-0 items-center gap-2"><CheckCircle2 size={13} className="shrink-0 text-[#10B981]" /> <span className="truncate">{section}</span></span>
                      <span className="text-[#10B981]">{tr("preview.ready")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[10px] font-bold text-[#8A94B8]">{tr("preview.noSections")}</div>
            )}
          </div>

          <div className="mt-4 grid gap-2.5">
            <Link href={`/reports/${latestReport.id}`} className="flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-[#465FFF] text-[12px] font-black text-white shadow-[0_8px_20px_rgba(70,95,255,0.18)] transition hover:bg-[#3B20EA]">
              <Eye size={15} /> {tr("preview.viewPreview")}
            </Link>
            <button type="button" onClick={onExportPdf} className="flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-[#E6EAF2] bg-white text-[12px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
              <Download size={15} /> {tr("preview.downloadPdf")}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-[80px] w-full items-center justify-center rounded-[12px] bg-[#F5F7FC]">
            <FileText size={28} className="text-[#DDE3EF]" />
          </div>
          <p className="text-[12px] font-bold text-[#53608C]">{tr("preview.emptyTitle")}</p>
          <p className="mt-1 text-[10px] font-bold text-[#8A94B8]">{tr("preview.emptyDesc")}</p>
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
      <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{tr("quickActions.title")}</h3>
      <div className="mt-4 space-y-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              onClick={actionHandlers[action.key]}
              className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 text-left transition hover:border-[#DDE3EF] hover:bg-[#F8FAFF]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]", action.color)}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-[12px] font-black text-[#101334]">{tr(`quickActions.${action.key}`)}</span>
                  <span className="mt-0.5 block truncate text-[9.5px] font-bold text-[#58648C]">{tr(`quickActions.${action.descKey}`)}</span>
                </div>
              </div>
              <ArrowRight size={13} className="text-[#8B95B8] shrink-0" />
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
    READY: "bg-[#10B981]/10 text-[#10B981]",
    REVIEW: "bg-[#F59E0B]/10 text-[#F59E0B]",
    DRAFT: "bg-[#8B5CFF]/10 text-[#8B5CFF]",
    SCHEDULED: "bg-[#465FFF]/10 text-[#465FFF]",
    ARCHIVED: "bg-slate-100 text-slate-600",
  };
  return <span className={cn("rounded-[7px] px-2 py-0.5 text-[9.5px] font-black tracking-[0.05em]", styles[status])}>{tr(`statusBadge.${status}`)}</span>;
}

function ProgressBar({ value, tone }: { value: number; tone: Tone }) {
  const barColors: Record<Tone, string> = {
    blue: "bg-[#465FFF]",
    purple: "bg-[#8B5CFF]",
    green: "bg-[#10B981]",
    red: "bg-[#EF4444]",
    amber: "bg-[#F59E0B]",
    slate: "bg-[#64748B]",
  };
  return (
    <div className="h-1.5 w-[80px] rounded-full bg-[#EDF1F7] overflow-hidden shrink-0">
      <div className={cn("h-full rounded-full", barColors[tone])} style={{ width: `${value}%` }} />
    </div>
  );
}

function ReportsTable({ rows, footerText, pagination, onPageChange, isFetching, onExport }: { rows: ReportRow[]; footerText: string; pagination?: PaginationInfo | null; onPageChange: (page: number) => void; isFetching?: boolean; onExport: (reportId: string) => void }) {
  const tr = useTranslations("Reports");
  type TabValue = "all" | ReportStatus;
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
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
    .filter((report) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return [report.title, report.description, report.type, report.period, report.created].some((value) => value.toLowerCase().includes(term));
    });
  const visibleRows = sortDirection === "desc" ? filteredRows : [...filteredRows].reverse();
  const hasLocalFilters = activeTab !== "all" || searchTerm.trim().length > 0;

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{tr("table.title")}</h2>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("table.desc")}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="relative block w-full sm:w-[180px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8B95B8]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={tr("filter.search")}
              className="h-8 w-full rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] pl-8 pr-3 text-[10px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white"
            />
          </label>
          <button type="button" onClick={() => { setActiveTab("all"); setSearchTerm(""); }} disabled={!hasLocalFilters} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-2.5 text-[10px] font-black text-[#58648C] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none">
            <SlidersHorizontal size={12} /> {hasLocalFilters ? tr("clear") : tr("filter.title")}
          </button>
          <button type="button" onClick={() => setSortDirection((value) => value === "desc" ? "asc" : "desc")} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-2.5 text-[10px] font-black text-[#58648C] transition hover:bg-white sm:flex-none">
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
                ? "bg-[#465FFF] text-white shadow-[0_4px_12px_rgba(70,95,255,0.18)]"
                : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#58648C] hover:bg-white"
            )}
          >
            {tr(`filter.${tab.key}`)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[9.5px] font-black uppercase tracking-[0.15em] text-[#68739F]">
              <th className="px-3 py-3 w-[280px]">{tr("table.report")}</th>
              <th className="px-3 py-3">{tr("table.type")}</th>
              <th className="px-3 py-3">{tr("table.period")}</th>
              <th className="px-3 py-3">{tr("table.status")}</th>
              <th className="px-3 py-3">{tr("table.progress")}</th>
              <th className="px-3 py-3">{tr("table.created")}</th>
              <th className="px-3 py-3 text-right">{tr("table.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7]">
            {visibleRows.length > 0 ? visibleRows.map((report) => (
              <tr key={report.id} className="transition hover:bg-[#F8FAFF]">
                <td className="px-3 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">
                      <FileText size={17} strokeWidth={2.3} />
                    </span>
                    <div className="min-w-0">
                      <Link href={`/reports/${report.id}`} className="text-[12.5px] font-black leading-snug text-[#101334] hover:text-[#465FFF] transition-colors">
                        {report.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] font-bold leading-snug text-[#68739F]">{report.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-black text-[#31406B]">{report.type}</td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-bold text-[#68739F]">{report.period}</td>
                <td className="px-3 py-3.5 align-middle"><StatusBadge status={report.status} /></td>
                <td className="px-3 py-3.5 align-middle">
                  {report.progress !== null ? (
                    <div className="flex items-center gap-2">
                      <ProgressBar value={report.progress} tone={report.tone} />
                      <span className="text-[10px] font-black text-[#31406B]">{report.progress}%</span>
                    </div>
                  ) : (
                    <span className="text-[#8B95B8] text-[11px]">-</span>
                  )}
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <span className="block text-[11px] font-black text-[#31406B]">{report.created}</span>
                  <span className="mt-0.5 block text-[9.5px] font-bold text-[#8B95B8]">{report.createdTime}</span>
                </td>
                <td className="px-3 py-3.5 text-right align-middle">
                  <button type="button" onClick={() => onExport(String(report.id))} disabled={isFetching} className="inline-flex items-center gap-1.5 rounded-md border border-[#DDE3EF] bg-white px-2 py-1.5 text-[10px] font-black text-[#68739F] transition hover:bg-[#EEF2FF] hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-50" aria-label={tr("exportAria", { title: report.title })}>
                    <Download size={13} /> {tr("downloadReady")}
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center">
                  <p className="text-[13px] font-black text-[#101334]">{tr("noMatch")}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("noMatchDesc")}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row">
        <p className="text-[11px] font-bold text-[#68739F]">{footerText}</p>
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
      <h3 className="text-[15px] font-black text-[#101334]">{tr("formatDonut.title")}</h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("formatDonut.desc")}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-[136px_1fr] md:grid-cols-1 xl:grid-cols-[136px_1fr]">
        {hasData ? (
          <>
            <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full" style={{ background: gradient }}>
              <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
              <span className="relative text-center">
                <b className="block text-[22px] font-black text-[#101334]">{totalForPercent}</b>
                <span className="text-[10px] font-bold text-[#68739F]">{tr("formatDonut.total")}</span>
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
                    <span className="text-[#68739F]">{num} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center sm:col-span-2 xl:col-span-2">
            <div className="relative mx-auto mb-4 flex h-[136px] w-[136px] items-center justify-center rounded-full bg-[#F5F7FC]">
              <FileText size={32} className="text-[#DDE3EF]" />
            </div>
            <p className="text-[13px] font-bold text-[#53608C]">{tr("formatDonut.noData")}</p>
            <p className="mt-1 text-[11px] font-bold text-[#8A94B8]">{tr("formatDonut.noDataDesc")}</p>
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
  const hasData = series.length > 0 && series.some((v) => v > 0);

  const width = 520;
  const height = 170;
  const padding = 14;
  const chartHeight = height - padding * 2 - 20;

  // Dynamic Y-axis
  const max = hasData ? Math.max(...series) : 1;
  const yMax = Math.ceil(max / 5) * 5 || 5;
  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];
  const yPositions = yTicks.map((tick) => padding + (1 - tick / yMax) * chartHeight);

  // Build path
  const path = hasData ? series.map((value, index) => {
    const x = padding + (index / (series.length - 1)) * (width - padding * 2);
    const y = padding + (1 - value / yMax) * chartHeight;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") : "";

  const area = path ? `${path} L ${width - padding} ${height - 22} L ${padding} ${height - 22} Z` : "";

  // Peak position
  const peakIndex = hasData ? series.indexOf(max) : -1;
  const peakDate = peakIndex >= 0 ? formatChartDate(data[peakIndex].date) : "";
  const peakX = peakIndex >= 0 ? padding + (peakIndex / (series.length - 1)) * (width - padding * 2) : 0;
  const peakXPct = ((peakX / width) * 100).toFixed(1);

  // X-axis labels (up to 5 evenly spaced)
  const xLabels = data.length > 0
    ? [0, Math.floor((data.length - 1) / 4), Math.floor((data.length - 1) / 2), Math.floor(((data.length - 1) * 3) / 4), data.length - 1]
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .map((index) => ({ label: formatChartDate(data[index].date), index }))
    : [];

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">{tr("timeline.title")} <span className="text-[11px] font-bold text-[#68739F]">{tr("timeline.period")}</span></h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("timeline.desc")}</p>

      {hasData ? (
        <div className="relative mt-5 h-[190px] rounded-[12px] bg-linear-to-b from-white to-[#F8FAFF]">
          {/* Y Axis */}
          <div className="absolute left-0 top-0 bottom-[22px] flex w-[38px] flex-col justify-between py-1 text-right text-[9px] font-bold text-[#8B95B8] pointer-events-none">
            {yTicks.slice().reverse().map((tick) => <span key={tick}>{tick}</span>)}
          </div>

          {/* Chart plot */}
          <div className="absolute inset-0 left-[40px] bottom-[22px] overflow-hidden">
            <svg className="chart-enter chart-line-draw h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="reports-timeline-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#465FFF" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Dynamic Gridlines */}
              {yPositions.slice(1).map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} stroke="#EDF1F7" strokeWidth="1" />)}
              {area ? <path d={area} fill="url(#reports-timeline-grad)" /> : null}
              {path ? <path d={path} fill="none" stroke="#465FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" vectorEffect="non-scaling-stroke" /> : null}
            </svg>

            {/* Peak tooltip */}
            {peakIndex >= 0 ? (
              <div className="absolute top-[12px] flex flex-col items-center" style={{ left: `${peakXPct}%`, transform: "translateX(-50%)" }}>
                <span className="rounded-[8px] bg-[#101334] px-2.5 py-1.5 text-center shadow-lg whitespace-nowrap">
                  <b className="block text-[8px] font-black text-white">{peakDate}</b>
                  <span className="text-[9.5px] font-black text-white">{tr("timeline.peak", { count: max })}</span>
                </span>
                <span className="h-8 border-l border-dashed border-[#8B95B8]" />
                <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#465FFF] ring-4 ring-[#465FFF]/15" />
              </div>
            ) : null}
          </div>

          {/* X Axis Labels */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between pl-[40px] text-[9px] font-bold text-[#68739F]">
            {xLabels.map((item) => <span key={item.index}>{item.label}</span>)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 flex h-[100px] w-full max-w-[300px] items-center justify-center rounded-[12px] bg-[#F5F7FC]">
            <RefreshCcw size={28} className="text-[#DDE3EF]" />
          </div>
          <p className="text-[13px] font-bold text-[#53608C]">{tr("timeline.noData")}</p>
          <p className="mt-1 text-[11px] font-bold text-[#8A94B8]">{tr("timeline.noDataDesc")}</p>
        </div>
      )}
    </Panel>
  );
}

function PopularReports({ reports, onViewAll }: { reports: PopularReportItem[]; onViewAll: () => void }) {
  const tr = useTranslations("Reports");
  return (
    <Panel className="p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-[15px] font-black text-[#101334]">{tr("popular.title")}</h3>
        <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("popular.desc")}</p>
        
        <div className="mt-5 space-y-3">
          {reports.length > 0 ? reports.slice(0, 5).map((report, idx) => (
            <div key={report.title} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[11px] font-black text-[#465FFF]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-black text-[#101334]">{report.title}</span>
              </div>
              <span className="text-[11px] font-bold text-[#68739F] shrink-0">{report.views}</span>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText size={24} className="text-[#DDE3EF] mb-2" />
              <p className="text-[11px] font-bold text-[#8A94B8]">{tr("popular.noData")}</p>
            </div>
          )}
        </div>
      </div>

      {reports.length > 0 ? (
        <div className="mt-6 border-t border-[#EDF1F7] pt-4">
          <button type="button" onClick={onViewAll} className="flex w-full items-center justify-between text-[11px] font-black text-[#465FFF] hover:text-[#3B20EA] transition-colors">
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
  const toastHook = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Demo mode state
  const [demoMode, setDemoMode] = useState(false);
  const [hasCheckedDemoMode, setHasCheckedDemoMode] = useState(false);

  // Check demo mode on mount
  useEffect(() => {
    setDemoMode(isDemoMode());
    setHasCheckedDemoMode(true);
  }, []);

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
  const reportsQuery = useQuery({
    queryKey: ["reports", { page, limit: reportsApiLimit, demoMode }],
    queryFn: () => demoMode
      ? Promise.resolve(getMockReports())
      : getReports({ page, limit: reportsApiLimit }),
    staleTime: 30 * 1000,
    enabled: hasCheckedDemoMode,
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
    ? buildApiReportRows(reportsQuery.data.data, {
        description: tr("preview.liveFallback"),
        type: tr("preview.liveType"),
        period: tr("preview.activePeriod"),
        created: tr("preview.liveCreated"),
      })
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
    ? formatPaginationSummary(reportsQuery.data.pagination, tr("paginationExtended.labelLive"))
    : isLiveUnavailable
      ? tr("liveData.fallback")
      : tr("paginationExtended.sampleSummary");

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {demoMode && (
        <div className="flex items-center justify-center gap-2 rounded-[10px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-4 py-3">
          <Sparkles size={16} className="text-[#8B5CFF]" />
          <p className="text-[13px] font-bold text-[#8B5CFF]">
            Demo Mode — Showing sample data for demonstration purposes
          </p>
        </div>
      )}
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("pages.reports.title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("pages.reports.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setIsTemplatesModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:bg-[#F8FAFF] sm:w-auto">
            <FileText size={14} /> {tr("buttons.manageTemplates")}
          </button>
          <button type="button" onClick={() => setIsScheduleModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:bg-[#F8FAFF] sm:w-auto">
            <CalendarClock size={14} /> {tr("buttons.scheduleSettings")}
          </button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:opacity-90 sm:w-auto">
            <Plus size={15} /> {tr("buttons.createNew")}
          </button>
        </div>
      </header>

      {/* AI Summary and Preview */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <AIReportSummary narratives={narrativesQuery.data?.data} dashboard={dashboardQuery.data} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <ReportsTable rows={rows} footerText={footerText} pagination={reportsQuery.data?.pagination} onPageChange={setPage} isFetching={reportsQuery.isFetching || exportMutation.isPending} onExport={(reportId) => exportMutation.mutate({ reportId, format: "pdf" })} />
            </>
          )}
        </div>
        <div className="space-y-4">
          <ReportPreviewSidebar latestReport={reportsQuery.data?.data?.[0]} onExportPdf={() => { const firstRow = rows[0]; if (firstRow) exportMutation.mutate({ reportId: String(firstRow.id), format: "pdf" }); }} isPending={reportsQuery.isPending} />
          <QuickActions
            onShare={() => setIsShareModalOpen(true)}
            onSchedule={() => setIsScheduleModalOpen(true)}
            onCreate={() => setIsCreateModalOpen(true)}
            onViewHistory={() => router.push("/workspace/activity")}
          />
        </div>
      </div>

      {/* Bottom Distribution charts */}
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.15fr_0.9fr]">
        <FormatDonut distribution={liveFormatDistribution} />
        <TimelineChart data={liveTrendTimeline} />
            <PopularReports reports={livePopularReports} onViewAll={() => setIsPopularModalOpen(true)} />
        </div>

      {/* Schedule Settings Modal */}
      {mounted && isScheduleModalOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => { setIsScheduleModalOpen(false); setIsScheduleFormOpen(false); }}>
          <Panel role="dialog" aria-modal="true" aria-labelledby="reports-schedule-dialog-title" tabIndex={-1} className="flex w-full max-w-2xl flex-col max-h-[85vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div className="flex items-center gap-3">
                <h2 id="reports-schedule-dialog-title" className="text-lg font-black text-[#101334]">{tr("scheduleModal.title")}</h2>
                {!isScheduleFormOpen && (
                  <button type="button" onClick={() => { setEditingSchedule(null); setIsScheduleFormOpen(true); }} className="flex h-7 items-center justify-center gap-1.5 rounded-[6px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-2.5 text-[10px] font-black text-white shadow-sm transition hover:opacity-90">
                    <Plus size={12} /> {tr("scheduleModal.addSchedule")}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => { setIsScheduleModalOpen(false); setIsScheduleFormOpen(false); }} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
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
                      <Mail size={14} className="text-[#465FFF]" />
                      <span className="text-[11px] font-black text-[#31406B]">{tr("scheduleModal.recipientsLabel")}</span>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#8A94B8]">{tr("scheduleModal.toLabel")}</label>
                      <input name="recipients" defaultValue={editingSchedule?.recipients?.join(", ") || ""} placeholder="email@example.com, email2@example.com" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-[#8A94B8]">{tr("scheduleModal.ccLabel")}</label>
                        <input name="ccRecipients" defaultValue={editingSchedule?.ccRecipients?.join(", ") || ""} placeholder="cc@example.com" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-[#8A94B8]">{tr("scheduleModal.bccLabel")}</label>
                        <input name="bccRecipients" defaultValue={editingSchedule?.bccRecipients?.join(", ") || ""} placeholder="bcc@example.com" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                      </div>
                    </div>
                  </div>
                  {editingSchedule?.id && (
                    <div className="rounded-[8px] border border-[#10B981]/20 bg-[#10B981]/5 p-3">
                      <button
                        type="button"
                        onClick={() => sendTestEmailMutation.mutate(editingSchedule.id!)}
                        disabled={sendTestEmailMutation.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-white px-4 py-2 text-[11px] font-black text-[#10B981] border border-[#10B981]/30 transition hover:bg-[#10B981]/10 disabled:opacity-50"
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
                    <button type="submit" disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50">
                      {(createScheduleMutation.isPending || updateScheduleMutation.isPending) ? tr("scheduleModal.saving") : tr("scheduleModal.save")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-3">
                  {schedulesQuery.isPending ? (
                    <div className="flex h-40 items-center justify-center">
                      <RefreshCcw className="animate-spin text-[#8A94B8]" size={24} />
                    </div>
                  ) : schedulesQuery.data && schedulesQuery.data.data.length > 0 ? (
                    schedulesQuery.data.data.map((schedule) => (
                      <div key={schedule.id} className="rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-[#DCE2F0] hover:bg-white transition shadow-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-[#101334] text-[13px] truncate">{schedule.name}</h3>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black", schedule.enabled ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#EF4444]/10 text-[#EF4444]")}>
                              {schedule.enabled ? tr("scheduleModal.enabled") : tr("scheduleModal.disabled")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#465FFF]/10 text-[#465FFF] px-2.5 py-1.5 rounded-[6px] font-black uppercase tracking-[0.05em]">
                              <CalendarClock size={11} /> {tr(`scheduleModal.${schedule.cadence}`)}
                            </span>
                            {schedule.dayOfWeek && (
                              <span className="flex items-center gap-1.5 text-[9.5px] bg-[#8B5CFF]/10 text-[#8B5CFF] px-2.5 py-1.5 rounded-[6px] font-black">
                                {tr(`scheduleModal.${schedule.dayOfWeek}`)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-1.5 rounded-[6px] font-black">
                              {schedule.timeOfDay}
                            </span>
                            {schedule.timezone && (
                              <span className="flex items-center gap-1.5 text-[9.5px] bg-[#64748B]/10 text-[#64748B] px-2.5 py-1.5 rounded-[6px] font-black">
                                <Clock size={11} /> {schedule.timezone.split("/").pop()?.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          {/* Recipients display */}
                          {schedule.recipients && schedule.recipients.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Mail size={11} className="text-[#8B95B8] shrink-0" />
                              <span className="text-[9.5px] font-bold text-[#8A94B8] truncate">
                                {schedule.recipients.slice(0, 2).join(", ")}
                                {schedule.recipients.length > 2 && ` +${schedule.recipients.length - 2}`}
                              </span>
                              {(schedule.ccRecipients?.length ?? 0) > 0 && (
                                <span className="text-[9.5px] font-bold text-[#8B95B8]">
                                  {" "}(CC: {schedule.ccRecipients!.length})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-[#8A94B8]">
                            <span>{tr("scheduleModal.lastRun")}: {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : tr("scheduleModal.never")}</span>
                          </div>
                          <div className="text-[10px] font-bold text-[#10B981] mt-0.5">
                            {tr("scheduleModal.nextRun")}: {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : tr("scheduleModal.never")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => sendTestEmailMutation.mutate(schedule.id)}
                            disabled={sendTestEmailMutation.isPending}
                            className="flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#10B981]/30 bg-white px-2.5 text-[10px] font-black text-[#10B981] transition hover:bg-[#ECFDF5] disabled:opacity-50"
                            title={tr("scheduleModal.sendTestEmail")}
                          >
                            <Mail size={13} />
                          </button>
                          <button type="button" onClick={() => toggleScheduleMutation.mutate(schedule.id)} className={cn("flex h-8 items-center justify-center gap-1.5 rounded-[8px] border px-2.5 text-[10px] font-black transition", schedule.enabled ? "border-[#FAD7D7] bg-white text-[#EF4444] hover:bg-[#FFF4F4]" : "border-[#D1FAE5] bg-white text-[#10B981] hover:bg-[#ECFDF5]")}>
                            {schedule.enabled ? tr("scheduleModal.disable") : tr("scheduleModal.enable")}
                          </button>
                          <button type="button" onClick={() => { setEditingSchedule(schedule); setIsScheduleFormOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#465FFF] transition hover:bg-[#F5F7FC]" aria-label={tr("actions.editSchedule")}>
                            <Edit2 size={13} />
                          </button>
                          <button type="button" onClick={() => { if (window.confirm(tr("confirm.deleteSchedule"))) deleteScheduleMutation.mutate(schedule.id); }} disabled={deleteScheduleMutation.isPending} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#FAD7D7] bg-white text-[#EF4444] transition hover:bg-[#FFF4F4]" aria-label={tr("actions.deleteSchedule")}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-center">
                      <CalendarClock size={24} className="text-[#8B95B8] mb-3" />
                      <p className="text-[13px] font-bold text-[#53608C]">{tr("scheduleModal.empty")}</p>
                      <p className="text-[11px] font-bold text-[#8A94B8] mt-1">{tr("scheduleModal.emptyDesc")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

      {/* Popular Reports Modal */}
      {mounted && isPopularModalOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsPopularModalOpen(false)}>
          <Panel role="dialog" aria-modal="true" aria-labelledby="reports-popular-dialog-title" tabIndex={-1} className="flex w-full max-w-lg flex-col max-h-[85vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 id="reports-popular-dialog-title" className="text-lg font-black text-[#101334]">{tr("popular.title")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("popular.desc")}</p>
              </div>
              <button type="button" onClick={() => setIsPopularModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {livePopularReports.length > 0 ? (
                <div className="space-y-3">
                  {livePopularReports.map((report, idx) => (
                    <div key={report.title} className="flex items-center gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3 hover:border-[#DCE2F0] hover:bg-white transition">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[12px] font-black text-[#465FFF]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-black text-[#101334]">{report.title}</span>
                      </div>
                      <span className="text-[12px] font-bold text-[#68739F] shrink-0">{report.views}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText size={28} className="text-[#DDE3EF] mb-3" />
                  <p className="text-[13px] font-bold text-[#53608C]">{tr("popular.noData")}</p>
                </div>
              )}
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

      {/* Share Report Modal */}
      {mounted && isShareModalOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)}>
          <Panel role="dialog" aria-modal="true" aria-labelledby="reports-share-dialog-title" tabIndex={-1} className="flex w-full max-w-md flex-col max-h-[85vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 id="reports-share-dialog-title" className="text-lg font-black text-[#101334]">{tr("shareModal.title")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("shareModal.desc")}</p>
              </div>
              <button type="button" onClick={() => setIsShareModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {rows.length > 0 ? (
                <form onSubmit={handleShareReport} className="space-y-4">
                  <div className="rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3">
                    <p className="text-[10px] font-bold text-[#8A94B8]">{tr("shareModal.title")}</p>
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
                    <button type="submit" disabled={shareReportMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50">
                      {shareReportMutation.isPending ? tr("shareModal.sending") : tr("shareModal.send")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Share2 size={28} className="text-[#DDE3EF] mb-3" />
                  <p className="text-[13px] font-bold text-[#53608C]">{tr("shareModal.noReport")}</p>
                </div>
              )}
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

      {/* Screen Reader AI image slot */}
      <div className="sr-only" aria-live="polite">AI image slot: {aiAgentImage}</div>

      {/* Modals */}
      {mounted && isTemplatesModalOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsTemplatesModalOpen(false)}>
          <Panel role="dialog" aria-modal="true" aria-labelledby="reports-templates-dialog-title" tabIndex={-1} className="flex w-full max-w-2xl flex-col max-h-[85vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div className="flex items-center gap-3">
                <h2 id="reports-templates-dialog-title" className="text-lg font-black text-[#101334]">{tr("buttons.manageTemplates")}</h2>
                {!isFormOpen && (
                  <button type="button" onClick={() => { setEditingTemplate(null); setIsFormOpen(true); }} className="flex h-7 items-center justify-center gap-1.5 rounded-[6px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-2.5 text-[10px] font-black text-white shadow-sm transition hover:opacity-90">
                    <Plus size={12} /> {tr("templateForm.addCustom")}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => { setIsTemplatesModalOpen(false); setIsFormOpen(false); }} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
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
                      <div className="flex h-9 w-full items-center rounded-[8px] border border-[#DDE3EF] bg-[#F5F7FC] px-3 text-[12px] font-bold text-[#8A94B8]">
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
                    <button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50">
                      {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? tr("templateForm.saving") : tr("templateForm.save")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-3">
                  {templatesQuery.isPending ? (
                    <div className="flex h-40 items-center justify-center">
                      <RefreshCcw className="animate-spin text-[#8A94B8]" size={24} />
                    </div>
                  ) : templatesQuery.data && templatesQuery.data.data.length > 0 ? (
                    templatesQuery.data.data.map((template) => (
                      <div key={template.key} className="rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#DCE2F0] hover:bg-white transition shadow-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-[#101334] text-[13px] truncate">{template.name}</h3>
                            <span className="shrink-0 rounded-full bg-[#E6EAF2] px-2 py-0.5 text-[9px] font-black text-[#58648C]">
                              {template.sectionCount} Sections
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-[#68739F] mt-1 leading-relaxed">{template.description}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#465FFF]/10 text-[#465FFF] px-2.5 py-1.5 rounded-[6px] font-black uppercase tracking-[0.05em]">
                              <FileText size={11} /> {template.format}
                            </span>
                            <span className="flex items-center gap-1.5 text-[9.5px] bg-[#8B5CFF]/10 text-[#8B5CFF] px-2.5 py-1.5 rounded-[6px] font-black uppercase tracking-[0.05em]">
                              <CalendarClock size={11} /> {template.cadence}
                            </span>
                          </div>
                        </div>
                        {template.isSystem ? (
                          <button type="button" className="shrink-0 self-start sm:self-center rounded-[8px] bg-[#F5F7FC] px-3 py-1.5 text-[10px] font-black text-[#8A94B8] border border-[#E6EAF2] cursor-default">
                            {tr("buttons.systemTemplate")}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button type="button" onClick={() => { setEditingTemplate(template); setIsFormOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#465FFF] transition hover:bg-[#F5F7FC]" aria-label={tr("actions.editTemplate")}>
                              <Edit2 size={13} />
                            </button>
                            <button type="button" onClick={() => { if (window.confirm(tr("confirm.deleteTemplate"))) deleteTemplateMutation.mutate(template.key); }} disabled={deleteTemplateMutation.isPending} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#FAD7D7] bg-white text-[#EF4444] transition hover:bg-[#FFF4F4]" aria-label={tr("actions.deleteTemplate")}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-center">
                      <FileText size={24} className="text-[#8B95B8] mb-3" />
                      <p className="text-sm font-bold text-[#53608C]">{tr("empty.title")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

      {mounted && isCreateModalOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}>
          <Panel role="dialog" aria-modal="true" aria-labelledby="reports-create-dialog-title" tabIndex={-1} className="flex w-full max-w-lg flex-col max-h-[85vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 id="reports-create-dialog-title" className="text-lg font-black text-[#101334]">{tr("createModal.title")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tr("createModal.desc")}</p>
              </div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
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
                    <p className="mt-1.5 text-[10px] font-bold text-[#EF4444]">{tr("createModal.noTemplates")}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tr("createModal.dateRangeLabel")}</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#8A94B8]">{tr("createModal.startLabel")}</label>
                      <input name="startDate" type="date" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-[#8A94B8]">{tr("createModal.endLabel")}</label>
                      <input name="endDate" type="date" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                    {tr("createModal.cancel")}
                  </button>
                  <button type="submit" disabled={generateReportMutation.isPending || !templatesQuery.data?.data.length} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50">
                    {generateReportMutation.isPending ? tr("createModal.generating") : tr("createModal.generate")}
                  </button>
                </div>
              </form>
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
