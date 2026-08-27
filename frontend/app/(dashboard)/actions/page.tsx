"use client";

import { useState } from "react";
import { CheckCircle, Clock, PlayCircle, Trash2, Zap, AlertTriangle, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionStatus = "open" | "in_progress" | "completed" | "dismissed";
export type ActionPriority = "Immediate" | "High" | "Medium" | "Low";

export interface ActionItem {
  id: string;
  text: string;
  source: string;
  sourceLabel: string;
  priority: ActionPriority;
  status: ActionStatus;
  owner: string;
  dueDate: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<ActionStatus, { label: string; variant: "default" | "green" | "amber" | "slate" | "red" }> = {
  open:        { label: "Open",        variant: "default" },
  in_progress: { label: "In Progress", variant: "amber"   },
  completed:   { label: "Completed",    variant: "green"   },
  dismissed:   { label: "Dismissed",   variant: "slate"   },
};

const PRIORITY_CONFIG: Record<ActionPriority, { bg: string; text: string; border: string }> = {
  Immediate: { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200"    },
  High:      { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-200"  },
  Medium:    { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200"   },
  Low:       { bg: "bg-slate-50",  text: "text-slate-500",  border: "border-slate-200"  },
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const now = new Date();
const daysFromNow = (d: number) =>
  new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const DEMO_ACTIONS: ActionItem[] = [
  {
    id: "action-1",
    text: "Investigate app stability complaints — 3 critical signals",
    source: "BNI App Stability Narrative",
    sourceLabel: "Risk Signal",
    priority: "Immediate",
    status: "open",
    owner: "Infrastructure Team",
    dueDate: daysFromNow(0),
    createdAt: "2026-08-24",
  },
  {
    id: "action-2",
    text: "Publish content countering EV affordability misconceptions",
    source: "EV Affordability Debate",
    sourceLabel: "Risk Signal",
    priority: "High",
    status: "in_progress",
    owner: "Content Team",
    dueDate: daysFromNow(3),
    createdAt: "2026-08-20",
  },
  {
    id: "action-3",
    text: "Boost authoritative coverage around digital security",
    source: "Account Security Signals",
    sourceLabel: "Risk Signal",
    priority: "Medium",
    status: "open",
    owner: "PR & Comms",
    dueDate: daysFromNow(6),
    createdAt: "2026-08-22",
  },
  {
    id: "action-4",
    text: "Prepare statement on sustainability commitments",
    source: "Sustainability Claims Skepticism",
    sourceLabel: "Risk Signal",
    priority: "High",
    status: "open",
    owner: "Communications",
    dueDate: daysFromNow(1),
    createdAt: "2026-08-23",
  },
  {
    id: "action-5",
    text: "Benchmark competitor AI visibility strategy",
    source: "AI Visibility Report",
    sourceLabel: "Opportunity Signal",
    priority: "Medium",
    status: "completed",
    owner: "Strategy Team",
    dueDate: daysFromNow(-2),
    createdAt: "2026-08-15",
  },
];

// ---------------------------------------------------------------------------
// FilterChip
// ---------------------------------------------------------------------------

type FilterStatus = "All" | "Open" | "In Progress" | "Completed" | "Dismissed";
type FilterPriority = "All" | "High" | "Medium" | "Low";

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
// ActionItemRow
// ---------------------------------------------------------------------------

function ActionItemRow({
  item,
  t,
}: {
  item: ActionItem;
  t: (key: string) => string;
}) {
  const [status, setStatus] = useState(item.status);

  const priorityCfg = PRIORITY_CONFIG[item.priority];
  const statusCfg = STATUS_CONFIG[status];

  const dueDate = new Date(item.dueDate);
  const isOverdue = dueDate < now && status !== "completed" && status !== "dismissed";
  const dueLabel = dueDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  const handleStart = () => setStatus("in_progress");
  const handleDone = () => setStatus("completed");
  const handleDismiss = () => setStatus("dismissed");

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:flex-row sm:items-start sm:gap-4">
      {/* Left: main content */}
      <div className="flex-1 min-w-0">
        {/* Priority + status row */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-[6px] border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
              priorityCfg.bg,
              priorityCfg.text,
              priorityCfg.border
            )}
          >
            {priorityCfg.text === "text-red-600"
              ? t("immediate")
              : priorityCfg.text === "text-amber-600"
                ? t("high")
                : priorityCfg.text === "text-blue-600"
                  ? t("medium")
                  : t("low")}
          </span>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          {isOverdue && (
            <span className="rounded-[6px] border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
              {t("overdue")}
            </span>
          )}
        </div>

        {/* Action text */}
        <p className="mb-2 text-[14px] font-bold leading-snug text-[#101334]">{item.text}</p>

        {/* Source */}
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-400">
          <span>
            <span className="font-semibold">{t("source")}: </span>
            <span className="font-medium text-[#465FFF]">{item.source}</span>
            {" — "}
            <span className="italic">{item.sourceLabel}</span>
          </span>
          <span>
            <span className="font-semibold">{t("owner")}: </span>
            <span className="font-medium text-slate-600">{item.owner}</span>
          </span>
          <span className={cn(isOverdue ? "font-bold text-red-500" : "")}>
            <span className="font-semibold">{t("dueDate")}: </span>
            <span className="font-medium">{dueLabel}</span>
          </span>
          <span>
            <span className="font-semibold">{t("created")}: </span>
            <span className="font-medium">
              {new Date(item.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </span>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex shrink-0 items-center gap-2">
        {status === "open" && (
          <button
            type="button"
            onClick={handleStart}
            className="flex items-center gap-1.5 rounded-[8px] border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
          >
            <PlayCircle size={13} />
            {t("start")}
          </button>
        )}
        {(status === "open" || status === "in_progress") && (
          <button
            type="button"
            onClick={handleDone}
            className="flex items-center gap-1.5 rounded-[8px] border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] font-bold text-green-600 transition hover:border-green-300 hover:bg-green-100"
          >
            <CheckCircle size={13} />
            {t("markDone")}
          </button>
        )}
        {status === "open" && (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-100"
          >
            <Trash2 size={13} />
            {t("dismiss")}
          </button>
        )}
        {status === "completed" && (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-green-600">
            <CheckCircle size={14} />
            {t("completed")}
          </span>
        )}
        {status === "dismissed" && (
          <span className="text-[12px] font-bold text-slate-400">{t("dismissed")}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ActionsPage() {
  const t = useTranslations("actions");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("All");

  const statusFilters: FilterStatus[] = ["All", "Open", "In Progress", "Completed", "Dismissed"];
  const priorityFilters: FilterPriority[] = ["All", "High", "Medium", "Low"];

  const statusMap: Record<FilterStatus, ActionStatus | null> = {
    All:        null,
    Open:        "open",
    "In Progress": "in_progress",
    Completed:   "completed",
    Dismissed:   "dismissed",
  };

  const priorityMap: Record<FilterPriority, ActionPriority | null> = {
    All:    null,
    High:   "High",
    Medium: "Medium",
    Low:    "Low",
  };

  const filteredActions = DEMO_ACTIONS.filter((item) => {
    const statusMatch = statusMap[statusFilter] === null || item.status === statusMap[statusFilter];
    const priorityMatch = priorityMap[priorityFilter] === null || item.priority === priorityMap[priorityFilter];
    return statusMatch && priorityMatch;
  });

  const openCount = DEMO_ACTIONS.filter((a) => a.status === "open").length;
  const inProgressCount = DEMO_ACTIONS.filter((a) => a.status === "in_progress").length;
  const completedCount = DEMO_ACTIONS.filter((a) => a.status === "completed").length;

  const metrics = [
    { icon: Zap,          label: t("open"),              value: String(openCount),      tone: "blue"   as const },
    { icon: PlayCircle,   label: t("inProgress"),        value: String(inProgressCount), tone: "amber"  as const },
    { icon: CheckCircle,  label: t("completedThisWeek"),  value: String(completedCount), tone: "green"  as const },
    { icon: Clock,        label: t("avgResolution"),      value: "3.2 days",             tone: "purple" as const },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-[14px] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#fff7ed_100%)] p-4 shadow-[0_14px_38px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
              <BarChart3 size={18} />
            </span>
            <h1 className="text-[22px] font-black tracking-[-0.03em] text-slate-900">
              {t("title")}
            </h1>
            <span className="rounded-[6px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#8B5CFF]">
              Demo
            </span>
          </div>
        </div>

        {/* Filter bars */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-400">{t("filterStatus")}:</span>
            {statusFilters.map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-400">{t("filterPriority")}:</span>
            {priorityFilters.map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={priorityFilter === f}
                onClick={() => setPriorityFilter(f)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Action list */}
      <div className="space-y-3">
        {filteredActions.map((item) => (
          <ActionItemRow key={item.id} item={item} t={(key) => t(key)} />
        ))}
        {filteredActions.length === 0 && (
          <div className="flex min-h-40 items-center justify-center rounded-[14px] border border-dashed border-slate-200 bg-slate-50/70 text-[13px] font-bold text-slate-400">
            No actions match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
