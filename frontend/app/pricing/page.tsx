"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  Users,
  Globe,
  BarChart3,
  Shield,
  Headphones,
  ArrowRight,
  Brain,
  Target,
  Crown,
  Rocket,
  MessageCircle,
  FileText,
  Bot,
  Workflow,
  Sliders,
} from "lucide-react";

// Subscription plans matching pricing image
const plans = [
  {
    id: "pilot",
    name: "PILOT",
    tagline: "Validate the value.",
    icon: Rocket,
    price: 5_000_000,
    period: "bulan",
    description: "Perfect untuk pilot projects dan proof of concept",
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
    period: "bulan",
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
    period: "bulan",
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
    period: "bulan+",
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
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const discount = billingPeriod === "annual" ? 0.8 : 1; // 20% discount for annual

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-20 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-purple-500 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm mb-6">
            <Sparkles size={16} />
            <span>{t("badge")}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{t("title")}</h1>
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
            const PlanIcon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-indigo-500 bg-gradient-to-b from-indigo-50 to-white shadow-xl shadow-indigo-100 ring-2 ring-indigo-500"
                    : "border-slate-200 bg-white shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
                      <Zap size={14} />
                      <span>{t("mostPopular")}</span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center">
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${
                    plan.popular ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    <PlanIcon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
                  <p className="mt-2 text-xs text-slate-400">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mt-6 text-center">
                  {isCustom ? (
                    <div className="text-3xl font-black text-slate-900"><span>Custom</span></div>
                  ) : (
                    <>
                      <div className="text-4xl font-black text-slate-900">
                        {formatPrice(price)}
                        <span className="text-base font-normal text-slate-400">/{plan.period}</span>
                      </div>
                      {billingPeriod === "annual" && (
                        <span>Save {formatPrice(plan.price - price)}/bulan</span>
                      )}
                    </>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={isCustom ? "/contact" : `/signup?plan=${plan.id}`}
                  className={`mt-8 block w-full rounded-xl py-3.5 text-center text-base font-bold transition ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02]"
                      : "border-2 border-slate-200 text-slate-900 hover:border-indigo-500 hover:text-indigo-600"
                  }`}
                >
                  {isCustom ? t("contactSales") : plan.price ? t("startTrial") : t("contactSales")}
                </Link>

                {/* Limits */}
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Intelligence Topics</span>
                    <span className="font-semibold text-slate-900">{plan.limits.topics}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Users</span>
                    <span className="font-semibold text-slate-900">{plan.limits.users}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Data Retention</span>
                    <span className="font-semibold text-slate-900">{plan.limits.retention}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 space-y-3">
                  {plan.included.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-slate-600">{feature}</span>
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
            <p className="mt-4 text-lg text-slate-500">{t("compareSubtitle")}</p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-4 pr-4 text-left text-sm font-bold text-slate-900">
                    Feature
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
                  <>
                    <tr key={category.category} className="bg-slate-50">
                      <td colSpan={5} className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <category.icon size={16} className="text-indigo-500" />
                          {category.category}
                        </div>
                      </td>
                    </tr>
                    {category.items.map((item) => (
                      <tr key={item.name} className="border-b border-slate-100">
                        <td className="py-4 pr-4 text-sm text-slate-600">{item.name}</td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.pilot === "boolean" ? (
                            item.pilot ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
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
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
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
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
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
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-bold text-slate-900">{item.command}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
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
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 px-8 py-16 text-center text-white">
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
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition"
            >
              <Headphones size={18} />
              {t("contactSales")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-slate-900">Narriv</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-slate-900">{t("terms")}</Link>
            <Link href="/privacy" className="hover:text-slate-900">{t("privacy")}</Link>
            <Link href="/contact" className="hover:text-slate-900">{t("contact")}</Link>
          </div>
          <p className="text-sm text-slate-400">© 2024 Narriv. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
