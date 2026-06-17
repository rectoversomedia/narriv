"use client";

import Image from "next/image";
import { useState, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ExternalLink,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardEmptyState, DashboardErrorState, MetricRowSkeleton } from "@/components/dashboard/dashboard-states";
import { getVisibility, getVisibilitySummary, getVisibilityTrends, type VisibilityResponse } from "@/lib/api-service";
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
  if (values.length === 0) return null;
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
          <Sparkline values={sparklineValues} color={styles.color} />
        </div>
      </CardContent>
    </Panel>
  );
}

const fallbackMentionTrendDates = ["8 Mei", "9 Mei", "10 Mei", "11 Mei", "12 Mei", "13 Mei", "14 Mei"];
const fallbackMentionTrendDatasets: ChartDataset[] = [
  { name: "ChatGPT", color: "#8B5CFF", values: [650, 840, 950, 1100, 1200, 1150, 1248] },
  { name: "Google Gemini", color: "#465FFF", values: [420, 480, 520, 560, 590, 610, 643] },
  { name: "Microsoft Copilot", color: "#F59E0B", values: [210, 240, 260, 270, 290, 310, 321] },
  { name: "Perplexity", color: "#10B981", values: [80, 110, 130, 120, 140, 150, 156] },
  { name: "Claude", color: "#64748B", values: [40, 50, 60, 55, 70, 75, 83] },
];

function MentionsTrendChart({ datasets = fallbackMentionTrendDatasets, dates = fallbackMentionTrendDates, maxValue, formatTick = (value) => (value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()) }: { datasets?: ChartDataset[]; dates?: string[]; maxValue?: number; formatTick?: (value: number) => string }) {
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartDates = dates.length > 0 ? dates : fallbackMentionTrendDates;
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

const fallbackCompetitorTrendDatasets: ChartDataset[] = [
  { name: "Narriv (You)", color: "#8B5CFF", values: [24.3, 25.1, 23.8, 26.2, 28.0, 25.5, 24.3] },
  { name: "Competitor A", color: "#EF4444", values: [20.1, 22.4, 21.0, 24.8, 30.2, 29.8, 31.2] },
  { name: "Competitor B", color: "#F59E0B", values: [15.2, 17.5, 14.8, 18.0, 20.1, 18.5, 16.8] },
  { name: "Competitor C", color: "#10B981", values: [10.1, 11.2, 10.5, 12.0, 13.5, 12.8, 14.5] },
];

function CompetitorVsChart({ datasets = fallbackCompetitorTrendDatasets, dates = fallbackMentionTrendDates }: { datasets?: ChartDataset[]; dates?: string[] }) {
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 95;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartDates = dates.length > 0 ? dates : fallbackMentionTrendDates;
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
  let badgeVariant: "default" | "green" | "amber" | "red" | "purple" | "slate" = "slate";
  if (type === "Opportunity" || type === "Peluang") badgeVariant = "green";
  else if (type === "Alert" || type === "Peringatan") badgeVariant = "amber";
  else if (type === "Informational" || type === "Informasi") badgeVariant = "default";
  else if (type === "Risk" || type === "Risiko") badgeVariant = "red";
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
    : "conic-gradient(#8B5CFF_0_24.3%,#EF4444_24.3%_55.5%,#F59E0B_55.5%_72.3%,#10B981_72.3%_86.8%,#64748B_86.8%_100%)";

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

function buildLatestMentionQuote(prompt: NonNullable<VisibilityResponse["prompts"]>[number]) {
  const brand = prompt.brand ? `Brand: ${prompt.brand}` : "Brand response captured";
  const competitor = prompt.competitor ? `Competitor: ${prompt.competitor}` : "Competitor response captured";
  return `"${prompt.prompt}" - ${brand}; ${competitor}.`;
}

export default function VisibilityPage() {
  const t = useTranslations("Visibility");
  const language = useUiStore((state) => state.language);
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
    queryKey: ["visibility-trends"],
    queryFn: () => getVisibilityTrends(),
    staleTime: 60 * 1000,
  });
  const visibilityData = visibilityQuery.data;
  const visibilitySummary = visibilitySummaryQuery.data;
  const visibilityTrends = visibilityTrendsQuery.data;
  const isLiveUnavailable = visibilityData === null;
  const hasLiveVisibility = Boolean(visibilityData && (asNumber(visibilityData.score, 0) > 0 || (visibilityData.prompts?.length ?? 0) > 0));
  const hasLiveSummary = Boolean(visibilitySummary?.engine_breakdown.length || visibilitySummary?.kpis.total_analyses);

  const [sandboxQuery, setSandboxQuery] = useState("Best AI monitoring platform for enterprise");
  const [confidence, setConfidence] = useState(82);
  const [simulatedResponse, setSimulatedResponse] = useState(
    "Narriv is an enterprise AI narrative intelligence platform that helps organizations monitor signals, analyze data in real-time, and make smarter decisions."
  );
  const [citations, setCitations] = useState([
    { text: "narriv.ai/blog/ai-monitoring-enterprise", url: "#" },
    { text: "TechInAsia: Top AI monitoring tools 2025", url: "#" },
    { text: "LinkedIn Discussion: AI monitoring trends", url: "#" }
  ]);

  const handleSimulate = () => {
    const textQuery = sandboxQuery.toLowerCase();
    if (textQuery.includes("security") || textQuery.includes("risk") || textQuery.includes("aman")) {
      setSimulatedResponse(
        "For cloud security intelligence, competitors currently hold higher visibility rankings. Narriv is noted for general monitoring but lacks authority in specific cybersecurity namespaces."
      );
      setConfidence(64);
      setCitations([
        { text: "techradar.com/news/cloud-security-leaders", url: "#" },
        { text: "Gemini Search: Enterprise security references", url: "#" },
        { text: "Perplexity citation: Competitor A Cloud Authority", url: "#" }
      ]);
    } else {
      setSimulatedResponse(
        "Narriv is an enterprise AI narrative intelligence platform that helps organizations monitor signals, analyze data in real-time, and make smarter decisions."
      );
      setConfidence(82);
      setCitations([
        { text: "narriv.ai/blog/ai-monitoring-enterprise", url: "#" },
        { text: "TechInAsia: Top AI monitoring tools 2025", url: "#" },
        { text: "LinkedIn Discussion: AI monitoring trends", url: "#" }
      ]);
    }
  };

  const trendPoints = visibilityTrends?.trends ?? [];
  const trendDates = trendPoints.map((point) => formatChartDate(point.date, language));
  const brandTrendValues = trendPoints.map((point) => normalizePercent(point.avg_brand_presence_rate));
  const competitorTrendValues = trendPoints.map((point) => normalizePercent(point.avg_competitor_mention_rate));
  const scoreTrendValues = trendPoints.map((point) => point.avg_visibility_score);

  const fallbackTopTopicsData = [
    { topic: "AI monitoring", mentions: "1.248", direction: "↑ 24,5%", type: language === "id" ? "Peluang" : "Opportunity" },
    { topic: "Service disruption", mentions: "842", direction: "↑ 18,3%", type: language === "id" ? "Peringatan" : "Alert" },
    { topic: "App update", mentions: "621", direction: "↑ 12,7%", type: language === "id" ? "Informasi" : "Informational" },
    { topic: "Cloud security", mentions: "498", direction: "↓ 16,2%", type: language === "id" ? "Risiko" : "Risk" },
    { topic: "Privacy policy", mentions: "368", direction: "↓ 6,2%", type: language === "id" ? "Netral" : "Neutral" }
  ];
  const topTopicsData = visibilityData?.prompts?.length
    ? visibilityData.prompts.slice(0, 5).map((prompt) => ({
      topic: prompt.prompt,
      mentions: prompt.brand || "-",
      direction: prompt.brandTone || "Live",
      type: formatEngineName(prompt.engine),
    }))
    : fallbackTopTopicsData;
  const totalMentions = visibilityData?.presenceMentions ? String(visibilityData.presenceMentions) : t("metrics.totalMentions.value");
  const brandPresencePercent = normalizePercent(visibilityData?.presence, normalizePercent(visibilitySummary?.kpis.avg_brand_presence_rate, 24.3));
  const competitorPresencePercent = normalizePercent(visibilityData?.competitor, normalizePercent(visibilitySummary?.kpis.avg_competitor_mention_rate, 31.2));
  const visibilityScoreValue = asNumber(visibilityData?.score, visibilitySummary?.kpis.avg_visibility_score ?? 2.8);
  const brandPresence = formatPercent(brandPresencePercent, language);
  const competitorPresence = formatPercent(competitorPresencePercent, language);
  const visibilityScore = new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 }).format(visibilityScoreValue);
  const geoActions = visibilityData?.geoActions?.length
    ? visibilityData.geoActions.slice(0, 3).map((action) => action.title)
    : [t("execSummary.rec1"), t("execSummary.rec2"), t("execSummary.rec3")];

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
    return fallbackMentionTrendDatasets;
  })();

  const competitorTrendDatasets = (() => {
    if (brandTrendValues.length > 1 || competitorTrendValues.length > 1) {
      return [
        { name: language === "id" ? "Narriv (Anda)" : "Narriv (You)", color: "#8B5CFF", values: brandTrendValues },
        { name: language === "id" ? "Kompetitor" : "Competitors", color: "#EF4444", values: competitorTrendValues },
      ];
    }
    return fallbackCompetitorTrendDatasets;
  })();

  const topPlatforms = (() => {
    if (!visibilitySummary?.engine_breakdown.length) {
      return [
        { name: "ChatGPT", logo: OpenAILight, mentions: "1.248", pct: "50,9%", width: "50.9%" },
        { name: "Google Gemini", logo: Gemini, mentions: "643", pct: "26,2%", width: "26.2%" },
        { name: "Microsoft Copilot", logo: MicrosoftCopilot, mentions: "321", pct: "13,1%", width: "13.1%" },
        { name: "Perplexity", logo: PerplexityAI, mentions: "156", pct: "6,4%", width: "6.4%" },
        { name: "Claude", logo: ClaudeAI, mentions: "83", pct: "3,4%", width: "3.4%" },
      ];
    }

    return visibilitySummary.engine_breakdown
      .slice()
      .sort((a, b) => b.visibilityScore - a.visibilityScore)
      .map((engine) => {
        const presence = normalizePercent(engine.brandPresenceRate);
        return {
          name: formatEngineName(engine.engineName),
          logo: getEngineLogo(engine.engineName),
          mentions: `${new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 }).format(engine.visibilityScore)} score`,
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
    : [
      { name: language === "id" ? "Narriv (Anda)" : "Narriv (You)", val: "24.3%", tone: "purple" as Tone },
      { name: "Competitor A", val: "31.2%", tone: "red" as Tone },
      { name: "Competitor B", val: "16.8%", tone: "amber" as Tone },
      { name: "Competitor C", val: "14.5%", tone: "green" as Tone },
      { name: "Others", val: "13.2%", tone: "slate" as Tone }
    ];
  const donutSegments = hasLiveVisibility || hasLiveSummary
    ? [
      { color: toneStyles.purple.color, value: brandPresencePercent },
      { color: toneStyles.red.color, value: competitorPresencePercent },
      { color: toneStyles.slate.color, value: otherSharePercent },
    ]
    : shareOfVoiceLeg.map((item) => ({ color: toneStyles[item.tone].color, value: normalizePercent(item.val) }));
  const latestMentions = visibilityData?.prompts?.length
    ? visibilityData.prompts.slice(0, 3).map((prompt) => ({
      logo: getEngineLogo(prompt.engine),
      platform: formatEngineName(prompt.engine),
      time: language === "id" ? "Uji prompt terbaru" : "Latest prompt test",
      quote: buildLatestMentionQuote(prompt),
    }))
    : [
      { logo: OpenAILight, platform: "ChatGPT", time: "14 Mei 2025 • 10:23", quote: "“Narriv adalah platform AI intelligence yang membantu organisasi memantau sinyal dan menganalisis data reputasi...”" },
      { logo: Gemini, platform: "Google Gemini", time: "14 Mei 2025 • 09:48", quote: "“Untuk kebutuhan monitoring sinyal dan analisis data real-time, Narriv bisa menjadi solusi yang tepat...”" },
      { logo: PerplexityAI, platform: "Perplexity", time: "14 Mei 2025 • 08:15", quote: "“Narriv menyediakan dashboard intelligence yang powerful untuk pengambilan keputusan berbasis data...”" },
    ];
  const execOpportunityValue = hasLiveVisibility || hasLiveSummary
    ? `${brandPresence} ${language === "id" ? "kehadiran brand" : "brand presence"}`
    : t("execSummary.opportunityVal");
  const execRiskValue = hasLiveVisibility || hasLiveSummary
    ? `${competitorPresence} ${language === "id" ? "sebutan kompetitor" : "competitor mention rate"}`
    : t("execSummary.riskVal");

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#8A94B8]">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-[28px] font-black leading-none tracking-[-0.03em] text-[#101334]">{t("title")}</h1>
          <p className="mt-2 text-[13px] font-bold text-[#53608C]">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
          <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF] sm:flex-none">
            <CalendarDays size={14} className="text-[#8A94B8]" />
            {t("last7Days")}
            <ChevronDown size={12} className="text-[#8A94B8]" />
          </button>
          <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF] sm:flex-none">
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
              <MetricCard label={t("metrics.totalMentions.label")} value={totalMentions} helper={hasLiveVisibility ? "Live API" : t("metrics.totalMentions.helper")} icon={MessageCircle} tone="purple" sparklineValues={brandTrendValues.length > 1 ? brandTrendValues : [260, 330, 310, 500, 470, 520, 680]} />
              <MetricCard label={t("metrics.brandMentions.label")} value={brandPresence} helper={hasLiveVisibility ? "Brand presence" : t("metrics.brandMentions.helper")} icon={Target} tone="blue" sparklineValues={brandTrendValues.length > 1 ? brandTrendValues : [150, 180, 170, 220, 210, 240, 289]} />
              <MetricCard label={t("metrics.sov.label")} value={competitorPresence} helper={hasLiveVisibility ? "Competitor presence" : t("metrics.sov.helper")} icon={Shield} tone="green" sparklineValues={competitorTrendValues.length > 1 ? competitorTrendValues : [22.5, 23.1, 22.8, 24.0, 23.5, 24.1, 24.3]} />
              <MetricCard label={t("metrics.avgPos.label")} value={visibilityScore} helper={hasLiveVisibility ? "Visibility score" : t("metrics.avgPos.helper")} icon={TrendingUp} tone="amber" sparklineValues={scoreTrendValues.length > 1 ? scoreTrendValues : [3.2, 3.1, 3.0, 2.9, 2.8, 2.8, 2.8]} />
            </div>
          )}

          {isLiveUnavailable ? <DashboardErrorState title="Visibility live belum bisa dimuat" description="API client sudah mencoba token refresh. Untuk sementara, halaman menampilkan data contoh." onRetry={() => void visibilityQuery.refetch()} minHeight="min-h-[150px]" /> : null}
          {visibilityData && !hasLiveVisibility ? <DashboardEmptyState title="Belum ada visibility live" description="Backend berhasil dihubungi, tetapi belum ada hasil AI visibility. Data contoh tetap ditampilkan sebagai preview." icon="search" minHeight="min-h-[180px]" /> : null}

          <Panel className="border-[#D6DEFF] bg-gradient-to-r from-[#F6F8FF] to-[#F1F3FF]">
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_230px_260px] lg:items-center">
              <div className="flex items-start gap-4">
                <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-200 bg-[#F3ECFF] shadow-md sm:size-20">
                  <Image src="/mainapp/ai-avatar.png" alt="AI Agent avatar" fill sizes="80px" className="object-cover" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-black uppercase tracking-[0.06em] text-[#101334]">{t("execSummary.title")}</p>
                    <Badge variant="purple" className="px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal">
                      {t("execSummary.aiGenerated")}
                    </Badge>
                  </div>
                  <h2 className="mt-1.5 text-[17px] font-black tracking-[-0.02em] text-[#101334]">{t("execSummary.heading")}</h2>
                  <p className="mt-2 max-w-[620px] text-[12px] font-semibold leading-relaxed text-[#53608C]">{t("execSummary.body")}</p>
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
                  {geoActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] font-semibold text-[#53608C]">
                      <CheckCircle size={13} className="mt-0.5 shrink-0 text-[#8B5CFF]" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
                <button type="button" className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-[8px] bg-white px-3 py-2 text-center text-[11px] font-black leading-tight text-[#8B5CFF] shadow-sm transition hover:bg-[#F8FAFF]">
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
                    <button type="button" className="rounded-md bg-white px-2.5 py-1 text-[10px] font-black text-[#101334] shadow-sm">
                      {t("mentionsTrend.days7")}
                    </button>
                    <button type="button" className="px-2.5 py-1 text-[10px] font-bold text-[#8A94B8] hover:text-[#101334]">
                      {t("mentionsTrend.days30")}
                    </button>
                  </div>
                </div>
                <MentionsTrendChart datasets={mentionTrendDatasets} dates={trendDates.length > 1 ? trendDates : undefined} maxValue={(hasLiveVisibility || hasLiveSummary) ? 100 : undefined} formatTick={(value) => (hasLiveVisibility || hasLiveSummary) ? `${value}%` : value === 0 ? "0" : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()} />
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
                        {topTopicsData.map((item) => (
                          <tr key={item.topic} className="border-b border-[#F5F7FC] last:border-0 hover:bg-[#FDFEFF]">
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
                <button type="button" className="mt-4 flex items-center justify-center gap-1 text-[11px] font-black text-[#8B5CFF] hover:underline">
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
                      className="h-10 w-full rounded-[8px] border border-[#D9DEEA] pl-10 pr-4 text-[12px] font-semibold text-[#101334] outline-none focus:border-[#8B5CFF]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulate}
                    className="h-10 rounded-[8px] bg-[#8B5CFF] px-4 text-[12px] font-black text-white transition hover:bg-[#764ee6] shadow-sm"
                  >
                    {t("sandbox.simulateBtn")}
                  </button>
                </div>

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
                      <p className="text-[10px] font-black uppercase text-[#8A94B8] tracking-[0.04em]">{t("sandbox.citations")}</p>
                      <div className="mt-2.5 space-y-2">
                        {citations.map((cite, idx) => (
                          <a key={idx} href={cite.url} className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#53608C] hover:text-[#8B5CFF] transition pb-2 border-b border-[#F0F2F7] last:border-0 last:pb-0">
                            <span className="truncate">{cite.text}</span>
                            <ExternalLink size={12} className="shrink-0 text-[#8A94B8]" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5">
                <h3 className="mb-4 text-[15px] font-black tracking-[-0.02em] text-[#101334]">{t("competitorVs.title")}</h3>
                <CompetitorVsChart datasets={competitorTrendDatasets} dates={trendDates.length > 1 ? trendDates : undefined} />
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
                {topPlatforms.map((plat) => (
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
                  <button type="button" className="text-[11px] font-black text-[#8B5CFF] hover:underline">
                    {t("latestMentions.viewAll")}
                  </button>
                </div>
                <div className="space-y-4">
                  {latestMentions.map((item, idx) => (
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
    </div>
  );
}
