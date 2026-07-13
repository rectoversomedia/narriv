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
  CreditCard,
  Clock,
  FileText,
  Bell,
  Bot,
  Database,
} from "lucide-react";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 499000,
    period: "bulan",
    description: "Perfect untuk tim kecil yang baru memulai",
    features: {
      seats: 3,
      signals: "5,000/bulan",
      sources: 3,
      alerts: 50,
      reports: 10,
      ai_analysis: "1,000 sinyal",
      support: "Email",
      storage: "5GB",
    },
    included: [
      "Dashboard real-time",
      "Monitoring 3 platform",
      "AI sentiment analysis",
      "Email notifications",
      "Basic reports",
      "7-day data retention",
    ],
    excluded: [
      "Custom data sources",
      "Priority support",
      "Advanced analytics",
      "API access",
      "White-label",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 1_499_000,
    period: "bulan",
    description: "Untuk tim yang serius mengelola narrative",
    popular: true,
    features: {
      seats: 10,
      signals: "25,000/bulan",
      sources: 10,
      alerts: 200,
      reports: 50,
      ai_analysis: "5,000 sinyal",
      support: "Priority",
      storage: "50GB",
    },
    included: [
      "Everything in Starter",
      "10 platform monitoring",
      "Advanced AI analysis",
      "Priority support",
      "Custom reports",
      "30-day data retention",
      "Team collaboration",
      "Alert escalation",
    ],
    excluded: [
      "White-label",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    period: "custom",
    description: "Solusi lengkap untuk organisasi besar",
    features: {
      seats: "Unlimited",
      signals: "Unlimited",
      sources: "Unlimited",
      alerts: "Unlimited",
      reports: "Unlimited",
      ai_analysis: "Unlimited",
      support: "Dedicated",
      storage: "Unlimited",
    },
    included: [
      "Everything in Professional",
      "Unlimited platforms",
      "White-label option",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premise option",
      "Advanced security",
      "API access",
      "Training & onboarding",
    ],
    excluded: [],
  },
];

const comparisonFeatures = [
  {
    category: "Core Features",
    icon: BarChart3,
    items: [
      { name: "Dashboard real-time", starter: true, professional: true, enterprise: true },
      { name: "Signal monitoring", starter: "5,000/bulan", professional: "25,000/bulan", enterprise: "Unlimited" },
      { name: "Data sources", starter: 3, professional: 10, enterprise: "Unlimited" },
      { name: "Sentiment analysis", starter: true, professional: true, enterprise: true },
      { name: "Alert system", starter: "50/bulan", professional: "200/bulan", enterprise: "Unlimited" },
    ],
  },
  {
    category: "AI & Analytics",
    icon: Bot,
    items: [
      { name: "AI signal analysis", starter: "1,000/bulan", professional: "5,000/bulan", enterprise: "Unlimited" },
      { name: "Narrative clustering", starter: false, professional: true, enterprise: true },
      { name: "Predictive alerts", starter: false, professional: true, enterprise: true },
      { name: "Custom AI models", starter: false, professional: false, enterprise: true },
      { name: "Advanced analytics", starter: false, professional: true, enterprise: true },
    ],
  },
  {
    category: "Reports & Exports",
    icon: FileText,
    items: [
      { name: "Report templates", starter: 5, professional: 20, enterprise: "Unlimited" },
      { name: "Scheduled reports", starter: false, professional: true, enterprise: true },
      { name: "PDF/CSV export", starter: true, professional: true, enterprise: true },
      { name: "Custom branding", starter: false, professional: false, enterprise: true },
      { name: "API access", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Team & Collaboration",
    icon: Users,
    items: [
      { name: "Team seats", starter: "3 users", professional: "10 users", enterprise: "Unlimited" },
      { name: "Role-based access", starter: true, professional: true, enterprise: true },
      { name: "Workflow automation", starter: false, professional: true, enterprise: true },
      { name: "Audit logs", starter: false, professional: true, enterprise: true },
      { name: "SSO/SAML", starter: false, professional: false, enterprise: true },
    ],
  },
  {
    category: "Support & Security",
    icon: Shield,
    items: [
      { name: "Support level", starter: "Email", professional: "Priority", enterprise: "Dedicated" },
      { name: "Response time", starter: "48 jam", professional: "4 jam", enterprise: "1 jam" },
      { name: "Data retention", starter: "7 days", professional: "30 days", enterprise: "Custom" },
      { name: "Storage", starter: "5GB", professional: "50GB", enterprise: "Unlimited" },
      { name: "99.9% SLA", starter: false, professional: true, enterprise: true },
    ],
  },
];

function formatPrice(price: number | null): string {
  if (price === null) return "Custom";
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
            {t("badge")}
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
                -20%
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Pricing Cards */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = plan.price ? Math.round(plan.price * discount) : null;
            const isCustom = plan.id === "enterprise";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-indigo-500 bg-gradient-to-b from-indigo-50 to-white shadow-xl shadow-indigo-100"
                    : "border-slate-200 bg-white shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
                      <Zap size={14} />
                      {t("mostPopular")}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{plan.description}</p>

                  <div className="mt-6">
                    {isCustom ? (
                      <div className="text-3xl font-black text-slate-900">{t("contactSales")}</div>
                    ) : (
                      <>
                        <div className="text-4xl font-black text-slate-900">
                          {formatPrice(price)}
                          <span className="text-base font-normal text-slate-400">/{plan.period}</span>
                        </div>
                        {billingPeriod === "annual" && (
                          <p className="mt-1 text-sm text-green-600 font-medium">
                            Save {formatPrice(plan.price! - price!)}/bulan
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Link
                  href={isCustom ? "/contact" : `/signup?plan=${plan.id}`}
                  className={`mt-8 block w-full rounded-xl py-3.5 text-center text-base font-bold transition ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02]"
                      : "border-2 border-slate-200 text-slate-900 hover:border-indigo-500 hover:text-indigo-600"
                  }`}
                >
                  {isCustom ? t("getStarted") : plan.price ? t("startTrial") : t("contactSales")}
                </Link>

                <div className="mt-8 space-y-4">
                  {plan.included.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <Users size={16} className="text-slate-400" />
                    {typeof plan.features.seats === "number" ? `${plan.features.seats} users` : plan.features.seats}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <Globe size={16} className="text-slate-400" />
                    {plan.features.signals}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <Database size={16} className="text-slate-400" />
                    {plan.features.storage}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
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
                    {t("feature")}
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-slate-900">
                    Starter
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-indigo-600">
                    Professional
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-slate-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category, idx) => (
                  <>
                    <tr key={category.category} className="bg-slate-50">
                      <td colSpan={4} className="py-3 px-4">
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
                          {typeof item.starter === "boolean" ? (
                            item.starter ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-slate-900">{item.starter}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.professional === "boolean" ? (
                            item.professional ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-indigo-600">{item.professional}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {typeof item.enterprise === "boolean" ? (
                            item.enterprise ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <XIcon className="h-3.5 w-3.5" />
                              </span>
                            )
                          ) : (
                            <span className="text-sm font-bold text-slate-900">{item.enterprise}</span>
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
