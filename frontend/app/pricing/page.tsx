"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useL } from "@/lib/use-l";
import { ArrowRight, Brain, Target, Crown, Rocket, MessageCircle, FileText, Workflow, Sliders } from "lucide-react";

// Subscription plans matching pricing image
const plans = [
  {
    id: "pilot",
    name: "PILOT",
    tagline: "Validate the value.",
    icon: Rocket,
    price: 5_000_000,
    period: "month",
    description: "Pilot projects and proofs of concept",
    popular: false,
    limits: {
      topics: 5,
      users: 1,
      retention: "30 days",
    },
    included: [
      "Signals Monitoring",
      "Alerts",
      "Email Notifications",
    ],
    excluded: [
      "Intelligence",
      "AI Visibility",
      "WhatsApp Notifications",
      "Action Center",
      "Slack/Teams Integration",
      "API Access",
    ],
  },
  {
    id: "intelligence",
    name: "INTELLIGENCE",
    tagline: "Understand what matters.",
    icon: Brain,
    price: 25_000_000,
    period: "month",
    description: "Corporate communications, brand, and reputation teams",
    popular: true,
    limits: {
      topics: 50,
      users: 10,
      retention: "12 months",
    },
    included: [
      "Signals Monitoring",
      "Alerts",
      "Intelligence",
      "AI Visibility",
      "WhatsApp Notifications",
      "Monthly Executive Report",
    ],
    excluded: [
      "Action Center",
      "Slack/Teams Integration",
      "Weekly Report",
      "Custom AI Models",
      "API Access",
    ],
  },
  {
    id: "decision",
    name: "DECISION",
    tagline: "Turn intelligence into action.",
    icon: Target,
    price: 50_000_000,
    period: "month",
    description: "Large organizations managing multiple brands, products, and issues",
    popular: false,
    limits: {
      topics: 200,
      users: 50,
      retention: "12 months",
    },
    included: [
      "Everything in Intelligence",
      "Action Center",
      "Escalation Workflow",
      "Slack Integration",
      "Microsoft Teams Integration",
      "WhatsApp Alerts",
      "Weekly Executive Brief",
    ],
    excluded: [
      "Custom AI Models",
      "API Access",
      "Dedicated Infrastructure",
      "Enterprise SLA",
    ],
  },
  {
    id: "command",
    name: "COMMAND",
    tagline: "Operationalize intelligence.",
    icon: Crown,
    price: 100_000_000,
    period: "month+",
    description: "Banks, telcos, ministries, and enterprise organizations",
    popular: false,
    limits: {
      topics: "Unlimited",
      users: "Unlimited",
      retention: "Custom",
    },
    included: [
      "Everything in Decision",
      "Custom AI Models",
      "API Access",
      "Dedicated Infrastructure",
      "Enterprise SLA",
      "Dedicated Success Manager",
      "Quarterly Strategic Review",
    ],
    excluded: [],
  },
];

// Feature comparison table
const comparisonFeatures = [
  {
    category: "Core Intelligence",
    icon: Brain,
    items: [
      { name: "Signals Monitoring", pilot: true, intelligence: true, decision: true, command: true },
      { name: "Alerts", pilot: true, intelligence: true, decision: true, command: true },
      { name: "Intelligence", pilot: false, intelligence: true, decision: true, command: true },
      { name: "AI Visibility", pilot: false, intelligence: true, decision: true, command: true },
    ],
  },
  {
    category: "Notifications",
    icon: MessageCircle,
    items: [
      { name: "Email Notifications", pilot: true, intelligence: true, decision: true, command: true },
      { name: "WhatsApp Notifications", pilot: false, intelligence: true, decision: true, command: true },
    ],
  },
  {
    category: "Action & Workflow",
    icon: Workflow,
    items: [
      { name: "Action Center", pilot: false, intelligence: false, decision: true, command: true },
      { name: "Escalation Workflow", pilot: false, intelligence: false, decision: true, command: true },
    ],
  },
  {
    category: "Integrations",
    icon: Sliders,
    items: [
      { name: "Slack Integration", pilot: false, intelligence: false, decision: true, command: true },
      { name: "Microsoft Teams", pilot: false, intelligence: false, decision: true, command: true },
      { name: "API Access", pilot: false, intelligence: false, decision: false, command: true },
    ],
  },
  {
    category: "Reports",
    icon: FileText,
    items: [
      { name: "Monthly Executive Report", pilot: false, intelligence: true, decision: true, command: true },
      { name: "Weekly Executive Brief", pilot: false, intelligence: false, decision: true, command: true },
    ],
  },
  {
    category: "Enterprise",
    icon: Crown,
    items: [
      { name: "Custom AI Models", pilot: false, intelligence: false, decision: false, command: true },
      { name: "Dedicated Infrastructure", pilot: false, intelligence: false, decision: false, command: true },
      { name: "Enterprise SLA", pilot: false, intelligence: false, decision: false, command: true },
      { name: "Dedicated Success Manager", pilot: false, intelligence: false, decision: false, command: true },
      { name: "Quarterly Strategic Review", pilot: false, intelligence: false, decision: false, command: true },
    ],
  },
];


// Indonesian for the plan and comparison copy above (plan names stay as product names).
const ID_COPY: Record<string, string> = {
  "Validate the value.": "Buktikan nilainya.",
  "Pilot projects and proofs of concept": "Proyek percontohan dan uji konsep",
  "Understand what matters.": "Pahami yang penting.",
  "Corporate communications, brand, and reputation teams": "Tim komunikasi korporat, brand, dan reputasi",
  "Turn intelligence into action.": "Ubah intelijen jadi tindakan.",
  "Large organizations managing multiple brands, products, and issues": "Organisasi besar yang mengelola banyak brand, produk, dan isu",
  "Operationalize intelligence.": "Jadikan intelijen bagian dari operasional.",
  "Banks, telcos, ministries, and enterprise organizations": "Bank, telko, kementerian, dan organisasi enterprise",
  "30 days": "30 hari",
  "12 months": "12 bulan",
  Unlimited: "Tanpa batas",
  Custom: "Kustom",
  "Signals Monitoring": "Pemantauan Percakapan",
  Alerts: "Peringatan",
  "Email Notifications": "Notifikasi Email",
  Intelligence: "Intelijen",
  "AI Visibility": "Visibilitas AI",
  "WhatsApp Notifications": "Notifikasi WhatsApp",
  "Action Center": "Action Center",
  "Slack/Teams Integration": "Integrasi Slack/Teams",
  "API Access": "Akses API",
  "Monthly Executive Report": "Laporan Eksekutif Bulanan",
  "Weekly Report": "Laporan Mingguan",
  "Custom AI Models": "Model AI Kustom",
  "Everything in Intelligence": "Semua fitur Intelligence",
  "Escalation Workflow": "Alur Eskalasi",
  "Slack Integration": "Integrasi Slack",
  "Microsoft Teams Integration": "Integrasi Microsoft Teams",
  "Microsoft Teams": "Microsoft Teams",
  "WhatsApp Alerts": "Peringatan WhatsApp",
  "Weekly Executive Brief": "Ringkasan Eksekutif Mingguan",
  "Dedicated Infrastructure": "Infrastruktur Khusus",
  "Enterprise SLA": "SLA Enterprise",
  "Everything in Decision": "Semua fitur Decision",
  "Dedicated Success Manager": "Success Manager Khusus",
  "Quarterly Strategic Review": "Tinjauan Strategis Kuartalan",
  "Core Intelligence": "Intelijen Inti",
  Notifications: "Notifikasi",
  "Action & Workflow": "Aksi & Alur Kerja",
  Integrations: "Integrasi",
  Reports: "Laporan",
  Enterprise: "Enterprise",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const L = useL();
  const tx = (text: string | number) => (typeof text === "string" ? L(text, ID_COPY[text] ?? text) : text);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const discount = billingPeriod === "annual" ? 0.8 : 1; // 20% discount for annual

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative overflow-hidden bg-[#101334] px-6 py-20 text-white">
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#A5B4FC]">{L("Pricing", "Harga")}</p>
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em] sm:text-[42px]">{t("title")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">{t("subtitle")}</p>

          {/* Billing Toggle */}
          <div className="mt-10 inline-flex items-center gap-4 rounded-full border border-white/20 bg-white/10 p-1.5 backdrop-blur-sm">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                billingPeriod === "monthly"
                  ? "bg-white text-slate-900 shadow-lg"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition flex items-center gap-2 ${
                billingPeriod === "annual"
                  ? "bg-white text-slate-900 shadow-lg"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {t("annual")}
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
                <span>-20%</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Pricing Cards */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = Math.round(plan.price * discount);
            const isCustom = plan.id === "command";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 sm:p-8 ${
                  plan.popular
                    ? "border-[#465FFF] bg-white shadow-md ring-2 ring-[#465FFF]"
                    : "border-slate-200 bg-white shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
                      <span>{t("mostPopular")}</span>
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-[#5A6478]">{tx(plan.tagline)}</p>
                  <p className="mt-2 text-xs text-[#5A6478]">{tx(plan.description)}</p>
                </div>

                {/* Price */}
                <div className="mt-6 text-center">
                  {isCustom ? (
                    <div className="text-[26px] font-bold leading-tight text-slate-900 xl:text-[28px]"><span>{tx("Custom")}</span></div>
                  ) : (
                    <>
                      {/* Price and period wrap as a unit so long rupiah amounts never overflow the card. */}
                      <div className="flex flex-wrap items-baseline justify-center gap-x-1 text-[26px] font-bold leading-tight tabular-nums text-slate-900 xl:text-[28px]">
                        <span className="whitespace-nowrap">{formatPrice(price)}</span>
                        <span className="text-[14px] font-normal text-[#5A6478]">/{plan.period === "month+" ? L("month+", "bulan+") : L("month", "bulan")}</span>
                      </div>
                      {billingPeriod === "annual" && (
                        <span>{L(`Save ${formatPrice(plan.price - price)}/month`, `Hemat ${formatPrice(plan.price - price)}/bulan`)}</span>
                      )}
                    </>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={isCustom ? "/help#contact" : `/signup?plan=${plan.id}`}
                  className={`mt-8 block w-full rounded-xl py-3.5 text-center text-base font-bold transition ${
                    plan.popular
                      ? "bg-[#465FFF] text-white shadow-sm hover:bg-[#3B52F5]"
                      : "border-2 border-slate-200 text-slate-900 hover:border-indigo-500 hover:text-indigo-600"
                  }`}
                >
                  {isCustom ? t("contactSales") : plan.price ? t("startTrial") : t("contactSales")}
                </Link>

                {/* Limits */}
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A6478]">{L("Intelligence topics", "Topik intelijen")}</span>
                    <span className="font-semibold text-slate-900">{tx(plan.limits.topics)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A6478]">{L("Users", "Pengguna")}</span>
                    <span className="font-semibold text-slate-900">{tx(plan.limits.users)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A6478]">{L("Data retention", "Retensi data")}</span>
                    <span className="font-semibold text-slate-900">{tx(plan.limits.retention)}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 space-y-3">
                  {plan.included.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-slate-600">{tx(feature)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900">{t("compareTitle")}</h2>
            <p className="mt-4 text-lg text-[#5A6478]">{t("compareSubtitle")}</p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-4 pr-4 text-left text-sm font-bold text-slate-900">
                    {L("Feature", "Fitur")}
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-slate-600">
                    PILOT
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-indigo-600">
                    INTELLIGENCE
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-slate-600">
                    DECISION
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-slate-600">
                    COMMAND
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <Fragment key={category.category}>
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <category.icon size={16} className="text-indigo-500" />
                          {tx(category.category)}
                        </div>
                      </td>
                    </tr>
                    {category.items.map((item) => (
                      <tr key={item.name} className="border-b border-slate-100">
                        <td className="py-4 pr-4 text-sm text-slate-600">{tx(item.name)}</td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.pilot === "boolean" ? (
                            item.pilot ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[#5A6478]">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-slate-900">{item.pilot}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.intelligence === "boolean" ? (
                            item.intelligence ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[#5A6478]">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-indigo-600">{item.intelligence}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.decision === "boolean" ? (
                            item.decision ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[#5A6478]">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-slate-900">{item.decision}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.command === "boolean" ? (
                            item.command ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[#5A6478]">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-bold text-slate-900">{item.command}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-black text-slate-900">{t("faqTitle")}</h2>

          <div className="mt-12 space-y-6">
            {[
              { q: t("faq1.q"), a: t("faq1.a") },
              { q: t("faq2.q"), a: t("faq2.a") },
              { q: t("faq3.q"), a: t("faq3.a") },
              { q: t("faq4.q"), a: t("faq4.a") },
              { q: t("faq5.q"), a: t("faq5.a") },
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-bold text-slate-900">{item.q}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-[#101334] px-8 py-16 text-center text-white">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">{t("ctaSubtitle")}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-xl hover:scale-[1.02] transition"
            >
              {t("ctaButton")}
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/help#contact"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition"
            >
              {t("contactSales")}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-bold text-white/80">
            <a href="/contoh-laporan-narriv.pdf" target="_blank" rel="noopener" className="inline-flex items-center gap-2 underline-offset-4 hover:text-white hover:underline">
              <FileText size={16} />
              {L("See a sample board report (PDF)", "Lihat contoh laporan untuk BOD (PDF)")}
            </a>
            <Link href="/login" className="inline-flex items-center gap-2 underline-offset-4 hover:text-white hover:underline">
              {L("Try the live demo", "Coba demo langsung")}
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">{L("Sample data from a fictional bank.", "Contoh memakai data bank fiktif.")}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-slate-900">Narriv</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-[#5A6478]">
            <Link href="/help#contact" className="hover:text-slate-900">{t("contact")}</Link>
          </div>
          <p className="text-sm text-[#5A6478]">© {new Date().getFullYear()} Narriv. {L("All rights reserved.", "Hak cipta dilindungi.")}</p>
        </div>
      </footer>
    </div>
  );
}
