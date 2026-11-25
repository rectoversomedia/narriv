"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowRight, Building2, Check, ChevronDown, Crown, FileText, Minus, Rocket, Sprout, Zap, type LucideIcon } from "lucide-react";
import { GRID, INK, PAPER, RULE, SERIF, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { SITE_URL, faqJsonLd, jsonLd } from "@/lib/seo";
import { useSiteHref } from "@/lib/site-lang";

// Every line on this page is a feature that works today. Keywords checked every hour per brand follow the plan
// (backend lib/workspace-plan.js HOURLY_KEYWORDS: 2 / 3 / 10 / 25 / 50). Prices are shown for the self-serve plans
// (Starter, Pilot) and as a starting point for Intelligence; Decision and Command are quoted by the team.
// Prices are written in full (Rp2.500.000), never shortened to "jt" or "rb".

type PlanId = "starter" | "pilot" | "intelligence" | "decision" | "command";
type Copy = [string, string];

/** Rp2.500.000: the full amount with Indonesian thousands separators. */
const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const PLANS: Array<{
  id: PlanId;
  name: string;
  tagline: Copy;
  audience: Copy;
  popular?: boolean;
  /** Monthly price; `from` shows it as a starting price; none means "talk to us". */
  price?: { monthly: number; from?: boolean };
  limits: { brands: Copy; users: Copy; retention: Copy };
  adds: Copy[];
}> = [
  {
    id: "starter",
    name: "Starter",
    tagline: ["Start Listening.", "Mulai Mendengar."],
    audience: ["Small Businesses and New Brands", "UMKM dan Brand yang Baru Mulai"],
    price: { monthly: 2_500_000 },
    limits: { brands: ["1", "1"], users: ["1", "1"], retention: ["30 Days", "30 Hari"] },
    adds: [
      ["News, YouTube and Telegram, Hourly", "Berita, YouTube, dan Telegram, Tiap Jam"],
      ["AI Sentiment and Issue Detection", "Sentimen dan Isu Dideteksi AI"],
      ["Daily Briefing and Weekly PDF Report", "Briefing Harian dan Laporan Mingguan PDF"],
      ["Email Alerts", "Peringatan Email"],
    ],
  },
  {
    id: "pilot",
    name: "Pilot",
    tagline: ["Know Before It Grows.", "Tahu Sebelum Membesar."],
    audience: ["Communications Teams", "Tim Komunikasi"],
    price: { monthly: 5_000_000 },
    limits: { brands: ["1", "1"], users: ["3", "3"], retention: ["90 Days", "90 Hari"] },
    adds: [
      ["Everything in Starter", "Seluruh Fitur Starter"],
      ["WhatsApp Alerts", "Peringatan WhatsApp"],
      ["AI Visibility: ChatGPT and Claude", "Visibilitas AI: ChatGPT dan Claude"],
      ["Issue Forecast, Claim Check, Ask narriv", "Prediksi Isu, Cek Klaim, Ask narriv"],
      ["Response Plans Drafted by AI", "Rencana Respons Disusun AI"],
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    popular: true,
    tagline: ["Understand What Matters.", "Pahami Hal yang Penting."],
    audience: ["Corporate Communications, Brand and Reputation Teams", "Tim Komunikasi Korporat, Brand, dan Reputasi"],
    price: { monthly: 17_500_000, from: true },
    limits: { brands: ["1", "1"], users: ["10", "10"], retention: ["12 Months", "12 Bulan"] },
    adds: [
      ["Everything in Pilot", "Seluruh Fitur Pilot"],
      ["Social Media: 3 Platforms", "Media Sosial: 3 Platform"],
      ["Competitor Check and Account Network", "Cek Kompetitor dan Jaringan Akun"],
      ["Press Release and Media Selection", "Siaran Pers dan Pilih Media"],
      ["Scheduled Board Reports", "Laporan Terjadwal untuk Direksi"],
    ],
  },
  {
    id: "decision",
    name: "Decision",
    tagline: ["Turn Intelligence Into Action.", "Ubah Wawasan Menjadi Tindakan."],
    audience: ["Organisations With Multiple Brands or Products", "Organisasi dengan Beberapa Brand atau Produk"],
    limits: { brands: ["3", "3"], users: ["50", "50"], retention: ["12 Months", "12 Bulan"] },
    adds: [
      ["Everything in Intelligence", "Seluruh Fitur Intelligence"],
      ["Social Media: 4 Platforms", "Media Sosial: 4 Platform"],
      ["Influencer Database and Campaigns", "Database dan Kampanye Influencer"],
      ["Agency Label on Reports", "Label Agensi di Laporan"],
      ["Slack, Microsoft Teams and Webhooks", "Slack, Microsoft Teams, dan Webhook"],
    ],
  },
  {
    id: "command",
    name: "Command",
    tagline: ["Scale Across the Organisation.", "Terapkan di Seluruh Organisasi."],
    audience: ["Banks, Telcos, Ministries and Agencies", "Bank, Telko, Kementerian, dan Agensi"],
    limits: { brands: ["As Needed", "Sesuai Kebutuhan"], users: ["Unlimited", "Tanpa Batas"], retention: ["Custom", "Kustom"] },
    adds: [
      ["Everything in Decision", "Seluruh Fitur Decision"],
      ["Social Media: 6 Platforms", "Media Sosial: 6 Platform"],
      ["Dedicated Success Manager", "Success Manager Khusus"],
      ["Quarterly Strategy Review", "Tinjauan Strategi Tiap Kuartal"],
      ["Service Level Agreement (SLA)", "Perjanjian Tingkat Layanan (SLA)"],
    ],
  },
];

/** Each plan's own mark: an icon and a colour, so the five read apart at a glance. */
const MARK: Record<PlanId, { icon: LucideIcon; color: string; soft: string }> = {
  starter: { icon: Sprout, color: "#12A66A", soft: "#E5F6EE" },
  pilot: { icon: Rocket, color: "#F59E0B", soft: "#FFF4E5" },
  intelligence: { icon: Zap, color: "#465FFF", soft: "#EEF1FF" },
  decision: { icon: Building2, color: "#8B5CFF", soft: "#F1ECFF" },
  command: { icon: Crown, color: "#E85BB8", soft: "#FDEBF6" },
};

const ORDER: PlanId[] = ["starter", "pilot", "intelligence", "decision", "command"];
const from = (id: PlanId) => ORDER.slice(ORDER.indexOf(id));

/** Add-ons with a public price (the rest is quoted by the team). */
const ADDONS: Array<{ name: Copy; price: number; unit: Copy; desc: Copy; for: Copy }> = [
  { name: ["Social Media Lite", "Media Sosial Lite"], price: 1_500_000, unit: ["/month", "/bulan"], desc: ["Two platforms of your choice for brands that are busy on one or two networks.", "Dua platform pilihan, untuk brand yang ramai di satu atau dua platform saja."], for: ["Starter and Pilot", "Starter dan Pilot"] },
  { name: ["Extra Social Media Quota", "Tambah Kuota Media Sosial"], price: 1_500_000, unit: ["/100 collections", "/100 pengambilan"], desc: ["During a crisis Narriv collects every hour. Valid until the end of the month.", "Saat krisis Narriv mengambil data tiap jam. Berlaku sampai akhir bulan berjalan."], for: ["All plans", "Semua paket"] },
  { name: ["Influencer Database", "Database Influencer"], price: 2_500_000, unit: ["/month", "/bulan"], desc: ["8,500+ Instagram, TikTok and YouTube creators, filtered by city, category, tier and engagement.", "8.500+ kreator Instagram, TikTok, dan YouTube dengan filter kota, kategori, tier, dan engagement."], for: ["Pilot and Intelligence", "Pilot dan Intelligence"] },
  { name: ["Extra Keyword", "Kata Kunci Tambahan"], price: 500_000, unit: ["/keyword/month", "/kata kunci/bulan"], desc: ["A product, person or campaign checked every hour beyond your plan.", "Produk, tokoh, atau kampanye yang dicek tiap jam di luar kuota paket."], for: ["All plans", "Semua paket"] },
];

const COMPARE: Array<{ group: Copy; rows: Array<{ label: Copy; plans: PlanId[] | Record<PlanId, Copy> }> }> = [
  {
    group: ["Capacity", "Kapasitas"],
    rows: [
      { label: ["Brands Monitored", "Brand yang Dipantau"], plans: { starter: ["1", "1"], pilot: ["1", "1"], intelligence: ["1", "1"], decision: ["3", "3"], command: ["As Needed", "Sesuai Kebutuhan"] } },
      { label: ["Keywords Checked Every Hour, per Brand", "Kata Kunci Dipantau Tiap Jam, per Brand"], plans: { starter: ["2", "2"], pilot: ["3", "3"], intelligence: ["10", "10"], decision: ["25", "25"], command: ["50", "50"] } },
      { label: ["Users", "Pengguna"], plans: { starter: ["1", "1"], pilot: ["3", "3"], intelligence: ["10", "10"], decision: ["50", "50"], command: ["Unlimited", "Tanpa Batas"] } },
      { label: ["Data Retention", "Masa Simpan Data"], plans: { starter: ["30 Days", "30 Hari"], pilot: ["90 Days", "90 Hari"], intelligence: ["12 Months", "12 Bulan"], decision: ["12 Months", "12 Bulan"], command: ["Custom", "Kustom"] } },
    ],
  },
  {
    group: ["Monitoring", "Pemantauan"],
    rows: [
      { label: ["Online News, YouTube and Telegram, Hourly", "Berita Online, YouTube, dan Telegram, Tiap Jam"], plans: from("starter") },
      { label: ["Automatic Sentiment and Issue Detection", "Deteksi Sentimen dan Isu Otomatis"], plans: from("starter") },
      { label: ["Instagram, TikTok, X, Facebook", "Instagram, TikTok, X, Facebook"], plans: { starter: ["Add-on", "Add-on"], pilot: ["Add-on", "Add-on"], intelligence: ["3 platforms", "3 platform"], decision: ["4 platforms", "4 platform"], command: ["6 platforms", "6 platform"] } },
      { label: ["AI Visibility (ChatGPT and Claude)", "Visibilitas AI (ChatGPT dan Claude)"], plans: from("pilot") },
      { label: ["Competitor Check and Account Network", "Cek Kompetitor dan Jaringan Akun"], plans: from("intelligence") },
    ],
  },
  {
    group: ["Action", "Tindakan"],
    rows: [
      { label: ["Email Alerts", "Peringatan Email"], plans: from("starter") },
      { label: ["WhatsApp Alerts", "Peringatan WhatsApp"], plans: from("pilot") },
      { label: ["Response Plans Drafted by AI, Approved by You", "Rencana Respons dari AI, Disetujui Tim Anda"], plans: from("pilot") },
      { label: ["Press Release and Media Selection", "Siaran Pers dan Pilih Media"], plans: from("intelligence") },
      { label: ["Influencer Database and Campaigns", "Database dan Kampanye Influencer"], plans: { starter: ["—", "—"], pilot: ["Add-on", "Add-on"], intelligence: ["Add-on", "Add-on"], decision: ["Included", "Termasuk"], command: ["Included", "Termasuk"] } },
      { label: ["Escalation Matrix", "Matriks Eskalasi"], plans: from("decision") },
      { label: ["Slack, Teams and Webhooks", "Slack, Teams, dan Webhook"], plans: from("decision") },
    ],
  },
  {
    group: ["Reports", "Laporan"],
    rows: [
      { label: ["Daily Briefing and PDF Reports", "Briefing Harian dan Laporan PDF"], plans: from("starter") },
      { label: ["Ask narriv", "Ask narriv"], plans: from("pilot") },
      { label: ["Scheduled Board Reports", "Laporan Terjadwal untuk Direksi"], plans: from("intelligence") },
      { label: ["Agency Label on Reports", "Label Agensi di Laporan"], plans: from("decision") },
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

export default function PricingPage() {
  const L = useL();
  const P = (c: Copy) => L(c[0], c[1]);
  const href = useSiteHref();

  const faqs: Array<[Copy, Copy]> = [
    [["Is There a Free Trial?", "Apakah Tersedia Uji Coba Gratis?"], ["Yes. Sign up and start right away: 14 days on your own brand with three keywords checked every hour across online news and YouTube, plus every feature of the Pilot plan except social media. No card is needed. The live demo needs no sign-up at all.", "Ya. Daftar dan langsung mulai: 14 hari untuk brand Anda sendiri, dengan tiga kata kunci dipantau tiap jam di berita online dan YouTube, plus seluruh fitur paket Pilot kecuali media sosial. Tidak perlu kartu kredit. Demo langsung bahkan tidak perlu mendaftar."]],
    [["What Happens After the Trial?", "Apa yang Terjadi Setelah Uji Coba?"], ["Hourly monitoring pauses until your plan is active. Nothing is deleted: your keywords, alerts and reports stay, and monitoring resumes as soon as the plan starts.", "Pemantauan tiap jam berhenti sementara sampai paket Anda aktif. Tidak ada yang dihapus: kata kunci, peringatan, dan laporan tetap tersimpan, dan pemantauan langsung berjalan lagi begitu paket dimulai."]],
    [["How Does Billing Work?", "Bagaimana Sistem Pembayarannya?"], ["Prices are per month per brand, before VAT. Starter and Pilot are billed monthly; Intelligence and Decision run for at least three months; Command is an annual contract. Payment is by bank transfer against an invoice, due 14 days after it is issued. Paying a year in advance saves 15%.", "Harga per bulan per brand, belum termasuk PPN. Starter dan Pilot ditagih bulanan, Intelligence dan Decision minimal 3 bulan, Command kontrak tahunan. Pembayaran melalui transfer bank berdasarkan invoice, jatuh tempo 14 hari setelah terbit. Bayar setahun di muka hemat 15%."]],
    [["Can We Change Plans Later?", "Apakah Paket Dapat Diubah?"], ["Yes. Upgrades apply right away, with the difference charged pro rata. Downgrades apply from the next billing period.", "Ya. Naik paket berlaku saat itu juga dengan selisih dihitung prorata. Turun paket berlaku di awal periode tagihan berikutnya."]],
    [["What Counts as a Brand?", "Apa yang Dihitung sebagai Brand?"], ["One workspace: a brand, product or client with its own keywords, alerts and reports.", "Satu workspace: satu brand, produk, atau klien dengan kata kunci, peringatan, dan laporan tersendiri."]],
    [["Why Is Social Media Not in Every Plan?", "Mengapa Media Sosial Tidak Tersedia di Semua Paket?"], ["Collecting data from Instagram, TikTok, X and Facebook carries a direct cost per run. It is included from the Intelligence plan with a monthly quota, and available for Starter and Pilot as the Social Media Lite add-on. When the quota runs out, news, YouTube and Telegram keep running and more quota can be added at any time.", "Pengambilan data dari Instagram, TikTok, X, dan Facebook memiliki biaya langsung setiap kali dijalankan. Media sosial termasuk mulai paket Intelligence dengan kuota bulanan, dan tersedia untuk Starter dan Pilot lewat add-on Media Sosial Lite. Bila kuota habis, berita, YouTube, dan Telegram tetap berjalan, dan kuota bisa ditambah kapan saja."]],
  ];

  // Plans and answers as structured data in the page's language, for search results and AI answers.
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Narriv",
      description: L("Media monitoring and narrative intelligence for brands in Indonesia.", "Media monitoring dan narrative intelligence untuk brand di Indonesia."),
      brand: { "@type": "Brand", name: "Narriv" },
      url: SITE_URL + href("/pricing"),
      offers: PLANS.map((plan) => ({
        "@type": "Offer",
        name: `Narriv ${plan.name}`,
        description: `${P(plan.tagline)} ${P(plan.audience)}.`,
        url: SITE_URL + href("/pricing"),
        ...(plan.price ? { price: plan.price.monthly, priceCurrency: "IDR" } : {}),
      })),
    },
    faqJsonLd(faqs.map(([q, a]) => ({ q: P(q), a: P(a) }))),
  ];

  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <section className={cn("relative overflow-hidden pb-28 text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <SiteHeader />
        <div className="relative mx-auto max-w-3xl px-4 pt-10 text-center sm:px-6">
          <h1 className="text-balance text-[34px] font-black leading-[1.06] tracking-[-0.03em] sm:text-[52px]">
            {L("The Right Plan", "Paket yang Tepat")}{" "}
            <span className={cn("mk-brush", SERIF)}>{L("for Every Stage of Your Team.", "untuk Setiap Tahap Tim Anda.")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-medium text-white/60">{L("Start with a free 14-day trial on your own brand. No card needed.", "Mulai dengan uji coba gratis 14 hari untuk brand Anda sendiri. Tanpa kartu kredit.")}</p>
        </div>
      </section>

      {/* Plans */}
      <section className="relative mx-auto -mt-16 max-w-[1560px] px-4 sm:px-6 lg:px-10">
        {/* Each card's parts (heading, price, limits, features, button) sit on shared rows, so they line up across cards. */}
        <div className="grid gap-x-5 gap-y-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                {(() => {
                  const m = MARK[plan.id];
                  const Icon = m.icon;
                  return (
                    <div className="flex flex-col items-center gap-2">
                      <span className={cn("grid size-12 place-items-center rounded-[14px] border-[1.5px]", plan.popular ? "border-white/25 shadow-[0_3px_0_rgba(255,255,255,0.18)]" : "border-[#101334] shadow-[0_3px_0_#101334]")} style={{ background: plan.popular ? m.color : m.soft, color: plan.popular ? "#fff" : m.color }}>
                        <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
                      </span>
                    </div>
                  );
                })()}
                <h2 className="mt-1 text-[22px] font-black tracking-[-0.02em]">{plan.name}</h2>
                <p className={cn("mt-1 text-[14px] font-semibold", plan.popular ? "text-[#A5B4FF]" : "text-[#465FFF]")}>{P(plan.tagline)}</p>
                <p className={cn("mt-1 text-[13px] font-medium", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{P(plan.audience)}</p>
              </div>

              <div className="text-center">
                {plan.price ? (
                  <>
                    {plan.price.from ? <p className={cn("text-[12px] font-bold uppercase tracking-[0.06em]", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{L("Starting at", "Mulai dari")}</p> : null}
                    <p className="whitespace-nowrap text-[23px] font-black leading-none tracking-[-0.02em]">{rupiah(plan.price.monthly)}</p>
                    <p className={cn("mt-1.5 text-[13px] font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{L("per month, before VAT", "per bulan, belum PPN")}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[23px] font-black leading-none tracking-[-0.02em]">{L("Let's talk", "Hubungi Kami")}</p>
                    <p className={cn("mt-1.5 text-[13px] font-semibold", plan.popular ? "text-white/60" : "text-[#5F6B94]")}>{L("Priced to your scope", "Harga sesuai cakupan Anda")}</p>
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
                  <li key={f[0]} className={cn("flex items-start gap-2.5 text-[14px] font-medium", plan.popular ? "text-white/85" : "text-[#31406B]", i === 0 && plan.id !== "starter" && "font-bold")}>
                    <Check size={16} strokeWidth={3} aria-hidden="true" className={cn("mt-0.5 shrink-0", plan.popular ? "text-[#86EFAC]" : "text-[#12A66A]")} />
                    {P(f)}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.price ? `/signup?plan=${plan.id}` : href("/help#contact")}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 self-end rounded-xl px-2 text-center text-[14px] font-bold leading-tight transition",
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
      <section className="mx-auto max-w-[1560px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[40px]">{L("What", "Isi")} <span className={cn("mk-brush", SERIF)}>{L("Each Plan Includes.", "Setiap Paket.")}</span></h2>
        </div>
        <div className="mt-10 overflow-hidden rounded-[22px] bg-white border-[1.5px] border-[#101334] shadow-[0_5px_0_#101334]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
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
                      <td colSpan={6} className="px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#465FFF]">{P(g.group)}</td>
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

      {/* Add-ons */}
      <section className="mx-auto max-w-[1560px] px-4 pb-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[40px]">{L("Add What", "Tambahkan Sesuai")} <span className={cn("mk-brush", SERIF)}>{L("You Need.", "Kebutuhan.")}</span></h2>
          <p className="mt-3 text-[15px] font-medium text-[#5F6B94]">{L("Monthly add-ons follow your plan's billing period. Prices before VAT.", "Add-on bulanan mengikuti periode tagihan paket. Harga belum termasuk PPN.")}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ADDONS.map((a) => (
            <div key={a.name[0]} className="flex flex-col rounded-[22px] border-[1.5px] border-[#101334] bg-white p-5 shadow-[0_5px_0_#101334]">
              <h3 className="text-[16px] font-black">{P(a.name)}</h3>
              <p className="mt-2 text-[20px] font-black tracking-[-0.02em] text-[#3247D9]">{rupiah(a.price)}<span className="text-[12.5px] font-semibold text-[#5F6B94]"> {P(a.unit)}</span></p>
              <p className="mt-2 flex-1 text-[13.5px] font-medium leading-relaxed text-[#5F6B94]">{P(a.desc)}</p>
              <span className="mt-3 self-start rounded-full bg-[#F4F6FD] px-3 py-1 text-[12px] font-bold text-[#101334]">{P(a.for)}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[14px] font-medium text-[#5F6B94]">{L("Press releases, influencer campaigns, short videos, paid ads and social media management are quoted inside your response plan: you only pay for what you approve.", "Siaran pers, kampanye influencer, video pendek, iklan berbayar, dan kelola media sosial ditawarkan langsung di rencana respons Anda: Anda hanya membayar yang Anda setujui.")}</p>
      </section>

      {/* Questions */}
      <section className="mx-auto grid max-w-[1560px] gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20 lg:px-10">
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
        <div className={cn("relative mx-auto max-w-[1480px] overflow-hidden rounded-[32px] px-6 py-16 text-center text-white", INK)}>
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.45),transparent)]" />
          <h2 className="relative text-[30px] font-black leading-tight tracking-[-0.03em] sm:text-[44px]">{L("Not Sure", "Belum Yakin")} <span className={cn("mk-brush", SERIF)}>{L("Which Plan Fits?", "Paket Mana yang Sesuai?")}</span></h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[16px] font-medium text-white/70">{L("Start with the free trial. Before it ends, we will review the results with you and recommend the plan that fits.", "Mulai dengan uji coba gratis. Sebelum berakhir, kami meninjau hasilnya bersama Anda dan menyarankan paket yang paling sesuai.")}</p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-[#070A1F] shadow-[0_12px_40px_rgba(165,180,255,0.35)] hover:bg-[#EEF1FF]">
              {L("Start Your Trial", "Mulai Uji Coba")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href={href("/help#contact")} className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-white/[0.06]">{L("Contact Sales", "Hubungi Tim Kami")}</Link>
          </div>
          <SampleReportLink />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// The sample board report comes in both languages: the link asks which one before opening it.
function SampleReportLink() {
  const L = useL();
  const [open, setOpen] = useState(false);
  const files = [
    { href: "/contoh-laporan-narriv.pdf?v=2", label: "English" },
    { href: "/contoh-laporan-narriv-id.pdf?v=2", label: "Bahasa Indonesia" },
  ];
  return (
    <div className="relative mt-6 flex flex-col items-center gap-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-2 text-[14px] font-bold text-white/80 underline-offset-4 hover:text-white hover:underline">
        <FileText size={16} aria-hidden="true" />
        {L("View a Sample Board Report (PDF)", "Lihat Contoh Laporan Direksi (PDF)")}
        <ChevronDown size={15} aria-hidden="true" className={cn("transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">{L("Choose a Language", "Pilih Bahasa")}</p>
          <div className="flex gap-2">
            {files.map((f) => (
              <a key={f.href} href={f.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="inline-flex h-10 items-center rounded-full px-5 text-[13px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] hover:bg-white/[0.08]">
                {f.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
