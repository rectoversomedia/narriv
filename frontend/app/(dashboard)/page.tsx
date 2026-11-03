"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  getVisibilitySummary,
  getWorkspaceSettings,
  runGeoAllEngines,
  type Alert,
  type DateRangeKey,
  type NarrativeRecord,
} from "@/lib/api-service";
import { getPipelineStatus, getRecommendations, timeAgo, type IntelligenceRecommendation } from "@/lib/intelligence-api";
import { useCodeLabels } from "@/components/intelligence/intelligence-panels";
import { DemoBanner } from "@/components/ui/demo-banner";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/toast";
import { issueHref, monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";

// One screen, one period, five answers: how coverage leans, what to do, which issues are hot, where the
// records come from, and how AI assistants talk about the brand. Short labels; every number opens its records.

const PERIOD_HOURS: Record<DateRangeKey, number> = { "24h": 24, "7d": 168, "30d": 720 };
const PERIOD_DAYS: Record<DateRangeKey, number> = { "24h": 1, "7d": 7, "30d": 30 };
const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const GEO_ENGINES = [
  { key: "chatgpt", name: "ChatGPT" },
  { key: "gemini", name: "Gemini" },
  { key: "claude", name: "Claude" },
  { key: "perplexity", name: "Perplexity" },
  { key: "deepseek", name: "DeepSeek" },
];
const PLATFORM_NAMES: Record<string, string> = { twitter: "X", x: "X", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", reddit: "Reddit" };
const SOCIAL_PLATFORMS = ["twitter", "instagram", "facebook", "tiktok", "youtube"];
const BAR_COLORS = ["#465FFF", "#8B5CFF", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9"];

// The alert list returns stored rows (snake_case); the detail endpoint returns camelCase.
type AlertRow = Alert & { created_at?: string; what_to_do?: string | null };
const alertTime = (a: AlertRow) => a.createdAt || a.created_at || null;

function Card({ title, link, children, className }: { title: string; link?: { href: string; label: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black text-[#101334]">{title}</h2>
        {link ? <Link href={link.href} className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{link.label} →</Link> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[10px] border border-dashed border-[#DDE3EF] bg-[#FBFCFF] px-4 py-6 text-center text-[12px] font-semibold text-[#5A6478]">{children}</div>;
}

function Stat({ label, value, tone = "plain", href }: { label: string; value: string; tone?: "plain" | "bad"; href?: string }) {
  const body = (
    <>
      <p className="text-[11px] font-bold text-[#5A6478]">{label}</p>
      <p className={cn("mt-1 text-[24px] font-black tabular-nums leading-none", tone === "bad" ? "text-[#B42318]" : "text-[#101334]")}>{value}</p>
    </>
  );
  const cls = cn("rounded-[10px] p-3", tone === "bad" ? "bg-[#FDECEC]" : "bg-[#F8FAFF]", href && "transition hover:bg-[#EEF2FF]");
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Bar({ label, value, share, color, href, muted }: { label: string; value: string; share: number; color: string; href?: string; muted?: boolean }) {
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className={cn("font-bold", muted ? "text-[#8A93AD]" : "text-[#101334]")}>{label}</span>
        <span className={cn("tabular-nums font-black", muted ? "text-[#8A93AD]" : "text-[#101334]")}>{value}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EEF1F7]">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${share}%`, backgroundColor: color }} />
      </div>
    </>
  );
  return href ? <Link href={href} className="-mx-1.5 block rounded-[8px] px-1.5 py-1 transition hover:bg-[#F8FAFF]">{body}</Link> : <div className="py-1">{body}</div>;
}

function Tag({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn("rounded-[5px] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide", tone)}>{children}</span>;
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

export default function DashboardPage() {
  const L = useL();
  const codes = useCodeLabels();
  const tLevel = useTranslations("IntelPanels");
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);
  const [period, setPeriod] = useState<DateRangeKey>("30d");
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
  const alertsQuery = useQuery({ queryKey: ["overview-open-alerts"], queryFn: () => getAlerts({ status: "open", limit: 50 }), staleTime: 30 * 1000 });
  const recsQuery = useQuery({ queryKey: ["overview-recommendations", period], queryFn: () => getRecommendations(PERIOD_HOURS[period]), staleTime: 60 * 1000, retry: 1 });
  const geoQuery = useQuery({ queryKey: ["overview-geo-summary"], queryFn: () => getVisibilitySummary(), staleTime: 5 * 60 * 1000 });
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
  const negativeShare = pct(dist.negative, analysed);
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
  const platformName = (key: string) => (key === "news" ? L("Online news", "Berita online") : PLATFORM_NAMES[key] ?? key);

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

  return (
    <div className="space-y-5 pb-6">
      {isDemoSession ? <DemoBanner /> : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{L("Overview", "Ringkasan")}</h1>
          {lastDataAt ? <p className="mt-1 text-[13px] font-medium text-[#5A6478]">{L("Last data", "Data terakhir")}: <b className="font-black text-[#101334]">{timeAgo(lastDataAt)}</b></p> : null}
        </div>
        <div role="group" aria-label={L("Period", "Periode")} className="flex rounded-[10px] border border-[#DDE3EF] bg-white p-1">
          {(["24h", "7d", "30d"] as DateRangeKey[]).map((key) => (
            <button key={key} type="button" onClick={() => setPeriod(key)} aria-pressed={period === key} className={cn("rounded-[7px] px-3.5 py-1.5 text-[12px] font-black transition", period === key ? "bg-[#465FFF] text-white" : "text-[#5A6478] hover:text-[#101334]")}>
              {periodWord[key]}
            </button>
          ))}
        </div>
      </header>

      {/* What this workspace watches: the brand and every active keyword, each opening its records. */}
      {!neverCollected && (summary?.keyword_breakdown?.length || workspaceQuery.data?.brandName) ? (
        <section aria-label={L("Monitoring focus", "Fokus pemantauan")} className="rounded-[14px] bg-[#101334] px-5 py-4 text-white shadow-[0_8px_24px_rgba(16,19,52,0.18)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/60">{L("Monitoring focus", "Fokus pemantauan")}</p>
              <p className="mt-0.5 truncate text-[20px] font-black leading-tight">{workspaceQuery.data?.brandName || L("Your brand", "Brand Anda")}</p>
            </div>
            <Link href="/workspace/settings#keywords" className="shrink-0 text-[12px] font-black text-[#A9B6FF] hover:text-white">{L("Manage keywords", "Atur kata kunci")} →</Link>
          </div>
          {summary?.keyword_breakdown?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.keyword_breakdown.map((k) => {
                const negShare = k.count > 0 ? Math.round((k.negative / k.count) * 100) : 0;
                return (
                  <Link
                    key={k.keyword}
                    href={monitoringHref({ hours, q: k.keyword })}
                    className="group flex items-center gap-3 rounded-[10px] border border-white/15 bg-white/[0.06] px-3.5 py-2 transition hover:border-white/40 hover:bg-white/[0.12]"
                  >
                    <span className="text-[14px] font-black">{k.keyword}</span>
                    <span className="text-[12px] font-bold text-white/70">{fmt(k.count)} {L("data", "data")}</span>
                    {k.count > 0 ? (
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", negShare >= 30 ? "bg-[#EF4444] text-white" : "bg-white/15 text-white")}>{negShare}% {L("negative", "negatif")}</span>
                    ) : null}
                    {k.last24h > 0 ? <span className="text-[11px] font-black text-[#7CF0C0]">+{fmt(k.last24h)} {L("in 24h", "24 jam")}</span> : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[12px] font-semibold text-white/70">{L("No active keywords yet.", "Belum ada kata kunci aktif.")}</p>
          )}
        </section>
      ) : null}

      {liveError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
          <span>{liveError.status === 401 ? L("Session expired. Sign in again.", "Sesi berakhir. Silakan masuk lagi.") : liveError.status === 403 ? L("No access to this workspace.", "Tidak punya akses ke workspace ini.") : L("Data could not be loaded.", "Data gagal dimuat.")}</span>
          <button type="button" onClick={() => void summaryQuery.refetch()} className="rounded-[6px] border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100">{L("Retry", "Coba lagi")}</button>
        </div>
      ) : null}

      {neverCollected ? (
        <Card title={L("Start monitoring", "Mulai pemantauan")}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, title: L("Add keywords", "Tambah kata kunci"), href: "/workspace/settings#keywords" },
              { n: 2, title: L("Run the first collection", "Jalankan pengambilan pertama"), href: "/workspace/settings#keywords" },
              { n: 3, title: L("See the results here", "Lihat hasilnya di sini"), href: "/signals" },
            ].map((step) => (
              <li key={step.n}>
                <Link href={step.href} className="block rounded-[10px] border border-slate-100 bg-[#FBFCFF] p-3 transition hover:border-[#465FFF]/40">
                  <p className="text-[11px] font-bold text-[#5A6478]">{L("Step", "Langkah")} {step.n}</p>
                  <p className="mt-1 text-[13px] font-black text-[#101334]">{step.title} →</p>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Card title={L("Sentiment", "Sentimen")} link={{ href: monitoringHref({ hours }), label: L("All data", "Semua data") }}>
              {summaryQuery.isLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : total === 0 ? (
                <Empty>
                  {L(`No new data in ${periodWord[period]}.`, `Belum ada data baru dalam ${periodWord[period]}.`)}
                  {period !== "30d" ? <> <button type="button" onClick={() => setPeriod("30d")} className="font-black text-[#3B52F5] hover:underline">{L("Show 30 days", "Lihat 30 hari")}</button></> : null}
                </Empty>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <Stat label={L("Data", "Data")} value={fmt(total)} href={monitoringHref({ hours })} />
                    <Stat label={L("Negative", "Negatif")} value={fmt(dist.negative)} tone={negativeShare >= 30 ? "bad" : "plain"} href={monitoringHref({ hours, sentiment: "negative" })} />
                    <Stat label={L("Negative share", "Porsi negatif")} value={analysed > 0 ? `${negativeShare.toFixed(0)}%` : "—"} tone={negativeShare >= 30 ? "bad" : "plain"} />
                  </div>
                  <div className="space-y-2">
                    {([
                      ["positive", L("Positive", "Positif"), "#10B981"],
                      ["neutral", L("Neutral", "Netral"), "#94A3B8"],
                      ["mixed", L("Mixed", "Campuran"), "#F59E0B"],
                      ["negative", L("Negative", "Negatif"), "#EF4444"],
                    ] as const).map(([key, label, color]) => (
                      <Bar key={key} label={label} value={`${fmt(dist[key])} · ${pct(dist[key], analysed).toFixed(0)}%`} share={pct(dist[key], analysed)} color={color} href={monitoringHref({ hours, sentiment: key })} />
                    ))}
                  </div>
                  {unanalysed > 0 ? (
                    <Link href={monitoringHref({ hours, analysis: "pending" })} className="mt-3 inline-block text-[12px] font-bold text-[#3B52F5] hover:underline">
                      {L(`${fmt(unanalysed)} not analysed yet →`, `${fmt(unanalysed)} belum dianalisis →`)}
                    </Link>
                  ) : null}
                </>
              )}
            </Card>

            <Card title={L("To do now", "Yang harus dilakukan")} link={{ href: "/alerts", label: L(`${openAlertTotal} open`, `${openAlertTotal} terbuka`) }}>
              {alertsQuery.isLoading || recsQuery.isLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : openAlerts.length === 0 && recommendations.length === 0 ? (
                <Empty>{L("Nothing to handle right now.", "Tidak ada yang perlu ditangani saat ini.")}</Empty>
              ) : (
                <ol className="space-y-2.5">
                  {openAlerts.map((alert) => (
                    <li key={alert.id}>
                      <Link href={`/alerts/${alert.id}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#EEF1F7] p-3 transition hover:border-[#465FFF]/40 hover:bg-[#FBFCFF]">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <Tag tone={levelTone(alert.severity ?? "low")}>{tLevel(`level.${["critical", "high", "medium", "low"].includes(alert.severity ?? "") ? alert.severity : "low"}`)}</Tag>
                            <span className="text-[10px] font-bold text-[#5A6478]">{timeAgo(alertTime(alert))}</span>
                          </span>
                          <span className="mt-1.5 block truncate text-[13px] font-black text-[#101334]">{alert.title}</span>
                        </span>
                        <span className="shrink-0 rounded-[8px] bg-[#465FFF] px-3 py-1.5 text-[11px] font-black text-white">{L("Handle", "Tangani")}</span>
                      </Link>
                    </li>
                  ))}
                  {recommendations.map((rec: IntelligenceRecommendation, index) => (
                    <li key={`${rec.action}-${index}`}>
                      <Link href="/action-center" className="flex items-center justify-between gap-3 rounded-[10px] border border-[#EEF1F7] p-3 transition hover:border-[#465FFF]/40 hover:bg-[#FBFCFF]">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <Tag tone={levelTone(rec.priority)}>{tLevel(`level.${rec.priority}`)}</Tag>
                            <span className="text-[10px] font-bold text-[#5A6478]">{codes.urgency(rec.urgency)}</span>
                          </span>
                          <span className="mt-1.5 block text-[13px] font-black text-[#101334]">{codes.action(rec.action)}</span>
                          {rec.observedIssue ? <span className="mt-0.5 block truncate text-[12px] font-medium text-[#53608C]">{rec.observedIssue}</span> : null}
                        </span>
                        <span className="shrink-0 rounded-[8px] border border-[#DDE3EF] px-3 py-1.5 text-[11px] font-black text-[#3B52F5]">{L("Plan", "Buat rencana")}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card title={L("Hottest issues", "Isu paling panas")} link={{ href: `/intelligence?days=${PERIOD_DAYS[period]}`, label: L("All issues", "Semua isu") }}>
            {issuesQuery.isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : issues.length === 0 ? (
              <Empty>{L(`No issues in ${periodWord[period]}.`, `Belum ada isu dalam ${periodWord[period]}.`)}</Empty>
            ) : (
              <ol className="divide-y divide-[#F3F5FA]">
                {issues.map((issue: NarrativeRecord, index) => {
                  const tag = sentimentTag(issue.sentiment);
                  const velocity = issue.velocity === "new" ? L("new", "baru") : issue.velocity === "—" ? "" : issue.velocity;
                  return (
                    <li key={issue.id}>
                      <Link href={issueHref(issue.id, hours)} className="-mx-2 flex items-center gap-3 rounded-[8px] px-2 py-3 transition hover:bg-[#F8FAFF]">
                        <span className="w-5 text-[13px] font-black text-[#8A93AD]">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-black text-[#101334]">{issue.title}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", tag.cls)}>{L(tag.en, tag.id)}</span>
                        {velocity ? <span className={cn("w-12 text-right text-[12px] font-black tabular-nums", velocity.startsWith("+") ? "text-[#B42318]" : "text-[#5A6478]")}>{velocity}</span> : null}
                        <span className="w-16 text-right text-[12px] font-black tabular-nums text-[#101334]">{fmt(issue.signalCount)} {L("data", "data")}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card title={L("Sources", "Sumber data")} link={{ href: "/workspace/sources", label: L("Manage", "Kelola") }}>
              {summaryQuery.isLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : platformTotal === 0 ? (
                <Empty>{L(`No data in ${periodWord[period]}.`, `Belum ada data dalam ${periodWord[period]}.`)}</Empty>
              ) : (
                <>
                  <div className="space-y-2">
                    {platforms.map((p, index) => (
                      <Bar key={p.platform} label={platformName(p.platform)} value={`${fmt(p.count)} · ${pct(p.count, platformTotal).toFixed(0)}%`} share={pct(p.count, platformTotal)} color={BAR_COLORS[index % BAR_COLORS.length]} href={monitoringHref({ hours, platform: p.platform })} />
                    ))}
                    {missingSocial.map((key) => (
                      <Bar key={key} label={PLATFORM_NAMES[key]} value={L("not connected", "belum terhubung")} share={0} color="#EEF1F7" href="/workspace/sources" muted />
                    ))}
                  </div>
                  {publishers.length > 0 ? (
                    <>
                      <p className="mb-1 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{L("Top publishers", "Media teratas")}</p>
                      <ul className="divide-y divide-[#F3F5FA]">
                        {publishers.slice(0, 6).map((pub) => (
                          <li key={pub.publisher} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                            <span className="min-w-0 truncate font-bold text-[#101334]">{pub.publisher}</span>
                            <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                              {pub.negative > 0 ? <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[10px] font-black text-[#B42318]">{pub.negative} neg</span> : null}
                              <span className="w-6 text-right font-black text-[#101334]">{pub.count}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              )}
            </Card>

            <Card title={L("Visibility in AI (GEO)", "Visibilitas di AI (GEO)")} link={{ href: "/visibility", label: L("Details", "Detail") }}>
              {geoQuery.isLoading ? (
                <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-[#5A6478]">{L("Average score", "Skor rata-rata")}</p>
                      <p className="mt-1 text-[24px] font-black tabular-nums leading-none text-[#101334]">{geoAverage ?? "—"}<span className="text-[13px] font-bold text-[#5A6478]">/100</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => geoRun.mutate()}
                      disabled={geoRun.isPending || !anyConnected || isDemoSession}
                      title={!anyConnected ? L("Connect an AI API key first", "Hubungkan API key AI dulu") : undefined}
                      className="rounded-[8px] bg-[#465FFF] px-3.5 py-2 text-[12px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {geoRun.isPending ? L("Testing…", "Menguji…") : L("Test now", "Uji sekarang")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {GEO_ENGINES.map((engine, index) => {
                      const result = geoByKey.get(engine.key);
                      const status = engineStatus.get(engine.key);
                      const value = result ? `${Math.round(result.visibilityScore)}/100` : status?.configured ? L("not tested", "belum diuji") : L("not connected", "belum terhubung");
                      return <Bar key={engine.key} label={engine.name} value={value} share={result ? Math.min(100, Math.max(0, result.visibilityScore)) : 0} color={BAR_COLORS[index % BAR_COLORS.length]} href="/visibility" muted={!result} />;
                    })}
                  </div>
                  <p className="mt-3 text-[11px] font-semibold text-[#5A6478]">
                    {geoLastChecked ? `${L("Last test", "Uji terakhir")}: ${timeAgo(geoLastChecked)}. ` : ""}
                    {L("Score = how often each AI mentions the brand when asked about it.", "Skor = seberapa sering AI menyebut brand saat ditanya.")}
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
