"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowRight, Check, ChevronDown, FileText, Minus } from "lucide-react";
import { GRID, INK, PAPER, RULE, SERIF, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

// Plans are agreed with the Narriv team; the app does not gate features by plan. Every line on this page is a
// feature that works today. Keywords checked every hour per brand follow the plan (backend lib/workspace-plan.js
// HOURLY_KEYWORDS: 3 / 10 / 25 / 50).

type PlanId = "pilot" | "intelligence" | "decision" | "command";
type Copy = [string, string];

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: number | null;
  from?: number;
  tagline: Copy;
  audience: Copy;
  popular?: boolean;
  limits: { brands: Copy; users: Copy; retention: Copy };
  adds: Copy[];
}> = [
  {
    id: "pilot",
    name: "Pilot",
    price: 5_000_000,
    tagline: ["Validate the Value.", "Buktikan Nilainya."],
    audience: ["Pilot Projects and Proofs of Concept", "Proyek Percontohan dan Uji Konsep"],
    limits: { brands: ["1", "1"], users: ["1", "1"], retention: ["30 Days", "30 Hari"] },
    adds: [
      ["News and YouTube, Monitored Hourly", "Berita dan YouTube, Dipantau Tiap Jam"],
      ["Alerts With Owner and Deadline", "Peringatan dengan Penanggung Jawab dan Tenggat"],
      ["Daily Briefing and Ask Narriv", "Briefing Harian dan Ask Narriv"],
      ["Reports in PDF, Excel and Email", "Laporan PDF, Excel, dan Email"],
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    price: 25_000_000,
    popular: true,
    tagline: ["Understand What Matters.", "Pahami Hal yang Penting."],
    audience: ["Corporate Communications, Brand and Reputation Teams", "Tim Komunikasi Korporat, Brand, dan Reputasi"],
    limits: { brands: ["1", "1"], users: ["10", "10"], retention: ["12 Months", "12 Bulan"] },
    adds: [
      ["Everything in Pilot", "Seluruh Fitur Pilot"],
      ["AI Visibility Across Leading Assistants", "Visibilitas di Asisten AI Utama"],
      ["Scheduled Board Reports", "Laporan Terjadwal untuk Direksi"],
      ["Cases and Response Plans", "Kasus dan Rencana Respons"],
    ],
  },
  {
    id: "decision",
    name: "Decision",
    price: 50_000_000,
    tagline: ["Turn Intelligence Into Action.", "Ubah Wawasan Menjadi Tindakan."],
    audience: ["Organisations With Multiple Brands or Products", "Organisasi dengan Beberapa Brand atau Produk"],
    limits: { brands: ["3", "3"], users: ["50", "50"], retention: ["12 Months", "12 Bulan"] },
    adds: [
      ["Everything in Intelligence", "Seluruh Fitur Intelligence"],
      ["Instagram, TikTok, X and Facebook", "Instagram, TikTok, X, dan Facebook"],
      ["Slack, Microsoft Teams and Webhooks", "Slack, Microsoft Teams, dan Webhook"],
      ["Escalation Matrix", "Matriks Eskalasi"],
    ],
  },
  {
    id: "command",
    name: "Command",
    price: null,
    from: 100_000_000,
    tagline: ["Scale Across the Organisation.", "Terapkan di Seluruh Organisasi."],
    audience: ["Banks, Telcos, Ministries and Agencies", "Bank, Telko, Kementerian, dan Agensi"],
    limits: { brands: ["As Needed", "Sesuai Kebutuhan"], users: ["Unlimited", "Tanpa Batas"], retention: ["Custom", "Kustom"] },
    adds: [
      ["Everything in Decision", "Seluruh Fitur Decision"],
      ["Dedicated Success Manager", "Success Manager Khusus"],
      ["Quarterly Strategy Review", "Tinjauan Strategi Tiap Kuartal"],
      ["Service Level Agreement (SLA)", "Perjanjian Tingkat Layanan (SLA)"],
    ],
  },
];

const ORDER: PlanId[] = ["pilot", "intelligence", "decision", "command"];
const from = (id: PlanId) => ORDER.slice(ORDER.indexOf(id));

const COMPARE: Array<{ group: Copy; rows: Array<{ label: Copy; plans: PlanId[] | Record<PlanId, Copy> }> }> = [
  {
    group: ["Capacity", "Kapasitas"],
    rows: [
      { label: ["Brands Monitored", "Brand yang Dipantau"], plans: { pilot: ["1", "1"], intelligence: ["1", "1"], decision: ["3", "3"], command: ["As Needed", "Sesuai Kebutuhan"] } },
      { label: ["Hourly Keywords per Brand", "Kata Kunci Dipantau Tiap Jam per Brand"], plans: { pilot: ["3", "3"], intelligence: ["10", "10"], decision: ["25", "25"], command: ["50", "50"] } },
      { label: ["Users", "Pengguna"], plans: { pilot: ["1", "1"], intelligence: ["10", "10"], decision: ["50", "50"], command: ["Unlimited", "Tanpa Batas"] } },
      { label: ["Data Retention", "Masa Simpan Data"], plans: { pilot: ["30 Days", "30 Hari"], intelligence: ["12 Months", "12 Bulan"], decision: ["12 Months", "12 Bulan"], command: ["Custom", "Kustom"] } },
    ],
  },
  {
    group: ["Monitoring", "Pemantauan"],
    rows: [
      { label: ["Online News and YouTube, Hourly", "Berita Online dan YouTube, Tiap Jam"], plans: from("pilot") },
      { label: ["Automatic Sentiment and Issue Detection", "Deteksi Sentimen dan Isu Otomatis"], plans: from("pilot") },
      { label: ["Instagram, TikTok, X, Facebook", "Instagram, TikTok, X, Facebook"], plans: from("decision") },
      { label: ["AI Visibility", "Visibilitas di AI"], plans: from("intelligence") },
    ],
  },
  {
    group: ["Action", "Tindakan"],
    rows: [
      { label: ["Alerts With Owner and Deadline", "Peringatan dengan Penanggung Jawab dan Tenggat"], plans: from("pilot") },
      { label: ["Email Notifications", "Notifikasi Email"], plans: from("pilot") },
      { label: ["Cases and Response Plans", "Kasus dan Rencana Respons"], plans: from("intelligence") },
      { label: ["Escalation Matrix", "Matriks Eskalasi"], plans: from("decision") },
      { label: ["Slack, Teams and Webhooks", "Slack, Teams, dan Webhook"], plans: from("decision") },
    ],
  },
  {
    group: ["Reports", "Laporan"],
    rows: [
      { label: ["Daily Briefing and Ask Narriv", "Briefing Harian dan Ask Narriv"], plans: from("pilot") },
      { label: ["Export to PDF, Excel and Email", "Ekspor ke PDF, Excel, dan Email"], plans: from("pilot") },
      { label: ["Scheduled Reports", "Laporan Terjadwal"], plans: from("intelligence") },
    ],
  },
  {
    group: ["Service", "Layanan"],
    rows: [
      { label: ["Success Manager and Quarterly Review", "Success Manager dan Tinjauan Kuartalan"], plans: from("command") },
      { label: ["Service Level Agreement", "SLA"], plans: from("command") },
    ],
  },
];

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function PricingPage() {
  const L = useL();
  const P = (c: Copy) => L(c[0], c[1]);
  const [annual, setAnnual] = useState(false);
  const discount = annual ? 0.8 : 1;

  const faqs: Array<[Copy, Copy]> = [
    [["Is There a Free Trial?", "Apakah Tersedia Uji Coba Gratis?"], ["Yes. A 14-day trial with full access, set up together with the Narriv team. The live demo requires no registration.", "Ya. Uji coba 14 hari dengan akses penuh, disiapkan bersama tim Narriv. Demo langsung dapat diakses tanpa registrasi."]],
    [["How Does Billing Work?", "Bagaimana Sistem Pembayarannya?"], ["Payment is by bank transfer against an invoice, billed monthly or annually. Annual billing saves 20%.", "Pembayaran melalui transfer bank berdasarkan invoice, ditagih bulanan atau tahunan. Tagihan tahunan lebih hemat 20%."]],
    [["Can We Change Plans Later?", "Apakah Paket Dapat Diubah?"], ["Yes. Contact the Narriv team and we will update your workspace plan.", "Ya. Hubungi tim Narriv dan kami akan menyesuaikan paket workspace Anda."]],
    [["What Counts as a Brand?", "Apa yang Dihitung sebagai Brand?"], ["One workspace: a brand, product or client with its own keywords, alerts and reports.", "Satu workspace: satu brand, produk, atau klien dengan kata kunci, peringatan, dan laporan tersendiri."]],
    [["Why Is Social Media Not in Every Plan?", "Mengapa Media Sosial Tidak Tersedia di Semua Paket?"], ["Collecting data from Instagram, TikTok, X and Facebook carries a direct cost per run, so it is included from the Decision plan and activated by the Narriv team.", "Pengambilan data dari Instagram, TikTok, X, dan Facebook memiliki biaya langsung setiap kali dijalankan, sehingga tersedia mulai paket Decision dan diaktifkan oleh tim Narriv."]],
  ];

  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <section className={cn("relative overflow-hidden pb-28 text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <SiteHeader />
        <div className="relative mx-auto max-w-3xl px-4 pt-10 text-center sm:px-6">
          <h1 className="text-balance text-[34px] font-black leading-[1.06] tracking-[-0.03em] sm:text-[52px]">
            {L("The Right Plan", "Paket yang Tepat")}{" "}
            <span className={cn("mk-brush", SERIF)}>{L("for Every Stage of Your Team.", "untuk Setiap Tahap Tim Anda.")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-medium text-white/60">{L("Every plan begins with a 14-day trial on your own brand.", "Setiap paket diawali uji coba 14 hari menggunakan brand Anda sendiri.")}</p>
          <div role="group" aria-label={L("Billing Period", "Periode Tagihan")} className="mt-8 inline-flex rounded-full bg-white/10 p-1">
            {[
              { v: false, label: L("Monthly", "Bulanan") },
              { v: true, label: L("Annual", "Tahunan") },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                aria-pressed={annual === o.v}
                onClick={() => setAnnual(o.v)}
                className={cn("flex h-10 items-center gap-2 rounded-full px-5 text-[14px] font-bold transition", annual === o.v ? "bg-white text-[#101334]" : "text-white/75 hover:text-white")}
              >
                {o.label}
                {o.v ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", annual ? "bg-[#E8F7F0] text-[#047857]" : "bg-[#22C55E]/20 text-[#86EFAC]")}>-20%</span> : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="relative mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        {/* Each card's parts (heading, price, limits, features, button) sit on shared rows, so they line up across cards. */}
        <div className="grid gap-x-4 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative grid grid-rows-subgrid gap-y-5 rounded-[22px] p-6 [grid-row:span_5]",
                plan.popular ? "border-[1.5px] border-[#101334] bg-[#101334] text-white shadow-[0_6px_0_#465FFF] lg:-translate-y-2" : "border-[1.5px] border-[#101334] bg-white shadow-[0_5px_0_#101334]",
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[8px] border-[1.5px] border-[#101334] bg-[#FBBF24] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#101334] shadow-[0_2px_0_#101334]">
                  {L("Most Popular", "Paling Populer")}
                </span>
              ) : null}

              <div className="text-center">
                <p className={cn("font-mono text-[10.5px] font-bold uppercase tracking-[0.1em]", plan.popular ? "text-[#A5B4FF]" : "text-[#5F6B94]")}>{L("Plan", "Paket")} 0{PLANS.indexOf(plan) + 1}</p>
                <h2 className="mt-1 text-[22px] font-black tracking-[-0.02em]">{plan.name}</h2>
                <p className={cn("mt-1 text-[14px] font-semibold", plan.popular ? "text-[#A5B4FF]" : "text-[#465FFF]")}>{P(plan.tagline)}</p>
                <p className={cn("mt-1 text-[13px] font-medium", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{P(plan.audience)}</p>
              </div>

              <div className="text-center">
                {plan.price ? (
                  <>
                    <p className="whitespace-nowrap text-[28px] font-black leading-none tracking-[-0.03em] tabular-nums">{rupiah(Math.round(plan.price * discount))}</p>
                    <p className={cn("mt-1.5 text-[13px] font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>
                      {L("per month", "per bulan")}
                      {annual ? <span className="block">{L("Save", "Hemat")} {rupiah(plan.price - Math.round(plan.price * discount))}</span> : null}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[28px] font-black leading-none tracking-[-0.03em]">{L("Custom", "Kustom")}</p>
                    <p className={cn("mt-1.5 text-[13px] font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{L(`from ${rupiah(plan.from ?? 0)} per month`, `mulai ${rupiah(plan.from ?? 0)} per bulan`)}</p>
                  </>
                )}
              </div>

              <dl className={cn("space-y-2 self-start rounded-2xl px-4 py-3.5", plan.popular ? "bg-white/[0.08]" : "bg-[#F6F7FC]")}>
                {[
                  { k: L("Brands", "Brand"), v: P(plan.limits.brands) },
                  { k: L("Users", "Pengguna"), v: P(plan.limits.users) },
                  { k: L("Data Retention", "Masa Simpan Data"), v: P(plan.limits.retention) },
                ].map((x) => (
                  <div key={x.k} className="flex items-center justify-between gap-3 text-[13px]">
                    <dt className={cn("font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{x.k}</dt>
                    <dd className="whitespace-nowrap font-black">{x.v}</dd>
                  </div>
                ))}
              </dl>

              <ul className="space-y-2.5">
                {plan.adds.map((f, i) => (
                  <li key={f[0]} className={cn("flex items-start gap-2.5 text-[14px] font-medium", plan.popular ? "text-white/85" : "text-[#31406B]", i === 0 && plan.id !== "pilot" && "font-bold")}>
                    <Check size={16} strokeWidth={3} aria-hidden="true" className={cn("mt-0.5 shrink-0", plan.popular ? "text-[#86EFAC]" : "text-[#12A66A]")} />
                    {P(f)}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.price ? `/signup?plan=${plan.id}` : "/help#contact"}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 self-end rounded-xl text-[15px] font-bold transition",
                  plan.popular ? "bg-[#465FFF] text-white hover:bg-[#3B52F5]" : "bg-[#101334] text-white hover:bg-[#1B2155]",
                )}
              >
                {plan.price ? L("Start a 14-Day Trial", "Mulai Uji Coba 14 Hari") : L("Contact Sales", "Hubungi Tim Kami")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[40px]">{L("What", "Isi")} <span className={cn("mk-brush", SERIF)}>{L("Each Plan Includes.", "Setiap Paket.")}</span></h2>
        </div>
        <div className="mt-10 overflow-hidden rounded-[22px] bg-white border-[1.5px] border-[#101334] shadow-[0_5px_0_#101334]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#070A1F] text-white">
                  <th className="px-5 py-4 text-[13px] font-bold">{L("Feature", "Fitur")}</th>
                  {PLANS.map((p) => <th key={p.id} className={cn("px-3 py-4 text-center text-[14px] font-black", p.popular && "bg-[#465FFF]")}>{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((g) => (
                  <Fragment key={g.group[0]}>
                    <tr className="bg-[#F5F7FF]">
                      <td colSpan={5} className="px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#465FFF]">{P(g.group)}</td>
                    </tr>
                    {g.rows.map((row) => (
                      <tr key={row.label[0]} className="even:bg-[#FAFBFF]">
                        <td className="px-5 py-3.5 text-[14px] font-semibold text-[#31406B]">{P(row.label)}</td>
                        {ORDER.map((id) => (
                          <td key={id} className="px-3 py-3.5 text-center">
                            {Array.isArray(row.plans) ? (
                              row.plans.includes(id) ? (
                                <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#E8F7F0] text-[#047857]"><Check size={14} strokeWidth={3} aria-label={L("Included", "Termasuk")} /></span>
                              ) : (
                                <span className="inline-flex size-6 items-center justify-center text-[#B8BED6]"><Minus size={14} aria-label={L("Not Included", "Tidak Termasuk")} /></span>
                              )
                            ) : (
                              <span className="text-[14px] font-black">{P(row.plans[id])}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20">
        <div>
          <h2 className="text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[40px]">{L("Plans", "Seputar Paket")} <span className={cn("mk-brush", SERIF)}>{L("and Billing.", "dan Pembayaran.")}</span></h2>
        </div>
        <div className={cn("border-t", RULE)}>
          {faqs.map(([q, a]) => (
            <details key={q[0]} className={cn("group border-b", RULE)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                {P(q)}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[#465FFF] shadow-sm transition group-open:rotate-180"><ChevronDown size={16} aria-hidden="true" /></span>
              </summary>
              <p className="-mt-1 pb-5 pr-12 text-[15px] font-medium leading-relaxed text-[#5B6070]">{P(a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="px-4 pb-20 sm:px-6">
        <div className={cn("relative mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-16 text-center text-white", INK)}>
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.45),transparent)]" />
          <h2 className="relative text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[44px]">{L("Not Sure", "Belum Yakin")} <span className={cn("mk-brush", SERIF)}>{L("Which Plan Fits?", "Paket Mana yang Sesuai?")}</span></h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[16px] font-medium text-white/70">{L("Start with the trial. After 14 days, we will review the results with you.", "Mulai dengan uji coba. Setelah 14 hari, kami akan meninjau hasilnya bersama Anda.")}</p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[#070A1F] shadow-[0_12px_40px_rgba(165,180,255,0.35)] hover:bg-[#EEF1FF]">
              {L("Start Your Trial", "Mulai Uji Coba")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/help#contact" className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/[0.06]">{L("Contact Sales", "Hubungi Tim Kami")}</Link>
          </div>
          <a href="/contoh-laporan-narriv.pdf" target="_blank" rel="noopener" className="relative mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-white/80 underline-offset-4 hover:text-white hover:underline">
            <FileText size={16} aria-hidden="true" />
            {L("View a Sample Board Report (PDF)", "Lihat Contoh Laporan Direksi (PDF)")}
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
