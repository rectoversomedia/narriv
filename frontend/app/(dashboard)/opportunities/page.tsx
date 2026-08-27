"use client";

import { useState } from "react";
import { Search, TrendingUp, Target, Zap, AlertTriangle, CheckCircle, Clock, Eye, Users, Lightbulb, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpportunityType =
  | "narrative_whitespace"
  | "competitor_weakness"
  | "rising_demand"
  | "positive_brand"
  | "industry_trend"
  | "content_gap"
  | "geo_opportunity";

export type Priority = "Immediate" | "High" | "Medium" | "Low";
export type TrendDirection = "growing" | "stable" | "declining";
export type Confidence = "High" | "Medium" | "Low";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  whyItMatters: string;
  recommendedAction: string;
  priority: Priority;
  potentialImpact: string;
  confidence: Confidence;
  trend: TrendDirection;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const OPPORTUNITY_TYPE_CONFIG: Record<
  OpportunityType,
  { label: string; variant: "default" | "green" | "amber" | "purple" | "slate" | "red" }
> = {
  narrative_whitespace: { label: "Narrative Whitespace", variant: "purple" },
  competitor_weakness:  { label: "Competitor Weakness",  variant: "amber" },
  rising_demand:        { label: "Rising Demand",         variant: "green" },
  positive_brand:       { label: "Positive Brand",        variant: "green" },
  industry_trend:       { label: "Industry Trend",        variant: "default" },
  content_gap:          { label: "Content Gap",           variant: "slate" },
  geo_opportunity:      { label: "SEO / GEO",             variant: "default" },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string; border: string }> = {
  Immediate: { label: "Immediate", bg: "bg-red-50",   text: "text-red-600",   border: "border-red-200"   },
  High:      { label: "High",      bg: "bg-amber-50",  text: "text-amber-600", border: "border-amber-200" },
  Medium:    { label: "Medium",    bg: "bg-blue-50",   text: "text-blue-600",  border: "border-blue-200"  },
  Low:       { label: "Low",       bg: "bg-slate-50",  text: "text-slate-500", border: "border-slate-200" },
};

const CONFIDENCE_CONFIG: Record<Confidence, { variant: "green" | "amber" | "slate" }> = {
  High:   { variant: "green"  },
  Medium: { variant: "amber"  },
  Low:    { variant: "slate" },
};

const TREND_CONFIG: Record<TrendDirection, { label: string; icon: typeof TrendingUp; color: string }> = {
  growing:   { label: "Growing",   icon: TrendingUp, color: "text-[#10B981]" },
  stable:    { label: "Stable",    icon: BarChart3,  color: "text-slate-500" },
  declining: { label: "Declining", icon: AlertTriangle, color: "text-red-500" },
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-1",
    type: "competitor_weakness",
    title: "No brand owns the EV charging convenience narrative",
    description:
      "While EV adoption accelerates in Indonesia, no major automaker or charging provider has staked out a dominant 'convenient charging experience' narrative. Consumers seeking reassurance about charging accessibility find no authoritative voice.",
    whyItMatters:
      "First-mover ownership of this narrative could capture the most trust-sensitive segment of EV intenders — urban professionals who cite charging anxiety as their primary barrier.",
    recommendedAction:
      "Commission a quantitative survey on charging pain points, then publish a thought leadership piece positioning your charging network as the most accessible in Java.",
    priority: "High",
    potentialImpact: "1.2M reach",
    confidence: "High",
    trend: "growing",
    createdAt: "2026-08-20",
  },
  {
    id: "opp-2",
    type: "industry_trend",
    title: "Sustainable finance awareness rising sharply among Gen Z investors",
    description:
      "ESG-themed investment content is seeing a 3x engagement increase on Indonesian financial TikTok and YouTube since Q2 2026. However, no digital bank has built a dedicated 'green investment' content hub.",
    whyItMatters:
      "Gen Z wealth is shifting from savings to ESG-labelled instruments. Institutions that educate first will capture disproportionate wallet share as this cohort enters the investment market.",
    recommendedAction:
      "Partner with a credible sustainability NGO to co-author a 'Green Finance 101' video series targeted at first-time investors aged 18-25.",
    priority: "Medium",
    potentialImpact: "580K reach",
    confidence: "Medium",
    trend: "growing",
    createdAt: "2026-08-18",
  },
  {
    id: "opp-3",
    type: "narrative_whitespace",
    title: "No digital bank owns 'family finance' positioning in Indonesia",
    description:
      "Despite 82M millennials and Gen Z in Indonesia, no digital bank or fintech has clearly positioned around the family financial journey — from first paycheck to parenthood planning. The keyword cluster has near-zero authoritative coverage.",
    whyItMatters:
      "Family finance is a high-loyalty, high-LTV segment. Ownership of this narrative creates deep emotional resonance that drives long-term retention across life stages.",
    recommendedAction:
      "Develop a 'Family Milestones' content series mapping financial products to life events: first job, marriage, first child, home purchase.",
    priority: "High",
    potentialImpact: "2.4M reach",
    confidence: "High",
    trend: "growing",
    createdAt: "2026-08-15",
  },
  {
    id: "opp-4",
    type: "positive_brand",
    title: "BNI brand mentioned 3x more than competitors on Gemini AI responses",
    description:
      "Narriv's AI visibility engine detects that when generative AI platforms are asked about Indonesian state banks, BNI is mentioned 3x more frequently than BRI or Mandiri — yet with a neutral-to-mixed tone, not always positive.",
    whyItMatters:
      "High mention volume without positive framing is a wasted opportunity. Reinforcing the narrative with authoritative content can convert these passive mentions into active endorsements.",
    recommendedAction:
      "Submit an authoritative company profile and sustainability report to AI training data pipelines; brief AI-optimized PR agency on Gemini and ChatGPT citation gaps.",
    priority: "Medium",
    potentialImpact: "890K reach",
    confidence: "Medium",
    trend: "stable",
    createdAt: "2026-08-22",
  },
  {
    id: "opp-5",
    type: "rising_demand",
    title: "Customer service speed expectations increasing post-superapp era",
    description:
      "After years of conditioning by Gojek and Grab, Indonesian consumers now expect sub-30-second response times across all digital services. Financial services are falling behind — and users are vocalising this gap.",
    whyItMatters:
      "Service speed complaints are the #3 driver of brand switching in financial services, behind only fees and security concerns. Addressing this narrative proactively prevents competitor poaching.",
    recommendedAction:
      "Publish an accountability report showing your average response time benchmarks vs. industry average, and announce a speed improvement commitment with a public deadline.",
    priority: "Immediate",
    potentialImpact: "1.8M reach",
    confidence: "High",
    trend: "growing",
    createdAt: "2026-08-24",
  },
  {
    id: "opp-6",
    type: "geo_opportunity",
    title: "Sharia banking content gap on AI platforms remains wide",
    description:
      "When AI engines are asked about sharia-compliant financial products, responses are generic, outdated, and sometimes inaccurate. Islamic finance represents 32% of Indonesian banking assets — yet has the worst AI visibility of any segment.",
    whyItMatters:
      "Correcting AI misinformation on sharia banking proactively builds trust with the most religiously motivated consumer segment, which is also among the most brand-loyal once trust is established.",
    recommendedAction:
      "Create a structured FAQ document optimised for AI consumption covering the top 20 sharia banking questions, and engage with AI platform content programs directly.",
    priority: "High",
    potentialImpact: "420K reach",
    confidence: "High",
    trend: "growing",
    createdAt: "2026-08-19",
  },
];

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

type FilterType = "All" | "Narrative" | "Competitor" | "Market" | "SEO/GEO" | "Content";

const FILTER_TYPE_MAP: Record<FilterType, OpportunityType[]> = {
  All:       [],
  Narrative: ["narrative_whitespace", "industry_trend"],
  Competitor:["competitor_weakness", "positive_brand"],
  Market:    ["rising_demand"],
  "SEO/GEO": ["geo_opportunity"],
  Content:   ["content_gap"],
};

// ---------------------------------------------------------------------------
// OpportunityCard
// ---------------------------------------------------------------------------

function OpportunityCard({ opp, t }: { opp: Opportunity; t: (key: string) => string }) {
  const typeCfg = OPPORTUNITY_TYPE_CONFIG[opp.type];
  const priorityCfg = PRIORITY_CONFIG[opp.priority];
  const confidenceCfg = CONFIDENCE_CONFIG[opp.confidence];
  const trendCfg = TREND_CONFIG[opp.trend];
  const TrendIcon = trendCfg.icon;

  return (
    <div className="flex flex-col gap-0 rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      {/* Header row: type chip + priority badge */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>
        <span
          className={cn(
            "rounded-[6px] border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
            priorityCfg.bg,
            priorityCfg.text,
            priorityCfg.border
          )}
        >
          {priorityCfg.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-[15px] font-bold leading-snug text-[#101334]">{opp.title}</h3>

      {/* Description */}
      <p className="mb-4 text-[13px] leading-relaxed text-[#68739F]">{opp.description}</p>

      {/* Why It Matters */}
      <div className="mb-3">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {t("whyItMatters")}
        </p>
        <p className="text-[13px] leading-relaxed text-[#68739F]">{opp.whyItMatters}</p>
      </div>

      {/* Recommended Action — highlighted */}
      <div
        className={cn(
          "mb-4 rounded-[10px] border p-3",
          priorityCfg.bg,
          priorityCfg.border
        )}
      >
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {t("recommendedAction")}
        </p>
        <p className="text-[13px] font-medium text-[#101334]">{opp.recommendedAction}</p>
      </div>

      {/* Meta metrics row */}
      <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
        {/* Potential Impact */}
        <div className="flex items-center gap-1.5">
          <Eye size={12} className="shrink-0 text-slate-400" />
          <span className="text-[11px] text-slate-400">{t("potentialImpact")}:</span>
          <span className="text-[11px] font-bold text-[#101334]">{opp.potentialImpact}</span>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-1.5">
          <Target size={12} className="shrink-0 text-slate-400" />
          <span className="text-[11px] text-slate-400">{t("confidence")}:</span>
          <Badge variant={confidenceCfg.variant} className="text-[10px] px-1.5 py-0">
            {opp.confidence}
          </Badge>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-1.5">
          <TrendIcon size={12} className={cn("shrink-0", trendCfg.color)} />
          <span className="text-[11px] text-slate-400">{t("trend")}:</span>
          <span className={cn("text-[11px] font-bold", trendCfg.color)}>{trendCfg.label}</span>
        </div>

        {/* Created */}
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="shrink-0 text-slate-400" />
          <span className="text-[11px] text-slate-400">{t("created")}:</span>
          <span className="text-[11px] font-bold text-[#101334]">
            {new Date(opp.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  helper,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "purple" | "slate";
  helper?: string;
}) {
  const toneStyles: Record<string, { bg: string; text: string }> = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-600"   },
    green:  { bg: "bg-green-50",  text: "text-green-600"  },
    amber:  { bg: "bg-amber-50",  text: "text-amber-600"  },
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
    slate:  { bg: "bg-slate-50",  text: "text-slate-600"  },
  };
  const style = toneStyles[tone] ?? toneStyles.slate;

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-[7px]", style.bg, style.text)}>
            <Icon size={14} />
          </span>
          <span className="text-[11px] font-semibold text-slate-400">{label}</span>
        </div>
        <p className="text-[22px] font-black tracking-[-0.02em] text-[#101334]">{value}</p>
        {helper && <p className="text-[11px] font-medium text-slate-400">{helper}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// FilterChip
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all",
        active
          ? "border-[#465FFF] bg-[#465FFF] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OpportunitiesPage() {
  const t = useTranslations("opportunities");
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  const filters: FilterType[] = ["All", "Narrative", "Competitor", "Market", "SEO/GEO", "Content"];

  const filteredOpportunities =
    activeFilter === "All"
      ? DEMO_OPPORTUNITIES
      : DEMO_OPPORTUNITIES.filter((opp) =>
          (FILTER_TYPE_MAP[activeFilter] as OpportunityType[]).includes(opp.type)
        );

  const metrics = [
    { icon: Lightbulb, label: t("active"),      value: "8",  tone: "purple" as const, helper: undefined },
    { icon: Zap,       label: t("highPriority"), value: "3",  tone: "amber"  as const, helper: undefined },
    { icon: Eye,       label: t("estImpact"),    value: "2.4M", tone: "blue" as const, helper: "reach estimate" },
    { icon: Target,    label: t("winRate"),      value: "67%", tone: "green"  as const, helper: undefined },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-[14px] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#fff7ed_100%)] p-4 shadow-[0_14px_38px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
              <Search size={18} />
            </span>
            <h1 className="text-[22px] font-black tracking-[-0.03em] text-slate-900">
              {t("title")}
            </h1>
            <span className="rounded-[6px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#8B5CFF]">
              Demo
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-400">{t("filterType")}:</span>
          {filters.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={activeFilter === f}
              onClick={() => setActiveFilter(f)}
            />
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Opportunity grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOpportunities.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} t={(key) => t(key)} />
        ))}
        {filteredOpportunities.length === 0 && (
          <div className="col-span-full flex min-h-40 items-center justify-center rounded-[14px] border border-dashed border-slate-200 bg-slate-50/70 text-[13px] font-bold text-slate-400">
            No opportunities match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
