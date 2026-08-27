"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, AlertTriangle, ArrowUpRight, Clock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "Critical" | "High" | "Medium" | "Low";
type Status = "Open" | "Investigating" | "Acknowledged" | "Resolved";
type AlertType = "Risk" | "Opportunity" | "Positioning";

type AlertEntry = {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  type: AlertType;
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string;
  assignedTo: string;
  createdAt: string;
  signalCount: number;
  signalUnit: string;
};

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<Severity, { dot: string; badgeVariant: "red" | "amber" | "default" | "slate" }> = {
  Critical: { dot: "#EF4444", badgeVariant: "red" },
  High: { dot: "#F59E0B", badgeVariant: "amber" },
  Medium: { dot: "#465FFF", badgeVariant: "default" },
  Low: { dot: "#94A3B8", badgeVariant: "slate" },
};

const STATUS_STYLES: Record<Status, { badgeVariant: "red" | "amber" | "green" | "slate" | "default" }> = {
  Open: { badgeVariant: "red" },
  Investigating: { badgeVariant: "amber" },
  Acknowledged: { badgeVariant: "default" },
  Resolved: { badgeVariant: "green" },
};

const TYPE_STYLES: Record<AlertType, { bg: string; text: string }> = {
  Risk: { bg: "bg-red-50", text: "text-red-600" },
  Opportunity: { bg: "bg-green-50", text: "text-green-600" },
  Positioning: { bg: "bg-blue-50", text: "text-blue-600" },
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const ALERTS: AlertEntry[] = [
  {
    id: "1",
    title: "App login failures viral on Twitter",
    severity: "Critical",
    status: "Open",
    type: "Risk",
    whatHappened: "Widespread login failures triggered a viral complaint thread on Twitter, gaining 127 critical signals in under 3 hours.",
    whyItMatters: "Unresolved login issues directly impact user trust and can trigger app store rating drops.",
    whatToDo: "Immediately escalate to engineering on-call and prepare a public acknowledgment statement.",
    assignedTo: "Priya Sharma",
    createdAt: "3h ago",
    signalCount: 127,
    signalUnit: "signals",
  },
  {
    id: "2",
    title: "Battery safety misinformation spreading",
    severity: "Critical",
    status: "Open",
    type: "Risk",
    whatHappened: "Misinformation about product battery safety is circulating across social channels, amplified by unverified sources.",
    whyItMatters: "Safety misinformation can rapidly erode brand credibility and may require regulatory response.",
    whatToDo: "Prepare fact-check rebuttal content and coordinate with legal and PR teams for rapid response.",
    assignedTo: "James Liu",
    createdAt: "6h ago",
    signalCount: 89,
    signalUnit: "signals",
  },
  {
    id: "3",
    title: "Pricing sensitivity narrative growing fast",
    severity: "High",
    status: "Open",
    type: "Risk",
    whatHappened: "Mentions around pricing sensitivity have grown 34% in 24 hours, concentrated in financial forums and Reddit communities.",
    whyItMatters: "Price perception narratives can shift brand positioning if left unaddressed for too long.",
    whatToDo: "Monitor closely and prepare competitive pricing brief for leadership review.",
    assignedTo: "Maria Santos",
    createdAt: "12h ago",
    signalCount: 243,
    signalUnit: "signals",
  },
  {
    id: "4",
    title: "Competitor overtaking AI visibility for 3 key prompts",
    severity: "High",
    status: "Open",
    type: "Risk",
    whatHappened: "Bank Jago is now appearing in AI-generated answers for 3 previously brand-dominant key prompts in Gemini and Perplexity.",
    whyItMatters: "AI visibility losses directly affect how potential customers discover the brand in AI search.",
    whatToDo: "Initiate content optimization for affected prompts and run AI visibility test suite.",
    assignedTo: "David Chen",
    createdAt: "1d ago",
    signalCount: 3,
    signalUnit: "prompts",
  },
  {
    id: "5",
    title: "Influencer criticism of customer service",
    severity: "High",
    status: "Investigating",
    type: "Risk",
    whatHappened: "Three fintech influencers published critical posts about customer service wait times, generating 67 signals of negative amplification.",
    whyItMatters: "Influencer criticism reaches large, high-intent audiences and can shape brand perception rapidly.",
    whatToDo: "Prepare response strategy and consider direct outreach to influencers for feedback loop.",
    assignedTo: "Aiko Tanaka",
    createdAt: "2d ago",
    signalCount: 67,
    signalUnit: "signals",
  },
  {
    id: "6",
    title: "Sustainability narrative emerging — whitespace detected",
    severity: "Medium",
    status: "Open",
    type: "Opportunity",
    whatHappened: "Green finance and sustainability discussions are increasing among target demographics, with low competitor engagement.",
    whyItMatters: "Early positioning in the sustainability space could establish brand leadership before competitors react.",
    whatToDo: "Develop sustainability narrative content plan and evaluate partnership opportunities with green initiatives.",
    assignedTo: "Carlos Rivera",
    createdAt: "2d ago",
    signalCount: 38,
    signalUnit: "signals",
  },
  {
    id: "7",
    title: "Negative review cluster on Google",
    severity: "Medium",
    status: "Acknowledged",
    type: "Risk",
    whatHappened: "A cluster of 156 one-star reviews appeared over 72 hours citing similar issues around app performance.",
    whyItMatters: "Google review clusters signal systemic issues and influence purchase decisions in the app store funnel.",
    whatToDo: "Flag to product team for root cause analysis and prepare review response strategy.",
    assignedTo: "Priya Sharma",
    createdAt: "3d ago",
    signalCount: 156,
    signalUnit: "reviews",
  },
  {
    id: "8",
    title: "Community banking narrative — positioning opportunity",
    severity: "Medium",
    status: "Open",
    type: "Positioning",
    whatHappened: "Community banking topics are gaining traction in Indonesia with 22 signals and minimal competitor coverage.",
    whyItMatters: "Capturing the community banking narrative now could differentiate the brand in a growing market segment.",
    whatToDo: "Assess content calendar alignment and consider launching a community banking thought leadership series.",
    assignedTo: "Maria Santos",
    createdAt: "3d ago",
    signalCount: 22,
    signalUnit: "signals",
  },
  {
    id: "9",
    title: "Minor complaint spike from app update",
    severity: "Low",
    status: "Resolved",
    type: "Risk",
    whatHappened: "A recent app update caused a brief spike in complaints related to UI changes, with 89 signals captured.",
    whyItMatters: "Minor update friction is expected but unchecked complaints can compound into larger reputation issues.",
    whatToDo: "Resolved — user feedback incorporated into follow-up patch. No further action required.",
    assignedTo: "James Liu",
    createdAt: "5d ago",
    signalCount: 89,
    signalUnit: "signals",
  },
  {
    id: "10",
    title: "Positive brand mention by fintech influencer",
    severity: "Low",
    status: "Resolved",
    type: "Opportunity",
    whatHappened: "A well-known fintech influencer posted a positive review, generating 12 engagement signals and positive brand sentiment.",
    whyItMatters: "Positive influencer coverage strengthens brand credibility in the fintech community.",
    whatToDo: "Resolved — consider nurturing relationship with influencer for future collaboration opportunities.",
    assignedTo: "Aiko Tanaka",
    createdAt: "6d ago",
    signalCount: 12,
    signalUnit: "signals",
  },
  {
    id: "11",
    title: "Regulatory discussion increasing — fintech guidelines",
    severity: "High",
    status: "Open",
    type: "Risk",
    whatHappened: "Government bodies are increasingly discussing new fintech guidelines that may require product and compliance adjustments.",
    whyItMatters: "Proactive regulatory engagement prevents reactive compliance scrambles that can disrupt product roadmap.",
    whatToDo: "Brief legal and compliance teams and monitor for official announcements.",
    assignedTo: "David Chen",
    createdAt: "7d ago",
    signalCount: 31,
    signalUnit: "signals",
  },
  {
    id: "12",
    title: "AI platforms citing outdated product info",
    severity: "Medium",
    status: "Open",
    type: "Risk",
    whatHappened: "AI platforms are referencing outdated product descriptions and feature lists in their generated answers.",
    whyItMatters: "Outdated AI citations misinform potential customers and erode trust in the brand's digital presence.",
    whatToDo: "Submit updated product information to AI platform data feeds and monitor for correction.",
    assignedTo: "Carlos Rivera",
    createdAt: "8d ago",
    signalCount: 8,
    signalUnit: "prompts",
  },
];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

type SeverityFilter = Severity | "All";
type StatusFilter = Status | "All";

const SEVERITY_FILTERS: SeverityFilter[] = ["All", "Critical", "High", "Medium", "Low"];
const STATUS_FILTERS: (Status | "All")[] = ["All", "Open", "Investigating", "Acknowledged", "Resolved"];

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone: "red" | "amber" | "blue" | "purple";
}) {
  const toneClasses = {
    red: { icon: "text-red-500", bg: "bg-red-50" },
    amber: { icon: "text-amber-500", bg: "bg-amber-50" },
    blue: { icon: "text-blue-500", bg: "bg-blue-50" },
    purple: { icon: "text-purple-500", bg: "bg-purple-50" },
  };
  const tc = toneClasses[tone];

  return (
    <Card className="flex-1 min-w-[160px]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-[10px]", tc.bg)}>
          <Icon className={cn("h-5 w-5", tc.icon)} />
        </div>
        <div>
          <p className="text-[20px] font-bold text-[#101334]">{value}</p>
          <p className="text-[12px] text-[#68739F]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AlertCard
// ---------------------------------------------------------------------------

function AlertCard({ alert }: { alert: AlertEntry }) {
  const sev = SEVERITY_STYLES[alert.severity];
  const status = STATUS_STYLES[alert.status];
  const typeStyle = TYPE_STYLES[alert.type];

  const actionLabel =
    alert.status === "Open"
      ? alert.severity === "Critical" || alert.severity === "High"
        ? "Escalate"
        : "Investigate"
      : alert.status === "Investigating"
        ? "Escalate"
        : alert.status === "Acknowledged"
          ? "Resolve"
          : null;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Top row: title + badges */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug text-[#101334] pr-2 flex-1">
            {alert.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Badge variant={sev.badgeVariant} className="normal-case tracking-normal font-bold uppercase">
              {alert.severity}
            </Badge>
            <Badge variant={status.badgeVariant} className="normal-case tracking-normal font-bold uppercase">
              {alert.status}
            </Badge>
          </div>
        </div>

        {/* Type chip */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", typeStyle.bg, typeStyle.text)}>
            {alert.type}
          </span>
        </div>

        {/* What happened */}
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#68739F]">
            {("alertCenter.whatHappened")}
          </p>
          <p className="text-[13px] leading-relaxed text-[#101334]">{alert.whatHappened}</p>
        </div>

        {/* Why it matters */}
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#68739F]">
            {("alertCenter.whyItMatters")}
          </p>
          <p className="text-[13px] leading-relaxed text-[#68739F]">{alert.whyItMatters}</p>
        </div>

        {/* What to do */}
        <div className={cn("mb-3 rounded-[10px] border border-slate-200 bg-slate-50 p-3")}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#68739F]">
            {("alertCenter.whatToDo")}
          </p>
          <p className="text-[13px] leading-relaxed text-[#101334]">{alert.whatToDo}</p>
        </div>

        {/* Footer: meta + action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#68739F]">
            <span>
              <span className="font-medium text-[#101334]">{alert.assignedTo}</span>
            </span>
            <span>{alert.createdAt}</span>
            <span>
              <span className="font-semibold text-[#101334]">{alert.signalCount}</span>{" "}
              {alert.signalUnit}
            </span>
          </div>

          {actionLabel && (
            <button
              className={cn(
                "flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-[12px] font-bold transition-colors duration-150",
                alert.severity === "Critical"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : alert.severity === "High"
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-[#465FFF] text-white hover:bg-[#3a52e0]",
              )}
            >
              {actionLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AlertCenterPage() {
  const t = useTranslations();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [demoMode] = useState(true);

  const filtered = ALERTS.filter((a) => {
    const sevOk = severityFilter === "All" || a.severity === severityFilter;
    const statOk = statusFilter === "All" || a.status === statusFilter;
    return sevOk && statOk;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold text-[#101334]">
            {t("alertCenter.title")}
          </h1>
          {demoMode && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              DEMO
            </span>
          )}
        </div>

        {/* Severity filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#68739F]">
            {t("alertCenter.filterSeverity")}:
          </span>
          <div className="flex flex-wrap rounded-[10px] border border-slate-200 bg-white p-1 shadow-xs">
            {SEVERITY_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={cn(
                  "rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-all duration-150",
                  severityFilter === s
                    ? "bg-[#465FFF] text-white shadow-sm"
                    : "text-[#68739F] hover:bg-slate-50 hover:text-[#101334]",
                )}
              >
                {s === "All" ? t("alertCenter.all") : t(`alertCenter.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap rounded-[10px] border border-slate-200 bg-white p-1 shadow-xs">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-all duration-150",
                  statusFilter === s
                    ? "bg-[#465FFF] text-white shadow-sm"
                    : "text-[#68739F] hover:bg-slate-50 hover:text-[#101334]",
                )}
              >
                {s === "All" ? t("alertCenter.all") : t(`alertCenter.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          value="23"
          label={t("alertCenter.active")}
          tone="red"
        />
        <MetricCard
          icon={AlertTriangle}
          value="4"
          label={t("alertCenter.criticalThisWeek")}
          tone="amber"
        />
        <MetricCard
          icon={Clock}
          value="2h 14m"
          label={t("alertCenter.avgResponse")}
          tone="blue"
        />
        <MetricCard
          icon={ShieldAlert}
          value="6"
          label={t("alertCenter.escalated")}
          tone="purple"
        />
      </div>

      {/* Alert list */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 py-16">
          <p className="text-[14px] text-[#68739F]">No alerts match the current filters.</p>
        </div>
      )}
    </div>
  );
}
