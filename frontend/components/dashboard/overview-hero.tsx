"use client";

import { STATUS_WORD, statusFromMentions } from "@/lib/status";
import Link from "next/link";
import { BrandMark } from "@/components/dashboard/brand-hero";
import { monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { intlLocale } from "@/store/useUiStore";

export type KeywordRow = { keyword: string; count: number; negative: number; positive: number; neutral?: number; mixed?: number; last24h: number; daily?: number[] };

type Level = "attention" | "watch" | "calm" | "waiting";


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
    { n: k.negative, color: "#EF4444", label: L("Negative", "Negatif") },
    { n: k.mixed ?? 0, color: "#F59E0B", label: L("Mixed", "Campuran") },
    { n: neutral, color: "#CBD2E1", label: L("Neutral", "Netral") },
    { n: k.positive, color: "#10B981", label: L("Positive", "Positif") },
  ];
  const share = negShare(k);
  const pos = k.count > 0 ? Math.round((k.positive / k.count) * 100) : 0;
  return (
    <li>
      <Link
        href={monitoringHref({ hours, q: k.keyword })}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2.5 rounded-[14px] px-3 py-3.5 transition hover:bg-[#F7F8FC] sm:px-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_110px_90px] lg:gap-x-6"
      >
        <div className="min-w-0">
          <p className="truncate text-[15.5px] font-black text-[#101334] group-hover:text-[#3B52F5]">{k.keyword}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-[#5F6B94]">
            {fmt(k.count)} {L("mentions", "percakapan")}
            {k.last24h > 0 ? <span className="ml-1.5 rounded-full bg-[#EEF1FF] px-1.5 py-0.5 text-[11px] font-black text-[#3B52F5]">+{fmt(k.last24h)} {L("today", "hari ini")}</span> : null}
          </p>
        </div>
        <span className={cn("justify-self-end rounded-full px-2.5 py-1 text-[12px] font-black tabular-nums lg:order-last", shareTone(share))}>{share}% {L("neg.", "neg.")}</span>
        <div className="col-span-2 lg:col-span-1">
          <div className="flex h-2 overflow-hidden rounded-full bg-[#EEF0F6]" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
            {k.count > 0 ? parts.filter((p) => p.n > 0).map((p) => <span key={p.label} style={{ width: `${(p.n / k.count) * 100}%`, backgroundColor: p.color }} />) : null}
          </div>
          <p className="mt-1.5 text-[11.5px] font-semibold text-[#5F6B94]"><b className="text-[#B42318]">{share}%</b> {L("negative", "negatif")} · <b className="text-[#047857]">{pos}%</b> {L("positive", "positif")}</p>
        </div>
        <div className="hidden lg:block">{k.daily?.some((v) => v > 0) ? <Sparkline values={k.daily} /> : null}</div>
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
  openAlerts: openAlertsIn,
  criticalAlerts,
  hours,
  periodLabel,
  lastDataLabel,
  analysed,
  prevNegativeShare,
}: {
  brandName: string;
  logoUrl?: string | null;
  keywords: KeywordRow[];
  total: number;
  negativeShare: number;
  /** null while the alert list is loading or failed: shown as "—", never as a reassuring 0. */
  openAlerts: number | null;
  criticalAlerts: number;
  hours: MonitoringPeriod;
  periodLabel: string;
  lastDataLabel: string | null;
  /** Mentions with a sentiment label; 0 while the first batch is still being read. */
  analysed?: number;
  /** Negative share in the same-length period just before, or null when it had no scored mentions. */
  prevNegativeShare?: number | null;
}) {
  const L = useL();
  const fmt = (n: number) => n.toLocaleString(intlLocale());
  const alertsKnown = openAlertsIn !== null;
  const openAlerts = openAlertsIn ?? 0;
  const sorted = [...keywords].sort((a, b) => negShare(b) - negShare(a) || b.count - a.count);
  const worst = sorted.find((k) => k.count >= 5 && k.negative > 0) ?? null;
  const worstShare = worst ? negShare(worst) : 0;

  // No mentions yet is not "under control": it says the first data is still on its way.
  // Mentions in but none read yet: 0% negative would say "Under Control" before anything was judged.
  const analysing = total > 0 && analysed === 0 && criticalAlerts === 0;
  // The shared status (lib/status): the same three words as the Daily Brief, Analysis and Reports.
  const status = statusFromMentions({ negativeShare, worstShare, criticalAlerts, openAlerts });
  const level: Level = (total === 0 && openAlerts === 0) || analysing ? "waiting" : status === "action" ? "attention" : status === "watch" ? "watch" : "calm";
  const levelLabel = { attention: L(...STATUS_WORD.action), watch: L(...STATUS_WORD.watch), calm: L(...STATUS_WORD.safe), waiting: analysing ? L("Being Analysed", "Sedang Dianalisis") : L("Waiting for Data", "Menunggu Data") }[level];
  const headline = analysing
    ? L(`${fmt(total)} mentions are in; Narriv is reading their tone now.`, `${fmt(total)} percakapan sudah masuk; Narriv sedang membaca nadanya.`)
    : level === "waiting"
    ? L(`No mentions in the last ${periodLabel} yet.`, `Belum ada percakapan dalam ${periodLabel} terakhir.`)
    : worst && worstShare >= 30
    ? L(`${worst.keyword} is under the most pressure. ${worstShare}% of ${fmt(worst.count)} mentions are negative.`, `${worst.keyword} paling disorot. ${worstShare}% dari ${fmt(worst.count)} percakapan bernada negatif.`)
    : L(`No keyword has a high negative share in the last ${periodLabel}.`, `Tidak ada kata kunci dengan porsi negatif tinggi dalam ${periodLabel} terakhir.`);
  const followUp = analysing
    ? L("The verdict appears here once they are scored, usually within the hour.", "Kesimpulan muncul di sini setelah dinilai, biasanya dalam satu jam.")
    : level === "waiting"
    ? L("Narriv checks your keywords every hour. Results appear here as they arrive.", "Narriv memeriksa kata kunci Anda setiap jam. Hasilnya muncul di sini begitu masuk.")
    : criticalAlerts > 0
    ? L(`${criticalAlerts} critical ${criticalAlerts === 1 ? "alert is" : "alerts are"} waiting for an owner.`, `${criticalAlerts} peringatan kritis menunggu ditangani.`)
    : !alertsKnown
      ? L("Loading alerts…", "Memuat peringatan…")
      : openAlerts > 0
      ? L(`${openAlerts} ${openAlerts === 1 ? "alert is" : "alerts are"} still open.`, `${openAlerts} peringatan masih terbuka.`)
      : L("No open alerts.", "Tidak ada peringatan terbuka.");

  const kpis = [
    { v: fmt(total), l: L("Mentions", "Percakapan"), sub: L(`last ${periodLabel}`, `${periodLabel} terakhir`), href: monitoringHref({ hours }), dark: "text-white" },
    // Compared with the period before, so "41%" can be read as better or worse.
    { v: `${negativeShare}%`, l: L("Negative", "Negatif"), sub: prevNegativeShare == null ? L("of all mentions", "dari semua percakapan") : negativeShare === prevNegativeShare ? L(`same as the period before`, `sama dengan periode sebelumnya`) : L(`${negativeShare > prevNegativeShare ? "▲ up" : "▼ down"} from ${prevNegativeShare}% before`, `${negativeShare > prevNegativeShare ? "▲ naik" : "▼ turun"} dari ${prevNegativeShare}% sebelumnya`), href: monitoringHref({ hours, sentiment: "negative" }), dark: negativeShare >= 30 ? "text-[#FF8A8D]" : "text-white" },
    { v: alertsKnown ? fmt(openAlerts) : "—", l: L("Open Alerts", "Peringatan Aktif"), sub: !alertsKnown ? L("loading…", "memuat…") : criticalAlerts > 0 ? L(`${criticalAlerts} critical`, `${criticalAlerts} kritis`) : L("none critical", "tidak ada yang kritis"), href: "/alerts", dark: criticalAlerts > 0 ? "text-[#FF8A8D]" : openAlerts > 0 ? "text-[#FCD34D]" : "text-white" },
  ];
  const chip = { attention: "bg-[#E5484D] text-white", watch: "bg-[#F59E0B] text-[#101334]", calm: "bg-[#12A66A] text-white", waiting: "bg-white/15 text-white" }[level];
  const accent = { attention: "text-[#FF8A8D]", watch: "text-[#FCD34D]", calm: "text-[#86EFAC]", waiting: "text-[#A5B4FF]" }[level];
  const verdict = level !== "waiting" && worst && worstShare >= 30
    ? <><span className={accent}>{worst.keyword}</span>{L(" is under the most pressure.", " paling disorot.")}</>
    : headline;
  const subline = level !== "waiting" && worst && worstShare >= 30
    ? L(`${worstShare}% of the ${fmt(worst.count)} mentions about ${worst.keyword} are negative. ${followUp}`, `${worstShare}% dari ${fmt(worst.count)} percakapan soal ${worst.keyword} bernada negatif. ${followUp}`)
    : followUp;

  return (
    <div className="grid gap-4 sm:gap-5">
      <section aria-label={L("Monitoring overview", "Ringkasan pemantauan")} className="relative overflow-hidden rounded-[22px] border-[1.5px] border-[#101334] bg-[#0B0F2A] text-white shadow-[0_4px_0_#101334]">
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(70,95,255,.45),transparent_65%)]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[380px] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,.22),transparent_65%)]" />
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-8">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-3">
              <BrandMark name={brandName} logoUrl={logoUrl} small className="size-11 shrink-0 rounded-[13px] ring-2 ring-white/20" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[18px] font-black leading-tight">{brandName}</h2>
                <p className="text-[12px] font-medium text-white/55">{L(`Last ${periodLabel}`, `${periodLabel} terakhir`)}{lastDataLabel ? L(` · latest data ${lastDataLabel}`, ` · data terbaru ${lastDataLabel}`) : ""}</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black", chip)}>
                <span className={cn("size-1.5 rounded-full bg-current", level === "waiting" && "animate-pulse")} />{levelLabel}
              </span>
            </div>
            <p className="mt-6 max-w-2xl text-balance text-[28px] font-black leading-[1.12] tracking-[-0.035em] sm:text-[36px]">{verdict}</p>
            <p className="mt-3 max-w-2xl text-[15px] font-medium leading-relaxed text-white/70">{subline}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5 lg:mt-auto lg:pt-6">
              <Link href="/alerts" className="inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-[#465FFF] px-5 sm:w-auto text-[14px] font-black text-white shadow-[0_3px_0_rgba(0,0,0,.35)] transition hover:bg-[#3B52F5]">
                {criticalAlerts > 0 ? L(`Handle ${criticalAlerts} Critical ${criticalAlerts === 1 ? "Alert" : "Alerts"}`, `Tangani ${criticalAlerts} Peringatan Kritis`) : openAlerts > 0 ? L(`Review ${openAlerts} Open Alerts`, `Tinjau ${openAlerts} Peringatan Aktif`) : L("Open Alerts", "Buka Peringatan")}
              </Link>
              <Link href={monitoringHref({ hours, sentiment: "negative", q: worst?.keyword })} className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border border-white/30 bg-white/[0.04] px-5 sm:w-auto text-[14px] font-black text-white transition hover:bg-white/10">
                {worst ? L(`Read Negative on ${worst.keyword}`, `Baca Negatif ${worst.keyword}`) : L("Read Negative Mentions", "Baca Percakapan Negatif")}
              </Link>
              <Link href="/workspace/settings#keywords" className="inline-flex h-11 w-full items-center justify-center px-2 text-[13.5px] font-bold text-white/60 sm:w-auto transition hover:text-white">{L("Manage keywords", "Atur kata kunci")}</Link>
            </div>
          </div>
          <div className="grid content-start gap-3">
            {kpis.map((k) => (
              <Link key={k.l} href={k.href} className="group flex items-center justify-between gap-4 rounded-[16px] border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur transition hover:border-white/25 hover:bg-white/[0.1]">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-white/60">{k.l}</p>
                  <p className="mt-1 text-[12.5px] font-semibold text-white/45">{k.sub}</p>
                </div>
                <p className={cn("text-[34px] font-black leading-none tracking-[-0.03em] tabular-nums", k.dark)}>{k.v}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {sorted.length ? (
        <section className={cn(BOX, "!px-3 !py-4 sm:!px-4 sm:!py-5")}>
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pb-2 sm:px-4">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#465FFF]">{L("Monitored keywords", "Kata kunci dipantau")}</p>
              <h3 className="mt-1 text-[19px] font-black tracking-[-0.02em] text-[#101334]">{L("Where the pressure is", "Di mana tekanannya")}</h3>
            </div>
            <p className="text-[12px] font-medium text-[#5F6B94]">{L("Highest negative share first", "Urut dari porsi negatif tertinggi")}</p>
          </div>
          <ul className="divide-y divide-[#EEF0F6]">
            {sorted.map((k) => <KeywordRowItem key={k.keyword} k={k} hours={hours} />)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
