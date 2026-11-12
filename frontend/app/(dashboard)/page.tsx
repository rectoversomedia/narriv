"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { useL } from "@/lib/use-l";
import { intlLocale } from "@/store/useUiStore";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import {
  fetchDashboardSummaryStrict,
  getAlerts,
  getDashboardSummary,
  getDateRangeOptions,
  getMonitoringKeywords,
  getNarratives,
  getVisibilitySummary,
  getWorkspaceSettings,
  runGeoAllEngines,
  runKeywordMonitoring,
  type Alert,
  type DateRangeKey,
  type NarrativeRecord,
} from "@/lib/api-service";
import { getPipelineStatus, getRecommendations, timeAgo, type IntelligenceRecommendation } from "@/lib/intelligence-api";
import { useCodeLabels } from "@/components/intelligence/intelligence-panels";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { AI_ENGINES } from "@/components/ui/ai-engines";
import { DemoBanner } from "@/components/ui/demo-banner";
import { SentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/toast";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { issueHref, monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { CompetitorCard } from "@/components/dashboard/competitor-card";
import { CveCategoryCard, CveProvinceSection } from "@/components/dashboard/cve-overview";
import { useWorkspaceUseCase } from "@/lib/use-case";

// One screen, one period, five answers: how coverage leans, what to do, which issues are hot, where the
// records come from, and how AI assistants talk about the brand. Short labels; every number opens its records.

const PERIOD_HOURS: Record<DateRangeKey, number> = { "24h": 24, "7d": 168, "30d": 720 };
const PERIOD_DAYS: Record<DateRangeKey, number> = { "24h": 1, "7d": 7, "30d": 30 };
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const GEO_ENGINES = AI_ENGINES;
const PLATFORM_NAMES: Record<string, string> = { twitter: "X", x: "X", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", reddit: "Reddit" };
const SOCIAL_PLATFORMS = ["twitter", "instagram", "facebook", "tiktok", "youtube"];
const BAR_COLORS = ["#465FFF", "#8B5CFF", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];

// The alert list returns stored rows (snake_case); the detail endpoint returns camelCase.
type AlertRow = Alert & { created_at?: string; what_to_do?: string | null };
const alertTime = (a: AlertRow) => a.createdAt || a.created_at || null;

const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0];

// Who holds the alert and how its deadline stands: the two facts that decide whether it needs a push today.
function AlertFacts({ alert }: { alert: AlertRow }) {
  const L = useL();
  const deadline = alert.deadline ? new Date(alert.deadline).getTime() : NaN;
  const overdueHours = Number.isFinite(deadline) && deadline < Date.now() ? Math.max(1, Math.round((Date.now() - deadline) / 3600000)) : 0;
  const noOwner = !alert.assignedTo && !alert.assignedTeam;
  if (!overdueHours && !noOwner) return null;
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {noOwner ? <span className="rounded-full bg-[#C81E1E] px-2 py-0.5 text-[11px] font-black text-white">{L("No Owner", "Belum Ada Pemilik")}</span> : null}
      {overdueHours ? <span className="rounded-full bg-[#C81E1E] px-2 py-0.5 text-[11px] font-black text-white">{L(`${overdueHours}h Past Deadline`, `Lewat Tenggat ${overdueHours} Jam`)}</span> : null}
    </span>
  );
}

/**
 * A section of the overview: no box, a strong title, and the one action that follows from it as a button.
 * Sections are separated by space, so the data carries the page rather than frames around it.
 */
function Card({ title, link, children, className }: { title: string; link?: { href: string; label: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col", BOX, className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{title}</h2>
        {link ? (
          <Link href={link.href} className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#101334] px-4 text-[12.5px] font-bold text-white transition hover:bg-[#2B2F9E]">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-[13px] font-semibold text-[#5A6478]">{children}</p>;
}


function Bar({ label, value, share, color, href, muted, right }: { label: React.ReactNode; value: string; share: number; color: string; href?: string; muted?: boolean; right?: string }) {
  // The count sits where the bar ends (inside it when there is room); the share, if any, in the right corner.
  const inside = share >= 18;
  const body = (
    <>
      <span className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className={cn("font-bold", muted ? "text-[#8A93AD]" : "text-[#101334]")}>{label}</span>
        {right ? <span className={cn("tabular-nums font-black", muted ? "text-[#8A93AD]" : "text-[#101334]")}>{right}</span> : null}
      </span>
      <div className="relative mt-1 h-6 overflow-hidden rounded-[7px] bg-[#E8ECF6]">
        <div className="absolute inset-y-0 left-0 rounded-[7px] transition-[width] duration-500" style={{ width: `${Math.max(share, share > 0 ? 1.5 : 0)}%`, backgroundColor: color }} />
        <span
          className={cn("absolute inset-y-0 flex items-center whitespace-nowrap text-[11px] font-black tabular-nums", inside ? "text-white" : muted ? "text-[#8A93AD]" : "text-[#101334]")}
          style={inside ? { right: `calc(${100 - share}% + 8px)` } : { left: `calc(${share}% + 8px)` }}
        >
          {value}
        </span>
      </div>
    </>
  );
  return href ? <Link href={href} className="-mx-2 block rounded-[10px] px-2 py-1.5 transition hover:bg-[#F7F8FC]">{body}</Link> : <div className="py-1">{body}</div>;
}

/** A small 7-point line for a keyword's daily records. */
function Tag({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", tone)}>{children}</span>;
}

const levelTone = (level: string) =>
  level === "critical" ? "bg-[#B42318] text-white" : level === "high" ? "bg-[#FDECEC] text-[#B42318]" : level === "medium" ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#EEF1F7] text-[#465170]";

function sentimentTag(value: string | null | undefined) {
  const v = String(value || "").toLowerCase();
  if (v.includes("neg")) return { cls: "bg-[#FDECEC] text-[#B42318]", en: "Negative", id: "Negatif" };
  if (v.includes("pos")) return { cls: "bg-[#E8F7EF] text-[#047857]", en: "Positive", id: "Positif" };
  if (v.includes("mix")) return { cls: "bg-[#FFF4E5] text-[#A04606]", en: "Mixed", id: "Campuran" };
  return { cls: "bg-[#EEF1F7] text-[#465170]", en: "Neutral", id: "Netral" };
}

/**
 * A new workspace's first minutes: with keywords set, the first news collection starts by itself (once per browser
 * session) and the board fills when it finishes; without keywords, one clear step to add them.
 */
function FirstRun() {
  const L = useL();
  const queryClient = useQueryClient();
  const keywordsQuery = useQuery({ queryKey: ["monitoring-keywords"], queryFn: getMonitoringKeywords, staleTime: 30 * 1000 });
  const run = useMutation({
    mutationFn: () => runKeywordMonitoring({ firstRun: true }),
    onSuccess: () => void queryClient.invalidateQueries(),
    onError: (err: Error & { status?: number; code?: string }) => {
      // The server keeps going after the browser stops waiting; look again in a minute.
      if (err.code === "CLIENT_TIMEOUT" || err.status === 429) setTimeout(() => void queryClient.invalidateQueries(), 60_000);
    },
  });
  const active = (keywordsQuery.data?.data ?? []).filter((k) => k.isActive);
  const canEdit = Boolean(keywordsQuery.data?.canEdit);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !canEdit || active.length === 0) return;
    let already = false;
    try { already = sessionStorage.getItem("narriv_first_run") === "1"; sessionStorage.setItem("narriv_first_run", "1"); } catch { /* storage off: still run once */ }
    startedRef.current = true;
    if (!already) run.mutate();
  }, [canEdit, active.length, run]);

  const nextHour = new Date(Math.ceil(Date.now() / 3600000) * 3600000).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" });
  const names = active.slice(0, 3).map((k) => `«${k.keyword}»`).join(", ");
  const err = run.error as (Error & { status?: number; code?: string }) | null;

  if (keywordsQuery.isLoading) return <Skeleton className="h-40 w-full rounded-[16px]" />;
  if (active.length === 0) {
    return (
      <section className="rounded-[16px] bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] p-6 text-white">
        <p className="text-[11px] font-black text-white/60">{L("First step", "Langkah pertama")}</p>
        <p className="mt-1 text-[24px] font-black leading-tight">{L("Tell Narriv what to watch", "Beri tahu Narriv apa yang dipantau")}</p>
        <p className="mt-1 text-[13px] font-bold text-white/80">{L("Add your brand or product name. News starts coming in within a minute.", "Tambahkan nama brand atau produk Anda. Berita mulai masuk dalam satu menit.")}</p>
        <Link href="/workspace/settings#keywords" className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-white px-5 text-[14px] font-black text-[#101334] hover:bg-[#EEF1FF]">{L("Add a keyword", "Tambah kata kunci")} →</Link>
      </section>
    );
  }
  const status = run.isPending
    ? { tone: "working", title: L("Collecting the first news…", "Mengambil berita pertama…"), sub: L(`For ${names}. This usually takes about a minute.`, `Untuk ${names}. Biasanya sekitar satu menit.`) }
    : run.isSuccess
      ? { tone: "done", title: L(`${run.data?.totals?.fetched ?? 0} articles found`, `${run.data?.totals?.fetched ?? 0} berita ditemukan`), sub: (run.data?.totals?.fetched ?? 0) > 0 ? L("Analysing them now; the board fills in a moment.", "Sedang dianalisis; dashboard terisi sebentar lagi.") : L("Nothing yet for these keywords. Try a more common name, or wait for the next hourly check.", "Belum ada berita untuk kata kunci ini. Coba nama yang lebih umum, atau tunggu pengecekan jam berikutnya.") }
      : err && err.code !== "CLIENT_TIMEOUT" && err.status !== 429
        ? { tone: "error", title: L("The first collection did not run", "Pengambilan pertama belum berjalan"), sub: L(`It will run automatically at ${nextHour}. You can also try again now.`, `Akan berjalan otomatis pukul ${nextHour}. Anda juga bisa mencoba lagi sekarang.`) }
        : { tone: "waiting", title: canEdit ? L("The first collection is running", "Pengambilan pertama sedang berjalan") : L(`First data arrives by ${nextHour}`, `Data pertama masuk sebelum pukul ${nextHour}`), sub: L(`Narriv watches ${names} and checks every hour.`, `Narriv memantau ${names} dan mengecek setiap jam.`) };
  return (
    <section className={cn("rounded-[16px] p-6 text-white", status.tone === "error" ? "bg-gradient-to-br from-[#7C2D12] to-[#E8590C]" : status.tone === "done" ? "bg-gradient-to-br from-[#065F46] to-[#12A66A]" : "bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E]")}>
      <p className="text-[11px] font-black text-white/60">{L("Getting started", "Memulai")}</p>
      <div className="mt-1 flex items-center gap-3">
        {status.tone === "working" ? <span className="size-5 animate-spin rounded-full border-[3px] border-white/30 border-t-white" aria-hidden="true" /> : null}
        <p className="text-[24px] font-black leading-tight">{status.title}</p>
      </div>
      <p className="mt-1 text-[13px] font-bold text-white/85">{status.sub}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {status.tone === "error" && canEdit ? <button type="button" onClick={() => run.mutate()} className="h-10 rounded-[10px] bg-white px-4 text-[13px] font-black text-[#101334]">{L("Try again", "Coba lagi")}</button> : null}
        <Link href="/workspace/settings#keywords" className="inline-flex h-10 items-center rounded-[10px] bg-white/15 px-4 text-[13px] font-black text-white hover:bg-white/25">{L("Manage keywords", "Atur kata kunci")}</Link>
        <Link href="/workspace/integrations" className="inline-flex h-10 items-center rounded-[10px] bg-white/15 px-4 text-[13px] font-black text-white hover:bg-white/25">{L("Send alerts to Slack / WhatsApp", "Kirim peringatan ke Slack / WhatsApp")}</Link>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const L = useL();
  const codes = useCodeLabels();
  const tLevel = useTranslations("IntelPanels");
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);
  const [period, setPeriod] = useState<DateRangeKey>("30d");
  const [planOpen, setPlanOpen] = useState(false);
  const router = useRouter();

  // A workspace that has not finished onboarding goes there first.
  // Also gives the brand name shown in the focus strip (demo sessions read the demo workspace's settings).
  const workspaceQuery = useQuery({ queryKey: ["workspace-settings"], queryFn: () => getWorkspaceSettings(), staleTime: 60 * 1000 });
  useEffect(() => {
    if (isDemoSession || workspaceQuery.isLoading) return;
    if (workspaceQuery.data && workspaceQuery.data.onboarding_completed !== true) router.push("/onboarding");
  }, [isDemoSession, workspaceQuery.data, workspaceQuery.isLoading, router]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", period],
    // Live sessions use the strict fetch so a failure shows as an error instead of an empty board.
    queryFn: () => (isDemoSession ? getDashboardSummary(getDateRangeOptions(period)) : fetchDashboardSummaryStrict(getDateRangeOptions(period))),
    retry: (count, err) => ![401, 403].includes((err as { status?: number })?.status ?? 0) && count < 2,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
  const pipelineQuery = useQuery({ queryKey: ["pipeline-status"], queryFn: getPipelineStatus, staleTime: 60 * 1000, retry: 1 });
  const issuesQuery = useQuery({ queryKey: ["overview-issues", period], queryFn: () => getNarratives({ limit: 20, days: PERIOD_DAYS[period] }), staleTime: 60 * 1000 });
  const alertsQuery = useQuery({ queryKey: ["overview-active-alerts"], queryFn: () => getAlerts({ status: "unresolved", limit: 50 }), staleTime: 30 * 1000 });
  const recsQuery = useQuery({ queryKey: ["overview-recommendations", period], queryFn: () => getRecommendations(PERIOD_HOURS[period]), staleTime: 60 * 1000, retry: 1 });
  // What the workspace monitors for decides some panels: a CVE workspace sees provinces and narrative categories
  // where a brand sees AI visibility and competitors; a government body has no competitors.
  const { useCase } = useWorkspaceUseCase();
  const geoQuery = useQuery({ queryKey: ["overview-geo-summary"], queryFn: () => getVisibilitySummary(), staleTime: 5 * 60 * 1000, enabled: useCase !== "cve" });
  const geoRun = useMutation({
    mutationFn: runGeoAllEngines,
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.ok).length;
      toast.success(L(`${ok} AI assistant(s) tested.`, `${ok} AI selesai diuji.`));
      void queryClient.invalidateQueries({ queryKey: ["overview-geo-summary"] });
    },
    onError: (error: Error) => toast.error(error.message || L("The test could not run.", "Uji gagal dijalankan.")),
  });

  const hours = PERIOD_HOURS[period] as MonitoringPeriod;
  const summary = summaryQuery.data;
  const pipeline = pipelineQuery.data;
  // The later of the last scheduled run and the newest stored record (manual collection counts too).
  const lastDataAt = [pipeline?.scheduler?.lastSuccessfulIngestionForWorkspace, pipeline?.ingestion?.lastRawDocumentAt].filter(Boolean).sort().at(-1) ?? null;

  // Sentiment
  const dist = summary?.sentiment_distribution ?? { positive: 0, neutral: 0, mixed: 0, negative: 0 };
  const total = summary?.kpis?.total_signals ?? 0;
  const analysed = dist.positive + dist.neutral + dist.mixed + dist.negative;
  const unanalysed = Math.max(0, total - analysed);
  const pct = (n: number, of: number) => (of > 0 ? (n / of) * 100 : 0);
  const fmt = (n: number) => n.toLocaleString(intlLocale());

  // Hottest issues: most records first, then fastest growth
  const issues = [...(issuesQuery.data?.data ?? [])]
    .filter((n) => n.signalCount > 0)
    .sort((a, b) => b.signalCount - a.signalCount || (parseFloat(b.velocity) || 0) - (parseFloat(a.velocity) || 0))
    .slice(0, 5);

  // What to do: open alerts by severity, then recommendations
  const openAlerts = [...((alertsQuery.data?.data ?? []) as AlertRow[])]
    .sort((a, b) => (SEVERITY_RANK[a.severity ?? "info"] ?? 9) - (SEVERITY_RANK[b.severity ?? "info"] ?? 9) || +new Date(alertTime(b) ?? 0) - +new Date(alertTime(a) ?? 0))
    .slice(0, 3);
  const recommendations = [...(recsQuery.data?.recommendations ?? [])].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)).slice(0, 2);
  const openAlertTotal = alertsQuery.data?.pagination?.total ?? openAlerts.length;

  // Sources
  const platforms = summary?.platform_distribution ?? [];
  const platformTotal = platforms.reduce((sum, p) => sum + p.count, 0);
  const missingSocial = SOCIAL_PLATFORMS.filter((key) => !platforms.some((p) => p.platform === key || (key === "twitter" && p.platform === "x")));
  const publishers = summary?.top_publishers ?? [];
  const platformName = (key: string) => (key === "news" ? L("Online News", "Berita Online") : PLATFORM_NAMES[key] ?? key);

  // GEO: the latest score per assistant; legacy runs map onto the assistant they used
  const geoByKey = new Map((geoQuery.data?.engine_breakdown ?? []).filter((e) => e.engineKey).map((e) => [e.engineKey as string, e]));
  const engineStatus = new Map((geoQuery.data?.engines ?? []).map((e) => [e.key, e]));
  const tested = GEO_ENGINES.filter((e) => geoByKey.has(e.key));
  const geoAverage = tested.length ? Math.round(tested.reduce((sum, e) => sum + (geoByKey.get(e.key)?.visibilityScore ?? 0), 0) / tested.length) : null;
  const geoLastChecked = [...geoByKey.values()].map((e) => e.lastChecked).filter(Boolean).sort().at(-1) ?? null;
  const anyConnected = [...engineStatus.values()].some((e) => e.configured);

  const liveError = !isDemoSession && summaryQuery.isError ? (summaryQuery.error as { status?: number } | null) : null;
  const neverCollected = !isDemoSession && pipelineQuery.isSuccess && !lastDataAt && total === 0;
  const periodWord = { "24h": L("24 hours", "24 jam"), "7d": L("7 days", "7 hari"), "30d": L("30 days", "30 hari") };
  const periodButton = { "24h": L("24 Hours", "24 Jam"), "7d": L("7 Days", "7 Hari"), "30d": L("30 Days", "30 Hari") };

  const showHero = !neverCollected && Boolean(summary?.keyword_breakdown?.length || workspaceQuery.data?.brandName);

  return (
    <div className="space-y-6 pb-10">
      {isDemoSession ? <DemoBanner /> : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{L("Overview", "Ringkasan")}</h1>
          {lastDataAt && !showHero ? <p className="mt-1 text-[13px] font-medium text-[#5A6478]">{L("Last data", "Data terakhir")}: <b className="font-black text-[#101334]">{timeAgo(lastDataAt)}</b></p> : null}
        </div>
        <div role="group" aria-label={L("Period", "Periode")} className="flex rounded-full bg-white p-1 border-[1.5px] border-[#101334] shadow-[0_2px_0_#101334]">
          {(["24h", "7d", "30d"] as DateRangeKey[]).map((key) => (
            <button key={key} type="button" onClick={() => setPeriod(key)} aria-pressed={period === key} className={cn("rounded-full px-4 py-2 text-[12.5px] font-bold transition", period === key ? "bg-[#101334] text-white" : "text-[#5A6478] hover:text-[#101334]")}>
              {periodButton[key]}
            </button>
          ))}
        </div>
      </header>

      {/* The brand, a verdict with the numbers behind it, and every active keyword, each opening its records. */}
      {showHero ? (
        <OverviewHero
          brandName={workspaceQuery.data?.brandName || L("Your brand", "Brand Anda")}
          logoUrl={workspaceQuery.data?.logoUrl}
          keywords={summary?.keyword_breakdown ?? []}
          total={total}
          negativeShare={Math.round(pct(dist.negative, analysed))}
          openAlerts={openAlertTotal}
          criticalAlerts={((alertsQuery.data?.data ?? []) as AlertRow[]).filter((a) => a.severity === "critical").length}
          hours={hours}
          periodLabel={periodWord[period]}
          lastDataLabel={lastDataAt ? timeAgo(lastDataAt) : null}
        />
      ) : null}

      {liveError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-transparent bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          <span>{liveError.status === 401 ? L("Session expired. Sign in again.", "Sesi berakhir. Silakan masuk lagi.") : liveError.status === 403 ? L("No access to this workspace.", "Tidak punya akses ke workspace ini.") : L("Data could not be loaded.", "Data gagal dimuat.")}</span>
          <button type="button" onClick={() => void summaryQuery.refetch()} className="rounded-[6px] border border-[#E6EAF2] bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100">{L("Retry", "Coba lagi")}</button>
        </div>
      ) : null}

      {neverCollected ? (
        <FirstRun />      ) : (
        <>
          {useCase === "cve" ? <CveProvinceSection days={PERIOD_DAYS[period] as 1 | 7 | 30} hours={hours} /> : null}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="flex flex-col" title={L("Overall Sentiment", "Sentimen Keseluruhan")} link={{ href: monitoringHref({ hours }), label: L("See All Data", "Lihat Semua Data") }}>
              {summaryQuery.isLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : total === 0 ? (
                <Empty>
                  {L(`No new data in ${periodWord[period]}.`, `Belum ada data baru dalam ${periodWord[period]}.`)}
                  {period !== "30d" ? <> <button type="button" onClick={() => setPeriod("30d")} className="font-black text-[#3B52F5] hover:underline">{L("Show 30 Days", "Lihat 30 Hari")}</button></> : null}
                </Empty>
              ) : (
                <>
                  {/* The verdict first: all keywords together, positive minus negative over analysed records. */}
                  {(() => {
                    const net = analysed > 0 ? Math.round(((dist.positive - dist.negative) / analysed) * 100) : 0;
                    const verdict = analysed === 0
                      ? { text: L("Being Analysed", "Sedang Dianalisis"), cls: "text-[#3B52F5]" }
                      : net <= -15
                      ? { text: L("Negative", "Negatif"), cls: "text-[#B42318]" }
                      : net <= -5
                      ? { text: L("Leaning Negative", "Cenderung Negatif"), cls: "text-[#C2410C]" }
                      : net >= 15
                        ? { text: L("Positive", "Positif"), cls: "text-[#047857]" }
                        : net >= 5
                          ? { text: L("Leaning Positive", "Cenderung Positif"), cls: "text-[#047857]" }
                          : { text: L("Balanced", "Seimbang"), cls: "text-[#31406B]" };
                    // Said in words instead of a "net points" score: how many were negative, how many positive, and
                    // which side is ahead by how much.
                    const gap = Math.abs(dist.negative - dist.positive);
                    const lead = dist.negative > dist.positive
                      ? <>{L("Negative leads by ", "Negatif unggul ")}<b className="text-[#B42318]">{fmt(gap)}</b>.</>
                      : dist.positive > dist.negative
                        ? <>{L("Positive leads by ", "Positif unggul ")}<b className="text-[#047857]">{fmt(gap)}</b>.</>
                        : L("Positive and negative are even.", "Positif dan negatif seimbang.");
                    return (
                      <div className="mb-5">
                        <p className={cn("text-[34px] font-black leading-none tracking-[-0.03em]", verdict.cls)}>{verdict.text}</p>
                        <p className="mt-2.5 text-[15px] font-medium leading-relaxed text-[#31406B]">
                          <b className="text-[#B42318]">{fmt(dist.negative)} {L("negative", "negatif")}</b>
                          {L(" vs ", " vs ")}
                          <b className="text-[#047857]">{fmt(dist.positive)} {L("positive", "positif")}</b>
                          {L(` out of ${fmt(total)} mentions. `, ` dari ${fmt(total)} percakapan. `)}
                          {analysed > 0 ? lead : null}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="space-y-2">
                    {([
                      ["positive", L("Positive", "Positif"), "#10B981"],
                      ["neutral", L("Neutral", "Netral"), "#94A3B8"],
                      ["mixed", L("Mixed", "Campuran"), "#F59E0B"],
                      ["negative", L("Negative", "Negatif"), "#EF4444"],
                    ] as const).map(([key, label, color]) => (
                      <Bar key={key} label={label} value={fmt(dist[key])} right={`${pct(dist[key], analysed).toFixed(0)}%`} share={pct(dist[key], analysed)} color={color} href={monitoringHref({ hours, sentiment: key })} />
                    ))}
                  </div>
                  {unanalysed > 0 ? (
                    <Link href={monitoringHref({ hours, analysis: "pending" })} className="mt-3 inline-block text-[12px] font-bold text-[#3B52F5] hover:underline">
                      {L(`${fmt(unanalysed)} Not Analysed Yet →`, `${fmt(unanalysed)} Belum Dianalisis →`)}
                    </Link>
                  ) : null}
                  {/* Day-by-day split for the last week; fills the card to the height of the to-do list beside it. */}
                  {summary?.sentiment_trend?.some((d) => d.total > 0) ? (
                    <div className="mt-auto pt-6">
                      <p className="mb-2 text-[14px] font-black text-[#101334]">{L("Last 7 Days", "7 Hari Terakhir")}</p>
                      <SentimentTrendChart
                        days={summary.sentiment_trend}
                        locale={intlLocale()}
                        labels={{ positive: L("Positive", "Positif"), neutral: L("Neutral", "Netral"), negative: L("Negative", "Negatif"), mixed: L("Mixed", "Campuran"), unanalyzed: L("Not analysed", "Belum dianalisis"), noSignals: L("No records", "Tidak ada data") }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </Card>

            <Card title={L("Decide Today", "Putuskan Hari Ini")} link={{ href: "/alerts", label: L(`${openAlertTotal} Active Alerts`, `${openAlertTotal} Peringatan Aktif`) }}>
              {alertsQuery.isLoading || recsQuery.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : openAlerts.length === 0 && recommendations.length === 0 ? (
                <Empty>{L("Nothing to handle right now.", "Tidak ada yang perlu ditangani saat ini.")}</Empty>
              ) : (
                <ol className="divide-y divide-[#E6EAF2]">
                  {openAlerts.map((alert) => (
                    <li key={alert.id}>
                      <Link href={`/alerts/${alert.id}`} className="-mx-2 flex items-center justify-between gap-4 rounded-[12px] px-2 py-3.5 transition hover:bg-[#F7F8FC]">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <Tag tone={levelTone(alert.severity ?? "low")}>{tLevel(`level.${["critical", "high", "medium", "low"].includes(alert.severity ?? "") ? alert.severity : "low"}`)}</Tag>
                            <span className="text-[10px] font-bold text-[#5A6478]">{timeAgo(alertTime(alert))}</span>
                          </span>
                          <span className="mt-1.5 block truncate text-[15px] font-black text-[#101334]">{alert.title}</span>
                          <AlertFacts alert={alert} />
                        </span>
                        <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#465FFF] px-4 text-[12.5px] font-bold text-white">{L("Handle", "Tangani")}</span>
                      </Link>
                    </li>
                  ))}
                  {recommendations.map((rec: IntelligenceRecommendation, index) => (
                    <li key={`${rec.action}-${index}`}>
                      <button type="button" onClick={() => setPlanOpen(true)} className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-[12px] px-2 py-3.5 text-left transition hover:bg-[#F7F8FC]">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <Tag tone={levelTone(rec.priority)}>{tLevel(`level.${rec.priority}`)}</Tag>
                            <span className="text-[10px] font-bold text-[#5A6478]">{codes.urgency(rec.urgency)}</span>
                          </span>
                          <span className="mt-1.5 block text-[15px] font-black text-[#101334]">{codes.action(rec.action)}</span>
                          {rec.observedIssue && (index === 0 || firstSentence(rec.observedIssue) !== firstSentence(recommendations[index - 1]?.observedIssue ?? "")) ? <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#53608C]">{firstSentence(rec.observedIssue)}</span> : null}
                        </span>
                        <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#EEF1FF] px-4 text-[12.5px] font-bold text-[#3B52F5]">{L("Create Action Plan", "Buat Rencana Aksi")}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
          <Card title={L("Top Issues", "Isu Teratas")} link={{ href: `/intelligence?days=${PERIOD_DAYS[period]}`, label: L("See All Issues", "Lihat Semua Isu") }}>
              {issuesQuery.isLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : issues.length === 0 ? (
                <Empty>{L(`No issues in ${periodWord[period]}.`, `Belum ada isu dalam ${periodWord[period]}.`)}</Empty>
              ) : (
                <ol className="divide-y divide-[#E6EAF2]">
                  {issues.map((issue: NarrativeRecord, index) => {
                    const tag = sentimentTag(issue.sentiment);
                    const velocity = issue.velocity === "new" ? L("new", "baru") : issue.velocity === "—" ? "" : issue.velocity;
                    return (
                      <li key={issue.id}>
                        <Link href={issueHref(issue.id, hours)} className="-mx-2 flex items-center gap-4 rounded-[12px] px-2 py-3 transition hover:bg-[#F7F8FC]">
                          <span className={cn("w-6 text-[20px] font-black tabular-nums", index === 0 ? "text-[#E5484D]" : "text-[#B8C0D6]")}>{index + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-black text-[#101334]">{issue.title}</span>
                            <span className="mt-0.5 flex items-center gap-2 text-[11px] font-bold">
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", tag.cls)}>{L(tag.en, tag.id)}</span>
                              {velocity ? <span className={velocity.startsWith("+") ? "text-[#B42318]" : "text-[#5A6478]"}>{velocity} {L("in 24h", "24 jam")}</span> : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[22px] font-black tabular-nums leading-none text-[#101334]">{fmt(issue.signalCount)}</span>
                            <span className="text-[11px] font-bold text-[#5A6478]">{L("Mentions", "Percakapan")}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
            {useCase === "cve" ? <CveCategoryCard days={PERIOD_DAYS[period] as 1 | 7 | 30} hours={hours} /> : (
            <Card title={L("Visibility in AI Answers", "Visibilitas di Jawaban AI")} link={{ href: "/visibility", label: L("See Details", "Lihat Detail") }}>
              {geoQuery.isLoading ? (
                <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[40px] font-black tabular-nums leading-none tracking-[-0.03em] text-[#101334]">{geoAverage ?? "—"}<span className="text-[15px] font-bold text-[#5A6478]">/100</span></p>
                      <p className="mt-1 text-[12px] font-bold text-[#5A6478]">{L("Average Score", "Skor Rata-rata")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => geoRun.mutate()}
                      disabled={geoRun.isPending || !anyConnected || isDemoSession}
                      title={!anyConnected ? L("Connect an AI API key first", "Hubungkan API key AI dulu") : undefined}
                      className="inline-flex h-10 items-center rounded-full bg-[#465FFF] px-5 text-[13px] font-bold text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {geoRun.isPending ? L("Testing…", "Menguji…") : L("Test Now", "Uji Sekarang")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {GEO_ENGINES.map((engine, index) => {
                      const result = geoByKey.get(engine.key);
                      const status = engineStatus.get(engine.key);
                      const value = result ? `${Math.round(result.visibilityScore)}/100` : status?.configured ? L("Not Tested", "Belum Diuji") : L("Not Connected", "Belum Terhubung");
                      return <Bar key={engine.key} label={<span className="flex items-center gap-2"><engine.Logo className="size-4" />{engine.name}</span>} value={value} share={result ? Math.min(100, Math.max(0, result.visibilityScore)) : 0} color={BAR_COLORS[index % BAR_COLORS.length]} href="/visibility" muted={!result} />;
                    })}
                  </div>
                  <p className="mt-3 text-[11px] font-semibold text-[#5A6478]">
                    {geoLastChecked ? `${L("Last test", "Uji terakhir")}: ${timeAgo(geoLastChecked)}. ` : ""}
                    {useCase === "gov"
                      ? L("Score = how often AI mentions the office.", "Skor = seberapa sering AI menyebut instansi.")
                      : L("Score = how often AI mentions the brand.", "Skor = seberapa sering AI menyebut brand.")}
                  </p>
                </>
              )}
            </Card>
            )}
          </div>

            {/* The demo brand is fictional, so news counts would all be zero there. */}
            {!isDemoSession && useCase === "brand" ? <CompetitorCard /> : null}

            <Card title={L("Sources", "Sumber Data")} link={{ href: "/workspace/sources", label: L("Manage Sources", "Kelola Sumber") }}>
            {summaryQuery.isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : platformTotal === 0 ? (
              <Empty>{L(`No data in ${periodWord[period]}.`, `Belum ada data dalam ${periodWord[period]}.`)}</Empty>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                <p className="mb-2 text-[14px] font-black text-[#101334]">{L("By Platform", "Per Platform")}</p>
                <div className="space-y-1">
                  {platforms.map((p, index) => (
                    <Bar key={p.platform} label={<span className="inline-flex items-center gap-2"><PlatformIcon platform={p.platform} className="size-4" />{platformName(p.platform)}</span>} value={fmt(p.count)} right={`${pct(p.count, platformTotal).toFixed(0)}%`} share={pct(p.count, platformTotal)} color={BAR_COLORS[index % BAR_COLORS.length]} href={monitoringHref({ hours, platform: p.platform })} />
                  ))}
                  {missingSocial.map((key) => (
                    <Bar key={key} label={<span className="inline-flex items-center gap-2 opacity-60"><PlatformIcon platform={key} className="size-4" />{PLATFORM_NAMES[key]}</span>} value={L("Not Connected", "Belum Terhubung")} share={0} color="#EEF1F7" href="/workspace/sources" muted />
                  ))}
                </div>
                </div>
                {publishers.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[14px] font-black text-[#101334]">{L("Top Media", "Media Teratas")}</p>
                    <ul className="divide-y divide-[#E6EAF2]">
                      {publishers.slice(0, 8).map((pub) => (
                        <li key={pub.publisher} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                          <span className="flex min-w-0 items-center gap-2">
                            <PlatformIcon platform={pub.platform} className="size-[18px]" />
                            <span className="min-w-0 truncate font-bold text-[#101334]">{pub.publisher}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                            {pub.negative > 0 ? <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-black text-[#B42318]">{pub.negative} Neg</span> : null}
                            <span className="w-6 text-right font-black text-[#101334]">{pub.count}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </>
      )}
      <CreateActionPlanModal open={planOpen} onOpenChange={setPlanOpen} />
    </div>
  );
}
