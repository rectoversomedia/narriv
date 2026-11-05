"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Bell, CalendarClock, FileText, Loader2, Radar, UserCheck } from "lucide-react";
import { startDemoLogin } from "@/components/auth/auth-shell";
import { AI_ENGINES } from "@/components/ui/ai-engines";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";

// The public landing page, served at "/" to visitors who are not signed in (see proxy.ts).
// Every number on it is either a product fact or labelled as sample data from the fictional demo bank.

function DemoButton({ className, children }: { className?: string; children: ReactNode }) {
  const L = useL();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex flex-col items-center gap-1.5">
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
        className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-70", className)}
      >
        {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
      {failed ? <span role="alert" className="text-[12px] font-semibold text-[#FCA5A5]">{L("The demo could not open. Try again.", "Demo gagal dibuka. Coba lagi.")}</span> : null}
    </span>
  );
}

function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  return (
    <div role="group" aria-label="Bahasa / Language" className={cn("flex rounded-[9px] p-0.5", dark ? "bg-white/10" : "bg-[#EEF1F7]")}>
      {(["id", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={cn(
            "h-7 min-w-[34px] rounded-[7px] px-2 text-[12px] font-black uppercase",
            language === code ? (dark ? "bg-white text-[#101334]" : "bg-white text-[#101334] shadow-sm") : dark ? "text-white/60" : "text-[#5A6478]",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/** A compact, static picture of the dashboard, filled with the demo bank's sample numbers. */
function ProductPreview() {
  const L = useL();
  const sentiment = [
    { label: L("Positive", "Positif"), pct: 33, color: "#12A66A" },
    { label: L("Neutral", "Netral"), pct: 13, color: "#94A3B8" },
    { label: L("Mixed", "Campuran"), pct: 12, color: "#F59E0B" },
    { label: L("Negative", "Negatif"), pct: 42, color: "#E5484D" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div aria-hidden="true" className="absolute -inset-6 rounded-[40px] bg-[#6D7CFF] opacity-25 blur-[60px]" />
      <div className="relative rounded-[22px] bg-white p-4 text-[#101334] shadow-[0_30px_80px_rgba(8,10,40,0.45)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF1FF] text-[13px] font-black text-[#465FFF]">BA</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-black">Bank Arunika</p>
              <p className="text-[11px] font-semibold text-[#5F6B94]">{L("Sample data, fictional brand", "Data contoh, brand fiktif")}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#FDECEC] px-2.5 py-1 text-[11px] font-black text-[#B42318]">{L("Risk: high", "Risiko: tinggi")}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { v: "217", l: L("mentions, 30 days", "percakapan, 30 hari") },
            { v: "42%", l: L("negative", "negatif"), tone: "text-[#B42318]" },
            { v: "6", l: L("open alerts", "peringatan aktif") },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-[#F5F7FF] px-2.5 py-2.5">
              <p className={cn("text-[22px] font-black leading-none", s.tone)}>{s.v}</p>
              <p className="mt-1 text-[11px] font-semibold leading-tight text-[#5F6B94]">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            {sentiment.map((s) => <span key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {sentiment.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5F6B94]">
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} {s.pct}%
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#FFF7F7] p-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#B42318] px-1.5 py-0.5 text-[10px] font-black uppercase text-white">{L("Critical", "Kritis")}</span>
            <span className="text-[11px] font-semibold text-[#5F6B94]">{L("2 hours ago", "2 jam lalu")}</span>
          </div>
          <p className="mt-1.5 text-[14px] font-black leading-snug">{L("Arunika Mobile outage at peak hours", "Gangguan Arunika Mobile di jam sibuk")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#5F6B94]">
            <span className="flex items-center gap-1"><UserCheck size={13} aria-hidden="true" /> {L("Owner: Digital team", "PJ: Tim Digital")}</span>
            <span className="flex items-center gap-1"><CalendarClock size={13} aria-hidden="true" /> {L("Due in 4 hours", "Tenggat 4 jam lagi")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#465FFF]">{eyebrow}</p>
      <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334] sm:text-[36px]">{title}</h2>
      {sub ? <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#5F6B94] sm:text-[16px]">{sub}</p> : null}
    </div>
  );
}

const card = "rounded-[20px] bg-white p-6 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.07)]";

export default function WelcomePage() {
  const L = useL();

  const facts = [
    { v: L("Hourly", "Tiap jam"), l: L("automatic checks", "dicek otomatis") },
    { v: "5", l: L("AI assistants tested", "asisten AI diuji") },
    { v: L("1 click", "1 klik"), l: L("report for the board", "laporan untuk direksi") },
    { v: "ID / EN", l: L("both languages", "dua bahasa") },
  ];

  const steps = [
    { icon: Radar, title: L("Watch", "Pantau"), text: L("News, YouTube and social media are read every hour and scored for sentiment.", "Berita, YouTube, dan media sosial dibaca setiap jam dan dinilai sentimennya.") },
    { icon: Bell, title: L("Alert", "Peringatkan"), text: L("A rising issue becomes an alert with a severity, an owner and a deadline.", "Isu yang naik jadi peringatan, lengkap dengan tingkat keparahan, penanggung jawab, dan tenggat.") },
    { icon: FileText, title: L("Report", "Laporkan"), text: L("The board summary is ready in one click, as PDF, Excel or email.", "Ringkasan untuk direksi siap dalam satu klik, dalam bentuk PDF, Excel, atau email.") },
  ];

  // Sample scores from the demo bank, the same numbers its dashboard shows.
  const geo = [62, 48, 55, 71, 34];

  const audiences = [
    { title: L("Board & executives", "Direksi"), text: L("One page every morning: how risky today is and who is handling it.", "Satu halaman tiap pagi: seberapa berisiko hari ini dan siapa yang menangani.") },
    { title: L("Corporate comms & PR", "Corcomm & PR"), text: L("See an issue while it is small, with a response plan to start from.", "Lihat isu saat masih kecil, dengan rencana respons sebagai titik awal.") },
    { title: L("PR agencies", "Agensi PR"), text: L("One account for every client, with each client's data kept apart.", "Satu akun untuk semua klien, dan data tiap klien tidak tercampur.") },
  ];

  return (
    <div className="min-h-dvh bg-[#F5F7FC] text-[#101334]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B0E2A] via-[#151B5E] to-[#2B2F9E] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-120px] h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[#6D7CFF] opacity-25 blur-[120px]" />

        <header className="relative mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Image src="/brand/logo-p.webp" alt="Narriv" width={128} height={48} priority className="h-8 w-auto" />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/pricing" className="hidden text-[14px] font-semibold text-white/75 hover:text-white sm:block">{L("Pricing", "Harga")}</Link>
            <Link href="/help" className="hidden text-[14px] font-semibold text-white/75 hover:text-white sm:block">{L("Help", "Bantuan")}</Link>
            <LanguageSwitch dark />
            <Link href="/login" className="flex h-9 items-center rounded-[10px] bg-white px-3.5 text-[14px] font-bold text-[#101334] hover:bg-white/90">{L("Sign in", "Masuk")}</Link>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-14">
          <div className="text-center lg:text-left">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#A5B4FF]">{L("Brand reputation monitoring", "Pemantauan reputasi brand")}</p>
            <h1 className="mt-3 text-[38px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
              {L("Know your brand's issues before they go viral.", "Tahu isu brand Anda sebelum jadi viral.")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] font-medium leading-relaxed text-white/75 sm:text-[18px] lg:mx-0">
              {L("Narriv reads the news, YouTube and social media every hour, rates the risk, and tells the right person to act.", "Narriv membaca berita, YouTube, dan media sosial setiap jam, menilai risikonya, lalu memberi tahu siapa yang harus bertindak.")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start lg:justify-start">
              <DemoButton className="bg-[#465FFF] text-white shadow-[0_10px_30px_rgba(70,95,255,0.45)] hover:bg-[#3B52F5]">
                {L("See the live demo", "Lihat demo langsung")}
                <ArrowRight size={17} aria-hidden="true" />
              </DemoButton>
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-white/10 px-6 text-[15px] font-bold text-white hover:bg-white/15">
                {L("Create an account", "Buat akun")}
              </Link>
            </div>
            <p className="mt-3 text-[13px] font-medium text-white/50">{L("No sign-up needed for the demo.", "Demo tanpa perlu daftar.")}</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Product facts */}
      <section className="relative mx-auto -mt-8 max-w-5xl px-4 sm:px-6">
        <ul className="grid grid-cols-2 gap-3 rounded-[22px] bg-white p-3 shadow-[0_12px_40px_rgba(16,19,52,0.10)] sm:grid-cols-4 sm:p-4">
          {facts.map((f) => (
            <li key={f.l} className="rounded-2xl bg-[#F5F7FF] px-4 py-4 text-center">
              <p className="text-[24px] font-black leading-none tracking-[-0.02em] sm:text-[28px]">{f.v}</p>
              <p className="mt-1.5 text-[13px] font-semibold text-[#5F6B94]">{f.l}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle eyebrow={L("How it works", "Cara kerja")} title={L("From mention to action, in one place.", "Dari percakapan sampai tindakan, di satu tempat.")} />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className={card}>
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#465FFF] text-white shadow-[0_8px_20px_rgba(70,95,255,0.35)]">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="text-[40px] font-black leading-none text-[#E6E9F5]">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[20px] font-black">{s.title}</h3>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#5F6B94]">{s.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Sources */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={L("Sources", "Sumber")} title={L("Where your brand is talked about.", "Tempat brand Anda dibicarakan.")} />
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { key: "news", name: L("News", "Berita") },
              { key: "youtube", name: "YouTube" },
              { key: "instagram", name: "Instagram" },
              { key: "tiktok", name: "TikTok" },
              { key: "x", name: "X" },
              { key: "facebook", name: "Facebook" },
            ].map((src) => (
              <div key={src.key} className="flex flex-col items-center gap-2 rounded-2xl bg-[#F5F7FF] px-2 py-4">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white p-2.5 shadow-sm">
                  <PlatformIcon platform={src.key} className="size-7" />
                </span>
                <span className="text-[13px] font-bold">{src.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[13px] font-medium text-[#5F6B94]">
            {L("News and YouTube are on from day one. Social media is switched on per plan.", "Berita dan YouTube langsung aktif. Media sosial diaktifkan sesuai paket.")}
          </p>
        </div>
      </section>

      {/* AI visibility */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#465FFF]">{L("AI visibility", "Visibilitas di AI")}</p>
          <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.02em] sm:text-[36px]">
            {L("Does ChatGPT mention your brand?", "Apakah ChatGPT menyebut brand Anda?")}
          </h2>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#5F6B94] sm:text-[16px]">
            {L("Customers now ask AI assistants which bank, app or product to choose. Narriv asks them the same questions and scores how often your brand comes up.", "Pelanggan kini bertanya ke asisten AI soal bank, aplikasi, atau produk mana yang bagus. Narriv mengajukan pertanyaan yang sama dan menilai seberapa sering brand Anda disebut.")}
          </p>
        </div>
        <div className={card}>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-bold text-[#5F6B94]">{L("Score out of 100", "Skor dari 100")}</p>
            <p className="text-[12px] font-semibold text-[#5F6B94]">{L("Sample: Bank Arunika", "Contoh: Bank Arunika")}</p>
          </div>
          <ul className="mt-4 space-y-3.5">
            {AI_ENGINES.map((engine, i) => {
              const Logo = engine.Logo;
              const score = geo[i] ?? 0;
              return (
                <li key={engine.key}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[14px] font-bold">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-[#F5F7FF] p-1.5"><Logo className="size-full" /></span>
                      {engine.name}
                    </span>
                    <span className="text-[14px] font-black tabular-nums">{score}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EEF1F7]">
                    <div className={cn("h-full rounded-full", score >= 60 ? "bg-[#12A66A]" : score >= 45 ? "bg-[#465FFF]" : "bg-[#E5484D]")} style={{ width: `${score}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow={L("Built for", "Untuk siapa")} title={L("One picture for everyone who answers for the brand.", "Satu gambaran untuk semua yang bertanggung jawab atas brand.")} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-[20px] bg-[#F5F7FF] p-6">
                <h3 className="text-[19px] font-black">{a.title}</h3>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#5F6B94]">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="px-4 py-20 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] px-6 py-14 text-center text-white">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[240px] w-[600px] -translate-x-1/2 rounded-full bg-[#6D7CFF] opacity-30 blur-[90px]" />
          <h2 className="relative text-[28px] font-black leading-tight tracking-[-0.02em] sm:text-[38px]">
            {L("Try it for two weeks with your own brand.", "Coba dua minggu dengan brand Anda sendiri.")}
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[16px] font-medium text-white/70">
            {L("Set up takes five minutes. The first results arrive within a minute.", "Pengaturan lima menit. Hasil pertama masuk dalam satu menit.")}
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-[#101334] hover:bg-white/90">
              {L("Create an account", "Buat akun")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <DemoButton className="bg-white/10 text-white hover:bg-white/15">{L("See the demo first", "Lihat demo dulu")}</DemoButton>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 pb-10 text-[13px] font-semibold text-[#5F6B94] sm:flex-row sm:px-6">
        <Image src="/brand/logo-h.webp" alt="Narriv" width={96} height={36} className="h-6 w-auto" />
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/pricing" className="hover:text-[#101334]">{L("Pricing", "Harga")}</Link>
          <Link href="/help" className="hover:text-[#101334]">{L("Help", "Bantuan")}</Link>
          <Link href="/privacy" className="hover:text-[#101334]">{L("Privacy", "Privasi")}</Link>
          <Link href="/terms" className="hover:text-[#101334]">{L("Terms", "Ketentuan")}</Link>
          <Link href="/login" className="hover:text-[#101334]">{L("Sign in", "Masuk")}</Link>
        </nav>
        <LanguageSwitch />
      </footer>
    </div>
  );
}
