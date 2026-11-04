"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { intlLocale, useUiStore } from "@/store/useUiStore";
import { MONITORING_PERIODS, issueHref, monitoringHref, parseMonitoringFilters, periodStart, type MonitoringFilters } from "@/lib/evidence-links";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Info, Loader2, Search, Sparkles, Trash2, X, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CreateInvestigationModal } from "./components/create-investigation-modal";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { AdvancedSearchModal, ActiveFiltersChips } from "./components/advanced-search-modal";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { getNarratives, getSignals, getSources, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta, bulkDeleteSignals, bulkAnalyzeSignals, bulkCreateAlertsFromSignals, searchSignals, fetchLatestSignals, downloadSignalsExport, type AdvancedSearchFilters, type SearchSignalsResponse } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { DemoBanner } from "@/components/ui/demo-banner";
import { pickL } from "@/lib/use-l";
import { PlatformIcon } from "@/components/ui/platform-icon";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Sentiment = "NEGATIVE" | "POSITIVE" | "NEUTRAL" | "MIXED" | "UNANALYZED";
type SignalFilter = "all" | "negative" | "positive" | "neutral" | "mixed";
type SourceKey = "web" | "x" | "tiktok" | "instagram" | "facebook" | "playstore" | "appstore" | "ticket";

type SignalRow = {
  id: string;
  title: string;
  sentimentTone: Exclude<Tone, "blue">;
  publisher: string;
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
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#3B52F5]", border: "border-[#E6EAF2]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#6E44E8]", border: "border-[#E6EAF2]" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#047857]", border: "border-[#E6EAF2]" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#C81E1E]", border: "border-[#E6EAF2]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#A04606]", border: "border-[#E6EAF2]" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-[#5A6478]", border: "border-slate-200" },
};




// Date and time: the table spans days, so a bare clock time would be ambiguous.
function sameText(content: string, title: string) {
  const norm = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
  const head = norm(title).slice(0, 48);
  return head.length > 0 && norm(content).startsWith(head);
}

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
      // News items often carry the headline as their content ("Headline  Publisher"); repeating it adds
      // nothing, so the snippet is shown only when it says more than the title.
      desc: signal.content && !sameText(signal.content, title) ? signal.content : "",
      // Publisher (stored as author by ingestion) first, then the collection platform.
      tags: [...(signal.author ? [signal.author] : []), signal.platform || t("fallbackUnknownSource")],
      publisher: signal.author || (signal.platform === "news" ? pickL("News", "Berita") : signal.platform) || t("fallbackUnknownSource"),
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
  const uiLanguage = useUiStore((state) => state.language);
  const L = (en: string, id: string) => (uiLanguage === "id" ? id : en);
  const num = (n: number) => n.toLocaleString(uiLanguage === "id" ? "id-ID" : "en-US");

  const total = meta?.metrics?.totalSignals24h ?? 0;
  const negative = meta?.metrics?.negativeSignals24h ?? 0;
  const positive = meta?.metrics?.positiveSignals24h ?? 0;
  const critical = meta?.metrics?.criticalSignals24h ?? 0;
  // Neutral, mixed and not-yet-analysed records together.
  const other = Math.max(0, total - positive - negative);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  // Same rule as the Overview verdict: net (positive − negative) share of the day's records.
  const net = total > 0 ? ((positive - negative) / total) * 100 : 0;
  const verdict = total === 0
    ? { word: L("No data", "Belum ada data"), color: "#5A6478", bg: "#F1F4FA" }
    : net <= -15 ? { word: L("Negative", "Negatif"), color: "#C81E1E", bg: "#FDECEC" }
      : net >= 15 ? { word: L("Positive", "Positif"), color: "#047857", bg: "#E5F6EE" }
        : { word: L("Balanced", "Seimbang"), color: "#31406B", bg: "#EEF1F8" };
  const aiSummary = meta?.aiSummary;
  const headline = aiSummary ? aiSummary.content[uiLanguage as "en" | "id"] || aiSummary.content.en : null;
  const advice = aiSummary ? aiSummary.insight[uiLanguage as "en" | "id"] || aiSummary.insight.en : null;

  const segments = [
    { key: "neg", label: L("Negative", "Negatif"), value: negative, color: "#E5484D" },
    { key: "pos", label: L("Positive", "Positif"), value: positive, color: "#12A66A" },
    { key: "other", label: L("Neutral & other", "Netral & lainnya"), value: other, color: "#B8C0D4" },
  ];
  const tiles = [
    { key: "total", label: L("Signals, 24 h", "Sinyal 24 jam"), value: num(total), sub: L("collected today", "masuk hari ini"), tone: "#465FFF", rgb: "70,95,255" },
    { key: "neg", label: L("Negative", "Negatif"), value: num(negative), sub: `${pct(negative)}% ${L("of today", "dari hari ini")}`, tone: "#C81E1E", rgb: "229,72,77" },
    { key: "crit", label: L("Critical alerts", "Peringatan kritis"), value: num(critical), sub: critical > 0 ? L("handle first", "tangani dulu") : L("none open", "tidak ada"), tone: critical > 0 ? "#A04606" : "#5A6478", rgb: critical > 0 ? "245,158,11" : "100,116,139" },
    { key: "pos", label: L("Positive", "Positif"), value: num(positive), sub: `${pct(positive)}% ${L("of today", "dari hari ini")}`, tone: "#047857", rgb: "18,166,106" },
  ];

  return (
    <Panel className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{L("Today at a glance", "Ringkasan hari ini")}</h2>
            <span className="rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#6E44E8]">{L("Summarised by AI", "Diringkas AI")}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-[10px] px-3 py-1.5 text-[20px] font-black leading-none tracking-[-0.03em]" style={{ color: verdict.color, background: verdict.bg }}>{verdict.word}</span>
            <span className="text-[13px] font-bold text-[#3A4566]">{L(`overall tone of ${num(total)} signals in 24 h`, `nada keseluruhan dari ${num(total)} sinyal 24 jam`)}</span>
          </div>

          {total > 0 ? (
            <div className="mt-4">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[#EEF1F7]">
                {segments.map((seg) => seg.value > 0 ? <span key={seg.key} style={{ width: `${pct(seg.value)}%`, background: seg.color }} title={`${seg.label}: ${seg.value}`} /> : null)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-bold text-[#3A4566]">
                {segments.map((seg) => (
                  <span key={seg.key} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: seg.color }} />
                    {seg.label} <b className="font-black text-[#101334]">{seg.value}</b> <span className="text-[#5A6478]">({pct(seg.value)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {headline ? <p className="mt-4 line-clamp-3 text-[14px] font-bold leading-6 text-[#101334]" title={headline}>{headline}</p> : (
            <p className="mt-4 text-[13px] font-semibold text-[#5A6478]">{L("No signals in the last 24 hours yet.", "Belum ada sinyal dalam 24 jam terakhir.")}</p>
          )}
          {advice ? (
            <div className="mt-3 rounded-[12px] bg-[#101334] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#A9B4FF]">{L("Suggested next step", "Saran langkah")}</p>
              <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-white" title={advice}>{advice}</p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 bg-[#F7F8FC] p-5">
          {tiles.map((tile) => (
            <div key={tile.key} className="flex min-w-0 flex-col justify-between rounded-[12px] bg-white p-4 shadow-[0_2px_10px_rgba(16,24,40,0.05)]" style={{ backgroundImage: `linear-gradient(160deg, rgba(${tile.rgb}, 0.10), rgba(${tile.rgb}, 0.02) 60%)` }}>
              <p className="text-[11px] font-black uppercase tracking-[0.06em]" style={{ color: tile.tone }}>{tile.label}</p>
              <p className="mt-2 text-[32px] font-black leading-none tracking-[-0.045em] text-[#101334]">{tile.value}</p>
              <p className="mt-2 text-[11px] font-bold text-[#5A6478]">{tile.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function SentimentIcon({ sentiment: _sentiment, tone: _tone }: { sentiment: Sentiment; tone: SignalRow["sentimentTone"] }) {
  return null;
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const styles: Record<Sentiment, string> = {
    NEGATIVE: "bg-[#EF4444]/10 text-[#C81E1E]",
    POSITIVE: "bg-[#10B981]/10 text-[#047857]",
    NEUTRAL: "bg-slate-100 text-slate-600",
    MIXED: "bg-[#8B5CFF]/10 text-[#6E44E8]",
    UNANALYZED: "border border-dashed border-slate-300 bg-white text-[#5A6478]",
  };
  const labels: Record<Sentiment, [string, string]> = {
    NEGATIVE: ["Negative", "Negatif"],
    POSITIVE: ["Positive", "Positif"],
    NEUTRAL: ["Neutral", "Netral"],
    MIXED: ["Mixed", "Campuran"],
    UNANALYZED: ["Not analysed", "Belum dianalisis"],
  };
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-black", styles[sentiment])}>{pickL(...labels[sentiment])}</span>;
}


function AnalysisBadge({ status, confidence }: { status: "analyzed" | "unanalyzed"; confidence: number | null }) {
  if (status !== "analyzed") return <span className="text-[12px] font-bold text-[#8A93AD]">{pickL("Not yet", "Belum")}</span>;
  return <span className="text-[12px] font-black text-[#3B52F5]">{confidence === null ? pickL("Done", "Selesai") : `${Math.round(confidence * 100)}%`}</span>;
}


function SignalsTable({ activeFilter, setActiveFilter, query, setQuery, rows, footerText, pagination, onPageChange, isFetching, className, tTimeRange: _tTimeRange, tSignals, onInvestigate, onGenerateActionPlan, selectedIds, onSelectionChange, onBulkAnalyze, onBulkDelete, onBulkCreateAlert, isBulkProcessing }: { activeFilter: SignalFilter; setActiveFilter: (value: SignalFilter) => void; query: string; setQuery: (value: string) => void; rows: SignalRow[]; footerText: string; pagination?: PaginationInfo | null; onPageChange: (page: number) => void; isFetching?: boolean; className?: string; tTimeRange: (key: string) => string; tSignals: (key: string) => string; onInvestigate: (row: SignalRow) => void; onGenerateActionPlan?: (row: SignalRow) => void; selectedIds: Set<string>; onSelectionChange: (ids: Set<string>) => void; onBulkAnalyze: () => void; onBulkDelete: () => void; onBulkCreateAlert: () => void; isBulkProcessing: boolean }) {
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
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-transparent bg-[#EEF2FF] px-4 py-2.5">
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
        {/* Fixed columns that share the frame's width: nothing scrolls sideways; long text wraps to two lines. */}
        <div className="hidden flex-1 flex-col md:flex">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-10" />
              <col className="w-[32%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[17%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E6EAF2] bg-[#FBFCFF] text-[10px] font-black uppercase tracking-[0.06em] text-[#5F6B94]">
                <th className="px-2.5 py-3">
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
                {[tSignals("headerSignal"), pickL("Media", "Media"), tSignals("headerSentiment"), tSignals("headerRelatedNarrative"), pickL("AI confidence", "Keyakinan AI"), tSignals("headerPublished"), tSignals("headerAction")].map((header) => <th key={header} scope="col" className="px-2.5 py-3 leading-tight">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F7]">
              {rows.map((row) => (
                <tr key={row.id} className={cn("transition hover:bg-[#F8FAFF]", row.sentiment === "NEGATIVE" && "bg-[#FDF0F0]", selectedIds.has(row.id) && "bg-[#EEF2FF]")}>
                  <td className="px-2.5 py-3 align-middle">
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
                  <td className="px-2.5 py-3">
                    {/* One line per record: the headline opens the original article. */}
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noopener noreferrer" title={row.title} className="line-clamp-2 break-words text-[13px] font-bold leading-snug text-navy hover:text-[#3B52F5] hover:underline">{row.title}</a>
                    ) : (
                      <span title={row.title} className="line-clamp-2 break-words text-[13px] font-bold leading-snug text-navy">{row.title}</span>
                    )}
                  </td>
                  <td className="px-2.5 py-3 align-middle"><span className="line-clamp-2 break-words text-[12px] font-bold leading-snug text-[#31406B]" title={row.publisher}>{row.publisher}</span></td>
                  <td className="px-2.5 py-3 align-middle"><SentimentBadge sentiment={row.sentiment} /></td>
                  <td className="px-2.5 py-3 align-middle">
                    {row.narratives[0] ? (
                      <Link href={monitoringHref({ narrative: row.narratives[0].id })} className="line-clamp-2 break-words text-[12px] font-bold leading-snug text-[#3B52F5] hover:underline" title={row.relatedNarrative}>
                        {row.relatedNarrative}{row.narrativeCount > 1 ? ` +${row.narrativeCount - 1}` : ""}
                      </Link>
                    ) : (
                      <span className="block text-[12px] font-bold text-[#8A93AD]">—</span>
                    )}
                  </td>
                  <td className="px-2.5 py-3 align-middle"><AnalysisBadge status={row.analysisStatus} confidence={row.analysisConfidence} /></td>
                  <td className="px-2.5 py-3 align-middle text-[12px] font-bold leading-snug text-[#31406B]">{row.time}</td>
                  <td className="px-2.5 py-3 align-middle">
                    {/* One button per row: a negative or mixed record needs checking, a positive or neutral one a plan. */}
                    {row.sentiment === "NEGATIVE" || row.sentiment === "MIXED" ? (
                      <button type="button" onClick={() => onInvestigate(row)} className="inline-flex h-8 w-full items-center justify-center rounded-[8px] bg-[#465FFF] px-2 text-[11px] font-black text-white transition hover:bg-[#3147E8]">
                        {tSignals("investigate")}
                      </button>
                    ) : (
                      <button type="button" onClick={() => onGenerateActionPlan?.(row)} title={t("planTitle")} className="inline-flex h-8 w-full items-center justify-center rounded-[8px] bg-[#EEF1FF] px-2 text-[11px] font-black text-[#3B52F5] transition hover:bg-[#E1E6FF]">
                        {t("plan")}
                      </button>
                    )}
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

/** Severity, priority and status codes from the API, in the UI language. */
function codeLabel(code: string | null | undefined) {
  const map: Record<string, [string, string]> = {
    critical: ["Critical", "Kritis"], high: ["High", "Tinggi"], medium: ["Medium", "Sedang"], low: ["Low", "Rendah"], info: ["Info", "Info"],
    open: ["Open", "Terbuka"], acknowledged: ["In progress", "Ditangani"], investigating: ["In progress", "Ditangani"], in_progress: ["In progress", "Ditangani"],
    resolved: ["Resolved", "Selesai"], closed: ["Closed", "Ditutup"], pending: ["Pending", "Menunggu"],
  };
  const pair = map[String(code || "").toLowerCase()];
  return pair ? pickL(pair[0], pair[1]) : code ?? "";
}

function FollowUpPanel({ data }: { data?: SignalsMeta["followUps"] }) {
  const t = useTranslations("Signals.followUp");
  const hasData = data && data.length > 0;

  return (
    <Panel className="p-4">
      <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
      
      {!hasData && data !== undefined ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {(data || []).map((item, keyIdx) => {
            const style = toneStyles[item.tone as Tone];
            return (
              <div key={`${item.title}:${keyIdx}`} className={cn("grid grid-cols-1 gap-3 rounded-[12px] border p-3 sm:grid-cols-[minmax(0,1fr)_auto]", item.tone === "red" ? "border-transparent bg-[#FFF5F5]" : item.tone === "amber" ? "border-transparent bg-[#FFF9F0]" : "border-transparent bg-[#F1FCF6]")}>
                <span className="min-w-0"><span className="line-clamp-2 block text-[12px] font-black leading-snug text-[#101334]" title={item.title}>{item.title}</span><span className="mt-1 block text-[10px] font-bold text-[#58648C]">{item.meta}</span></span>
                <span className="text-left sm:text-right"><span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", style.soft, style.text)}>{codeLabel(item.badge)}</span><span className="mt-2 block text-[10px] font-bold text-[#31406B]">{item.time}</span></span>
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

const PLATFORM_NAMES: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", twitter: "X", x: "X", threads: "Threads", reddit: "Reddit", news: "Berita online", linkedin: "LinkedIn" };

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
        </div>
        <span className="inline-flex h-7 shrink-0 whitespace-nowrap items-center rounded-full bg-[#F1F4FA] px-3 text-[10px] font-black text-[#53608C]">
          {t("timeframe")}
        </span>
      </div>

      {!hasData ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-1 md:grid-cols-1 xl:grid-cols-1">
          <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full" style={{ background: `conic-gradient(${conicGradient})` }}>
            <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
            <span className="relative text-center">
              <b className="block text-[22px] font-black text-[#101334]">{total.toLocaleString()}</b>
              <span className="text-[10px] font-bold text-[#5F6B94]">{t("totalLabel")}</span>
            </span>
          </div>
          <div className="space-y-2.5 self-center">
            {items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-[12px] font-bold">
                <span className="flex min-w-0 items-center gap-2 text-[#101334]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <PlatformIcon platform={item.name} className="size-4" />
                  <span className="truncate">{PLATFORM_NAMES[item.name.toLowerCase()] ?? item.name}</span>
                </span>
                <span className="shrink-0 font-black text-[#101334]">{item.value}</span>
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
  const values = data ?? [];
  const hasNonZero = values.some((v) => v > 0);
  const max = Math.max(1, ...values);
  const peakIndex = values.indexOf(Math.max(...values, 0));
  const total = values.reduce((sum, v) => sum + v, 0);
  const every = Math.max(1, Math.ceil(values.length / 6));

  return (
    <Panel className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-black text-[#101334]">{t("title")} <span className="text-[11px] font-bold text-[#5F6B94]">{t("period")}</span></h3>
        {hasNonZero ? <span className="text-[12px] font-black text-[#101334]">{total.toLocaleString(uiLanguage)} <span className="font-bold text-[#5F6B94]">{t("signalsLabel")}</span></span> : null}
      </div>

      {isLoading ? (
        <div className="mt-5 h-[170px] animate-pulse rounded-[12px] bg-[#F4F6FC]" />
      ) : !hasNonZero ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-1 rounded-[12px] bg-[#F4F6FC] py-8 text-center">
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4">
          {peakIndex >= 0 ? (
            <p className="mb-2 text-[11px] font-bold text-[#5F6B94]">
              {pickL("Busiest hour", "Jam tersibuk")} <b className="font-black text-[#101334]">{labels?.[peakIndex] ?? ""}</b> · {values[peakIndex].toLocaleString(uiLanguage)} {t("signalsLabel")}
            </p>
          ) : null}
          <div className="flex h-[140px] items-end gap-[3px] rounded-[12px] bg-[#F7F8FC] px-2 pt-3">
            {values.map((v, i) => (
              <div key={i} className="group relative flex h-full flex-1 items-end" title={`${labels?.[i] ?? ""} · ${v} ${t("signalsLabel")}`}>
                <div
                  className="w-full rounded-t-[4px] transition group-hover:opacity-80"
                  style={{ height: v > 0 ? `${Math.max(6, (v / max) * 100)}%` : "2px", background: i === peakIndex ? "#465FFF" : v > 0 ? "#9AA9FF" : "#E3E7F1" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[3px] px-2 text-[10px] font-bold text-[#5F6B94]">
            {values.map((_, i) => <span key={i} className="flex-1 text-center">{i % every === 0 ? labels?.[i] ?? "" : ""}</span>)}
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
        </div>
        <Link href="/workspace/cases" className="text-[11px] font-black text-[#3B52F5]">{t("viewAll")}</Link>
      </div>

      {!hasData ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#647099]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((item, keyIdx) => {
            return (
              <div key={`${item.title}:${keyIdx}`} className="grid grid-cols-1 gap-3 rounded-[11px] bg-[#F4F6FC] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[12px] font-black leading-snug text-[#101334]" title={item.title}>{item.title}</span>
                  <span className="mt-1 block text-[10px] font-bold text-[#5F6B94]">{item.meta}</span>
                </span>
                <span className={cn("h-fit w-fit rounded-full px-2 py-1 text-[9px] font-black", item.badge === "Investigating" || item.badge === "open" ? "bg-[#465FFF]/10 text-[#3B52F5]" : "bg-[#F59E0B]/12 text-[#A04606]")}>{codeLabel(item.badge)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function RelatedNarrativeCard({ n }: { n: { id: string; title: string; signalCount: number; sentiment: string; velocity: string; confidence: number | null } }) {
  const tone = n.sentiment.toLowerCase();
  const look = tone.includes("neg")
    ? { bg: "#FDECEC", chip: "bg-[#C81E1E] text-white", word: pickL("Negative", "Negatif") }
    : tone.includes("pos")
      ? { bg: "#E5F6EE", chip: "bg-[#047857] text-white", word: pickL("Positive", "Positif") }
      : tone.includes("mix")
        ? { bg: "#F1ECFF", chip: "bg-[#6E44E8] text-white", word: pickL("Mixed", "Campuran") }
        : { bg: "#EEF1F8", chip: "bg-[#5A6478] text-white", word: pickL("Neutral", "Netral") };
  const rising = /^\+/.test(n.velocity) && n.velocity !== "+0%";
  return (
    <Link href={issueHref(n.id)} className="flex flex-col justify-between rounded-[12px] p-4 transition hover:brightness-[0.98]" style={{ background: look.bg }}>
      <p className="line-clamp-2 text-[13px] font-black leading-snug text-[#101334]">{n.title}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span>
          <b className="block text-[26px] font-black leading-none tracking-[-0.04em] text-[#101334]">{n.signalCount}</b>
          <span className="text-[11px] font-bold text-[#5A6478]">{pickL("signals", "sinyal")}</span>
        </span>
        <span className="flex flex-wrap justify-end gap-1.5 text-[11px] font-black">
          <span className={cn("rounded-full px-2.5 py-1", look.chip)}>{look.word}</span>
          {n.velocity ? <span className={cn("rounded-full bg-white px-2.5 py-1", rising ? "text-[#B45309]" : "text-[#31406B]")}>{n.velocity} {pickL("24 h", "24 jam")}</span> : null}
        </span>
      </div>
    </Link>
  );
}

/** Live workspaces: real narrative clusters only (no sample cards). */
function LiveRelatedNarratives() {
  const t = useTranslations("Signals");
  const q = useQuery({ queryKey: ["signals-related-narratives"], queryFn: () => getNarratives({ limit: 3 }), staleTime: 60 * 1000 });
  const items = q.data?.data ?? [];
  return (
    <div className="mt-6 rounded-[14px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-[16px] font-black tracking-[-0.03em] text-[#101334]">{t("relatedNarratives")}</h3>
        <span title={pickL("Narrative clusters built from your workspace's signals", "Klaster narasi yang disusun dari sinyal workspace Anda")} className="cursor-help text-[#647099]"><Info size={13} /></span>
      </div>
      {q.isLoading ? (
        <p className="text-[12px] font-bold text-[#5A6478]">{pickL("Loading narratives…", "Memuat narasi…")}</p>
      ) : q.data === null ? (
        <p className="text-[12px] font-bold text-amber-700">{pickL("Narratives could not be loaded.", "Narasi gagal dimuat.")}</p>
      ) : items.length === 0 ? (
        <p className="text-[12px] font-bold text-[#5A6478]">{pickL("No narrative clusters yet. They form once enough related signals are ingested.", "Belum ada narasi. Narasi terbentuk setelah cukup banyak sinyal terkait masuk.")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((n) => (
            <RelatedNarrativeCard key={n.id} n={n} />
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
    const { q, ...fromUrl } = parseMonitoringFilters(window.location.search);
    setFilters(fromUrl);
    if (fromUrl.sentiment) setActiveFilter(fromUrl.sentiment);
    if (q) setQuery(q);
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
        <div><h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{t("title")}</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFetchLatestSignals}
            disabled={isFetchingSignals}
            title={t("fetchTitle")}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#31406B] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetchingSignals ? t("fetching") : t("fetchLatest")}
          </button>
          <button onClick={() => setIsAdvancedSearchOpen(true)} className={cn("flex h-10 items-center justify-center gap-2 rounded-[8px] border px-4 text-[12px] font-black transition", isAdvancedSearchActive ? "border-[#465FFF] bg-[#465FFF]/10 text-[#3B52F5]" : "border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#465FFF]/30 hover:bg-[#F8FAFF]")}>
            {t("advancedSearch") || "Filters"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={!!isExporting}
            title={t("exportCsv")}
            className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-black text-[#31406B] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF] disabled:opacity-50"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            disabled={!!isExporting}
            title={t("exportXlsx")}
            className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-black text-[#31406B] shadow-sm transition hover:border-[#465FFF]/30 hover:bg-[#F8FAFF] disabled:opacity-50"
          >
            Excel
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm">{t("createInvestigation")}</button>
        </div>
      </header>

      <CreateInvestigationModal open={isCreateModalOpen} onOpenChange={handleCreateModalChange} signalId={selectedSignal?.id} signalTitle={selectedSignal?.title} />
      <CreateActionPlanModal
        open={isActionPlanModalOpen}
        onOpenChange={handleActionPlanModalChange}
        initialSignalId={selectedSignalForAction?.id}
        initialSignalTitle={selectedSignalForAction?.title}
        initialStrategyType={selectedSignalForAction?.sentiment?.toLowerCase() === "negative" ? "crisis_response" : selectedSignalForAction?.sentiment?.toLowerCase() === "positive" ? "content_strategy" : "pr_response"}
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

      {/* The side panels sit beside the table only on wide screens; otherwise below it, so the table keeps a full row. */}
      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_336px]">
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
        <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-1">
            {isMetaUnavailable ? <DashboardErrorState title={tSignals("metaErrorTitle")} description={tSignals("metaErrorDesc")} onRetry={() => void metaQuery.refetch()} minHeight="min-h-[150px]" /> : null}
            <FollowUpPanel data={meta?.followUps} />
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
