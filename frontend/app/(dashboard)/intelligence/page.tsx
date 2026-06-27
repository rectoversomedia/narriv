"use client";

import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bot,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Database,
  FileText,
  Filter,
  Info,
  Layers3,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Network,
  RefreshCcw,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { getNarrativeById, getNarratives, getSources, type NarrativeRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/store/useUiStore";
import { useToast } from "@/components/ui/toast";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type LocalizedText = { en: string; id: string };

type Cluster = {
  id: string;
  topic: LocalizedText;
  signals: number;
  growth: string;
  tone: Tone;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  x: number;
  y: number;
  color: string;
  size?: "high" | "large" | "medium" | "small";
  priority: LocalizedText;
  priorityTone: Tone;
  description: LocalizedText;
  related: Array<{ topic: LocalizedText; growth: string }>;
  aiRec: LocalizedText;
};

type NarrativeConnection = { from: string; to: string; strength: "weak" | "strong" };
type ImpactFilter = "all" | "critical" | "high" | "medium" | "low";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

const narrativeApiLimit = 10;

const periodOptions = [
  { key: "last24h", days: 1 },
  { key: "last7d", days: 7 },
  { key: "last30d", days: 30 },
  { key: "last90d", days: 90 },
] as const;

type PeriodOption = (typeof periodOptions)[number];

const impactOptions: ImpactFilter[] = ["all", "critical", "high", "medium", "low"];
const sentimentOptions: SentimentFilter[] = ["all", "positive", "negative", "neutral"];

type ToneStyle = {
  color: string;
  rgb: string;
  badge: "default" | "green" | "amber" | "red" | "purple" | "slate";
};

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", badge: "default" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", badge: "purple" },
  green: { color: "#10B981", rgb: "16,185,129", badge: "green" },
  red: { color: "#EF4444", rgb: "239,68,68", badge: "red" },
  amber: { color: "#F59E0B", rgb: "245,158,11", badge: "amber" },
  slate: { color: "#64748B", rgb: "100,116,139", badge: "slate" },
};

const mapSpecks: Array<{ x: number; y: number; tone: Tone; size: number; opacity: number }> = [
  { x: 18, y: 26, tone: "blue", size: 12, opacity: 0.42 },
  { x: 22, y: 53, tone: "blue", size: 10, opacity: 0.38 },
  { x: 28, y: 34, tone: "red", size: 8, opacity: 0.2 },
  { x: 32, y: 63, tone: "purple", size: 11, opacity: 0.26 },
  { x: 38, y: 19, tone: "red", size: 8, opacity: 0.18 },
  { x: 42, y: 68, tone: "red", size: 12, opacity: 0.28 },
  { x: 47, y: 30, tone: "red", size: 8, opacity: 0.16 },
  { x: 54, y: 20, tone: "purple", size: 9, opacity: 0.2 },
  { x: 58, y: 39, tone: "green", size: 11, opacity: 0.32 },
  { x: 63, y: 60, tone: "amber", size: 8, opacity: 0.22 },
  { x: 69, y: 28, tone: "green", size: 12, opacity: 0.28 },
  { x: 76, y: 41, tone: "purple", size: 11, opacity: 0.32 },
  { x: 82, y: 56, tone: "blue", size: 12, opacity: 0.36 },
  { x: 86, y: 31, tone: "purple", size: 10, opacity: 0.28 },
  { x: 15, y: 69, tone: "blue", size: 11, opacity: 0.34 },
  { x: 24, y: 74, tone: "amber", size: 7, opacity: 0.18 },
  { x: 35, y: 78, tone: "blue", size: 8, opacity: 0.18 },
  { x: 51, y: 76, tone: "red", size: 9, opacity: 0.18 },
  { x: 66, y: 73, tone: "amber", size: 8, opacity: 0.2 },
  { x: 79, y: 70, tone: "blue", size: 9, opacity: 0.26 },
  { x: 13, y: 39, tone: "blue", size: 9, opacity: 0.34 },
  { x: 30, y: 22, tone: "amber", size: 8, opacity: 0.22 },
  { x: 45, y: 16, tone: "red", size: 11, opacity: 0.15 },
  { x: 60, y: 17, tone: "green", size: 9, opacity: 0.24 },
  { x: 73, y: 18, tone: "green", size: 8, opacity: 0.18 },
  { x: 90, y: 49, tone: "blue", size: 9, opacity: 0.28 },
];

const nodeSizeClasses = {
  high: "size-[92px] text-[10px] sm:size-[116px] sm:text-[11px]",
  large: "size-[82px] text-[9px] sm:size-[96px] sm:text-[10px]",
  medium: "size-[72px] text-[8px] sm:size-[84px] sm:text-[9px]",
  small: "size-[60px] text-[8px] sm:size-[70px] sm:text-[8px]",
};

const sentimentColor = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#94A3B8",
};

type DonutDatum = { name: string; value: number; tone: Tone };
type LifecycleKey = "emerging" | "accelerating" | "peaking" | "declining" | "dormant";
type LifecycleSeries = Record<LifecycleKey, number[]>;

const emptyLifecycleSeries = [0, 0, 0, 0, 0, 0, 0];

function text(value: LocalizedText, language: "en" | "id") {
  return value[language] || value.en;
}

function buildEmptyCluster(t: ReturnType<typeof useTranslations<"Intelligence">>): Cluster {
  return {
    id: "empty",
    topic: { en: t("emptyCluster.topic"), id: t("emptyCluster.topic") },
    signals: 0,
    growth: "0%",
    tone: "slate",
    sentiment: "neutral",
    x: 50,
    y: 50,
    color: "#94A3B8",
    size: "medium",
    priority: { en: t("emptyCluster.priority"), id: t("emptyCluster.priority") },
    priorityTone: "slate",
    description: { en: t("emptyCluster.description"), id: t("emptyCluster.description") },
    related: [],
    aiRec: { en: t("emptyCluster.aiRec"), id: t("emptyCluster.aiRec") },
  };
}

function formatSignals(value: number) {
  return value.toLocaleString("en-US");
}

function sentimentToTone(sentiment: string): Tone {
  const normalized = sentiment.toLowerCase();
  if (normalized.includes("positive")) return "green";
  if (normalized.includes("negative")) return "red";
  if (normalized.includes("mixed")) return "amber";
  return "purple";
}

function impactToPriorityTone(impact: string): Tone {
  const normalized = impact.toLowerCase();
  if (normalized.includes("high")) return "red";
  if (normalized.includes("low")) return "green";
  return "amber";
}

function buildNarrativeClusters(records: NarrativeRecord[], labels: { sources: (count: number) => string; mediumPriority: string }): Cluster[] {
  return records.map((record, index) => {
    const tone = sentimentToTone(record.sentiment);
    const priorityTone = impactToPriorityTone(record.impact);
    const mapSpeck = mapSpecks[index % mapSpecks.length];
    const sentimentHex = sentimentColor[tone === "green" ? "positive" : tone === "red" ? "negative" : "neutral"];

    return {
      id: record.id,
      topic: { en: record.title, id: record.title },
      signals: record.signalCount,
      growth: record.velocity,
      tone,
      sentiment: tone === "green" ? "positive" : tone === "red" ? "negative" : "neutral",
      priority: {
        en: record.impact || labels.mediumPriority,
        id: record.impact || labels.mediumPriority,
      },
      priorityTone,
      description: {
        en: record.description || record.recommendedFocus,
        id: record.description || record.recommendedFocus,
      },
      related: [
        { topic: { en: labels.sources(record.sourceCount), id: labels.sources(record.sourceCount) }, growth: `${record.confidence}%` },
      ],
      aiRec: {
        en: record.recommendedFocus,
        id: record.recommendedFocus,
      },
      x: mapSpeck.x,
      y: mapSpeck.y,
      color: sentimentHex,
      size: (record.signalCount > 1000 ? "high" : record.signalCount > 500 ? "large" : record.signalCount > 100 ? "medium" : "small") as Cluster["size"],
    };
  }) as Cluster[];
}

function buildNarrativeConnections(clusters: Cluster[]): NarrativeConnection[] {
  if (clusters.length < 2) return [];

  const ranked = clusters.slice().sort((a, b) => b.signals - a.signals);
  const hub = ranked[0];
  const hubConnections = ranked.slice(1, 8).map((cluster, index) => ({
    from: hub.id,
    to: cluster.id,
    strength: index < 4 || Math.abs(parseGrowthPercent(cluster.growth)) >= 25 ? "strong" : "weak",
  } satisfies NarrativeConnection));

  const lateralConnections: NarrativeConnection[] = [];
  for (let index = 1; index < Math.min(ranked.length - 1, 6); index += 2) {
    lateralConnections.push({ from: ranked[index].id, to: ranked[index + 1].id, strength: "weak" });
  }

  return [...hubConnections, ...lateralConnections];
}

function parseGrowthPercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildNarrativeShareData(clusters: Cluster[], labels: { noData: string; others: string }): DonutDatum[] {
  const totalSignals = clusters.reduce((sum, cluster) => sum + cluster.signals, 0);
  if (totalSignals <= 0) return [{ name: labels.noData, value: 100, tone: "slate" }];

  const topClusters = clusters
    .slice()
    .sort((a, b) => b.signals - a.signals)
    .slice(0, 4);
  const topTotal = topClusters.reduce((sum, cluster) => sum + cluster.signals, 0);
  const rows = topClusters.map((cluster) => ({
    name: text(cluster.topic, "en"),
    value: Math.round((cluster.signals / totalSignals) * 100),
    tone: cluster.tone,
  }));
  const remaining = Math.max(0, totalSignals - topTotal);
  if (remaining > 0) {
    rows.push({ name: labels.others, value: Math.max(1, Math.round((remaining / totalSignals) * 100)), tone: "slate" });
  }
  return rows;
}

function classifyLifecycle(cluster: Cluster): LifecycleKey {
  const growth = parseGrowthPercent(cluster.growth);
  const priority = text(cluster.priority, "en").toLowerCase();
  if (growth < 0) return "declining";
  if (growth >= 25) return "accelerating";
  if (priority.includes("high") || cluster.signals >= 1000) return "peaking";
  if (growth === 0 || cluster.signals <= 0) return "dormant";
  return "emerging";
}

function buildLifecycleFromClusters(clusters: Cluster[]) {
  const counts: Record<LifecycleKey, number> = {
    emerging: 0,
    accelerating: 0,
    peaking: 0,
    declining: 0,
    dormant: 0,
  };

  clusters.forEach((cluster) => {
    counts[classifyLifecycle(cluster)] += 1;
  });

  const series = Object.fromEntries(
    (Object.keys(counts) as LifecycleKey[]).map((key) => {
      const count = counts[key];
      return [key, count > 0 ? [Math.max(0, count - 2), Math.max(0, count - 1), count, count + 1, count, count + 2, count] : emptyLifecycleSeries];
    })
  ) as LifecycleSeries;

  return { counts, series };
}

function buildDynamicAiSummary(clusters: Cluster[], lifecycleCounts: Record<LifecycleKey, number>, ti: ReturnType<typeof useTranslations<"Intelligence">>, language: "en" | "id") {
  if (clusters.length === 0 || clusters[0].id === "empty") {
    return {
      box: ti("aiSummaryDynamic.boxEmpty"),
      bullets: [],
    };
  }

  const topCluster = clusters[0];
  const sortedByGrowth = [...clusters].sort((a, b) => parseGrowthPercent(b.growth) - parseGrowthPercent(a.growth));
  const fastest = sortedByGrowth[0];
  const negativeClusters = clusters.filter(c => c.sentiment === "negative");
  const highestRisk = negativeClusters.length > 0 ? negativeClusters[0] : (clusters[1] || topCluster);

  const bullets = [
    ti("aiSummaryDynamic.bulletFastest", { topic: text(fastest.topic, language), growth: fastest.growth }),
    ti("aiSummaryDynamic.bulletRisk", { topic: text(highestRisk.topic, language), sentiment: ti(`topicMap.${highestRisk.sentiment === "negative" ? "neg" : highestRisk.sentiment === "positive" ? "pos" : "neu"}`) }),
    ti("aiSummaryDynamic.bulletRec", { rec: text(topCluster.aiRec, language) }),
    ti("aiSummaryDynamic.bulletEmerging", { count: lifecycleCounts.emerging })
  ];

  return {
    box: ti("aiSummaryDynamic.box", { 
      topic: text(topCluster.topic, language), 
      signals: formatSignals(topCluster.signals),
      impact: text(topCluster.priority, language).toLowerCase()
    }),
    bullets
  };
}

function buildDonutGradient(items: DonutDatum[]) {
  let cursor = 0;
  const stops = items.map((item) => {
    const toneStyle = toneStyles[item.tone];
    const next = Math.min(100, cursor + Math.max(0, item.value));
    const stop = `${toneStyle.color} ${cursor}% ${next}%`;
    cursor = next;
    return stop;
  });
  if (cursor < 100) stops.push(`${toneStyles.slate.color} ${cursor}% 100%`);
  return `conic-gradient(${stops.join(",")})`;
}

function Panel({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Card className={cn("rounded-[14px] border-[#E6EAF2] bg-white text-[#101334] shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)} onClick={onClick}>
      {children}
    </Card>
  );
}

function IconHalo({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const toneStyle = toneStyles[tone];

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-full border shadow-[0_12px_22px_rgba(16,24,40,0.06)]"
      style={{
        color: toneStyle.color,
        borderColor: `rgba(${toneStyle.rgb}, 0.12)`,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.9), rgba(${toneStyle.rgb}, .13))`,
      }}
    >
      <Icon size={22} strokeWidth={2.3} />
    </div>
  );
}

function MetricCard({ label, value, helper, icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  return (
    <Panel>
      <CardContent className="flex min-h-[88px] items-center gap-4 p-4">
        <IconHalo icon={icon} tone={tone} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold leading-none text-[#68739F]">{label}</p>
          <p className="mt-2 text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
          <p className="mt-2 flex items-center gap-1 text-[11px] font-black text-[#10B981]">
            <span className="size-1.5 rounded-full bg-[#10B981]" />
            {helper.replace("▲ ", "")}
          </p>
        </div>
      </CardContent>
    </Panel>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const safeValues = values.length > 1 ? values : [0, 0];
  const width = 100;
  const height = 36;
  const max = Math.max(...safeValues);
  const min = Math.min(...safeValues);
  const range = max - min || 1;
  const path = safeValues
    .map((value, index) => {
      const x = (index / (safeValues.length - 1)) * 96 + 2;
      const y = height - ((value - min) / range) * 28 - 4;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg className="chart-line-draw h-10 w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={`${path} L 98 ${height} L 2 ${height} Z`} fill={color} opacity="0.08" />
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function ClusterIcon({ tone }: { tone: Tone }) {
  const toneStyle = toneStyles[tone];

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border"
      style={{
        color: toneStyle.color,
        borderColor: `rgba(${toneStyle.rgb}, 0.14)`,
        backgroundColor: `rgba(${toneStyle.rgb}, 0.09)`,
      }}
    >
      <Network size={15} strokeWidth={2.4} />
    </span>
  );
}

function TrendBadge({ value, tone, className }: { value: string; tone: Tone; className?: string }) {
  return (
    <Badge variant={toneStyles[tone].badge} className={cn("normal-case tracking-normal", className)}>
      {value}
    </Badge>
  );
}

function CompetitorDonut({ label, gradient, totalLabel }: { label: string; gradient: string; totalLabel: string }) {
  return (
    <div className="chart-donut-enter relative flex size-[150px] shrink-0 items-center justify-center rounded-full shadow-[0_12px_24px_rgba(70,95,255,0.10)]" style={{ background: gradient }}>
      <div className="absolute size-[102px] rounded-full bg-white" />
      <div className="relative max-w-[86px] text-center">
        <p className="text-[12px] font-black leading-tight text-[#101334]">{totalLabel}</p>
        <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#737D9F]">{label}</p>
      </div>
    </div>
  );
}

function MapNode({ cluster, selected, language, signalLabel, onSelect }: { cluster: Cluster; selected: boolean; language: "en" | "id"; signalLabel: string; onSelect: (cluster: Cluster) => void }) {
  const toneStyle = toneStyles[cluster.tone];
  const style = {
    left: `${cluster.x}%`,
    top: `${cluster.y}%`,
    zIndex: selected ? 20 : 10,
    borderColor: selected ? toneStyle.color : `rgba(${toneStyle.rgb}, 0.28)`,
    boxShadow: selected ? `0 0 0 10px rgba(${toneStyle.rgb}, .13), 0 18px 42px rgba(${toneStyle.rgb}, .22)` : "0 10px 26px rgba(16,24,40,.07)",
  } satisfies CSSProperties;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(cluster)}
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border bg-white/95 text-center outline-none backdrop-blur transition duration-300 hover:-translate-y-[52%] hover:shadow-[0_18px_42px_rgba(16,24,40,0.1)]",
        nodeSizeClasses[cluster.size ?? "medium"]
      )}
      style={style}
    >
      {selected ? <span className="absolute -inset-3 rounded-full opacity-20 blur-xl" style={{ backgroundColor: toneStyle.color }} /> : null}
      <span
        className="absolute right-[17%] top-[17%] size-2 rounded-full border border-white shadow-sm"
        style={{ backgroundColor: sentimentColor[cluster.sentiment === "mixed" ? "neutral" : cluster.sentiment] }}
      />
      <span className="relative px-2 font-black leading-tight text-[#101334]">{text(cluster.topic, language)}</span>
      <span className="relative mt-1 text-[9px] font-bold text-[#8A94B8]">{signalLabel}</span>
      <span className="relative mt-1.5 rounded-full px-2 py-0.5 text-[8px] font-black" style={{ backgroundColor: `rgba(${toneStyle.rgb}, .1)`, color: toneStyle.color }}>
        {cluster.growth}
      </span>
    </button>
  );
}

export default function IntelligencePage() {
  const ti = useTranslations("Intelligence");
  const toastHook = useToast();
  const router = useRouter();
  const language = useUiStore((state) => state.language);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(periodOptions[1]);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [isImpactMenuOpen, setIsImpactMenuOpen] = useState(false);
  const [isSentimentMenuOpen, setIsSentimentMenuOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [isAllClustersModalOpen, setIsAllClustersModalOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isLandscapeOpen, setIsLandscapeOpen] = useState(false);
  const [isSelectedActionsOpen, setIsSelectedActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const periodMenuRef = useRef<HTMLDivElement | null>(null);
  const impactMenuRef = useRef<HTMLDivElement | null>(null);
  const sentimentMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountedId = window.setTimeout(() => setMounted(true), 0);
    
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (isPeriodMenuOpen && periodMenuRef.current && !periodMenuRef.current.contains(target)) setIsPeriodMenuOpen(false);
      if (isImpactMenuOpen && impactMenuRef.current && !impactMenuRef.current.contains(target)) setIsImpactMenuOpen(false);
      if (isSentimentMenuOpen && sentimentMenuRef.current && !sentimentMenuRef.current.contains(target)) setIsSentimentMenuOpen(false);
      if (isSelectedActionsOpen && actionsMenuRef.current && !actionsMenuRef.current.contains(target)) setIsSelectedActionsOpen(false);
    }
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsAnalysisOpen(false);
        setIsLandscapeOpen(false);
        setIsAllClustersModalOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(mountedId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPeriodMenuOpen, isImpactMenuOpen, isSentimentMenuOpen, isSelectedActionsOpen]);

  const narrativesQuery = useQuery({
    queryKey: ["narratives", { limit: narrativeApiLimit, days: selectedPeriod.days, impact: impactFilter, sentiment: sentimentFilter }],
    queryFn: () => getNarratives({
      limit: narrativeApiLimit,
      days: selectedPeriod.days,
      impact: impactFilter === "all" ? undefined : impactFilter,
      sentiment: sentimentFilter === "all" ? undefined : sentimentFilter,
    }),
    staleTime: 30 * 1000,
  });
  const liveNarrativeRecords = narrativesQuery.data?.data ?? [];
  const liveClusters = liveNarrativeRecords.length > 0 ? buildNarrativeClusters(liveNarrativeRecords, { sources: (count) => ti("labels.sources", { count }), mediumPriority: ti("mediumPriorityFallback") }) : [];
  const isLiveUnavailable = narrativesQuery.data === null || narrativesQuery.isError;
  const clusters = liveClusters;
  const emptyCluster = buildEmptyCluster(ti);
  const selectedCluster = clusters.find((cluster) => cluster.id === selectedClusterId) ?? clusters[0] ?? emptyCluster;
  const selectedNarrativeId = selectedCluster.id === "empty" ? null : selectedCluster.id;
  const selectedLifecycleKey = selectedNarrativeId ? classifyLifecycle(selectedCluster) : null;
  const narrativeConnections = buildNarrativeConnections(clusters);
  const narrativeDetailQuery = useQuery({
    queryKey: ["narrative-detail", selectedNarrativeId],
    queryFn: () => selectedNarrativeId ? getNarrativeById(selectedNarrativeId) : null,
    enabled: Boolean(selectedNarrativeId && isAnalysisOpen),
    staleTime: 30 * 1000,
  });
  const sourcesQuery = useQuery({
    queryKey: ["sources-intelligence-stats"],
    queryFn: () => getSources({ limit: 100 }),
    staleTime: 60 * 1000,
  });

  const totalSourcesCount = sourcesQuery.data?.pagination.total ?? 0;
  const activeSourcesCount = sourcesQuery.data?.data.filter(s => s.isActive !== false).length ?? 0;
  const coveragePercent = totalSourcesCount > 0 ? Math.round((activeSourcesCount / totalSourcesCount) * 100) : 0;
  const isSourcesUnavailable = sourcesQuery.data === null || sourcesQuery.isError;
  
  const isApiHealthy = !isLiveUnavailable && !isSourcesUnavailable;

  const selectedTone = toneStyles[selectedCluster.tone];
  const narrativeShareData = buildNarrativeShareData(clusters, { noData: ti("labels.noData"), others: ti("labels.others") });
  const lifecycle = buildLifecycleFromClusters(clusters);
  const aiSummaryData = buildDynamicAiSummary(clusters, lifecycle.counts, ti, language);
  const narrativeShareGradient = buildDonutGradient(narrativeShareData);
  const totalNarratives = narrativesQuery.data?.pagination.total ?? liveNarrativeRecords.length;
  const averageConfidence = liveNarrativeRecords.length > 0
    ? Math.round(liveNarrativeRecords.reduce((sum, record) => sum + (Number.isFinite(record.confidence) ? record.confidence : 0), 0) / liveNarrativeRecords.length)
    : null;
  const acceleratingCount = lifecycle.counts.accelerating;
  const highPotentialCount = liveNarrativeRecords.filter((record) => record.impact.toLowerCase().includes("high")).length;

  const metrics = [
    {
      label: ti("metrics.clusters.label"),
      value: narrativesQuery.isPending ? "..." : String(totalNarratives),
      helper: liveClusters.length > 0 ? ti("metrics.clusters.accelerating", { count: acceleratingCount }) : ti("labels.noData"),
      icon: Network,
      tone: "purple" as Tone,
    },
    {
      label: ti("metrics.confidence.label"),
      value: narrativesQuery.isPending ? "..." : averageConfidence === null ? "-" : `${averageConfidence}%`,
      helper: liveNarrativeRecords.length > 0 ? ti("metrics.confidence.helper") : ti("labels.noData"),
      icon: Brain,
      tone: "blue" as Tone,
    },
    {
      label: ti("metrics.emerging.label"),
      value: narrativesQuery.isPending ? "..." : String(lifecycle.counts.emerging),
      helper: liveClusters.length > 0 ? ti("metrics.emerging.liveNarratives", { count: liveClusters.length }) : ti("labels.noData"),
      icon: TrendingUp,
      tone: "amber" as Tone,
    },
    {
      label: ti("metrics.opportunities.label"),
      value: narrativesQuery.isPending ? "..." : String(highPotentialCount),
      helper: liveNarrativeRecords.length > 0 ? ti("metrics.opportunities.highImpact", { count: highPotentialCount }) : ti("labels.noData"),
      icon: Target,
      tone: "green" as Tone,
    },
  ];

  const lifecycleCards = [
    { key: "emerging" as const, count: lifecycle.counts.emerging, tone: "green" as Tone, values: lifecycle.series.emerging },
    { key: "accelerating" as const, count: lifecycle.counts.accelerating, tone: "amber" as Tone, values: lifecycle.series.accelerating },
    { key: "peaking" as const, count: lifecycle.counts.peaking, tone: "red" as Tone, values: lifecycle.series.peaking },
    { key: "declining" as const, count: lifecycle.counts.declining, tone: "blue" as Tone, values: lifecycle.series.declining },
    { key: "dormant" as const, count: lifecycle.counts.dormant, tone: "slate" as Tone, values: lifecycle.series.dormant },
  ];

  const footerItems = [
    {
      icon: Database,
      title: ti("footer.dataCoverage"),
      value: sourcesQuery.isPending ? "..." : `${activeSourcesCount} / ${totalSourcesCount} ${ti("labels.sourcesActive") || "Sources Active"}`,
      detail: sourcesQuery.isPending ? "..." : `${coveragePercent}% ${ti("labels.coverage") || "Coverage"}`,
      tone: "purple" as Tone,
      progress: true,
      progressValue: coveragePercent,
    },
    {
      icon: RefreshCcw,
      title: ti("footer.updateFreq"),
      value: ti("footer.realtime"),
      detail: ti("footer.autoUpdated"),
      tone: "blue" as Tone,
    },
    {
      icon: Bot,
      title: ti("footer.aiStatus"),
      value: isApiHealthy ? ti("footer.operational") : ti("footer.degraded"),
      detail: isApiHealthy ? ti("footer.systemsNormal") : ti("footer.apiIssues"),
      tone: (isApiHealthy ? "green" : "red") as Tone,
    },
    {
      icon: Layers3,
      title: ti("footer.analysisDepth"),
      value: ti("footer.deep"),
      detail: ti("footer.multilingual"),
      tone: "purple" as Tone,
    },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-[-0.045em] text-[#060A23]">{ti("pageTitle")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#737D9F]">{ti("pageSubtitle")}</p>
        </div>
        <div className="relative w-full sm:w-fit" ref={periodMenuRef}>
          <button type="button" onClick={() => setIsPeriodMenuOpen((open) => !open)} aria-expanded={isPeriodMenuOpen} className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#E5E9F3] bg-white px-4 text-xs font-extrabold text-[#475070] shadow-sm transition hover:bg-[#F8FAFF] sm:w-fit">
            <Calendar size={15} className="text-[#8A94B8]" />
            {ti(`periods.${selectedPeriod.key}`)}
            <ChevronDown size={14} className={cn("text-[#8A94B8] transition", isPeriodMenuOpen && "rotate-180")} />
          </button>
          {isPeriodMenuOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[190px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)] sm:w-[210px]">
              {periodOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setSelectedPeriod(option);
                    setSelectedClusterId(null);
                    setIsPeriodMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left text-[12px] font-black transition",
                    selectedPeriod.key === option.key ? "bg-[#465FFF]/10 text-[#465FFF]" : "text-[#475070] hover:bg-[#F8FAFF]"
                  )}
                >
                  {ti(`periods.${option.key}`)}
                  {selectedPeriod.key === option.key ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {narrativesQuery.isPending ? <PanelSkeleton /> : null}
      {isLiveUnavailable ? <DashboardErrorState title={ti("error.title")} description={ti("error.desc")} onRetry={() => void narrativesQuery.refetch()} minHeight="min-h-[150px]" /> : null}
      {!isLiveUnavailable && narrativesQuery.data && liveClusters.length === 0 ? <DashboardEmptyState title={ti("empty.title")} description={ti("empty.desc")} icon="search" minHeight="min-h-[180px]" /> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_408px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel className="overflow-hidden">
            <CardContent className="p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-[17px] font-black tracking-[-0.02em] text-[#101334]">
                    {ti("topicMap.title")}
                    <Info size={14} className="text-[#98A2B3]" />
                  </h2>
                  <p className="mt-1 text-[12px] font-semibold text-[#737D9F]">{ti("topicMap.desc")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Impact filter (All Topics) */}
                  <div className="relative" ref={impactMenuRef}>
                    <button type="button" onClick={() => { setIsImpactMenuOpen((o) => !o); setIsSentimentMenuOpen(false); }} aria-expanded={isImpactMenuOpen} className={cn("flex h-9 items-center gap-2 rounded-[9px] border bg-white px-3 text-[11px] font-extrabold shadow-sm transition hover:bg-[#F8FAFF]", impactFilter !== "all" ? "border-[#465FFF]/30 text-[#465FFF]" : "border-[#E5E9F3] text-[#4F5877]")}>
                      {impactFilter === "all" ? ti("topicMap.allTopics") : ti(`topicMap.impact.${impactFilter}`)}
                      <ChevronDown size={13} className={cn("text-[#8A94B8] transition", isImpactMenuOpen && "rotate-180")} />
                    </button>
                    {isImpactMenuOpen ? (
                      <div className="absolute left-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]">
                        {impactOptions.map((opt) => (
                          <button key={opt} type="button" onClick={() => { setImpactFilter(opt); setSelectedClusterId(null); setIsImpactMenuOpen(false); }} className={cn("flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left text-[12px] font-black transition", impactFilter === opt ? "bg-[#465FFF]/10 text-[#465FFF]" : "text-[#475070] hover:bg-[#F8FAFF]")}>
                            {opt === "all" ? ti("topicMap.allTopics") : ti(`topicMap.impact.${opt}`)}
                            {impactFilter === opt ? <Check size={14} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {/* Sentiment filter */}
                  <div className="relative" ref={sentimentMenuRef}>
                    <button type="button" onClick={() => { setIsSentimentMenuOpen((o) => !o); setIsImpactMenuOpen(false); }} aria-expanded={isSentimentMenuOpen} className={cn("flex h-9 items-center gap-2 rounded-[9px] border bg-white px-3 text-[11px] font-extrabold shadow-sm transition hover:bg-[#F8FAFF]", sentimentFilter !== "all" ? "border-[#465FFF]/30 text-[#465FFF]" : "border-[#E5E9F3] text-[#4F5877]")}>
                      <Filter size={13} className="text-[#8A94B8]" />
                      {sentimentFilter === "all" ? ti("topicMap.filter") : ti(`topicMap.sentiment.${sentimentFilter}`)}
                      <ChevronDown size={13} className={cn("text-[#8A94B8] transition", isSentimentMenuOpen && "rotate-180")} />
                    </button>
                    {isSentimentMenuOpen ? (
                      <div className="absolute left-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]">
                        {sentimentOptions.map((opt) => (
                          <button key={opt} type="button" onClick={() => { setSentimentFilter(opt); setSelectedClusterId(null); setIsSentimentMenuOpen(false); }} className={cn("flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left text-[12px] font-black transition", sentimentFilter === opt ? "bg-[#465FFF]/10 text-[#465FFF]" : "text-[#475070] hover:bg-[#F8FAFF]")}>
                            {opt === "all" ? ti("topicMap.filterAll") : ti(`topicMap.sentiment.${opt}`)}
                            {sentimentFilter === opt ? <Check size={14} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {/* Expand map toggle */}
                  <button type="button" onClick={() => setIsMapExpanded((v) => !v)} aria-label={ti("topicMap.expandMap")} className="flex size-9 items-center justify-center rounded-[9px] border border-[#E5E9F3] bg-white text-[#4F5877] shadow-sm transition hover:bg-[#F8FAFF]">
                    {isMapExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                </div>
              </div>

              <div className={cn("relative overflow-hidden rounded-[12px] bg-[#FEFEFF] transition-all duration-300", isMapExpanded ? "min-h-[600px] sm:min-h-[700px] xl:min-h-[850px]" : "min-h-[350px] sm:min-h-[382px] xl:min-h-[559px]")}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(139,92,255,0.08),transparent_28%),radial-gradient(circle_at_24%_40%,rgba(16,185,129,0.05),transparent_18%),radial-gradient(circle_at_72%_28%,rgba(245,158,11,0.06),transparent_18%)]" />
                
                <div className="absolute inset-0 transition-transform duration-300 origin-center" style={{ transform: `scale(${mapZoom})` }}>
                  <div className="absolute left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#E8ECF5]" />
                  <div className="absolute left-1/2 top-1/2 size-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#EDF0F7]" />

                  {mapSpecks.map((speck, index) => {
                    const toneStyle = toneStyles[speck.tone];
                    return (
                      <span
                        key={`${speck.x}-${speck.y}-${index}`}
                        className="absolute rounded-full border"
                        style={{
                          left: `${speck.x}%`,
                          top: `${speck.y}%`,
                          width: speck.size,
                          height: speck.size,
                          opacity: speck.opacity,
                          borderColor: toneStyle.color,
                          backgroundColor: `rgba(${toneStyle.rgb}, .08)`,
                        }}
                      />
                    );
                  })}

                  <svg className="chart-enter chart-line-draw absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {narrativeConnections.map((connection, index) => {
                      const from = clusters.find((cluster) => cluster.id === connection.from);
                      const to = clusters.find((cluster) => cluster.id === connection.to);
                      if (!from || !to) return null;

                      const highlighted = selectedCluster.id === connection.from || selectedCluster.id === connection.to;
                      return (
                        <line
                          key={`${connection.from}-${connection.to}-${index}`}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke={highlighted ? selectedTone.color : "#E6EAF4"}
                          strokeDasharray={connection.strength === "weak" ? "1.1 1.2" : undefined}
                          strokeLinecap="round"
                          strokeWidth={highlighted ? 0.34 : 0.2}
                          opacity={highlighted ? 0.68 : 0.76}
                        />
                      );
                    })}
                  </svg>

                  {clusters.map((cluster) => (
                    <MapNode key={cluster.id} cluster={cluster} selected={selectedCluster.id === cluster.id} language={language} signalLabel={ti("labels.signals", { count: formatSignals(cluster.signals) })} onSelect={(item) => setSelectedClusterId(item.id)} />
                  ))}
                </div>

                <div className="absolute bottom-5 left-5 z-30 flex flex-col gap-1 rounded-[9px] border border-[#E7EBF4] bg-white p-1 shadow-[0_10px_24px_rgba(16,24,40,0.08)]">
                  <button type="button" onClick={() => setMapZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))} className="flex size-7 items-center justify-center rounded-[6px] text-[#53608C] transition hover:bg-[#F5F7FC]" aria-label={ti("topicMap.zoomIn")}>
                    <ZoomIn size={14} />
                  </button>
                  <button type="button" onClick={() => setMapZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="flex size-7 items-center justify-center rounded-[6px] text-[#53608C] transition hover:bg-[#F5F7FC]" aria-label={ti("topicMap.zoomOut")}>
                    <ZoomOut size={14} />
                  </button>
                  <button type="button" onClick={() => setMapZoom(1)} className="flex size-7 items-center justify-center rounded-[6px] text-[#53608C] transition hover:bg-[#F5F7FC]" aria-label={ti("topicMap.resetZoom")}>
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-9 gap-y-2 border-t border-[#EEF1F7] pt-3 text-[10px] font-extrabold text-[#53608C]">
                <div className="flex items-center gap-2">
                  <span className="text-[#8A94B8]">{ti("topicMap.intensity")}</span>
                  <span className="size-1.5 rounded-full bg-[#C9D0E2]" />
                  <span className="size-2 rounded-full bg-[#B3BDD4]" />
                  <span className="size-2.5 rounded-full bg-[#98A2B8]" />
                  <span className="size-3.5 rounded-full border border-[#9AA4BE] bg-white" />
                  <span className="text-[#8A94B8]">{ti("topicMap.high")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#8A94B8]">{ti("topicMap.sentimentLabel")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#10B981]" />{ti("topicMap.pos")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#CBD5E1]" />{ti("topicMap.neu")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#EF4444]" />{ti("topicMap.neg")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#8A94B8]">{ti("topicMap.connStrength")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-9 border-b border-dashed border-[#B9C2D6]" />{ti("topicMap.weak")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-9 border-b border-[#8A94B8]" />{ti("topicMap.strong")}</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] font-semibold text-[#98A2B3]">{ti("topicMap.tip")}</p>
            </CardContent>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[350px_minmax(0,1fr)]">
            <Panel>
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                    <Sparkles size={16} className="text-[#8B5CFF]" />
                    {ti("aiSummary.title")}
                  </h3>
                  <div className="mt-4 rounded-[11px] border border-[#8B5CFF]/10 bg-[#8B5CFF]/7 p-3 text-[11px] font-bold leading-relaxed text-[#7654E7]">
                    {aiSummaryData.box}
                  </div>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {aiSummaryData.bullets.map((item, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-[12px] font-semibold leading-snug text-[#53608C]">
                        <Check size={14} className="mt-0.5 shrink-0 text-[#53608C]" strokeWidth={2.6} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <button type="button" onClick={() => router.push("/reports")} className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white text-[11px] font-extrabold text-[#53608C] transition hover:bg-[#F8FAFF]">
                  {ti("aiSummary.btn")}
                  <ChevronRight size={13} />
                </button>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5">
                <h3 className="flex items-center gap-2 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                  {ti("lifecycle.title")}
                  <Info size={13} className="text-[#98A2B3]" />
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {lifecycleCards.map((phase) => {
                    const toneStyle = toneStyles[phase.tone];
                    return (
                      <div key={phase.key} className="flex min-h-[182px] flex-col justify-between rounded-[12px] border border-[#EEF1F7] bg-[#FBFCFF] p-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.06em]" style={{ color: toneStyle.color }}>{ti(`lifecycle.phases.${phase.key}.title`)}</p>
                          <p className="mt-2 text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{phase.count}</p>
                          <p className="mt-2 text-[10px] font-bold leading-snug text-[#737D9F]">{ti(`lifecycle.phases.${phase.key}.desc`)}</p>
                        </div>
                        <Sparkline values={phase.values} color={toneStyle.color} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Panel>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <Panel>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-black tracking-[-0.02em] text-[#101334]">{ti("growingClusters.title")}</h3>
                <button type="button" onClick={() => setIsAllClustersModalOpen(true)} className="text-[11px] font-black text-[#465FFF] transition hover:text-[#351EFF]">
                  {ti("growingClusters.viewAll")}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {clusters.slice(0, 5).map((cluster) => {
                  const selected = selectedCluster.id === cluster.id;
                  const toneStyle = toneStyles[cluster.tone];
                  return (
                    <button
                      key={cluster.id}
                      type="button"
                      onClick={() => setSelectedClusterId(cluster.id)}
                      className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-left transition hover:border-[#DCE2F0]"
                      style={{
                        borderColor: selected ? `rgba(${toneStyle.rgb}, .18)` : "#EEF1F7",
                        backgroundColor: selected ? `rgba(${toneStyle.rgb}, .075)` : "#FFFFFF",
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ClusterIcon tone={cluster.tone} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-black text-[#101334]">{text(cluster.topic, language)}</span>
                          <span className="mt-1 block text-[10px] font-bold text-[#8A94B8]">{ti("labels.signals", { count: formatSignals(cluster.signals) })}</span>
                        </span>
                      </span>
                      <TrendBadge value={cluster.growth} tone={cluster.tone} className="shrink-0 px-2 py-0.5 text-[10px]" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Panel>

          <Panel className="border-[#D9D6FF]">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3 relative" ref={actionsMenuRef}>
                <p className="text-[11px] font-black text-[#53608C]">{ti("selectedNarrative.title")}</p>
                <button type="button" onClick={() => setIsSelectedActionsOpen((v) => !v)} disabled={!selectedNarrativeId} aria-label={ti("selectedNarrative.moreActions")} aria-expanded={isSelectedActionsOpen} className="rounded-full p-1 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C] disabled:cursor-not-allowed disabled:opacity-40">
                  <MoreHorizontal size={16} />
                </button>
                {isSelectedActionsOpen && selectedNarrativeId ? (
                  <div className="absolute right-0 top-full z-50 mt-1 w-[160px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]">
                    <button type="button" onClick={() => { setIsSelectedActionsOpen(false); setIsAnalysisOpen(true); }} className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2.5 text-left text-[11px] font-extrabold text-[#475070] transition hover:bg-[#F8FAFF]">
                      <FileText size={13} />
                      {ti("actions.viewDetails")}
                    </button>
                    <button type="button" onClick={() => { 
                      setIsSelectedActionsOpen(false); 
                      navigator.clipboard.writeText(selectedNarrativeId)
                        .then(() => toastHook.success(ti("toast.copySuccess")))
                        .catch(() => toastHook.error(ti("toast.copyFailed"))); 
                    }} className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2.5 text-left text-[11px] font-extrabold text-[#475070] transition hover:bg-[#F8FAFF]">
                      <ClipboardCopy size={13} />
                      {ti("actions.copyId")}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex items-start gap-3">
                <ClusterIcon tone={selectedCluster.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{text(selectedCluster.topic, language)}</h3>
                    <TrendBadge value={text(selectedCluster.priority, language)} tone={selectedCluster.priorityTone} className="shrink-0 px-2.5 py-1 text-[9px]" />
                  </div>
                  <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#53608C]">{text(selectedCluster.description, language)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <TrendBadge value={selectedCluster.growth} tone={selectedCluster.tone} className="px-2.5 py-1 text-[10px]" />
                <TrendBadge value={text(selectedCluster.priority, language)} tone={selectedCluster.priorityTone} className="px-2.5 py-1 text-[10px]" />
                {selectedLifecycleKey ? (
                  <Badge variant={toneStyles[selectedCluster.tone].badge} className="normal-case tracking-normal px-2.5 py-1 text-[10px]">
                    {ti(`lifecycle.phases.${selectedLifecycleKey}.title`)}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-3 border-t border-[#EEF1F7] pt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#53608C]">{ti("selectedNarrative.related")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCluster.related.map((item) => (
                    <span key={`${text(item.topic, language)}-${item.growth}`} className="rounded-full bg-[#F5F7FC] px-2.5 py-1 text-[10px] font-bold text-[#53608C]">
                      {text(item.topic, language)} <span className="ml-1 text-[#EF4444]">{item.growth}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-[12px] bg-[#F6F8FF] p-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={15} className="mt-0.5 shrink-0 text-[#465FFF]" />
                  <div>
                    <p className="text-[10px] font-black text-[#53608C]">{ti("selectedNarrative.aiRec")}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#53608C]">{text(selectedCluster.aiRec, language)}</p>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setIsAnalysisOpen(true)} disabled={!selectedNarrativeId} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
                {ti("selectedNarrative.btnAnalysis")}
                <ChevronRight size={14} />
              </button>
            </CardContent>
          </Panel>

          <Panel>
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                {ti("competitorShare.title")}
                <Info size={13} className="text-[#98A2B3]" />
              </h3>
              <div className="grid items-center justify-items-center gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:justify-items-stretch xl:grid-cols-[156px_minmax(0,1fr)]">
                <CompetitorDonut label={ti("competitorShare.totalShare")} gradient={narrativeShareGradient} totalLabel={ti("labels.total")} />
                <div className="flex w-full min-w-0 flex-col gap-2 text-[12px] font-bold text-[#53608C]">
                  {narrativeShareData.map((item) => {
                    const toneStyle = toneStyles[item.tone];
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: toneStyle.color }} />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-black text-[#101334]">{item.value}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setIsLandscapeOpen(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-extrabold text-[#465FFF] transition hover:text-[#351EFF]">
                {ti("competitorShare.viewLandscape")}
                <ChevronRight size={13} />
              </button>
            </CardContent>
          </Panel>
        </aside>
      </section>

      <footer className="mt-1 flex flex-col gap-5 border-t border-[#E9EDF5] pt-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {footerItems.map((item, index) => {
            const Icon = item.icon;
            const toneStyle = toneStyles[item.tone];
            return (
              <div key={item.title} className={cn("flex gap-3 xl:border-r xl:border-[#E9EDF5] xl:pr-5", index === footerItems.length - 1 && "xl:border-r-0")}> 
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ color: toneStyle.color, backgroundColor: `rgba(${toneStyle.rgb}, .1)` }}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#8A94B8]">{item.title}</p>
                  <p className="mt-1 text-[12px] font-black text-[#101334]">{item.value}</p>
                  {item.progress ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF1F7]">
                        <span className="block h-full rounded-full bg-[#10B981] transition-all duration-500" style={{ width: `${item.progressValue ?? 0}%` }} />
                      </span>
                      <span className="text-[10px] font-bold text-[#8A94B8]">{item.detail}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] font-bold text-[#8A94B8]">{item.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => router.push("/settings")} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#C9C6F8] bg-white px-5 text-[12px] font-black text-[#6B4DE6] shadow-sm transition hover:bg-[#F8F6FF]">
          <Settings size={14} />
          {ti("footer.btnSettings")}
        </button>
      </footer>

      {mounted && isAnalysisOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsAnalysisOpen(false)}>
          <Panel className="flex w-full max-w-3xl flex-col max-h-[90vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{text(selectedCluster.topic, language)}</h2>
                <p className="mt-1 text-xs font-bold text-[#737D9F]">{ti("analysisModal.subtitle")}</p>
              </div>
              <button type="button" onClick={() => setIsAnalysisOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {narrativeDetailQuery.isPending ? (
                <div className="flex h-40 items-center justify-center">
                  <RefreshCcw className="animate-spin text-[#8A94B8]" size={24} />
                </div>
              ) : narrativeDetailQuery.data === null || narrativeDetailQuery.isError ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <Info size={24} className="text-[#8A94B8]" />
                  <p className="mt-2 text-sm font-black text-[#53608C]">{ti("analysisModal.errorTitle")}</p>
                  <p className="mt-1 max-w-sm text-xs font-semibold leading-relaxed text-[#8A94B8]">{ti("analysisModal.errorDesc")}</p>
                  <button type="button" onClick={() => void narrativeDetailQuery.refetch()} className="mt-4 rounded-[8px] border border-[#D9DEEA] bg-white px-4 py-2 text-[11px] font-black text-[#53608C] transition hover:bg-[#F8FAFF]">
                    {ti("retry")}
                  </button>
                </div>
              ) : narrativeDetailQuery.data ? (
                <div className="grid gap-6">
                  <div>
                    <h3 className="text-sm font-black text-[#53608C]">{ti("analysisModal.sentimentBreakdown")}</h3>
                    <div className="mt-3 flex gap-2">
                      {Object.entries(narrativeDetailQuery.data.sentimentBreakdown).map(([key, value]) => {
                        const data = narrativeDetailQuery.data!;
                        const total = Object.values(data.sentimentBreakdown).reduce((sum, v) => sum + v, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return (
                          <div key={key} className="flex-1 rounded-lg border border-[#EEF1F7] bg-[#FBFCFF] p-3 text-center">
                            <p className="text-xs font-bold uppercase text-[#8A94B8]">{key}</p>
                            <p className="mt-1 text-lg font-black text-[#101334]">{percentage}%</p>
                            <p className="mt-0.5 text-[10px] font-semibold text-[#8A94B8]">{value} {ti("labels.signals", { count: "" }).trim()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#53608C]">{ti("analysisModal.relatedSignals")}</h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {narrativeDetailQuery.data.relatedSignals.slice(0, 5).map((sig) => (
                        <div key={sig.id} className="rounded-lg border border-[#EEF1F7] p-3">
                          <p className="text-sm font-bold text-[#101334]">{sig.title}</p>
                          <p className="mt-1 text-xs font-medium text-[#737D9F] line-clamp-2">{sig.content || ti("analysisModal.noContent")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <Info size={24} className="text-[#8A94B8]" />
                  <p className="mt-2 text-sm font-bold text-[#53608C]">{ti("analysisModal.noData")}</p>
                </div>
              )}
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

      {mounted && isLandscapeOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsLandscapeOpen(false)}>
          <Panel className="flex w-full max-w-2xl flex-col shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <h2 className="text-lg font-black text-[#101334]">{ti("competitorShare.title")}</h2>
              <button type="button" onClick={() => setIsLandscapeOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3">
                {narrativeShareData.map((item) => {
                  const toneStyle = toneStyles[item.tone];
                  return (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-[#EEF1F7] p-3">
                      <div className="flex items-center gap-3">
                        <span className="size-3 rounded-full" style={{ backgroundColor: toneStyle.color }} />
                        <span className="text-sm font-bold text-[#101334]">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-[#53608C]">{item.value}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

      {mounted && isAllClustersModalOpen ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsAllClustersModalOpen(false)}>
          <Panel className="flex w-full max-w-2xl flex-col max-h-[85vh] shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{ti("growingClusters.modalTitle")}</h2>
                <p className="mt-1 text-xs font-bold text-[#737D9F]">{ti("growingClusters.modalSubtitle")}</p>
              </div>
              <button type="button" onClick={() => setIsAllClustersModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {clusters.map((cluster) => {
                  const selected = selectedCluster.id === cluster.id;
                  const toneStyle = toneStyles[cluster.tone];
                  return (
                    <button
                      key={`modal-${cluster.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedClusterId(cluster.id);
                        setIsAllClustersModalOpen(false);
                      }}
                      className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-left transition hover:border-[#DCE2F0]"
                      style={{
                        borderColor: selected ? `rgba(${toneStyle.rgb}, .18)` : "#EEF1F7",
                        backgroundColor: selected ? `rgba(${toneStyle.rgb}, .075)` : "#FFFFFF",
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ClusterIcon tone={cluster.tone} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-black text-[#101334]">{text(cluster.topic, language)}</span>
                          <span className="mt-1 block text-[10px] font-bold text-[#8A94B8]">{ti("labels.signals", { count: formatSignals(cluster.signals) })}</span>
                        </span>
                      </span>
                      <TrendBadge value={cluster.growth} tone={cluster.tone} className="shrink-0 px-2 py-0.5 text-[10px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>,
        document.body
      ) : null}

    </div>
  );
}
