"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flag,
  Funnel,
  Lightbulb,
  ListChecks,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { isDemoMode, getMockActionPlans } from "@/lib/demo-mock-data";
import { getActionPlanById, getActionQueue, getFeedbackAccuracy, submitActionPlanFeedback, getActionPlansMetrics, getActionPlanLearning, type ActionPlanResponse, type ActionQueueRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";
import { CreateActionPlanModal } from "./components/create-action-plan-modal";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Priority = "high" | "medium" | "low" | "done";
type ActionStatus = "active" | "in-progress" | "done";

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
};

type ActionItem = {
  id: string;
  title: string;
  issue: string;
  impact: string;
  response: string;
  owner: string;
  role: string;
  due: string;
  progress: number;
  priority: Exclude<Priority, "done">;
  status: ActionStatus;
  tone: Tone;
};

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10 text-[#465FFF]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10 text-[#8B5CFF]" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10 text-[#10B981]" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10 text-[#EF4444]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100 text-slate-500" },
};

function normalizePriority(record: ActionQueueRecord): Exclude<Priority, "done"> {
  const severity = (record.escalationLevel || record.alert?.severity || "medium").toLowerCase();
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "low") return "low";
  return "medium";
}

function normalizeStatus(status?: string | null): ActionStatus {
  if (status === "done") return "done";
  if (status === "in_progress" || status === "in-progress" || status === "blocked") return "in-progress";
  return "active";
}

function formatActionDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatWorkflowStatus(status: ActionStatus, t: (key: string) => string) {
  if (status === "done") return t("statusDone");
  if (status === "in-progress") return t("statusInProgress");
  return t("statusActive");
}

function buildActionItems(records: ActionQueueRecord[], t: (key: string) => string): ActionItem[] {
  return records.map((record) => {
    const priority = normalizePriority(record);
    const status = normalizeStatus(record.workflowStatus);
    const tone: Tone = status === "done" ? "green" : priority === "high" ? "red" : priority === "medium" ? "amber" : "green";
    const progress = status === "done" ? 100 : status === "in-progress" ? 55 : 20;

    return {
      id: record.id,
      title: record.title,
      issue: record.alert?.title || record.cluster?.title || t("livePlanLabel"),
      impact: record.escalationLevel || record.alert?.severity || record.cluster?.sentiment || t("liveReviewLabel"),
      response: t("livePlanLabel"),
      owner: record.assignedTo || t("unassignedOwner"),
      role: record.assignedTeam || t("liveRoleLabel"),
      due: formatActionDate(record.deadline || record.createdAt),
      progress,
      priority,
      status,
      tone,
    };
  });
}

function hasActionPlanData(plan: ActionPlanResponse | null | undefined) {
  return Boolean(plan && (plan.inputNarrative || plan.evidenceSummary || plan.plan?.length || plan.outputs?.length));
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("rounded-[14px] border-[#E6EAF2] bg-white text-[#101334] shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      {children}
    </Card>
  );
}

function MetricCard({ label, value, helper, trend, icon: Icon, tone, negative = false }: { label: string; value: string; helper?: string; trend?: number; icon: LucideIcon; tone: Tone; negative?: boolean }) {
  const style = toneStyles[tone];
  const isTrendNegative = trend != null && trend < 0;
  const isNegativeDisplay = negative || isTrendNegative;
  return (
    <Panel>
      <CardContent className="flex min-h-[94px] items-center gap-4 p-4">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-full border" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)`, borderColor: `rgba(${style.rgb}, .12)` }}>
          <Icon size={22} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-extrabold text-[#68739F]">{label}</span>
          <span className="mt-1 block text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</span>
          {trend != null ? (
            <span className={cn("mt-2 flex items-center gap-1 text-[11px] font-black", isNegativeDisplay ? "text-[#EF4444]" : "text-[#10B981]")}>
              {trend >= 0 ? "▲" : "▼"} {helper}
            </span>
          ) : helper ? (
            <span className={cn("mt-2 flex items-center gap-1 text-[11px] font-black", negative ? "text-[#EF4444]" : "text-[#10B981]")}>
              {negative ? "▼" : "▲"} {helper}
            </span>
          ) : null}
        </span>
      </CardContent>
    </Panel>
  );
}

function StatusPill({ status, t }: { status: ActionStatus; t: (key: string) => string }) {
  const style = status === "done" ? "bg-[#10B981]/12 text-[#0C9B69]" : status === "in-progress" ? "bg-[#F59E0B]/12 text-[#F59E0B]" : "bg-[#EF4444]/10 text-[#EF4444]";
  const label = status === "done" ? t("statusDone") : status === "in-progress" ? t("statusInProgress") : t("statusActive");
  return <span className={cn("rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em]", style)}>{label}</span>;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NA";
  return (
    <span
      aria-label={name}
      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#EEF1FF] text-[9px] font-black text-[#465FFF] shadow-sm"
    >
      {initials}
    </span>
  );
}

function ProgressLine({ value, tone }: { value: number; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF1F7]">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, backgroundColor: style.color }} />
      </span>
      <span className="w-9 text-right text-[10px] font-black text-[#101334]">{value}%</span>
    </div>
  );
}

function ActionCard({ action, selected, onSelect, t }: { action: ActionItem; selected: boolean; onSelect: (action: ActionItem) => void; t: (key: string) => string }) {
  const style = toneStyles[action.tone];
  return (
    <button
      type="button"
      onClick={() => onSelect(action)}
      className={cn("w-full rounded-[12px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(16,24,40,0.08)]", selected ? "border-[#465FFF] shadow-[0_12px_30px_rgba(70,95,255,0.08)]" : "border-[#EEF1F7]")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-black leading-5 text-[#101334]">{action.title}</h3>
        <StatusPill status={action.status} t={t} />
      </div>
      <div className="mt-3 flex flex-col gap-1 text-[11px] font-semibold text-[#68739F]">
        <span>{action.issue}</span>
        <span>{t("impactLabel")} <b className="font-black" style={{ color: style.color }}>{action.impact}</b></span>
        <span>{action.response}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Avatar name={action.owner} />
          <span>
            <span className="block text-[11px] font-black text-[#101334]">{action.owner}</span>
            <span className="block text-[9px] font-semibold text-[#68739F]">{action.role}</span>
          </span>
        </span>
        <span className="text-[10px] font-black text-[#53608C]">{action.due}</span>
      </div>
      <div className="mt-4">
        <ProgressLine value={action.progress} tone={action.tone} />
      </div>
      <MoreVertical size={15} className="absolute hidden" />
    </button>
  );
}



function FilterDropdown({ isOpen, onClose, filterPriority, setFilterPriority, filterStatus, setFilterStatus, t }: {
  isOpen: boolean;
  onClose: () => void;
  filterPriority: string;
  setFilterPriority: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  t: (key: string) => string;
}) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const priorities = [
    { value: "all", label: t("filterModal.allPriorities") },
    { value: "high", label: t("filterModal.high") },
    { value: "medium", label: t("filterModal.medium") },
    { value: "low", label: t("filterModal.low") },
  ];
  const statuses = [
    { value: "all", label: t("filterModal.allStatuses") },
    { value: "active", label: t("filterModal.active") },
    { value: "in-progress", label: t("filterModal.inProgress") },
    { value: "done", label: t("filterModal.done") },
  ];
  const activeCount = (filterPriority !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);
  return (
    <div id="action-filter-menu" ref={dropdownRef} role="dialog" aria-modal="false" aria-label={t("filterModal.title")} className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[12px] border border-[#E6EAF2] bg-white p-4 shadow-[0_12px_40px_rgba(16,24,40,0.12)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-black text-[#101334]">{t("filterModal.title")}</h3>
        {activeCount > 0 && (
          <button type="button" onClick={() => { setFilterPriority("all"); setFilterStatus("all"); }} className="text-[11px] font-bold text-[#465FFF]">{t("filterModal.clearAll")}</button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-2 text-[11px] font-bold text-[#68739F]">{t("filterModal.priority")}</p>
          <div className="flex flex-wrap gap-1.5">
            {priorities.map((p) => (
              <button key={p.value} type="button" onClick={() => setFilterPriority(p.value)} className={cn("rounded-full px-3 py-1.5 text-[10px] font-black transition", filterPriority === p.value ? "bg-[#465FFF] text-white" : "bg-[#F8FAFF] text-[#53608C] hover:bg-[#EEF0FF]")}>{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold text-[#68739F]">{t("filterModal.status")}</p>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button key={s.value} type="button" onClick={() => setFilterStatus(s.value)} className={cn("rounded-full px-3 py-1.5 text-[10px] font-black transition", filterStatus === s.value ? "bg-[#465FFF] text-white" : "bg-[#F8FAFF] text-[#53608C] hover:bg-[#EEF0FF]")}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} className="mt-4 flex h-9 w-full items-center justify-center rounded-[8px] bg-[#465FFF] text-[12px] font-black text-white transition hover:brightness-105">{t("filterModal.apply")}</button>
    </div>
  );
}

export default function ActionPlansPage() {
  const t = useTranslations("ActionPlans");
  const tPagination = useTranslations("DashboardStates.pagination");
  const queryClient = useQueryClient();
  const toastHook = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Demo mode state
  const [demoMode, setDemoMode] = useState(false);
  const [hasCheckedDemoMode, setHasCheckedDemoMode] = useState(false);

  // Check demo mode on mount
  useEffect(() => {
    setDemoMode(isDemoMode());
    setHasCheckedDemoMode(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPriority, filterStatus, searchQuery]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    toastHook.success(message);
  };

  const feedbackMutation = useMutation({
    mutationFn: ({ actionPlanId, action, reason }: { actionPlanId: string; action: "accepted" | "edited" | "rejected"; reason?: string }) => submitActionPlanFeedback(actionPlanId, action, reason),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["action-queue"] }),
        queryClient.invalidateQueries({ queryKey: ["action-plan", selectedActionId] }),
        queryClient.invalidateQueries({ queryKey: ["action-plans-metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["feedback-accuracy"] }),
        queryClient.invalidateQueries({ queryKey: ["actionPlanLearning", selectedActionId] }),
      ]);
      showToast(result ? t("toast.feedbackSent") : t("toast.feedbackFailed"), result ? "success" : "error");
    },
    onError: () => showToast(t("toast.feedbackRetry"), "error"),
  });
  const actionQueueQuery = useQuery({
    queryKey: ["action-queue", { page: currentPage, limit: 8, search: searchQuery.trim(), priority: filterPriority, status: filterStatus, demoMode }],
    queryFn: () => demoMode
      ? Promise.resolve(getMockActionPlans())
      : getActionQueue({ page: currentPage, limit: 8, search: searchQuery.trim(), priority: filterPriority, status: filterStatus }),
    staleTime: 30 * 1000,
    enabled: hasCheckedDemoMode,
  });
  const actionPlanQuery = useQuery({
    queryKey: ["action-plan", selectedActionId],
    queryFn: () => getActionPlanById(selectedActionId),
    enabled: !!selectedActionId,
    staleTime: 30 * 1000,
  });
  const metricsQuery = useQuery({
    queryKey: ["action-plans-metrics"],
    queryFn: () => getActionPlansMetrics(),
    staleTime: 60 * 1000,
  });
  const feedbackAccuracyQuery = useQuery({
    queryKey: ["feedback-accuracy"],
    queryFn: () => getFeedbackAccuracy(),
    staleTime: 60 * 1000,
  });


  const accuracy = feedbackAccuracyQuery.data;
  const accuracyScorePercent = accuracy?.accuracy_score != null ? Math.round(accuracy.accuracy_score * 100) : null;
  const acceptanceRatePercent = accuracy ? Math.round(accuracy.acceptance_rate * 100) : null;
  const rejectionRatePercent = accuracy ? Math.round(accuracy.rejection_rate * 100) : null;
  const liveActions = actionQueueQuery.data?.data ? buildActionItems(actionQueueQuery.data.data, t) : [];
  const isQueueUnavailable = actionQueueQuery.data === null;
  const isPlanUnavailable = actionPlanQuery.data === null;
  const actionItems = liveActions;

  const pageSize = actionQueueQuery.data?.meta.limit ?? 8;
  const totalFilteredItems = actionQueueQuery.data?.meta.total ?? actionItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const validPage = actionQueueQuery.data?.meta.page ?? currentPage;
  const paginatedItems = actionItems;

  const selectedAction = selectedActionId ? actionItems.find((action) => action.id === selectedActionId) || null : null;
  const latestPlan = actionPlanQuery.data;
  const selectedPriority = selectedAction?.priority ?? normalizePriority({
    id: latestPlan?.id ?? selectedActionId,
    title: "",
    escalationLevel: latestPlan?.escalationLevel,
    createdAt: "",
  });
  const selectedStatus = selectedAction?.status ?? normalizeStatus(latestPlan?.workflowStatus);
  const selectedIssue = selectedAction?.issue ?? t("livePlanLabel");
  const selectedImpact = selectedAction?.impact ?? latestPlan?.escalationLevel ?? t("liveReviewLabel");
  const selectedDue = selectedAction?.due ?? formatActionDate(latestPlan?.deadline);
  const selectedStatusLabel = formatWorkflowStatus(selectedStatus, t);
  
  const actionPlanLearningQuery = useQuery({
    queryKey: ["actionPlanLearning", selectedActionId],
    queryFn: () => selectedActionId ? getActionPlanLearning(selectedActionId) : null,
    enabled: !!selectedActionId,
  });
  const hasLearningData = Boolean(actionPlanLearningQuery.data?.insights?.length || actionPlanLearningQuery.data?.templates?.length);
  const detailSteps = hasActionPlanData(latestPlan) && latestPlan?.plan?.length ? latestPlan.plan : null;

  const highActions = actionItems.filter((action) => action.status !== "done" && action.priority === "high");
  const activeCount = actionItems.filter((a) => a.status === "active").length;
  const inProgressCount = actionItems.filter((a) => a.status === "in-progress").length;
  const completedCount = actionItems.filter((a) => a.status === "done").length;
  const needsAttentionCount = highActions.length;

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {demoMode && (
        <div className="flex items-center justify-center gap-2 rounded-[10px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-4 py-3">
          <Sparkles size={16} className="text-[#8B5CFF]" />
          <p className="text-[13px] font-bold text-[#8B5CFF]">
            Demo Mode — Showing sample data for demonstration purposes
          </p>
        </div>
      )}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("desc")}</p>
        </div>
        <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#3345F5] px-4 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:brightness-105 sm:w-fit">
          <Plus size={15} />
          {t("newAction")}
        </button>
      </header>

      <CreateActionPlanModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t("metricActiveActions")} value={metricsQuery.data ? String(metricsQuery.data.active.value) : String(activeCount)} trend={metricsQuery.data?.active.trend} helper={metricsQuery.data ? t("metricTrendHelper", { trend: Math.abs(metricsQuery.data.active.trend) }) : t("metricActiveHelper", { count: activeCount })} icon={Target} tone="blue" />
        <MetricCard label={t("metricInProgress")} value={metricsQuery.data ? String(metricsQuery.data.inProgress.value) : String(inProgressCount)} trend={metricsQuery.data?.inProgress.trend} helper={metricsQuery.data ? t("metricTrendHelper", { trend: Math.abs(metricsQuery.data.inProgress.trend) }) : t("metricInProgressHelper", { count: inProgressCount })} icon={Sparkles} tone="amber" />
        <MetricCard label={t("metricCompleted")} value={metricsQuery.data ? String(metricsQuery.data.done.value) : String(completedCount)} trend={metricsQuery.data?.done.trend} helper={metricsQuery.data ? t("metricTrendHelper", { trend: Math.abs(metricsQuery.data.done.trend) }) : t("metricCompletedHelper", { count: completedCount })} icon={Check} tone="green" />
        <MetricCard label={t("metricNeedsAttention")} value={metricsQuery.data ? String(metricsQuery.data.needsAttention.value) : String(needsAttentionCount)} trend={metricsQuery.data?.needsAttention.trend} helper={metricsQuery.data ? t("metricTrendHelper", { trend: Math.abs(metricsQuery.data.needsAttention.trend) }) : t("metricNeedsAttentionHelper", { count: needsAttentionCount })} icon={Flag} tone="red" negative={needsAttentionCount > 0} />
        <MetricCard label={t("metricAvgResolution")} value={metricsQuery.data ? String(metricsQuery.data.resolution.value) : (actionItems.length > 0 ? String(actionItems.length) : "—")} trend={metricsQuery.data?.resolution.trend} helper={metricsQuery.data ? t("metricTrendHelper", { trend: Math.abs(metricsQuery.data.resolution.trend) }) : t("metricAvgResolutionHelper", { count: actionItems.length })} icon={Clock3} tone="blue" />
      </section>

      {isQueueUnavailable ? <DashboardErrorState title={t("queueErrorTitle")} description={t("queueErrorDesc")} onRetry={() => void actionQueueQuery.refetch()} minHeight="min-h-[150px]" /> : null}
      {isPlanUnavailable ? <DashboardErrorState title={t("planErrorTitle")} description={t("planErrorDesc")} onRetry={() => void actionPlanQuery.refetch()} minHeight="min-h-[150px]" /> : null}

      <Panel>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 border-b border-[#EEF1F7] pb-3 xl:flex-row xl:items-center xl:justify-end">
            <div className="flex w-full flex-wrap gap-3 xl:w-auto">
              <label className="flex h-10 w-full min-w-[240px] items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#FBFCFF] px-3 text-[#8A94B8] sm:w-[260px]">
                <Search size={15} />
                <input aria-label={t("search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[#8A94B8]" placeholder={t("search")} />
              </label>
              <div className="relative">
                <button type="button" aria-expanded={isFilterOpen} aria-controls="action-filter-menu" onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border px-4 text-[12px] font-black sm:flex-none", isFilterOpen || filterPriority !== "all" || filterStatus !== "all" ? "border-[#465FFF] bg-[#465FFF]/5 text-[#465FFF]" : "border-[#DDE3EF] bg-white text-[#101334]")}><Funnel size={14} />{t("filter")}{(filterPriority !== "all" || filterStatus !== "all") ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#465FFF] text-[8px] text-white">{(filterPriority !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0)}</span> : null}</button>
                <FilterDropdown isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filterPriority={filterPriority} setFilterPriority={setFilterPriority} filterStatus={filterStatus} setFilterStatus={setFilterStatus} t={t} />
              </div>
            </div>
          </div>

          {actionQueueQuery.isPending ? (
            <PanelSkeleton className="mt-3" />
          ) : actionQueueQuery.data && liveActions.length === 0 ? (
            <DashboardEmptyState title={searchQuery || filterPriority !== "all" || filterStatus !== "all" ? t("noMatchTitle") : t("emptyTitle")} description={searchQuery || filterPriority !== "all" || filterStatus !== "all" ? t("noMatchDesc") : t("emptyDesc")} icon="inbox" minHeight="min-h-[360px]" />
          ) : (
            <>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedItems.map((action) => (
                  <ActionCard key={action.id} action={action} selected={selectedAction?.id === action.id} onSelect={(item) => setSelectedActionId(item.id)} t={t} />
                ))}
              </div>
              {totalFilteredItems > pageSize && (
                <div className="mt-6 flex items-center justify-between border-t border-[#E8ECF5] pt-4">
                  <span className="text-[12px] font-bold text-[#68739F]">
                    {tPagination("summary", {
                      start: (validPage - 1) * pageSize + 1,
                      end: Math.min(validPage * pageSize, totalFilteredItems),
                      total: totalFilteredItems,
                      label: "actions",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={validPage === 1}
                      className="flex h-8 items-center justify-center rounded-[6px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#53608C] transition hover:bg-[#F4F6FF] hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tPagination("prev")}
                    </button>
                    <span className="text-[12px] font-bold text-[#101334]">
                      {validPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={validPage === totalPages}
                      className="flex h-8 items-center justify-center rounded-[6px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#53608C] transition hover:bg-[#F4F6FF] hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tPagination("next")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(340px,0.82fr)]">
        <Panel>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="mt-0.5 text-[#465FFF]" />
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("detail")}</h2>
                <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("detailDesc")}</p>
              </div>
            </div>
            {!selectedActionId ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1F7]">
                  <Sparkles size={18} className="text-[#8B95B8]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#58648C]">{t("detailEmptyTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("detailEmptyDesc")}</p>
                </div>
              </div>
            ) : actionPlanQuery.isPending ? (
              <PanelSkeleton className="mt-6" />
            ) : !hasActionPlanData(latestPlan) ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1F7]">
                  <Sparkles size={18} className="text-[#8B95B8]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#58648C]">{t("detailNoPlanTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("detailNoPlanDesc")}</p>
                </div>
              </div>
            ) : (<>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]", selectedPriority === "high" ? "bg-[#EF4444]/10 text-[#EF4444]" : selectedPriority === "medium" ? "bg-[#F59E0B]/12 text-[#F59E0B]" : "bg-[#10B981]/12 text-[#0C9B69]")}>{t(`lanes.${selectedPriority}`)}</span>
              <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]", selectedStatus === "active" ? "bg-[#EF4444]/10 text-[#EF4444]" : selectedStatus === "in-progress" ? "bg-[#F59E0B]/12 text-[#F59E0B]" : "bg-[#10B981]/12 text-[#0C9B69]")}>{selectedStatusLabel}</span>
              <span className="rounded-full bg-[#EEF1F7] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#53608C]">{selectedDue}</span>
            </div>
            <h3 className="mt-4 text-[18px] font-black text-[#101334]">{selectedAction?.title ?? latestPlan?.id ?? t("detail")}</h3>
            <p className="mt-3 text-[12px] font-semibold leading-relaxed text-[#53608C]">{latestPlan?.inputNarrative}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[selectedIssue, selectedImpact, selectedStatusLabel, selectedDue].map((item, index) => (
                <div key={index} className="rounded-[10px] bg-[#FBFCFF] p-3">
                  <p className="text-[10px] font-black text-[#8A94B8]">{[t("categoryLabel"), t("impactFieldLabel"), t("statusFieldLabel"), t("dueDateLabel")][index]}</p>
                  <p className="mt-1 text-[11px] font-black text-[#465FFF]">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-[12px] font-black text-[#101334]">{t("aiStepsTitle")}</p>
              <div className="mt-2 grid gap-2">
                {(detailSteps ?? []).slice(0, 3).map(([item, owner]) => (
                  <div key={item} className="flex items-center justify-between rounded-[8px] border border-[#E8ECF5] px-3 py-2 text-[12px] font-semibold text-[#53608C]">
                    <span className="flex items-center gap-2"><CircleCheck size={16} className="text-[#10B981]" />{item}</span>
                    <span className="text-[10px] font-black text-[#68739F]">{owner}</span>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setSelectedActionId("")} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F8FAFF] text-[12px] font-black text-[#465FFF] transition hover:bg-[#465FFF]/5">{t("backToQueue")} <ChevronRight size={14} /></button>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { if (latestPlan?.id) feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "accepted" }); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#10B981]/10 text-[11px] font-black text-[#0C9B69] transition hover:bg-[#10B981]/20 disabled:opacity-50"><Check size={14} /> {t("approve")}</button>
              <button type="button" onClick={() => { if (latestPlan?.id) feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "rejected" }); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#EF4444]/10 text-[11px] font-black text-[#EF4444] transition hover:bg-[#EF4444]/20 disabled:opacity-50"><X size={14} /> {t("reject")}</button>
            </div>
            </>)}
          </CardContent>
        </Panel>

        <Panel>
          <CardContent className="p-5">
               <div className="flex items-start gap-3">
                <BarChart3 size={20} className="mt-0.5 text-[#465FFF]" />
                <div>
                  <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("performance")}</h2>
                  <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("performanceDesc")}</p>
                </div>
              </div>
            {!selectedActionId ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1F7]">
                  <BarChart3 size={18} className="text-[#8B95B8]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#58648C]">{t("performanceEmptyTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("performanceEmptyDesc")}</p>
                </div>
              </div>
            ) : feedbackAccuracyQuery.isPending ? (
              <PanelSkeleton className="mt-5" />
            ) : !hasLearningData ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1F7]">
                  <Lightbulb size={18} className="text-[#8B95B8]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#58648C]">{t("learningNoDataTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("learningNoDataDesc")}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[10px] bg-[#FBFCFF] p-4"><p className="text-[11px] font-bold text-[#8A94B8]">{t("aiAccuracy")}</p><p className="mt-1 text-[22px] font-black text-[#101334]">{accuracyScorePercent != null ? `${accuracyScorePercent}%` : "—"}</p><p className="text-[11px] font-black text-[#8A94B8]">{t("aiAccuracyHelper")}</p></div>
                  <div className="rounded-[10px] bg-[#FBFCFF] p-4"><p className="text-[11px] font-bold text-[#8A94B8]">{t("acceptanceRate")}</p><p className="mt-1 text-[22px] font-black text-[#101334]">{acceptanceRatePercent != null ? `${acceptanceRatePercent}%` : "—"}</p><p className="text-[11px] font-black text-[#10B981]">{t("acceptanceRateHelper")}</p></div>
                  <div className="rounded-[10px] bg-[#FBFCFF] p-4"><p className="text-[11px] font-bold text-[#8A94B8]">{t("rejectionRate")}</p><p className="mt-1 text-[22px] font-black text-[#101334]">{rejectionRatePercent != null ? `${rejectionRatePercent}%` : "—"}</p><p className="text-[11px] font-black text-[#EF4444]">{t("rejectionRateHelper")}</p></div>
                </div>
                {accuracy && Object.keys(accuracy.by_type).length > 0 ? (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-[12px] font-black text-[#101334]"><span>{t("accuracyPerCategory")}</span><span className="flex gap-3 text-[10px] text-[#53608C]"><b className="text-[#465FFF]">{t("total")}</b><b className="text-[#10B981]">{t("accuracy")}</b></span></div>
                    <div className="grid gap-2">
                      {Object.entries(accuracy.by_type).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between rounded-[8px] border border-[#E9EDF5] bg-white px-3 py-2 text-[11px]">
                          <span className="font-bold capitalize text-[#101334]">{key.replace(/_/g, " ")}</span>
                          <span className="flex items-center gap-3 text-[#53608C]"><span className="font-black text-[#465FFF]">{value.total}</span><span className="font-black text-[#10B981]">{Math.round(value.accuracy * 100)}%</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-6 text-center">
                    <BarChart3 size={20} className="text-[#A0ABC0]" />
                    <p className="text-[12px] font-bold text-[#58648C]">{t("noFeedback")}</p>
                    <p className="text-[10px] font-semibold text-[#8B95B8]">{t("noFeedbackDesc")}</p>
                  </div>
                )}
              </>
            )}
            <Link href="/alerts" className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F8FAFF] text-[12px] font-black text-[#465FFF] transition hover:bg-[#465FFF]/5">{t("viewFullAnalytics")} <ChevronRight size={14} /></Link>
          </CardContent>
        </Panel>

        <Panel>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Lightbulb size={20} className="mt-0.5 text-[#465FFF]" />
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("learning")}</h2>
                <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("learningDesc")}</p>
              </div>
            </div>
            {!selectedActionId ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF1F7]">
                  <Lightbulb size={18} className="text-[#8B95B8]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#58648C]">{t("learningEmptyTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("learningEmptyDesc")}</p>
                </div>
              </div>
            ) : actionPlanLearningQuery.isPending ? (
              <PanelSkeleton className="mt-5" />
            ) : (
              <>
                {actionPlanLearningQuery.data?.insights && actionPlanLearningQuery.data.insights.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[13px] font-black text-[#101334]">{t("keyInsights")}</p>
                    <div className="mt-3 grid gap-2.5">
                      {actionPlanLearningQuery.data.insights.map((insight) => {
                        const Icon = insight.icon === "trending-down" ? TrendingDown : insight.icon === "trending-up" ? TrendingUp : Timer;
                        return (
                          <div key={insight.titleKey} className="flex items-center justify-between gap-4 rounded-[9px] bg-[#FBFCFF] p-3 text-[11px] font-semibold text-[#53608C]">
                            <span className="flex items-center gap-2"><Icon size={15} className="text-[#465FFF]" />{t(insight.titleKey)}</span>
                            <b className="shrink-0 text-[#53608C]">{t(insight.valueKey)}</b>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {actionPlanLearningQuery.data?.templates && actionPlanLearningQuery.data.templates.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[13px] font-black text-[#101334]">{t("popularTemplates")}</p>
                    <div className="mt-3 grid gap-2.5">
                      {actionPlanLearningQuery.data.templates.map((template) => (
                        <div key={template.nameKey} className="flex items-center justify-between rounded-[9px] border border-[#EEF1F7] px-3 py-2.5 text-[12px] font-semibold text-[#53608C]">
                          <span className="flex items-center gap-2"><ListChecks size={15} className="text-[#EF4444]" />{t(template.nameKey)}</span>
                          <span className="text-[10px] font-black">{t("templateUsed", { count: template.usageCount + "x" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Link href="/workspace/settings" className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F8FAFF] text-[12px] font-black text-[#465FFF] transition hover:bg-[#465FFF]/5">{t("manageAllTemplates")} <ChevronRight size={14} /></Link>
              </>
            )}
          </CardContent>
        </Panel>
      </section>
    </div>
  );
}
