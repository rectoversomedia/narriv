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
    tagline: ["Validate the value.", "Buktikan nilainya."],
    audience: ["Pilot projects and proofs of concept", "Proyek percontohan dan uji konsep"],
    limits: { brands: ["1", "1"], users: ["1", "1"], retention: ["30 days", "30 hari"] },
    adds: [
      ["News and YouTube, checked hourly", "Berita dan YouTube, dicek tiap jam"],
      ["Alerts with an owner and a deadline", "Peringatan dengan PJ dan tenggat"],
      ["Daily briefing and Ask Narriv", "Briefing harian dan Ask Narriv"],
      ["Reports in PDF, Excel and email", "Laporan PDF, Excel, dan email"],
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    price: 25_000_000,
    popular: true,
    tagline: ["Understand what matters.", "Pahami yang penting."],
    audience: ["Corporate comms, brand and reputation teams", "Tim komunikasi korporat, brand, dan reputasi"],
    limits: { brands: ["1", "1"], users: ["10", "10"], retention: ["12 months", "12 bulan"] },
    adds: [
      ["Everything in Pilot", "Semua di Pilot"],
      ["AI visibility: ChatGPT, Claude and more", "Visibilitas di AI: ChatGPT, Claude, dan lainnya"],
      ["Scheduled reports for the board", "Laporan terjadwal untuk direksi"],
      ["Cases and response plans", "Kasus dan rencana respons"],
    ],
  },
  {
    id: "decision",
    name: "Decision",
    price: 50_000_000,
    tagline: ["Turn intelligence into action.", "Ubah wawasan jadi tindakan."],
    audience: ["Organisations with several brands or products", "Organisasi dengan beberapa brand atau produk"],
    limits: { brands: ["3", "3"], users: ["50", "50"], retention: ["12 months", "12 bulan"] },
    adds: [
      ["Everything in Intelligence", "Semua di Intelligence"],
      ["Instagram, TikTok, X and Facebook", "Instagram, TikTok, X, dan Facebook"],
      ["Slack, Microsoft Teams and webhooks", "Slack, Microsoft Teams, dan webhook"],
      ["Escalation matrix", "Matriks eskalasi"],
    ],
  },
  {
    id: "command",
    name: "Command",
    price: null,
    from: 100_000_000,
    tagline: ["Run it across the organisation.", "Jalankan di seluruh organisasi."],
    audience: ["Banks, telcos, ministries and agencies", "Bank, telko, kementerian, dan agensi"],
    limits: { brands: ["As needed", "Sesuai kebutuhan"], users: ["Unlimited", "Tanpa batas"], retention: ["Custom", "Kustom"] },
    adds: [
      ["Everything in Decision", "Semua di Decision"],
      ["A dedicated success manager", "Success manager khusus"],
      ["Quarterly strategy review", "Tinjauan strategi tiap kuartal"],
      ["Service level agreement", "Perjanjian tingkat layanan (SLA)"],
    ],
  },
];

const ORDER: PlanId[] = ["pilot", "intelligence", "decision", "command"];
const from = (id: PlanId) => ORDER.slice(ORDER.indexOf(id));

const COMPARE: Array<{ group: Copy; rows: Array<{ label: Copy; plans: PlanId[] | Record<PlanId, Copy> }> }> = [
  {
    group: ["Capacity", "Kapasitas"],
    rows: [
      { label: ["Brands monitored", "Brand yang dipantau"], plans: { pilot: ["1", "1"], intelligence: ["1", "1"], decision: ["3", "3"], command: ["As needed", "Sesuai kebutuhan"] } },
      { label: ["Keywords checked hourly, per brand", "Kata kunci dicek tiap jam, per brand"], plans: { pilot: ["3", "3"], intelligence: ["10", "10"], decision: ["25", "25"], command: ["50", "50"] } },
      { label: ["Users", "Pengguna"], plans: { pilot: ["1", "1"], intelligence: ["10", "10"], decision: ["50", "50"], command: ["Unlimited", "Tanpa batas"] } },
      { label: ["Data kept for", "Data disimpan"], plans: { pilot: ["30 days", "30 hari"], intelligence: ["12 months", "12 bulan"], decision: ["12 months", "12 bulan"], command: ["Custom", "Kustom"] } },
    ],
  },
  {
    group: ["Monitoring", "Pemantauan"],
    rows: [
      { label: ["Online news and YouTube, hourly", "Berita online dan YouTube, tiap jam"], plans: from("pilot") },
      { label: ["Sentiment and issues, automatic", "Sentimen dan isu otomatis"], plans: from("pilot") },
      { label: ["Instagram, TikTok, X, Facebook", "Instagram, TikTok, X, Facebook"], plans: from("decision") },
      { label: ["AI visibility", "Visibilitas di AI"], plans: from("intelligence") },
    ],
  },
  {
    group: ["Action", "Tindakan"],
    rows: [
      { label: ["Alerts with owner and deadline", "Peringatan dengan PJ dan tenggat"], plans: from("pilot") },
      { label: ["Email notifications", "Notifikasi email"], plans: from("pilot") },
      { label: ["Cases and response plans", "Kasus dan rencana respons"], plans: from("intelligence") },
      { label: ["Escalation matrix", "Matriks eskalasi"], plans: from("decision") },
      { label: ["Slack, Teams, webhooks", "Slack, Teams, webhook"], plans: from("decision") },
    ],
  },
  {
    group: ["Reports", "Laporan"],
    rows: [
      { label: ["Daily briefing and Ask Narriv", "Briefing harian dan Ask Narriv"], plans: from("pilot") },
      { label: ["Export to PDF, Excel, email", "Ekspor PDF, Excel, email"], plans: from("pilot") },
      { label: ["Scheduled reports", "Laporan terjadwal"], plans: from("intelligence") },
    ],
  },
  {
    group: ["Service", "Layanan"],
    rows: [
      { label: ["Success manager and quarterly review", "Success manager dan tinjauan kuartalan"], plans: from("command") },
      { label: ["Service level agreement", "SLA"], plans: from("command") },
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
    [["Is there a free trial?", "Apakah ada uji coba gratis?"], ["Yes: 14 days with full access, set up with the Narriv team. The live demo needs no sign-up at all.", "Ada. Uji coba 14 hari dengan akses penuh, diatur bersama tim Narriv. Demo langsung bahkan tanpa daftar."]],
    [["How do we pay?", "Bagaimana cara bayarnya?"], ["Bank transfer against an invoice, monthly or yearly. Yearly is 20% cheaper.", "Transfer bank dengan invoice, bulanan atau tahunan. Tahunan lebih hemat 20%."]],
    [["Can we change plans later?", "Bisa ganti paket nanti?"], ["Yes. Tell the Narriv team and we change your workspace's plan.", "Bisa. Hubungi tim Narriv, lalu kami yang mengubah paket workspace Anda."]],
    [["What counts as a brand?", "Apa yang dihitung sebagai brand?"], ["One workspace: a brand, product or client with its own keywords, alerts and reports.", "Satu workspace: satu brand, produk, atau klien dengan kata kunci, peringatan, dan laporannya sendiri."]],
    [["Why is social media not in every plan?", "Kenapa media sosial tidak ada di semua paket?"], ["Collecting Instagram, TikTok, X and Facebook has a real cost per run, so it is included from Decision and switched on by the Narriv team.", "Pengambilan data Instagram, TikTok, X, dan Facebook ada biaya nyata tiap kali jalan, jadi tersedia mulai paket Decision dan diaktifkan oleh tim Narriv."]],
  ];

  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <section className={cn("relative overflow-hidden pb-28 text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <SiteHeader />
        <div className="relative mx-auto max-w-3xl px-4 pt-10 text-center sm:px-6">
          <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#A5B4FF]">{L("Pricing", "Harga")}</p>
          <h1 className="mt-3 text-balance text-[34px] font-black leading-[1.06] tracking-[-0.03em] sm:text-[52px]">
            {L("One plan", "Satu paket")}{" "}
            <span className={cn("bg-gradient-to-r from-[#8EA0FF] via-[#B8A6FF] to-[#F5A3DA] bg-clip-text text-transparent", SERIF)}>{L("for each stage of your team.", "untuk tiap tahap tim Anda.")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-medium text-white/60">{L("Every plan starts with a 14-day trial on your own brand.", "Semua paket dimulai dengan uji coba 14 hari memakai brand Anda sendiri.")}</p>
          <div role="group" aria-label={L("Billing period", "Periode tagihan")} className="mt-8 inline-flex rounded-full bg-white/10 p-1">
            {[
              { v: false, label: L("Monthly", "Bulanan") },
              { v: true, label: L("Yearly", "Tahunan") },
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
                plan.popular ? "bg-[#101334] text-white shadow-[0_24px_60px_rgba(16,19,52,0.35)]" : "bg-white shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.08)]",
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#465FFF] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[0_6px_16px_rgba(70,95,255,0.4)]">
                  {L("Most chosen", "Paling dipilih")}
                </span>
              ) : null}

              <div className="text-center">
                <h2 className="text-[20px] font-black">{plan.name}</h2>
                <p className={cn("mt-1 text-[14px] font-semibold", plan.popular ? "text-[#A5B4FF]" : "text-[#465FFF]")}>{P(plan.tagline)}</p>
                <p className={cn("mt-1 text-[13px] font-medium", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{P(plan.audience)}</p>
              </div>

              <div className="text-center">
                {plan.price ? (
                  <>
                    <p className="whitespace-nowrap text-[26px] font-black leading-none tracking-[-0.02em] tabular-nums">{rupiah(Math.round(plan.price * discount))}</p>
                    <p className={cn("mt-1.5 text-[13px] font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>
                      {L("per month", "per bulan")}
                      {annual ? <span className="block">{L("save", "hemat")} {rupiah(plan.price - Math.round(plan.price * discount))}</span> : null}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[26px] font-black leading-none tracking-[-0.02em]">{L("Custom", "Kustom")}</p>
                    <p className={cn("mt-1.5 text-[13px] font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{L(`from ${rupiah(plan.from ?? 0)} per month`, `mulai ${rupiah(plan.from ?? 0)} per bulan`)}</p>
                  </>
                )}
              </div>

              <dl className={cn("space-y-2 self-start rounded-2xl px-4 py-3.5", plan.popular ? "bg-white/[0.08]" : "bg-[#F5F7FF]")}>
                {[
                  { k: L("Brands", "Brand"), v: P(plan.limits.brands) },
                  { k: L("Users", "Pengguna"), v: P(plan.limits.users) },
                  { k: L("Data kept", "Data disimpan"), v: P(plan.limits.retention) },
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
                {plan.price ? L("Start the 14-day trial", "Mulai uji coba 14 hari") : L("Talk to us", "Hubungi kami")}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#465FFF]">{L("Compare", "Bandingkan")}</p>
          <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[40px]">{L("What", "Isi")} <span className={cn("bg-gradient-to-r from-[#465FFF] to-[#9B4DDB] bg-clip-text text-transparent", SERIF)}>{L("each plan includes.", "tiap paket.")}</span></h2>
        </div>
        <div className="mt-10 overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.07)]">
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
                                <span className="inline-flex size-6 items-center justify-center text-[#B8BED6]"><Minus size={14} aria-label={L("Not included", "Tidak termasuk")} /></span>
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
          <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#465FFF]">FAQ</p>
          <h2 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[40px]">{L("About plans", "Soal paket")} <span className={cn("bg-gradient-to-r from-[#465FFF] to-[#9B4DDB] bg-clip-text text-transparent", SERIF)}>{L("and billing.", "dan pembayaran.")}</span></h2>
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
          <h2 className="relative text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[44px]">{L("Not sure", "Belum yakin")} <span className={cn("bg-gradient-to-r from-[#8EA0FF] via-[#B8A6FF] to-[#F5A3DA] bg-clip-text text-transparent", SERIF)}>{L("which plan fits?", "paket mana yang cocok?")}</span></h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[16px] font-medium text-white/70">{L("Start with the trial. We look at the results with you after 14 days.", "Mulai dari uji coba. Setelah 14 hari, kami tinjau hasilnya bersama Anda.")}</p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[#070A1F] shadow-[0_12px_40px_rgba(165,180,255,0.35)] hover:bg-[#EEF1FF]">
              {L("Start the trial", "Mulai uji coba")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/help#contact" className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/[0.06]">{L("Talk to us", "Hubungi kami")}</Link>
          </div>
          <a href="/contoh-laporan-narriv.pdf" target="_blank" rel="noopener" className="relative mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-white/80 underline-offset-4 hover:text-white hover:underline">
            <FileText size={16} aria-hidden="true" />
            {L("See a sample board report (PDF)", "Lihat contoh laporan untuk direksi (PDF)")}
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
