"use client";

import Link from "next/link";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bot, Brain, Check, ChevronDown, ChevronRight, Database, Info, Layers3, Maximize2, Minimize2, MoreHorizontal, Network, RefreshCcw, RotateCcw, Target, TrendingUp, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { getNarratives, getSources, triggerClustering, type NarrativeRecord } from "@/lib/api-service";
import { getPipelineStatus, timeAgo } from "@/lib/intelligence-api";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { StatStrip } from "@/components/ui/stamp";
import { issueHref, parseIssueLink } from "@/lib/evidence-links";
import { useTranslations } from "next-intl";
import { useUiStore } from "@/store/useUiStore";
import { useToast } from "@/components/ui/toast";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { TopicMapCanvas } from "@/components/intelligence/topic-map-canvas";
import { IssueLifecycle } from "@/components/intelligence/issue-lifecycle";
import { readableTone } from "@/lib/readable-tone";
import { DemoBanner } from "@/components/ui/demo-banner";
import { pickL } from "@/lib/use-l";
import { ModalShell } from "@/components/ui/modal-shell";
type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type LocalizedText = { en: string; id: string };

type Cluster = {
  id: string;
  topic: LocalizedText;
  signals: number;
  growth: string;
  tone: Tone;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  memberSignalIds: string[];
  color: string;
  size?: "high" | "large" | "medium" | "small";
  priority: LocalizedText;
  priorityTone: Tone;
  description: LocalizedText;
  related: Array<{ topic: LocalizedText; growth: string }>;
  aiRec: LocalizedText;
};

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

// Impact arrives as a raw level ("HIGH"); show it as a word in both languages.
const IMPACT_LABELS: Record<string, LocalizedText> = {
  critical: { en: "Critical impact", id: "Dampak kritis" },
  high: { en: "High impact", id: "Dampak tinggi" },
  medium: { en: "Medium impact", id: "Dampak sedang" },
  low: { en: "Low impact", id: "Dampak rendah" },
};
function impactLabel(impact: string | null | undefined, fallback: string): LocalizedText {
  const known = impact ? IMPACT_LABELS[impact.toLowerCase()] : undefined;
  return known ?? { en: impact || fallback, id: impact || fallback };
}

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", badge: "default" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", badge: "purple" },
  green: { color: "#10B981", rgb: "16,185,129", badge: "green" },
  red: { color: "#EF4444", rgb: "239,68,68", badge: "red" },
  amber: { color: "#F59E0B", rgb: "245,158,11", badge: "amber" },
  slate: { color: "#64748B", rgb: "100,116,139", badge: "slate" },
};



const sentimentColor = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#94A3B8",
};

type DonutDatum = { name: string; value: number; tone: Tone };
type LifecycleKey = "emerging" | "accelerating" | "peaking" | "declining" | "dormant";
type LifecycleSeries = Record<LifecycleKey, number[]>;


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
    memberSignalIds: [],
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
  return records.map((record, _index) => {
    const tone = sentimentToTone(record.sentiment);
    const priorityTone = impactToPriorityTone(record.impact);
    const sentimentHex = sentimentColor[tone === "green" ? "positive" : tone === "red" ? "negative" : "neutral"];

    return {
      id: record.id,
      topic: { en: record.title, id: record.title },
      signals: record.signalCount,
      growth: record.velocity,
      tone,
      sentiment: tone === "green" ? "positive" : tone === "red" ? "negative" : "neutral",
      priority: impactLabel(record.impact, labels.mediumPriority),
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
      memberSignalIds: record.memberSignalIds ?? [],
      color: sentimentHex,
      size: (record.signalCount > 1000 ? "high" : record.signalCount > 500 ? "large" : record.signalCount > 100 ? "medium" : "small") as Cluster["size"],
    };
  }) as Cluster[];
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
  // "new" = first observations in the last 24h with none in the previous 24h.
  if (cluster.growth === "new") return "emerging";
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
      // No per-stage history is stored, so no trend line is drawn (previously synthesized from the count).
      return [key, [] as number[]];
    })
  ) as LifecycleSeries;

  return { counts, series };
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
    <Card className={cn("text-[#101334]", BOX, "!border-[1.5px] !border-[#101334]", className)} onClick={onClick}>
      {children}
    </Card>
  );
}


function ClusterIcon({ tone: _tone }: { tone: Tone }) {

  return null;
}

function TrendBadge({ value, tone, className }: { value: string; tone: Tone; className?: string }) {
  return (
    <Badge variant={toneStyles[tone].badge} className={cn("normal-case tracking-normal", className)}>
      {value}
    </Badge>
  );
}

const SENTIMENT_LABEL: Record<Cluster["sentiment"], [string, string]> = {
  negative: ["Negative", "Negatif"],
  positive: ["Positive", "Positif"],
  neutral: ["Neutral", "Netral"],
  mixed: ["Mixed", "Campuran"],
};

/**
 * The period in one look: the issue that dominates (with its share and tone), the fastest riser, the biggest
 * risk and how many issues are new, then one clear next step. Numbers first, one line of text at most each.
 */
function NarrativeInsight({ clusters, emergingCount, language, onOpen, onPlan, onReport }: {
  clusters: Cluster[];
  emergingCount: number;
  language: "en" | "id";
  onOpen: (id: string) => void;
  onPlan: (id: string) => void;
  onReport: (id: string) => void;
}) {
  const L = (en: string, id: string) => (language === "id" ? id : en);
  const live = clusters.filter((c) => c.id !== "empty");
  if (live.length === 0) {
    return (
      <Panel>
        <CardContent className="p-5">
          <h3 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{L("What is happening", "Yang sedang terjadi")}</h3>
          <p className="mt-3 text-[13px] font-semibold text-[#5A6478]">{L("No significant issue in this period.", "Belum ada isu yang menonjol pada periode ini.")}</p>
        </CardContent>
      </Panel>
    );
  }
  const total = live.reduce((sum, c) => sum + c.signals, 0) || 1;
  const top = [...live].sort((a, b) => b.signals - a.signals)[0];
  const fastest = [...live].sort((a, b) => (b.growth === "new" ? 1e9 : parseGrowthPercent(b.growth)) - (a.growth === "new" ? 1e9 : parseGrowthPercent(a.growth)))[0];
  const risk = live.filter((c) => c.sentiment === "negative").sort((a, b) => b.signals - a.signals)[0];
  const share = Math.round((top.signals / total) * 100);
  const topTone = toneStyles[top.tone];
  const topIsRisk = top.sentiment === "negative";
  const name = (c: Cluster) => text(c.topic, language);
  const growthLabel = (g: string) => (g === "new" ? L("New", "Baru") : g);

  const tiles: Array<{ key: string; label: string; value: string; topic?: string; tone: Tone; onClick?: () => void }> = [
    { key: "fast", label: L("Fastest rising", "Naik paling cepat"), value: growthLabel(fastest.growth), topic: name(fastest), tone: parseGrowthPercent(fastest.growth) > 0 || fastest.growth === "new" ? "amber" : "slate", onClick: () => onOpen(fastest.id) },
    risk
      ? { key: "risk", label: L("Biggest risk", "Risiko terbesar"), value: formatSignals(risk.signals), topic: name(risk), tone: "red", onClick: () => onOpen(risk.id) }
      : { key: "risk", label: L("Biggest risk", "Risiko terbesar"), value: "0", topic: L("No negative issue", "Tidak ada isu negatif"), tone: "green" },
    { key: "new", label: L("New issues", "Isu baru"), value: String(emergingCount), topic: emergingCount > 0 ? L("to watch", "perlu dipantau") : L("none this period", "tidak ada"), tone: emergingCount > 0 ? "purple" : "slate" },
  ];

  return (
    <Panel className="overflow-hidden !p-0">
      <div className="h-2" style={{ backgroundColor: risk ? "#B42318" : topTone.color }} />
      <CardContent className="p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{L("What Is Happening", "Yang Sedang Terjadi")}</p>
          <p className="font-mono text-[11px] font-bold text-[#5A6478]">{L(`From ${formatSignals(total)} mentions in ${live.length} issues`, `Dari ${formatSignals(total)} percakapan dalam ${live.length} isu`)}</p>
        </div>

        <button
          type="button"
          onClick={() => onOpen(top.id)}
          className="mt-4 grid w-full gap-4 rounded-[14px] p-4 text-left transition hover:brightness-[0.98] sm:grid-cols-[auto_1fr]"
          style={{ background: `linear-gradient(135deg, rgba(${topTone.rgb}, 0.14), rgba(${topTone.rgb}, 0.04))` }}
        >
          <div className="flex size-[86px] flex-col items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(16,19,52,0.08)]">
            <span className="text-[26px] font-black leading-none tracking-[-0.04em]" style={{ color: readableTone(topTone.color) }}>{share}%</span>
            <span className="mt-1 text-[10px] font-black text-[#5A6478]">{L("of talk", "porsi")}</span>
          </div>
          <div className="min-w-0 self-center">
            <p className="text-[11px] font-black" style={{ color: readableTone(topTone.color) }}>{L("Main issue", "Isu utama")}</p>
            <p className="mt-1 text-[24px] font-black leading-tight tracking-[-0.03em] text-[#101334] sm:text-[28px]">{name(top)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black">
              <span className="rounded-full bg-white px-2.5 py-1 text-[#101334]">{formatSignals(top.signals)} {L("mentions", "percakapan")}</span>
              <span className={cn("rounded-full px-2.5 py-1", topIsRisk ? "bg-[#C81E1E] text-white" : top.sentiment === "positive" ? "bg-[#047857] text-white" : "bg-white text-[#31406B]")}>{L(...SENTIMENT_LABEL[top.sentiment])}</span>
              {top.growth && top.growth !== "0%" ? <span className="rounded-full bg-white px-2.5 py-1 text-[#B45309]">{growthLabel(top.growth)}</span> : null}
            </div>
            <p className="mt-2 line-clamp-2 text-[14.5px] font-medium leading-relaxed text-[#31406B]">{text(top.description, language)}</p>
          </div>
        </button>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {tiles.map((tile) => {
            const tone = toneStyles[tile.tone];
            const body = (
              <>
                <p className="text-[10px] font-black" style={{ color: readableTone(tone.color) }}>{tile.label}</p>
                <p className="mt-1.5 text-[24px] font-black leading-none tracking-[-0.03em] text-[#101334]">{tile.value}</p>
                {tile.topic ? <p className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-snug text-[#3A4566]">{tile.topic}</p> : null}
              </>
            );
            const style = { background: `rgba(${tone.rgb}, 0.09)` };
            return tile.onClick ? (
              <button key={tile.key} type="button" onClick={tile.onClick} className="rounded-[12px] p-3.5 text-left transition hover:brightness-[0.97]" style={style}>{body}</button>
            ) : (
              <div key={tile.key} className="rounded-[12px] p-3.5" style={style}>{body}</div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2.5 rounded-[18px] bg-[#101334] p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="min-w-0 flex-1 px-1 text-[15px] font-bold leading-snug text-white">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF]">{L("Next Step", "Langkah Berikutnya")}</span>
            {topIsRisk || risk
              ? L(`Prepare a response for "${name(risk || top)}".`, `Siapkan respons untuk "${name(risk || top)}".`)
              : L(`Amplify "${name(top)}" while it is positive.`, `Perkuat "${name(top)}" selagi positif.`)}
          </p>
          <button type="button" onClick={() => onPlan((risk || top).id)} className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5] sm:w-auto">{L("Create Action Plan", "Buat Rencana Aksi")}</button>
          <button type="button" onClick={() => onReport((risk || top).id)} className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border-[1.5px] border-white/80 px-5 text-[14px] font-black text-white transition hover:bg-white/10 sm:w-auto">{L("See the Analysis", "Lihat Analisis")}</button>
        </div>
      </CardContent>
    </Panel>
  );
}

/** One issue in a ranked list: rank, full title, sentiment, a volume bar against the biggest issue, growth. */
function ClusterRow({ cluster, rank, max, selected, language, onClick }: { cluster: Cluster; rank: number; max: number; selected: boolean; language: "en" | "id"; onClick: () => void }) {
  const L = (en: string, id: string) => (language === "id" ? id : en);
  const sent = cluster.sentiment;
  const bar = sent === "negative" ? "#E5484D" : sent === "positive" ? "#12A66A" : sent === "mixed" ? "#8B5CFF" : "#94A3B8";
  const growthNum = parseGrowthPercent(cluster.growth);
  // One rule for every list: rising = amber up, falling = grey down, new = purple, flat = grey.
  const growth = cluster.growth === "new"
    ? { label: L("New", "Baru"), cls: "bg-[#8B5CFF] text-white" }
    : growthNum > 0 ? { label: `▲ ${cluster.growth}`, cls: "bg-[#FFF3DC] text-[#A04606]" }
      : growthNum < 0 ? { label: `▼ ${cluster.growth.replace("-", "")}`, cls: "bg-[#EEF1F7] text-[#5A6478]" }
        : { label: L("Stable", "Stabil"), cls: "bg-[#EEF1F7] text-[#5A6478]" };
  const sentWord = ({ negative: ["Negative", "Negatif"], positive: ["Positive", "Positif"], mixed: ["Mixed", "Campuran"], neutral: ["Neutral", "Netral"] } as Record<string, [string, string]>)[sent] ?? ["Neutral", "Netral"];
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("w-full rounded-[12px] p-3 text-left transition", selected ? "bg-[#EEF1FF] ring-2 ring-[#465FFF]" : "bg-[#F7F8FC] hover:bg-[#EEF1F7]")}>
      <div className="flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#101334] text-[11px] font-black text-white">{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13px] font-black leading-snug text-[#101334]">{text(cluster.topic, language)}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black", growth.cls)}>{growth.label}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${Math.max(4, (cluster.signals / max) * 100)}%`, background: bar }} /></div>
            <span className="shrink-0 text-[12px] font-black text-[#101334]">{formatSignals(cluster.signals)}</span>
          </div>
          <p className="mt-1 text-[11px] font-bold" style={{ color: bar === "#94A3B8" ? "#5A6478" : bar }}>{L(...sentWord)}</p>
        </div>
      </div>
    </button>
  );
}

function CompetitorDonut({ label, gradient, totalLabel }: { label: string; gradient: string; totalLabel: string }) {
  return (
    <div className="chart-donut-enter relative flex size-[150px] shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: gradient }}>
      <div className="absolute size-[102px] rounded-full bg-white" />
      <div className="relative max-w-[86px] text-center">
        <p className="text-[24px] font-black leading-none tracking-[-0.03em] text-[#101334]">{totalLabel}</p>
        <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#647099]">{label}</p>
      </div>
    </div>
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
  const [isPlanResponseOpen, setIsPlanResponseOpen] = useState(false);
  const [isLandscapeOpen, setIsLandscapeOpen] = useState(false);
  const [isSelectedActionsOpen, setIsSelectedActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const [isSyncingClusters, setIsSyncingClusters] = useState(false);

  const handleSyncClusters = async () => {
    setIsSyncingClusters(true);
    try {
      const res = await triggerClustering();
      if (res && res.clustersCreated !== undefined) {
        toastHook.success(
          language === "id"
            ? `Kluster diperbarui: ${res.clustersCreated} baru dibuat, ${res.signalsAttached || 0} percakapan digabungkan.`
            : `Clusters updated: ${res.clustersCreated} created, ${res.signalsAttached || 0} signals attached.`
        );
      } else {
        toastHook.info(
          language === "id"
            ? "Sinkronisasi selesai: Semua percakapan sudah terkelompokkan."
            : "Sync complete: All signals are clustered."
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["narratives"] });
    } catch {
      toastHook.error(language === "id" ? "Gagal menyinkronkan kluster" : "Failed to sync clusters");
    } finally {
      setIsSyncingClusters(false);
    }
  };

  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

  const periodMenuRef = useRef<HTMLDivElement | null>(null);
  const impactMenuRef = useRef<HTMLDivElement | null>(null);
  const sentimentMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Deep link from Overview or Monitoring: ?narrative=<id>&days=<1|7|30|90>
  // opens that issue's evidence for the same period.
  useEffect(() => {
    const link = parseIssueLink(window.location.search);
    if (link.days) {
      const option = periodOptions.find((o) => o.days === link.days);
      if (option) setSelectedPeriod(option);
    }
    // Old links (?narrative=<id>) open the issue's own page.
    if (link.narrative) router.replace(issueHref(link.narrative, link.days ? link.days * 24 : undefined));
  }, [router]);

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
    queryFn: async () => {
      const res = await getNarratives({
        limit: narrativeApiLimit,
        days: selectedPeriod.days,
        impact: impactFilter === "all" ? undefined : impactFilter,
        sentiment: sentimentFilter === "all" ? undefined : sentimentFilter,
      });
      if (res) return res;
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
    staleTime: 30 * 1000,
  });
  const liveNarrativeRecords = narrativesQuery.data?.data ?? [];
  const liveClusters = liveNarrativeRecords.length > 0 ? buildNarrativeClusters(liveNarrativeRecords, { sources: (count) => ti("labels.sources", { count }), mediumPriority: ti("mediumPriorityFallback") }) : [];
  const isLiveUnavailable = narrativesQuery.data === null || narrativesQuery.isError;
  const clusters = liveClusters;
  const emptyCluster = buildEmptyCluster(ti);
  const selectedCluster = clusters.find((cluster) => cluster.id === selectedClusterId) ?? clusters[0] ?? emptyCluster;
  const selectedNarrativeId = selectedClusterId ?? (selectedCluster.id === "empty" ? null : selectedCluster.id);
  const selectedLifecycleKey = selectedNarrativeId ? classifyLifecycle(selectedCluster) : null;
  // Lifecycle stage per issue, from the same rule as the counts above.
  const stageById = new Map(clusters.filter((c) => c.id !== "empty").map((c) => [c.id, classifyLifecycle(c)]));
  const stageOf = (id: string) => stageById.get(id) ?? null;
  /** An issue's full analysis lives on its own page, opened for the period in view. */
  const openIssue = (id: string) => router.push(issueHref(id, selectedPeriod.days * 24));
  // Data freshness comes from the pipeline status endpoint, not a fixed label.
  const pipelineQuery = useQuery({
    queryKey: ["pipeline-status"],
    queryFn: getPipelineStatus,
    staleTime: 60 * 1000,
    retry: 1,
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

  const maxClusterSignals = Math.max(1, ...clusters.map((c) => c.signals));
  const narrativeShareData = buildNarrativeShareData(clusters, { noData: ti("labels.noData"), others: ti("labels.others") });
  const lifecycle = buildLifecycleFromClusters(clusters);
  const narrativeShareGradient = buildDonutGradient(narrativeShareData);
  const totalNarratives = narrativesQuery.data?.pagination.total ?? liveNarrativeRecords.length;
  // Average only persisted confidence values; narratives without analysed members are excluded.
  const confidenceValues = liveNarrativeRecords.map((record) => record.confidence).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const averageConfidence = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((sum, v) => sum + v, 0) / confidenceValues.length)
    : null;
  const acceleratingCount = lifecycle.counts.accelerating;
  const highPotentialCount = liveNarrativeRecords.filter((record) => record.impact.toLowerCase().includes("high")).length;

  // Four counts a director reads at a glance: how many issues, how many hurt, how many are new, how many help.
  const negativeIssues = liveClusters.filter((c) => c.sentiment === "negative");
  const positiveIssues = liveClusters.filter((c) => c.sentiment === "positive");
  void averageConfidence; void highPotentialCount;
  const pending = narrativesQuery.isPending;
  const metrics = [
    {
      label: pickL("Issues tracked", "Isu terpantau"),
      value: pending ? "..." : String(totalNarratives),
      helper: liveClusters.length > 0 ? pickL(`${acceleratingCount} rising`, `${acceleratingCount} sedang naik`) : ti("labels.noData"),
      icon: Network,
      tone: "purple" as Tone,
    },
    {
      label: pickL("Negative issues", "Isu negatif"),
      value: pending ? "..." : String(negativeIssues.length),
      helper: negativeIssues.length > 0 ? pickL(`${negativeIssues.reduce((n, c) => n + c.signals, 0)} records`, `${negativeIssues.reduce((n, c) => n + c.signals, 0)} percakapan`) : pickL("none", "tidak ada"),
      icon: Brain,
      tone: "red" as Tone,
    },
    {
      label: pickL("New issues", "Isu baru"),
      value: pending ? "..." : String(lifecycle.counts.emerging),
      helper: lifecycle.counts.emerging > 0 ? pickL("just appeared", "baru muncul") : pickL("none this period", "tidak ada periode ini"),
      icon: TrendingUp,
      tone: "amber" as Tone,
    },
    {
      label: pickL("Positive issues", "Isu positif"),
      value: pending ? "..." : String(positiveIssues.length),
      helper: positiveIssues.length > 0 ? pickL("worth amplifying", "layak diperkuat") : pickL("none", "tidak ada"),
      icon: Target,
      tone: "green" as Tone,
    },
  ];

  const footerItems = [
    {
      icon: Database,
      title: ti("footer.dataCoverage"),
      value: sourcesQuery.isPending ? "..." : `${activeSourcesCount} / ${totalSourcesCount} ${ti("labels.sourcesActive")}`,
      detail: sourcesQuery.isPending ? "..." : `${coveragePercent}% ${ti("labels.coverage")}`,
      tone: "purple" as Tone,
      progress: true,
      progressValue: coveragePercent,
    },
    {
      icon: RefreshCcw,
      title: ti("footer.updateFreq"),
      value: ti("footer.dailySchedule"),
      detail: pipelineQuery.isPending
        ? "..."
        : pipelineQuery.isError
          ? ti("footer.freshnessUnavailable")
          : ti("footer.lastIngestion", { time: timeAgo(pipelineQuery.data?.ingestion?.lastRawDocumentAt) }),
      tone: "blue" as Tone,
    },
    {
      icon: Bot,
      title: ti("footer.dataConnection"),
      value: isApiHealthy ? ti("footer.connected") : ti("footer.degraded"),
      detail: isApiHealthy ? ti("footer.connectedDetail") : ti("footer.apiIssues"),
      tone: (isApiHealthy ? "green" : "red") as Tone,
    },
    {
      icon: Layers3,
      title: ti("footer.lastAnalysis"),
      value: pipelineQuery.isPending ? "..." : timeAgo(pipelineQuery.data?.analysis?.lastAnalysisAt),
      detail: ti("footer.lastAnalysisDetail"),
      tone: "purple" as Tone,
    },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8 text-[#101334]">
      {/* Demo Mode Banner */}
      {isDemoSession && (
        <DemoBanner />
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{ti("pageTitle")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncClusters}
            disabled={isSyncingClusters}
            className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#E5E9F3] bg-white px-3.5 text-xs font-extrabold text-[#475070] shadow-sm transition hover:bg-[#F8FAFF] disabled:opacity-60"
            title="Trigger dynamic narrative clustering"
          >
            <span>{isSyncingClusters ? (language === "id" ? "Memproses..." : "Clustering...") : (language === "id" ? "Sinkronkan Kluster" : "Sync Clusters")}</span>
          </button>

          <div className="relative w-full sm:w-fit" ref={periodMenuRef}>
            <button type="button" onClick={() => setIsPeriodMenuOpen((open) => !open)} aria-expanded={isPeriodMenuOpen} className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#E5E9F3] bg-white px-4 text-xs font-extrabold text-[#475070] shadow-sm transition hover:bg-[#F8FAFF]">
              {ti(`periods.${selectedPeriod.key}`)}
              <ChevronDown size={14} className={cn("text-[#647099] transition", isPeriodMenuOpen && "rotate-180")} />
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
                    selectedPeriod.key === option.key ? "bg-[#465FFF]/10 text-[#3B52F5]" : "text-[#475070] hover:bg-[#F8FAFF]"
                  )}
                >
                  {ti(`periods.${option.key}`)}
                  {selectedPeriod.key === option.key ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      </header>

      <StatStrip stats={metrics.map((m) => ({ key: m.label, value: m.value, label: m.label, helper: m.helper, tone: m.value !== "0" && m.value !== "..." ? (m.tone === "red" ? "text-[#B42318]" : m.tone === "amber" ? "text-[#B45309]" : m.tone === "green" ? "text-[#047857]" : "text-[#6E44E8]") : "text-[#101334]" }))} />

      {narrativesQuery.isPending ? <PanelSkeleton /> : null}
      {isLiveUnavailable ? <DashboardErrorState title={ti("error.title")} description={ti("error.desc")} onRetry={() => void narrativesQuery.refetch()} minHeight="min-h-[150px]" /> : null}
      {!isLiveUnavailable && narrativesQuery.data && liveClusters.length === 0 ? <DashboardEmptyState title={ti("empty.title")} description={ti("empty.desc")} icon="search" minHeight="min-h-[180px]" action={<Link href="/workspace/settings#keywords" className="inline-flex h-10 items-center rounded-full bg-[#101334] px-5 text-[13px] font-black text-white hover:bg-[#2B2F9E]">{pickL("Manage Keywords", "Atur Kata Kunci")}</Link>} /> : null}

      {/* With no narratives yet, the map, clusters and lifecycle would all be empty: the message above stands alone. */}
      {/* The decision first: the main issue, what is rising, the biggest risk, and the plan to start. */}
      {liveClusters.length > 0 ? (
        <NarrativeInsight
              clusters={clusters}
              emergingCount={lifecycle.counts.emerging}
              language={language}
              onOpen={(id) => setSelectedClusterId(id)}
              onPlan={(id) => { setSelectedClusterId(id); setIsPlanResponseOpen(true); }}
              onReport={(id) => openIssue(id)}
            />
      ) : null}

      {liveClusters.length > 0 ? (
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_408px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel className="overflow-hidden">
            <CardContent className="p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-[16px] font-black tracking-[-0.02em] text-[#101334]">
                    {ti("topicMap.title")}
                    <Info size={14} className="text-[#647099]" />
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Impact filter (All Topics) */}
                  <div className="relative" ref={impactMenuRef}>
                    <button type="button" onClick={() => { setIsImpactMenuOpen((o) => !o); setIsSentimentMenuOpen(false); }} aria-expanded={isImpactMenuOpen} className={cn("flex h-9 items-center gap-2 rounded-[9px] border bg-white px-3 text-[11px] font-extrabold shadow-sm transition hover:bg-[#F8FAFF]", impactFilter !== "all" ? "border-[#E6EAF2] text-[#3B52F5]" : "border-[#E5E9F3] text-[#4F5877]")}>
                      {impactFilter === "all" ? ti("topicMap.allTopics") : ti(`topicMap.impact.${impactFilter}`)}
                      <ChevronDown size={13} className={cn("text-[#647099] transition", isImpactMenuOpen && "rotate-180")} />
                    </button>
                    {isImpactMenuOpen ? (
                      <div className="absolute left-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]">
                        {impactOptions.map((opt) => (
                          <button key={opt} type="button" onClick={() => { setImpactFilter(opt); setSelectedClusterId(null); setIsImpactMenuOpen(false); }} className={cn("flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left text-[12px] font-black transition", impactFilter === opt ? "bg-[#465FFF]/10 text-[#3B52F5]" : "text-[#475070] hover:bg-[#F8FAFF]")}>
                            {opt === "all" ? ti("topicMap.allTopics") : ti(`topicMap.impact.${opt}`)}
                            {impactFilter === opt ? <Check size={14} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {/* Sentiment filter */}
                  <div className="relative" ref={sentimentMenuRef}>
                    <button type="button" onClick={() => { setIsSentimentMenuOpen((o) => !o); setIsImpactMenuOpen(false); }} aria-expanded={isSentimentMenuOpen} className={cn("flex h-9 items-center gap-2 rounded-[9px] border bg-white px-3 text-[11px] font-extrabold shadow-sm transition hover:bg-[#F8FAFF]", sentimentFilter !== "all" ? "border-[#E6EAF2] text-[#3B52F5]" : "border-[#E5E9F3] text-[#4F5877]")}>
                      {sentimentFilter === "all" ? ti("topicMap.filter") : ti(`topicMap.sentiment.${sentimentFilter}`)}
                      <ChevronDown size={13} className={cn("text-[#647099] transition", isSentimentMenuOpen && "rotate-180")} />
                    </button>
                    {isSentimentMenuOpen ? (
                      <div className="absolute left-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]">
                        {sentimentOptions.map((opt) => (
                          <button key={opt} type="button" onClick={() => { setSentimentFilter(opt); setSelectedClusterId(null); setIsSentimentMenuOpen(false); }} className={cn("flex w-full items-center justify-between rounded-[9px] px-3 py-2.5 text-left text-[12px] font-black transition", sentimentFilter === opt ? "bg-[#465FFF]/10 text-[#3B52F5]" : "text-[#475070] hover:bg-[#F8FAFF]")}>
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
                <TopicMapCanvas
                  nodes={clusters.map((cluster) => ({
                    id: cluster.id,
                    title: text(cluster.topic, language),
                    signals: cluster.signals,
                    growth: cluster.growth,
                    color: toneStyles[cluster.tone].color,
                    rgb: toneStyles[cluster.tone].rgb,
                    memberSignalIds: cluster.memberSignalIds,
                  }))}
                  selectedId={selectedCluster.id === "empty" ? null : selectedCluster.id}
                  onSelect={(id) => openIssue(id)}
                  zoom={mapZoom}
                  signalLabel={(count) => ti("labels.signals", { count: formatSignals(count) })}
                />

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
                  <span className="text-[#647099]">{ti("topicMap.intensity")}</span>
                  <span className="size-1.5 rounded-full bg-[#C9D0E2]" />
                  <span className="size-2 rounded-full bg-[#B3BDD4]" />
                  <span className="size-2.5 rounded-full bg-[#98A2B8]" />
                  <span className="size-3.5 rounded-full border border-[#9AA4BE] bg-white" />
                  <span className="text-[#647099]">{ti("topicMap.high")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#647099]">{ti("topicMap.sentimentLabel")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#10B981]" />{ti("topicMap.pos")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#8B5CFF]" />{ti("topicMap.neu")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F59E0B]" />{pickL("Mixed", "Campuran")}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#EF4444]" />{ti("topicMap.neg")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#647099]">{ti("topicMap.connStrength")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-9 border-b border-dashed border-[#E6EAF2]" />{ti("topicMap.weak")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-9 border-b border-[#8A94B8]" />{ti("topicMap.strong")}</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] font-semibold text-[#647099]">{ti("topicMap.tip")}</p>
            </CardContent>
          </Panel>

          {/* Stacked: beside the summary the five lifecycle cards were crushed to ~28px. */}
          <div className="grid grid-cols-1 gap-4">


            {/* Where each issue is in its life: the stage rail, the chosen stage explained, and its issues in detail. */}
            <Panel>
              <CardContent className="p-5 sm:p-6">
                <IssueLifecycle records={liveNarrativeRecords} stageOf={stageOf} days={selectedPeriod.days} />
              </CardContent>
            </Panel>
          </div>
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-4">
          <Panel className="!border-[#465FFF] shadow-[0_4px_0_#465FFF]">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3 relative" ref={actionsMenuRef}>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#3B52F5]">{ti("selectedNarrative.title")}</p>
                <button type="button" onClick={() => setIsSelectedActionsOpen((v) => !v)} disabled={!selectedNarrativeId} aria-label={ti("selectedNarrative.moreActions")} aria-expanded={isSelectedActionsOpen} className="rounded-full p-1 text-[#647099] transition hover:bg-[#F5F7FC] hover:text-[#53608C] disabled:cursor-not-allowed disabled:opacity-40">
                  <MoreHorizontal size={16} />
                </button>
                {isSelectedActionsOpen && selectedNarrativeId ? (
                  <div className="absolute right-0 top-full z-50 mt-1 w-[160px] overflow-hidden rounded-[12px] border border-[#E5E9F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.12)]">
                    <button type="button" onClick={() => { setIsSelectedActionsOpen(false); if (selectedNarrativeId) openIssue(selectedNarrativeId); }} className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2.5 text-left text-[11px] font-extrabold text-[#475070] transition hover:bg-[#F8FAFF]">
                      {ti("actions.viewDetails")}
                    </button>
                    <button type="button" onClick={() => { 
                      setIsSelectedActionsOpen(false); 
                      navigator.clipboard.writeText(selectedNarrativeId)
                        .then(() => toastHook.success(ti("toast.copySuccess")))
                        .catch(() => toastHook.error(ti("toast.copyFailed"))); 
                    }} className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2.5 text-left text-[11px] font-extrabold text-[#475070] transition hover:bg-[#F8FAFF]">
                      {ti("actions.copyId")}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex items-start gap-3">
                <ClusterIcon tone={selectedCluster.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[19px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{text(selectedCluster.topic, language)}</h3>
                    <TrendBadge value={text(selectedCluster.priority, language)} tone={selectedCluster.priorityTone} className="shrink-0 px-2.5 py-1 text-[9px]" />
                  </div>
                  <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-[#31406B]">{text(selectedCluster.description, language)}</p>
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
              {/* Size and spread in one line; the recommendation shows only when it says something new. */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[10px] bg-[#F5F7FC] px-3 py-2">
                  <p className="text-[10px] font-black text-[#647099]">{pickL("Records", "Percakapan")}</p>
                  <p className="text-[18px] font-black text-[#101334]">{selectedCluster.signals}</p>
                </div>
                <div className="rounded-[10px] bg-[#F5F7FC] px-3 py-2">
                  <p className="text-[10px] font-black text-[#647099]">{pickL("Spread", "Sebaran")}</p>
                  <p className="text-[18px] font-black text-[#101334]">{text(selectedCluster.related[0]?.topic ?? { en: "-", id: "-" }, language)}</p>
                </div>
              </div>
              {text(selectedCluster.aiRec, language) && text(selectedCluster.aiRec, language) !== text(selectedCluster.description, language) ? (
                <div className="mt-3 rounded-[12px] bg-[#101334] p-3">
                  <p className="text-[10px] font-black text-[#A9B4FF]">{pickL("Next step", "Langkah berikutnya")}</p>
                  <p className="mt-1 line-clamp-3 text-[12px] font-bold leading-snug text-white">{text(selectedCluster.aiRec, language)}</p>
                </div>
              ) : null}
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={() => setIsPlanResponseOpen(true)} disabled={!selectedNarrativeId} className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#465FFF] text-[14px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50">
                  {pickL("Create Action Plan", "Buat Rencana Aksi")}
                </button>
                <button type="button" onClick={() => { if (selectedNarrativeId) openIssue(selectedNarrativeId); }} disabled={!selectedNarrativeId} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-[#101334] bg-white text-[14px] font-black text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC] disabled:cursor-not-allowed disabled:opacity-50">
                  {ti("selectedNarrative.btnAnalysis")} <ChevronRight size={14} />
                </button>
              </div>
            </CardContent>
          </Panel>
          <Panel>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{ti("growingClusters.title")}</h3>
                <button type="button" onClick={() => setIsAllClustersModalOpen(true)} className="text-[11px] font-black text-[#3B52F5] transition hover:text-[#3B52F5]">
                  {ti("growingClusters.viewAll")}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {clusters.slice(0, 5).map((cluster, index) => {
                  const selected = selectedCluster.id === cluster.id;
                  return (
                    <ClusterRow key={cluster.id} cluster={cluster} rank={index + 1} max={maxClusterSignals} selected={selected} language={language} onClick={() => setSelectedClusterId(cluster.id)} />
                  );
                })}
              </div>
            </CardContent>
          </Panel>


          <Panel>
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[16px] font-black tracking-[-0.02em] text-[#101334]">
                {ti("competitorShare.title")}
                <Info size={13} className="text-[#647099]" />
              </h3>
              <div className="grid items-center justify-items-center gap-4 sm:grid-cols-1 sm:justify-items-stretch xl:grid-cols-1">
                <CompetitorDonut label={ti("competitorShare.totalShare")} gradient={narrativeShareGradient} totalLabel={formatSignals(clusters.reduce((sum, c) => sum + (c.id === "empty" ? 0 : c.signals), 0))} />
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
              <button type="button" onClick={() => setIsLandscapeOpen(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-extrabold text-[#3B52F5] transition hover:text-[#3B52F5]">
                {ti("competitorShare.viewLandscape")}
                <ChevronRight size={13} />
              </button>
            </CardContent>
          </Panel>
        </aside>
      </section>
      ) : null}

      <footer className="mt-1 flex flex-col gap-5 border-t border-[#E9EDF5] pt-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {footerItems.map((item, index) => {
            return (
              <div key={item.title} className={cn("flex gap-3 xl:border-r xl:border-[#E9EDF5] xl:pr-5", index === footerItems.length - 1 && "xl:border-r-0")}> 
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-[#647099]">{item.title}</p>
                  <p className="mt-1 text-[12px] font-black text-[#101334]">{item.value}</p>
                  {item.progress ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF1F7]">
                        <span className="block h-full rounded-full bg-[#10B981] transition-all duration-500" style={{ width: `${item.progressValue ?? 0}%` }} />
                      </span>
                      <span className="text-[10px] font-bold text-[#647099]">{item.detail}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] font-bold text-[#647099]">{item.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => router.push("/workspace/settings")} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#E6EAF2] bg-white px-5 text-[12px] font-black text-[#6B4DE6] shadow-sm transition hover:bg-[#F8F6FF]">
          {ti("footer.btnSettings")}
        </button>
      </footer>

      {selectedNarrativeId ? (
        <CreateActionPlanModal
          open={isPlanResponseOpen}
          onOpenChange={setIsPlanResponseOpen}
          initialClusterId={selectedNarrativeId}
          initialStrategyType="pr_response"
        />
      ) : null}

      <ModalShell open={mounted && isLandscapeOpen} onClose={() => setIsLandscapeOpen(false)} size="md" title={ti("competitorShare.title")}>
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
</ModalShell>

      <ModalShell open={mounted && isAllClustersModalOpen} onClose={() => setIsAllClustersModalOpen(false)} size="md" title={ti("growingClusters.modalTitle")} description={ti("growingClusters.modalSubtitle")}>
<div className="flex flex-col gap-2">
                {[...clusters].filter((c) => c.id !== "empty").sort((x, y) => y.signals - x.signals).map((cluster, index) => (
                  <ClusterRow
                    key={`modal-${cluster.id}`}
                    cluster={cluster}
                    rank={index + 1}
                    max={maxClusterSignals}
                    selected={selectedCluster.id === cluster.id}
                    language={language}
                    onClick={() => { setSelectedClusterId(cluster.id); setIsAllClustersModalOpen(false); }}
                  />
                ))}
              </div>
</ModalShell>

    </div>
  );
}
