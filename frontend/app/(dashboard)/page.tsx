"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useL } from "@/lib/use-l";
import { intlLocale } from "@/store/useUiStore";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import {
  fetchDashboardSummaryStrict,
  getAlerts,
  getDashboardSummary,
  getDateRangeOptions,
  getNarratives,
  getVisibility,
  getVisibilitySummary,
  getWorkspaceSettings,
  type Alert,
  type DateRangeKey,
  type NarrativeRecord,
} from "@/lib/api-service";
import { getPipelineStatus, getRecommendations, timeAgo, type IntelligenceRecommendation } from "@/lib/intelligence-api";
import { useCodeLabels } from "@/components/intelligence/intelligence-panels";
import { SentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import { DemoBanner } from "@/components/ui/demo-banner";
import { issueHref, monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { Skeleton } from "@/components/ui/Skeleton";

// The overview answers three questions on one screen, for one period: how is the coverage leaning
// (sentiment counts), which issues are hottest, and what should be done now. Everything else has its own page.

const PERIOD_HOURS: Record<DateRangeKey, number> = { "24h": 24, "7d": 168, "30d": 720 };
const PERIOD_DAYS: Record<DateRangeKey, number> = { "24h": 1, "7d": 7, "30d": 30 };
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function Card({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-black text-[#101334]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] font-medium text-[#5A6478]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[10px] border border-dashed border-[#DDE3EF] bg-[#FBFCFF] px-4 py-6 text-center text-[12px] font-semibold text-[#5A6478]">{children}</p>;
}

function SentimentBar({ label, count, share, color, href, valueLabel }: { label: string; count: number; share: number; color: string; href: string; valueLabel?: string }) {
  return (
    <Link href={href} className="block rounded-[8px] px-1.5 py-1 -mx-1.5 transition hover:bg-[#F8FAFF]">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="font-bold text-[#101334]">{label}</span>
        <span className="tabular-nums font-black text-[#101334]">
          {valueLabel ?? (
            <>
              {count.toLocaleString(intlLocale())}
              <span className="ml-1.5 font-semibold text-[#5A6478]">{share.toFixed(0)}%</span>
            </>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EEF1F7]">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(share, count > 0 ? 2 : 0)}%`, backgroundColor: color }} />
      </div>
    </Link>
  );
}

const PLATFORM_NAMES: Record<string, string> = {
  news: "Berita online",
  twitter: "X (Twitter)",
  x: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  reddit: "Reddit",
};
const SOCIAL_PLATFORMS = ["twitter", "instagram", "facebook", "tiktok", "youtube"];
const PLATFORM_COLORS = ["#465FFF", "#8B5CFF", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];

// The alert list returns stored rows (snake_case); the detail endpoint returns camelCase.
type AlertRow = Alert & { created_at?: string; what_to_do?: string | null };
function alertTime(alert: AlertRow) {
  return alert.createdAt || alert.created_at || null;
}
function alertAdvice(alert: AlertRow) {
  return alert.whatToDo || alert.what_to_do || null;
}

function sentimentTone(value: string | null | undefined) {
  const v = String(value || "").toLowerCase();
  if (v.includes("neg")) return { cls: "bg-[#FDECEC] text-[#B42318]", en: "Negative", id: "Negatif" };
  if (v.includes("pos")) return { cls: "bg-[#E8F7EF] text-[#047857]", en: "Positive", id: "Positif" };
  if (v.includes("mix")) return { cls: "bg-[#FFF4E5] text-[#A04606]", en: "Mixed", id: "Campuran" };
  return { cls: "bg-[#EEF1F7] text-[#465170]", en: "Neutral", id: "Netral" };
}

function levelTone(level: string) {
  if (level === "critical") return "bg-[#B42318] text-white";
  if (level === "high") return "bg-[#FDECEC] text-[#B42318]";
  if (level === "medium") return "bg-[#FFF4E5] text-[#A04606]";
  return "bg-[#EEF1F7] text-[#465170]";
}

export default function DashboardPage() {
  const L = useL();
  const codes = useCodeLabels();
  const tLevel = useTranslations("IntelPanels");
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);
  const [period, setPeriod] = useState<DateRangeKey>("30d");
  const router = useRouter();

  // A workspace that has not finished onboarding goes there first.
  const workspaceQuery = useQuery({ queryKey: ["workspace-settings"], queryFn: () => getWorkspaceSettings(), staleTime: 60 * 1000, enabled: !isDemoSession });
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
  const alertsQuery = useQuery({ queryKey: ["overview-open-alerts"], queryFn: () => getAlerts({ status: "open", limit: 50 }), staleTime: 30 * 1000 });
  const geoQuery = useQuery({ queryKey: ["overview-geo-summary"], queryFn: () => getVisibilitySummary(), staleTime: 5 * 60 * 1000 });
  const geoPromptsQuery = useQuery({ queryKey: ["overview-geo-prompts"], queryFn: () => getVisibility(), staleTime: 5 * 60 * 1000 });
  const recsQuery = useQuery({ queryKey: ["overview-recommendations", period], queryFn: () => getRecommendations(PERIOD_HOURS[period]), staleTime: 60 * 1000, retry: 1 });

  const summary = summaryQuery.data;
  const pipeline = pipelineQuery.data;
  const lastDataAt = pipeline?.scheduler?.lastSuccessfulIngestionForWorkspace ?? pipeline?.ingestion?.lastRawDocumentAt ?? null;
  const periodLabel = { "24h": L("the last 24 hours", "24 jam terakhir"), "7d": L("the last 7 days", "7 hari terakhir"), "30d": L("the last 30 days", "30 hari terakhir") }[period];

  // ── Sentiment ────────────────────────────────────────────────────────────
  const dist = summary?.sentiment_distribution ?? { positive: 0, neutral: 0, mixed: 0, negative: 0 };
  const total = summary?.kpis?.total_signals ?? 0;
  const analysed = dist.positive + dist.neutral + dist.mixed + dist.negative;
  const unanalysed = Math.max(0, total - analysed);
  const share = (n: number) => (analysed > 0 ? (n / analysed) * 100 : 0);
  const negativeShare = share(dist.negative);

  // ── Hottest issues: most signals first, then fastest growth ─────────────
  const issues = [...(issuesQuery.data?.data ?? [])]
    .filter((n) => n.signalCount > 0)
    .sort((a, b) => b.signalCount - a.signalCount || (parseFloat(b.velocity) || 0) - (parseFloat(a.velocity) || 0))
    .slice(0, 5);

  // ── What to do: open alerts by severity, then the recommendations ───────
  const openAlerts = [...(alertsQuery.data?.data ?? [])]
    .sort((a, b) => (SEVERITY_RANK[a.severity ?? "info"] ?? 9) - (SEVERITY_RANK[b.severity ?? "info"] ?? 9) || +new Date(alertTime(b) ?? 0) - +new Date(alertTime(a) ?? 0))
    .slice(0, 3);
  const recommendations = [...(recsQuery.data?.recommendations ?? [])]
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
    .slice(0, 3);
  const openAlertTotal = alertsQuery.data?.pagination?.total ?? openAlerts.length;

  const hours = PERIOD_HOURS[period] as MonitoringPeriod;

  // ── Where the records come from ─────────────────────────────────────────
  const platforms = summary?.platform_distribution ?? [];
  const platformTotal = platforms.reduce((sum, p) => sum + p.count, 0);
  const missingSocial = SOCIAL_PLATFORMS.filter((key) => !platforms.some((p) => p.platform === key || (key === "twitter" && p.platform === "x")));
  const publishers = summary?.top_publishers ?? [];
  const platformName = (key: string) => (key === "news" ? L("Online news", "Berita online") : PLATFORM_NAMES[key] ?? key);

  // ── GEO: how AI answers describe the brand ──────────────────────────────
  const geo = geoQuery.data?.kpis;
  const geoEngines = geoQuery.data?.engine_breakdown ?? [];
  const geoLastChecked = geoEngines.map((e) => e.lastChecked).filter(Boolean).sort().at(-1) ?? null;
  const geoPrompt = geoPromptsQuery.data?.prompts?.[0];
  const hasGeo = Boolean(geo && geo.total_analyses > 0);

  const liveError = !isDemoSession && summaryQuery.isError ? (summaryQuery.error as { status?: number } | null) : null;
  const neverCollected = !isDemoSession && pipelineQuery.isSuccess && !lastDataAt && total === 0;
  const dateStr = new Date().toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5 pb-6">
      {isDemoSession ? <DemoBanner /> : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{L("Overview", "Ringkasan")}</h1>
          <p className="mt-1 text-[13px] font-medium text-[#5A6478]">
            {dateStr}
            {lastDataAt ? <> · {L("data last collected", "data terakhir masuk")} <b className="font-black text-[#101334]">{timeAgo(lastDataAt)}</b></> : null}
          </p>
        </div>
        <div role="group" aria-label={L("Period", "Periode")} className="flex rounded-[10px] border border-[#DDE3EF] bg-white p-1">
          {(["24h", "7d", "30d"] as DateRangeKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              aria-pressed={period === key}
              className={cn("rounded-[7px] px-3.5 py-1.5 text-[12px] font-black transition", period === key ? "bg-[#465FFF] text-white" : "text-[#5A6478] hover:text-[#101334]")}
            >
              {{ "24h": L("24 hours", "24 jam"), "7d": L("7 days", "7 hari"), "30d": L("30 days", "30 hari") }[key]}
            </button>
          ))}
        </div>
      </header>

      {liveError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          <span>
            {liveError.status === 401
              ? L("Your session has expired. Sign in again to load the data.", "Sesi Anda berakhir. Masuk lagi untuk memuat data.")
              : liveError.status === 403
                ? L("You don't have access to this workspace's data.", "Anda tidak punya akses ke data workspace ini.")
                : L("The data could not be loaded. No estimates are shown in its place.", "Data gagal dimuat. Tidak ada angka perkiraan yang ditampilkan sebagai gantinya.")}
          </span>
          <button type="button" onClick={() => void summaryQuery.refetch()} className="rounded-[6px] border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100">
            {L("Retry", "Coba lagi")}
          </button>
        </div>
      ) : null}

      {neverCollected ? (
        // A new workspace has no data yet: say what is needed instead of showing empty panels.
        <Card title={L("Set up monitoring for this workspace", "Siapkan pemantauan untuk workspace ini")} subtitle={L("Nothing has been collected yet, so there is nothing to summarise.", "Belum ada data yang terkumpul, jadi belum ada yang bisa diringkas.")}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, title: L("Add monitoring keywords", "Tambah kata kunci pemantauan"), body: L("Company, brand, product or executive names to follow.", "Nama perusahaan, brand, produk, atau eksekutif yang ingin dipantau."), href: "/workspace/settings#keywords", cta: L("Open keywords", "Buka kata kunci") },
              { n: 2, title: L("Collect the first data", "Kumpulkan data pertama"), body: L("Run monitoring now; after that it runs every day at 07:00 WIB.", "Jalankan pemantauan sekarang; setelah itu berjalan otomatis setiap hari pukul 07.00 WIB."), href: "/workspace/settings#keywords", cta: L("Run monitoring", "Jalankan pemantauan") },
              { n: 3, title: L("Review sentiment and issues", "Tinjau sentimen dan isu"), body: L("They appear here once articles are analysed.", "Akan muncul di sini setelah artikel dianalisis."), href: "/signals", cta: L("Open Monitoring", "Buka Pemantauan") },
            ].map((step) => (
              <li key={step.n} className="rounded-[10px] border border-slate-100 bg-[#FBFCFF] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A6478]">{L("Step", "Langkah")} {step.n}</p>
                <p className="mt-1 text-[13px] font-semibold text-[#101334]">{step.title}</p>
                <p className="mt-0.5 text-[12px] text-[#5A6478]">{step.body}</p>
                <Link href={step.href} className="mt-2 inline-flex text-[12px] font-semibold text-[#3B52F5] hover:underline">{step.cta}</Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* 1. Sentiment */}
            <Card
              title={L("Sentiment", "Sentimen")}
              subtitle={L(`Analysed records from ${periodLabel}`, `Data yang sudah dianalisis, ${periodLabel}`)}
              action={<Link href={monitoringHref({ hours })} className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{L("All signals", "Semua sinyal")}</Link>}
            >
              {summaryQuery.isLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : total === 0 ? (
                <EmptyNote>
                  {L(`No new records in ${periodLabel}.`, `Belum ada data baru dalam ${periodLabel}.`)}
                  {lastDataAt ? ` ${L("Data last collected", "Data terakhir masuk")} ${timeAgo(lastDataAt)}.` : ""}
                  {period !== "30d" ? <> <button type="button" onClick={() => setPeriod("30d")} className="font-black text-[#3B52F5] hover:underline">{L("Show 30 days", "Lihat 30 hari")}</button></> : null}
                </EmptyNote>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <div className="rounded-[10px] bg-[#F8FAFF] p-3">
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("Total records", "Total data")}</p>
                      <p className="mt-1 text-[24px] font-black tabular-nums leading-none text-[#101334]">{total.toLocaleString(intlLocale())}</p>
                    </div>
                    <div className="rounded-[10px] bg-[#F8FAFF] p-3">
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("Analysed", "Dianalisis")}</p>
                      <p className="mt-1 text-[24px] font-black tabular-nums leading-none text-[#101334]">{analysed.toLocaleString(intlLocale())}</p>
                    </div>
                    <div className={cn("rounded-[10px] p-3", negativeShare >= 30 ? "bg-[#FDECEC]" : "bg-[#F8FAFF]")}>
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("Negative share", "Porsi negatif")}</p>
                      <p className={cn("mt-1 text-[24px] font-black tabular-nums leading-none", negativeShare >= 30 ? "text-[#B42318]" : "text-[#101334]")}>{analysed > 0 ? `${negativeShare.toFixed(0)}%` : "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <SentimentBar label={L("Positive", "Positif")} count={dist.positive} share={share(dist.positive)} color="#10B981" href={monitoringHref({ hours, sentiment: "positive" })} />
                    <SentimentBar label={L("Neutral", "Netral")} count={dist.neutral} share={share(dist.neutral)} color="#94A3B8" href={monitoringHref({ hours, sentiment: "neutral" })} />
                    <SentimentBar label={L("Mixed", "Campuran")} count={dist.mixed} share={share(dist.mixed)} color="#F59E0B" href={monitoringHref({ hours, sentiment: "mixed" })} />
                    <SentimentBar label={L("Negative", "Negatif")} count={dist.negative} share={share(dist.negative)} color="#EF4444" href={monitoringHref({ hours, sentiment: "negative" })} />
                  </div>
                  {unanalysed > 0 ? (
                    <Link href={monitoringHref({ hours, analysis: "pending" })} className="mt-3 block text-[11px] font-semibold text-[#5A6478] hover:text-[#3B52F5]">
                      {L(`${unanalysed.toLocaleString("en-US")} record(s) not analysed yet are not counted in the bars.`, `${unanalysed.toLocaleString("id-ID")} data belum dianalisis dan tidak dihitung di batang di atas.`)}
                    </Link>
                  ) : null}
                  {summary?.sentiment_trend?.some((d) => d.total > 0) ? (
                    <div className="mt-5 border-t border-[#EEF1F7] pt-4">
                      <p className="mb-2 text-[12px] font-black text-[#101334]">{L("Last 7 days, per day", "7 hari terakhir, per hari")}</p>
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

            {/* 2. What to do now */}
            <Card
              title={L("What to do now", "Yang harus dilakukan")}
              subtitle={L("Open alerts first, then Narriv's suggestions. Nothing is sent automatically.", "Peringatan terbuka dulu, lalu saran Narriv. Tidak ada yang dijalankan otomatis.")}
              action={<Link href="/alerts" className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{L(`${openAlertTotal} open alerts`, `${openAlertTotal} peringatan terbuka`)}</Link>}
            >
              {alertsQuery.isLoading || recsQuery.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : openAlerts.length === 0 && recommendations.length === 0 ? (
                <EmptyNote>{L("Nothing needs attention right now. Narriv keeps monitoring.", "Tidak ada yang perlu ditindaklanjuti saat ini. Narriv tetap memantau.")}</EmptyNote>
              ) : (
                <ol className="space-y-2.5">
                  {openAlerts.map((alert: Alert) => (
                    <li key={alert.id}>
                      <Link href={`/alerts/${alert.id}`} className="block rounded-[10px] border border-[#EEF1F7] p-3 transition hover:border-[#465FFF]/40 hover:bg-[#FBFCFF]">
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-[5px] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide", levelTone(alert.severity ?? "low"))}>{tLevel(`level.${["critical", "high", "medium", "low"].includes(alert.severity ?? "") ? alert.severity : "low"}`)}</span>
                          <span className="text-[10px] font-bold text-[#5A6478]">{L("Alert", "Peringatan")} · {timeAgo(alertTime(alert))}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] font-black leading-snug text-[#101334]">{alert.title}</p>
                        {alertAdvice(alert) ? <p className="mt-1 line-clamp-2 text-[12px] font-medium text-[#53608C]">{alertAdvice(alert)}</p> : null}
                      </Link>
                    </li>
                  ))}
                  {recommendations.map((rec: IntelligenceRecommendation, index) => (
                    <li key={`${rec.action}-${index}`}>
                      <Link href="/action-center" className="block rounded-[10px] border border-[#EEF1F7] p-3 transition hover:border-[#465FFF]/40 hover:bg-[#FBFCFF]">
                        <div className="flex items-center gap-2">
                          <span className={cn("rounded-[5px] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide", levelTone(rec.priority))}>{tLevel(`level.${rec.priority}`)}</span>
                          <span className="text-[10px] font-bold text-[#5A6478]">{L("Suggestion", "Saran")} · {codes.urgency(rec.urgency)}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] font-black leading-snug text-[#101334]">{codes.action(rec.action)}</p>
                        <p className="mt-1 line-clamp-2 text-[12px] font-medium text-[#53608C]">{rec.observedIssue ? `${rec.observedIssue} ` : ""}{rec.reason}</p>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {/* 3. Hottest issues */}
          <Card
            title={L("Hottest issues", "Isu paling panas")}
            subtitle={L(`Narratives with the most records in ${periodLabel}`, `Narasi dengan data terbanyak, ${periodLabel}`)}
            action={<Link href={`/intelligence?days=${PERIOD_DAYS[period]}`} className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{L("All issues", "Semua isu")}</Link>}
          >
            {issuesQuery.isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : issues.length === 0 ? (
              <EmptyNote>{L(`No issues have formed in ${periodLabel} yet.`, `Belum ada isu yang terbentuk dalam ${periodLabel}.`)}</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-[#EEF1F7] text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                      <th className="w-8 py-2 pr-2">#</th>
                      <th className="py-2 pr-3">{L("Issue", "Isu")}</th>
                      <th className="py-2 pr-3 text-right">{L("Records", "Data")}</th>
                      <th className="py-2 pr-3">{L("Sentiment", "Sentimen")}</th>
                      <th className="py-2 text-right">{L("Last 24h", "24 jam terakhir")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue: NarrativeRecord, index) => {
                      const tone = sentimentTone(issue.sentiment);
                      const velocity = issue.velocity === "new" ? L("new", "baru") : issue.velocity;
                      return (
                        <tr key={issue.id} className="border-b border-[#F3F5FA] last:border-0">
                          <td className="py-3 pr-2 text-[13px] font-black text-[#5A6478]">{index + 1}</td>
                          <td className="py-3 pr-3">
                            <Link href={issueHref(issue.id, hours)} className="text-[13px] font-black text-[#101334] hover:text-[#3B52F5]">{issue.title}</Link>
                          </td>
                          <td className="py-3 pr-3 text-right"><Link href={monitoringHref({ hours, narrative: issue.id })} className="text-[13px] font-black tabular-nums text-[#101334] hover:text-[#3B52F5]">{issue.signalCount.toLocaleString(intlLocale())}</Link></td>
                          <td className="py-3 pr-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", tone.cls)}>{L(tone.en, tone.id)}</span></td>
                          <td className={cn("py-3 text-right text-[12px] font-black tabular-nums", velocity.startsWith("+") ? "text-[#B42318]" : "text-[#5A6478]")}>{velocity}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            {/* 4. Where the records come from */}
            <Card
              title={L("Sources", "Sumber data")}
              subtitle={L(`Platforms and publishers behind the records, ${periodLabel}`, `Platform dan penerbit asal data, ${periodLabel}`)}
              action={<Link href="/workspace/sources" className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{L("Manage sources", "Kelola sumber")}</Link>}
            >
              {summaryQuery.isLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : platformTotal === 0 ? (
                <EmptyNote>{L(`No records in ${periodLabel}.`, `Belum ada data dalam ${periodLabel}.`)}</EmptyNote>
              ) : (
                <>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{L("By platform", "Per platform")}</p>
                  <div className="space-y-2">
                    {platforms.map((p, index) => (
                      <SentimentBar key={p.platform} label={platformName(p.platform)} count={p.count} share={(p.count / platformTotal) * 100} color={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} href={monitoringHref({ hours, platform: p.platform })} />
                    ))}
                  </div>
                  {missingSocial.length > 0 ? (
                    <Link href="/workspace/sources" className="mt-3 block rounded-[10px] border border-[#FDE2B5] bg-[#FFF8EC] px-3 py-2.5 text-[12px] font-semibold text-[#8A4B00] transition hover:border-[#F59E0B]">
                      {L("Not collected yet:", "Belum dikumpulkan:")} <b className="font-black">{missingSocial.map((key) => PLATFORM_NAMES[key]).join(", ")}</b>.{" "}
                      {L("Connect them in Data Sources so social conversation is counted too.", "Hubungkan di Sumber Data supaya percakapan media sosial ikut terhitung.")}
                    </Link>
                  ) : null}
                  {publishers.length > 0 ? (
                    <>
                      <p className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{L("Top publishers", "Penerbit teratas")}</p>
                      <ul className="divide-y divide-[#F3F5FA]">
                        {publishers.map((pub) => (
                          <li key={pub.publisher} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                            <span className="min-w-0 truncate font-bold text-[#101334]">{pub.publisher}</span>
                            <span className="flex shrink-0 items-center gap-2 tabular-nums">
                              {pub.negative > 0 ? <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-black text-[#B42318]">{pub.negative} {L("neg", "neg")}</span> : null}
                              {pub.positive > 0 ? <span className="rounded-full bg-[#E8F7EF] px-2 py-0.5 text-[10px] font-black text-[#047857]">{pub.positive} {L("pos", "pos")}</span> : null}
                              <span className="w-8 text-right font-black text-[#101334]">{pub.count}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              )}
            </Card>

            {/* 5. GEO: the brand in AI answers */}
            <Card
              title={L("AI visibility (GEO)", "Visibilitas di AI (GEO)")}
              subtitle={L("How AI answers mention the brand for the monitored keywords", "Seberapa sering jawaban AI menyebut brand untuk kata kunci yang dipantau")}
              action={<Link href="/visibility" className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{L("Open AI Visibility", "Buka Visibilitas AI")}</Link>}
            >
              {geoQuery.isLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !hasGeo || !geo ? (
                <EmptyNote>
                  {L("No AI answer test has been run for this workspace yet.", "Belum ada uji jawaban AI untuk workspace ini.")}{" "}
                  <Link href="/visibility" className="font-black text-[#3B52F5] hover:underline">{L("Run the first test", "Jalankan uji pertama")}</Link>
                </EmptyNote>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Link href="/visibility" className="rounded-[10px] bg-[#F8FAFF] p-3 transition hover:bg-[#EEF2FF]">
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("GEO score", "Skor GEO")}</p>
                      <p className="mt-1 text-[24px] font-black tabular-nums leading-none text-[#101334]">{Math.round(geo.avg_visibility_score)}<span className="text-[13px] font-bold text-[#5A6478]">/100</span></p>
                    </Link>
                    <Link href="/visibility" className="rounded-[10px] bg-[#F8FAFF] p-3 transition hover:bg-[#EEF2FF]">
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("Brand mentioned", "Brand disebut")}</p>
                      <p className="mt-1 text-[24px] font-black tabular-nums leading-none text-[#101334]">{Math.round(geo.avg_brand_presence_rate)}%</p>
                    </Link>
                    <Link href="/visibility" className="rounded-[10px] bg-[#F8FAFF] p-3 transition hover:bg-[#EEF2FF]">
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("Competitors mentioned", "Kompetitor disebut")}</p>
                      <p className="mt-1 text-[24px] font-black tabular-nums leading-none text-[#101334]">{Math.round(geo.avg_competitor_mention_rate)}%</p>
                    </Link>
                  </div>
                  {geoEngines.length > 0 ? (
                    <>
                      <p className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{L("Per AI model", "Per model AI")}</p>
                      <div className="space-y-2">
                        {geoEngines.map((engine, index) => (
                          <SentimentBar
                            key={engine.engineName}
                            label={engine.engineName.replace(/-simulated$/, "").replace(/^gpt/, "GPT").replace(/^chatgpt$/, "ChatGPT")}
                            count={Math.round(engine.visibilityScore)}
                            share={Math.min(100, Math.max(0, engine.visibilityScore))}
                            color={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                            href="/visibility"
                            valueLabel={`${Math.round(engine.visibilityScore)}/100`}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                  {geoPrompt ? (
                    <Link href="/visibility" className="mt-4 block rounded-[10px] border border-[#EEF1F7] p-3 transition hover:border-[#465FFF]/40 hover:bg-[#FBFCFF]">
                      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{L("Latest prompt tested", "Prompt terakhir yang diuji")}</p>
                      <p className="mt-1 text-[12px] font-bold leading-snug text-[#101334]">&ldquo;{geoPrompt.prompt}&rdquo;</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#53608C]">
                        {geoPrompt.brand === "mentioned" ? L("The brand is mentioned.", "Brand disebut.") : L("The brand is not mentioned.", "Brand tidak disebut.")}{" "}
                        {geoPrompt.competitor && geoPrompt.competitor !== "not mentioned" ? L(`Competitors: ${geoPrompt.competitor}.`, `Kompetitor: ${geoPrompt.competitor}.`) : L("No competitor mentioned.", "Tidak ada kompetitor yang disebut.")}
                      </p>
                    </Link>
                  ) : null}
                  <p className="mt-3 text-[11px] font-semibold text-[#5A6478]">
                    {L(`${geo.total_analyses} test(s) across ${geo.engines_tracked} model(s)`, `${geo.total_analyses} uji di ${geo.engines_tracked} model`)}
                    {geoLastChecked ? ` · ${L("last tested", "terakhir diuji")} ${timeAgo(geoLastChecked)}` : ""}.{" "}
                    {L("Measured by asking AI models the test prompts, not by watching ChatGPT or Gemini directly.", "Diukur dengan menanyakan prompt uji ke model AI, bukan memantau ChatGPT atau Gemini secara langsung.")}
                  </p>
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
