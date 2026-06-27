"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/store/useUiStore";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  FileText,
  Flag,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import {
  AppStore,
  Facebook,
  GooglePlay,
  Instagram,
  TikTokDark,
} from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";
import { CreateInvestigationModal } from "./components/create-investigation-modal";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { getDateRangeOptions, getSignals, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta } from "@/lib/api-service";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Sentiment = "NEGATIVE" | "POSITIVE" | "NEUTRAL" | "MIXED";
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
};

const signalApiLimit = 20;

const aiAgentImage = "/mainapp/signals-ai-agent.png";

const toneStyles: Record<Tone, { color: string; rgb: string; soft: string; text: string; border: string }> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#465FFF]", border: "border-[#465FFF]/15" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#8B5CFF]", border: "border-[#8B5CFF]/15" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/15" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/15" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/15" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

const sourceIcons = {
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
  ticket: <span className="flex size-5 items-center justify-center rounded-[5px] bg-[#8B5CFF]/10 text-[#8B5CFF]"><FileText size={12} /></span>,
};



function compactTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function sourceFromPlatform(platform: string | null): SourceKey {
  const value = platform?.toLowerCase() ?? "";
  if (value.includes("tiktok")) return "tiktok";
  if (value.includes("instagram")) return "instagram";
  if (value.includes("facebook")) return "facebook";
  if (value.includes("play") || value.includes("android")) return "playstore";
  if (value.includes("app") || value.includes("ios")) return "appstore";
  if (value.includes("ticket") || value.includes("support")) return "ticket";
  return "x";
}

function sentimentFromApi(sentiment: string | null): Sentiment {
  const value = sentiment?.toLowerCase() ?? "";
  if (value.includes("positive")) return "POSITIVE";
  if (value.includes("mixed")) return "MIXED";
  if (value.includes("neutral")) return "NEUTRAL";
  return "NEGATIVE";
}

function buildApiSignalRows(apiSignals: Signal[], t: (key: string) => string): SignalRow[] {
  return apiSignals.map((signal) => {
    const sentiment = sentimentFromApi(signal.sentiment);
    const source = sourceFromPlatform(signal.platform);
    const sentimentTone = sentiment === "NEGATIVE" ? "red" : sentiment === "POSITIVE" ? "green" : sentiment === "NEUTRAL" ? "slate" : "purple";
    const title = signal.title || signal.content.slice(0, 72) || t("fallbackUntitled");

    return {
      id: signal.id,
      title,
      sentimentTone,
      desc: signal.content || t("fallbackNoContent"),
      tags: [signal.platform || t("fallbackUnknownSource")],
      sourceType: signal.platform || t("fallbackLiveSource"),
      sources: [source],
      sentiment,
      time: compactTime(signal.publishedAt || signal.capturedAt),
      captured: compactTime(signal.capturedAt),
    };
  });
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>{children}</section>;
}

function SignalAgentImage() {
  return (
    <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#465FFF]/10 bg-linear-to-b from-[#EEF0FF] via-white to-[#F1EEFF] shadow-[inset_0_0_24px_rgba(70,95,255,0.10)]">
      <Image src={aiAgentImage} alt="AI signals assistant illustration" width={96} height={96} sizes="96px" unoptimized className="relative h-full w-full object-cover" style={{ transform: "scale(1.35)" }} />
    </div>
  );
}

function SummaryPanel({ meta }: { meta?: SignalsMeta }) {
  const t = useTranslations("Signals.summary");
  const uiLanguage = useUiStore((state) => state.language);
  
  const total = meta?.metrics?.totalSignals24h ?? 0;
  const negative = meta?.metrics?.negativeSignals24h ?? 0;
  const critical = meta?.metrics?.criticalSignals24h ?? 0;

  const hasData = total > 0;
  const aiSummary = meta?.aiSummary;

  const metricCards = [
    { label: t("total"), value: total.toLocaleString(uiLanguage), helper: t("trendLabel"), tone: "blue" as Tone },
    { label: t("negative"), value: negative.toLocaleString(uiLanguage), helper: t("trendLabel"), tone: "red" as Tone },
    { label: t("critical"), value: critical.toLocaleString(uiLanguage), helper: t("alertBackedLabel"), tone: "amber" as Tone },
  ];

  return (
    <Panel className="overflow-hidden p-5">
      <div className="grid gap-5 lg:grid-cols-[96px_1fr_1.35fr]">
        <SignalAgentImage />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#8B5CFF]"><Sparkles size={12} /> {t("aiGenerated")}</span>
          </div>
          {hasData && aiSummary ? (
            <>
              <p className="mt-3 text-[13.5px] font-black leading-relaxed text-[#101334]">{aiSummary.content[uiLanguage as 'en' | 'id'] || aiSummary.content.en}</p>
              <p className="mt-2 max-w-[560px] text-[11.5px] font-bold leading-relaxed text-[#58648C]">{aiSummary.insight[uiLanguage as 'en' | 'id'] || aiSummary.insight.en}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[13.5px] font-black leading-relaxed text-[#101334]">{t("noData")}</p>
              <p className="mt-2 max-w-[560px] text-[11.5px] font-bold leading-relaxed text-[#58648C]">{t("noDataDesc")}</p>
            </>
          )}
        </div>
        <div className="grid gap-4 border-t border-[#EDF1F7] pt-4 md:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
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
      <p className="text-[11px] font-extrabold text-[#68739F]">{label}</p>
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
    NEGATIVE: "bg-[#EF4444]/10 text-[#EF4444]",
    POSITIVE: "bg-[#10B981]/10 text-[#0C9B69]",
    NEUTRAL: "bg-slate-100 text-slate-600",
    MIXED: "bg-[#8B5CFF]/10 text-[#8B5CFF]",
  };
  return <span className={cn("rounded-full px-2 py-1 text-[9.5px] font-black tracking-[0.12em]", styles[sentiment])}>{sentiment}</span>;
}

function TagBadge({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    "Reputation Risk": "bg-[#EF4444]/10 text-[#EF4444]",
    "Customer Experience": "bg-[#F97316]/10 text-[#F97316]",
    "Operational Risk": "bg-[#F59E0B]/12 text-[#D97706]",
    "Marketing Opportunity": "bg-[#10B981]/10 text-[#0C9B69]",
    "+1": "bg-[#EEF2FF] text-[#465FFF]",
  };
  return <span className={cn("rounded-full px-2 py-1 text-[9px] font-black", styles[tag] ?? "bg-slate-100 text-slate-500")}>{tag}</span>;
}

function SourceIconList({ row }: { row: SignalRow }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black text-[#68739F]">{row.sourceType}</p>
      <div className="flex items-center gap-1.5">
        {row.sources.map((source) => <span key={source} className="flex size-5 items-center justify-center rounded-[6px] border border-[#E6EAF2] bg-white">{sourceIcons[source]}</span>)}
      </div>
    </div>
  );
}

function SignalsTable({ activeFilter, setActiveFilter, query, setQuery, rows, footerText, pagination, onPageChange, isFetching, className, tTimeRange, tSignals, onInvestigate }: { activeFilter: SignalFilter; setActiveFilter: (value: SignalFilter) => void; query: string; setQuery: (value: string) => void; rows: SignalRow[]; footerText: string; pagination?: PaginationInfo | null; onPageChange: (page: number) => void; isFetching?: boolean; className?: string; tTimeRange: (key: string) => string; tSignals: (key: string) => string; onInvestigate: (row: SignalRow) => void }) {
  const tabs: Array<{ value: SignalFilter; label: string }> = [
    { value: "all", label: tSignals("filterAll") },
    { value: "negative", label: tSignals("filterNegative") },
    { value: "positive", label: tSignals("filterPositive") },
    { value: "neutral", label: tSignals("filterNeutral") },
    { value: "mixed", label: tSignals("filterMixed") },
  ];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab.value} type="button" onClick={() => setActiveFilter(tab.value)} className={cn("h-9 rounded-full px-4 text-[12px] font-black transition", activeFilter === tab.value ? "bg-[#465FFF] text-white shadow-[0_10px_22px_rgba(70,95,255,0.22)]" : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#31406B] hover:bg-white")}>{tab.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#10B981]" />
            </span>
            <span className="text-[10px] font-black text-[#065F46]">{tTimeRange("timeRange24h")}</span>
          </div>
          <label className="relative block w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B95B8]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder={tSignals("search")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] pl-9 pr-3 text-[11px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white" />
          </label>
          <span className="inline-flex h-9 items-center rounded-[8px] border border-[#DDE3EF] bg-gradient-to-r from-white to-[#FAFBFF] px-3 text-[11px] font-black text-[#31406B] shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
            {tSignals("sortLatest")}
          </span>
        </div>
      </div>

      <Panel className="overflow-hidden p-0 xl:min-h-[610px] flex flex-col">
        <div className="overflow-x-auto flex-1 flex flex-col">
          <table className="w-full min-w-[780px] border-collapse text-left flex-1 h-full">
            <thead>
              <tr className="border-b border-[#E6EAF2] bg-[#FBFCFF] text-[10px] font-black uppercase tracking-[0.17em] text-[#68739F]">
                {[tSignals("headerSignal"), tSignals("headerSource"), tSignals("headerSentiment"), tSignals("headerPublished"), tSignals("headerCaptured"), tSignals("headerAction")].map((header) => <th key={header} className="px-3.5 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F7]">
              {rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-[#F8FAFF]">
                  <td className="max-w-[380px] px-3.5 py-4">
                    <div className="flex items-start gap-3">
                      <SentimentIcon sentiment={row.sentiment} tone={row.sentimentTone} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-[12.5px] font-black leading-snug text-[#101334]">{row.title}</span></div>
                        <p className="mt-1 text-[11px] font-bold leading-snug text-[#68739F]">{row.desc}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{row.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-4 align-middle"><SourceIconList row={row} /></td>
                  <td className="px-3.5 py-4 align-middle"><SentimentBadge sentiment={row.sentiment} /></td>
                  <td className="px-3.5 py-4 align-middle"><span className="block text-[11px] font-black text-[#31406B]">{row.time}</span></td>
                  <td className="px-3.5 py-4 align-middle"><span className="block text-[11px] font-black text-[#31406B]">{row.captured}</span></td>
                  <td className="px-3.5 py-4 text-right align-middle"><button type="button" onClick={() => onInvestigate(row)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-[#465FFF] px-3 text-[10.5px] font-black text-white shadow-[0_8px_18px_rgba(70,95,255,0.18)] transition hover:bg-[#3147E8]"><Flag size={12} />{tSignals("investigate")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] px-4 py-3 sm:flex-row">
          <p className="text-[11px] font-bold text-[#68739F]">{footerText}</p>
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
      <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
      <p className="mt-1 text-[11.5px] font-bold text-[#68739F]">{t("desc")}</p>
      
      {!hasData && data !== undefined ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <ShieldCheck size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#8B95B8]">{t("emptyDesc")}</p>
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
        <Link href="/action-plans" className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#FBFCFF] text-[11px] font-black text-[#465FFF]">{t("action")} <ArrowRight size={13} /></Link>
      )}
    </Panel>
  );
}

function RecommendationPanel({ data }: { data?: SignalsMeta["recommendations"] }) {
  const t = useTranslations("Signals.recommendations");
  const hasData = data && data.length > 0;

  return (
    <Panel className="p-4">
      <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{t("title")}</h2>
      <p className="mt-1 text-[11.5px] font-bold text-[#68739F]">{t("desc")}</p>
      
      {!hasData && data !== undefined ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <Sparkles size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#8B95B8]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {(data || []).map((item) => {
            const style = toneStyles[item.tone as Tone];
            const Icon = item.icon || (item.tone === "purple" ? AlertTriangle : item.tone === "blue" ? ShieldCheck : Zap);
            return (
              <div key={item.title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-[11px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 sm:grid-cols-[32px_minmax(0,1fr)_auto]">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-[9px]", style.soft, style.text)}><Icon size={15} /></span>
                <span className="min-w-0"><span className="block truncate text-[11.5px] font-black text-[#101334]">{item.title}</span><span className="mt-1 block text-[10px] font-bold text-[#68739F]">{item.desc}</span></span>
                <span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[8.5px] font-black sm:col-start-auto", item.tone === "red" || item.tone === "purple" ? "bg-[#EF4444]/10 text-[#EF4444]" : item.tone === "blue" ? "bg-[#F59E0B]/12 text-[#D97706]" : "bg-[#10B981]/10 text-[#0C9B69]")}>{item.badge}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {hasData && (
        <Link href="/action-plans" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.22)]"><Briefcase size={14} />{t("action")}</Link>
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
          <h3 className="text-[15px] font-black text-[#101334]">{t("title")}</h3>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">{t("desc")}</p>
        </div>
        <button type="button" className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 text-[9px] font-black text-[#065F46] shadow-[0_1px_3px_rgba(16,185,129,0.1)]">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#10B981]" />
          </span>
          {t("timeframe")}
        </button>
      </div>

      {!hasData ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <AlertTriangle size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#8B95B8]">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-[136px_1fr] md:grid-cols-1 xl:grid-cols-[136px_1fr]">
          <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full" style={{ background: `conic-gradient(${conicGradient})` }}>
            <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
            <span className="relative text-center">
              <b className="block text-[22px] font-black text-[#101334]">{total.toLocaleString()}</b>
              <span className="text-[10px] font-bold text-[#68739F]">{t("totalLabel")}</span>
            </span>
          </div>
          <div className="space-y-2.5 self-center">
            {items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-2 text-[#31406B]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="text-[#68739F]">{item.value}</span>
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
      <h3 className="text-[15px] font-black text-[#101334]">{t("title")} <span className="text-[11px] font-bold text-[#68739F]">{t("period")}</span></h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">{t("desc")}</p>

      {isLoading ? (
        <div className="relative mt-5 h-[170px] overflow-hidden rounded-[12px] bg-linear-to-b from-white to-[#F8FAFF]">
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
            <AlertTriangle size={18} className="text-[#8B95B8]" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
            <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("emptyDesc")}</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5 h-[170px] overflow-hidden rounded-[12px] bg-linear-to-b from-white to-[#F8FAFF]">
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

          <div className="absolute inset-x-3 bottom-1 flex justify-between text-[10px] font-bold text-[#68739F]">
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
          <h3 className="text-[15px] font-black text-[#101334]">{t("title")}</h3>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">{t("desc")}</p>
        </div>
        <Link href="/cases" className="text-[11px] font-black text-[#465FFF]">{t("viewAll")}</Link>
      </div>

      {!hasData ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
          <ShieldCheck size={24} className="text-[#A0ABC0]" />
          <p className="text-[12px] font-bold text-[#58648C]">{t("emptyTitle")}</p>
          <p className="text-[10px] font-semibold text-[#8B95B8]">{t("emptyDesc")}</p>
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
                  <span className="mt-1 block text-[10px] font-bold text-[#68739F]">{item.meta}</span>
                </span>
                <span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[9px] font-black sm:col-start-auto", item.badge === "Investigating" || item.badge === "open" ? "bg-[#465FFF]/10 text-[#465FFF]" : "bg-[#F59E0B]/12 text-[#D97706]")}>{item.badge}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export default function SignalsPage() {
  const t = useTranslations("Signals");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<SignalRow | null>(null);
  const [activeFilter, setActiveFilter] = useState<SignalFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const dateRange = getDateRangeOptions("24h");
  
  const metaQuery = useQuery({
    queryKey: ["signalsMeta"],
    queryFn: () => getSignalsMeta(),
    staleTime: 60 * 1000,
  });
  const meta = metaQuery.data || undefined;
  const isMetaUnavailable = metaQuery.data === null || metaQuery.isError;

  const apiSentimentFilter =
    activeFilter === "negative" ? "negative" :
    activeFilter === "positive" ? "positive" :
    activeFilter === "neutral" ? "neutral" :
    activeFilter === "mixed" ? "mixed" : undefined;

  const signalsQuery = useQuery({
    queryKey: ["signals", { keyword: deferredQuery, page, sentiment: apiSentimentFilter }],
    queryFn: () => getSignals({ page, limit: signalApiLimit, keyword: deferredQuery.trim() || undefined, sentiment: apiSentimentFilter, ...dateRange }),
    staleTime: 30 * 1000,
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleFilterChange = (value: SignalFilter) => {
    setActiveFilter(value);
    setPage(1);
  };

  const handleInvestigate = (row: SignalRow) => {
    setSelectedSignal(row);
    setIsCreateModalOpen(true);
  };

  const handleCreateModalChange = (open: boolean) => {
    setIsCreateModalOpen(open);
    if (!open) setSelectedSignal(null);
  };

  const tTimeRange = useTranslations("Signals");
  const tSignals = useTranslations("Signals");

  const liveRows = signalsQuery.data?.data ? buildApiSignalRows(signalsQuery.data.data, t) : [];
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
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("title")}</h1><p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("subtitle")}</p></div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] sm:w-fit"><Flag size={15} />{t("createInvestigation")}</button>
      </header>

      <CreateInvestigationModal open={isCreateModalOpen} onOpenChange={handleCreateModalChange} signalId={selectedSignal?.id} signalTitle={selectedSignal?.title} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SummaryPanel meta={meta} />
          {signalsQuery.isPending ? (
            <TableSkeleton rows={6} columns={6} className="xl:min-h-[610px]" />
          ) : signalsQuery.data && liveRows.length === 0 ? (
            <DashboardEmptyState title={t("emptyState.title")} description={t("emptyState.desc")} icon="search" minHeight="min-h-[420px]" />
          ) : (
            <>
              {isLiveUnavailable ? <DashboardErrorState title={tSignals("errorTitle")} description={tSignals("errorDesc")} onRetry={() => void signalsQuery.refetch()} minHeight="min-h-[150px]" /> : null}
              <SignalsTable activeFilter={activeFilter} setActiveFilter={handleFilterChange} query={query} setQuery={handleQueryChange} rows={rows} footerText={footerText} pagination={signalsQuery.data?.pagination} onPageChange={setPage} isFetching={signalsQuery.isFetching} className="flex-1" tTimeRange={tTimeRange} tSignals={tSignals} onInvestigate={handleInvestigate} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-4">
            {isMetaUnavailable ? <DashboardErrorState title={tSignals("metaErrorTitle")} description={tSignals("metaErrorDesc")} onRetry={() => void metaQuery.refetch()} minHeight="min-h-[150px]" /> : null}
            <FollowUpPanel data={meta?.followUps} />
            <RecommendationPanel data={meta?.recommendations} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr_1.18fr]">
        <SourceDonut data={meta?.sourceDistribution} totalSignals={meta?.totalSignals} />
        <TimelineChart data={meta?.timeline} labels={meta?.timelineLabels} />
        <InvestigationQueue data={meta?.investigationQueue} />
      </div>
    </div>
  );
}
