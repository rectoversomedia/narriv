"use client";

import Link from "next/link";
import { BrandMark } from "@/components/dashboard/brand-hero";
import { monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { intlLocale } from "@/store/useUiStore";

export type KeywordRow = { keyword: string; count: number; negative: number; positive: number; neutral?: number; mixed?: number; last24h: number; daily?: number[] };

type Level = "attention" | "watch" | "calm" | "waiting";

const LEVEL_STYLE: Record<Level, { chip: string; dot: string; band: string; text: string }> = {
  attention: { chip: "bg-[#B42318] text-white", dot: "bg-white", band: "bg-[#B42318]", text: "text-[#B42318]" },
  watch: { chip: "bg-[#FFF4E5] text-[#A04606]", dot: "bg-[#F59E0B]", band: "bg-[#F59E0B]", text: "text-[#B45309]" },
  calm: { chip: "bg-[#E8F7EF] text-[#047857]", dot: "bg-[#10B981]", band: "bg-[#12A66A]", text: "text-[#047857]" },
  waiting: { chip: "bg-[#EEF1FF] text-[#3B52F5]", dot: "bg-[#465FFF] animate-pulse", band: "bg-[#465FFF]", text: "text-[#3B52F5]" },
};

/** Negative share of a keyword's records, rounded to a whole percent. */
const negShare = (k: KeywordRow) => (k.count > 0 ? Math.round((k.negative / k.count) * 100) : 0);
const shareTone = (share: number) => (share >= 50 ? "bg-[#B42318] text-white" : share >= 30 ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#E8F7EF] text-[#047857]");

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 120, h = 32;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 3 - (v / max) * (h - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="kwspark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#465FFF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#465FFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#kwspark)" />
      <polyline points={pts} fill="none" stroke="#465FFF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
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
    { n: k.positive, color: "#10B981", label: L("Positive", "Positif") },
    { n: neutral, color: "#94A3B8", label: L("Neutral", "Netral") },
    { n: k.mixed ?? 0, color: "#F59E0B", label: L("Mixed", "Campuran") },
    { n: k.negative, color: "#EF4444", label: L("Negative", "Negatif") },
  ];
  const share = negShare(k);
  const pct = (n: number) => (k.count > 0 ? Math.round((n / k.count) * 100) : 0);
  return (
    <li>
      <Link
        href={monitoringHref({ hours, q: k.keyword })}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-[14px] px-3 py-4 transition hover:bg-[#F7F8FC] sm:px-4 lg:grid-cols-[minmax(0,1fr)_130px_minmax(330px,1.7fr)_84px_84px_96px] lg:gap-x-5"
      >
        {/* Name */}
        <div className="min-w-0">
          <p className="truncate text-[16px] font-black text-[#101334] group-hover:text-[#3B52F5]">{k.keyword}</p>
          <p className="mt-0.5 text-[12px] font-bold text-[#3B52F5] opacity-0 transition group-hover:opacity-100">{L("See Mentions →", "Lihat Percakapan →")}</p>
        </div>
        {/* Negative share (top right on phones, last column on wide screens) */}
        <span className={cn("justify-self-end rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.04em] lg:order-last", shareTone(share))}>
          {share}% {L("Negative", "Negatif")}
        </span>
        {/* Trend */}
        <div className="col-span-2 lg:col-span-1">
          {k.daily?.some((v) => v > 0) ? <Sparkline values={k.daily} /> : <p className="text-[12px] font-semibold text-[#8A93AD]">{L("No Trend Yet", "Belum Ada Tren")}</p>}
          <p className="mt-0.5 font-mono text-[10px] font-medium text-[#8A93AD]">{L("Last 7 Days", "7 Hari Terakhir")}</p>
        </div>
        {/* Sentiment split */}
        <div className="col-span-2 lg:col-span-1">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[#EEF0F6]" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
            {k.count > 0 ? parts.filter((p) => p.n > 0).map((p) => <span key={p.label} style={{ width: `${(p.n / k.count) * 100}%`, backgroundColor: p.color }} />) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 lg:flex-nowrap lg:gap-x-2.5">
            {parts.map((p) => (
              <span key={p.label} className={cn("inline-flex items-center gap-1 text-[11px] font-semibold text-[#5F6B94]", p.n === 0 && "opacity-40")}>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label} <b className="font-mono font-bold tabular-nums text-[#101334]">{pct(p.n)}%</b>
              </span>
            ))}
          </div>
        </div>
        {/* Volume and new in 24 hours */}
        <div className="lg:text-right">
          <p className="text-[24px] font-black leading-none tabular-nums text-[#101334]">{fmt(k.count)}</p>
          <p className="mt-1 font-mono text-[10.5px] font-medium text-[#5F6B94]">{L("mentions", "percakapan")}</p>
        </div>
        <div className="text-right">
          <p className={cn("text-[24px] font-black leading-none tabular-nums", k.last24h > 0 ? "text-[#3B52F5]" : "text-[#C9D0E3]")}>{k.last24h > 0 ? `+${fmt(k.last24h)}` : "0"}</p>
          <p className="mt-1 font-mono text-[10.5px] font-medium text-[#5F6B94]">{L("new in 24h", "baru 24 jam")}</p>
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
    { v: fmt(total), l: L("Mentions", "Percakapan"), sub: L(`last ${periodLabel}`, `${periodLabel} terakhir`), href: monitoringHref({ hours }), tone: "text-[#101334]" },
    { v: `${negativeShare}%`, l: L("Negative", "Negatif"), sub: L("of all mentions", "dari semua percakapan"), href: monitoringHref({ hours, sentiment: "negative" }), tone: negativeShare >= 30 ? "text-[#B42318]" : "text-[#101334]" },
    { v: fmt(openAlerts), l: L("Open Alerts", "Peringatan Aktif"), sub: criticalAlerts > 0 ? L(`${criticalAlerts} critical`, `${criticalAlerts} kritis`) : L("none critical", "tidak ada yang kritis"), href: "/alerts", tone: criticalAlerts > 0 ? "text-[#B42318]" : openAlerts > 0 ? "text-[#B45309]" : "text-[#101334]" },
  ];
  const style = LEVEL_STYLE[level];
  // The headline with the keyword under pressure set in the level's colour.
  const headlineNode = level !== "waiting" && worst && worstShare >= 30
    ? <><span className={style.text}>{worst.keyword}</span>{L(` is under the most pressure: ${worstShare}% of ${fmt(worst.count)} mentions are negative.`, ` paling disorot: ${worstShare}% dari ${fmt(worst.count)} percakapan bernada negatif.`)}</>
    : headline;

  return (
    <section aria-label={L("Monitoring overview", "Ringkasan pemantauan")} className={cn(BOX, "overflow-hidden !p-0 text-[#101334]")}>
      <div className={cn("h-2", style.band)} />
      <div className="p-5 sm:p-7">
        {/* Who this is about, how fresh the data is, and the level. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark name={brandName} logoUrl={logoUrl} small className="size-12 shrink-0 rounded-[14px] shadow-[0_0_0_1.5px_#101334]" />
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-black leading-tight tracking-[-0.02em] sm:text-[22px]">{brandName}</h2>
              <p className="font-mono text-[11px] font-medium text-[#5F6B94]">
                {L(`Last ${periodLabel}`, `${periodLabel} terakhir`)}{lastDataLabel ? L(` · latest data ${lastDataLabel}`, ` · data terbaru ${lastDataLabel}`) : ""}
              </p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em]", style.chip)}>
            <span className={cn("size-1.5 rounded-full", style.dot)} />
            {levelLabel}
          </span>
        </div>

        {/* The verdict in one sentence. */}
        <p className="mt-5 max-w-4xl text-balance text-[24px] font-black leading-[1.2] tracking-[-0.03em] sm:text-[32px]">{headlineNode}</p>
        <p className="mt-2 text-[15px] font-semibold text-[#31406B]">{followUp}</p>

        {/* The three numbers behind it; each opens what it counts. */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((k) => (
            <Link key={k.l} href={k.href} className="group rounded-[14px] bg-[#F6F7FC] px-4 py-3.5 transition hover:bg-[#EEF1FF]">
              <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{k.l}</p>
              <p className={cn("mt-1 text-[32px] font-black leading-none tracking-[-0.03em] tabular-nums", k.tone)}>{k.v}</p>
              <p className="mt-1.5 flex items-center justify-between font-mono text-[11px] font-bold text-[#5F6B94]">{k.sub}<span className="text-[#3B52F5] opacity-0 transition group-hover:opacity-100">→</span></p>
            </Link>
          ))}
        </div>

        {/* Where to act. */}
        <div className="mt-5 flex flex-col gap-2.5 rounded-[18px] bg-[#101334] p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="px-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF] sm:mr-2">{L("Act On It", "Tindak Lanjuti")}</p>
          <Link href="/alerts" className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5]">
            {criticalAlerts > 0 ? L(`Handle ${criticalAlerts} Critical ${criticalAlerts === 1 ? "Alert" : "Alerts"}`, `Tangani ${criticalAlerts} Peringatan Kritis`) : openAlerts > 0 ? L(`Review ${openAlerts} Open Alerts`, `Tinjau ${openAlerts} Peringatan Aktif`) : L("Open Alerts", "Buka Peringatan")}
          </Link>
          <Link href={monitoringHref({ hours, sentiment: "negative", q: worst?.keyword })} className="inline-flex h-11 items-center justify-center rounded-[12px] border-[1.5px] border-white/80 px-5 text-[14px] font-black text-white transition hover:bg-white/10">
            {worst ? L(`Read Negative on ${worst.keyword}`, `Baca Negatif ${worst.keyword}`) : L("Read Negative Mentions", "Baca Percakapan Negatif")}
          </Link>
          <Link href="/workspace/settings#keywords" className="inline-flex h-11 items-center justify-center rounded-[12px] px-4 text-[14px] font-bold text-white/80 transition hover:bg-white/10 hover:text-white sm:ml-auto">
            {L("Manage Keywords", "Atur Kata Kunci")}
          </Link>
        </div>

        {/* Monitored keywords, most negative first */}
        {sorted.length ? (
          <div className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#EEF0F6] pb-3">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{L("Monitored Keywords", "Kata Kunci yang Dipantau")}</p>
                <h3 className="mt-1 text-[19px] font-black tracking-[-0.02em]">{L("Where The Pressure Is", "Di Mana Tekanannya")}</h3>
              </div>
              <p className="font-mono text-[11px] font-medium text-[#5F6B94]">{L("highest negative share first", "urut dari porsi negatif tertinggi")}</p>
            </div>
            <ul className="mt-1 divide-y divide-[#EEF0F6]">
              {sorted.map((k) => <KeywordRowItem key={k.keyword} k={k} hours={hours} />)}
            </ul>
          </div>
        ) : (
          <p className="mt-7 text-[14px] font-semibold text-[#5F6B94]">{L("No active keywords yet.", "Belum ada kata kunci aktif.")}</p>
        )}
      </div>
    </section>
  );
}
