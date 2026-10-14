"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { intlLocale, useUiStore } from "@/store/useUiStore";
import { MONITORING_PERIODS, monitoringHref, parseMonitoringFilters, periodStart, type MonitoringFilters } from "@/lib/evidence-links";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Briefcase, Check, FileText, Flag, Filter, Info, Loader2, RotateCw, Search, ShieldCheck, Sparkles, Star, Trash2, Zap, CheckCircle2, Download, X, Globe, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  AppStore,
  Facebook,
  GooglePlay,
  Instagram,
  TikTokDark,
} from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";
import { CreateInvestigationModal } from "./components/create-investigation-modal";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { AdvancedSearchModal, ActiveFiltersChips } from "./components/advanced-search-modal";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { getNarratives, getDateRangeOptions, getSignals, getSources, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta, bulkDeleteSignals, bulkAnalyzeSignals, bulkCreateAlertsFromSignals, searchSignals, fetchLatestSignals, downloadSignalsExport, type AdvancedSearchFilters, type SearchSignalsResponse } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { DemoBanner } from "@/components/ui/demo-banner";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Sentiment = "NEGATIVE" | "POSITIVE" | "NEUTRAL" | "MIXED" | "UNANALYZED";
type SignalFilter = "all" | "negative" | "positive" | "neutral" | "mixed";
type SourceKey = keyof typeof sourceIcons;

type SignalRow = {
  id: string;
  title: string;
  sentimentTone: Exclude<Tone, "blue">;
  desc: string;
  tags: string[];
  sourceType: string;
  sources: SourceKey[];
  sentiment: Sentiment;
  time: string;
  captured: string;
  relatedNarrative: string;
  // Persisted analysis status/confidence (no derived "amplification").
  analysisStatus: "analyzed" | "unanalyzed";
  analysisConfidence: number | null;
  url: string | null;
  narrativeCount: number;
  narratives: Array<{ id: string; title: string }>;
  relevance: Signal["relevance"];
  platform: string | null;
};

const signalApiLimit = 20;


const toneStyles: Record<Tone, { color: string; rgb: string; soft: string; text: string; border: string }> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#3B52F5]", border: "border-[#465FFF]/15" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#6E44E8]", border: "border-[#8B5CFF]/15" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#047857]", border: "border-[#10B981]/15" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#C81E1E]", border: "border-[#EF4444]/15" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#A04606]", border: "border-[#F59E0B]/15" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-[#5A6478]", border: "border-slate-200" },
};

const sourceIcons = {
  web: <span className="flex size-5 items-center justify-center rounded-[5px] bg-white text-[#5A6478]"><Globe className="size-3" /></span>,
  x: (
    <span className="flex size-5 items-center justify-center rounded-[5px] bg-[#111827] text-white">
      <svg viewBox="0 0 24 24" className="size-3 fill-current" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </span>
  ),
  tiktok: <span className="flex size-5 items-center justify-center rounded-[5px] bg-white text-[#111827]"><TikTokDark className="size-3" /></span>,
  instagram: <span className="flex size-5 items-center justify-center rounded-[5px] bg-white"><Instagram className="size-3" /></span>,
  facebook: <span className="flex size-5 items-center justify-center rounded-[5px] bg-white"><Facebook className="size-3" /></span>,
  playstore: <span className="flex size-5 items-center justify-center rounded-[5px] bg-white"><GooglePlay className="size-3" /></span>,
  appstore: <span className="flex size-5 items-center justify-center rounded-[5px] bg-white"><AppStore className="size-3" /></span>,
  ticket: <span className="flex size-5 items-center justify-center rounded-[5px] bg-[#8B5CFF]/10 text-[#6E44E8]"><FileText size={12} /></span>,
};



// Date and time: the table spans days, so a bare clock time would be ambiguous.
function compactTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString(intlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function sourceFromPlatform(platform: string | null): SourceKey {
  const value = platform?.toLowerCase() ?? "";
  if (value.includes("tiktok")) return "tiktok";
  if (value.includes("instagram")) return "instagram";
  if (value.includes("facebook")) return "facebook";
  if (value.includes("play") || value.includes("android")) return "playstore";
  if (value.includes("app") || value.includes("ios")) return "appstore";
  if (value.includes("ticket") || value.includes("support")) return "ticket";
  if (value === "x" || value.includes("twitter")) return "x";
  return "web"; // news, RSS and unknown platforms
}

function sentimentFromApi(sentiment: string | null): Sentiment {
  const value = sentiment?.toLowerCase() ?? "";
  if (value.includes("positive")) return "POSITIVE";
  if (value.includes("mixed")) return "MIXED";
  if (value.includes("neutral")) return "NEUTRAL";
  if (value.includes("negative")) return "NEGATIVE";
  // Missing or unrecognised sentiment is never shown as negative.
  return "UNANALYZED";
}

function buildApiSignalRows(apiSignals: Signal[], t: (key: string) => string): SignalRow[] {
  return apiSignals.map((signal) => {
    const sentiment = sentimentFromApi(signal.sentiment);
    const source = sourceFromPlatform(signal.platform);
    const sentimentTone = sentiment === "NEGATIVE" ? "red" : sentiment === "POSITIVE" ? "green" : sentiment === "MIXED" ? "purple" : "slate";
    const title = signal.title || signal.content.slice(0, 72) || t("fallbackUntitled");
    const capturedAt = signal.capturedAt ?? signal.captured_at ?? null;
    const publishedAt = signal.publishedAt ?? signal.published_at ?? null;
    const narratives = signal.narratives ?? [];

    return {
      id: signal.id,
      title,
      sentimentTone,
      desc: signal.content || t("fallbackNoContent"),
      // Publisher (stored as author by ingestion) first, then the collection platform.
      tags: [...(signal.author ? [signal.author] : []), signal.platform || t("fallbackUnknownSource")],
      sourceType: signal.platform || t("fallbackLiveSource"),
      sources: [source],
      sentiment,
      // Publication time only when the source gave one; never the collection time.
      time: compactTime(publishedAt),
      captured: compactTime(capturedAt),
      // Only persisted narrative membership is shown (never generated).
      relatedNarrative: narratives[0]?.title ?? "—",
      narrativeCount: narratives.length,
      analysisStatus: signal.analysisStatus === "analyzed" ? "analyzed" : "unanalyzed",
      analysisConfidence: typeof signal.analysisConfidence === "number" ? signal.analysisConfidence : null,
      url: signal.url ?? null,
      narratives,
      relevance: signal.relevance ?? null,
      platform: signal.platform ?? null,
    };
  });
}

const RELEVANCE_TONE: Record<string, string> = {
  direct: "bg-emerald-50 text-emerald-700",
  indirect: "bg-sky-50 text-sky-700",
  competitor: "bg-violet-50 text-violet-700",
  unconfirmed: "bg-amber-50 text-[#9A5B00]",
};

function RelevanceBadge({ relevance }: { relevance: SignalRow["relevance"] }) {
  const t = useTranslations("Signals.filters");
  if (!relevance) return null;
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", RELEVANCE_TONE[relevance])}>{t(`rel_${relevance}`)}</span>;
}

const PLATFORM_OPTIONS = ["news", "x", "tiktok", "instagram", "youtube", "facebook", "threads", "web"] as const;

/**
 * Filters that the API applies to stored records. The URL carries them, so a
 * link from Overview opens on the same evidence and the view can be shared.
 */
function MonitoringFilterBar({ filters, onChange, narrativeTitle, relevanceAvailable, brand }: { filters: MonitoringFilters; onChange: (next: MonitoringFilters) => void; narrativeTitle: string | null; relevanceAvailable: boolean; brand: string | null }) {
  const t = useTranslations("Signals.filters");
  const select = "mt-1 block h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-2 text-[12px] font-semibold text-[#31406B] disabled:opacity-60";
  const label = "min-w-0 text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]";
  const active = Boolean(filters.hours || filters.narrative || filters.relevance || filters.analysis || filters.platform);
  return (
    <div className="rounded-[12px] border border-[#EDF1F7] bg-white p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className={label}>
          {t("period")}
          <select className={select} value={filters.hours ?? ""} onChange={(e) => onChange({ ...filters, hours: e.target.value ? (Number(e.target.value) as MonitoringFilters["hours"]) : undefined })}>
            <option value="">{t("periodAll")}</option>
            {MONITORING_PERIODS.map((h) => <option key={h} value={h}>{t(`period_${h}`)}</option>)}
          </select>
        </label>
        <label className={label}>
          {t("relevance")}
          <select className={select} disabled={!relevanceAvailable} value={filters.relevance ?? ""} onChange={(e) => onChange({ ...filters, relevance: (e.target.value || undefined) as MonitoringFilters["relevance"] })}>
            <option value="">{t("relevanceAll")}</option>
            <option value="direct">{t("relevanceDirect", { brand: brand || "brand" })}</option>
            <option value="other">{t("relevanceOther", { brand: brand || "brand" })}</option>
          </select>
        </label>
        <label className={label}>
          {t("platform")}
          <select className={select} value={filters.platform ?? ""} onChange={(e) => onChange({ ...filters, platform: e.target.value || undefined })}>
            <option value="">{t("platformAll")}</option>
            {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{t(`platform_${p}`)}</option>)}
          </select>
        </label>
        <label className={label}>
          {t("analysis")}
          <select className={select} value={filters.analysis ?? ""} onChange={(e) => onChange({ ...filters, analysis: (e.target.value || undefined) as MonitoringFilters["analysis"] })}>
            <option value="">{t("analysisAll")}</option>
            <option value="analyzed">{t("analysisDone")}</option>
            <option value="pending">{t("analysisPending")}</option>
          </select>
        </label>
      </div>
      {!relevanceAvailable ? <p className="mt-2 text-[11px] text-[#5A6478]">{t("relevanceUnavailable")}</p> : null}
      {filters.narrative || active ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          {filters.narrative ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#465FFF]/10 px-2.5 py-1 text-[#3B52F5]">
              <span className="truncate">{t("issueChip", { title: narrativeTitle || t("issueSelected") })}</span>
              <button type="button" onClick={() => onChange({ ...filters, narrative: undefined })} aria-label={t("removeIssue")} className="rounded-full hover:bg-[#465FFF]/15"><X size={12} /></button>
            </span>
          ) : null}
          {active ? <button type="button" onClick={() => onChange({})} className="text-[#5A6478] hover:text-[#101334] hover:underline">{t("reset")}</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>{children}</section>;
}


function SummaryPanel({ meta }: { meta?: SignalsMeta }) {
  const t = useTranslations("Signals.summary");
  const tSignals = useTranslations("Signals");
  const uiLanguage = useUiStore((state) => state.language);

  const total = meta?.metrics?.totalSignals24h ?? 0;
  const negative = meta?.metrics?.negativeSignals24h ?? 0;
  const critical = meta?.metrics?.criticalSignals24h ?? 0;
  // Positive comes from persisted sentiment; neutral and unanalyzed signals are not counted as positive.
  const positive = meta?.metrics?.positiveSignals24h;
  const ratio = positive !== undefined && negative > 0 ? (positive / negative).toFixed(1) : "—";
  const other = positive !== undefined ? Math.max(0, total - positive - negative) : null;

  const hasData = total > 0;
  const aiSummary = meta?.aiSummary;

  const metricCards = [
    { label: t("total"), value: total.toLocaleString(uiLanguage), helper: t("trendLabel"), tone: "blue" as Tone },
    { label: t("critical"), value: critical.toLocaleString(uiLanguage), helper: t("alertBackedLabel"), tone: "amber" as Tone },
    { label: tSignals("positiveNegativeRatio"), value: ratio === "—" ? "—" : `${ratio}:1`, helper: `${positive ?? "—"} / ${negative}`, tone: (positive ?? 0) >= negative ? "green" as Tone : "red" as Tone },
    { label: tSignals("otherSentiment"), value: other === null ? "—" : other.toLocaleString(uiLanguage), helper: t("trendLabel"), tone: "purple" as Tone },
  ];

  return (
    <Panel className="overflow-hidden p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#6E44E8]"><Sparkles size={12} /> {t("aiGenerated")}</span>
          </div>
          {hasData && aiSummary ? (
            <>
              <p className="mt-3 text-[14px] font-semibold leading-6 text-navy">{aiSummary.content[uiLanguage as 'en' | 'id'] || aiSummary.content.en}</p>
              <p className="mt-2 max-w-[560px] text-[13px] font-medium leading-6 text-body">{aiSummary.insight[uiLanguage as 'en' | 'id'] || aiSummary.insight.en}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[14px] font-semibold leading-6 text-navy">{t("noData")}</p>
              <p className="mt-2 max-w-[560px] text-[13px] font-medium leading-6 text-body">{t("noDataDesc")}</p>
            </>
          )}
        </div>
        <div className="grid gap-3 border-t border-[#EDF1F7] pt-4 md:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {metricCards.map((metric) => <MetricBlock key={metric.label} {...metric} />)}
        </div>
      </div>
    </Panel>
  );
}

function MetricBlock({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className={cn("min-w-0 rounded-[12px] border p-3", style.border, style.soft)}>
      <p className="text-[11px] font-extrabold text-[#5F6B94]">{label}</p>
      <p className="mt-2 text-[25px] font-black leading-none tracking-[-0.045em] text-[#101334]">{value}</p>
      <p className={cn("mt-2 text-[10px] font-black", style.text)}>{helper}</p>
    </div>
  );
}

function SentimentIcon({ sentiment, tone }: { sentiment: Sentiment; tone: SignalRow["sentimentTone"] }) {
  const style = toneStyles[tone];
  const Icon = sentiment === "NEGATIVE" ? AlertTriangle : sentiment === "POSITIVE" ? ShieldCheck : Sparkles;
  return <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", style.soft, style.text, style.border)}><Icon size={17} /></span>;
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const styles: Record<Sentiment, string> = {
    NEGATIVE: "bg-[#EF4444]/10 text-[#C81E1E]",
    POSITIVE: "bg-[#10B981]/10 text-[#047857]",
    NEUTRAL: "bg-slate-100 text-slate-600",
    MIXED: "bg-[#8B5CFF]/10 text-[#6E44E8]",
    UNANALYZED: "border border-dashed border-slate-300 bg-white text-[#5A6478]",
  };
  return <span className={cn("rounded-full px-2 py-1 text-[9.5px] font-black tracking-[0.12em]", styles[sentiment])}>{sentiment === "UNANALYZED" ? "UNANALYZED" : sentiment}</span>;
}

function TagBadge({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    "Reputation Risk": "bg-[#EF4444]/10 text-[#C81E1E]",
    "Customer Experience": "bg-[#F97316]/10 text-[#F97316]",
    "Operational Risk": "bg-[#F59E0B]/12 text-[#A04606]",
    "Marketing Opportunity": "bg-[#10B981]/10 text-[#047857]",
    "+1": "bg-[#EEF2FF] text-[#3B52F5]",
  };
  return <span className={cn("rounded-full px-2 py-1 text-[9px] font-black", styles[tag] ?? "bg-slate-100 text-[#5A6478]")}>{tag}</span>;
}

function AnalysisBadge({ status, confidence }: { status: "analyzed" | "unanalyzed"; confidence: number | null }) {
  if (status !== "analyzed") {
    return <span className="rounded-full border border-dashed border-slate-300 px-2 py-1 text-[9px] font-black text-[#5A6478]">Pending</span>;
  }
  return (
    <span className="rounded-full bg-[#465FFF]/10 px-2 py-1 text-[9px] font-black text-[#3B52F5]" title="AI analysis confidence (persisted)">
      {confidence === null ? "Analyzed" : `${Math.round(confidence * 100)}% conf.`}
    </span>
  );
}

function SourceIconList({ row }: { row: SignalRow }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black text-[#5F6B94]">{row.sourceType}</p>
      <div className="flex items-center gap-1.5">
        {row.sources.map((source) => <span key={source} className="flex size-5 items-center justify-center rounded-[6px] border border-[#E6EAF2] bg-white">{sourceIcons[source]}</span>)}
      </div>
    </div>
  );
}

function SignalsTable({ activeFilter, setActiveFilter, query, setQuery, rows, footerText, pagination, onPageChange, isFetching, className, tTimeRange, tSignals, onInvestigate, onGenerateActionPlan, selectedIds, onSelectionChange, onBulkAnalyze, onBulkDelete, onBulkCreateAlert, isBulkProcessing }: { activeFilter: SignalFilter; setActiveFilter: (value: SignalFilter) => void; query: string; setQuery: (value: string) => void; rows: SignalRow[]; footerText: string; pagination?: PaginationInfo | null; onPageChange: (page: number) => void; isFetching?: boolean; className?: string; tTimeRange: (key: string) => string; tSignals: (key: string) => string; onInvestigate: (row: SignalRow) => void; onGenerateActionPlan?: (row: SignalRow) => void; selectedIds: Set<string>; onSelectionChange: (ids: Set<string>) => void; onBulkAnalyze: () => void; onBulkDelete: () => void; onBulkCreateAlert: () => void; isBulkProcessing: boolean }) {
  const t = useTranslations("Signals");
  const tabs: Array<{ value: SignalFilter; label: string }> = [
    { value: "all", label: tSignals("filterAll") },
    { value: "negative", label: tSignals("filterNegative") },
    { value: "positive", label: tSignals("filterPositive") },
    { value: "neutral", label: tSignals("filterNeutral") },
    { value: "mixed", label: tSignals("filterMixed") },
  ];

  const allSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.id));
  const someSelected = rows.some(row => selectedIds.has(row.id));

  const handleSelectAll = () => {
    if (allSelected) {
      const newIds = new Set(selectedIds);
      rows.forEach(row => newIds.delete(row.id));
      onSelectionChange(newIds);
    } else {
      const newIds = new Set(selectedIds);
      rows.forEach(row => newIds.add(row.id));
      onSelectionChange(newIds);
    }
  };

  const handleSelectRow = (id: string) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    onSelectionChange(newIds);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#465FFF]/20 bg-[#EEF2FF] px-4 py-2.5">
          <span className="text-[12px] font-black text-[#3B52F5]">{t("bulk.selected", { count: selectedIds.size })}</span>
          <div className="h-4 w-px bg-[#465FFF]/20" />
          <button
            onClick={onBulkAnalyze}
            disabled={isBulkProcessing}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#465FFF] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#3147E8] disabled:opacity-50"
          >
            {isBulkProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t("bulk.analyze")}
          </button>
          <button
            onClick={onBulkCreateAlert}
            disabled={isBulkProcessing}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#B45309] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#92400E] disabled:opacity-50"
          >
            {isBulkProcessing ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            {t("bulk.createAlert")}
          </button>
          <button
            onClick={onBulkDelete}
            disabled={isBulkProcessing}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#C81E1E] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#A51818] disabled:opacity-50"
          >
            {isBulkProcessing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {t("bulk.delete")}
          </button>
          <button
            onClick={() => onSelectionChange(new Set())}
            className="ml-auto flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[11px] font-bold text-[#5F6B94] transition hover:bg-[#465FFF]/10 hover:text-[#3B52F5]"
          >
            <X size={12} />
            {t("bulk.clear")}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.value} type="button" onClick={() => setActiveFilter(tab.value)} className={cn("h-9 rounded-full px-4 text-[12px] font-black transition", activeFilter === tab.value ? "bg-[#465FFF] text-white shadow-sm" : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#31406B] hover:bg-white")}>{tab.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#647099]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder={tSignals("search")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] pl-9 pr-3 text-[11px] font-bold text-[#101334] outline-none transition placeholder:text-[#647099] focus:border-[#465FFF] focus:bg-white" />
          </label>
          <span className="inline-flex h-9 items-center rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B] shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
            {tSignals("sortLatest")}
          </span>
        </div>
      </div>

      <Panel className="overflow-hidden p-0 xl:min-h-[610px] flex flex-col">
        {/* Phones: one card per record with the same evidence fields. */}
        <ul className="divide-y divide-[#EDF1F7] md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <SentimentIcon sentiment={row.sentiment} tone={row.sentimentTone} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug text-navy">{row.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <SentimentBadge sentiment={row.sentiment} />
                    <RelevanceBadge relevance={row.relevance} />
                  </div>
                  <p className="mt-1 text-[11px] text-[#5A6478]">
                    {row.tags.join(" · ")}
                  </p>
                  <p className="text-[11px] text-[#5A6478]">
                    {t("headerPublished")}: {row.time} · {t("headerCaptured")}: {row.captured}
                  </p>
                  {row.narratives[0] ? (
                    <Link href={monitoringHref({ narrative: row.narratives[0].id })} className="mt-0.5 block truncate text-[11px] font-semibold text-[#3B52F5] hover:underline">{row.relatedNarrative}</Link>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold">
                    {row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#3B52F5]">{t("original")} <ExternalLink size={11} /></a> : null}
                    <button type="button" onClick={() => onGenerateActionPlan?.(row)} className="text-[#3B52F5]">{t("plan")}</button>
                    <button type="button" onClick={() => onInvestigate(row)} className="text-[#3B52F5]">{tSignals("investigate")}</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden flex-1 flex-col overflow-x-auto md:flex">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E6EAF2] bg-[#FBFCFF] text-[10px] font-black uppercase tracking-[0.17em] text-[#5F6B94]">
                <th className="w-10 px-3.5 py-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    aria-label={t("bulk.selectAll")}
                    aria-pressed={allSelected}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition",
                      allSelected ? "border-[#465FFF] bg-[#465FFF] text-white" :
                      someSelected ? "border-[#465FFF] bg-[#465FFF]/20" :
                      "border-[#DDE3EF] bg-white hover:border-[#465FFF]"
                    )}
                  >
                    {allSelected || someSelected ? <Check size={12} /> : null}
                  </button>
                </th>
                {[tSignals("headerSignal"), tSignals("headerSource"), tSignals("headerSentiment"), tSignals("headerRelatedNarrative"), tSignals("headerAmplification"), tSignals("headerPublished"), tSignals("headerCaptured"), tSignals("headerAction")].map((header) => <th key={header} scope="col" className="whitespace-nowrap px-3.5 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F7]">
              {rows.map((row) => (
                <tr key={row.id} className={cn("transition hover:bg-[#F8FAFF]", selectedIds.has(row.id) && "bg-[#EEF2FF]")}>
                  <td className="px-3.5 py-4 align-middle">
                    <button
                      type="button"
                      onClick={() => handleSelectRow(row.id)}
                      aria-label={t("bulk.selectOne", { title: row.title })}
                      aria-pressed={selectedIds.has(row.id)}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition",
                        selectedIds.has(row.id) ? "border-[#465FFF] bg-[#465FFF] text-white" :
                        "border-[#DDE3EF] bg-white hover:border-[#465FFF]"
                      )}
                    >
                      {selectedIds.has(row.id) ? <Check size={12} /> : null}
                    </button>
                  </td>
                  <td className="min-w-[280px] max-w-[400px] px-3.5 py-4">
                    <div className="flex items-start gap-3">
                      <SentimentIcon sentiment={row.sentiment} tone={row.sentimentTone} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold leading-snug text-navy">{row.title}</span>
                          {row.url ? (
                            <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#3B52F5] hover:underline" aria-label={t("openOriginal")}>
                              {t("original")} <ExternalLink size={10} />
                            </a>
                          ) : null}
                          <RelevanceBadge relevance={row.relevance} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-body">{row.desc}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{row.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-4 align-middle"><SourceIconList row={row} /></td>
                  <td className="px-3.5 py-4 align-middle"><SentimentBadge sentiment={row.sentiment} /></td>
                  <td className="px-3.5 py-4 align-middle">
                    {row.narratives[0] ? (
                      <Link href={monitoringHref({ narrative: row.narratives[0].id })} className="block max-w-[120px] truncate text-[10.5px] font-bold text-[#3B52F5] hover:underline" title={row.relatedNarrative}>
                        {row.relatedNarrative}{row.narrativeCount > 1 ? ` +${row.narrativeCount - 1}` : ""}
                      </Link>
                    ) : (
                      <span className="block text-[10.5px] font-bold text-[#5A6478]">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-4 align-middle"><AnalysisBadge status={row.analysisStatus} confidence={row.analysisConfidence} /></td>
                  <td className="px-3.5 py-4 align-middle"><span className="block text-[11px] font-black text-[#31406B]">{row.time}</span></td>
                  <td className="px-3.5 py-4 align-middle"><span className="block text-[11px] font-black text-[#31406B]">{row.captured}</span></td>
                  <td className="px-3.5 py-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onGenerateActionPlan?.(row)}
                        title={t("planTitle")}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-[8px] border border-[#DDE3EF] bg-white px-2.5 text-[10.5px] font-black text-[#3B52F5] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF]"
                      >
                        <Sparkles size={11} />
                        {t("plan")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onInvestigate(row)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-[#465FFF] px-2.5 text-[10.5px] font-black text-white shadow-sm transition hover:bg-[#3147E8]"
                      >
                        <Flag size={11} />
                        {tSignals("investigate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] px-4 py-3 sm:flex-row">
          <p className="text-[11px] font-bold text-[#5F6B94]">{footerText}</p>
          <DashboardPagination pagination={pagination} onPageChange={onPageChange} disabled={isFetching} />
        </div>
      </Panel>
    </div>
  );
}

function FollowUpPanel({ data }: { data?: SignalsMeta["followUps"] }) {
  const t = useTranslations("Signals.followUp");
  const hasData = data && data.length > 0;

  return (
    <Panel className="p-4">
      <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
      <p className="mt-1 text-[11.5px] font-bold text-[#5F6B94]">{t("desc")}</p>
      
      {!hasData && data !== undefined ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <ShieldCheck size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {(data || []).map((item) => {
            const style = toneStyles[item.tone as Tone];
            const Icon = item.tone === "green" ? Star : Zap;
            return (
              <div key={item.title} className={cn("grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-[12px] border p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto]", item.tone === "red" ? "border-[#F8CACA] bg-[#FFF5F5]" : item.tone === "amber" ? "border-[#FFE8C2] bg-[#FFF9F0]" : "border-[#CDEEDD] bg-[#F1FCF6]")}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", style.soft, style.text)}><Icon size={15} fill={item.tone === "green" ? style.color : "none"} /></span>
                <span className="min-w-0"><span className="block truncate text-[12px] font-black text-[#101334]">{item.title}</span><span className="mt-1 block text-[10px] font-bold text-[#58648C]">{item.meta}</span></span>
                <span className="col-start-2 text-left sm:col-start-auto sm:text-right"><span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", style.soft, style.text)}>{item.badge}</span><span className="mt-2 block text-[10px] font-bold text-[#31406B]">{item.time}</span></span>
              </div>
            );
          })}
        </div>
      )}

      {hasData && (
        <Link href="/action-plans" className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#FBFCFF] text-[11px] font-black text-[#3B52F5]">{t("action")} <ArrowRight size={13} /></Link>
      )}
    </Panel>
  );
}

function RecommendationPanel({ data }: { data?: SignalsMeta["recommendations"] }) {
  const t = useTranslations("Signals.recommendations");
  const hasData = data && data.length > 0;

  return (
    <Panel className="p-4">
      <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
      <p className="mt-1 text-[11.5px] font-bold text-[#5F6B94]">{t("desc")}</p>
      
      {!hasData && data !== undefined ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <Sparkles size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {(data || []).map((item) => {
            const style = toneStyles[item.tone as Tone];
            const Icon = item.icon || (item.tone === "purple" ? AlertTriangle : item.tone === "blue" ? ShieldCheck : Zap);
            return (
              <div key={item.title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-[11px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 sm:grid-cols-[32px_minmax(0,1fr)_auto]">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-[9px]", style.soft, style.text)}><Icon size={15} /></span>
                <span className="min-w-0"><span className="block truncate text-[11.5px] font-black text-[#101334]">{item.title}</span><span className="mt-1 block text-[10px] font-bold text-[#5F6B94]">{item.desc}</span></span>
                <span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[8.5px] font-black sm:col-start-auto", item.tone === "red" || item.tone === "purple" ? "bg-[#EF4444]/10 text-[#C81E1E]" : item.tone === "blue" ? "bg-[#F59E0B]/12 text-[#A04606]" : "bg-[#10B981]/10 text-[#047857]")}>{item.badge}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {hasData && (
        <Link href="/action-plans" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] text-[12px] font-black text-white shadow-sm"><Briefcase size={14} />{t("action")}</Link>
      )}
    </Panel>
  );
}

function SourceDonut({ data, totalSignals }: { data?: SignalsMeta["sourceDistribution"]; totalSignals?: number }) {
  const t = useTranslations("Signals.sourceDonut");
  const hasData = data && data.length > 0;

  const total = totalSignals ?? 0;
  const items = hasData ? data : [];

  const conicGradient = (() => {
    if (items.length === 0) return '#E5E7EB 0% 100%';
    let acc = 0;
    return items.map((item) => {
      const match = item.value.match(/^(\d+)%/);
      const pct = match ? parseInt(match[1], 10) : 0;
      const end = acc + pct;
      const segment = `${item.color} ${acc}% ${end}%`;
      acc = end;
      return segment;
    }).join(', ');
  })();

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-[#101334]">{t("title")}</h3>
          <p className="mt-1 text-[11px] font-bold text-[#5F6B94]">{t("desc")}</p>
        </div>
        <span className="inline-flex h-8 shrink-0 whitespace-nowrap items-center rounded-full border border-[#E6EAF2] bg-[#F8FAFF] px-3 text-[9px] font-black text-[#53608C]">
          {t("timeframe")}
        </span>
      </div>

      {!hasData ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <AlertTriangle size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-[136px_minmax(0,1fr)] md:grid-cols-1 xl:grid-cols-[136px_minmax(0,1fr)]">
          <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full" style={{ background: `conic-gradient(${conicGradient})` }}>
            <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
            <span className="relative text-center">
              <b className="block text-[22px] font-black text-[#101334]">{total.toLocaleString()}</b>
              <span className="text-[10px] font-bold text-[#5F6B94]">{t("totalLabel")}</span>
            </span>
          </div>
          <div className="space-y-2.5 self-center">
            {items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-2 text-[#31406B]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="text-[#5F6B94]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function TimelineChart({ data, labels }: { data?: SignalsMeta["timeline"]; labels?: string[] }) {
  const t = useTranslations("Signals.timeline");
  const uiLanguage = useUiStore((state) => state.language);
  const isLoading = data === undefined;
  const hasData = data && data.length > 0;
  const hasNonZero = hasData && data.some((v) => v > 0);
  const values = hasData ? data : [];
  const allLabels = labels && labels.length > 0 ? labels : [];

  const width = 520;
  const height = 170;
  const padding = 14;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = 0;
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1 || 1)) * (width - padding * 2);
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return { x, y, value, label: allLabels[index] ?? "" };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = pathD ? `${pathD} L ${width - padding} ${height} L ${padding} ${height} Z` : "";

  const sampledIndices = (() => {
    if (points.length <= 7) return points.map((_, i) => i);
    const step = Math.floor(points.length / 6);
    const indices = [];
    for (let i = 0; i < points.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== points.length - 1) indices.push(points.length - 1);
    return indices;
  })();

  return (
    <Panel className="p-4">
      <h3 className="text-[16px] font-black text-[#101334]">{t("title")} <span className="text-[11px] font-bold text-[#5F6B94]">{t("period")}</span></h3>
      <p className="mt-1 text-[11px] font-bold text-[#5F6B94]">{t("desc")}</p>

      {isLoading ? (
        <div className="relative mt-5 h-[170px] overflow-hidden rounded-[12px] bg-[#FBFCFF]">
          <svg className="h-full w-full animate-pulse" viewBox={`0 0 ${width} ${height + 8}`} preserveAspectRatio="none" aria-hidden="true">
            {[34, 70, 106, 142].map((y) => (
              <line key={y} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#EDF1F7" strokeWidth="1" />
            ))}
            <path d={`M ${padding} ${height - 20} Q ${width * 0.25} ${height - 60} ${width * 0.5} ${height - 40} T ${width - padding} ${height - 30}`} fill="none" stroke="#DDE3EF" strokeWidth="3" strokeLinecap="round" />
            <rect x={padding} y={height - 16} width="40" height="8" rx="4" fill="#EDF1F7" />
            <rect x={width * 0.3} y={height - 16} width="40" height="8" rx="4" fill="#EDF1F7" />
            <rect x={width * 0.6} y={height - 16} width="40" height="8" rx="4" fill="#EDF1F7" />
          </svg>
        </div>
      ) : !hasData || !hasNonZero ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1F7]">
            <AlertTriangle size={18} className="text-[#647099]" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5 h-[170px] overflow-hidden rounded-[12px] bg-[#FBFCFF]">
          <svg
            className="chart-enter chart-line-draw h-full w-full"
            viewBox={`0 0 ${width} ${height + 8}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="signals-timeline-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#465FFF" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[34, 70, 106, 142].map((y) => (
              <line key={y} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#EDF1F7" strokeWidth="1" />
            ))}

            {areaD && <path d={areaD} fill="url(#signals-timeline-fill)" />}
            {pathD && (
              <path d={pathD} fill="none" stroke="#465FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            )}

            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? 5 : 3}
                fill={hoveredIndex === i ? "#465FFF" : "white"}
                stroke="#465FFF"
                strokeWidth="2"
                className="transition-all duration-150"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndex(i)}
              />
            ))}

            {hoveredIndex !== null && points[hoveredIndex] && (() => {
              const p = points[hoveredIndex];
              const tooltipW = 90;
              const tooltipH = 44;
              const clampedX = Math.max(tooltipW / 2 + 4, Math.min(p.x, width - tooltipW / 2 - 4));
              const tooltipY = Math.max(4, p.y - tooltipH - 10);
              const label = p.label;
              const valueText = p.value.toLocaleString(uiLanguage);
              return (
                <g>
                  <line x1={p.x} y1={p.y} x2={p.x} y2={height} stroke="#465FFF" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                  <rect x={clampedX - tooltipW / 2} y={tooltipY} width={tooltipW} height={tooltipH} rx="8" fill="#101334" />
                  <text x={clampedX} y={tooltipY + 16} textAnchor="middle" fill="white" fontSize="9" fontWeight="800">{label}</text>
                  <text x={clampedX} y={tooltipY + 32} textAnchor="middle" fill="white" fontSize="10" fontWeight="800">{valueText} {t("signalsLabel")}</text>
                </g>
              );
            })()}
          </svg>

          <div className="absolute inset-x-3 bottom-1 flex justify-between text-[10px] font-bold text-[#5F6B94]">
            {sampledIndices.map((i) => <span key={i}>{points[i]?.label ?? ""}</span>)}
          </div>
        </div>
      )}
    </Panel>
  );
}

function InvestigationQueue({ data }: { data?: SignalsMeta["investigationQueue"] }) {
  const t = useTranslations("Signals.investigationQueue");
  const hasData = data && data.length > 0;

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-[#101334]">{t("title")}</h3>
          <p className="mt-1 text-[11px] font-bold text-[#5F6B94]">{t("desc")}</p>
        </div>
        <Link href="/workspace/cases" className="text-[11px] font-black text-[#3B52F5]">{t("viewAll")}</Link>
      </div>

      {!hasData ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <ShieldCheck size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((item) => {
            const style = toneStyles[item.tone as Tone];
            return (
              <div key={item.title} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-[11px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 sm:grid-cols-[34px_minmax(0,1fr)_auto]">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-[9px]", style.soft, style.text)}><Zap size={15} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black text-[#101334]">{item.title}</span>
                  <span className="mt-1 block text-[10px] font-bold text-[#5F6B94]">{item.meta}</span>
                </span>
                <span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[9px] font-black sm:col-start-auto", item.badge === "Investigating" || item.badge === "open" ? "bg-[#465FFF]/10 text-[#3B52F5]" : "bg-[#F59E0B]/12 text-[#A04606]")}>{item.badge}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/** Live workspaces: real narrative clusters only (no sample cards). */
function LiveRelatedNarratives() {
  const t = useTranslations("Signals");
  const q = useQuery({ queryKey: ["signals-related-narratives"], queryFn: () => getNarratives({ limit: 3 }), staleTime: 60 * 1000 });
  const items = q.data?.data ?? [];
  return (
    <div className="mt-6 rounded-[14px] border border-[#DDE3EF] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{t("relatedNarratives")}</h3>
        <span title="Narrative clusters built from your workspace's signals" className="cursor-help text-[#647099]"><Info size={13} /></span>
      </div>
      {q.isLoading ? (
        <p className="text-[12px] font-bold text-[#5A6478]">Loading narratives…</p>
      ) : q.data === null ? (
        <p className="text-[12px] font-bold text-amber-700">Narratives could not be loaded.</p>
      ) : items.length === 0 ? (
        <p className="text-[12px] font-bold text-[#5A6478]">No narrative clusters yet. They form once enough related signals are ingested.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((n) => (
            <Link key={n.id} href="/intelligence" className="rounded-[12px] border border-[#EDF1F7] bg-[#FBFCFF] p-4 transition hover:border-[#465FFF]/30">
              <p className="line-clamp-2 text-[13px] font-black text-[#101334]">{n.title}</p>
              <p className="mt-2 text-[11px] font-bold text-[#5F6B94]">
                {n.signalCount} signal(s) · confidence {n.confidence === null ? "—" : `${n.confidence}%`} · 24h trend {n.velocity}
              </p>
              <p className="mt-1 text-[10.5px] font-bold capitalize text-[#5A6478]">{n.sentiment}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Live narratives only, demo sessions included: the demo workspace has real
// clusters, so invented cards are never shown beside real records.
function RelatedNarrativesSection(_props: { isDemo?: boolean }) {
  return <LiveRelatedNarratives />;
}

export default function SignalsPage() {
  const t = useTranslations("Signals");
  const toastHook = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActionPlanModalOpen, setIsActionPlanModalOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<SignalRow | null>(null);
  const [selectedSignalForAction, setSelectedSignalForAction] = useState<SignalRow | null>(null);
  const [activeFilter, setActiveFilter] = useState<SignalFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<MonitoringFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFetchingSignals, setIsFetchingSignals] = useState(false);
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);
  const deferredQuery = useDeferredValue(query);
  const dateRange = getDateRangeOptions("24h");
  const queryClient = useQueryClient();

  const handleExport = async (format: "csv" | "xlsx") => {
    setIsExporting(format);
    try {
      await downloadSignalsExport(format, {
        keyword: deferredQuery.trim() || undefined,
        sentiment: apiSentimentFilter,
      });
      toastHook.success(t("exportDone", { format: format.toUpperCase() }));
    } catch {
      toastHook.error(t("exportFailed", { format: format.toUpperCase() }));
    } finally {
      setIsExporting(null);
    }
  };

  const handleFetchLatestSignals = async () => {
    setIsFetchingSignals(true);
    try {
      const result = await fetchLatestSignals({ limit: 15 });
      if (result && result.success) {
        toastHook.success(t("fetchDone", { fetched: result.totalFetched, created: result.newSignalsCreated }));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["signals"] }),
          queryClient.invalidateQueries({ queryKey: ["signalsMeta"] }),
          queryClient.invalidateQueries({ queryKey: ["narratives"] }),
          queryClient.invalidateQueries({ queryKey: ["narrative-detail"] }),
          queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        ]);
      } else {
        toastHook.info(t("fetchNone"));
      }
    } catch {
      toastHook.error(t("fetchFailed"));
    } finally {
      setIsFetchingSignals(false);
    }
  };

  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

  // Advanced search state
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState<AdvancedSearchFilters>({});
  const [isAdvancedSearchActive, setIsAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState<SearchSignalsResponse | null>(null);
  const [isAdvancedSearchSearching, setIsAdvancedSearchSearching] = useState(false);

  // Bulk action mutations
  const bulkAnalyzeMutation = useMutation({
    mutationFn: async (signalIds: string[]) => {
      return bulkAnalyzeSignals(signalIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      setSelectedIds(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (signalIds: string[]) => {
      return bulkDeleteSignals(signalIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["signalsMeta"] });
      setSelectedIds(new Set());
    },
  });

  const bulkCreateAlertMutation = useMutation({
    mutationFn: async (signalIds: string[]) => {
      return bulkCreateAlertsFromSignals(signalIds);
    },
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });

  const handleBulkAnalyze = () => {
    if (selectedIds.size > 0) {
      bulkAnalyzeMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0 && confirm(t("bulk.confirmDelete", { count: selectedIds.size }))) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleBulkCreateAlert = () => {
    if (selectedIds.size > 0) {
      bulkCreateAlertMutation.mutate(Array.from(selectedIds));
    }
  };

  const isBulkProcessing = bulkAnalyzeMutation.isPending || bulkDeleteMutation.isPending || bulkCreateAlertMutation.isPending;
  
  const metaQuery = useQuery({
    queryKey: ["signalsMeta"],
    queryFn: () => getSignalsMeta(),
    staleTime: 60 * 1000,
  });
  const meta = metaQuery.data || undefined;
  const isMetaUnavailable = metaQuery.data === null || metaQuery.isError;

  const sourcesQuery = useQuery({
    queryKey: ["sources-signals-count"],
    queryFn: () => getSources({ limit: 10 }),
    staleTime: 60 * 1000,
    enabled: !isDemoSession,
  });
  const totalSources = sourcesQuery.data?.pagination?.total ?? (sourcesQuery.data?.data ? sourcesQuery.data.data.length : 0);
  const hasNoSources = !isDemoSession && sourcesQuery.data !== undefined && totalSources === 0;

  const apiSentimentFilter =
    activeFilter === "negative" ? "negative" :
    activeFilter === "positive" ? "positive" :
    activeFilter === "neutral" ? "neutral" :
    activeFilter === "mixed" ? "mixed" : undefined;

  // Filters from the URL (a link from Overview or a shared view), read once on load.
  useEffect(() => {
    const fromUrl = parseMonitoringFilters(window.location.search);
    setFilters(fromUrl);
    if (fromUrl.sentiment) setActiveFilter(fromUrl.sentiment);
  }, []);

  const updateUrl = (next: MonitoringFilters, sentiment: SignalFilter) => {
    window.history.replaceState(null, "", monitoringHref({ ...next, sentiment: sentiment === "all" ? undefined : sentiment }));
  };
  const handleFiltersChange = (next: MonitoringFilters) => {
    setFilters(next);
    setPage(1);
    setSelectedIds(new Set());
    updateUrl(next, activeFilter);
  };

  const signalsQuery = useQuery({
    queryKey: ["signals", { keyword: deferredQuery, page, sentiment: apiSentimentFilter, hours: filters.hours, narrative: filters.narrative, relevance: filters.relevance, analysis: filters.analysis, platform: filters.platform }],
    queryFn: async () => {
      const res = await getSignals({
        page,
        limit: signalApiLimit,
        keyword: deferredQuery.trim() || undefined,
        sentiment: apiSentimentFilter,
        // The period start is computed when the request is made, not in the key.
        startDate: filters.hours ? periodStart(filters.hours) : undefined,
        narrativeId: filters.narrative,
        relevance: filters.relevance,
        analysis: filters.analysis,
        platform: filters.platform,
      });
      if (res) return res;
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
    staleTime: 30 * 1000,
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleFilterChange = (value: SignalFilter) => {
    setActiveFilter(value);
    setPage(1);
    updateUrl(filters, value);
  };

  const handleInvestigate = (row: SignalRow) => {
    setSelectedSignal(row);
    setIsCreateModalOpen(true);
  };

  const handleCreateModalChange = (open: boolean) => {
    setIsCreateModalOpen(open);
    if (!open) setSelectedSignal(null);
  };

  const handleGenerateActionPlan = (row: SignalRow) => {
    setSelectedSignalForAction(row);
    setIsActionPlanModalOpen(true);
  };

  const handleActionPlanModalChange = (open: boolean) => {
    setIsActionPlanModalOpen(open);
    if (!open) setSelectedSignalForAction(null);
  };

  const handleApplyAdvancedFilters = (filters: AdvancedSearchFilters, results: SearchSignalsResponse | null) => {
    setAdvancedSearchFilters(filters);
    setAdvancedSearchResults(results);
    setIsAdvancedSearchActive(true);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleRemoveAdvancedFilter = (key: string) => {
    const newFilters = { ...advancedSearchFilters };
    if (key === "dateRange") {
      delete newFilters.dateFrom;
      delete newFilters.dateTo;
    } else {
      delete newFilters[key as keyof AdvancedSearchFilters];
    }
    setAdvancedSearchFilters(newFilters);

    // If no filters left, clear advanced search
    const remainingKeys = Object.keys(newFilters);
    if (remainingKeys.length === 0) {
      setIsAdvancedSearchActive(false);
      setAdvancedSearchResults(null);
    } else {
      // Re-run search with updated filters
      setIsAdvancedSearchSearching(true);
      searchSignals({ filters: newFilters, limit: signalApiLimit, page: 1 })
        .then((results) => {
          setAdvancedSearchResults(results);
        })
        .finally(() => {
          setIsAdvancedSearchSearching(false);
        });
    }
  };

  const handleClearAllAdvancedFilters = () => {
    setAdvancedSearchFilters({});
    setAdvancedSearchResults(null);
    setIsAdvancedSearchActive(false);
    setPage(1);
  };

  const tTimeRange = useTranslations("Signals");
  const tSignals = useTranslations("Signals");

  const liveRows = signalsQuery.data?.data ? buildApiSignalRows(signalsQuery.data.data, t) : [];
  // Relevance metadata comes with any successful page; a 409 (not configured) yields null.
  const [relevanceInfo, setRelevanceInfo] = useState<{ configured: boolean; brand: string | null } | null>(null);
  const pageRelevance = signalsQuery.data?.relevance;
  useEffect(() => {
    if (pageRelevance) setRelevanceInfo({ configured: pageRelevance.configured, brand: pageRelevance.brand });
  }, [pageRelevance]);
  const brandLabel = relevanceInfo?.brand ? relevanceInfo.brand.replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const narrativeTitle = filters.narrative ? liveRows.flatMap((r) => r.narratives).find((n) => n.id === filters.narrative)?.title ?? null : null;
  const newsOnlyRows = liveRows.length > 0 && liveRows.every((r) => (r.platform || "news") === "news");
  const isLiveUnavailable = signalsQuery.data === null;
  const sourceRows = liveRows;

  const rows = sourceRows.filter((row) => {
    const matchesQuery = query.trim() === "" || row.title.toLowerCase().includes(query.toLowerCase()) || row.desc.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (activeFilter === "negative") return row.sentiment === "NEGATIVE";
    if (activeFilter === "positive") return row.sentiment === "POSITIVE";
    if (activeFilter === "neutral") return row.sentiment === "NEUTRAL";
    if (activeFilter === "mixed") return row.sentiment === "MIXED";
    return true;
  });
  const footerText = signalsQuery.data?.pagination
    ? tSignals("footerLive", { from: String(signalsQuery.data.pagination.page), to: String(Math.min(signalsQuery.data.pagination.page * signalsQuery.data.pagination.limit, signalsQuery.data.pagination.total)), total: String(signalsQuery.data.pagination.total) })
    : isLiveUnavailable
      ? tSignals("footerUnavailable")
      : "";

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {isDemoSession && (
        <DemoBanner />
      )}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{t("title")}</h1><p className="mt-2 max-w-2xl text-[14px] font-medium leading-6 text-body">{t("subtitle")}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFetchLatestSignals}
            disabled={isFetchingSignals}
            title={t("fetchTitle")}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#31406B] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw size={14} className={cn("text-[#3B52F5]", isFetchingSignals && "animate-spin")} />
            {isFetchingSignals ? t("fetching") : t("fetchLatest")}
          </button>
          <button onClick={() => setIsAdvancedSearchOpen(true)} className={cn("flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-[12px] font-black transition", isAdvancedSearchActive ? "border-[#465FFF] bg-[#465FFF]/10 text-[#3B52F5]" : "border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#465FFF]/30 hover:bg-[#F8FAFF]")}>
            <Filter size={15} />
            {t("advancedSearch") || "Filters"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={!!isExporting}
            title={t("exportCsv")}
            className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-black text-[#31406B] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF] disabled:opacity-50"
          >
            <Download size={14} className={isExporting === "csv" ? "animate-pulse text-[#3B52F5]" : ""} />
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            disabled={!!isExporting}
            title={t("exportXlsx")}
            className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-black text-[#31406B] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF] disabled:opacity-50"
          >
            <Download size={14} className={isExporting === "xlsx" ? "animate-pulse text-[#3B52F5]" : ""} />
            Excel
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm sm:w-fit"><Flag size={15} />{t("createInvestigation")}</button>
        </div>
      </header>

      <CreateInvestigationModal open={isCreateModalOpen} onOpenChange={handleCreateModalChange} signalId={selectedSignal?.id} signalTitle={selectedSignal?.title} />
      <CreateActionPlanModal
        open={isActionPlanModalOpen}
        onOpenChange={handleActionPlanModalChange}
        initialSignalId={selectedSignalForAction?.id}
        initialSignalTitle={selectedSignalForAction?.title}
        initialStrategyType={selectedSignalForAction?.sentiment?.toLowerCase() === "negative" ? "crisis_response" : "pr_response"}
      />

      <AdvancedSearchModal
        open={isAdvancedSearchOpen}
        onOpenChange={setIsAdvancedSearchOpen}
        onApplyFilters={handleApplyAdvancedFilters}
        isSearching={isAdvancedSearchSearching}
      />

      {isAdvancedSearchActive && (
        <div className="rounded-[12px] border border-[#EDF1F7] bg-[#FBFCFF] p-4">
          <ActiveFiltersChips
            filters={advancedSearchFilters}
            onRemove={handleRemoveAdvancedFilter}
            onClearAll={handleClearAllAdvancedFilters}
          />
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SummaryPanel meta={meta} />
          {!isAdvancedSearchActive ? (
            <MonitoringFilterBar filters={filters} onChange={handleFiltersChange} narrativeTitle={narrativeTitle} relevanceAvailable={relevanceInfo?.configured !== false} brand={brandLabel} />
          ) : null}
          {!isAdvancedSearchActive && newsOnlyRows ? (
            <p className="rounded-[10px] bg-[#F4F6FF] px-3 py-2 text-[12px] font-medium text-[#31406B]">{t("filters.newsOnly")}</p>
          ) : null}
          {isAdvancedSearchActive ? (
            isAdvancedSearchSearching ? (
              <TableSkeleton rows={6} columns={6} className="xl:min-h-[610px]" />
            ) : advancedSearchResults ? (
              <>
                {advancedSearchResults.data.length === 0 ? (
                  <DashboardEmptyState title={t("emptyState.title")} description={t("emptyState.desc")} icon="search" minHeight="min-h-[420px]" />
                ) : (
                  <>
                    <SignalsTable
                    activeFilter={activeFilter}
                    setActiveFilter={handleFilterChange}
                    query={query}
                    setQuery={handleQueryChange}
                    rows={buildApiSignalRows(advancedSearchResults.data, t)}
                    footerText={tSignals("footerSearch", { from: "1", to: String(Math.min(advancedSearchResults.pagination.page * advancedSearchResults.pagination.limit, advancedSearchResults.pagination.total)), total: String(advancedSearchResults.pagination.total) })}
                    pagination={advancedSearchResults.pagination}
                    onPageChange={(newPage) => {
                      setIsAdvancedSearchSearching(true);
                      setPage(newPage);
                      searchSignals({ filters: advancedSearchFilters, page: newPage, limit: signalApiLimit })
                        .then((results) => {
                          if (results) setAdvancedSearchResults(results);
                        })
                        .finally(() => setIsAdvancedSearchSearching(false));
                    }}
                    isFetching={isAdvancedSearchSearching}
                    className="flex-1"
                    tTimeRange={tTimeRange}
                    tSignals={tSignals}
                    onInvestigate={handleInvestigate}
                    onGenerateActionPlan={handleGenerateActionPlan}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onBulkAnalyze={handleBulkAnalyze}
                    onBulkDelete={handleBulkDelete}
                    onBulkCreateAlert={handleBulkCreateAlert}
                    isBulkProcessing={isBulkProcessing}
                  />
                  <RelatedNarrativesSection isDemo={isDemoSession} />
                  </>
                )}
              </>
            ) : (
              <DashboardEmptyState title={t("emptyState.title")} description={t("emptyState.desc")} icon="search" minHeight="min-h-[420px]" />
            )
          ) : signalsQuery.isPending ? (
            <TableSkeleton rows={6} columns={6} className="xl:min-h-[610px]" />
          ) : signalsQuery.data && liveRows.length === 0 ? (
            <DashboardEmptyState
              title={hasNoSources ? t("emptyState.noSourcesTitle") : t("emptyState.title")}
              description={hasNoSources ? t("emptyState.noSourcesDesc") : t("emptyState.desc")}
              icon={hasNoSources ? "inbox" : "search"}
              minHeight="min-h-[420px]"
              action={
                hasNoSources ? (
                  <Link
                    href="/workspace/sources"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#465FFF] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#384ecc]"
                  >
                    {t("emptyState.connectSourceCta")}
                    <ArrowRight size={14} />
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              {isLiveUnavailable ? <DashboardErrorState title={tSignals("errorTitle")} description={tSignals("errorDesc")} onRetry={() => { (signalsQuery as { refetch: () => unknown }).refetch(); }} minHeight="min-h-[150px]" /> : null}
              <SignalsTable activeFilter={activeFilter} setActiveFilter={handleFilterChange} query={query} setQuery={handleQueryChange} rows={rows} footerText={footerText} pagination={signalsQuery.data?.pagination} onPageChange={setPage} isFetching={signalsQuery.isFetching} className="flex-1" tTimeRange={tTimeRange} tSignals={tSignals} onInvestigate={handleInvestigate} onGenerateActionPlan={handleGenerateActionPlan} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onBulkAnalyze={handleBulkAnalyze} onBulkDelete={handleBulkDelete} onBulkCreateAlert={handleBulkCreateAlert} isBulkProcessing={isBulkProcessing} />
              <RelatedNarrativesSection isDemo={isDemoSession} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-4">
            {isMetaUnavailable ? <DashboardErrorState title={tSignals("metaErrorTitle")} description={tSignals("metaErrorDesc")} onRetry={() => void metaQuery.refetch()} minHeight="min-h-[150px]" /> : null}
            <FollowUpPanel data={meta?.followUps} />
            <RecommendationPanel data={meta?.recommendations} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)_minmax(0,1.18fr)]">
        <SourceDonut data={meta?.sourceDistribution} totalSignals={meta?.totalSignals} />
        <TimelineChart data={meta?.timeline} labels={meta?.timelineLabels} />
        <InvestigationQueue data={meta?.investigationQueue} />
      </div>
    </div>
  );
}
