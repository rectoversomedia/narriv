"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import {
  FileText,
  Mail,
  MessageSquare,
  Download,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Lightbulb,
  Eye,
  BarChart2,
  CheckSquare,
  ArrowUp,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import { NarrativeMap } from "@/components/intelligence/narrative-map";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = "yesterday" | "today" | "last7days" | "last30days";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_DATE_FORMATTED = "Thursday, 27 August 2026";

const EXECUTIVE_SUMMARY = {
  criticalAlerts: 2,
  netSentimentShift: +8,
  aiVisibility: 72,
  competitorNote:
    "Competitor Bank Jago gained 3 points in the 'best digital bank' prompt category.",
};

const KEY_DEVELOPMENTS = [
  {
    severity: "CRITICAL",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    title: "App login failures viral on Twitter/X",
    signals: 127,
    growth: "+38%",
    time: "2h ago",
  },
  {
    severity: "HIGH",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    title: "AI visibility declined 6 points — Bank Jago overtaking in Gemini",
    signals: 89,
    growth: "-6 pts",
    time: "4h ago",
  },
  {
    severity: "MEDIUM",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    title: "EV affordability narrative growing 180% in 48h — brand positioning gap",
    signals: 312,
    growth: "+180%",
    time: "48h ago",
  },
  {
    severity: "LOW",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    title: "Positive sustainability mention cluster",
    signals: 42,
    growth: "+22%",
    time: "12h ago",
  },
];

const NARRATIVE_CHANGES = [
  { direction: "growing" as const, label: "Digital Banking UX complaints", delta: "+38%" },
  { direction: "growing" as const, label: "EV Affordability", delta: "+180%" },
  { direction: "declining" as const, label: "Account security mentions", delta: "-12%" },
  { direction: "stable" as const, label: "GoPay Integration ecosystem", delta: "+4%" },
];

const RISKS = [
  "Service disruption narrative escalating — 3 critical signals, 2h ago",
  "AI platforms citing outdated battery safety information",
  "Regulatory fintech discussion increasing (+23% this week)",
];

const OPPORTUNITIES = [
  "No brand owns 'EV family car' positioning — create content campaign",
  "Sustainability narrative growing but no brand leads it — whitespace opportunity",
  "AI visibility gap in 'best fintech for SMEs' prompt — priority improvement area",
];

const COMPETITORS = [
  {
    name: "Bank Jago",
    sentiment: "+18 narrative momentum",
    ai: "+3 AI visibility points",
    note: "community banking campaign",
    tone: "negative" as const,
  },
  {
    name: "GoPay",
    sentiment: "Stable share of voice",
    ai: "+12% AI visibility",
    note: "QR payment feature launch",
    tone: "positive" as const,
  },
  {
    name: "OVO",
    sentiment: "Declining narrative momentum",
    ai: "Less AI coverage this week",
    note: "",
    tone: "neutral" as const,
  },
];

const AI_VISIBILITY = [
  { engine: "ChatGPT", from: 68, to: 64, delta: -4 },
  { engine: "Gemini", from: 78, to: 72, delta: -6 },
  { engine: "Perplexity", from: 71, to: 73, delta: +2 },
  { engine: "Claude", from: 65, to: 65, delta: 0 },
];

const RECOMMENDED_ACTIONS = [
  {
    priority: "IMMEDIATE",
    priorityColor: "bg-red-500",
    text: "Investigate and respond to app login failure complaints",
  },
  {
    priority: "HIGH",
    priorityColor: "bg-amber-500",
    text: "Publish content addressing battery safety misconceptions",
  },
  {
    priority: "HIGH",
    priorityColor: "bg-amber-500",
    text: "Increase authoritative coverage around digital security",
  },
  {
    priority: "MEDIUM",
    priorityColor: "bg-blue-500",
    text: "Create educational content on EV charging accessibility",
  },
  {
    priority: "MEDIUM",
    priorityColor: "bg-blue-500",
    text: "Benchmark and improve AI visibility for key category prompts",
  },
];

const NARRATIVES_MAP_DATA = [
  { id: "n1", title: "Digital Banking UX", volume: 847, sentiment: "negative" as const, momentum: "growing" as const, growth: 38 },
  { id: "n2", title: "EV Affordability", volume: 562, sentiment: "mixed" as const, momentum: "escalating" as const, growth: 180 },
  { id: "n3", title: "App Stability", volume: 412, sentiment: "negative" as const, momentum: "growing" as const, growth: 38 },
  { id: "n4", title: "Sustainability", volume: 142, sentiment: "positive" as const, momentum: "stable" as const, growth: 22 },
  { id: "n5", title: "Customer Service", volume: 380, sentiment: "negative" as const, momentum: "declining" as const, growth: -8 },
  { id: "n6", title: "Brand Innovation", volume: 198, sentiment: "positive" as const, momentum: "stable" as const, growth: 5 },
  { id: "n7", title: "Pricing", volume: 290, sentiment: "mixed" as const, momentum: "stable" as const, growth: 12 },
  { id: "n8", title: "Competitor Movement", volume: 165, sentiment: "neutral" as const, momentum: "declining" as const, growth: -3 },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DateRangeSelector({
  value,
  onChange,
  t,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const options: { value: DateRange; label: string }[] = [
    { value: "yesterday", label: "Yesterday" },
    { value: "today", label: "Today" },
    { value: "last7days", label: "Last 7 Days" },
    { value: "last30days", label: "Last 30 Days" },
  ];

  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateRange)}
        className={cn(
          "h-9 appearance-none rounded-[8px] border border-slate-200 bg-white pl-3 pr-8",
          "text-[13px] font-medium text-[#101334] cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        strokeWidth={2}
      />
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-[13px] font-bold uppercase tracking-widest text-[#465FFF]">
        {label}
      </span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: "bg-red-50", text: "text-red-600" },
    HIGH: { bg: "bg-amber-50", text: "text-amber-600" },
    MEDIUM: { bg: "bg-blue-50", text: "text-blue-600" },
    LOW: { bg: "bg-slate-50", text: "text-slate-500" },
  };
  const cfg = config[severity] ?? config.LOW;
  return (
    <span
      className={cn(
        "rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        cfg.bg,
        cfg.text
      )}
    >
      {severity}
    </span>
  );
}

function DirectionIcon({ direction }: { direction: "growing" | "declining" | "stable" }) {
  if (direction === "growing")
    return <ArrowUp className="h-4 w-4 flex-shrink-0 text-green-600" strokeWidth={2.5} />;
  if (direction === "declining")
    return <ArrowDown className="h-4 w-4 flex-shrink-0 text-red-500" strokeWidth={2.5} />;
  return <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" strokeWidth={2.5} />;
}

function DeltaChip({ delta }: { delta: string }) {
  const isPositive = delta.startsWith("+");
  const isNeutral = !delta.startsWith("+") && !delta.startsWith("-");
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold",
        isNeutral && "bg-slate-100 text-slate-500",
        isPositive && "bg-green-50 text-green-600",
        !isPositive && !isNeutral && "bg-red-50 text-red-500"
      )}
    >
      {delta}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DailyIntelligenceBriefPage() {
  const t = useTranslations("brief");
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>("today");

  const handleExport = (type: "pdf" | "email" | "whatsapp") => {
    const labels: Record<string, string> = {
      pdf: t("exportPDF"),
      email: t("exportEmail"),
      whatsapp: t("shareWhatsApp"),
    };
    showToast({
      title: labels[type],
      description: t("exportComingSoon"),
      tone: "info",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-screen-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#465FFF]">
                Intelligence
              </p>
              <h1 className="text-[22px] font-bold text-[#101334]">{t("title")}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DateRangeSelector value={dateRange} onChange={setDateRange} t={t as (key: string, opts?: Record<string, unknown>) => string} />
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport("pdf")}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3",
                    "text-[13px] font-medium text-[#101334] transition-colors",
                    "hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <Download className="h-4 w-4 text-slate-500" strokeWidth={2} />
                  {t("exportPDF")}
                </button>
                <button
                  onClick={() => handleExport("email")}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3",
                    "text-[13px] font-medium text-[#101334] transition-colors",
                    "hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <Mail className="h-4 w-4 text-slate-500" strokeWidth={2} />
                  {t("exportEmail")}
                </button>
                <button
                  onClick={() => handleExport("whatsapp")}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3",
                    "text-[13px] font-medium text-[#101334] transition-colors",
                    "hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-slate-500" strokeWidth={2} />
                  {t("shareWhatsApp")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document body */}
      <div className="mx-auto max-w-screen-xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Left column — narrative map + main document */}
          <div className="lg:col-span-2 space-y-8">

            {/* Document card */}
            <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
              {/* Document header banner */}
              <div className="bg-[#101334] px-8 py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#465FFF]" strokeWidth={2} />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#465FFF]">
                        Narriv
                      </span>
                    </div>
                    <h2 className="text-[18px] font-bold text-white">{t("title")}</h2>
                    <p className="mt-1 text-[13px] text-slate-400">
                      {DEMO_DATE_FORMATTED} &mdash; Demo
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-[6px] bg-[#465FFF]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#465FFF]">
                      Confidential
                    </span>
                  </div>
                </div>
              </div>

              {/* Document sections */}
              <div className="px-8 py-6 space-y-8">

                {/* Executive Summary */}
                <section>
                  <SectionDivider label={t("executiveSummary")} />
                  <div className="space-y-3">
                    {/* KPI row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-[11px] font-semibold text-slate-500">Critical Alerts</p>
                        <p className="mt-1 text-[24px] font-bold text-red-500">
                          {EXECUTIVE_SUMMARY.criticalAlerts}
                        </p>
                        <p className="text-[11px] text-slate-400">active</p>
                      </div>
                      <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-[11px] font-semibold text-slate-500">Net Sentiment</p>
                        <p className="mt-1 text-[24px] font-bold text-green-600">
                          +{EXECUTIVE_SUMMARY.netSentimentShift}%
                        </p>
                        <p className="text-[11px] text-slate-400">shift positive</p>
                      </div>
                      <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-[11px] font-semibold text-slate-500">AI Visibility</p>
                        <p className="mt-1 text-[24px] font-bold text-[#465FFF]">
                          {EXECUTIVE_SUMMARY.aiVisibility}
                        </p>
                        <p className="text-[11px] text-slate-400">score</p>
                      </div>
                    </div>
                    <p className="text-[14px] leading-relaxed text-[#68739F]">
                      {EXECUTIVE_SUMMARY.criticalAlerts} critical alerts active. Net sentiment shifted{" "}
                      <span className="font-semibold text-green-600">
                        +{EXECUTIVE_SUMMARY.netSentimentShift}% positive
                      </span>{" "}
                      driven by brand campaign lift. AI visibility stable at{" "}
                      <span className="font-semibold text-[#101334]">
                        {EXECUTIVE_SUMMARY.aiVisibility}
                      </span>
                      .{" "}
                      <span className="text-[#101334]">{EXECUTIVE_SUMMARY.competitorNote}</span>
                    </p>
                  </div>
                </section>

                {/* Key Developments */}
                <section>
                  <SectionDivider label={t("keyDevelopments")} />
                  <div className="space-y-3">
                    {KEY_DEVELOPMENTS.map((dev, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-3 rounded-[10px] border p-4",
                          dev.bg,
                          dev.border
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 h-2 w-2 flex-shrink-0 rounded-full",
                            dev.dot
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={dev.severity} />
                            <span className="text-[13px] font-semibold text-[#101334]">
                              {dev.title}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[12px] text-slate-500">
                            <span>{dev.signals} signals</span>
                            <span className="font-medium text-slate-700">{dev.growth}</span>
                            <span>{dev.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Narrative Changes */}
                <section>
                  <SectionDivider label={t("narrativeChanges")} />
                  <div className="space-y-2">
                    {NARRATIVE_CHANGES.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 hover:bg-slate-50">
                        <DirectionIcon direction={item.direction} />
                        <span className="flex-1 text-[14px] text-[#101334]">{item.label}</span>
                        <DeltaChip delta={item.delta} />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Risks */}
                <section>
                  <SectionDivider label={t("risks")} />
                  <ul className="space-y-2.5">
                    {RISKS.map((risk, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" strokeWidth={2} />
                        <span className="text-[14px] leading-relaxed text-[#68739F]">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Opportunities */}
                <section>
                  <SectionDivider label={t("opportunities")} />
                  <ul className="space-y-2.5">
                    {OPPORTUNITIES.map((opp, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" strokeWidth={2} />
                        <span className="text-[14px] leading-relaxed text-[#68739F]">{opp}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Competitor Watch */}
                <section>
                  <SectionDivider label={t("competitorWatch")} />
                  <div className="space-y-3">
                    {COMPETITORS.map((comp, i) => (
                      <div
                        key={i}
                        className="rounded-[10px] border border-slate-200 bg-white p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[14px] font-bold text-[#101334]">{comp.name}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              comp.tone === "positive" && "bg-green-50 text-green-600",
                              comp.tone === "negative" && "bg-red-50 text-red-500",
                              comp.tone === "neutral" && "bg-slate-100 text-slate-500"
                            )}
                          >
                            {comp.sentiment}
                          </span>
                        </div>
                        <div className="space-y-1 text-[13px] text-[#68739F]">
                          <p>
                            <span className="font-medium text-[#101334]">AI:</span> {comp.ai}
                          </p>
                          {comp.note && <p className="text-slate-400">{comp.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* AI Visibility Changes */}
                <section>
                  <SectionDivider label={t("aiVisibilityChanges")} />
                  <div className="rounded-[10px] border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Platform
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Previous
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Current
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Change
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {AI_VISIBILITY.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-[14px] font-medium text-[#101334]">
                              {row.engine}
                            </td>
                            <td className="px-4 py-3 text-center text-[14px] text-slate-500">
                              {row.from}%
                            </td>
                            <td className="px-4 py-3 text-center text-[14px] font-semibold text-[#101334]">
                              {row.to}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold",
                                  row.delta > 0 && "bg-green-50 text-green-600",
                                  row.delta < 0 && "bg-red-50 text-red-500",
                                  row.delta === 0 && "bg-slate-100 text-slate-400"
                                )}
                              >
                                {row.delta > 0 ? (
                                  <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                                ) : row.delta < 0 ? (
                                  <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
                                ) : (
                                  <Minus className="h-3 w-3" strokeWidth={2.5} />
                                )}
                                {row.delta > 0 ? `+${row.delta}` : row.delta === 0 ? "—" : row.delta}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Recommended Actions */}
                <section>
                  <SectionDivider label={t("recommendedActions")} />
                  <ol className="space-y-3">
                    {RECOMMENDED_ACTIONS.map((action, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                            action.priorityColor
                          )}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
                                action.priorityColor
                              )}
                            >
                              {action.priority}
                            </span>
                          </div>
                          <p className="text-[14px] leading-relaxed text-[#68739F]">
                            {action.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

              </div>
            </div>
          </div>

          {/* Right column — narrative map */}
          <div className="space-y-6">
            {/* Narrative map card */}
            <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[14px] font-bold text-[#101334]">Narrative Landscape</h3>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Brand narratives sized by signal volume, colored by sentiment
                </p>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {[
                    { color: "#22c55e", label: "Positive" },
                    { color: "#ef4444", label: "Negative" },
                    { color: "#f59e0b", label: "Mixed" },
                    { color: "#94a3b8", label: "Neutral" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] text-slate-500">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-4 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-500">Legend:</span>
                  <ArrowUp className="h-3 w-3 text-green-500" strokeWidth={2.5} />
                  <span>Growing</span>
                  <span className="text-slate-300">·</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" className="text-green-500">
                    <path
                      d="M6 2 L10 7 L8.5 7 L8.5 10 L3.5 10 L3.5 7 L2 7 Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Escalating</span>
                </div>
                <NarrativeMap
                  brandName="Narriv"
                  narratives={NARRATIVES_MAP_DATA}
                />
              </div>
            </div>

            {/* Quick stats card */}
            <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[14px] font-bold text-[#101334]">Signal Snapshot</h3>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: "Total Signals", value: "12,847", delta: "+8%", positive: true },
                  { label: "Analyzed", value: "11,234", delta: "+12%", positive: true },
                  { label: "Negative", value: "18%", delta: "-4%", positive: true },
                  { label: "AI Visibility", value: "72", delta: "-6", positive: false },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-[13px] text-slate-500">{stat.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#101334]">{stat.value}</span>
                      <span
                        className={cn(
                          "text-[11px] font-bold",
                          stat.positive ? "text-green-600" : "text-red-500"
                        )}
                      >
                        {stat.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
