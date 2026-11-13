"use client";

import Link from "next/link";
import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BellRing, Building2, Check, ChevronDown, Clock3, FileText, LineChart, Megaphone, Minus, Radar, Sparkles, UserCheck, type LucideIcon } from "lucide-react";
import { DemoPicker } from "@/components/auth/demo-picker";
import { CountUp, NI_CLASS, NI_MARK, NI_TEXT, NarrativeField, NarrativeIntelligence, Reveal, Typewriter, useInView, type TypeSegment } from "@/components/marketing/motion";
import { INK, SERIF as serif, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { UseCases } from "@/components/marketing/use-cases";
import { AI_ENGINES } from "@/components/ui/ai-engines";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { useSiteHref } from "@/lib/site-lang";
import { cn } from "@/lib/utils";

// The public landing page, served at "/" to visitors who are not signed in (see proxy.ts).
// Every number on it is either a product fact or labelled as sample data from the fictional demo bank.
// Look: the Narriv signature (globals.css): ink night sections and dotted paper, ink-outlined cards on a solid
// shadow, the brush marker behind each headline's key words, a ribbon of what Narriv does, and quiet motion
// (components/marketing/motion.tsx) that holds still for visitors who ask for reduced motion.

/** The accent line of a headline on a dark section, with a slow sheen. */
const ACCENT_DARK = "bg-gradient-to-r from-[#8EA0FF] via-[#D8B4FE] to-[#8EA0FF] bg-clip-text text-transparent mk-shine";
/** The accent line of a headline on paper: the brush marker behind it. */
const ACCENT_LIGHT = "mk-brush";

/** Opens the demo picker; the visitor chooses the case (brand, government, CVE) before the app opens. */
function DemoButton({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex w-full flex-col items-center gap-1.5 sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-7 text-[15px] font-bold transition active:scale-[0.98] sm:w-auto", className)}
      >
        {children}
      </button>
      <DemoPicker open={open} onClose={() => setOpen(false)} />
    </span>
  );
}

/** What sets Narriv apart, shown under the hero. */
const USPS: { icon: LucideIcon; title: [string, string]; body: [string, string] }[] = [
  { icon: Clock3, title: ["Hourly Monitoring", "Pemantauan Tiap Jam"], body: ["News, YouTube and social media, scanned automatically.", "Berita, YouTube, dan media sosial dipindai otomatis."] },
  { icon: BellRing, title: ["Instant Alerts", "Peringatan Instan"], body: ["Critical issues go straight to the right team by email.", "Isu kritis langsung dikirim ke email tim terkait."] },
  { icon: FileText, title: ["Board-Ready Reports", "Laporan untuk Direksi"], body: ["A one-page PDF brief every Monday morning.", "Ringkasan PDF satu halaman setiap Senin pagi."] },
  { icon: Sparkles, title: ["AI Visibility", "Visibilitas di AI"], body: ["How AI assistants describe and recommend your brand.", "Cara asisten AI menyebut dan merekomendasikan brand Anda."] },
];

/** The ribbon under the hero. */
const RIBBON: [string, string][] = [
  ["Monitor Every Hour", "Pantau Setiap Jam"],
  ["Detect Risk Early", "Deteksi Risiko Lebih Awal"],
  ["News · Social · YouTube · AI", "Berita · Sosial · YouTube · AI"],
  ["Alert the Right Owner", "Kabari Penanggung Jawab"],
  ["Act Before It Spreads", "Bertindak Sebelum Menyebar"],
  ["Board-Ready Every Monday", "Siap untuk Direksi Setiap Senin"],
];

/** An ink-outlined card on the paper sections. */
const CARD = "rounded-[24px] border-[1.5px] border-[#101334] bg-white shadow-[0_5px_0_#101334]";

/** The logos of the AI assistants, overlapping, for the hero's AI chip. */
function EngineStack({ size = "size-7" }: { size?: string }) {
  return (
    <span className="flex -space-x-2">
      {AI_ENGINES.slice(0, 4).map(({ key, Logo }) => (
        <span key={key} className={cn("flex items-center justify-center rounded-full bg-white p-1 shadow-[0_0_0_2px_#fff,0_2px_6px_rgba(16,19,52,0.15)]", size)}>
          <Logo className="size-full" />
        </span>
      ))}
    </span>
  );
}

/**
 * The product, composed so it explains itself: a dashboard window (brand, risk, a spike with its cause, the sources
 * and the top issues), the alert it raised with an owner, and the AI visibility score. Sample data.
 */
function ProductStage() {
  const L = useL();
  const days = [9, 11, 10, 12, 11, 14, 13, 15, 14, 18, 31, 44];
  const max = Math.max(...days);
  const x = (i: number) => (i / (days.length - 1)) * 300;
  const y = (v: number) => 78 - (v / max) * 66;
  const path = days.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const sources = [
    { key: "news", n: 84 },
    { key: "instagram", n: 46 },
    { key: "tiktok", n: 37 },
    { key: "youtube", n: 31 },
    { key: "x", n: 19 },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[880px] lg:mx-0">
      {/* A slow turning halo behind the window, after the Narriv orb */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[130%] max-w-[1000px] -translate-x-1/2 -translate-y-1/2">
        <div className="mk-ring size-full rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(109,124,255,0.35)_70deg,transparent_140deg,rgba(216,180,254,0.3)_220deg,transparent_300deg)] blur-3xl" />
      </div>

      <div className="relative pt-8">
        {/* Window */}
        <div className="mk-pop relative overflow-hidden rounded-[22px] bg-[#0E1335]/80 p-1.5 shadow-[0_40px_120px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur" style={{ "--mk-delay": "150ms" } as CSSProperties}>
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="ml-3 truncate text-[11px] font-semibold text-white/40">narriv.digital</span>
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-white/70">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#4ADE80]" />
                <span className="relative size-1.5 rounded-full bg-[#4ADE80]" />
              </span>
              {L("Live", "Langsung")}
            </span>
          </div>
          <div className="rounded-[17px] bg-[#FBFAF7] p-4 text-[#101334] sm:p-5">
            <div className="flex items-start justify-between gap-3 text-left">
              <div>
                <p className="text-[18px] font-black">Bank Arunika</p>
                <p className="text-[11px] font-semibold text-[#8A8F9E]">{L("Sample Data · Fictional Brand", "Data Contoh · Brand Fiktif")}</p>
              </div>
              <span className="rounded-full bg-[#FDECEC] px-2.5 py-1 text-[11px] font-black text-[#B42318]">{L("High Risk", "Risiko Tinggi")}</span>
            </div>

            {/* Stacked: the card sits in the hero's right column on desktop, too narrow for two inner columns. */}
            <div>
              <div>
                <div className="mt-4 grid grid-cols-3 divide-x divide-[#ECEAE3] text-left">
                  {[
                    { v: 217, l: L("Mentions (30 Days)", "Percakapan (30 Hari)") },
                    { v: 42, suffix: "%", l: L("Negative", "Negatif"), tone: "text-[#B42318]" },
                    { v: 6, l: L("Open Alerts", "Peringatan Aktif") },
                  ].map((s) => (
                    <div key={s.l} className="px-3 first:pl-0">
                      <CountUp to={s.v} suffix={s.suffix} className={cn("block text-[24px] font-black leading-none", s.tone)} />
                      <p className="mt-1 text-[11px] font-semibold text-[#6B7080]">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* The spike, named (from small tablets up: on a phone the card stays short so the first screen is whole) */}
                <div className="relative mt-4 hidden sm:block">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-left">
                    <p className="text-[11px] font-bold text-[#6B7080]">{L("Mentions per Day", "Percakapan per Hari")}</p>
                    <span className="mk-fill-in rounded-full bg-[#101334] px-2.5 py-1 text-[10px] font-black text-white">{L("3× in 24 Hours · App Outage", "Naik 3× dalam 24 Jam · Gangguan Aplikasi")}</span>
                  </div>
                  <div className="relative mt-1">
                    <div className="mk-wipe">
                    <svg viewBox="0 0 300 82" preserveAspectRatio="none" className="h-[72px] w-full overflow-visible lg:h-[96px]" aria-hidden="true">
                      <defs>
                        <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0" stopColor="#E5484D" stopOpacity="0.22" />
                          <stop offset="1" stopColor="#E5484D" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,82 ${path} 300,82`} fill="url(#sparkfill)" />
                      <polyline points={path} fill="none" stroke="#E5484D" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                    </div>
                    {/* The latest point, drawn outside the stretched chart so it stays round */}
                    <span aria-hidden="true" className="mk-fill-in absolute right-0 flex size-3 -translate-y-1/2 translate-x-1/2" style={{ top: `${(y(max) / 82) * 100}%` }}>
                      <span className="absolute inset-0 animate-ping rounded-full bg-[#E5484D] opacity-50" />
                      <span className="relative size-3 rounded-full border-[2.5px] border-[#FBFAF7] bg-[#E5484D]" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden text-left sm:block">
                {/* Where it came from */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#ECEAE3] pt-3">
                  {sources.map((src) => (
                    <span key={src.key} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#31406B]">
                      <PlatformIcon platform={src.key} className="size-3.5" />
                      {src.n}
                    </span>
                  ))}
                </div>

                {/* Top issues */}
                <ul className="mt-3 space-y-1.5">
                  {[
                    { t: L("Arunika Mobile Outage at Peak Hours", "Gangguan Arunika Mobile di Jam Sibuk"), s: L("Negative", "Negatif"), tone: "bg-[#FDECEC] text-[#B42318]", n: 46 },
                    { t: L("SME Programme Praised", "Program UMKM Diapresiasi"), s: L("Positive", "Positif"), tone: "bg-[#E8F7F0] text-[#047857]", n: 34 },
                    { t: L("Interbank Transfer Fees", "Biaya Transfer Antarbank"), s: L("Neutral", "Netral"), tone: "bg-[#F1F0EC] text-[#5B6070]", n: 21 },
                  ].map((it, i) => (
                    <li key={it.t} className="mk-pop flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(16,19,52,0.06)]" style={{ "--mk-delay": `${700 + i * 150}ms` } as CSSProperties}>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{it.t}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black", it.tone)}>{it.s}</span>
                      <span className="w-6 shrink-0 text-right text-[12px] font-black tabular-nums">{it.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Room for the alert that overlaps the window's bottom edge. */}
            <div className="h-12" aria-hidden="true" />
          </div>
        </div>

        {/* The alert it raised */}
        <div className="mk-pop relative mx-auto -mt-12 w-[calc(100%-2rem)] max-w-[420px]" style={{ "--mk-delay": "1300ms" } as CSSProperties}>
          <div className="mk-float-slow rounded-[18px] bg-white p-4 text-left text-[#101334] shadow-[0_24px_60px_rgba(5,8,30,0.45)]">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#E5484D] opacity-60" />
                <span className="relative size-2.5 rounded-full bg-[#E5484D]" />
              </span>
              <span className="text-[11px] font-black text-[#B42318]">{L("Critical Alert · Sent by Email", "Peringatan Kritis · Terkirim via Email")}</span>
            </div>
            <p className="mt-1.5 text-[14px] font-black leading-snug">{L("Arunika Mobile Outage at Peak Hours", "Gangguan Arunika Mobile di Jam Sibuk")}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7080]"><UserCheck size={13} aria-hidden="true" /> {L("Owner: Digital Team · Due in 4 Hours", "Penanggung Jawab: Tim Digital · Tenggat 4 Jam")}</p>
          </div>
        </div>

        {/* AI visibility score, over the window's top corner */}
        <div className="mk-pop absolute right-2 -top-3 sm:-right-8 sm:-top-2 lg:right-2 xl:-right-6" style={{ "--mk-delay": "900ms" } as CSSProperties}>
          <div className="mk-float flex items-center gap-3 rounded-[18px] bg-white py-2.5 pl-3 pr-4 text-left text-[#101334] shadow-[0_24px_60px_rgba(5,8,30,0.5)]">
            <EngineStack />
            <div>
              <p className="text-[11px] font-black text-[#6B7080]">{L("AI Visibility", "Visibilitas AI")}</p>
              <p className="mt-0.5 text-[22px] font-black leading-none sm:text-[26px]"><CountUp to={62} /><span className="text-[12px] font-bold text-[#8A8F9E]">/100</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A sample of what Narriv asks the AI assistants, and the answer it reads back. */
function AiConversation() {
  const L = useL();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [asked, setAsked] = useState(false);
  const [answered, setAnswered] = useState(false);
  return (
    <div ref={ref} className={cn("mk-reveal flex flex-col gap-3 text-left", inView && "is-in")}>
      <div className="ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-[#465FFF] px-4 py-3 text-[14px] font-semibold leading-relaxed text-white shadow-[0_12px_30px_rgba(70,95,255,0.35)]">
        <Typewriter delay={500} speed={30} onDone={() => setAsked(true)} segments={[{ text: L("Which digital bank in Indonesia is most reliable for small businesses?", "Bank digital apa yang paling andal untuk usaha kecil di Indonesia?") }]} />
      </div>
      <div className={cn("mk-after max-w-[92%]", asked && "is-in")}>
      <div className="rounded-[20px] rounded-bl-md bg-white/[0.07] px-4 py-3 text-[14px] font-medium leading-relaxed text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur">
        <span className="mb-2 flex items-center gap-2 text-[12px] font-bold text-white/50">
          <EngineStack size="size-6" />
          {L("AI assistant", "Asisten AI")}
        </span>
        {asked ? (
          <Typewriter
            delay={350}
            speed={22}
            onDone={() => setAnswered(true)}
            segments={[
              { text: L("Popular options include ", "Beberapa pilihan populer antara lain ") },
              { text: "Bank Arunika", className: "font-bold", mark: "rounded bg-[#FDE68A] px-0.5 text-[#101334]" },
              { text: L(", known for its SME programme, though some users report app outages at peak hours…", ", yang dikenal lewat program UMKM-nya, meski sebagian pengguna melaporkan gangguan aplikasi di jam sibuk…") },
            ]}
          />
        ) : null}
      </div>
      </div>
      <div className={cn("mk-after flex flex-wrap gap-2 pl-1", answered && "is-in")}>
        <span className="rounded-full bg-[#4ADE80]/15 px-2.5 py-1 text-[11px] font-bold text-[#86EFAC]">{L("Mentioned", "Disebut")}</span>
        <span className="rounded-full bg-[#A5B4FF]/15 px-2.5 py-1 text-[11px] font-bold text-[#C7D2FE]">{L("Ranked 2nd of 4", "Peringkat 2 dari 4")}</span>
        <span className="rounded-full bg-[#F87171]/15 px-2.5 py-1 text-[11px] font-bold text-[#FCA5A5]">{L("Negative Note: Outages", "Catatan Negatif: Gangguan")}</span>
      </div>
    </div>
  );
}

/** The scores per AI assistant, bars growing in when visible. Sample scores from the demo bank. */
function AiScoreboard() {
  const L = useL();
  const [ref, inView] = useInView<HTMLDivElement>();
  const geo = [62, 48, 55, 71, 34];
  return (
    <div ref={ref} className={cn("w-full rounded-[26px] bg-white/[0.04] p-5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur sm:p-7", inView && "is-in")}>
      <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3 text-[12px] font-bold text-white/45">
        <span>{L("AI assistant", "Asisten AI")}</span>
        <span>{L("Visibility Score · Sample", "Skor Visibilitas · Contoh")}</span>
      </div>
      <ol>
        {AI_ENGINES.map((engine, i) => {
          const Logo = engine.Logo;
          const score = geo[i] ?? 0;
          return (
            <li key={engine.key} className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-b border-white/10 py-4 last:border-b-0 last:pb-0">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white p-1.5"><Logo className="size-full" /></span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-white">{engine.name}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("mk-bar h-full rounded-full", score >= 60 ? "bg-[#4ADE80]" : score >= 45 ? "bg-[#A5B4FF]" : "bg-[#F87171]")}
                    style={{ width: `${score}%`, "--mk-delay": `${i * 120}ms` } as CSSProperties}
                  />
                </div>
              </div>
              <span className="w-12 text-right text-[24px] font-black leading-none text-white">{inView ? <CountUp to={score} /> : score}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Ordinary monitoring against Narriv, row by row: the left side muted, Narriv's side lit. */
function Comparison() {
  const L = useL();
  const rows: [string, string][] = [
    [L("Counts mentions", "Menghitung jumlah sebutan"), L("Assesses risk and explains what is driving it", "Menilai risiko dan menjelaskan pemicunya")],
    [L("Social media only", "Hanya media sosial"), L("News, YouTube, social media and AI answers", "Berita, YouTube, media sosial, dan jawaban AI")],
    [L("Requires constant dashboard monitoring", "Menuntut pemantauan dashboard terus-menerus"), L("Proactive alerts the moment an issue emerges", "Peringatan proaktif begitu isu muncul")],
    [L("Stops at charts", "Berhenti di grafik"), L("Alerts with a clear owner and response plan", "Peringatan dengan penanggung jawab dan rencana respons")],
    [L("Manual exports and reporting", "Ekspor data dan laporan manual"), L("Board-ready briefing every Monday", "Ringkasan siap direksi setiap Senin")],
  ];
  return (
    <Reveal className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-[28px] border-[1.5px] border-[#101334] shadow-[0_6px_0_#101334] lg:mt-16">
      {/* The two halves: paper for ordinary monitoring, ink for Narriv. Rows sit across both so each pair lines up. */}
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-white" />
      <div aria-hidden="true" className={cn("absolute inset-y-0 right-0 w-1/2 overflow-hidden", INK)}>
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(109,124,255,0.5),transparent)]" />
        <div className="absolute -bottom-24 -left-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(216,180,254,0.25),transparent)]" />
      </div>
      <div className="relative grid grid-cols-2 gap-x-6 gap-y-3 px-3 py-6 sm:gap-x-16 sm:px-8 sm:py-8">
        <p className="pb-2 text-center text-[13px] font-bold text-[#8A8F9E] sm:text-[15px]">{L("Conventional Monitoring", "Monitoring Konvensional")}</p>
        <p className="flex items-center justify-center gap-2 pb-2 text-[13px] font-black text-white sm:text-[15px]">
          <img src="/brand/favicon-orb-48.png" alt="" width={22} height={22} className="size-[22px] rounded-full" />
          Narriv
        </p>
        {rows.map(([plain, narriv], i) => (
          <Fragment key={plain}>
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#F6F5F1] px-3 py-3 text-[13px] font-semibold leading-snug text-[#8A8F9E] sm:gap-3 sm:px-4 sm:py-4 sm:text-[15px]">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#E4E2DA] text-[#8A8F9E]"><Minus size={12} strokeWidth={3} aria-hidden="true" /></span>
              {plain}
            </div>
            <div className="mk-reveal-row flex items-center gap-2.5 rounded-2xl bg-white/[0.07] px-3 py-3 text-[13px] font-bold leading-snug text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] sm:gap-3 sm:px-4 sm:py-4 sm:text-[15px]" style={{ "--mk-delay": `${300 + i * 120}ms` } as CSSProperties}>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4ADE80] to-[#22C55E] text-[#052e16]"><Check size={12} strokeWidth={3.5} aria-hidden="true" /></span>
              {narriv}
            </div>
          </Fragment>
        ))}
      </div>
    </Reveal>
  );
}

/** A headline over a short lead, centred. */
/** `accent` may be segments of its own, to set a phrase apart inside the accent line. */
function SectionHead({ title, accent, lead, dark = false, stacked = false }: { title: string; accent: string | TypeSegment[]; lead?: string; dark?: boolean; stacked?: boolean }) {
  const [typed, setTyped] = useState(false);
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className={cn("text-balance text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[46px]", dark && "text-white")}>
        <Typewriter
          onDone={() => setTyped(true)}
          segments={[
            { text: `${title} ` },
            ...(typeof accent === "string"
              ? [{ text: accent, className: cn(dark ? ACCENT_DARK : ACCENT_LIGHT, serif), block: stacked }]
              : accent.map((seg, i) => ({ ...seg, className: seg.className ?? cn(dark ? ACCENT_DARK : ACCENT_LIGHT, serif), breakBefore: stacked && i === 0 }))),
          ]}
        />
      </h2>
      {lead ? <p className={cn("mk-after mx-auto mt-4 max-w-xl text-balance text-[16px] font-medium leading-relaxed sm:text-[17px]", dark ? "text-white/60" : "text-[#5B6070]", typed && "is-in")}>{lead}</p> : null}
    </div>
  );
}

export default function WelcomePage() {
  const L = useL();
  const href = useSiteHref();

  const steps = [
    {
      icon: Radar,
      title: L("Monitor", "Pantau"),
      text: L("Every hour, Narriv scans news, YouTube and social media, and scores the sentiment of each mention.", "Setiap jam, Narriv memindai berita, YouTube, dan media sosial, lalu menilai sentimen setiap percakapan."),
      ui: (
        <div className="flex items-start gap-3">
          <PlatformIcon platform="news" className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{L("Customers Report Login Failures on Payday", "Nasabah Keluhkan Gagal Login saat Gajian")}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8A8F9E]">{L("Online News · 12 min ago", "Berita Online · 12 menit lalu")}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] font-black text-[#B42318]">{L("Negative", "Negatif")}</span>
        </div>
      ),
    },
    {
      icon: BellRing,
      title: L("Alert", "Peringatkan"),
      text: L("Emerging issues become alerts with a risk level, an owner and a deadline, delivered by email.", "Isu yang berkembang menjadi peringatan lengkap dengan tingkat risiko, penanggung jawab, dan tenggat, lalu dikirim via email."),
      ui: (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="rounded-md bg-[#B42318] px-1.5 py-0.5 text-[10px] font-black text-white">{L("Critical", "Kritis")}</span>
          <p className="text-[13px] font-bold">{L("Login Complaints Rising Sharply", "Keluhan Login Naik Tajam")}</p>
          <p className="flex items-center gap-1 text-[12px] font-semibold text-[#6B7080]"><UserCheck size={13} aria-hidden="true" /> {L("Digital Team · 4 Hours", "Tim Digital · 4 Jam")}</p>
        </div>
      ),
    },
    {
      icon: FileText,
      title: L("Report", "Laporkan"),
      text: L("Every Monday, leadership receives a one-page briefing on what changed and what requires a decision.", "Setiap Senin, pimpinan menerima ringkasan satu halaman berisi perubahan utama dan keputusan yang diperlukan."),
      ui: (
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#101334] text-white"><FileText size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{L("Weekly Board Report.pdf", "Laporan Mingguan Direksi.pdf")}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8A8F9E]">{L("Negative Share −1 pt · 3 Decisions Required", "Porsi Negatif −1 Poin · 3 Keputusan")}</p>
          </div>
        </div>
      ),
    },
  ];

  const faqs = [
    { q: L("How Soon Will I See Results?", "Seberapa Cepat Hasilnya Terlihat?"), a: L("Initial results from news and YouTube arrive within about a minute of setup. Narriv then checks every hour.", "Hasil awal dari berita dan YouTube tersedia sekitar satu menit setelah pengaturan. Selanjutnya, Narriv memeriksa setiap jam.") },
    { q: L("Which Sources Does Narriv Monitor?", "Sumber Apa Saja yang Dipantau?"), a: L("Indonesian online news and YouTube are active from day one. Instagram, TikTok, X and Facebook are enabled according to your plan.", "Berita online Indonesia dan YouTube aktif sejak hari pertama. Instagram, TikTok, X, dan Facebook diaktifkan sesuai paket.") },
    { q: L("How Is Narriv Different From Social Listening?", "Apa Bedanya dengan Social Listening?"), a: L("Most tools stop at charts. Narriv turns a rising issue into an alert with an owner and a deadline, suggests a response plan, and prepares the board report.", "Kebanyakan tool berhenti di grafik. Narriv mengubah isu yang meningkat menjadi peringatan dengan penanggung jawab dan tenggat, menyarankan rencana respons, dan menyiapkan laporan untuk direksi.") },
    { q: L("How Reliable Is the AI Analysis?", "Seberapa Akurat Analisis AI-nya?"), a: L("Every mention links to its original source, and your team can correct any sentiment in one click.", "Setiap percakapan tertaut ke sumber aslinya, dan tim Anda dapat mengoreksi sentimen dengan satu klik.") },
    { q: L("Is Our Data Kept Separate?", "Apakah Data Kami Terpisah?"), a: L("Each client has its own workspace. Members see only the workspaces they are invited to, and every change is recorded in the activity log.", "Setiap klien memiliki workspace sendiri. Anggota hanya dapat mengakses workspace tempat mereka diundang, dan setiap perubahan tercatat di riwayat aktivitas.") },
    { q: L("Can We Try It First?", "Apakah Bisa Dicoba Terlebih Dahulu?"), a: L("Yes. Explore the live demo without registering, or start a 14-day trial with your own brand.", "Bisa. Akses demo langsung tanpa registrasi, atau mulai uji coba 14 hari dengan brand Anda sendiri.") },
  ];

  return (
    <div className="nv-paper min-h-dvh overflow-x-clip text-[#101334]">
      {/* Hero */}
      <section className={cn("relative overflow-hidden text-white", INK)}>
        <NarrativeField />
        <SiteHeader />

        {/* Phones and tablets: centred and stacked. Desktop: words left, the product right, both inside the first screen. */}
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-7 px-4 pb-12 pt-6 text-center sm:gap-12 sm:px-6 sm:pt-10 lg:grid lg:min-h-[calc(100dvh-88px)] lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-center lg:gap-12 lg:pb-14 lg:pt-4 lg:text-left xl:gap-16">
          <div className="flex max-w-4xl flex-col items-center lg:items-start">
            <h1 className="text-balance text-[36px] font-black leading-[1.04] tracking-[-0.035em] sm:text-[60px] lg:text-[44px] xl:text-[54px] 2xl:text-[60px]">
              <Typewriter
                speed={45}
                delay={200}
                segments={[
                  { text: L("Detect Reputational Risk", "Deteksi Risiko Reputasi") },
                  { text: L("Before It Escalates.", "Sebelum Menjadi Krisis."), className: cn("mk-brush mt-2 inline-block", serif), block: true },
                ]}
              />
            </h1>
            <p className="mk-pop mx-auto mt-4 sm:mt-5 lg:mx-0 max-w-xl text-balance text-[16px] font-medium leading-relaxed text-white/65 sm:text-[18px]" style={{ "--mk-delay": "1500ms" } as CSSProperties}>
              {/* Phones get the one-line version so the first screen holds the headline, the buttons and the product. */}
              <span className="sm:hidden">{L("News, social, YouTube and AI answers, checked every hour, with the risk scored and the next step assigned.", "Berita, media sosial, YouTube, dan jawaban AI dipantau tiap jam, risikonya dinilai, dan langkah berikutnya ditugaskan.")}</span>
              <span className="hidden sm:inline">
              {L("Narriv is a ", "Narriv adalah platform ")}
              <NarrativeIntelligence className="mx-0.5" />
              {L(
                " platform that goes beyond social listening. It monitors news, YouTube, social media and AI-generated answers every hour, assesses the risk, and assigns clear actions to the right people.",
                " yang melampaui social listening. Narriv memantau berita, YouTube, media sosial, dan jawaban AI setiap jam, menilai tingkat risikonya, lalu menetapkan tindakan yang jelas bagi tim yang tepat.",
              )}
            </span>
            </p>
            <div className="mk-pop mt-6 flex w-full max-w-[320px] flex-col items-center gap-2.5 sm:mt-8 sm:w-auto sm:max-w-none sm:flex-row sm:items-start sm:justify-center lg:justify-start" style={{ "--mk-delay": "1700ms" } as CSSProperties}>
              <DemoButton className="border-[1.5px] border-[#101334] bg-white text-[#070A1F] shadow-[0_4px_0_#465FFF] hover:bg-[#EEF1FF] active:translate-y-[2px] active:shadow-[0_2px_0_#465FFF]">
                {L("Explore the Live Demo", "Lihat Demo Langsung")}
                <ArrowRight size={17} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
              </DemoButton>
              <Link href="/signup" className="inline-flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-white/70 px-7 text-[15px] font-bold text-white shadow-[0_4px_0_rgba(255,255,255,0.28)] backdrop-blur transition hover:bg-white/[0.08] active:translate-y-[2px] sm:w-auto">
                {L("Start a 14-Day Trial", "Mulai Uji Coba 14 Hari")}
              </Link>
            </div>
            <p className="mk-pop mt-4 text-[13px] font-medium text-white/45" style={{ "--mk-delay": "1850ms" } as CSSProperties}>{L("No registration required to access the demo.", "Demo dapat diakses tanpa registrasi.")}</p>
          </div>
          <ProductStage />
        </div>

        {/* What sets Narriv apart */}
        <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {USPS.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title[0]} delay={i * 90} className="flex flex-col items-center rounded-[22px] bg-white/[0.04] px-3 py-6 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur transition hover:bg-white/[0.07] sm:px-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#465FFF] to-[#7B4FE0] text-white shadow-[0_10px_24px_rgba(70,95,255,0.4)]">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <p className="mt-4 text-[15px] font-black tracking-[-0.015em] text-white sm:text-[17px]">{L(title[0], title[1])}</p>
                <p className="mt-1.5 max-w-[15rem] text-[13px] font-medium leading-5 text-white/55">{L(body[0], body[1])}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* The ribbon: what Narriv does, in its own voice */}
      <div className="relative z-10 -mt-3 mb-2" aria-hidden="true">
        <div className="nv-ribbon">
          <div className="nv-ribbon__track">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex">
                {RIBBON.map((item) => <span key={item[0] + copy} className="nv-ribbon__item">{L(item[0], item[1])}</span>)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Why Narriv is not another monitoring tool */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-28">
        <SectionHead
          stacked
          title={L("More Than Social Listening.", "Lebih dari Sekadar Social Listening.")}
          accent={[
            { text: L("This Is ", "Inilah "), className: "" },
            { text: NI_TEXT, className: NI_CLASS, mark: NI_MARK },
            { text: ".", className: "" },
          ]}
          lead={L(
            "Conventional monitoring tools stop at charts and mention counts. Narriv goes further, to what protects your reputation: what it means, who should act, and by when.",
            "Tool monitoring konvensional berhenti di grafik dan jumlah sebutan. Narriv melangkah lebih jauh, ke hal yang melindungi reputasi: apa maknanya, siapa yang harus bertindak, dan kapan.",
          )}
        />
        <Comparison />
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHead
          title={L("From Public Conversation", "Dari Percakapan Publik")}
          accent={L("To Clear Decisions.", "Menjadi Keputusan yang Jelas.")}
          lead={L("No need to monitor a dashboard all day. Narriv filters what matters and delivers it to the person responsible.", "Tidak perlu memantau dashboard sepanjang hari. Narriv menyaring hal yang penting dan meneruskannya kepada penanggung jawab yang tepat.")}
        />
        <ol className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 120} className={cn(CARD, "group flex flex-col items-center p-6 text-center transition duration-300 hover:-translate-y-1 hover:shadow-[0_9px_0_#465FFF] sm:p-7")}>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#465FFF] to-[#7B4FE0] text-white shadow-[0_12px_28px_rgba(70,95,255,0.35)] transition duration-300 group-hover:scale-110"><step.icon size={24} aria-hidden="true" /></span>
              <h3 className="mt-5 text-[22px] font-black tracking-[-0.01em]">{step.title}</h3>
              <p className="mt-2 max-w-xs text-balance text-[15px] font-medium leading-relaxed text-[#5B6070]">{step.text}</p>
              <div className="mt-auto w-full pt-6">
                <div className="rounded-2xl bg-[#F6F5F1] px-4 py-3.5 text-left">{step.ui}</div>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Sources */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
        <Reveal className={cn(CARD, "px-5 py-10 text-center sm:px-10 sm:py-12")}>
          <h2 className="text-balance text-[26px] font-black leading-tight tracking-[-0.02em] sm:text-[32px]"><Typewriter segments={[{ text: L("Every Channel Where Your Brand Is Discussed.", "Semua Kanal Tempat Brand Anda Dibicarakan.") }]} /></h2>
          <ul className="mx-auto mt-9 grid max-w-3xl grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-6">
            {[
              { key: "news", name: L("News", "Berita"), live: true },
              { key: "youtube", name: "YouTube", live: true },
              { key: "instagram", name: "Instagram", live: false },
              { key: "tiktok", name: "TikTok", live: false },
              { key: "x", name: "X", live: false },
              { key: "facebook", name: "Facebook", live: false },
            ].map((src) => (
              <li key={src.key} className="group flex flex-col items-center gap-2">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-[#F6F5F1] transition duration-300 group-hover:-translate-y-1 group-hover:bg-white group-hover:shadow-[0_12px_28px_rgba(16,19,52,0.15)]"><PlatformIcon platform={src.key} className="size-7" /></span>
                <span className="text-[13px] font-bold">{src.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", src.live ? "bg-[#E8F7F0] text-[#047857]" : "bg-[#F1F0EC] text-[#6B7080]")}>{src.live ? L("Active", "Aktif") : L("By Plan", "Sesuai Paket")}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* AI visibility */}
      <section className={cn("relative overflow-hidden text-white", INK)}>
        <NarrativeField density={0.8} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <SectionHead
            dark
            title={L("How does AI", "Bagaimana AI")}
            accent={L("Talk About Your Brand?", "Membicarakan Brand Anda?")}
            lead={L(
              "Customers increasingly consult AI assistants before choosing a product. Narriv asks ChatGPT, Gemini, Claude, Perplexity and DeepSeek the same questions, and measures how often and how well your brand is mentioned.",
              "Konsumen kini bertanya ke asisten AI sebelum memilih produk. Narriv mengajukan pertanyaan yang sama ke ChatGPT, Gemini, Claude, Perplexity, dan DeepSeek, lalu mengukur seberapa sering dan seberapa baik brand Anda disebut.",
            )}
          />
          <div className="mx-auto mt-12 grid max-w-5xl items-center gap-6 lg:mt-16 lg:grid-cols-2 lg:gap-10">
            <AiConversation />
            <AiScoreboard />
          </div>
        </div>
      </section>

      {/* Sample scenarios by sector */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-28">
        <SectionHead
          title={L("Built for Every Organisation", "Dirancang untuk Setiap Organisasi")}
          accent={L("Whose Reputation Matters.", "yang Menjaga Reputasinya.")}
          lead={L(
            "Brands, government, extremism prevention, banks, state-owned companies, public figures and agencies. The issue changes; the need to know first and act fast does not.",
            "Brand, pemerintah, pencegahan ekstremisme, perbankan, BUMN, tokoh publik, hingga agensi. Isunya berbeda, tetapi kebutuhannya sama: tahu lebih dulu dan bertindak lebih cepat.",
          )}
        />
        <UseCases />
      </section>

      {/* Who it is for */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHead title={L("One Complete Picture for Everyone", "Satu Gambaran Utuh bagi Semua")} accent={L("Who Protects the Brand.", "yang Menjaga Reputasi Brand.")} />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: LineChart, title: L("Board & Executives", "Direksi & Manajemen"), text: L("A one-page brief every Monday: the week’s risk level, key changes, and who is handling them.", "Ringkasan satu halaman setiap Senin: tingkat risiko minggu ini, perubahan utama, dan siapa yang menangani.") },
            { icon: Megaphone, title: L("Corporate Communications & PR", "Corporate Communication & PR"), text: L("Catch issues while they are small, with an owner, a deadline and a draft response plan.", "Tangkap isu sejak masih kecil, lengkap dengan penanggung jawab, tenggat, dan draf rencana respons.") },
            { icon: Building2, title: L("PR Agencies", "Agensi PR"), text: L("Manage every client from one account, each in a separate workspace, with competitor comparisons.", "Kelola semua klien dari satu akun, masing-masing di workspace terpisah, lengkap dengan perbandingan kompetitor.") },
          ].map((a, i) => (
            <Reveal key={a.title} delay={i * 120} className={cn(CARD, "group flex flex-col items-center px-6 py-8 text-center transition duration-300 hover:-translate-y-1.5")}>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#465FFF] to-[#7B4FE0] text-white shadow-[0_10px_24px_rgba(70,95,255,0.3)] transition duration-300 group-hover:scale-110"><a.icon size={22} aria-hidden="true" /></span>
              <h3 className="mt-5 text-[20px] font-black">{a.title}</h3>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#5B6070]">{a.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Questions */}
      <section id="faq" className="scroll-mt-6">
        <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:pb-24">
          <SectionHead title={L("Frequently Asked", "Pertanyaan yang")} accent={L("Questions.", "Sering Diajukan.")} />
          <Reveal className={cn(CARD, "mt-10 overflow-hidden px-5 sm:px-7")}>
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-[#ECEAE3] last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-bold sm:text-[17px] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EEF1FF] text-[#465FFF] transition group-open:rotate-180">
                    <ChevronDown size={16} aria-hidden="true" />
                  </span>
                </summary>
                <p className="-mt-1 pb-5 pr-12 text-[15px] font-medium leading-relaxed text-[#5B6070]">{f.a}</p>
              </details>
            ))}
          </Reveal>
          <p className="mt-6 text-center text-[15px] font-medium text-[#5B6070]">
            {L("Find more answers on our ", "Temukan jawaban lainnya di halaman ")}<Link href={href("/help")} className="font-bold text-[#465FFF] underline-offset-4 hover:underline">{L("Help", "Bantuan")}</Link>.
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="px-4 pb-20 sm:px-6">
        <Reveal className={cn("relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-16 text-center text-white sm:py-24", INK)}>
          <NarrativeField density={0.7} />
          <h2 className="relative text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
            <Typewriter
              segments={[
                { text: L("Try Narriv for 14 Days", "Coba Narriv Selama 14 Hari") },
                { text: L("With Your Own Brand.", "dengan Brand Anda Sendiri."), className: cn(ACCENT_DARK, serif), block: true },
              ]}
            />
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-balance text-[16px] font-medium text-white/60">
            {L("Setup takes five minutes, and initial results arrive within a minute.", "Pengaturan hanya lima menit, dan hasil awal tersedia dalam satu menit.")}
          </p>
          <div className="relative mx-auto mt-9 flex w-full max-w-[320px] flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:items-start">
            <Link href="/signup" className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-bold text-[#070A1F] shadow-[0_12px_40px_rgba(165,180,255,0.35)] transition hover:bg-[#EEF1FF] sm:w-auto">
              {L("Start Your Trial", "Mulai Uji Coba")}
              <ArrowUpRight size={17} aria-hidden="true" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <DemoButton className="text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] hover:bg-white/[0.08]">{L("View the Demo First", "Lihat Demo Terlebih Dahulu")}</DemoButton>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
