"use client";

import Image from "next/image";
import { useDeferredValue, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  ChevronDown,
  FileText,
  Flag,
  HelpCircle,
  MoreVertical,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  AppStore,
  Facebook,
  GooglePlay,
  Instagram,
  TikTokDark,
} from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton, formatPaginationSummary } from "@/components/dashboard/dashboard-states";
import { getDateRangeOptions, getSignals, type DateRangeKey, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta } from "@/lib/api-service";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM";
type Sentiment = "NEGATIVE" | "POSITIVE" | "MIXED";
type SourceKey = keyof typeof sourceIcons;

type SignalRow = {
  id: string;
  title: string;
  severity: Severity;
  severityTone: Exclude<Tone, "blue" | "slate">;
  desc: string;
  tags: string[];
  sourceType: string;
  sources: SourceKey[];
  sourceCount: number;
  sentiment: Sentiment;
  velocity: string;
  velocityPeriod: string;
  mentions: string;
  confidence: string;
  time: string;
  timeAgo: string;
  trend: number[];
};

const signalApiLimit = 20;
const timeRangeOptions: Array<{ label: string; value: DateRangeKey }> = [
  { label: "24 Jam", value: "24h" },
  { label: "7 Hari", value: "7d" },
  { label: "30 Hari", value: "30d" },
];

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

const signalRows: SignalRow[] = [
  {
    id: "SIG-001",
    title: "Payment delay complaints are rising",
    severity: "CRITICAL",
    severityTone: "red",
    desc: "Keluhan pembayaran tertunda meningkat signifikan di X/Twitter wilayah Jabodetabek sejak 08:00 WIB.",
    tags: ["Reputation Risk", "Customer Experience", "+1"],
    sourceType: "Social Media",
    sources: ["x", "tiktok"],
    sourceCount: 3,
    sentiment: "NEGATIVE",
    velocity: "+248%",
    velocityPeriod: "in 2 hours",
    mentions: "1.248",
    confidence: "94%",
    time: "10:23 WIB",
    timeAgo: "Baru saja",
    trend: [8, 12, 9, 18, 16, 31, 28, 45],
  },
  {
    id: "SIG-002",
    title: "Mobile app stability disruption",
    severity: "HIGH",
    severityTone: "amber",
    desc: "Pengguna melaporkan aplikasi sering crash saat melakukan transaksi.",
    tags: ["Operational Risk", "Customer Experience"],
    sourceType: "App Reviews",
    sources: ["playstore", "appstore"],
    sourceCount: 1,
    sentiment: "NEGATIVE",
    velocity: "+89%",
    velocityPeriod: "in 4 hours",
    mentions: "842",
    confidence: "89%",
    time: "09:45 WIB",
    timeAgo: "38m ago",
    trend: [9, 11, 10, 16, 14, 23, 18, 35],
  },
  {
    id: "SIG-003",
    title: "New promo receives positive response",
    severity: "MEDIUM",
    severityTone: "green",
    desc: "Promo cashback terbaru mendapatkan respon positif, banyak pengguna membagikan pengalaman mereka.",
    tags: ["Marketing Opportunity"],
    sourceType: "Social Media",
    sources: ["instagram", "facebook", "tiktok"],
    sourceCount: 2,
    sentiment: "POSITIVE",
    velocity: "+67%",
    velocityPeriod: "in 6 hours",
    mentions: "621",
    confidence: "87%",
    time: "09:10 WIB",
    timeAgo: "1h ago",
    trend: [7, 9, 8, 12, 11, 26, 14, 31],
  },
  {
    id: "SIG-004",
    title: "FAQ confusion around credit terms",
    severity: "MEDIUM",
    severityTone: "purple",
    desc: "Banyak pengguna bingung dengan syarat kredit baru pada fitur pembayaran.",
    tags: ["Customer Experience"],
    sourceType: "Support Tickets",
    sources: ["ticket"],
    sourceCount: 1,
    sentiment: "MIXED",
    velocity: "+32%",
    velocityPeriod: "in 5 hours",
    mentions: "398",
    confidence: "81%",
    time: "09:10 WIB",
    timeAgo: "1h ago",
    trend: [10, 11, 10, 14, 13, 18, 35, 20],
  },
];

const metrics = [
  { label: "Total Signals (24h)", value: "2.842", helper: "▲ 18,3% vs yesterday", tone: "blue", trend: [18, 21, 20, 29, 22, 25, 31, 26, 34] },
  { label: "Negative Signals", value: "1.248", helper: "▲ 24% vs yesterday", tone: "red", trend: [13, 15, 14, 19, 16, 22, 20, 18, 27] },
  { label: "Critical Signals", value: "128", helper: "▲ 12% vs yesterday", tone: "amber", trend: [8, 8, 10, 15, 11, 9, 12, 10, 21] },
] satisfies Array<{ label: string; value: string; helper: string; tone: Tone; trend: number[] }>;

const followUps = [
  { title: "Payment delay complaints are rising", badge: "CRITICAL", meta: "1.248 mentions • Confidence 94%", time: "10:23 WIB", tone: "red" },
  { title: "Mobile app stability disruption", badge: "HIGH", meta: "842 mentions • Confidence 89%", time: "09:45 WIB", tone: "amber" },
  { title: "New promo receives positive response", badge: "MEDIUM", meta: "621 mentions • Confidence 87%", time: "09:10 WIB", tone: "green" },
] satisfies Array<{ title: string; badge: string; meta: string; time: string; tone: Exclude<Tone, "blue" | "purple" | "slate"> }>;

const recommendations = [
  { title: "Investigasi keluhan payment delay", desc: "Periksa SLA dan sistem pembayaran", badge: "High Priority", tone: "red", icon: Zap },
  { title: "Buat klarifikasi publik proaktif", desc: "Cegah eskalasi sentimen negatif", badge: "High Priority", tone: "purple", icon: AlertTriangle },
  { title: "Escalate ke Ops Team", desc: "Masalah stabilitas aplikasi meningkat", badge: "Medium", tone: "blue", icon: ShieldCheck },
  { title: "Monitor topik syarat kredit", desc: "Pertimbangkan update FAQ", badge: "Low", tone: "green", icon: HelpCircle },
] satisfies Array<{ title: string; desc: string; badge: string; tone: Tone; icon: LucideIcon }>;

const sourceDistribution = [
  { name: "X / Twitter", value: "48% (1.364)", color: "#465FFF" },
  { name: "TikTok", value: "22% (625)", color: "#EF3F6B" },
  { name: "News", value: "14% (398)", color: "#10B981" },
  { name: "App Reviews", value: "10% (284)", color: "#8B5CFF" },
  { name: "Lainnya", value: "6% (171)", color: "#94A3B8" },
];

const timeline = [310, 420, 380, 460, 590, 520, 450, 620, 840, 1024, 890, 720, 650, 560, 910, 820, 740, 790];

function compactTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function stableTrend(seed: string) {
  const base = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0) || 41;
  return Array.from({ length: 8 }, (_, index) => 8 + ((base + index * 9) % 34));
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
  if (value.includes("mixed") || value.includes("neutral")) return "MIXED";
  return "NEGATIVE";
}

function buildApiSignalRows(apiSignals: Signal[]): SignalRow[] {
  return apiSignals.map((signal, index) => {
    const sentiment = sentimentFromApi(signal.sentiment);
    const source = sourceFromPlatform(signal.platform);
    const severity = sentiment === "NEGATIVE" && index < 2 ? (index === 0 ? "CRITICAL" : "HIGH") : "MEDIUM";
    const severityTone = severity === "CRITICAL" ? "red" : severity === "HIGH" ? "amber" : sentiment === "POSITIVE" ? "green" : "purple";
    const title = signal.title || signal.content.slice(0, 72) || "Untitled signal";

    return {
      id: signal.id,
      title,
      severity,
      severityTone,
      desc: signal.content || "Tidak ada ringkasan konten.",
      tags: [signal.platform || "Unknown Source", sentiment === "NEGATIVE" ? "Needs Review" : "Monitoring"],
      sourceType: signal.platform || "Live Source",
      sources: [source],
      sourceCount: 0,
      sentiment,
      velocity: "Live",
      velocityPeriod: "from API",
      mentions: "1",
      confidence: "-",
      time: compactTime(signal.publishedAt || signal.capturedAt),
      timeAgo: "Data live",
      trend: stableTrend(signal.id),
    };
  });
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>{children}</section>;
}

function makeLinePath(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function Sparkline({ values, tone, id, className = "h-8 w-[88px]" }: { values: number[]; tone: Tone; id: string; className?: string }) {
  const style = toneStyles[tone];
  const width = 120;
  const height = 42;
  const path = makeLinePath(values, width, height, 4);
  const areaPath = `${path} L ${width - 4} ${height} L 4 ${height} Z`;

  return (
    <svg className={cn("chart-line-draw overflow-visible", className)} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={style.color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={style.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={style.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
    </svg>
  );
}

function SignalAgentImage() {
  return (
    <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#465FFF]/10 bg-linear-to-b from-[#EEF0FF] via-white to-[#F1EEFF] shadow-[inset_0_0_24px_rgba(70,95,255,0.10)]">
      <Image src={aiAgentImage} alt="AI signals assistant illustration" width={96} height={96} sizes="96px" unoptimized className="relative h-full w-full object-cover" style={{ transform: "scale(1.35)" }} />
    </div>
  );
}

function SummaryPanel() {
  return (
    <Panel className="overflow-hidden p-5">
      <div className="grid gap-5 lg:grid-cols-[96px_1fr_1.35fr]">
        <SignalAgentImage />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">AI Signal Summary</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#8B5CFF]"><Sparkles size={12} /> AI Generated</span>
          </div>
          <p className="mt-3 text-[13.5px] font-black leading-relaxed text-[#101334]">Dalam 24 jam terakhir terjadi peningkatan keluhan terkait payment delay dan stabilitas aplikasi.</p>
          <p className="mt-2 max-w-[560px] text-[11.5px] font-bold leading-relaxed text-[#58648C]">Percakapan negatif meningkat 24% di X/Twitter wilayah Jabodetabek dengan confidence tinggi. Narriv merekomendasikan investigasi SLA pembayaran dan komunikasi publik proaktif.</p>
        </div>
        <div className="grid gap-4 border-t border-[#EDF1F7] pt-4 md:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {metrics.map((metric) => <MetricBlock key={metric.label} {...metric} />)}
        </div>
      </div>
    </Panel>
  );
}

function MetricBlock({ label, value, helper, tone, trend }: (typeof metrics)[number]) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-extrabold text-[#68739F]">{label}</p>
      <p className="mt-2 text-[25px] font-black leading-none tracking-[-0.045em] text-[#101334]">{value}</p>
      <p className={cn("mt-2 text-[10px] font-black", tone === "blue" ? "text-[#10B981]" : "text-[#EF4444]")}>{helper}</p>
      <div className="mt-3"><Sparkline values={trend} tone={tone} id={`metric-${tone}`} className="h-8 w-full" /></div>
    </div>
  );
}

function SeverityIcon({ severity, tone }: { severity: Severity; tone: SignalRow["severityTone"] }) {
  const style = toneStyles[tone];
  const Icon = severity === "MEDIUM" && tone === "green" ? Star : severity === "MEDIUM" && tone === "purple" ? HelpCircle : AlertTriangle;
  return <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", style.soft, style.text, style.border)}><Icon size={17} fill={tone === "green" ? style.color : "none"} /></span>;
}

function SeverityBadge({ severity, tone }: { severity: Severity; tone: SignalRow["severityTone"] }) {
  const style = toneStyles[tone];
  return <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.12em]", style.soft, style.text)}>{severity}</span>;
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const styles: Record<Sentiment, string> = {
    NEGATIVE: "bg-[#EF4444]/10 text-[#EF4444]",
    POSITIVE: "bg-[#10B981]/10 text-[#0C9B69]",
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
        {row.sourceCount > 0 ? <span className="rounded-full bg-[#F1F4FB] px-1.5 py-0.5 text-[9px] font-black text-[#68739F]">+{row.sourceCount}</span> : null}
      </div>
    </div>
  );
}

function SignalsTable({ activeFilter, setActiveFilter, query, setQuery, rows, footerText, timeRange, setTimeRange, pagination, onPageChange, isFetching, className }: { activeFilter: string; setActiveFilter: (value: string) => void; query: string; setQuery: (value: string) => void; rows: SignalRow[]; footerText: string; timeRange: DateRangeKey; setTimeRange: (value: DateRangeKey) => void; pagination?: PaginationInfo | null; onPageChange: (page: number) => void; isFetching?: boolean; className?: string }) {
  const tabs = ["Semua", "Negatif", "Positif", "Campuran", "Kritis"];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveFilter(tab)} className={cn("h-9 rounded-full px-4 text-[12px] font-black transition", activeFilter === tab ? "bg-[#465FFF] text-white shadow-[0_10px_22px_rgba(70,95,255,0.22)]" : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#31406B] hover:bg-white")}>{tab}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-[8px] border border-[#DDE3EF] bg-white p-0.5">
            {timeRangeOptions.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setTimeRange(range.value)}
                className={cn("h-8 rounded-[6px] px-2.5 text-[10px] font-black transition", timeRange === range.value ? "bg-[#465FFF] text-white" : "text-[#31406B] hover:bg-[#F8FAFF]")}
              >
                {range.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B95B8]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search signal..." className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] pl-9 pr-3 text-[11px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white" />
          </label>
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B]"><SlidersHorizontal size={13} />Filter</button>
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B]">Terbaru<ChevronDown size={13} /></button>
        </div>
      </div>

      <Panel className="overflow-hidden p-0 xl:min-h-[610px] flex flex-col">
        <div className="overflow-x-auto flex-1 flex flex-col">
          <table className="w-full min-w-[980px] border-collapse text-left flex-1 h-full">
            <thead>
              <tr className="border-b border-[#E6EAF2] bg-[#FBFCFF] text-[10px] font-black uppercase tracking-[0.17em] text-[#68739F]">
                {['Signal', 'Trend', 'Source', 'Sentiment', 'Velocity', 'Mentions', 'Confidence', 'Time', ''].map((header) => <th key={header || 'actions'} className="px-3.5 py-3">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F7]">
              {rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-[#F8FAFF]">
                  <td className="max-w-[380px] px-3.5 py-4">
                    <div className="flex items-start gap-3">
                      <SeverityIcon severity={row.severity} tone={row.severityTone} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-[12.5px] font-black leading-snug text-[#101334]">{row.title}</span><SeverityBadge severity={row.severity} tone={row.severityTone} /></div>
                        <p className="mt-1 text-[11px] font-bold leading-snug text-[#68739F]">{row.desc}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{row.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-4 align-middle"><Sparkline values={row.trend} tone={row.severityTone} id={`row-${row.id}`} className="h-8 w-[72px]" /></td>
                  <td className="px-3.5 py-4 align-middle"><SourceIconList row={row} /></td>
                  <td className="px-3.5 py-4 align-middle"><SentimentBadge sentiment={row.sentiment} /></td>
                  <td className="px-3.5 py-4 align-middle"><span className={cn("block text-[12px] font-black", row.sentiment === "POSITIVE" ? "text-[#10B981]" : "text-[#EF4444]")}>{row.velocity}</span><span className="mt-1 block text-[10px] font-bold text-[#68739F]">{row.velocityPeriod}</span></td>
                  <td className="px-3.5 py-4 align-middle text-[12px] font-black text-[#101334]">{row.mentions}</td>
                  <td className="px-3.5 py-4 align-middle text-[12px] font-black text-[#10B981]">{row.confidence}</td>
                  <td className="px-3.5 py-4 align-middle"><span className="block text-[11px] font-black text-[#31406B]">{row.time}</span><span className="mt-1 block text-[10px] font-bold text-[#68739F]">{row.timeAgo}</span></td>
                  <td className="px-3.5 py-4 text-right align-middle"><button type="button" aria-label={`Open actions for ${row.title}`} className="rounded-md p-1 text-[#68739F] transition hover:bg-[#EEF2FF] hover:text-[#465FFF]"><MoreVertical size={16} /></button></td>
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
  return (
    <Panel className="p-4">
      <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Yang Perlu Anda Tindak Lanjuti</h2>
      <p className="mt-1 text-[11.5px] font-bold text-[#68739F]">Sinyal yang membutuhkan perhatian segera.</p>
      <div className="mt-4 space-y-2.5">
        {(data || followUps).map((item) => {
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
      <button type="button" className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#FBFCFF] text-[11px] font-black text-[#465FFF]">Lihat semua sinyal <ArrowRight size={13} /></button>
    </Panel>
  );
}

function RecommendationPanel({ data }: { data?: SignalsMeta["recommendations"] }) {
  return (
    <Panel className="p-4">
      <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Rekomendasi Tindakan</h2>
      <p className="mt-1 text-[11.5px] font-bold text-[#68739F]">Disarankan oleh Narriv AI.</p>
      <div className="mt-4 space-y-2.5">
        {(data || recommendations).map((item) => {
          const style = toneStyles[item.tone as Tone];
          const Icon = item.icon || Zap;
          return (
            <div key={item.title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-[11px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 sm:grid-cols-[32px_minmax(0,1fr)_auto]">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-[9px]", style.soft, style.text)}><Icon size={15} /></span>
              <span className="min-w-0"><span className="block truncate text-[11.5px] font-black text-[#101334]">{item.title}</span><span className="mt-1 block text-[10px] font-bold text-[#68739F]">{item.desc}</span></span>
              <span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[8.5px] font-black sm:col-start-auto", item.tone === "red" || item.tone === "purple" ? "bg-[#EF4444]/10 text-[#EF4444]" : item.tone === "blue" ? "bg-[#F59E0B]/12 text-[#D97706]" : "bg-[#10B981]/10 text-[#0C9B69]")}>{item.badge}</span>
            </div>
          );
        })}
      </div>
      <button type="button" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.22)]"><Briefcase size={14} />Buat Rencana Tindakan</button>
    </Panel>
  );
}

function SourceDonut({ data }: { data?: SignalsMeta["sourceDistribution"] }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-[15px] font-black text-[#101334]">Sumber Signal</h3><p className="mt-1 text-[11px] font-bold text-[#68739F]">Distribusi berdasarkan sumber data.</p></div><button type="button" className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[8px] border border-[#DDE3EF] px-2.5 text-[9px] font-black text-[#31406B]">24 Jam Terakhir <ChevronDown size={12} /></button></div>
      <div className="mt-5 grid gap-5 sm:grid-cols-[136px_1fr] md:grid-cols-1 xl:grid-cols-[136px_1fr]">
        <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_48%,#EF3F6B_48%_70%,#10B981_70%_84%,#8B5CFF_84%_94%,#94A3B8_94%_100%)]"><span className="absolute h-[88px] w-[88px] rounded-full bg-white" /><span className="relative text-center"><b className="block text-[22px] font-black text-[#101334]">2.842</b><span className="text-[10px] font-bold text-[#68739F]">Total Signals</span></span></div>
        <div className="space-y-2.5 self-center">{(data || sourceDistribution).map((item) => <div key={item.name} className="flex items-center justify-between gap-3 text-[11px] font-bold"><span className="flex items-center gap-2 text-[#31406B]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="text-[#68739F]">{item.value}</span></div>)}</div>
      </div>
    </Panel>
  );
}

function TimelineChart({ data }: { data?: SignalsMeta["timeline"] }) {
  const path = makeLinePath(data || timeline, 520, 170, 14);
  const area = `${path} L 506 170 L 14 170 Z`;
  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">Timeline Signal <span className="text-[11px] font-bold text-[#68739F]">(24 Jam Terakhir)</span></h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">Volume sinyal per jam.</p>
      <div className="relative mt-5 h-[170px] overflow-hidden rounded-[12px] bg-linear-to-b from-white to-[#F8FAFF]">
        <svg className="chart-enter chart-line-draw h-full w-full" viewBox="0 0 520 178" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="signals-timeline" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#465FFF" stopOpacity="0.22" /><stop offset="100%" stopColor="#465FFF" stopOpacity="0" /></linearGradient></defs>{[34, 70, 106, 142].map((y) => <line key={y} x1="8" x2="512" y1={y} y2={y} stroke="#EDF1F7" strokeWidth="1" />)}<path d={area} fill="url(#signals-timeline)" /><path d={path} fill="none" stroke="#465FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" vectorEffect="non-scaling-stroke" /></svg>
        <div className="absolute left-[48%] top-1 flex -translate-x-1/2 flex-col items-center"><span className="rounded-[8px] bg-[#101334] px-3 py-2 text-center shadow-lg"><b className="block text-[9px] font-black text-white">12:00</b><span className="text-[10px] font-black text-white">1.024 sinyal</span></span><span className="h-12 border-l border-dashed border-[#8B95B8]" /><span className="h-3 w-3 rounded-full border-2 border-white bg-[#465FFF] ring-4 ring-[#465FFF]/15" /></div>
        <div className="absolute inset-x-3 bottom-1 flex justify-between text-[10px] font-bold text-[#68739F]"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div>
      </div>
    </Panel>
  );
}

function InvestigationQueue({ data }: { data?: SignalsMeta["investigationQueue"] }) {
  const items = data || [
    { title: "Payment delay complaints are rising", meta: "Assigned to Ops Team • 10:30 WIB", badge: "Investigating", tone: "red" },
    { title: "Mobile app stability disruption", meta: "Assigned to Product Team • 09:50 WIB", badge: "New", tone: "amber" },
    { title: "FAQ confusion around credit terms", meta: "Assigned to CS Team • 08:25 WIB", badge: "New", tone: "purple" },
  ];
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-[15px] font-black text-[#101334]">Queue Investigasi</h3><p className="mt-1 text-[11px] font-bold text-[#68739F]">Sinyal yang sedang dalam proses.</p></div><button type="button" className="text-[11px] font-black text-[#465FFF]">Lihat semua</button></div>
      <div className="mt-4 space-y-3">{items.map((item) => { const style = toneStyles[item.tone as Tone]; return <div key={item.title} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-[11px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 sm:grid-cols-[34px_minmax(0,1fr)_auto]"><span className={cn("flex h-8 w-8 items-center justify-center rounded-[9px]", style.soft, style.text)}><Zap size={15} /></span><span className="min-w-0"><span className="block truncate text-[12px] font-black text-[#101334]">{item.title}</span><span className="mt-1 block text-[10px] font-bold text-[#68739F]">{item.meta}</span></span><span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[9px] font-black sm:col-start-auto", item.badge === "Investigating" || item.badge === "open" ? "bg-[#465FFF]/10 text-[#465FFF]" : "bg-[#F59E0B]/12 text-[#D97706]")}>{item.badge}</span></div>; })}</div>
    </Panel>
  );
}

export default function SignalsPage() {
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState<DateRangeKey>("24h");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const dateRange = getDateRangeOptions(timeRange);
  
  const metaQuery = useQuery({
    queryKey: ["signalsMeta"],
    queryFn: () => getSignalsMeta(),
    staleTime: 60 * 1000,
  });
  const meta = metaQuery.data || undefined;

  const signalsQuery = useQuery({
    queryKey: ["signals", { keyword: deferredQuery, page, timeRange }],
    queryFn: () => getSignals({ page, limit: signalApiLimit, keyword: deferredQuery.trim() || undefined, ...dateRange }),
    staleTime: 30 * 1000,
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleTimeRangeChange = (value: DateRangeKey) => {
    setTimeRange(value);
    setPage(1);
  };

  const liveRows = signalsQuery.data?.data ? buildApiSignalRows(signalsQuery.data.data) : [];
  const isLiveUnavailable = signalsQuery.data === null;
  const sourceRows = liveRows.length > 0 || signalsQuery.data ? liveRows : signalRows;

  const rows = sourceRows.filter((row) => {
    const matchesQuery = query.trim() === "" || row.title.toLowerCase().includes(query.toLowerCase()) || row.desc.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (activeFilter === "Negatif") return row.sentiment === "NEGATIVE";
    if (activeFilter === "Positif") return row.sentiment === "POSITIVE";
    if (activeFilter === "Campuran") return row.sentiment === "MIXED";
    if (activeFilter === "Kritis") return row.severity === "CRITICAL";
    return true;
  });
  const footerText = signalsQuery.data?.pagination
    ? formatPaginationSummary(signalsQuery.data.pagination, "sinyal live")
    : isLiveUnavailable
      ? "Data live belum bisa dimuat. Menampilkan data contoh."
      : "Menampilkan 1-4 dari 24 sinyal";

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">Signals</h1><p className="mt-2 text-[14px] font-semibold text-[#68739F]">Track important conversations and narrative signals from every source.</p></div>
        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] sm:w-fit"><Flag size={15} />Create Investigation</button>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SummaryPanel />
          {signalsQuery.isPending ? (
            <TableSkeleton rows={6} columns={8} className="xl:min-h-[610px]" />
          ) : signalsQuery.data && liveRows.length === 0 ? (
            <DashboardEmptyState title="Belum ada signal live" description="Sumber data sudah terhubung, tetapi belum ada signal yang cocok dengan filter saat ini." icon="search" minHeight="min-h-[420px]" />
          ) : (
            <>
              {isLiveUnavailable ? <DashboardErrorState title="Data live belum bisa dimuat" description="Refresh token tetap dicoba lewat API client. Untuk sementara, halaman menampilkan data contoh." onRetry={() => void signalsQuery.refetch()} minHeight="min-h-[150px]" /> : null}
              <SignalsTable activeFilter={activeFilter} setActiveFilter={setActiveFilter} query={query} setQuery={handleQueryChange} rows={rows} footerText={footerText} timeRange={timeRange} setTimeRange={handleTimeRangeChange} pagination={signalsQuery.data?.pagination} onPageChange={setPage} isFetching={signalsQuery.isFetching} className="flex-1" />
            </>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <FollowUpPanel data={meta?.followUps} />
          <RecommendationPanel data={meta?.recommendations} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr_1.18fr]">
        <SourceDonut data={meta?.sourceDistribution} />
        <TimelineChart data={meta?.timeline} />
        <InvestigationQueue data={meta?.investigationQueue} />
      </div>
    </div>
  );
}
