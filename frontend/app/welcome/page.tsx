"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BellRing, Building2, ChevronDown, Clock3, FileText, Layers, LineChart, Loader2, Megaphone, Radar, UserCheck, type LucideIcon } from "lucide-react";
import { startDemoLogin } from "@/components/auth/auth-shell";
import { GRID, INK, SERIF as serif, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { AI_ENGINES } from "@/components/ui/ai-engines";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

// The public landing page, served at "/" to visitors who are not signed in (see proxy.ts).
// Every number on it is either a product fact or labelled as sample data from the fictional demo bank.
// Look: ink and warm paper, an editorial serif for accent lines (layout.tsx), hairline rules instead of boxes.


function DemoButton({ className, children }: { className?: string; children: ReactNode }) {
  const L = useL();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex flex-col items-center gap-1.5 sm:items-start">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setFailed(false);
          try {
            await startDemoLogin();
          } catch {
            setFailed(true);
            setLoading(false);
          }
        }}
        className={cn("group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-70", className)}
      >
        {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
      {failed ? <span role="alert" className="text-[12px] font-semibold text-[#FCA5A5]">{L("The demo could not open. Try again.", "Demo gagal dibuka. Coba lagi.")}</span> : null}
    </span>
  );
}

/** A label beside the product picture that says what the part next to it does. */
/** Brands shown under the hero; each wordmark has its own weight so the row does not read as a list. */
const BRANDS = [
  { name: "Tugasisten", className: "font-black tracking-[-0.04em]" },
  { name: "JakselNews", className: "font-extrabold uppercase tracking-[0.02em] text-[20px] sm:text-[22px]" },
  { name: "HaloDepok", className: "font-bold tracking-[-0.02em]" },
];

function Callout({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
      <span className="flex size-5 items-center justify-center rounded-full bg-[#465FFF]"><Icon size={12} aria-hidden="true" /></span>
      {children}
    </span>
  );
}

/**
 * The product, composed so it explains itself: a dashboard window (brand, risk, a spike with its cause, the sources
 * and the top issues), the alert it raised with an owner, and the AI score, with labels naming each part. Sample data.
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
    <div className="relative mx-auto w-full max-w-[600px]">
    <div className="relative pb-16 pt-8">
      <div aria-hidden="true" className="absolute -inset-10 rounded-[60px] bg-[radial-gradient(closest-side,rgba(109,124,255,0.45),transparent)] blur-2xl" />


      {/* Window */}
      <div className="relative overflow-hidden rounded-[22px] bg-[#0E1335]/80 p-1.5 shadow-[0_40px_120px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur">
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-3 truncate text-[11px] font-semibold text-white/40">narriv.digital · {L("Today", "Hari ini")}</span>
        </div>
        <div className="rounded-[17px] bg-[#FBFAF7] p-4 text-[#101334] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8A8F9E]">{L("Monitoring", "Pemantauan")}</p>
              <p className="mt-0.5 text-[18px] font-black">Bank Arunika</p>
              <p className="text-[11px] font-semibold text-[#8A8F9E]">{L("Sample data, fictional brand", "Data contoh, brand fiktif")}</p>
            </div>
            <span className="rounded-full bg-[#FDECEC] px-2.5 py-1 text-[11px] font-black text-[#B42318]">{L("Risk: high", "Risiko: tinggi")}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-[#ECEAE3]">
            {[
              { v: "217", l: L("mentions, 30 days", "percakapan, 30 hari") },
              { v: "42%", l: L("negative", "negatif"), tone: "text-[#B42318]" },
              { v: "6", l: L("open alerts", "peringatan aktif") },
            ].map((s) => (
              <div key={s.l} className="px-3 first:pl-0">
                <p className={cn("text-[24px] font-black leading-none tabular-nums", s.tone)}>{s.v}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#6B7080]">{s.l}</p>
              </div>
            ))}
          </div>

          {/* The spike, named */}
          <div className="relative mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-[#6B7080]">{L("Mentions per day", "Percakapan per hari")}</p>
              <span className="rounded-full bg-[#101334] px-2.5 py-1 text-[10px] font-black text-white">{L("3× in 24h · app outage", "3× dalam 24 jam · gangguan aplikasi")}</span>
            </div>
            <svg viewBox="0 0 300 82" className="mt-1 h-[72px] w-full overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#E5484D" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#E5484D" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,82 ${path} 300,82`} fill="url(#sparkfill)" />
              <polyline points={path} fill="none" stroke="#E5484D" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(days.length - 1)} cy={y(max)} r="5" fill="#E5484D" stroke="#FBFAF7" strokeWidth="2.5" />
            </svg>
          </div>

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
              { t: L("Arunika Mobile outage at peak hours", "Gangguan Arunika Mobile di jam sibuk"), s: L("Negative", "Negatif"), tone: "bg-[#FDECEC] text-[#B42318]", n: 46 },
              { t: L("SME programme praised", "Program UMKM dipuji"), s: L("Positive", "Positif"), tone: "bg-[#E8F7F0] text-[#047857]", n: 34 },
            ].map((it) => (
              <li key={it.t} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(16,19,52,0.06)]">
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{it.t}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black", it.tone)}>{it.s}</span>
                <span className="w-6 shrink-0 text-right text-[12px] font-black tabular-nums">{it.n}</span>
              </li>
            ))}
          </ul>
          {/* Room for the floating alert, so it never covers the numbers. */}
          <div className="h-28 sm:h-16" aria-hidden="true" />
        </div>
      </div>

      {/* The alert it raised, floating */}
      <div className="absolute bottom-0 left-0 w-[80%] max-w-[340px] rounded-[18px] bg-white p-4 text-[#101334] shadow-[0_24px_60px_rgba(5,8,30,0.45)] sm:-left-8">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#E5484D] opacity-60" />
            <span className="relative size-2.5 rounded-full bg-[#E5484D]" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#B42318]">{L("Critical alert · sent to email", "Peringatan kritis · terkirim ke email")}</span>
        </div>
        <p className="mt-1.5 text-[14px] font-black leading-snug">{L("Arunika Mobile outage at peak hours", "Gangguan Arunika Mobile di jam sibuk")}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7080]"><UserCheck size={13} aria-hidden="true" /> {L("Owner: Digital team · due in 4 hours", "PJ: Tim Digital · tenggat 4 jam lagi")}</p>
      </div>

      {/* AI score, floating */}
      <div className="absolute -right-3 top-0 hidden rounded-[16px] bg-[#101334] px-4 py-3 text-white shadow-[0_20px_50px_rgba(5,8,30,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:block">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#A5B4FF]">{L("Named by ChatGPT", "Disebut ChatGPT")}</p>
        <p className="mt-0.5 text-[24px] font-black leading-none">62<span className="text-[13px] font-bold text-white/50">/100</span></p>
      </div>
    </div>
      {/* What the picture shows, in three plain labels. */}
      <div className="relative mt-5 flex flex-wrap justify-center gap-2">
        <Callout icon={Clock3}>{L("Checked every hour", "Dicek tiap jam")}</Callout>
        <Callout icon={Layers}>{L("All sources, one screen", "Semua sumber, satu layar")}</Callout>
        <Callout icon={BellRing}>{L("Who acts, by when", "Siapa bertindak, kapan")}</Callout>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const L = useL();


  // Sample scores from the demo bank, the same numbers its dashboard shows.
  const geo = [62, 48, 55, 71, 34];

  const faqs = [
    { q: L("How fast will I see results?", "Seberapa cepat hasilnya terlihat?"), a: L("The first news and YouTube results arrive about a minute after setup. From then on Narriv checks every hour.", "Hasil pertama dari berita dan YouTube masuk sekitar satu menit setelah pengaturan. Setelah itu Narriv mengecek setiap jam.") },
    { q: L("Which sources does Narriv watch?", "Sumber apa saja yang dipantau?"), a: L("Indonesian online news and YouTube from day one. Instagram, TikTok, X and Facebook are switched on per plan.", "Berita online Indonesia dan YouTube langsung aktif. Instagram, TikTok, X, dan Facebook diaktifkan sesuai paket.") },
    { q: L("How is this different from a social listening tool?", "Apa bedanya dengan tool social listening?"), a: L("Most tools stop at charts. Narriv turns a rising issue into an alert with an owner and a deadline, suggests a response plan, and writes the board report.", "Kebanyakan tool berhenti di grafik. Narriv mengubah isu yang naik jadi peringatan dengan penanggung jawab dan tenggat, menyarankan rencana respons, dan menyusun laporan untuk direksi.") },
    { q: L("Can I trust the AI's reading?", "Bisakah analisis AI-nya dipercaya?"), a: L("Every mention links back to the original article or post, and your team can correct a sentiment in one click.", "Setiap percakapan tertaut ke artikel atau postingan aslinya, dan tim Anda bisa mengoreksi sentimen dalam satu klik.") },
    { q: L("Is our data kept separate?", "Apakah data kami terpisah?"), a: L("Each client has its own workspace. Members only see the workspaces they were invited to, and every change is recorded in the activity history.", "Tiap klien punya workspace sendiri. Anggota hanya melihat workspace yang mengundangnya, dan setiap perubahan tercatat di riwayat aktivitas.") },
    { q: L("Can we try it first?", "Bisa dicoba dulu?"), a: L("Yes. Open the live demo without signing up, or try 14 days with your own brand.", "Bisa. Buka demo langsung tanpa daftar, atau coba 14 hari dengan brand Anda sendiri.") },
  ];

  return (
    <div className="min-h-dvh bg-[#F6F5F1] text-[#101334]">
      {/* Hero */}
      <section className={cn("relative overflow-hidden text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-[-10%] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(245,139,214,0.14),transparent)]" />
        <SiteHeader />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pb-16 lg:pt-16">
          <div className="text-center lg:text-left">
            <h1 className="text-balance text-[34px] font-black leading-[1.04] tracking-[-0.035em] sm:text-[56px]">
              {L("Know your brand’s issues", "Tahu isu brand Anda")}
              <span className={cn("block bg-gradient-to-r from-[#8EA0FF] via-[#B8A6FF] to-[#F5A3DA] bg-clip-text pb-1 text-transparent", serif)}>
                {L("before they go viral.", "sebelum jadi viral.")}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] font-medium leading-relaxed text-white/65 sm:text-[18px] lg:mx-0">
              {L("Narriv reads the news, YouTube and social media every hour, rates the risk, and tells the right person to act.", "Narriv membaca berita, YouTube, dan media sosial setiap jam, menilai risikonya, lalu memberi tahu siapa yang harus bertindak.")}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center lg:justify-start">
              <DemoButton className="bg-white text-[#070A1F] shadow-[0_12px_40px_rgba(165,180,255,0.35)] hover:bg-[#EEF1FF]">
                {L("See the live demo", "Lihat demo langsung")}
                <ArrowRight size={17} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
              </DemoButton>
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition hover:bg-white/[0.06]">
                {L("Start a 14-day trial", "Mulai uji coba 14 hari")}
              </Link>
            </div>
            <p className="mt-4 text-[13px] font-medium text-white/40">{L("No sign-up needed for the demo.", "Demo tanpa perlu daftar.")}</p>
          </div>
          <ProductStage />
        </div>

        {/* Brands that use Narriv, as wordmarks until their logo files are added. */}
        <div className="relative mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-[13px] font-semibold text-white/45">{L("Trusted by", "Dipercaya oleh")}</p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
              {BRANDS.map((b) => (
                <li key={b.name} className={cn("text-[24px] leading-none text-white/80 sm:text-[28px]", b.className)}>
                  {b.name}
                </li>
              ))}
              <li className="text-[15px] font-semibold text-white/45">{L("and many more", "dan banyak lagi")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works: one flow, three moments, each with the real screen it produces */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <h2 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
              {L("From a mention", "Dari satu percakapan")} <span className={cn("bg-gradient-to-r from-[#465FFF] to-[#9B4DDB] bg-clip-text text-transparent", serif)}>{L("to a decision.", "sampai keputusan.")}</span>
            </h2>
            <p className="mt-4 max-w-sm text-[16px] font-medium leading-relaxed text-[#5B6070]">{L("No dashboards to babysit. Narriv watches, decides what matters, and hands it to the right person.", "Tidak perlu memelototi dashboard. Narriv memantau, memilah yang penting, lalu menyerahkannya ke orang yang tepat.")}</p>
          </div>

          <ol className="relative space-y-12 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-[#DDDAD0] sm:space-y-14">
            {[
              {
                n: "01",
                icon: Radar,
                title: L("Watch", "Pantau"),
                text: L("News, YouTube and social media are read every hour and scored for sentiment.", "Berita, YouTube, dan media sosial dibaca setiap jam dan dinilai sentimennya."),
                ui: (
                  <div className="flex items-start gap-3">
                    <PlatformIcon platform="news" className="mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{L("Customers report login failures at payday", "Nasabah keluhkan gagal login saat gajian")}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#8A8F9E]">{L("Online news · 12 min ago", "Berita online · 12 menit lalu")}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] font-black text-[#B42318]">{L("Negative", "Negatif")}</span>
                  </div>
                ),
              },
              {
                n: "02",
                icon: BellRing,
                title: L("Alert", "Peringatkan"),
                text: L("A rising issue becomes an alert with a severity, an owner and a deadline, sent to email.", "Isu yang naik jadi peringatan dengan tingkat keparahan, penanggung jawab, dan tenggat, lalu dikirim ke email."),
                ui: (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="rounded-md bg-[#B42318] px-1.5 py-0.5 text-[10px] font-black uppercase text-white">{L("Critical", "Kritis")}</span>
                    <p className="text-[13px] font-bold">{L("Login complaints up sharply", "Keluhan login naik tajam")}</p>
                    <p className="flex items-center gap-1 text-[12px] font-semibold text-[#6B7080]"><UserCheck size={13} aria-hidden="true" /> {L("Digital team · 4h", "Tim Digital · 4 jam")}</p>
                  </div>
                ),
              },
              {
                n: "03",
                icon: FileText,
                title: L("Report", "Laporkan"),
                text: L("Every Monday the board gets a one-page brief by email: what changed and what to decide.", "Setiap Senin direksi menerima ringkasan satu halaman lewat email: apa yang berubah dan apa yang perlu diputuskan."),
                ui: (
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#101334] text-white"><FileText size={18} aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{L("Weekly report for the board.pdf", "Laporan mingguan untuk direksi.pdf")}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#8A8F9E]">{L("Negative share down 1 point · 3 decisions", "Porsi negatif turun 1 poin · 3 keputusan")}</p>
                    </div>
                  </div>
                ),
              },
            ].map((step) => (
              <li key={step.n} className="relative pl-16">
                <span className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#465FFF] to-[#7B4FE0] text-white shadow-[0_8px_20px_rgba(70,95,255,0.35)]"><step.icon size={18} aria-hidden="true" /></span>
                <h3 className="text-[22px] font-black tracking-[-0.01em]">{step.title}</h3>
                <p className="mt-1.5 max-w-lg text-[15px] font-medium leading-relaxed text-[#5B6070]">{step.text}</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(16,19,52,0.04),0_18px_40px_-18px_rgba(16,19,52,0.25)]">{step.ui}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sources */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="border-y border-[#DDDAD0] py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-sm">
              <h2 className="text-[26px] font-black leading-tight tracking-[-0.02em]">{L("Where your brand is talked about.", "Tempat brand Anda dibicarakan.")}</h2>
            </div>
            <ul className="grid grid-cols-3 gap-x-8 gap-y-5 sm:grid-cols-6">
              {[
                { key: "news", name: L("News", "Berita"), live: true },
                { key: "youtube", name: "YouTube", live: true },
                { key: "instagram", name: "Instagram", live: false },
                { key: "tiktok", name: "TikTok", live: false },
                { key: "x", name: "X", live: false },
                { key: "facebook", name: "Facebook", live: false },
              ].map((src) => (
                <li key={src.key} className="flex flex-col items-center gap-2 text-center">
                  <PlatformIcon platform={src.key} className="size-8" />
                  <span className="text-[13px] font-bold">{src.name}</span>
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.1em]", src.live ? "text-[#047857]" : "text-[#8A8F9E]")}>{src.live ? L("Live", "Aktif") : L("Per plan", "Per paket")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* AI visibility */}
      <section className={cn("relative overflow-hidden text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute left-[-10%] top-1/2 h-[460px] w-[640px] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.3),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="text-center lg:text-left">
            <h2 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[46px]">
              {L("Does ChatGPT", "Apakah ChatGPT")} <span className={cn("bg-gradient-to-r from-[#8EA0FF] via-[#B8A6FF] to-[#F5A3DA] bg-clip-text text-transparent", serif)}>{L("mention your brand?", "menyebut brand Anda?")}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[16px] font-medium leading-relaxed text-white/60 lg:mx-0">
              {L("Customers now ask AI assistants which bank, app or product to choose. Narriv asks them the same questions and scores how often your brand comes up.", "Pelanggan kini bertanya ke asisten AI soal bank, aplikasi, atau produk mana yang bagus. Narriv mengajukan pertanyaan yang sama dan menilai seberapa sering brand Anda disebut.")}
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between border-b border-white/10 pb-3 text-[12px] font-bold text-white/45">
              <span>{L("Assistant", "Asisten")}</span>
              <span>{L("Score · sample: Bank Arunika", "Skor · contoh: Bank Arunika")}</span>
            </div>
            <ol>
              {AI_ENGINES.map((engine, i) => {
                const Logo = engine.Logo;
                const score = geo[i] ?? 0;
                return (
                  <li key={engine.key} className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-b border-white/10 py-4">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-white p-1.5"><Logo className="size-full" /></span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold">{engine.name}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className={cn("h-full rounded-full", score >= 60 ? "bg-[#4ADE80]" : score >= 45 ? "bg-[#A5B4FF]" : "bg-[#F87171]")} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                    <span className="w-12 text-right text-[24px] font-black leading-none tabular-nums">{score}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* Who it is for: ruled columns, not cards */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
            {L("One picture for everyone", "Satu gambaran untuk semua")} <span className={cn("bg-gradient-to-r from-[#465FFF] to-[#9B4DDB] bg-clip-text text-transparent", serif)}>{L("who answers for the brand.", "yang menjaga brand.")}</span>
          </h2>
        </div>
        <div className="mt-12 grid border-t border-[#DDDAD0] md:grid-cols-3 md:divide-x md:divide-[#DDDAD0]">
          {[
            { n: "01", icon: LineChart, title: L("Board & executives", "Direksi"), text: L("One page every Monday: how risky the week was, what changed, and who is handling it.", "Satu halaman tiap Senin: seberapa berisiko minggu ini, apa yang berubah, dan siapa yang menangani.") },
            { n: "02", icon: Megaphone, title: L("Corporate comms & PR", "Corcomm & PR"), text: L("See an issue while it is small, with an owner, a deadline and a response plan to start from.", "Lihat isu saat masih kecil, lengkap dengan penanggung jawab, tenggat, dan rencana respons sebagai titik awal.") },
            { n: "03", icon: Building2, title: L("PR agencies", "Agensi PR"), text: L("Every client in one account, each in its own workspace, compared with their competitors.", "Semua klien dalam satu akun, masing-masing di workspace sendiri, dan dibandingkan dengan kompetitornya.") },
          ].map((a) => (
            <div key={a.n} className="border-b border-[#DDDAD0] px-4 py-8 text-center md:border-b-0 md:px-8">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#465FFF] to-[#7B4FE0] text-white shadow-[0_10px_24px_rgba(70,95,255,0.3)]"><a.icon size={22} aria-hidden="true" /></span>
              <h3 className="mt-5 text-[20px] font-black">{a.title}</h3>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#5B6070]">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Questions */}
      <section id="faq" className="scroll-mt-6 border-t border-[#DDDAD0]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20 lg:py-24">
          <div>
            <h2 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[40px]">
              {L("Questions", "Pertanyaan")} <span className={cn("bg-gradient-to-r from-[#465FFF] to-[#9B4DDB] bg-clip-text text-transparent", serif)}>{L("before you start.", "sebelum mulai.")}</span>
            </h2>
            <p className="mt-4 text-[15px] font-medium text-[#5B6070]">
              {L("More answers in ", "Jawaban lain ada di ")}<Link href="/help" className="font-bold text-[#465FFF] underline-offset-4 hover:underline">{L("Help", "Bantuan")}</Link>.
            </p>
          </div>
          <div className="border-t border-[#DDDAD0]">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-[#DDDAD0]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#465FFF] shadow-sm transition group-open:rotate-180">
                    <ChevronDown size={16} aria-hidden="true" />
                  </span>
                </summary>
                <p className="-mt-1 pb-5 pr-12 text-[15px] font-medium leading-relaxed text-[#5B6070]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="px-4 pb-20 sm:px-6">
        <div className={cn("relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-16 text-center text-white sm:py-20", INK)}>
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.45),transparent)]" />
          <h2 className="relative text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
            {L("Try it for 14 days", "Coba 14 hari")}
            <span className={cn("block bg-gradient-to-r from-[#8EA0FF] via-[#B8A6FF] to-[#F5A3DA] bg-clip-text text-transparent", serif)}>{L("with your own brand.", "dengan brand Anda sendiri.")}</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[16px] font-medium text-white/60">
            {L("Set up takes five minutes. The first results arrive within a minute.", "Pengaturan lima menit. Hasil pertama masuk dalam satu menit.")}
          </p>
          <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
            <Link href="/signup" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[#070A1F] shadow-[0_12px_40px_rgba(165,180,255,0.35)] transition hover:bg-[#EEF1FF]">
              {L("Start the trial", "Mulai uji coba")}
              <ArrowUpRight size={17} aria-hidden="true" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <DemoButton className="text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/[0.06]">{L("See the demo first", "Lihat demo dulu")}</DemoButton>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
