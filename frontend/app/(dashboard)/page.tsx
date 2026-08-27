"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowUpRight, BarChart3, Bell, CheckCircle2, ChevronRight, Database, FileText, Headphones, RefreshCcw, Send, Settings, Sparkles, TrendingUp, X, Zap, Rocket, Lightbulb, AlertTriangle, Activity, Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AppCard, IconBubble, MetricTile, SectionHeader, toneMap } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { quickActions, text, type Tone } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";
import { getMockNarratives, isDemoMode } from "@/lib/demo-mock-data";

import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getDateRangeOptions, getWorkspaceSettings, type DateRangeKey } from "@/lib/api-service";
import { DashboardErrorState, MetricRowSkeleton } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/badge";

type SeriesPoint = {
  label: string;
  value: number;
};

type SentimentDatum = {
  name: string;
  value: number;
  tone: Tone;
};

const ActivityAreaChart = dynamic<{ data: SeriesPoint[] }>(
  () => import("@/components/dashboard/charts").then((mod) => mod.ActivityAreaChart),
  { ssr: false, loading: () => <ChartPlaceholder className="h-[214px]" /> }
);

const DonutChart = dynamic<{ data: SentimentDatum[]; center: string; label: string }>(
  () => import("@/components/dashboard/charts").then((mod) => mod.DonutChart),
  { ssr: false, loading: () => <ChartPlaceholder className="mx-auto h-[188px] w-[188px] rounded-full" /> }
);

const MiniSparkline = dynamic<{ tone?: Tone }>(
  () => import("@/components/dashboard/charts").then((mod) => mod.MiniSparkline),
  { ssr: false, loading: () => <Skeleton className="h-7 w-full" /> }
);

const WorldActivityMap = dynamic(
  () => import("@/components/dashboard/world-activity-map").then((mod) => mod.WorldActivityMap),
  { ssr: false, loading: () => <ChartPlaceholder className="h-[300px] rounded-[10px]" /> }
);

function ChartPlaceholder({ className }: { className: string }) {
  return (
    <div className={`flex w-full items-center justify-center border border-slate-100 bg-slate-50/70 ${className}`} aria-label="Loading chart">
      <Skeleton className="h-3/4 w-4/5" />
    </div>
  );
}

type QuickActionKey = "newAlert" | "report" | "analyze" | "sources" | "settings" | "help";

function getQuickActionContent(t: (key: string) => string): Record<QuickActionKey, { title: string; description: string; icon: typeof Bell; href?: string; items?: Array<{ label: string; desc: string }> }> {
  return {
    newAlert: {
      title: t("pages.quickActionContent.newAlertTitle"),
      description: t("pages.quickActionContent.newAlertDesc"),
      icon: Bell,
      items: [
        { label: t("pages.quickActionContent.newAlertItem1Label"), desc: t("pages.quickActionContent.newAlertItem1Desc") },
        { label: t("pages.quickActionContent.newAlertItem2Label"), desc: t("pages.quickActionContent.newAlertItem2Desc") },
        { label: t("pages.quickActionContent.newAlertItem3Label"), desc: t("pages.quickActionContent.newAlertItem3Desc") },
      ],
    },
    report: {
      title: t("pages.quickActionContent.reportTitle"),
      description: t("pages.quickActionContent.reportDesc"),
      icon: FileText,
      items: [
        { label: t("pages.quickActionContent.reportItem1Label"), desc: t("pages.quickActionContent.reportItem1Desc") },
        { label: t("pages.quickActionContent.reportItem2Label"), desc: t("pages.quickActionContent.reportItem2Desc") },
        { label: t("pages.quickActionContent.reportItem3Label"), desc: t("pages.quickActionContent.reportItem3Desc") },
      ],
    },
    analyze: {
      title: t("pages.quickActionContent.analyzeTitle"),
      description: t("pages.quickActionContent.analyzeDesc"),
      icon: BarChart3,
      items: [
        { label: t("pages.quickActionContent.analyzeItem1Label"), desc: t("pages.quickActionContent.analyzeItem1Desc") },
        { label: t("pages.quickActionContent.analyzeItem2Label"), desc: t("pages.quickActionContent.analyzeItem2Desc") },
        { label: t("pages.quickActionContent.analyzeItem3Label"), desc: t("pages.quickActionContent.analyzeItem3Desc") },
      ],
    },
    sources: {
      title: t("pages.quickActionContent.sourcesTitle"),
      description: t("pages.quickActionContent.sourcesDesc"),
      icon: Database,
      href: "/workspace/sources",
    },
    settings: {
      title: t("pages.quickActionContent.settingsTitle"),
      description: t("pages.quickActionContent.settingsDesc"),
      icon: Settings,
      href: "/workspace/settings",
    },
    help: {
      title: t("pages.quickActionContent.helpTitle"),
      description: t("pages.quickActionContent.helpDesc"),
      icon: Headphones,
      items: [
        { label: t("pages.quickActionContent.helpItem1Label"), desc: t("pages.quickActionContent.helpItem1Desc") },
        { label: t("pages.quickActionContent.helpItem2Label"), desc: t("pages.quickActionContent.helpItem2Desc") },
        { label: t("pages.quickActionContent.helpItem3Label"), desc: t("pages.quickActionContent.helpItem3Desc") },
      ],
    },
  };
}


function EmptyPanel({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-[10px] border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center text-[12px] font-bold text-slate-400 ${compact ? "min-h-16 py-4" : "min-h-24 py-6"}`}>
      {label}
    </div>
  );
}

function QuickActionDrawer({ actionKey, onClose, quickActionContent, tDrawer }: { actionKey: QuickActionKey; onClose: () => void; quickActionContent: ReturnType<typeof getQuickActionContent>; tDrawer: (key: string) => string }) {
  const content = quickActionContent[actionKey];
  const Icon = content.icon;
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity" role="presentation" onMouseDown={onClose} />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
                <Icon size={18} />
              </span>
              <h2 id={titleId} className="text-[15px] font-black text-slate-900">{content.title}</h2>
            </div>
            <button ref={closeButtonRef} type="button" aria-label={tDrawer("pages.command.close")} onClick={onClose} className="rounded-lg border border-slate-100 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p id={descriptionId} className="text-[13px] font-semibold leading-relaxed text-slate-500">{content.description}</p>

            {content.href && (
              <Link href={content.href} onClick={onClose} className="mt-6 flex items-center justify-between rounded-xl border border-[#465FFF]/15 bg-[#465FFF]/5 px-4 py-3 text-[13px] font-bold text-[#465FFF] transition hover:bg-[#465FFF]/10">
                <span>{tDrawer("pages.command.openRelated")}</span>
                <ArrowRight size={15} />
              </Link>
            )}

            {content.items && (
              <div className="mt-6 space-y-3">
                {content.items.map((item) => (
                  <button key={item.label} type="button" onClick={onClose} className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-left transition hover:border-[#465FFF]/20 hover:bg-[#465FFF]/5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#465FFF]/10 text-[#465FFF]">
                      <Send size={13} />
                    </span>
                    <div>
                      <p className="text-[13px] font-black text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 transition hover:bg-slate-50">
              {tDrawer("pages.command.close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
export default function DashboardPage() {
  const t = useTranslations("DemoApp");
  const tDrawer = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [timeRange, setTimeRange] = useState<DateRangeKey>("24h");
  const [selectedAction, setSelectedAction] = useState<QuickActionKey | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [hasCheckedDemoMode, setHasCheckedDemoMode] = useState(false);
  const dateRange = getDateRangeOptions(timeRange);
  const quickActionContent = getQuickActionContent((key) => tDrawer(key));

  // Check demo mode on mount and trigger refetch when detected
  useEffect(() => {
    const isDemo = isDemoMode();
    setDemoMode(isDemo);
    setHasCheckedDemoMode(true);
  }, []);

  // Check onboarding status
  const workspaceQuery = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: () => getWorkspaceSettings(),
    staleTime: 60 * 1000,
    enabled: hasCheckedDemoMode && !demoMode,
  });

  // Redirect to onboarding if not set up
  const router = useRouter();
  useEffect(() => {
    if (hasCheckedDemoMode && !demoMode && workspaceQuery.data === null && !workspaceQuery.isLoading) {
      // No workspace settings yet, redirect to onboarding
      router.push("/onboarding");
    }
  }, [hasCheckedDemoMode, demoMode, workspaceQuery.data, workspaceQuery.isLoading, router]);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary", timeRange, demoMode],
    queryFn: () => getDashboardSummary(dateRange),
    staleTime: 15 * 1000,
    refetchInterval: demoMode ? 60000 : 15 * 1000, // Longer interval in demo mode
    refetchIntervalInBackground: false,
    enabled: hasCheckedDemoMode, // Don't run until we've checked demo mode
  });

  const timeRangeOptions: Array<{ label: string; value: DateRangeKey }> = [
    { label: t("pages.command.timeRange24h"), value: "24h" },
    { label: t("pages.command.timeRange7d"), value: "7d" },
    { label: t("pages.command.timeRange30d"), value: "30d" },
  ];

  const isLiveUnavailable = dashboardQuery.data === null && !demoMode;
  const summary = dashboardQuery.data;

  const activityData = summary?.trends?.length
    ? summary.trends.map(t => ({ label: new Date(t.date).toLocaleDateString(), value: t.count }))
    : [];

  const sentimentData = summary?.sentiment_distribution
    ? [
        { name: t("pages.command.positive"), value: summary.sentiment_distribution.positive, tone: "green" as const },
        { name: t("pages.command.neutral"), value: summary.sentiment_distribution.neutral, tone: "blue" as const },
        { name: t("pages.command.negative"), value: summary.sentiment_distribution.negative, tone: "red" as const },
      ]
    : [];

  // Format number with thousand separators
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("en-US");
  };

  // Format percentage with 1 decimal place
  const formatPercent = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0%";
    return `${num.toFixed(1)}%`;
  };

  const metricsRow = summary?.kpis
    ? [
        { label: t("metrics.totalSignals"), value: formatNumber(summary.kpis.total_signals), helper: "Live", icon: BarChart3, tone: "blue" as const },
        { label: t("metrics.analyzedSignals"), value: formatNumber(summary.kpis.analyzed_signals), helper: "Live", icon: BarChart3, tone: "purple" as const },
        { label: t("metrics.positiveSent"), value: formatPercent(summary.kpis.positive_percentage), helper: "Live", icon: BarChart3, tone: "green" as const },
        { label: t("metrics.negativeSent"), value: formatPercent(summary.kpis.negative_percentage), helper: "Live", icon: BarChart3, tone: "red" as const },
        { label: t("metrics.neutralSent"), value: formatPercent(summary.kpis.neutral_percentage), helper: "Live", icon: BarChart3, tone: "slate" as const },
        { label: t("metrics.mixedSent"), value: formatPercent(summary.kpis.mixed_percentage), helper: "Live", icon: BarChart3, tone: "amber" as const },
      ]
    : [];

  const alertsRow = summary?.latest_signals?.length
    ? summary.latest_signals.slice(0, 4).map((sig) => ({
        id: sig.id,
        title: sig.title || "Unknown signal",
        source: sig.platform,
        time: new Date(sig.published_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        tone: sig.sentiment.toLowerCase().includes("negative") ? "red" : sig.sentiment.toLowerCase().includes("positive") ? "green" : "blue",
      }))
    : [];


  const sysStatusData = summary?.system_status ?? [];
  const hotTopics = summary?.top_topics ?? [];
  const miniTrends = summary?.mini_topics ?? [];
  const sourcesData = summary?.sources_health ?? [];
  const globalActivity = summary?.global_activity ?? null;
  const mappedSignalCount = globalActivity?.total_signals ?? 0;
  const mappedRegionCount = globalActivity?.countries?.length ?? 0;

  // Check if workspace needs onboarding
  const needsOnboarding = hasCheckedDemoMode && !demoMode && workspaceQuery.data === null && !workspaceQuery.isLoading;
  const isEmptyDashboard = summary?.kpis?.total_signals === 0 && !demoMode;

  // Onboarding Empty State Component
  if (needsOnboarding) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="max-w-xl text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-[#465FFF] to-[#8B5CFF] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(70,95,255,0.3)]">
            <Rocket size={36} className="text-white" />
          </div>
          <h1 className="text-[32px] font-black text-slate-900 mb-3">
            Welcome to Narriv!
          </h1>
          <p className="text-[16px] font-semibold text-slate-500 mb-8 max-w-md mx-auto">
            Set up your monitoring workspace in just 3 steps. We&apos;ll help you configure sources and keywords to start tracking signals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-slate-100 bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#465FFF] text-white text-[13px] font-bold">1</span>
              <span className="text-[14px] font-bold text-slate-700">Configure Keywords</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-slate-100 bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#465FFF] text-white text-[13px] font-bold">2</span>
              <span className="text-[14px] font-bold text-slate-700">Select Sources</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] border border-slate-100 bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#465FFF] text-white text-[13px] font-bold">3</span>
              <span className="text-[14px] font-bold text-slate-700">Start Monitoring</span>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex h-[52px] items-center gap-3 rounded-[10px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-8 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(70,95,255,0.35)] transition hover:from-[#3b52d9] hover:to-[#764ee6] active:scale-[0.98]"
          >
            <Rocket size={20} />
            Start Setup Wizard
            <ArrowRight size={18} />
          </Link>
          <p className="mt-6 text-[13px] font-semibold text-slate-400">
            Takes about 7 minutes to complete
          </p>
        </div>
      </div>
    );
  }

  // ── New "Today's Intelligence" data ───────────────────────────────────────

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const developments: Array<{ id: string; icon: typeof AlertTriangle; title: string; change: string; category: string; tone: Tone }> = [
    { id: "d1", icon: Activity, title: "Service quality mentions spiking on Reddit", change: "+38%", category: "Risk", tone: "red" },
    { id: "d2", icon: Zap, title: "New competitor mentioned in AI responses", change: "NEW", category: "Competitor", tone: "amber" },
    { id: "d3", icon: TrendingUp, title: "Feature launch driving positive momentum", change: "+67%", category: "Opportunity", tone: "green" },
    { id: "d4", icon: Bot, title: "AI visibility score improving across platforms", change: "+8pp", category: "AI Visibility", tone: "blue" },
  ];

  const scorecard = [
    { label: "Narrative Health", value: 74, delta: "+3", lowerIsBetter: false, tone: "green" as Tone },
    { label: "Reputation Score", value: 81, delta: "-1", lowerIsBetter: false, tone: "blue" as Tone },
    { label: "Risk Level", value: 27, delta: "+5", lowerIsBetter: true, tone: "red" as Tone },
    { label: "Narrative Momentum", value: 69, delta: "+8", lowerIsBetter: false, tone: "green" as Tone },
    { label: "Share of Narrative", value: "34%", delta: "+2pp", lowerIsBetter: false, tone: "blue" as Tone },
    { label: "AI Visibility", value: 72, delta: "+6", lowerIsBetter: false, tone: "purple" as Tone },
  ];

  const competitors = [
    { name: "CompetitorA", shareOfVoice: 42, sentiment: "green" as Tone, momentum: "+12%", aiVisibility: 68 },
    { name: "CompetitorB", shareOfVoice: 18, sentiment: "slate" as Tone, momentum: "-3%", aiVisibility: 54 },
    { name: "CompetitorC", shareOfVoice: 6, sentiment: "red" as Tone, momentum: "+1%", aiVisibility: 31 },
  ];

  const recommendedActions = [
    { id: "a1", priority: "Immediate" as const, text: "Monitor spike in negative service quality mentions on Reddit — consider response strategy", href: "/signals" },
    { id: "a2", priority: "High" as const, text: "Investigate sudden drop in positive sentiment (-8%) over the past 24 hours", href: "/signals" },
    { id: "a3", priority: "High" as const, text: "Review AI-generated content citing competitor comparison — assess opportunity", href: "/visibility" },
    { id: "a4", priority: "Medium" as const, text: "Prepare response to emerging \"app performance\" topic before it gains traction", href: "/intelligence" },
    { id: "a5", priority: "Low" as const, text: "Capitalize on positive loyalty program momentum with follow-up content", href: "/reports" },
  ];

  const aiPlatforms = [
    { name: "ChatGPT", score: 72, change: "+6", tone: "green" as Tone },
    { name: "Gemini", score: 61, change: "+3", tone: "blue" as Tone },
    { name: "Perplexity", score: 58, change: "-2", tone: "red" as Tone },
  ];

  const narratives: Array<{ id: string; title: string; status: "active"; sentiment: Tone; volume: string; growth: string }> =
    demoMode
      ? getMockNarratives().data.map((n) => ({
          id: n.id,
          title: n.title,
          status: "active" as const,
          sentiment: (n.sentiment === "positive" ? "green" : n.sentiment === "negative" ? "red" : n.sentiment === "mixed" ? "amber" : "blue") as Tone,
          volume: String(n.signalCount),
          growth: n.velocity,
        }))
      : (summary?.top_topics ?? []).map((t, i) => ({
          id: `topic-${i}`,
          title: text(t.name, language),
          status: "active" as const,
          sentiment: (t.tone === "positive" ? "green" : t.tone === "negative" ? "red" : t.tone === "mixed" ? "amber" : "blue") as Tone,
          volume: t.mentions,
          growth: t.delta,
        }));

  const priorityBadgeClass: Record<string, string> = {
    Immediate: "bg-red-50 text-red-600 border-red-200",
    High: "bg-amber-50 text-amber-600 border-amber-200",
    Medium: "bg-blue-50 text-blue-600 border-blue-200",
    Low: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <div className="space-y-8 pb-6">
      {/* ── 1. Executive Summary Bar ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-[14px] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#fff7ed_100%)] p-4 shadow-[0_14px_38px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
              <Sparkles size={18} />
            </span>
            <h1 className="text-[22px] font-black tracking-[-0.03em] text-slate-900">
              Today&apos;s Intelligence
            </h1>
          </div>
          <span className="text-[13px] font-semibold text-slate-400">{dateStr}</span>
        </div>
        <p className="text-[13px] font-medium leading-relaxed text-slate-500">
          3 emerging risks detected. 1 opportunity identified. Net sentiment shifted +8% today.
        </p>
      </div>

      {/* ── 2. Top Developments ───────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-[13px] font-black uppercase tracking-[0.1em] text-slate-400">Top Developments</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {developments.map((d) => {
            const Icon = d.icon;
            const toneStyle = toneMap[d.tone] ?? toneMap.purple;
            return (
              <div key={d.id} className="flex min-w-[220px] max-w-[260px] flex-col gap-2.5 rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${toneStyle.bg} ${toneStyle.text}`}>
                    <Icon size={15} />
                  </span>
                  <span className="rounded-[6px] border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">{d.category}</span>
                </div>
                <p className="text-[12px] font-bold leading-snug text-slate-800">{d.title}</p>
                <span className={`text-[13px] font-black tabular-nums ${toneStyle.text}`}>{d.change}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Intelligence Scorecard ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {scorecard.map((s) => {
          const isPositive = s.lowerIsBetter ? s.delta.startsWith("-") || s.delta === "0" : !s.delta.startsWith("-");
          const trendColor = isPositive ? "text-[#10B981]" : "text-[#EF4444]";
          const scoreStyle = toneMap[s.tone] ?? toneMap.purple;
          return (
            <AppCard key={s.label}>
              <CardContent className="flex flex-col gap-1 p-4">
                <p className="text-[11px] font-bold text-slate-400">{s.label}</p>
                <p className={`text-[26px] font-black tracking-[-0.03em] tabular-nums ${scoreStyle.text}`}>{s.value}</p>
                <p className={`text-[12px] font-bold tabular-nums ${trendColor}`}>
                  {s.delta}
                </p>
              </CardContent>
            </AppCard>
          );
        })}
      </div>

      {/* ── 4. Two-column layout ──────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">

        {/* Left column: Top Narratives + Competitor Snapshot */}
        <div className="flex flex-col gap-6">
          {/* Today's Top Narratives */}
          <AppCard>
            <CardContent className="p-5">
              <SectionHeader
                title="Today&apos;s Top Narratives"
                description="Most active narrative clusters in the last 24 hours"
                action={
                  <Link href="/intelligence" className="flex items-center gap-1 text-[11px] font-bold text-[#465FFF] transition-all hover:text-[#8B5CFF] hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                }
              />
              <div className="mt-3 space-y-2.5">
                {narratives.slice(0, 5).map((n) => {
                  const sentimentColor = toneMap[n.sentiment] ?? toneMap.slate;
                  return (
                    <div key={n.id} className="flex items-center gap-3 rounded-[8px] border border-slate-100 bg-white px-4 py-3 transition hover:border-[#465FFF]/20 hover:bg-[#465FFF]/2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${sentimentColor.soft}`} />
                      <p className="flex-1 text-[13px] font-bold text-slate-800 truncate">{n.title}</p>
                      <span className="hidden text-[11px] font-semibold text-slate-400 sm:block">{n.volume}</span>
                      <span className="rounded-[6px] bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">{n.growth}</span>
                    </div>
                  );
                })}
                {narratives.length === 0 && (
                  <EmptyPanel label={t("pages.command.emptyTopics")} />
                )}
              </div>
            </CardContent>
          </AppCard>

          {/* Competitor Snapshot */}
          <AppCard>
            <CardContent className="p-5">
              <SectionHeader
                title="Competitor Snapshot"
                description="Share of voice and sentiment vs. key competitors"
                action={
                  <Link href="/visibility" className="flex items-center gap-1 text-[11px] font-bold text-[#465FFF] transition-all hover:text-[#8B5CFF] hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                }
              />
              <div className="mt-3 overflow-hidden rounded-[8px] border border-slate-100">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left font-bold text-slate-400">Competitor</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-400">Voice Share</th>
                      <th className="px-3 py-2 text-center font-bold text-slate-400">Sentiment</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-400">Momentum</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-400">AI Visibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((c) => {
                      const sentStyle = toneMap[c.sentiment];
                      const momentumPositive = c.momentum.startsWith("+");
                      const sentimentLabel = c.sentiment === "green" ? "Positive" : c.sentiment === "red" ? "Negative" : c.sentiment === "amber" ? "Mixed" : "Neutral";
                      return (
                        <tr key={c.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{c.name}</td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-700">{c.shareOfVoice}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex h-5 items-center gap-1 rounded-[6px] px-1.5 text-[10px] font-bold ${sentStyle.bg} ${sentStyle.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${sentStyle.soft}`} />
                              {sentimentLabel}
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${momentumPositive ? "text-[#10B981]" : "text-[#EF4444]"}`}>{c.momentum}</td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-700">{c.aiVisibility}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </AppCard>
        </div>

        {/* Right column: Actions + AI Visibility + Data Status */}
        <div className="flex flex-col gap-6">
          {/* Recommended Actions */}
          <AppCard>
            <CardContent className="p-5">
              <SectionHeader
                title="Recommended Actions"
                description="Prioritized response items for today"
                action={
                  <Link href="/action-plans" className="flex items-center gap-1 text-[11px] font-bold text-[#465FFF] transition-all hover:text-[#8B5CFF] hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                }
              />
              <div className="mt-3 space-y-2.5">
                {recommendedActions.map((a) => (
                  <div key={a.id} className="flex flex-col gap-2 rounded-[8px] border border-slate-100 bg-white px-4 py-3 transition hover:border-[#465FFF]/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-[6px] border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${priorityBadgeClass[a.priority]}`}>
                        {a.priority}
                      </span>
                      <Link href={a.href} className="flex items-center gap-0.5 text-[10px] font-bold text-[#465FFF] transition hover:text-[#8B5CFF]">
                        View <ChevronRight size={10} />
                      </Link>
                    </div>
                    <p className="text-[12px] font-medium leading-snug text-slate-700">{a.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </AppCard>

          {/* AI Visibility Changes */}
          <AppCard>
            <CardContent className="p-5">
              <SectionHeader
                title="AI Visibility Changes"
                description="Platform visibility scores vs. last week"
                action={
                  <Link href="/visibility" className="flex items-center gap-1 text-[11px] font-bold text-[#465FFF] transition-all hover:text-[#8B5CFF] hover:underline">
                    Details <ArrowRight size={12} />
                  </Link>
                }
              />
              <div className="mt-3 space-y-3">
                {aiPlatforms.map((p) => {
                  const platformStyle = toneMap[p.tone] ?? toneMap.purple;
                  const changePositive = !p.change.startsWith("-");
                  return (
                    <div key={p.name} className="flex items-center justify-between rounded-[8px] border border-slate-100 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${platformStyle.bg} ${platformStyle.text}`}>
                          <Bot size={14} />
                        </span>
                        <span className="text-[13px] font-bold text-slate-700">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black tabular-nums text-slate-900">{p.score}</span>
                        <span className={`text-[11px] font-bold tabular-nums ${changePositive ? "text-[#10B981]" : "text-[#EF4444]"}`}>{p.change}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </AppCard>

          {/* Data Status */}
          <AppCard>
            <CardContent className="flex flex-col gap-3 p-5">
              <SectionHeader title="Data Status" />
              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Last updated</span>
                  <span className="font-bold text-slate-700">{today.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Data coverage</span>
                  <span className="font-bold text-slate-700">48 / 62 sources</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">Mode</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11px] font-bold ${demoMode ? "bg-[#8B5CFF]/10 text-[#8B5CFF]" : "bg-[#10B981]/10 text-[#10B981]"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${demoMode ? "bg-[#8B5CFF]" : "bg-[#10B981]"}`} />
                    {demoMode ? "Demo" : "Live"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void dashboardQuery.refetch()}
                disabled={dashboardQuery.isFetching}
                className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white text-[12px] font-bold text-slate-600 transition hover:border-[#465FFF]/30 hover:bg-[#465FFF]/5 hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw size={13} className={dashboardQuery.isFetching ? "animate-spin" : ""} />
                Refresh now
              </button>
            </CardContent>
          </AppCard>
        </div>
      </div>

      {/* ── 5. Footer strip ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-slate-100 bg-slate-50 px-5 py-3 text-[12px] font-semibold text-slate-400">
        <span>Last refresh: {today.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        <div className="flex items-center gap-3">
          {demoMode && (
            <span className="rounded-[6px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#8B5CFF]">
              Demo
            </span>
          )}
          <span>Narriv Intelligence Platform</span>
        </div>
      </div>
    </div>
  );
}






