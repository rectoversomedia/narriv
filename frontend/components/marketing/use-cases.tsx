"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Loader2, BellRing, Building2, CheckCircle2, Landmark, Megaphone, Mic, Radar, ShieldAlert, ShoppingBag, Wallet, Zap, type LucideIcon } from "lucide-react";
import { startDemoLogin } from "@/components/auth/auth-shell";
import { INK } from "@/components/marketing/site-chrome";
import { useInView } from "@/components/marketing/motion";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

// "Who it fits": one sample scenario per sector, told as trigger → what Narriv sees → what the team does, beside the
// alert Narriv would raise. These are illustrations of how the product works, labelled as such, not client results.

type Case = {
  key: string;
  icon: LucideIcon;
  sector: [string, string];
  trigger: [string, string];
  detect: [string, string];
  action: [string, string];
  alert: { level: "critical" | "high"; title: [string, string]; owner: [string, string]; due: [string, string]; sources: string[]; trend: number[] };
};

const CASES: Case[] = [
  {
    key: "brand",
    icon: ShoppingBag,
    sector: ["Consumer Brands", "Brand & FMCG"],
    trigger: ["A video about an expired product starts spreading on TikTok and in shopping groups.", "Video keluhan produk kedaluwarsa mulai menyebar di TikTok dan grup belanja."],
    detect: ["Within hours Narriv spots the surge in negative mentions, groups them into one issue and flags it high risk.", "Dalam hitungan jam, Narriv menangkap lonjakan sebutan negatif, mengelompokkannya menjadi satu isu, dan menandainya berisiko tinggi."],
    action: ["The brand team gets an alert with an owner and a draft response, before the story reaches national news.", "Tim brand menerima peringatan lengkap dengan penanggung jawab dan draf respons, sebelum isu masuk ke berita nasional."],
    alert: { level: "critical", title: ["Expired Product Complaints Spreading", "Keluhan Produk Kedaluwarsa Menyebar"], owner: ["Brand Team", "Tim Brand"], due: ["3 hours", "3 jam"], sources: ["tiktok", "instagram", "x"], trend: [3, 4, 3, 5, 4, 6, 9, 15, 26, 41] },
  },
  {
    key: "gov",
    icon: Landmark,
    sector: ["Government & Public Bodies", "Pemerintah & Instansi"],
    trigger: ["A new policy causes confusion, and misleading posts about it circulate on social media.", "Kebijakan baru memicu kebingungan, dan informasi keliru tentangnya beredar di media sosial."],
    detect: ["Narriv maps the narratives taking shape, where they started and which questions the public keeps asking.", "Narriv memetakan narasi yang berkembang, dari mana asalnya, dan pertanyaan apa yang paling sering diajukan publik."],
    action: ["The public relations office issues a clarification that answers those questions, with a brief for leadership the same day.", "Humas menerbitkan klarifikasi yang menjawab pertanyaan utama publik, disertai ringkasan untuk pimpinan di hari yang sama."],
    alert: { level: "high", title: ["Misleading Claims About the New Policy", "Informasi Keliru soal Kebijakan Baru"], owner: ["Public Relations", "Humas"], due: ["6 hours", "6 jam"], sources: ["x", "facebook", "news"], trend: [5, 6, 8, 7, 11, 14, 18, 22, 27, 31] },
  },
  {
    key: "cve",
    icon: ShieldAlert,
    sector: ["Countering Violent Extremism", "Pencegahan Ekstremisme"],
    trigger: ["After a security incident, videos praising the attacker and hoaxes about the victims spread on social media in one province.", "Setelah insiden keamanan, video yang memuji pelaku dan hoaks soal korban menyebar di media sosial di satu provinsi."],
    detect: ["Narriv flags incitement, glorification and incident hoaxes by region for your team to review, without showing who posted them.", "Narriv menandai narasi ajakan kekerasan, glorifikasi, dan hoaks per wilayah untuk ditinjau tim, tanpa menampilkan identitas akun."],
    action: ["The team sends counter-narratives and official clarifications to the most affected region, and watches whether messages of peace reach people.", "Tim menyiapkan kontra-narasi dan klarifikasi resmi untuk wilayah paling terdampak, lalu memantau apakah pesan damai menjangkau publik."],
    alert: { level: "high", title: ["Incident Hoaxes Rising in Central Java", "Hoaks Pasca-Insiden Meningkat di Jawa Tengah"], owner: ["Counter-Narrative Team", "Tim Kontra-Narasi"], due: ["3 hours", "3 jam"], sources: ["x", "tiktok", "facebook"], trend: [2, 3, 3, 4, 7, 12, 19, 25, 31, 34] },
  },
  {
    key: "bank",
    icon: Wallet,
    sector: ["Banking & Finance", "Perbankan & Keuangan"],
    trigger: ["An app outage on payday sets off a wave of customer complaints.", "Gangguan aplikasi di tanggal gajian memicu gelombang keluhan nasabah."],
    detect: ["Narriv links complaints on X, news and YouTube into one issue, tracks it hour by hour, and checks whether AI assistants have started to mention it.", "Narriv menyatukan keluhan di X, berita, dan YouTube menjadi satu isu, memantaunya per jam, dan memeriksa apakah asisten AI mulai menyebutnya."],
    action: ["Digital and communications teams act together, and the board receives an impact summary that afternoon.", "Tim digital dan corporate communication bergerak bersama, dan direksi menerima ringkasan dampak di sore harinya."],
    alert: { level: "critical", title: ["Mobile App Outage on Payday", "Gangguan Aplikasi di Tanggal Gajian"], owner: ["Digital Team", "Tim Digital"], due: ["4 hours", "4 jam"], sources: ["x", "news", "youtube"], trend: [9, 11, 10, 12, 11, 14, 18, 31, 44, 52] },
  },
  {
    key: "soe",
    icon: Building2,
    sector: ["State-Owned & Corporate", "BUMN & Korporasi"],
    trigger: ["An incident at an operating site is reported by regional media.", "Insiden di lokasi operasional diberitakan oleh media daerah."],
    detect: ["Narriv follows the story as it moves from local to national outlets and rates the risk to the company's reputation.", "Narriv mengikuti penyebaran berita dari media lokal ke nasional dan menilai risikonya terhadap reputasi perusahaan."],
    action: ["An official statement is ready before the incident becomes a national headline.", "Pernyataan resmi sudah siap sebelum insiden menjadi tajuk utama nasional."],
    alert: { level: "high", title: ["Site Incident Reaching National Media", "Insiden Lokasi Mulai Diberitakan Nasional"], owner: ["Corporate Secretary", "Sekretaris Perusahaan"], due: ["5 hours", "5 jam"], sources: ["news", "youtube", "x"], trend: [2, 2, 3, 3, 4, 6, 9, 13, 19, 24] },
  },
  {
    key: "figure",
    icon: Mic,
    sector: ["Public Figures", "Tokoh Publik"],
    trigger: ["A clip of an old statement goes viral again, stripped of its context.", "Potongan video pernyataan lama kembali viral tanpa konteks."],
    detect: ["Narriv traces the accounts and outlets that spread it first, and the sentiment on each channel.", "Narriv melacak akun dan media yang pertama menyebarkannya, serta sentimen di setiap kanal."],
    action: ["The team responds with a clarification grounded in data rather than guesswork.", "Tim merespons dengan klarifikasi berbasis data, bukan tebakan."],
    alert: { level: "high", title: ["Old Clip Resurfacing Without Context", "Video Lama Viral Kembali Tanpa Konteks"], owner: ["Communications Team", "Tim Komunikasi"], due: ["2 hours", "2 jam"], sources: ["tiktok", "x", "instagram"], trend: [1, 1, 2, 2, 3, 8, 17, 29, 38, 46] },
  },
  {
    key: "agency",
    icon: Megaphone,
    sector: ["PR Agencies", "Agensi PR"],
    trigger: ["An agency manages a dozen clients, each with its own issues and competitors.", "Agensi menangani belasan klien, masing-masing dengan isu dan kompetitornya sendiri."],
    detect: ["Each client has its own workspace in Narriv, with competitor comparisons and alerts routed to the right account team.", "Setiap klien punya workspace sendiri di Narriv, lengkap dengan perbandingan kompetitor dan peringatan yang langsung ke tim akun terkait."],
    action: ["Weekly client reports are prepared automatically, so the team spends its time on strategy.", "Laporan mingguan klien tersusun otomatis, sehingga tim bisa fokus pada strategi."],
    alert: { level: "high", title: ["Competitor Campaign Drawing Negative Comparisons", "Kampanye Kompetitor Memicu Perbandingan Negatif"], owner: ["Account Team", "Tim Akun"], due: ["8 hours", "8 jam"], sources: ["instagram", "tiktok", "news"], trend: [6, 7, 7, 9, 10, 12, 13, 17, 20, 23] },
  },
];

const ROTATE_MS = 8000;

function CveDemoButton() {
  const L = useL();
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={async () => {
        setState("loading");
        try {
          await startDemoLogin("cve");
        } catch {
          setState("failed");
        }
      }}
      className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#101334] px-5 text-[14px] font-bold text-white transition hover:bg-[#1A1F4A] disabled:opacity-70"
    >
      {state === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
      {state === "failed" ? L("Could Not Open. Try Again", "Gagal Dibuka. Coba Lagi") : L("Try the CVE Demo", "Coba Demo CVE")}
      {state === "idle" ? <ArrowRight size={16} aria-hidden="true" className="transition group-hover:translate-x-0.5" /> : null}
    </button>
  );
}

/** The alert Narriv would raise for the scenario, with the rising line behind it. */
function AlertMock({ c }: { c: Case }) {
  const L = useL();
  const max = Math.max(...c.alert.trend);
  const pts = c.alert.trend.map((v, i) => `${(i / (c.alert.trend.length - 1)) * 300},${70 - (v / max) * 60}`).join(" ");
  const critical = c.alert.level === "critical";
  return (
    <div className={cn("relative flex h-full flex-col justify-center overflow-hidden rounded-[22px] p-5 text-white sm:p-7", INK)}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[radial-gradient(closest-side,rgba(109,124,255,0.45),transparent)]" />
      <svg viewBox="0 0 300 72" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full opacity-60">
        <defs>
          <linearGradient id={`uc-${c.key}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={critical ? "#F87171" : "#A5B4FF"} stopOpacity="0.35" />
            <stop offset="1" stopColor={critical ? "#F87171" : "#A5B4FF"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,72 ${pts} 300,72`} fill={`url(#uc-${c.key})`} />
        <polyline points={pts} fill="none" stroke={critical ? "#F87171" : "#A5B4FF"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="mk-pop relative rounded-[18px] bg-white p-4 text-left text-[#101334] shadow-[0_24px_60px_rgba(5,8,30,0.5)]">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", critical ? "bg-[#E5484D]" : "bg-[#F59E0B]")} />
            <span className={cn("relative size-2.5 rounded-full", critical ? "bg-[#E5484D]" : "bg-[#F59E0B]")} />
          </span>
          <span className={cn("text-[11px] font-black", critical ? "text-[#B42318]" : "text-[#B45309]")}>
            {critical ? L("Critical Alert", "Peringatan Kritis") : L("High-Risk Alert", "Peringatan Risiko Tinggi")}
          </span>
        </div>
        <p className="mt-1.5 text-[15px] font-black leading-snug">{L(c.alert.title[0], c.alert.title[1])}</p>
        <div className="mt-3 flex items-center gap-2">
          {c.alert.sources.map((s) => (
            <span key={s} className="flex size-7 items-center justify-center rounded-lg bg-[#F6F5F1]"><PlatformIcon platform={s} className="size-4" /></span>
          ))}
        </div>
        <p className="mt-3 border-t border-[#ECEAE3] pt-3 text-[12px] font-semibold text-[#6B7080]">
          {L("Owner", "Penanggung Jawab")}: <b className="text-[#101334]">{L(c.alert.owner[0], c.alert.owner[1])}</b> · {L("Due in", "Tenggat")} {L(c.alert.due[0], c.alert.due[1])}
        </p>
      </div>
      <p className="relative mt-4 text-center text-[11px] font-semibold text-white/45">{L("Sample Scenario · Not Client Data", "Contoh Skenario · Bukan Data Klien")}</p>
    </div>
  );
}

export function UseCases() {
  const L = useL();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ref, inView] = useInView<HTMLDivElement>();
  const c = CASES[active];
  const listRef = useRef<HTMLDivElement>(null);

  // On phones the picker scrolls sideways; keep the chosen sector in sight without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.children[active] as HTMLElement | undefined;
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  // Cycles through the sectors while in view, until the visitor picks one.
  useEffect(() => {
    if (!inView || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % CASES.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [active, inView, paused]);

  const steps: { icon: LucideIcon; label: string; text: string; tone: string }[] = [
    { icon: Zap, label: L("What Happens", "Yang Terjadi"), text: L(c.trigger[0], c.trigger[1]), tone: "bg-[#FEF3C7] text-[#B45309]" },
    { icon: Radar, label: L("What Narriv Detects", "Yang Narriv Tangkap"), text: L(c.detect[0], c.detect[1]), tone: "bg-[#EEF1FF] text-[#465FFF]" },
    { icon: CheckCircle2, label: L("What Your Team Does", "Yang Tim Anda Lakukan"), text: L(c.action[0], c.action[1]), tone: "bg-[#E8F7F0] text-[#047857]" },
  ];

  return (
    <div ref={ref} className="mt-10 lg:mt-14">
      {/* Sector picker: scrolls sideways on phones, wraps and centres on wider screens */}
      <div ref={listRef} role="tablist" aria-label={L("Sectors", "Sektor")} className="relative -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CASES.map((item, i) => {
          const on = i === active;
          return (
            <button
              key={item.key}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="usecase-panel"
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className={cn(
                "relative inline-flex h-11 shrink-0 snap-start items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-4 text-[14px] font-bold transition",
                on ? "bg-[#101334] text-white shadow-[0_10px_24px_rgba(16,19,52,0.25)]" : "bg-white text-[#31406B] border-[1.5px] border-[#101334] shadow-[0_2px_0_#101334] hover:bg-[#EEF1FF]",
              )}
            >
              <item.icon size={16} aria-hidden="true" className={on ? "text-[#A5B4FF]" : "text-[#465FFF]"} />
              {L(item.sector[0], item.sector[1])}
              {/* Time left before the next sector, while it cycles */}
              {on && !paused && inView ? (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-gradient-to-r from-[#6D7CFF] to-[#F472B6]" style={{ animation: `mk-progress ${ROTATE_MS}ms linear forwards` } as CSSProperties} key={`p-${active}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      <div id="usecase-panel" role="tabpanel" className="mt-6 grid gap-4 rounded-[28px] bg-white p-4 border-[1.5px] border-[#101334] shadow-[0_5px_0_#101334] sm:p-6 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div key={c.key} className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-3 pb-1 pt-1 lg:justify-start">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#465FFF] to-[#7B4FE0] text-white shadow-[0_10px_24px_rgba(70,95,255,0.35)]"><c.icon size={20} aria-hidden="true" /></span>
            <h3 className="text-[20px] font-black tracking-[-0.01em] sm:text-[22px]">{L(c.sector[0], c.sector[1])}</h3>
          </div>
          {steps.map((s, i) => (
            <div key={s.label} className="mk-pop flex gap-3 rounded-2xl bg-[#F6F5F1] p-4 text-left" style={{ "--mk-delay": `${i * 140}ms` } as CSSProperties}>
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", s.tone)}><s.icon size={17} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-[#8A8F9E]">{s.label}</p>
                <p className="mt-0.5 text-[14px] font-semibold leading-relaxed text-[#31406B] sm:text-[15px]">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div key={`a-${c.key}`} className="flex min-h-[300px] flex-col gap-3">
          <div className="flex-1"><AlertMock c={c} /></div>
          {/* The extremism sector opens straight into its full demo workspace (fictional data). */}
          {c.key === "cve" ? <CveDemoButton /> : null}
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[13px] font-medium text-[#8A8F9E]">
        <BellRing size={14} aria-hidden="true" />
        {L("These scenarios illustrate how Narriv works and do not represent results from specific clients.", "Skenario di atas menggambarkan cara kerja Narriv dan bukan hasil dari klien tertentu.")}
      </p>
    </div>
  );
}
