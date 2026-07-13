"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Download,
  Search,
  TrendingUp,
  Target,
  Shield,
  MessageCircle,
  Info,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  RefreshCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardErrorState, MetricRowSkeleton } from "@/components/dashboard/dashboard-states";
import { getVisibility, getVisibilitySummary, getVisibilityTrends, getWorkspaceSettings, triggerVisibilityAnalysis, type VisibilityResponse } from "@/lib/api-service";
import { useUiStore } from "@/store/useUiStore";
import {
  OpenAILight,
  Gemini,
  MicrosoftCopilot,
  PerplexityAI,
  ClaudeAI
} from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";

type ToneStyle = {
  color: string;
  rgb: string;
  badge: "default" | "green" | "amber" | "red" | "purple" | "slate";
};

type ChartDataset = {
  name: string;
  color: string;
  values: number[];
};

type PlatformLogo = ComponentType<{ className?: string }>;

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", badge: "default" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", badge: "purple" },
  green: { color: "#10B981", rgb: "16,185,129", badge: "green" },
  red: { color: "#EF4444", rgb: "239,68,68", badge: "red" },
  amber: { color: "#F59E0B", rgb: "245,158,11", badge: "amber" },
  slate: { color: "#64748B", rgb: "100,116,139", badge: "slate" },
};

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("rounded-[14px] border-[#E8ECF5] bg-white text-[#101334] shadow-[0_2px_14px_rgba(16,24,40,0.035)]", className)}>
      {children}
    </Card>
  );
}

function IconHalo({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const toneStyle = toneStyles[tone];
  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-full border shadow-[0_6px_12px_rgba(16,24,40,0.03)]"
      style={{
        color: toneStyle.color,
        borderColor: `rgba(${toneStyle.rgb}, 0.12)`,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.9), rgba(${toneStyle.rgb}, .11))`,
      }}
    >
      <Icon size={20} strokeWidth={2.3} />
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const width = 100;
  const height = 24;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const path = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * 96 + 2;
      const y = height - ((val - min) / range) * 16 - 4;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg className="chart-line-draw h-6 w-24 shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function MetricCard({ label, value, helper, icon, tone, sparklineValues }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone; sparklineValues: number[] }) {
  const styles = toneStyles[tone];
  const isNegative = helper.startsWith("-") || helper.startsWith("▼");
  return (
    <Panel>
      <CardContent className="relative flex min-h-[94px] items-center justify-between gap-4 p-5 overflow-hidden">
        <div className="flex items-center gap-4 z-10 min-w-0">
          <IconHalo icon={icon} tone={tone} />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-extrabold leading-none text-[#68739F]">{label}</p>
            <p className="mt-2 text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
            <p className={cn("mt-2 flex items-center gap-1 text-[11px] font-black", isNegative ? "text-[#EF4444]" : "text-[#10B981]")}>
              <span className={cn("size-1.5 rounded-full", isNegative ? "bg-[#EF4444]" : "bg-[#10B981]")} />
              {helper}
            </p>
          </div>
        </div>
        <div className="absolute right-4 bottom-3 w-24 h-6 opacity-70">
          {sparklineValues.length >= 2 && <Sparkline values={sparklineValues} color={styles.color} />}
        </div>
      </CardContent>
    </Panel>
  );
}

function MentionsTrendChart({ datasets, dates, fallbackDates, maxValue, emptyText, formatTick = (value) => (value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()) }: { datasets: ChartDataset[]; dates?: string[]; fallbackDates: string[]; maxValue?: number; emptyText: string; formatTick?: (value: number) => string }) {
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartDates = dates && dates.length > 0 ? dates : fallbackDates;
  const hasData = datasets.length > 0 && datasets.some((d) => d.values.some((v) => v > 0));

  if (!hasData) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[10px] border border-dashed border-[#D9DEEA] bg-[#F8FAFF]">
        <p className="text-[12px] font-bold text-[#8A94B8]">{emptyText}</p>
      </div>
    );
  }

  const maxVal = Math.max(1, maxValue ?? Math.ceil(Math.max(...datasets.flatMap((dataset) => dataset.values), 1) / 10) * 10);
  const tickValues = [0, Math.round(maxVal / 2), maxVal];

  const getX = (index: number) => paddingLeft + (index / Math.max(chartDates.length - 1, 1)) * (width - paddingLeft - paddingRight);
  const getY = (val: number) => paddingTop + (1 - val / maxVal) * (height - paddingTop - paddingBottom);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[500px]">
        <svg className="chart-enter chart-line-draw w-full h-[180px]" viewBox={`0 0 ${width} ${height}`}>
          {tickValues.map((yVal) => {
            const y = getY(yVal);
            return (
              <g key={yVal}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#EEF1F7" strokeWidth="1" strokeDasharray={yVal === 0 ? "0" : "3 3"} />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-[#8A94B8]">
                  {formatTick(yVal)}
                </text>
              </g>
            );
          })}

          {chartDates.map((date, idx) => {
            const x = getX(idx);
            return (
              <text key={date} x={x} y={height - 5} textAnchor="middle" className="text-[10px] font-bold fill-[#8A94B8]">
                {date}
              </text>
            );
          })}

          {datasets.map((dataset) => {
            const path = dataset.values
              .map((val, idx) => {
                const x = getX(idx);
                const y = getY(val);
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={dataset.name}>
                <path d={path} fill="none" stroke={dataset.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {dataset.values.map((val, idx) => (
                  <circle key={idx} cx={getX(idx)} cy={getY(val)} r="3" fill="#FFFFFF" stroke={dataset.color} strokeWidth="1.5" />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CompetitorVsChart({ datasets, dates, fallbackDates, emptyText }: { datasets: ChartDataset[]; dates?: string[]; fallbackDates: string[]; emptyText: string }) {
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 95;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartDates = dates && dates.length > 0 ? dates : fallbackDates;
  const hasData = datasets.length > 0 && datasets.some((d) => d.values.some((v) => v > 0));

  if (!hasData) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[10px] border border-dashed border-[#D9DEEA] bg-[#F8FAFF]">
        <p className="text-[12px] font-bold text-[#8A94B8]">{emptyText}</p>
      </div>
    );
  }
  const maxVal = Math.max(40, Math.ceil(Math.max(...datasets.flatMap((dataset) => dataset.values), 1) / 10) * 10);

  const getX = (index: number) => paddingLeft + (index / Math.max(chartDates.length - 1, 1)) * (width - paddingLeft - paddingRight);
  const getY = (val: number) => paddingTop + (1 - val / maxVal) * (height - paddingTop - paddingBottom);

  const targetIdx = Math.max(0, chartDates.length - 1);
  const targetX = getX(targetIdx);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[500px]">
        <svg className="chart-enter chart-line-draw w-full h-[180px]" viewBox={`0 0 ${width} ${height}`}>
          {[0, Math.round(maxVal / 2), maxVal].map((yVal) => {
            const y = getY(yVal);
            return (
              <g key={yVal}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#EEF1F7" strokeWidth="1" strokeDasharray={yVal === 0 ? "0" : "3 3"} />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-[#8A94B8]">
                  {yVal}%
                </text>
              </g>
            );
          })}

          {chartDates.map((date, idx) => {
            const x = getX(idx);
            return (
              <text key={date} x={x} y={height - 5} textAnchor="middle" className="text-[10px] font-bold fill-[#8A94B8]">
                {date}
              </text>
            );
          })}

          <line x1={targetX} y1={paddingTop - 5} x2={targetX} y2={height - paddingBottom} stroke="#8B5CFF" strokeWidth="1" strokeDasharray="3 3" />

          {datasets.map((dataset) => {
            const path = dataset.values
              .map((val, idx) => {
                const x = getX(idx);
                const y = getY(val);
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={dataset.name}>
                <path d={path} fill="none" stroke={dataset.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={targetX} cy={getY(dataset.values[targetIdx])} r="3.5" fill={dataset.color} stroke="#FFFFFF" strokeWidth="1" />
              </g>
            );
          })}

          <g transform={`translate(${targetX + 8}, ${paddingTop - 12})`}>
            <rect width="84" height="74" rx="6" fill="#FFFFFF" stroke="#DCE2F0" strokeWidth="1.2" />
            <text x="8" y="12" className="text-[8px] font-black fill-[#8A94B8]">{chartDates[targetIdx]}</text>
            {datasets.map((ds, idx) => (
              <g key={ds.name} transform={`translate(8, ${24 + idx * 11})`}>
                <circle cx="3" cy="-3" r="2.5" fill={ds.color} />
                <text x="10" y="1" className="text-[8px] font-bold fill-[#53608C]">{ds.name.split(" ")[0]}</text>
                <text x="70" y="1" textAnchor="end" className="text-[8px] font-black fill-[#101334]">{(ds.values[targetIdx] ?? 0).toFixed(1)}%</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function TopicTypeBadge({ type }: { type: string }) {
  const normalizedType = type.toLowerCase();
  let badgeVariant: "default" | "green" | "amber" | "red" | "purple" | "slate" = "slate";
  if (normalizedType.includes("opportunity") || normalizedType.includes("peluang")) badgeVariant = "green";
  else if (normalizedType.includes("alert") || normalizedType.includes("peringatan")) badgeVariant = "amber";
  else if (normalizedType.includes("informational") || normalizedType.includes("informasi")) badgeVariant = "default";
  else if (normalizedType.includes("risk") || normalizedType.includes("risiko")) badgeVariant = "red";
  return (
    <Badge variant={badgeVariant} className="px-2 py-0.5 text-[9px] font-bold">
      {type}
    </Badge>
  );
}

function TopicDirection({ val }: { val: string }) {
  const isUp = val.startsWith("▲") || val.startsWith("+") || val.includes("↑") || parseFloat(val) > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold", isUp ? "text-[#10B981]" : "text-[#EF4444]")}>
      {isUp ? "↑" : "↓"} {val.replace(/[▲▼↑↓+-]/g, "").trim()}
    </span>
  );
}

function DonutChartVisibility({ center, label, segments }: { center: string; label: string; segments?: { color: string; value: number }[] }) {
  const gradient = segments?.length
    ? `conic-gradient(${segments.reduce<{ stops: string[]; cursor: number }>((acc, segment) => {
      const next = Math.min(100, acc.cursor + Math.max(0, segment.value));
      acc.stops.push(`${segment.color} ${acc.cursor}% ${next}%`);
      acc.cursor = next;
      return acc;
    }, { stops: [], cursor: 0 }).stops.join(",")})`
    : "conic-gradient(#E8ECF5_0_100%)";

  return (
    <div className="chart-donut-enter relative mx-auto flex size-[150px] items-center justify-center rounded-full shadow-[0_0_20px_rgba(70,95,255,0.08)]" style={{ background: gradient }}>
      <div className="absolute size-[104px] rounded-full bg-white" />
      <div className="relative text-center z-10">
        <p className="text-[24px] font-black text-[#101334]">{center}</p>
        <p className="mt-0.5 text-[9px] font-bold text-[#8A94B8]">{label}</p>
      </div>
    </div>
  );
}

function asNumber(value: number | string | undefined, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizePercent(value: number | string | undefined, fallback = 0) {
  const numeric = asNumber(value, fallback);
  return numeric <= 1 ? numeric * 100 : numeric;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatEngineName(engineName: string) {
  const normalized = engineName.toLowerCase();
  if (normalized.includes("gemini")) return "Google Gemini";
  if (normalized.includes("copilot") || normalized.includes("microsoft")) return "Microsoft Copilot";
  if (normalized.includes("perplexity")) return "Perplexity";
  if (normalized.includes("claude")) return "Claude";
  if (normalized.includes("gpt") || normalized.includes("openai") || normalized.includes("chatgpt")) return "ChatGPT";
  return engineName;
}

function getEngineColor(engineName: string) {
  const normalized = engineName.toLowerCase();
  if (normalized.includes("gemini")) return "#465FFF";
  if (normalized.includes("copilot") || normalized.includes("microsoft")) return "#F59E0B";
  if (normalized.includes("perplexity")) return "#10B981";
  if (normalized.includes("claude")) return "#64748B";
  return "#8B5CFF";
}

function getEngineLogo(engineName: string): PlatformLogo {
  const normalized = engineName.toLowerCase();
  if (normalized.includes("gemini")) return Gemini;
  if (normalized.includes("copilot") || normalized.includes("microsoft")) return MicrosoftCopilot;
  if (normalized.includes("perplexity")) return PerplexityAI;
  if (normalized.includes("claude")) return ClaudeAI;
  return OpenAILight;
}

function formatPercent(value: number, language: string) {
  return `${new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
    maximumFractionDigits: 1,
  }).format(clampPercent(value))}%`;
}

function formatChartDate(date: string, language: string) {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function buildLatestMentionQuote(prompt: NonNullable<VisibilityResponse["prompts"]>[number], t: ReturnType<typeof useTranslations<"Visibility">>) {
  const brand = prompt.brand ? t("mentionQuote.brand", { value: prompt.brand }) : t("mentionQuote.brandFallback");
  const competitor = prompt.competitor ? t("mentionQuote.competitor", { value: prompt.competitor }) : t("mentionQuote.competitorFallback");
  return `"${prompt.prompt}" - ${brand}; ${competitor}.`;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportVisibilityCsv(data: {
  language: string;
  totalMentions: string;
  brandPresence: string;
  competitorPresence: string;
  visibilityScore: string;
  trendPoints: Array<{ date: string; brandPresence: number; competitorPresence: number; score: number }>;
  topTopics: Array<{ topic: string; mentions: string; direction: string; type: string }>;
  platformBreakdown: Array<{ name: string; score: number; presenceRate: number }>;
  latestMentions: Array<{ platform: string; quote: string }>;
}) {
  const now = new Date().toISOString().split("T")[0];
  const isId = data.language === "id";
  const rows: string[][] = [];

  rows.push([isId ? "Laporan Visibilitas AI" : "AI Visibility Report", now]);
  rows.push([]);

  rows.push([isId ? "Metrik Ringkasan" : "Summary Metrics", isId ? "Nilai" : "Value"]);
  rows.push([isId ? "Total Penyebutan" : "Total Mentions", data.totalMentions]);
  rows.push([isId ? "Kehadiran Brand" : "Brand Presence", data.brandPresence]);
  rows.push([isId ? "Kehadiran Kompetitor" : "Competitor Presence", data.competitorPresence]);
  rows.push([isId ? "Skor Visibilitas" : "Visibility Score", data.visibilityScore]);
  rows.push([]);

  rows.push([isId ? "Data Tren" : "Trend Data"]);
  rows.push([isId ? "Tanggal" : "Date", isId ? "Kehadiran Brand %" : "Brand Presence %", isId ? "Kehadiran Kompetitor %" : "Competitor Presence %", isId ? "Skor Visibilitas" : "Visibility Score"]);
  for (const point of data.trendPoints) {
    rows.push([point.date, String(point.brandPresence), String(point.competitorPresence), String(point.score)]);
  }
  rows.push([]);

  rows.push([isId ? "Topik Teratas" : "Top Topics"]);
  rows.push([isId ? "Topik" : "Topic", isId ? "Penyebutan" : "Mentions", isId ? "Arah" : "Direction", isId ? "Tipe" : "Type"]);
  for (const topic of data.topTopics) {
    rows.push([topic.topic, topic.mentions, topic.direction, topic.type]);
  }
  rows.push([]);

  rows.push([isId ? "Breakdown Platform" : "Platform Breakdown"]);
  rows.push([isId ? "Platform" : "Platform", isId ? "Skor Visibilitas" : "Visibility Score", isId ? "Tingkat Kehadiran Brand %" : "Brand Presence Rate %"]);
  for (const platform of data.platformBreakdown) {
    rows.push([platform.name, String(platform.score), String(platform.presenceRate)]);
  }
  rows.push([]);

  rows.push([isId ? "Penyebutan Terbaru" : "Latest Mentions"]);
  rows.push([isId ? "Platform" : "Platform", isId ? "Kutipan" : "Quote"]);
  for (const mention of data.latestMentions) {
    rows.push([mention.platform, mention.quote]);
  }

  downloadCsv(`visibility-report-${now}.csv`, rows);
}

export default function VisibilityPage() {
  const t = useTranslations("Visibility");
  const tEmpty = useTranslations("Visibility.empty");
  const language = useUiStore((state) => state.language);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState(30);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isMentionsModalOpen, setIsMentionsModalOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setIsDateMenuOpen(false);
    }
    if (isDateMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDateMenuOpen]);

  const visibilityQuery = useQuery({
    queryKey: ["visibility"],
    queryFn: () => getVisibility(),
    staleTime: 30 * 1000,
  });
  const visibilitySummaryQuery = useQuery({
    queryKey: ["visibility-summary"],
    queryFn: () => getVisibilitySummary(),
    staleTime: 60 * 1000,
  });
  const visibilityTrendsQuery = useQuery({
    queryKey: ["visibility-trends", selectedDays],
    queryFn: () => getVisibilityTrends(undefined, undefined, selectedDays),
    staleTime: 60 * 1000,
  });
  const workspaceSettingsQuery = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: () => getWorkspaceSettings(),
    staleTime: 60 * 1000,
  });
  const visibilityData = visibilityQuery.data;
  const visibilitySummary = visibilitySummaryQuery.data;
  const visibilityTrends = visibilityTrendsQuery.data;
  const workspaceSettings = workspaceSettingsQuery.data;
  const isVisibilityUnavailable = visibilityData === null || visibilityQuery.isError;
  const isSummaryUnavailable = visibilitySummary === null || visibilitySummaryQuery.isError;
  const isTrendsUnavailable = visibilityTrends === null || visibilityTrendsQuery.isError;
  const hasAnyVisibilityError = isVisibilityUnavailable || isSummaryUnavailable || isTrendsUnavailable;
  const hasLiveVisibility = Boolean(visibilityData && (asNumber(visibilityData.score, 0) > 0 || (visibilityData.prompts?.length ?? 0) > 0));
  const hasLiveSummary = Boolean(visibilitySummary?.engine_breakdown.length || visibilitySummary?.kpis.total_analyses);
  const sandboxBrandName = workspaceSettings?.brandName?.trim() ?? "";

  const [sandboxQuery, setSandboxQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedResponse, setSimulatedResponse] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [sandboxMeta, setSandboxMeta] = useState<Array<{ label: string; value: string }>>([]);

  const handleSimulate = async () => {
    const trimmedQuery = sandboxQuery.trim();
    if (!trimmedQuery) return;
    if (!sandboxBrandName) {
      setSimulatedResponse(t("sandbox.brandMissing"));
      return;
    }
    setIsSimulating(true);
    setSimulatedResponse("");
    setConfidence(0);
    setSandboxMeta([]);
    try {
      const result = await triggerVisibilityAnalysis({
        brandName: sandboxBrandName,
        queries: [trimmedQuery],
      }) as { rawResponse?: Array<{ query: string; response: string; responseId?: string }>; visibilityScore?: number } | null;
      if (result?.rawResponse?.[0]) {
        const raw = result.rawResponse[0];
        const displayResponse = language === "id" ? (raw.responseId || raw.response) : raw.response;
        setSimulatedResponse(displayResponse);
        setConfidence(result.visibilityScore ?? 0);
        setSandboxMeta([
          { label: t("sandbox.analyzedBrand"), value: sandboxBrandName },
          { label: t("sandbox.engine"), value: "ChatGPT" },
          { label: t("sandbox.query"), value: raw.query || trimmedQuery },
        ]);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["visibility"] }),
          queryClient.invalidateQueries({ queryKey: ["visibility-summary"] }),
          queryClient.invalidateQueries({ queryKey: ["visibility-trends"] }),
        ]);
      } else {
        setSimulatedResponse(tEmpty("noResponse"));
      }
    } catch {
      setSimulatedResponse(tEmpty("fetchFailed"));
    } finally {
      setIsSimulating(false);
    }
  };

  const trendPoints = visibilityTrends?.trends ?? [];
  const trendDates = trendPoints.map((point) => formatChartDate(point.date, language));
  const brandTrendValues = trendPoints.map((point) => normalizePercent(point.avg_brand_presence_rate));
  const competitorTrendValues = trendPoints.map((point) => normalizePercent(point.avg_competitor_mention_rate));
  const scoreTrendValues = trendPoints.map((point) => point.avg_visibility_score);

  const chartFallbackDates = (() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return formatChartDate(d.toISOString(), language);
    });
  })();

  function computeDelta(current: number, previous: number, isPercentage = true): string {
    if (previous === 0) return current > 0 ? "+∞" : "0";
    const change = ((current - previous) / Math.abs(previous)) * 100;
    const sign = change >= 0 ? "+" : "";
    if (isPercentage) {
      return `${sign}${change.toFixed(1)}%`;
    }
    const absChange = current - previous;
    return `${sign}${absChange.toFixed(1)}`;
  }

  function formatPeriodLabel(days: number): string {
    if (language === "id") {
      if (days <= 1) return "vs kemarin";
      if (days <= 7) return `vs ${days} hari terakhir`;
      return `vs ${Math.ceil(days / 7)} minggu terakhir`;
    }
    if (days <= 1) return "vs yesterday";
    if (days <= 7) return `vs last ${days} days`;
    return `vs last ${Math.ceil(days / 7)} weeks`;
  }

  const trendPeriodDays = visibilityTrends?.period?.days ?? 7;

  const deltaTotalMentions = (() => {
    if (trendPoints.length < 2) return null;
    const last = trendPoints[trendPoints.length - 1];
    const prev = trendPoints[trendPoints.length - 2];
    const lastTotal = normalizePercent(last.avg_brand_presence_rate) + normalizePercent(last.avg_competitor_mention_rate);
    const prevTotal = normalizePercent(prev.avg_brand_presence_rate) + normalizePercent(prev.avg_competitor_mention_rate);
    return computeDelta(lastTotal, prevTotal);
  })();

  const deltaBrandPresence = (() => {
    if (brandTrendValues.length < 2) return null;
    return computeDelta(brandTrendValues[brandTrendValues.length - 1], brandTrendValues[brandTrendValues.length - 2]);
  })();

  const deltaSov = (() => {
    if (competitorTrendValues.length < 2) return null;
    const last = competitorTrendValues[competitorTrendValues.length - 1];
    const prev = competitorTrendValues[competitorTrendValues.length - 2];
    return computeDelta(last, prev);
  })();

  const deltaScore = (() => {
    if (scoreTrendValues.length < 2) return null;
    return computeDelta(scoreTrendValues[scoreTrendValues.length - 1], scoreTrendValues[scoreTrendValues.length - 2], false);
  })();

  const totalMentions = (() => {
    if (!visibilityData?.presenceMentions) return "-";
    const raw = String(visibilityData.presenceMentions);
    if (language === "id") {
      return raw.replace(/(\d+) of (\d+)/, "$1 dari $2");
    }
    return raw;
  })();
  const brandPresencePercent = normalizePercent(visibilityData?.presence, normalizePercent(visibilitySummary?.kpis.avg_brand_presence_rate));
  const competitorPresencePercent = normalizePercent(visibilityData?.competitor, normalizePercent(visibilitySummary?.kpis.avg_competitor_mention_rate));
  const visibilityScoreValue = asNumber(visibilityData?.score, visibilitySummary?.kpis.avg_visibility_score ?? 0);
  const brandPresence = hasLiveVisibility || hasLiveSummary ? formatPercent(brandPresencePercent, language) : "-";
  const competitorPresence = hasLiveVisibility || hasLiveSummary ? formatPercent(competitorPresencePercent, language) : "-";
  const visibilityScore = hasLiveVisibility || hasLiveSummary ? new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 }).format(visibilityScoreValue) : "-";

  const topTopicsData = visibilityData?.prompts?.length
    ? visibilityData.prompts.slice(0, 5).map((prompt) => ({
      topic: prompt.prompt,
      mentions: prompt.brand || "-",
      direction: prompt.brandTone || "Live",
      type: formatEngineName(prompt.engine),
    }))
    : [];

  const geoActions = visibilityData?.geoActions?.length
    ? visibilityData.geoActions.slice(0, 3).map((action) => action.title)
    : [];

  const mentionTrendDatasets = (() => {
    const engineEntries = Object.entries(visibilityTrends?.engine_trends ?? {})
      .map(([engineName, points]) => ({
        name: formatEngineName(engineName),
        color: getEngineColor(engineName),
        values: points.map((point) => normalizePercent(point.brandPresenceRate)),
      }))
      .filter((dataset) => dataset.values.length > 1)
      .slice(0, 5);

    if (engineEntries.length > 0) return engineEntries;
    if (brandTrendValues.length > 1 || competitorTrendValues.length > 1) {
      return [
        { name: language === "id" ? "Kehadiran Brand" : "Brand Presence", color: "#8B5CFF", values: brandTrendValues },
        { name: language === "id" ? "Kompetitor" : "Competitors", color: "#EF4444", values: competitorTrendValues },
      ];
    }
    return [];
  })();

  const competitorTrendDatasets = (() => {
    if (brandTrendValues.length > 1 || competitorTrendValues.length > 1) {
      return [
        { name: language === "id" ? "Narriv (Anda)" : "Narriv (You)", color: "#8B5CFF", values: brandTrendValues },
        { name: language === "id" ? "Kompetitor" : "Competitors", color: "#EF4444", values: competitorTrendValues },
      ];
    }
    return [];
  })();

  const topPlatforms = (() => {
    if (!visibilitySummary?.engine_breakdown.length) {
      return [];
    }

    return visibilitySummary.engine_breakdown
      .slice()
      .sort((a, b) => b.visibilityScore - a.visibilityScore)
      .map((engine) => {
        const presence = normalizePercent(engine.brandPresenceRate);
        return {
          name: formatEngineName(engine.engineName),
          logo: getEngineLogo(engine.engineName),
          mentions: `${new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 }).format(engine.visibilityScore)} ${language === "id" ? "skor" : "score"}`,
          pct: formatPercent(presence, language),
          width: `${Math.max(4, clampPercent(presence))}%`,
        };
      });
  })();

  const otherSharePercent = Math.max(0, 100 - brandPresencePercent - competitorPresencePercent);
  const shareOfVoiceLeg = hasLiveVisibility || hasLiveSummary
    ? [
      { name: language === "id" ? "Narriv (Anda)" : "Narriv (You)", val: brandPresence, tone: "purple" as Tone },
      { name: language === "id" ? "Kompetitor" : "Competitors", val: competitorPresence, tone: "red" as Tone },
      { name: "Others", val: formatPercent(otherSharePercent, language), tone: "slate" as Tone },
    ]
    : [];
  const donutSegments = hasLiveVisibility || hasLiveSummary
    ? [
      { color: toneStyles.purple.color, value: brandPresencePercent },
      { color: toneStyles.red.color, value: competitorPresencePercent },
      { color: toneStyles.slate.color, value: otherSharePercent },
    ]
    : [];
  const latestMentions = visibilityData?.prompts?.length
    ? visibilityData.prompts.slice(0, 3).map((prompt) => ({
      logo: getEngineLogo(prompt.engine),
      platform: formatEngineName(prompt.engine),
      time: language === "id" ? "Uji prompt terbaru" : "Latest prompt test",
      quote: buildLatestMentionQuote(prompt, t),
    }))
    : [];
  const allMentions = visibilityData?.prompts?.map((prompt) => ({
    logo: getEngineLogo(prompt.engine),
    platform: formatEngineName(prompt.engine),
    time: language === "id" ? "Uji prompt terbaru" : "Latest prompt test",
    quote: buildLatestMentionQuote(prompt, t),
  })) ?? [];
  const execOpportunityValue = hasLiveVisibility || hasLiveSummary
    ? `${brandPresence} ${language === "id" ? "kehadiran brand" : "brand presence"}`
    : "-";
  const execRiskValue = hasLiveVisibility || hasLiveSummary
    ? `${competitorPresence} ${language === "id" ? "sebutan kompetitor" : "competitor mention rate"}`
    : "-";

  const execHeading = (() => {
    if (!hasLiveVisibility && !hasLiveSummary) return "-";
    const pct = deltaBrandPresence ? ` ${deltaBrandPresence}` : "";
    return language === "id"
      ? `Visibility brand Anda${pct} minggu ini.`
      : `Your brand visibility changed${pct} this week.`;
  })();

  const execBody = (() => {
    if (!hasLiveVisibility && !hasLiveSummary) return "-";
    const topPrompt = visibilityData?.prompts?.[0];
    if (topPrompt) {
      const engine = formatEngineName(topPrompt.engine);
      return language === "id"
        ? `Topik teratas "${topPrompt.prompt}" muncul di ${engine} dengan brand "${topPrompt.brand || "-"}". Kompetitor: "${topPrompt.competitor || "-"}".`
        : `Top topic "${topPrompt.prompt}" appears on ${engine} with brand "${topPrompt.brand || "-"}". Competitor: "${topPrompt.competitor || "-"}".`;
    }
    return language === "id"
      ? `Brand Anda memiliki ${brandPresence} kehadiran di ${visibilitySummary?.kpis.engines_tracked ?? 0} platform AI.`
      : `Your brand has ${brandPresence} presence across ${visibilitySummary?.kpis.engines_tracked ?? 0} AI platforms.`;
  })();

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-black leading-none tracking-[-0.03em] text-[#101334]">{t("title")}</h1>
          <p className="mt-2 text-[13px] font-bold text-[#53608C]">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
          <div className="relative" ref={dateMenuRef}>
            <button type="button" aria-label={t("ariaLabels.dateFilter")} onClick={() => setIsDateMenuOpen((open) => !open)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF] sm:flex-none">
              <CalendarDays size={14} className="text-[#8A94B8]" />
              {visibilityTrends?.period
                ? `${formatChartDate(visibilityTrends.period.from, language)} - ${formatChartDate(visibilityTrends.period.to, language)}`
                : t("last7Days")
              }
              <ChevronDown size={12} className={cn("text-[#8A94B8] transition", isDateMenuOpen && "rotate-180")} />
            </button>
            {isDateMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-[10px] border border-[#E6EAF2] bg-white py-1 shadow-[0_12px_36px_rgba(16,24,40,0.12)]">
                {([7, 14, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => { setSelectedDays(days); setIsDateMenuOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold transition hover:bg-[#F8FAFF]",
                      selectedDays === days ? "text-[#465FFF]" : "text-[#31406B]"
                    )}
                  >
                    {selectedDays === days ? <CheckCircle size={13} className="text-[#465FFF]" /> : <span className="size-[13px]" />}
                    {t(`dateRange.${days}d`)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={t("ariaLabels.export")}
            onClick={() => {
              exportVisibilityCsv({
                language,
                totalMentions,
                brandPresence,
                competitorPresence,
                visibilityScore,
                trendPoints: trendPoints.map((p) => ({
                  date: p.date,
                  brandPresence: normalizePercent(p.avg_brand_presence_rate),
                  competitorPresence: normalizePercent(p.avg_competitor_mention_rate),
                  score: p.avg_visibility_score,
                })),
                topTopics: topTopicsData,
                platformBreakdown: visibilitySummary?.engine_breakdown.map((e) => ({
                  name: formatEngineName(e.engineName),
                  score: e.visibilityScore,
                  presenceRate: normalizePercent(e.brandPresenceRate),
                })) ?? [],
                latestMentions: latestMentions.map((m) => ({ platform: m.platform, quote: m.quote })),
              });
            }}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF] sm:flex-none"
          >
            <Download size={14} className="text-[#8A94B8]" />
            {t("export")}
          </button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_382px]">
        <div className="flex min-w-0 flex-col gap-4">
          {visibilityQuery.isPending ? (
            <MetricRowSkeleton count={4} />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={t("metrics.totalMentions.label")} value={totalMentions} helper={deltaTotalMentions ? `${deltaTotalMentions} ${formatPeriodLabel(trendPeriodDays)}` : "-"} icon={MessageCircle} tone="purple" sparklineValues={brandTrendValues.length > 1 ? brandTrendValues : []} />
              <MetricCard label={t("metrics.brandMentions.label")} value={brandPresence} helper={deltaBrandPresence ? `${deltaBrandPresence} ${formatPeriodLabel(trendPeriodDays)}` : "-"} icon={Target} tone="blue" sparklineValues={brandTrendValues.length > 1 ? brandTrendValues : []} />
              <MetricCard label={t("metrics.sov.label")} value={competitorPresence} helper={deltaSov ? `${deltaSov} ${formatPeriodLabel(trendPeriodDays)}` : "-"} icon={Shield} tone="green" sparklineValues={competitorTrendValues.length > 1 ? competitorTrendValues : []} />
              <MetricCard label={t("metrics.avgPos.label")} value={visibilityScore} helper={deltaScore ? `${deltaScore} ${formatPeriodLabel(trendPeriodDays)}` : "-"} icon={TrendingUp} tone="amber" sparklineValues={scoreTrendValues.length > 1 ? scoreTrendValues : []} />
            </div>
          )}

          {hasAnyVisibilityError ? (
            <DashboardErrorState
              title={t("error.title")}
              description={t("error.desc")}
              onRetry={() => {
                void visibilityQuery.refetch();
                void visibilitySummaryQuery.refetch();
                void visibilityTrendsQuery.refetch();
              }}
              minHeight="min-h-[150px]"
            />
          ) : null}

          <Panel className="border-[#D6DEFF] bg-gradient-to-r from-[#F6F8FF] to-[#F1F3FF]">
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_230px_260px] lg:items-center">
              <div className="flex items-start gap-4">
                <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-200 bg-[#F3ECFF] shadow-md sm:size-20">
                  <Image src="/mainapp/ai-avatar.png" alt="AI Agent avatar" fill sizes="80px" loading="lazy" className="object-cover" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-black uppercase tracking-[0.06em] text-[#101334]">{t("execSummary.title")}</p>
                    <Badge variant="purple" className="px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal">
                      {t("execSummary.aiGenerated")}
                    </Badge>
                  </div>
                  <h2 className="mt-1.5 text-[17px] font-black tracking-[-0.02em] text-[#101334]">{execHeading}</h2>
                  <p className="mt-2 max-w-[620px] text-[12px] font-semibold leading-relaxed text-[#53608C]">{execBody}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#D9DDF2] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#8A94B8]">
                    <TrendingUp size={11} className="text-[#10B981]" />
                    {t("execSummary.opportunity")}
                  </div>
                  <p className="mt-1 text-[11px] font-black leading-tight text-[#101334]">{execOpportunityValue}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#8A94B8]">
                    <AlertCircle size={11} className="text-[#EF4444]" />
                    {t("execSummary.risk")}
                  </div>
                  <p className="mt-1 text-[11px] font-black leading-tight text-[#101334]">{execRiskValue}</p>
                </div>
              </div>

              <div className="border-t border-[#D9DDF2] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <p className="text-[10px] font-black uppercase tracking-[0.04em] text-[#8A94B8]">{t("execSummary.recActions")}</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {geoActions.length === 0 ? (
                    <p className="text-[11px] font-bold text-[#8A94B8]">{tEmpty("noActionData")}</p>
                  ) : geoActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] font-semibold text-[#53608C]">
                      <CheckCircle size={13} className="mt-0.5 shrink-0 text-[#8B5CFF]" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setIsActionsModalOpen(true)} className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-[8px] bg-white px-3 py-2 text-center text-[11px] font-black leading-tight text-[#8B5CFF] shadow-sm transition hover:bg-[#F8FAFF]">
                  <span className="min-w-0 break-words">{t("execSummary.viewAll")}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </CardContent>
          </Panel>

          {/* Row 1 Grid: Mentions Trend & Top Topics */}
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <Panel>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-black tracking-[-0.02em] text-[#101334]">{t("mentionsTrend.title")}</h3>
                    <p className="text-[11px] font-bold text-[#8A94B8]">{t("mentionsTrend.desc")}</p>
                  </div>
                  <div className="flex rounded-lg bg-[#F5F7FC] p-0.5">
                    <button type="button" onClick={() => setSelectedDays(7)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-black transition", selectedDays === 7 ? "bg-white text-[#101334] shadow-sm" : "text-[#8A94B8] hover:text-[#101334]")}>
                      {t("mentionsTrend.days7")}
                    </button>
                    <button type="button" onClick={() => setSelectedDays(30)} className={cn("rounded-md px-2.5 py-1 text-[10px] font-black transition", selectedDays === 30 ? "bg-white text-[#101334] shadow-sm" : "text-[#8A94B8] hover:text-[#101334]")}>
                      {t("mentionsTrend.days30")}
                    </button>
                  </div>
                </div>
                <MentionsTrendChart datasets={mentionTrendDatasets} dates={trendDates.length > 1 ? trendDates : undefined} fallbackDates={chartFallbackDates} maxValue={(hasLiveVisibility || hasLiveSummary) ? 100 : undefined} emptyText={tEmpty("noTrendData")} formatTick={(value) => (hasLiveVisibility || hasLiveSummary) ? `${value}%` : value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()} />
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-[#53608C]">
                  {mentionTrendDatasets.map((dataset) => (
                    <span key={dataset.name} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: dataset.color }} />{dataset.name}</span>
                  ))}
                </div>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <h3 className="mb-4 text-[15px] font-black tracking-[-0.02em] text-[#101334]">{t("topTopics.title")}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-bold text-[#53608C]">
                      <thead>
                        <tr className="border-b border-[#EEF1F7] text-[10px] font-black uppercase text-[#8A94B8]">
                          <th className="pb-2.5">{t("topTopics.headers.topic")}</th>
                          <th className="pb-2.5 text-right">{t("topTopics.headers.mentions")}</th>
                          <th className="pb-2.5 text-center">{t("topTopics.headers.direction")}</th>
                          <th className="pb-2.5 text-center">{t("topTopics.headers.type")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTopicsData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-[12px] font-bold text-[#8A94B8]">{tEmpty("noTopicData")}</td>
                          </tr>
                        ) : topTopicsData.map((item, idx) => (
                          <tr key={`${item.topic}-${idx}`} className="border-b border-[#F5F7FC] last:border-0 hover:bg-[#FDFEFF]">
                            <td className="py-3 font-black text-[#101334]">{item.topic}</td>
                            <td className="py-3 text-right text-[#53608C]">{item.mentions}</td>
                            <td className="py-3 text-center"><TopicDirection val={item.direction} /></td>
                            <td className="py-3 text-center"><TopicTypeBadge type={item.type} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button type="button" onClick={() => router.push("/intelligence")} className="mt-4 flex items-center justify-center gap-1 text-[11px] font-black text-[#8B5CFF] hover:underline">
                  {t("topTopics.viewAll")}
                  <ChevronRight size={13} />
                </button>
              </CardContent>
            </Panel>
          </div>

          {/* Row 2 Grid: Sandbox & Visibility vs Competitors */}
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <Panel>
              <CardContent className="p-5">
                <h3 className="text-[15px] font-black tracking-[-0.02em] text-[#101334]">{t("sandbox.title")}</h3>
                <p className="text-[11px] font-bold text-[#8A94B8] mt-1">{t("sandbox.desc")}</p>
                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 size-4 text-[#8A94B8]" />
                    <input
                      type="text"
                      value={sandboxQuery}
                      onChange={(e) => setSandboxQuery(e.target.value)}
                      placeholder={t("sandbox.queryPlaceholder")}
                      className="h-10 w-full rounded-[8px] border border-[#D9DEEA] pl-10 pr-4 text-[16px] font-semibold text-[#101334] outline-none focus:border-[#8B5CFF] sm:text-[12px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={isSimulating || !sandboxQuery.trim() || workspaceSettingsQuery.isPending || !sandboxBrandName}
                    aria-label={t("ariaLabels.simulate")}
                    className="h-10 rounded-[8px] bg-[#8B5CFF] px-4 text-[12px] font-black text-white transition hover:bg-[#764ee6] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? (
                      <span className="flex items-center gap-2">
                        <RefreshCcw size={13} className="animate-spin" />
                        {language === "id" ? "Menganalisis..." : "Analyzing..."}
                      </span>
                    ) : t("sandbox.simulateBtn")}
                  </button>
                </div>
                {workspaceSettingsQuery.isPending || !sandboxBrandName ? (
                  <p className="mt-2 text-[11px] font-semibold text-[#8A94B8]">
                    {workspaceSettingsQuery.isPending ? t("sandbox.brandLoading") : t("sandbox.brandMissing")}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-[10px] bg-[#F6F8FF] border border-[#D9E1FC] p-4">
                    <p className="text-[10px] font-black uppercase text-[#8A94B8] tracking-[0.04em]">{t("sandbox.responseTitle")}</p>
                    <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#53608C]">{simulatedResponse}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8A94B8]">{t("sandbox.confidence")}</span>
                      <span className="text-[11px] font-black text-[#10B981]">{confidence}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#E5E9FC] overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full transition-all duration-300" style={{ width: `${confidence}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#8A94B8] tracking-[0.04em]">{t("sandbox.analysisMeta")}</p>
                      {sandboxMeta.length === 0 ? (
                        <p className="mt-2.5 rounded-[10px] border border-dashed border-[#D9DEEA] bg-[#F8FAFF] p-3 text-[11px] font-semibold leading-relaxed text-[#8A94B8]">{t("sandbox.metaEmpty")}</p>
                      ) : (
                        <div className="mt-2.5 space-y-2">
                          {sandboxMeta.map((item) => (
                            <div key={item.label} className="rounded-[9px] border border-[#F0F2F7] bg-white px-3 py-2">
                              <p className="text-[9px] font-black uppercase tracking-[0.04em] text-[#8A94B8]">{item.label}</p>
                              <p className="mt-1 break-words text-[11px] font-bold text-[#53608C]">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5">
                <h3 className="mb-4 text-[15px] font-black tracking-[-0.02em] text-[#101334]">{t("competitorVs.title")}</h3>
                <CompetitorVsChart datasets={competitorTrendDatasets} dates={trendDates.length > 1 ? trendDates : undefined} fallbackDates={chartFallbackDates} emptyText={tEmpty("noCompetitorData")} />
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-[#53608C]">
                  {competitorTrendDatasets.map((dataset) => (
                    <span key={dataset.name} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: dataset.color }} />{dataset.name}</span>
                  ))}
                </div>
              </CardContent>
            </Panel>
          </div>
        </div>

        {/* Right Sidebar Stack */}
        <aside className="flex flex-col gap-4">
          <Panel>
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-1.5 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                {t("topPlatforms.title")}
                <Info size={13} className="text-[#98A2B3]" />
              </h3>
              <div className="space-y-4">
                {topPlatforms.length === 0 ? (
                  <p className="text-[12px] font-bold text-[#8A94B8] text-center py-4">{tEmpty("noPlatformData")}</p>
                ) : topPlatforms.map((plat) => (
                  <div key={plat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[12px] font-bold text-[#53608C]">
                      <span className="flex items-center gap-2 text-[#101334] min-w-0">
                        <plat.logo className="size-[18px] shrink-0" />
                        <span className="truncate">{plat.name}</span>
                      </span>
                      <span className="shrink-0">{plat.mentions} <span className="text-[#8A94B8] font-semibold">({plat.pct})</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EEF1F7] overflow-hidden">
                      <div className="h-full bg-[#8B5CFF] rounded-full" style={{ width: plat.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Panel>

          <Panel>
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-1.5 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                {t("competitorShare.title")}
                <Info size={13} className="text-[#98A2B3]" />
              </h3>
              <div className="grid items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-[150px_minmax(0,1fr)]">
                {shareOfVoiceLeg.length > 0 ? (
                  <>
                    <DonutChartVisibility center={shareOfVoiceLeg[0]?.val ?? brandPresence} label={t("competitorShare.totalShare")} segments={donutSegments} />
                    <div className="flex w-full min-w-0 flex-col gap-2.5 text-[11px] font-bold text-[#53608C]">
                      {shareOfVoiceLeg.map((item) => {
                        const style = toneStyles[item.tone];
                        return (
                          <div key={item.name} className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: style.color }} />
                              <span className="truncate">{item.name}</span>
                            </span>
                            <span className="font-black text-[#101334]">{item.val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] font-bold text-[#8A94B8] text-center py-4 sm:col-span-2">{tEmpty("noSovData")}</p>
                )}
              </div>
            </CardContent>
          </Panel>

          <Panel>
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                    {t("latestMentions.title")}
                    <Info size={13} className="text-[#98A2B3]" />
                  </h3>
                  <button type="button" onClick={() => setIsMentionsModalOpen(true)} className="whitespace-nowrap text-[10px] font-black text-[#8B5CFF] hover:underline">
                    {t("latestMentions.viewAll")}
                  </button>
                </div>
                <div className="space-y-4">
                  {latestMentions.length === 0 ? (
                    <p className="text-[12px] font-bold text-[#8A94B8] text-center py-4">{tEmpty("noMentionData")}</p>
                  ) : latestMentions.map((item, idx) => (
                    <div key={idx} className="flex gap-3 border-b border-[#F0F2F7] pb-3 last:border-0 last:pb-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[#EEF1F7] bg-white">
                        <item.logo className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#101334]">{item.platform}</p>
                        <p className="text-[9px] font-semibold text-[#8A94B8] mt-0.5">{item.time}</p>
                        <p className="text-[11px] font-semibold leading-relaxed text-[#53608C] mt-1.5 italic">{item.quote}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Panel>
        </aside>
      </section>

      {/* Actions Modal */}
      {isActionsModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsActionsModalOpen(false)}>
          <div className="flex w-full max-w-lg flex-col max-h-[85vh] rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{t("execSummary.recActions")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{geoActions.length} {language === "id" ? "rekomendasi" : "recommendations"}</p>
              </div>
              <button type="button" onClick={() => setIsActionsModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {geoActions.length > 0 ? (
                <div className="space-y-3">
                  {geoActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-4 hover:border-[#DCE2F0] hover:bg-white transition">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#8B5CFF]/10 text-[#8B5CFF]">
                        <CheckCircle size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-[#101334]">{action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Info size={28} className="text-[#DDE3EF] mb-3" />
                  <p className="text-[13px] font-bold text-[#53608C]">{tEmpty("noActionData")}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* All Mentions Modal */}
      {isMentionsModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsMentionsModalOpen(false)}>
          <div className="flex w-full max-w-2xl flex-col max-h-[85vh] rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{t("latestMentions.title")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{allMentions.length} {language === "id" ? "prompt tercatat" : "prompts recorded"}</p>
              </div>
              <button type="button" onClick={() => setIsMentionsModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {allMentions.length > 0 ? (
                <div className="space-y-4">
                  {allMentions.map((item, idx) => (
                    <div key={idx} className="flex gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-4 hover:border-[#DCE2F0] hover:bg-white transition">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[#EEF1F7] bg-white">
                        <item.logo className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#101334]">{item.platform}</p>
                        <p className="text-[9px] font-semibold text-[#8A94B8] mt-0.5">{item.time}</p>
                        <p className="text-[11px] font-semibold leading-relaxed text-[#53608C] mt-1.5 italic">{item.quote}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Info size={28} className="text-[#DDE3EF] mb-3" />
                  <p className="text-[13px] font-bold text-[#53608C]">{tEmpty("noMentionData")}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
