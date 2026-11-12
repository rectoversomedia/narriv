"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowRight, MessageCircleQuestion, RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { MonoLabel } from "@/components/ui/stamp";
import { useCodeLabels } from "@/components/intelligence/intelligence-panels";
import {
  getEntityIntelligence,
  getNarrativeIntelligence,
  getPredictiveSignals,
  getReputationIntelligence,
  getTrend,
  type RiskComponent,
} from "@/lib/intelligence-api";
import { getAlerts } from "@/lib/api-service";
import { issueHref, monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

// "Analisis": why today's risk score is what it is, and what to do about it. The top card is the verdict (risk and
// reputation, the main driver in one sentence, and where to act); below, each driver with a link to its evidence,
// and beside it what is rising, what may come next and who is talked about. AI-answer visibility lives under Isu.
const WINDOWS = [
  { id: "24h", label: ["24 Hours", "24 Jam"], hours: 24 },
  { id: "7d", label: ["7 Days", "7 Hari"], hours: 168 },
  { id: "30d", label: ["30 Days", "30 Hari"], hours: 720 },
] as const;

const RISK = {
  low: { band: "bg-[#12A66A]", stamp: "bg-[#E8F7EF] text-[#047857]", text: "text-[#047857]" },
  medium: { band: "bg-[#F59E0B]", stamp: "bg-[#FFF4E5] text-[#A04606]", text: "text-[#B45309]" },
  high: { band: "bg-[#EF4444]", stamp: "bg-[#FDECEC] text-[#B42318]", text: "text-[#B42318]" },
  critical: { band: "bg-[#B42318]", stamp: "bg-[#B42318] text-white", text: "text-[#B42318]" },
} as const;

const TREND: Record<string, { en: string; id: string; tone: string; Icon: typeof TrendingUp }> = {
  SPIKING: { en: "Spiking", id: "Melonjak Tajam", tone: "text-[#B42318]", Icon: TrendingUp },
  ACCELERATING: { en: "Rising", id: "Naik", tone: "text-[#B45309]", Icon: TrendingUp },
  EMERGING: { en: "Just Appeared", id: "Baru Muncul", tone: "text-[#3B52F5]", Icon: TrendingUp },
  STABLE: { en: "Stable", id: "Stabil", tone: "text-[#047857]", Icon: Minus },
  DECLINING: { en: "Falling", id: "Turun", tone: "text-[#047857]", Icon: TrendingDown },
};

/** One colour per driver, biggest first, shared by the score bar and the driver cards. */
const DRIVER_COLORS = ["#B42318", "#F97316", "#F59E0B", "#465FFF", "#8B5CF6"];

/** Where each score driver's evidence can be seen. */
function driverHref(c: RiskComponent, hours: number): { href: string; label: [string, string] } | null {
  const period = hours as MonitoringPeriod;
  const count = c.evidenceIds.length ? ` ${c.evidenceIds.length}` : "";
  if (c.key === "negative_share") return { href: monitoringHref({ hours: period, sentiment: "negative" }), label: [`See${count} negative mentions`, `Lihat${count} percakapan negatif`] };
  if (c.key === "severity") return { href: monitoringHref({ hours: period, sentiment: "negative" }), label: ["See the severe mentions", "Lihat percakapan yang berat"] };
  if (c.key === "active_alerts") return { href: c.evidenceIds[0] ? `/alerts/${c.evidenceIds[0]}` : "/alerts", label: ["Handle the open alert", "Tangani peringatan terbuka"] };
  if (c.key === "narrative_momentum") return { href: "/intelligence", label: ["See the rising issues", "Lihat isu yang naik"] };
  if (c.key === "volume_change") return { href: monitoringHref({ hours: period }), label: ["See all mentions", "Lihat semua percakapan"] };
  return null;
}

function Section({ label, title, action, children, className }: { label: string; title?: string; action?: { href: string; text: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(BOX, className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <MonoLabel>{label}</MonoLabel>
          {title ? <h2 className="mt-1.5 text-[19px] font-black leading-snug tracking-[-0.02em] text-[#101334]">{title}</h2> : null}
        </div>
        {action ? <Link href={action.href} className="shrink-0 text-[13px] font-bold text-[#3B52F5] hover:underline">{action.text}</Link> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function InsightsPage() {
  const L = useL();
  const t = useTranslations("IntelPanels");
  const code = useCodeLabels();
  const queryClient = useQueryClient();
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]["id"]>("24h");
  const hours = (WINDOWS.find((w) => w.id === windowId) ?? WINDOWS[0]).hours;

  const narrative = useQuery({ queryKey: ["intelligence", "narrative", hours], queryFn: () => getNarrativeIntelligence(hours), staleTime: 60 * 1000, retry: 1 });
  const reputation = useQuery({ queryKey: ["intelligence", "reputation", hours], queryFn: () => getReputationIntelligence(hours), staleTime: 60 * 1000, retry: 1 });
  const entities = useQuery({ queryKey: ["intelligence", "entity", hours], queryFn: () => getEntityIntelligence(hours), staleTime: 60 * 1000, retry: 1 });
  const predictive = useQuery({ queryKey: ["intelligence", "predictive", hours], queryFn: () => getPredictiveSignals(hours), staleTime: 60 * 1000, retry: 1 });
  const trend = useQuery({ queryKey: ["insights", "trend", hours], queryFn: () => getTrend(hours), staleTime: 60 * 1000, retry: 1 });
  const openAlerts = useQuery({ queryKey: ["nav-open-alerts"], queryFn: () => getAlerts({ status: "unresolved", limit: 1 }), staleTime: 60 * 1000 });

  const n = narrative.data;
  const hasRisk = !!n && n.status !== "insufficient_data";
  const band = (hasRisk && n.riskBand in RISK ? n.riskBand : "low") as keyof typeof RISK;
  const tone = RISK[band];
  const drivers = (n?.riskModel?.components ?? []).filter((c) => c.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  const maxContribution = Math.max(1, ...drivers.map((d) => d.contribution));
  const driverName = (c: RiskComponent) => t(`component.${c.key}`);
  const emerging = (n?.inferences.find((i) => i.kind === "emerging_narratives")?.items ?? []) as Array<{ clusterId: string; title: string; signalCount: number; last24h?: number | null }>;
  const negShare = n?.inferences.find((i) => i.kind === "negative_sentiment_share");

  const r = reputation.data;
  const sent = (r?.facts.find((f) => f.kind === "sentiment_breakdown")?.value || {}) as Record<string, number>;
  const sentTotal = Object.values(sent).reduce((a, b) => a + b, 0) || 1;
  const pos = Math.round(((sent.POSITIVE || 0) / sentTotal) * 100);
  const neg = Math.round(((sent.NEGATIVE || 0) / sentTotal) * 100);
  const repScore = r && !r.note && typeof r.reputationScore === "number" ? r.reputationScore : null;
  const openCount = openAlerts.data?.pagination?.total ?? 0;

  const trendLabel = trend.data && !trend.data.note ? TREND[String(trend.data.status).toUpperCase()] : undefined;
  const predictions = predictive.data?.signals ?? [];
  const people = entities.data?.entities ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Analysis", "Analisis")}</h1>
          <p className="mt-1 text-[14px] text-[#5F6B94]">{L("Why the risk score is what it is, and where to act.", "Kenapa skor risikonya segini, dan di mana harus bertindak.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[12px] border-[1.5px] border-[#101334] bg-white p-1 shadow-[0_2px_0_#101334]" role="group" aria-label={L("Period", "Periode")}>
            {WINDOWS.map((w) => (
              <button key={w.id} type="button" aria-pressed={w.id === windowId} onClick={() => setWindowId(w.id)} className={cn("rounded-[8px] px-3 py-1.5 text-[12.5px] font-bold transition-colors", w.id === windowId ? "bg-[#101334] text-white" : "text-[#5F6B94] hover:text-[#101334]")}>
                {L(w.label[0], w.label[1])}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => queryClient.invalidateQueries()} aria-label={L("Refresh", "Muat Ulang")} className="grid size-10 place-items-center rounded-[12px] border-[1.5px] border-[#101334] bg-white text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC]">
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The verdict: risk and reputation side by side, the main reason in a sentence, and where to act. */}
      {narrative.isLoading ? (
        <Skeleton className="h-[300px] rounded-[18px]" />
      ) : (
        <section className={cn(BOX, "overflow-hidden !p-0")}>
          <div className={cn("h-2", hasRisk ? tone.band : "bg-[#C9D0E3]")} />
          <div className="p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <MonoLabel>{L("Risk Score", "Skor Risiko")}</MonoLabel>
                  {hasRisk ? <span className={cn("rounded-[6px] px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em]", tone.stamp)}>{t(`risk.${band}`)}</span> : null}
                </div>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className={cn("text-[56px] font-black leading-none tracking-[-0.04em]", hasRisk ? tone.text : "text-[#9AA3BC]")}>{hasRisk ? n.riskScore : "—"}</span>
                  <span className="font-mono text-[14px] font-bold text-[#5F6B94]">/100</span>
                </p>
                {/* The score as its parts: each driver's points in its colour, out of 100. */}
                <div className="mt-3 flex h-3 w-full max-w-md overflow-hidden rounded-full bg-[#EEF0F6]">
                  {hasRisk && drivers.length
                    ? drivers.map((c, i) => <div key={c.key} title={`${driverName(c)} +${c.contribution}`} className="h-full border-r-2 border-white last:border-r-0" style={{ width: `${c.contribution}%`, backgroundColor: DRIVER_COLORS[i % DRIVER_COLORS.length] }} />)
                    : <div className={cn("h-full", tone.band)} style={{ width: `${hasRisk ? Math.min(100, n.riskScore) : 0}%` }} />}
                </div>
                {hasRisk && drivers.length ? (
                  <ul className="mt-2 flex max-w-md flex-wrap gap-x-3 gap-y-1">
                    {drivers.map((c, i) => (
                      <li key={c.key} className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#31406B]">
                        <span className="size-2 rounded-full" style={{ backgroundColor: DRIVER_COLORS[i % DRIVER_COLORS.length] }} />{driverName(c)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 max-w-xl text-[15.5px] font-medium leading-relaxed text-[#31406B]">
                  {!hasRisk
                    ? L("Not enough conversations in this period to score the risk.", "Percakapan di periode ini belum cukup untuk menilai risiko.")
                    : drivers.length
                      ? <>{L("Driven mostly by ", "Paling banyak didorong oleh ")}<b className="text-[#101334]">{driverName(drivers[0])}</b>{drivers[1] ? <>{L(" and ", " dan ")}<b className="text-[#101334]">{driverName(drivers[1])}</b></> : null}.{negShare ? L(` ${Math.round(Number(negShare.value) * 100)}% of mentions are negative.`, ` ${Math.round(Number(negShare.value) * 100)}% percakapan bernada negatif.`) : ""}</>
                      : L("No single factor stands out.", "Tidak ada faktor yang menonjol.")}
                </p>
              </div>

              <div className="rounded-[16px] bg-[#F6F7FC] p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <MonoLabel>{L("Reputation", "Reputasi")}</MonoLabel>
                  {repScore != null && r ? <span className="nv-stamp !py-0.5">{t(`rep.${r.reputationBand}`)}</span> : null}
                </div>
                {reputation.isLoading ? (
                  <Skeleton className="mt-3 h-20 w-full" />
                ) : repScore != null ? (
                  <>
                    <p className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[40px] font-black leading-none tracking-[-0.03em] text-[#101334]">{repScore}</span>
                      <span className="font-mono text-[13px] font-bold text-[#5F6B94]">/100</span>
                    </p>
                    <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[#E3E7F1]">
                      <div className="bg-[#10B981]" style={{ width: `${pos}%` }} />
                      <div className="bg-[#EF4444]" style={{ width: `${neg}%` }} />
                    </div>
                    <p className="mt-2 text-[13.5px] font-semibold text-[#31406B]">
                      <span className="text-[#047857]">{pos}% {L("positive", "positif")}</span> · <span className="text-[#B42318]">{neg}% {L("negative", "negatif")}</span> · {100 - pos - neg}% {L("neutral/mixed", "netral/campuran")}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[14px] font-semibold text-[#5F6B94]">{L("Not enough data yet.", "Data belum cukup.")}</p>
                )}
              </div>
            </div>

            {/* Where to act on it. */}
            <div className="mt-6 flex flex-col gap-2.5 rounded-[18px] bg-[#101334] p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <p className="px-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF] sm:mr-2">{L("Act On It", "Tindak Lanjuti")}</p>
              <Link href="/alerts" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5]">
                {openCount > 0 ? L(`Handle ${openCount} Open Alerts`, `Tangani ${openCount} Peringatan Terbuka`) : L("Open Alerts", "Buka Peringatan")}
              </Link>
              <Link href={monitoringHref({ hours: hours as MonitoringPeriod, sentiment: "negative" })} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-white/80 px-5 text-[14px] font-black text-white transition hover:bg-white/10">
                {L("Read Negative Mentions", "Baca Percakapan Negatif")}
              </Link>
              <Link href="/ask" className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-bold text-white/80 transition hover:bg-white/10 hover:text-white sm:ml-auto">
                <MessageCircleQuestion size={16} /> {L("Ask Narriv Why", "Tanya Narriv")}
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Each driver of the score, biggest first, with a link to the records behind it. */}
        <Section label={L("Why The Score", "Kenapa Skornya")} title={hasRisk ? L(`What Adds Up To ${n.riskScore}`, `Yang Membentuk Skor ${n.riskScore}`) : L("Score Drivers", "Pembentuk Skor")}>
          {narrative.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : drivers.length === 0 ? (
            <p className="text-[14px] font-semibold text-[#5F6B94]">{t("noComponent")}</p>
          ) : (
            <ol className="grid gap-3 md:grid-cols-2">
              {drivers.map((c, i) => {
                const link = driverHref(c, hours);
                const color = DRIVER_COLORS[i % DRIVER_COLORS.length];
                const share = hasRisk && n.riskScore > 0 ? Math.round((c.contribution / n.riskScore) * 100) : null;
                return (
                  <li key={c.key} className="flex flex-col rounded-[16px] bg-[#F6F7FC] p-4" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
                    <div className="flex items-start justify-between gap-3 pl-1">
                      <div className="min-w-0">
                        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{L(`Factor ${i + 1}`, `Faktor ${i + 1}`)}</p>
                        <p className="mt-1 text-[16px] font-black leading-snug text-[#101334]">{driverName(c)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[24px] font-black leading-none tracking-[-0.02em]" style={{ color }}>+{c.contribution}</p>
                        {share != null ? <p className="mt-1 font-mono text-[10.5px] font-bold text-[#5F6B94]">{L(`${share}% of score`, `${share}% dari skor`)}</p> : null}
                      </div>
                    </div>
                    <div className="ml-1 mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full" style={{ width: `${(c.contribution / maxContribution) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="mt-2.5 flex-1 pl-1 text-[14px] font-medium leading-relaxed text-[#31406B]">{c.reason}</p>
                    {link ? (
                      <Link href={link.href} className="ml-1 mt-3 inline-flex w-fit items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#101334] bg-white px-3 py-2 text-[13px] font-black text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#EEF1FF]">
                        {L(link.label[0], link.label[1])} <ArrowRight size={14} />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
          {n?.riskModel?.uncertainty.reasons.length ? (
            <p className="mt-3 rounded-[12px] bg-[#FFF7E8] px-4 py-3 text-[13px] font-semibold text-[#92400E]">
              {t("uncertaintyLevel", { level: code.uncertainty(n.riskModel.uncertainty.level) })} {n.riskModel.uncertainty.reasons.join(" ")}
            </p>
          ) : null}
        </Section>

        <div className="space-y-5">
          <Section label={L("Rising Now", "Sedang Naik")} title={L("Emerging Issues", "Isu yang Muncul")} action={{ href: "/intelligence", text: L("Issue Map", "Peta Isu") }}>
            {narrative.isLoading ? <Skeleton className="h-24 w-full" /> : emerging.length === 0 ? (
              <p className="text-[14px] font-semibold text-[#5F6B94]">{t("noEmerging")}</p>
            ) : (
              <ul className="divide-y divide-[#EEF0F6]">
                {emerging.slice(0, 5).map((it) => (
                  <li key={it.clusterId}>
                    <Link href={issueHref(it.clusterId, hours)} className="group -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3 transition hover:bg-[#F7F8FC]">
                      <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug text-[#101334] group-hover:text-[#3B52F5]">{it.title}</span>
                      <span className="shrink-0 rounded-[6px] bg-[#FFF4E5] px-2 py-1 font-mono text-[10.5px] font-bold text-[#A04606]">+{it.last24h ?? it.signalCount} / 24{L("h", " jam")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section label={L("What May Come Next", "Yang Mungkin Terjadi")} title={L("Forecast", "Prediksi")}>
            {predictive.isLoading ? <Skeleton className="h-20 w-full" /> : predictions.length === 0 ? (
              <p className="text-[14px] font-semibold text-[#5F6B94]">{t("noPredictiveTitle")}</p>
            ) : (
              <ul className="space-y-3">
                {predictions.slice(0, 3).map((p, idx) => (
                  <li key={`${p.signal}-${idx}`}>
                    <p className="text-[14.5px] font-bold leading-snug text-[#101334]">{p.label}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F6]"><div className="h-full rounded-full bg-[#465FFF]" style={{ width: `${Math.round(p.confidence * 100)}%` }} /></div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-[#5F6B94]">{Math.round(p.confidence * 100)}% · {p.timeframe}</span>
                    </div>
                  </li>
                ))}
                <li className="text-[11.5px] font-medium text-[#8A93AD]">{t("heuristicForecast")}</li>
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between rounded-[12px] bg-[#F6F7FC] px-4 py-3">
              <span className="text-[13px] font-bold text-[#31406B]">{L("Conversation Volume", "Volume Percakapan")}</span>
              {trend.isLoading ? <Skeleton className="h-5 w-20" /> : trendLabel ? (
                <span className={cn("flex items-center gap-1.5 text-[14px] font-black", trendLabel.tone)}>
                  <trendLabel.Icon size={15} /> {L(trendLabel.en, trendLabel.id)}{trend.data?.ratio != null ? <span className="font-mono text-[11px] text-[#5F6B94]"> · {trend.data.ratio.toFixed(1)}×</span> : null}
                </span>
              ) : (
                <span className="text-[12.5px] font-semibold text-[#5F6B94]">{L("Needs two periods", "Butuh dua periode")}</span>
              )}
            </div>
          </Section>

          <Section label={L("Who Is Talked About", "Yang Paling Disebut")} title={L("People & Organisations", "Tokoh & Organisasi")}>
            {entities.isLoading ? <Skeleton className="h-24 w-full" /> : people.length === 0 ? (
              <p className="text-[14px] font-semibold text-[#5F6B94]">{L("Not enough data yet. Updates as data arrives.", "Data belum cukup. Terisi otomatis saat data masuk.")}</p>
            ) : (
              <ul className="divide-y divide-[#EEF0F6]">
                {people.slice(0, 6).map((e) => (
                  <li key={e.entity}>
                    <Link href={monitoringHref({ hours: hours as MonitoringPeriod, q: e.entity })} className="group -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition hover:bg-[#F7F8FC]">
                      <span className={cn("size-2.5 shrink-0 rounded-full", e.avgSentiment < 0 ? "bg-[#EF4444]" : e.avgSentiment > 0 ? "bg-[#10B981]" : "bg-[#94A3B8]")} />
                      <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-[#101334] group-hover:text-[#3B52F5]">{e.entity}</span>
                      <span className="shrink-0 font-mono text-[11.5px] font-bold text-[#5F6B94]">{e.mentions}×</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
