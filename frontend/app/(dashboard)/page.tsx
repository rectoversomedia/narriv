"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, BarChart3, Bell, CheckCircle2, ChevronDown, Database, FileText, Headphones, RefreshCcw, Send, Settings, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AppCard, IconBubble, MetricTile, SectionHeader } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { quickActions, text, type Tone } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getDateRangeOptions, type DateRangeKey } from "@/lib/api-service";
import { DashboardErrorState, MetricRowSkeleton } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";

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

function QuickActionDrawer({ actionKey, onClose, quickActionContent, tDrawer }: { actionKey: QuickActionKey; onClose: () => void; quickActionContent: ReturnType<typeof getQuickActionContent>; tDrawer: (key: string) => string }) {
  const content = quickActionContent[actionKey];
  const Icon = content.icon;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
                <Icon size={18} />
              </span>
              <h2 className="text-[15px] font-black text-slate-900">{content.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-100 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-[13px] font-semibold leading-relaxed text-slate-500">{content.description}</p>

            {content.href && (
              <Link href={content.href} onClick={onClose} className="mt-6 flex items-center justify-between rounded-xl border border-[#465FFF]/15 bg-[#465FFF]/5 px-4 py-3 text-[13px] font-bold text-[#465FFF] transition hover:bg-[#465FFF]/10">
                <span>{tDrawer("pages.command.openRelated")}</span>
                <ArrowRight size={15} />
              </Link>
            )}

            {content.items && (
              <div className="mt-6 space-y-3">
                {content.items.map((item) => (
                  <button key={item.label} type="button" className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-left transition hover:border-[#465FFF]/20 hover:bg-[#465FFF]/5">
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
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const dateRange = getDateRangeOptions(timeRange);
  const quickActionContent = getQuickActionContent((key) => tDrawer(key));

  const timeRangeOptions: Array<{ label: string; value: DateRangeKey }> = [
    { label: t("pages.command.timeRange24h"), value: "24h" },
    { label: t("pages.command.timeRange7d"), value: "7d" },
    { label: t("pages.command.timeRange30d"), value: "30d" },
  ];

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary", timeRange],
    queryFn: () => getDashboardSummary(dateRange),
    staleTime: 30 * 1000,
  });
  
  const isLiveUnavailable = dashboardQuery.data === null;
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

  const metricsRow = summary?.kpis
    ? [
        { label: t("metrics.totalSignals"), value: String(summary.kpis.total_signals), helper: "Live", icon: BarChart3, tone: "blue" as const },
        { label: t("metrics.analyzedSignals"), value: String(summary.kpis.analyzed_signals), helper: "Live", icon: BarChart3, tone: "purple" as const },
        { label: t("metrics.positiveSent"), value: `${summary.kpis.positive_percentage}%`, helper: "Live", icon: BarChart3, tone: "green" as const },
        { label: t("metrics.negativeSent"), value: `${summary.kpis.negative_percentage}%`, helper: "Live", icon: BarChart3, tone: "red" as const },
        { label: t("metrics.neutralSent"), value: `${summary.kpis.neutral_percentage}%`, helper: "Live", icon: BarChart3, tone: "slate" as const },
        { label: t("metrics.mixedSent"), value: `${summary.kpis.mixed_percentage}%`, helper: "Live", icon: BarChart3, tone: "amber" as const },
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

  return (
    <div className="space-y-8 pb-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-2">
        <div>
          <h1 className="text-[34px] font-black tracking-tight text-slate-900 flex items-center gap-2">
            {t("pages.command.title")}
          </h1>
          <p className="mt-3 text-[15px] font-medium text-slate-400">{t("pages.command.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            type="button" 
            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-[0.98] sm:w-auto"
          >
            <Settings size={16} className="text-slate-500" />
            {t("pages.command.customize")}
          </button>
          <button 
            type="button" 
            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-[0.98] sm:w-auto"
          >
            <RefreshCcw size={16} className="text-slate-500 animate-spin-slow" />
            {t("pages.command.refresh")}
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {isLiveUnavailable ? (
        <DashboardErrorState title={t("pages.command.errorTitle")} description={t("pages.command.errorDesc")} onRetry={() => void dashboardQuery.refetch()} minHeight="min-h-[150px]" />
      ) : null}

      {dashboardQuery.isPending ? (
        <MetricRowSkeleton count={6} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {metricsRow.map((metric) => (
            <MetricTile 
              key={metric.label} 
              label={metric.label} 
              value={metric.value}
              helper={metric.helper} 
              icon={metric.icon} 
              tone={metric.tone} 
            />
          ))}
        </div>
      )}

      {/* Main Insights Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1.05fr_0.8fr]">
        {/* Signal Volume Trends */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader 
              title={t("pages.command.activity")} 
              description={t("pages.command.activityDesc")} 
              action={
                <div className="flex flex-wrap gap-2">
                  {timeRangeOptions.map((range) => (
                    <button key={range.value} type="button" onClick={() => setTimeRange(range.value)} className={`rounded-[8px] border px-3 py-2 text-xs font-bold transition-all ${timeRange === range.value ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                      {range.label}
                    </button>
                  ))}
                </div>
              } 
            />
            <ActivityAreaChart data={activityData} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {miniTrends.map((topic) => (
                <div key={topic.label} className="rounded-[8px] border border-slate-100 bg-slate-50 p-3 transition hover:border-[#465FFF]/20">
                  <p className="text-xs font-bold text-slate-400 truncate">{topic.label}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{topic.value}</p>
                  <MiniSparkline tone={topic.tone as Tone} />
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Narrative Command Map */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader 
              title={t("pages.command.map")} 
              description={t("pages.command.mapDesc")} 
              action={
                <button className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all">
                  Indonesia <ChevronDown size={14} className="inline ml-1 text-slate-400" />
                </button>
              }
            />
            <WorldActivityMap />
          </CardContent>
        </AppCard>

        {/* Predictive Alerts */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader 
              title={t("pages.command.alerts")} 
              description={t("pages.command.alertsDesc")} 
              action={<Link href="/alerts" className="whitespace-nowrap text-[11px] font-bold text-[#465FFF] transition-all hover:text-[#8B5CFF] hover:underline">{t("common.viewAll")}</Link>} 
            />
            <div className="space-y-4">
              {alertsRow.map((alert) => (
                <div key={alert.id} className="flex gap-3 border-b border-slate-100 pb-3.5 last:border-0 last:pb-0">
                  <IconBubble icon={Zap} tone={alert.tone as Tone} className="h-9 w-9 rounded-[8px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800">{alert.title}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{alert.source}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{alert.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-bold text-[#465FFF] hover:text-[#465FFF] transition-all group">
              {t("common.viewAll")} 
              <ArrowRight size={16} className="transform transition-transform group-hover:translate-x-1" />
            </button>
          </CardContent>
        </AppCard>
      </div>

      {/* Extra Details Grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr_0.8fr]">
        {/* Hot Topics */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.topics")} description={t("pages.command.topicsDesc")} />
            <div className="space-y-2 mt-4">
              {hotTopics.map((topic, index) => (
                <div key={text(topic.name, language)} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8B5CFF]/15 text-xs font-bold text-[#8B5CFF] border border-[#8B5CFF]/20">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-sm font-bold text-slate-900 truncate">{text(topic.name, language)}</p>
                  <p className="text-xs font-semibold text-slate-400">{topic.mentions}</p>
                  <p className={`text-xs font-extrabold ${topic.tone === "red" ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                    {topic.delta}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Data Sources */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.sources")} description={t("pages.command.sourcesDesc")} />
            <div className="space-y-2 mt-4">
              {sourcesData.map((source, index) => (
                <div key={`${source.name}-${index}`} className="grid grid-cols-[1fr_75px_60px] items-center gap-2 py-3 border-b border-slate-100 last:border-0 last:pb-0 text-sm">
                  <p className="font-bold text-slate-800 truncate">{source.name}</p>
                  <p className="text-xs font-extrabold text-[#10B981] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    {text(source.status, language)}
                  </p>
                  <p className="text-right text-xs font-bold text-slate-500">{source.signals}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Mentions Sentiment Visibility */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.visibility")} description={t("pages.command.visibilityDesc")} />
            <DonutChart center={String(summary?.kpis?.analyzed_signals ?? "2.451")} label={t("pages.command.totalMentions")} data={sentimentData} />
            <div className="mt-6 grid gap-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#12B76A]" />
                  {t("pages.command.positive")}
                </span>
                <b className="text-slate-900">{summary?.sentiment_distribution?.positive ?? 1248}</b>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#465FFF]" />
                  {t("pages.command.neutral")}
                </span>
                <b className="text-slate-900">{summary?.sentiment_distribution?.neutral ?? 842}</b>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#F04438]" />
                  {t("pages.command.negative")}
                </span>
                <b className="text-slate-900">{summary?.sentiment_distribution?.negative ?? 361}</b>
              </div>
            </div>
          </CardContent>
        </AppCard>

        {/* Quick Actions */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.quick")} description={t("pages.command.quickDesc")} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {quickActions.map((action) => { 
                const Icon = action.icon; 
                return (
                    <button 
                      key={action.key} 
                      onClick={() => setSelectedAction(action.key)}
                      className={`flex min-h-[82px] flex-col items-center justify-center gap-2.5 rounded-[8px] border transition-all text-center text-xs font-bold active:scale-[0.96] ${selectedAction === action.key ? "border-[#465FFF] bg-[#465FFF]/5 text-[#465FFF]" : "border-slate-100 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-[#465FFF]/35"}`}
                    >
                    <Icon size={22} className="text-[#465FFF] drop-shadow-[0_0_8px_rgba(70,95,255,0.4)]" />
                    <span className="px-1">{t(`pages.quickActions.${action.key}`)}</span>
                  </button>
                ); 
              })}
            </div>
            {selectedAction ? (
              <QuickActionDrawer actionKey={selectedAction as QuickActionKey} onClose={() => setSelectedAction(null)} quickActionContent={quickActionContent} tDrawer={(key) => tDrawer(key)} />
            ) : null}
          </CardContent>
        </AppCard>
      </div>

      {/* System Status Banner */}
      <AppCard>
        <CardContent className="p-5">
          <SectionHeader 
            title={t("pages.command.status")} 
            action={
              <a className="text-sm font-bold text-[#465FFF] hover:underline flex items-center gap-1">
                {t("pages.command.viewStatus")} <ArrowRight size={16} className="inline ml-1" />
              </a>
            } 
          />
          <div className="grid gap-3 md:grid-cols-5 mt-4">
            {sysStatusData.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[10px] bg-slate-50 border border-slate-100 p-4 transition hover:border-[#10B981]/25">
                <IconBubble icon={CheckCircle2} tone="green" className="h-8 w-8 rounded-full shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{item}</p>
                  <p className="text-xs font-semibold text-[#10B981]">{t("common.operational")}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}
