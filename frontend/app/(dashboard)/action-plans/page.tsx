"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, MoreVertical, Search, Timer, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { getActionPlanById, getActionQueue, getFeedbackAccuracy, getWorkspaceMembers, submitActionPlanFeedback, getActionPlansMetrics, getActionPlanLearning, type ActionPlanResponse, type ActionQueueRecord, type MetaPaginatedResponse, type WorkspaceMemberRecord } from "@/lib/api-service";
import { assigneeName } from "@/lib/member-name";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { CreateActionPlanModal } from "./components/create-action-plan-modal";
import { PlanWorkflowControls } from "./components/plan-workflow-controls";
import { RejectActionPlanModal } from "./components/reject-action-plan-modal";
import { readableTone } from "@/lib/readable-tone";
import { DemoBanner } from "@/components/ui/demo-banner";
import { StatStrip } from "@/components/ui/stamp";
import { pickL } from "@/lib/use-l";

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
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10 text-[#3B52F5]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10 text-[#6E44E8]" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10 text-[#047857]" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10 text-[#C81E1E]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10 text-[#A04606]" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100 text-[#5A6478]" },
};

function normalizePriority(record: ActionQueueRecord): Exclude<Priority, "done"> {
  const severity = (record.escalationLevel || record.alert?.severity || "medium").toLowerCase();
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "low") return "low";
  return "medium";
}

function normalizeStatus(status?: string | null): ActionStatus {
  if (status === "done" || status === "completed") return "done";
  if (status === "in_progress" || status === "in-progress" || status === "blocked" || status === "approved") return "in-progress";
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

const IMPACT_WORDS: Record<string, [string, string]> = {
  critical: ["Critical", "Kritis"], high: ["High", "Tinggi"], medium: ["Medium", "Sedang"], low: ["Low", "Rendah"],
  negative: ["Negative", "Negatif"], positive: ["Positive", "Positif"], neutral: ["Neutral", "Netral"], mixed: ["Mixed", "Campuran"],
};
function impactWord(code?: string | null) {
  if (!code) return "";
  const pair = IMPACT_WORDS[code.toLowerCase()];
  return pair ? pickL(pair[0], pair[1]) : code;
}

function buildActionItems(records: ActionQueueRecord[], t: (key: string) => string, members: WorkspaceMemberRecord[]): ActionItem[] {
  return records.map((record) => {
    const priority = normalizePriority(record);
    const status = normalizeStatus(record.workflowStatus);
    const tone: Tone = status === "done" ? "green" : priority === "high" ? "red" : priority === "medium" ? "amber" : "green";
    // Plans have no step tracking, so progress is the workflow stage (1 active, 2 in progress, 3 done), not a percentage.
    const progress = status === "done" ? 3 : status === "in-progress" ? 2 : 1;

    return {
      id: record.id,
      title: record.title,
      issue: record.alert?.title || record.cluster?.title || t("livePlanLabel"),
      impact: impactWord(record.escalationLevel || record.alert?.severity || record.cluster?.sentiment) || t("liveReviewLabel"),
      response: "",
      owner: assigneeName(record.assignedTo, members) || t("unassignedOwner"),
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
    <Card className={cn("text-[#101334]", BOX, "!border-[1.5px] !border-[#101334]", className)}>
      {children}
    </Card>
  );
}

function StatusPill({ status, t }: { status: ActionStatus; t: (key: string) => string }) {
  const style = status === "done" ? "bg-[#10B981]/12 text-[#047857]" : status === "in-progress" ? "bg-[#F59E0B]/12 text-[#A04606]" : "bg-[#EF4444]/10 text-[#C81E1E]";
  const label = status === "done" ? t("statusDone") : status === "in-progress" ? t("statusInProgress") : t("statusActive");
  return <span className={cn("shrink-0 rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em]", style)}>{label}</span>;
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
      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#EEF1FF] text-[9px] font-black text-[#3B52F5] shadow-sm"
    >
      {initials}
    </span>
  );
}

/** Workflow stage of a plan: three segments (active → in progress → done). */
function ProgressLine({ value, tone }: { value: number; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <div className="flex items-center gap-2">
      <span className="flex flex-1 gap-1">
        {[1, 2, 3].map((step) => (
          <span key={step} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: step <= value ? style.color : "#EEF1F7" }} />
        ))}
      </span>
      <span className="whitespace-nowrap text-right text-[10px] font-black text-[#101334]">{pickL(`Stage ${value}/3`, `Tahap ${value}/3`)}</span>
    </div>
  );
}

function ActionCard({ action, selected, onSelect, t }: { action: ActionItem; selected: boolean; onSelect: (action: ActionItem) => void; t: (key: string) => string }) {
  const style = toneStyles[action.tone];
  return (
    <button
      type="button"
      onClick={() => onSelect(action)}
      className={cn(
        // A plan is a sheet with its priority as a band on the left; the picked one is inked (its details show below).
        "relative w-full overflow-hidden rounded-[14px] border-[1.5px] border-[#E3E7F1] bg-white p-4 pl-5 text-left transition hover:border-[#101334]",
        selected && "border-[#101334] shadow-[0_4px_0_#465FFF]",
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: style.color }} />
      <StatusPill status={action.status} t={t} />
      <h3 className="mt-2 text-[15px] font-black leading-snug text-[#101334]">{action.title}</h3>
      {/* The issue in one line, impact as a chip; owner by name only (the role lives on the plan). */}
      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium text-[#3A4566]" title={action.issue}>{action.issue}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.04em]" style={{ color: readableTone(style.color) }}>{action.impact}</span>
        <span className="font-mono text-[11px] font-medium text-[#5F6B94]">· {action.due}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Avatar name={action.owner} />
        <span className={cn("truncate text-[12.5px] font-black", action.owner === t("unassignedOwner") ? "text-[#B42318]" : "text-[#101334]")}>{action.owner.split(" · ")[0]}</span>
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
          <button type="button" onClick={() => { setFilterPriority("all"); setFilterStatus("all"); }} className="text-[11px] font-bold text-[#3B52F5]">{t("filterModal.clearAll")}</button>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-2 text-[11px] font-bold text-[#5F6B94]">{t("filterModal.priority")}</p>
          <div className="flex flex-wrap gap-1.5">
            {priorities.map((p) => (
              <button key={p.value} type="button" onClick={() => setFilterPriority(p.value)} className={cn("rounded-full px-3 py-1.5 text-[10px] font-black transition", filterPriority === p.value ? "bg-[#465FFF] text-white" : "bg-[#F8FAFF] text-[#53608C] hover:bg-[#EEF0FF]")}>{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold text-[#5F6B94]">{t("filterModal.status")}</p>
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
  const trendHelper = (trend: number | null) => (trend == null ? t("metricNoBaseline") : t("metricTrendHelper", { trend: Math.abs(trend) }));
  const tPagination = useTranslations("DashboardStates.pagination");
  const queryClient = useQueryClient();
  const toastHook = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [pickedActionId, setSelectedActionId] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

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
  const membersQuery = useQuery({ queryKey: ["workspace-members"], queryFn: getWorkspaceMembers, staleTime: 60 * 1000 });
  const actionQueueQuery = useQuery<MetaPaginatedResponse<ActionQueueRecord>>({
    queryKey: ["action-queue", { page: currentPage, limit: 8, search: searchQuery.trim(), priority: filterPriority, status: filterStatus }],
    queryFn: async () => {
      const res = await getActionQueue({ page: currentPage, limit: 8, search: searchQuery.trim(), priority: filterPriority, status: filterStatus });
      // Recorded plans only: an empty queue is shown as empty, demo included.
      return res || { data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 0 } };
    },
    staleTime: 30 * 1000,
  });
  // The preview, performance and learning panels follow the picked plan, or the first plan on the page.
  const selectedActionId = pickedActionId || actionQueueQuery.data?.data?.[0]?.id || "";
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
  const liveActions = actionQueueQuery.data?.data ? buildActionItems(actionQueueQuery.data.data, t, membersQuery.data ?? []) : [];
  const isQueueUnavailable = actionQueueQuery.isError;
  const isPlanUnavailable = !!selectedActionId && actionPlanQuery.isError;
  const actionItems = liveActions;

  const pageSize = actionQueueQuery.data?.meta?.limit ?? 8;
  const totalFilteredItems = actionQueueQuery.data?.meta?.total ?? actionItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const validPage = actionQueueQuery.data?.meta?.page ?? currentPage;
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
  const detailSteps = hasActionPlanData(latestPlan) && latestPlan?.plan?.length ? latestPlan.plan : null;

  const highActions = actionItems.filter((action) => action.status !== "done" && action.priority === "high");
  const activeCount = actionItems.filter((a) => a.status === "active").length;
  const inProgressCount = actionItems.filter((a) => a.status === "in-progress").length;
  const completedCount = actionItems.filter((a) => a.status === "done").length;
  const needsAttentionCount = highActions.length;
  type MetricKey = "active" | "inProgress" | "done" | "needsAttention" | "resolution";
  const m = (key: Exclude<MetricKey, "resolution">, fallback: number) => (metricsQuery.data ? String(metricsQuery.data[key].value) : String(fallback));
  const trendText = (key: MetricKey) => {
    const trend = metricsQuery.data?.[key].trend;
    return trend != null && trend !== 0 ? `${trend > 0 ? "▲" : "▼"} ${trendHelper(trend)}` : undefined;
  };

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {isDemoSession && (
        <DemoBanner />
      )}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{t("title")}</h1>
          <p className="mt-1 text-[14px] text-[#5F6B94]">{pickL("Pick a plan to see its steps and approve it below.", "Pilih rencana untuk melihat langkahnya dan menyetujuinya di bawah.")}</p>
        </div>
        <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] bg-[#465FFF] px-4 text-[13px] font-black text-white shadow-sm transition hover:brightness-105">
          {t("newAction")}
        </button>
      </header>

      <CreateActionPlanModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <RejectActionPlanModal
        open={isRejectModalOpen}
        onOpenChange={setIsRejectModalOpen}
        planTitle={selectedAction?.title ?? (latestPlan?.id ? `Action Plan ${latestPlan.id.slice(0, 8)}` : undefined)}
        isSubmitting={feedbackMutation.isPending}
        onConfirm={async (reason) => {
          if (!latestPlan?.id) return;
          try {
            await feedbackMutation.mutateAsync({
              actionPlanId: latestPlan.id,
              action: "rejected",
              reason,
            });
            setIsRejectModalOpen(false);
          } catch {
            // Error handled by feedbackMutation onError
          }
        }}
      />

      {/* One strip of numbers; a trend shows only when there is an earlier period to compare against. */}
      <StatStrip
        stats={[
          { key: "active", value: m("active", activeCount), label: t("metricActiveActions"), helper: trendText("active"), tone: "text-[#3B52F5]" },
          { key: "progress", value: m("inProgress", inProgressCount), label: t("metricInProgress"), helper: trendText("inProgress"), tone: "text-[#B45309]" },
          { key: "done", value: m("done", completedCount), label: t("metricCompleted"), helper: trendText("done"), tone: "text-[#047857]" },
          { key: "attention", value: m("needsAttention", needsAttentionCount), label: t("metricNeedsAttention"), helper: needsAttentionCount > 0 ? pickL("high priority, not done", "prioritas tinggi, belum selesai") : trendText("needsAttention"), tone: needsAttentionCount > 0 ? "text-[#B42318]" : "text-[#101334]" },
          { key: "resolution", value: metricsQuery.data ? String(metricsQuery.data.resolution.value) : "—", label: t("metricAvgResolution"), helper: trendText("resolution") },
        ]}
      />

      {isQueueUnavailable ? <DashboardErrorState title={t("queueErrorTitle")} description={t("queueErrorDesc")} onRetry={() => void actionQueueQuery.refetch()} minHeight="min-h-[150px]" /> : null}
      {isPlanUnavailable ? <DashboardErrorState title={t("planErrorTitle")} description={t("planErrorDesc")} onRetry={() => void actionPlanQuery.refetch()} minHeight="min-h-[150px]" /> : null}

      <Panel>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 border-b border-[#EEF1F7] pb-3 xl:flex-row xl:items-center xl:justify-end">
            <div className="flex w-full flex-wrap gap-3 xl:w-auto">
              <label className="flex h-10 w-full min-w-[240px] items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#FBFCFF] px-3 text-[#647099] sm:w-[260px]">
                <Search size={15} />
                <input aria-label={t("search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[#647099]" placeholder={t("search")} />
              </label>
              <div className="relative">
                <button type="button" aria-expanded={isFilterOpen} aria-controls="action-filter-menu" onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border px-4 text-[12px] font-black sm:flex-none", isFilterOpen || filterPriority !== "all" || filterStatus !== "all" ? "border-[#465FFF] bg-[#465FFF]/5 text-[#3B52F5]" : "border-[#DDE3EF] bg-white text-[#101334]")}>{t("filter")}{(filterPriority !== "all" || filterStatus !== "all") ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#465FFF] text-[8px] text-white">{(filterPriority !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0)}</span> : null}</button>
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
                  <ActionCard key={action.id} action={action} selected={selectedAction?.id === action.id} onSelect={(item) => { setSelectedActionId(item.id); requestAnimationFrame(() => document.getElementById("plan-detail")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} t={t} />
                ))}
              </div>
              {totalFilteredItems > pageSize && (
                <div className="mt-6 flex items-center justify-between border-t border-[#E8ECF5] pt-4">
                  <span className="text-[12px] font-bold text-[#5F6B94]">
                    {tPagination("summary", {
                      start: (validPage - 1) * pageSize + 1,
                      end: Math.min(validPage * pageSize, totalFilteredItems),
                      total: totalFilteredItems,
                      label: pickL("actions", "aksi"),
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={validPage === 1}
                      className="flex h-8 items-center justify-center rounded-[6px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#53608C] transition hover:bg-[#F4F6FF] hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="flex h-8 items-center justify-center rounded-[6px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#53608C] transition hover:bg-[#F4F6FF] hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* The picked plan, laid out for a decision: what it is, the steps, and approve/reject; the side column tracks
          it (status, owner) and shows how well the AI's plans have been received. With no plans there is nothing to show. */}
      {liveActions.length > 0 ? (
      <section id="plan-detail" className="grid scroll-mt-6 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="overflow-hidden !p-0">
          <div className="h-2" style={{ backgroundColor: selectedPriority === "high" ? "#B42318" : selectedPriority === "medium" ? "#F59E0B" : "#12A66A" }} />
          <CardContent className="p-5 sm:p-7">
            {!selectedActionId ? (
              <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                <p className="text-[14px] font-bold text-[#58648C]">{t("detailEmptyTitle")}</p>
                <p className="text-[12px] font-semibold text-[#647099]">{t("detailEmptyDesc")}</p>
              </div>
            ) : actionPlanQuery.isPending ? (
              <PanelSkeleton />
            ) : !hasActionPlanData(latestPlan) ? (
              <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                <p className="text-[14px] font-bold text-[#58648C]">{t("detailNoPlanTitle")}</p>
                <p className="text-[12px] font-semibold text-[#647099]">{t("detailNoPlanDesc")}</p>
              </div>
            ) : (<>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em]", selectedPriority === "high" ? "bg-[#B42318] text-white" : selectedPriority === "medium" ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#E8F7EF] text-[#047857]")}>{t(`lanes.${selectedPriority}`)}</span>
              <span className="nv-stamp">{selectedStatusLabel}</span>
              <span className="font-mono text-[11.5px] font-medium text-[#5F6B94]">{t("dueDateLabel")} {selectedDue}</span>
            </div>
            <h2 className="mt-4 max-w-3xl text-balance text-[26px] font-black leading-[1.15] tracking-[-0.03em] text-[#101334] sm:text-[30px]">{selectedAction?.title ?? latestPlan?.id ?? t("detail")}</h2>
            {latestPlan?.inputNarrative ? <p className="mt-2 max-w-3xl text-[15.5px] font-medium leading-relaxed text-[#31406B]">{latestPlan.inputNarrative}</p> : null}

            <dl className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0 rounded-[14px] bg-[#F6F7FC] px-4 py-3">
                <dt className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{t("categoryLabel")}</dt>
                <dd className="mt-1 text-[16px] font-black leading-snug text-[#101334]">{selectedIssue}</dd>
              </div>
              <div className="min-w-0 rounded-[14px] bg-[#FFF5F4] px-4 py-3 shadow-[inset_0_0_0_1.5px_#F5B5B0]">
                <dt className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{t("impactFieldLabel")}</dt>
                <dd className="mt-1 text-[20px] font-black leading-tight text-[#B42318]">{impactWord(String(selectedImpact)) || selectedImpact}</dd>
              </div>
            </dl>

            {/* The steps, numbered, each with when it should happen. */}
            <div className="mt-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{t("aiStepsTitle")}</p>
              <ol className="mt-2 divide-y divide-[#EEF0F6]">
                {(detailSteps ?? []).map(([item, when], stepIndex) => (
                  <li key={`${stepIndex}:${item}`} className="flex items-start gap-3 py-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-[#101334] font-mono text-[11px] font-bold text-[#101334]">{String(stepIndex + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 pt-0.5 text-[15px] font-bold leading-snug text-[#101334]">{item}</span>
                    {when ? <span className="shrink-0 rounded-[6px] bg-[#EEF1FF] px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#3B52F5]">{when}</span> : null}
                  </li>
                ))}
              </ol>
            </div>

            {/* The decision on the AI's draft. */}
            <div className="mt-5 rounded-[18px] bg-[#101334] p-5 text-white">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF]">{pickL("Your Decision", "Keputusan Anda")}</p>
              <p className="mt-1.5 text-[15px] font-semibold text-white/80">{pickL("AI drafted this plan. Approve it to go ahead, or reject it with a reason so the next draft is better.", "Rencana ini disusun AI. Setujui untuk dijalankan, atau tolak dengan alasan supaya draf berikutnya lebih baik.")}</p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <button type="button" onClick={() => { if (latestPlan?.id) feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "accepted" }); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-6 text-[14px] font-black text-white transition hover:bg-[#3B52F5] disabled:opacity-50">
                  <CheckCircle2 size={16} /> {pickL("Approve Plan", "Setujui Rencana")}
                </button>
                <button type="button" onClick={() => { if (latestPlan?.id) setIsRejectModalOpen(true); }} disabled={!latestPlan?.id || feedbackMutation.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-white/40 px-6 text-[14px] font-black text-white/90 transition hover:bg-white/10 disabled:opacity-50">
                  <XCircle size={16} /> {pickL("Reject", "Tolak")}
                </button>
              </div>
            </div>
            </>)}
          </CardContent>
        </Panel>

        <div className="space-y-5 xl:sticky xl:top-6">
          {latestPlan?.id ? (
            <Panel className="!p-0">
              <CardContent className="p-5">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{pickL("Tracking", "Pelacakan")}</p>
                <PlanWorkflowControls key={`${latestPlan.id}-${latestPlan.workflowStatus ?? ""}-${latestPlan.assignedTo ?? ""}`} planId={latestPlan.id} status={latestPlan.workflowStatus} assignedTo={latestPlan.assignedTo} />
                <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-3 flex items-center justify-center gap-1 text-[13px] font-bold text-[#3B52F5] hover:underline">{pickL("Pick Another Plan", "Pilih Rencana Lain")} <ChevronRight size={14} className="-rotate-90" /></a>
              </CardContent>
            </Panel>
          ) : null}

          {/* How the AI's plans have been received, plus what it learned; one card instead of two. */}
          <Panel className="!p-0">
            <CardContent className="p-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{t("performance")}</p>
              {feedbackAccuracyQuery.isPending ? (
                <PanelSkeleton className="mt-3" />
              ) : accuracy ? (
                <>
                  <div className="mt-3 grid grid-cols-3 divide-x divide-[#EEF0F6] rounded-[14px] bg-[#F6F7FC] py-3 text-center">
                    {[
                      [t("aiAccuracy"), accuracyScorePercent, "text-[#101334]"],
                      [t("acceptanceRate"), acceptanceRatePercent, "text-[#047857]"],
                      [t("rejectionRate"), rejectionRatePercent, "text-[#B42318]"],
                    ].map(([label, value, tone]) => (
                      <div key={String(label)} className="px-2">
                        <p className={cn("text-[22px] font-black leading-none", String(tone))}>{value != null ? `${value}%` : "—"}</p>
                        <p className="mt-1.5 text-[11px] font-bold leading-tight text-[#5F6B94]">{label}</p>
                      </div>
                    ))}
                  </div>
                  {Object.keys(accuracy.by_type).length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {Object.entries(accuracy.by_type).map(([key, value]) => (
                        <li key={key} className="flex items-center justify-between text-[12.5px]">
                          <span className="font-bold capitalize text-[#101334]">{key.replace(/_/g, " ")}</span>
                          <span className="font-mono font-bold text-[#5F6B94]">{value.total}× · <span className="text-[#047857]">{Math.round(value.accuracy * 100)}%</span></span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-[13px] font-semibold text-[#647099]">{t("noFeedbackDesc")}</p>
              )}

              {actionPlanLearningQuery.data?.insights?.length ? (
                <div className="mt-5 border-t border-[#EEF0F6] pt-4">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{t("keyInsights")}</p>
                  <ul className="mt-2 space-y-2">
                    {actionPlanLearningQuery.data.insights.map((insight) => {
                      const stats = actionPlanLearningQuery.data?.stats;
                      const row =
                        insight.type === "acceptance_rate"
                          ? { Icon: TrendingUp, label: pickL("AI suggestions accepted", "Saran AI yang diterima"), value: `${insight.value}%`, hint: stats ? pickL(`${stats.accepted} of ${stats.totalFeedback} reviews`, `${stats.accepted} dari ${stats.totalFeedback} tinjauan`) : "" }
                          : insight.type === "avg_rating"
                            ? { Icon: Timer, label: pickL("Average content rating", "Rata-rata nilai konten"), value: `${insight.value}/5`, hint: "" }
                            : { Icon: TrendingDown, label: pickL("More suggestions rejected than accepted", "Lebih banyak saran ditolak daripada diterima"), value: String(insight.value), hint: pickL("Review the plan's prompt and context", "Tinjau konteks dan arahan rencana ini") };
                      return (
                        <li key={insight.type} className="flex items-center justify-between gap-3 text-[13px]">
                          <span className="flex min-w-0 items-center gap-2"><row.Icon size={15} className="shrink-0 text-[#3B52F5]" /><span className="min-w-0"><span className="block font-bold text-[#101334]">{row.label}</span>{row.hint ? <span className="block text-[11.5px] text-[#647099]">{row.hint}</span> : null}</span></span>
                          <b className="shrink-0 font-mono text-[#101334]">{row.value}</b>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Panel>
        </div>
      </section>
      ) : null}
    </div>
  );
}
