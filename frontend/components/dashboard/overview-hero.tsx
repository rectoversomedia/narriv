"use client";

import Link from "next/link";
import { BrandMark } from "@/components/dashboard/brand-hero";
import { monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

export type KeywordRow = { keyword: string; count: number; negative: number; positive: number; neutral?: number; mixed?: number; last24h: number; daily?: number[] };

type Level = "attention" | "watch" | "calm" | "waiting";

const LEVEL_STYLE: Record<Level, { chip: string; dot: string }> = {
  attention: { chip: "bg-[#FDECEC] text-[#B42318]", dot: "bg-[#E5484D]" },
  watch: { chip: "bg-[#FEF3E2] text-[#B45309]", dot: "bg-[#F59E0B]" },
  calm: { chip: "bg-[#E8F7EF] text-[#047857]", dot: "bg-[#10B981]" },
  waiting: { chip: "bg-white/10 text-white", dot: "bg-[#8EA0FF] animate-pulse" },
};

/** Negative share of a keyword's records, rounded to a whole percent. */
const negShare = (k: KeywordRow) => (k.count > 0 ? Math.round((k.negative / k.count) * 100) : 0);
const shareTone = (share: number) => (share >= 50 ? "bg-[#F87171]/20 text-[#FCA5A5]" : share >= 30 ? "bg-[#FBBF24]/15 text-[#FCD34D]" : "bg-[#34D399]/15 text-[#6EE7B7]");

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 120, h = 32;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 3 - (v / max) * (h - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="kwspark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#A5B4FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#A5B4FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#kwspark)" />
      <polyline points={pts} fill="none" stroke="#C7D0FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * One monitored keyword as a row on the panel: name, last-7-days trend, sentiment split, volume, new in 24 hours and
 * negative share. The whole row opens the records behind it.
 */
function KeywordRowItem({ k, hours }: { k: KeywordRow; hours: MonitoringPeriod }) {
  const L = useL();
  const fmt = (n: number) => n.toLocaleString(intlLocale());
  const neutral = k.neutral ?? Math.max(0, k.count - k.negative - k.positive - (k.mixed ?? 0));
  const parts = [
    { n: k.positive, color: "#34D399", label: L("Positive", "Positif") },
    { n: neutral, color: "#94A3B8", label: L("Neutral", "Netral") },
    { n: k.mixed ?? 0, color: "#FBBF24", label: L("Mixed", "Campuran") },
    { n: k.negative, color: "#F87171", label: L("Negative", "Negatif") },
  ];
  const share = negShare(k);
  const pct = (n: number) => (k.count > 0 ? Math.round((n / k.count) * 100) : 0);
  return (
    <li>
      <Link
        href={monitoringHref({ hours, q: k.keyword })}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-[16px] px-3 py-4 transition hover:bg-white/[0.06] sm:px-4 lg:grid-cols-[minmax(0,1fr)_130px_minmax(330px,1.7fr)_84px_84px_96px] lg:gap-x-5"
      >
        {/* Name */}
        <div className="min-w-0">
          <p className="truncate text-[16px] font-black">{k.keyword}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-white/50 group-hover:text-white/80">{L("See Mentions", "Lihat Percakapan")}</p>
        </div>
        {/* Negative share (top right on phones, last column on wide screens) */}
        <span className={cn("justify-self-end rounded-full px-2.5 py-1 text-[12px] font-black lg:order-last", shareTone(share))}>
          {share}% {L("Negative", "Negatif")}
        </span>
        {/* Trend */}
        <div className="col-span-2 lg:col-span-1">
          {k.daily?.some((v) => v > 0) ? <Sparkline values={k.daily} /> : <p className="text-[12px] font-semibold text-white/40">{L("No Trend Yet", "Belum Ada Tren")}</p>}
          <p className="mt-0.5 text-[10px] font-semibold text-white/40">{L("Last 7 Days", "7 Hari Terakhir")}</p>
        </div>
        {/* Sentiment split */}
        <div className="col-span-2 lg:col-span-1">
          <div className="flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
            {k.count > 0 ? parts.filter((p) => p.n > 0).map((p) => <span key={p.label} style={{ width: `${(p.n / k.count) * 100}%`, backgroundColor: p.color }} />) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 lg:flex-nowrap lg:gap-x-2.5">
            {parts.map((p) => (
              <span key={p.label} className={cn("inline-flex items-center gap-1 text-[11px] font-semibold text-white/65", p.n === 0 && "opacity-40")}>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label} <b className="font-black tabular-nums text-white">{pct(p.n)}%</b>
              </span>
            ))}
          </div>
        </div>
        {/* Volume and new in 24 hours */}
        <div className="lg:text-right">
          <p className="text-[24px] font-black leading-none tabular-nums">{fmt(k.count)}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/50">{L("Mentions", "Percakapan")}</p>
        </div>
        <div className="text-right">
          <p className={cn("text-[24px] font-black leading-none tabular-nums", k.last24h > 0 ? "text-[#A5B4FF]" : "text-white/35")}>{k.last24h > 0 ? `+${fmt(k.last24h)}` : "0"}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/50">{L("New in 24h", "Baru 24 Jam")}</p>
        </div>
      </Link>
    </li>
  );
}

/**
 * The overview's main panel: the workspace centred at the top, a verdict in plain words with the three numbers
 * behind it, then the monitored keywords as rows, the most negative first. Every number links to the records it counts.
 */
export function OverviewHero({
  brandName,
  logoUrl,
  keywords,
  total,
  negativeShare,
  openAlerts,
  criticalAlerts,
  hours,
  periodLabel,
  lastDataLabel,
}: {
  brandName: string;
  logoUrl?: string | null;
  keywords: KeywordRow[];
  total: number;
  negativeShare: number;
  openAlerts: number;
  criticalAlerts: number;
  hours: MonitoringPeriod;
  periodLabel: string;
  lastDataLabel: string | null;
}) {
  const L = useL();
  const fmt = (n: number) => n.toLocaleString(intlLocale());
  const sorted = [...keywords].sort((a, b) => negShare(b) - negShare(a) || b.count - a.count);
  const worst = sorted.find((k) => k.count >= 5 && k.negative > 0) ?? null;
  const worstShare = worst ? negShare(worst) : 0;

  // No mentions yet is not "under control": it says the first data is still on its way.
  const level: Level = total === 0 && openAlerts === 0 ? "waiting" : criticalAlerts > 0 || negativeShare >= 40 || worstShare >= 60 ? "attention" : negativeShare >= 25 || openAlerts > 0 ? "watch" : "calm";
  const levelLabel = { attention: L("Needs Attention", "Perlu Perhatian"), watch: L("Watch Closely", "Pantau Ketat"), calm: L("Under Control", "Terkendali"), waiting: L("Waiting for Data", "Menunggu Data") }[level];
  const headline = level === "waiting"
    ? L(`No mentions in the last ${periodLabel} yet.`, `Belum ada percakapan dalam ${periodLabel} terakhir.`)
    : worst && worstShare >= 30
    ? L(`${worst.keyword} is under the most pressure: ${worstShare}% of ${fmt(worst.count)} mentions are negative.`, `${worst.keyword} paling disorot: ${worstShare}% dari ${fmt(worst.count)} percakapan bernada negatif.`)
    : L(`No keyword has a high negative share in the last ${periodLabel}.`, `Tidak ada kata kunci dengan porsi negatif tinggi dalam ${periodLabel} terakhir.`);
  const followUp = level === "waiting"
    ? L("Narriv checks your keywords every hour; results appear here as they arrive.", "Narriv memeriksa kata kunci Anda setiap jam; hasilnya muncul di sini begitu masuk.")
    : criticalAlerts > 0
    ? L(`${criticalAlerts} critical ${criticalAlerts === 1 ? "alert is" : "alerts are"} waiting for an owner.`, `${criticalAlerts} peringatan kritis menunggu ditangani.`)
    : openAlerts > 0
      ? L(`${openAlerts} ${openAlerts === 1 ? "alert is" : "alerts are"} still open.`, `${openAlerts} peringatan masih terbuka.`)
      : L("No open alerts.", "Tidak ada peringatan terbuka.");

  const kpis = [
    { v: fmt(total), l: L("Mentions", "Percakapan"), href: monitoringHref({ hours }), tone: "text-white" },
    { v: `${negativeShare}%`, l: L("Negative", "Negatif"), href: monitoringHref({ hours, sentiment: "negative" }), tone: negativeShare >= 30 ? "text-[#FF9C9C]" : "text-white" },
    { v: fmt(openAlerts), l: L("Open Alerts", "Peringatan Aktif"), href: "/alerts", tone: criticalAlerts > 0 ? "text-[#FF9C9C]" : "text-white" },
  ];

  return (
    <section aria-label={L("Monitoring overview", "Ringkasan pemantauan")} className="relative overflow-hidden rounded-[24px] bg-[#0B0F2E] px-4 pb-5 pt-8 text-white shadow-[0_20px_50px_-20px_rgba(16,19,52,0.6)] sm:px-8 sm:pb-7 sm:pt-10">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(109,124,255,0.45),transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-[300px] w-[500px] rounded-full bg-[radial-gradient(closest-side,rgba(192,132,252,0.18),transparent)]" />

      {/* Who this is about */}
      <div className="relative flex flex-col items-center text-center">
        <BrandMark name={brandName} logoUrl={logoUrl} small className="size-16 rounded-[20px] shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-4 ring-white/10" />
        <h2 className="mt-3 max-w-full truncate text-[24px] font-black leading-tight tracking-[-0.02em] sm:text-[30px]">{brandName}</h2>
        {/* The period is picked above the panel, so only the freshness is said here. */}
        {lastDataLabel ? <p className="mt-1 text-[12px] font-semibold text-white/55 sm:text-[13px]">{L(`Latest data ${lastDataLabel}`, `Data terbaru ${lastDataLabel}`)}</p> : null}
      </div>

      {/* The verdict, then the three numbers behind it */}
      <div className="relative mx-auto mt-7 flex max-w-3xl flex-col items-center text-center">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black", LEVEL_STYLE[level].chip)}>
          <span className={cn("size-1.5 rounded-full", LEVEL_STYLE[level].dot)} />
          {levelLabel}
        </span>
        <p className="mt-3 text-balance text-[19px] font-black leading-snug sm:text-[24px]">{headline}</p>
        <p className="mt-1.5 text-[13px] font-semibold text-white/60 sm:text-[14px]">{followUp}</p>
      </div>
      <div className="relative mx-auto mt-6 grid max-w-xl grid-cols-3">
        {kpis.map((k, i) => (
          <Link key={k.l} href={k.href} className={cn("group px-2 text-center", i > 0 && "bg-[linear-gradient(rgba(255,255,255,0.12),rgba(255,255,255,0.12))] bg-[length:1px_60%] bg-left bg-no-repeat")}>
            <p className={cn("text-[30px] font-black leading-none tabular-nums sm:text-[40px]", k.tone)}>{k.v}</p>
            <p className="mt-2 whitespace-nowrap text-[12px] font-bold text-white/55 group-hover:text-white">{k.l}</p>
          </Link>
        ))}
      </div>

      {/* Monitored keywords, most negative first */}
      {sorted.length ? (
        <div className="relative mt-9">
          <div className="text-center">
            <h3 className="text-[17px] font-black sm:text-[19px]">{L("Monitored Keywords", "Kata Kunci yang Dipantau")}</h3>
            <p className="mt-0.5 text-[12px] font-semibold text-white/50">{L("Highest negative share first", "Urut dari porsi negatif tertinggi")}</p>
          </div>
          <ul className="mt-4 divide-y divide-white/[0.07]">
            {sorted.map((k) => <KeywordRowItem key={k.keyword} k={k} hours={hours} />)}
          </ul>
        </div>
      ) : (
        <p className="relative mt-8 text-center text-[13px] font-semibold text-white/70">{L("No active keywords yet.", "Belum ada kata kunci aktif.")}</p>
      )}

      <div className="relative mt-5 flex justify-center">
        <Link href="/workspace/settings#keywords" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-[13px] font-bold text-[#101334] transition hover:bg-[#EEF1FF]">
          {L("Manage Keywords", "Atur Kata Kunci")}
        </Link>
      </div>
    </section>
  );
}
