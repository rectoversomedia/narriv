"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCases,
  createCase,
  updateCase,
  deleteCase,
  getCaseById,
  getWorkspaceMembers,
} from "@/lib/api-service";
import {
  Plus,
  Trash2,
  FileText,
  Search,
  RefreshCcw,
  X,
  Eye,
  FolderOpen,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import {
  DashboardErrorState,
  DashboardEmptyState,
  DashboardPagination,
  TableSkeleton,
  MetricRowSkeleton,
} from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useUiStore } from "@/store/useUiStore";

/* ─── Types ─── */
type CaseStatus = "open" | "in_progress" | "resolved" | "closed";
type CasePriority = "critical" | "high" | "medium" | "low";
type Tone = "blue" | "purple" | "green" | "amber" | "red" | "slate";

/* ─── Styles ─── */
const statusStyles: Record<CaseStatus, string> = {
  open: "bg-[#F59E0B]/10 text-[#D97706]",
  in_progress: "bg-[#465FFF]/10 text-[#465FFF]",
  resolved: "bg-[#10B981]/10 text-[#059669]",
  closed: "bg-[#64748B]/10 text-[#475569]",
};

const priorityStyles: Record<CasePriority, string> = {
  critical: "bg-[#EF4444]/10 text-[#DC2626]",
  high: "bg-[#F59E0B]/10 text-[#D97706]",
  medium: "bg-[#465FFF]/10 text-[#465FFF]",
  low: "bg-[#64748B]/10 text-[#475569]",
};

const toneMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-[#465FFF]/10", text: "text-[#465FFF]", ring: "ring-[#465FFF]/15" },
  purple: { bg: "bg-[#8B5CFF]/10", text: "text-[#8B5CFF]", ring: "ring-[#8B5CFF]/15" },
  green: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", ring: "ring-[#10B981]/15" },
  amber: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", ring: "ring-[#F59E0B]/15" },
  red: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", ring: "ring-[#EF4444]/15" },
  slate: { bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-200" },
};

/* ─── Helpers ─── */
function dateInputToIsoDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function formatRelativeTime(value: string, locale: string) {
  const deltaSeconds = Math.round(
    (new Date(value).getTime() - Date.now()) / 1000
  );
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of ranges) {
    if (Math.abs(deltaSeconds) >= seconds || unit === "minute") {
      return new Intl.RelativeTimeFormat(
        locale === "id" ? "id-ID" : "en-US",
        { numeric: "always" }
      ).format(Math.round(deltaSeconds / seconds), unit);
    }
  }

  return locale === "id" ? "baru saja" : "just now";
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDeadline(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const isPast = date < now;
  const formatted = new Intl.DateTimeFormat(
    locale === "id" ? "id-ID" : "en-US",
    { day: "2-digit", month: "short", year: "numeric" }
  ).format(date);
  return { formatted, isPast };
}

/* ─── Metric Card ─── */
function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof FolderOpen;
  tone: Tone;
}) {
  const locale = useUiStore((state) => state.language);
  const style = toneMap[tone];

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            style.bg,
            style.text
          )}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            {value.toLocaleString(locale === "id" ? "id-ID" : "en-US")}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-bold text-slate-500">{helper}</p>
    </div>
  );
}

/* ─── Case Detail Sidebar ─── */
function CaseDetailSidebar({
  caseId,
  onClose,
}: {
  caseId: string;
  onClose: () => void;
}) {
  const t = useTranslations("Workspace.cases");
  const tStatus = useTranslations("Workspace.cases.status");
  const tDetail = useTranslations("Workspace.cases.detail");
  const locale = useUiStore((state) => state.language);
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();

  const caseQuery = useQuery({
    queryKey: ["case-detail", caseId],
    queryFn: () => getCaseById(caseId),
    enabled: !!caseId,
  });

  const record = caseQuery.data;
  const resolvedResolution = record?.resolution ?? "";

  const [prevCaseId, setPrevCaseId] = useState(caseId);
  const [resolution, setResolution] = useState(resolvedResolution);
  const [prevResolution, setPrevResolution] = useState(resolvedResolution);

  if (caseId !== prevCaseId) {
    setPrevCaseId(caseId);
    setResolution(resolvedResolution);
    setPrevResolution(resolvedResolution);
  } else if (resolvedResolution !== prevResolution) {
    setPrevResolution(resolvedResolution);
    setResolution(resolvedResolution);
  }

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resolutionMutation = useMutation({
    mutationFn: async () => {
      const updated = await updateCase(caseId, { resolution });
      if (!updated) throw new Error("Failed");
      return updated;
    },
    onSuccess: () => {
      success(tDetail("resolutionSaved"));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
    },
    onError: () => error(tDetail("resolutionFailed")),
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/30 backdrop-blur-md"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="flex h-full w-full max-w-lg flex-col border-l border-[#E8ECF5] bg-white text-[#101334] shadow-2xl animate-in slide-in-from-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
          <h2
            id={dialogTitleId}
            className="text-lg font-black text-[#101334]"
          >
            {tDetail("title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={tDetail("close")}
            onClick={onClose}
            className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {caseQuery.isPending ? (
            <div className="space-y-4">
              <div className="h-7 w-3/4 animate-pulse rounded bg-[#EEF2FF]" />
              <div className="h-4 w-full animate-pulse rounded bg-[#F1F4FB]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-[#F1F4FB]" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-[10px] bg-[#F8FAFF]" />
                ))}
              </div>
            </div>
          ) : caseQuery.isError || !record ? (
            <DashboardErrorState
              title={t("error.title")}
              description={t("error.desc")}
              onRetry={() => caseQuery.refetch()}
              minHeight="min-h-[200px]"
            />
          ) : (
            <div className="space-y-6">
              {/* Title + Description */}
              <div>
                <h3 className="text-[22px] font-black leading-tight tracking-[-0.04em] text-[#070B28]">
                  {record.title}
                </h3>
                {record.description && (
                  <p className="mt-3 text-[13px] font-semibold leading-6 text-[#31406B]">
                    {record.description}
                  </p>
                )}
              </div>

              {/* Status + Priority badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black",
                    statusStyles[record.status as CaseStatus] || statusStyles.open
                  )}
                >
                  {tStatus(record.status as CaseStatus)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black",
                    priorityStyles[(record.priority as CasePriority) || "medium"]
                  )}
                >
                  {tStatus((record.priority as CasePriority) || "medium")}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[10px] bg-[#F8FAFF] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">
                    {t("table.assignee")}
                  </p>
                  <p className="mt-2 text-[13px] font-black text-[#101334]">
                    {record.assignedTo || record.assignedTeam || t("table.unassigned")}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#F8FAFF] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">
                    {t("table.deadline")}
                  </p>
                  <p className="mt-2 text-[13px] font-black text-[#101334]">
                    {record.deadline
                      ? formatDeadline(record.deadline, locale)?.formatted || t("table.noDeadline")
                      : t("table.noDeadline")}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#F8FAFF] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">
                    {tDetail("created")}
                  </p>
                  <p className="mt-2 text-[13px] font-black text-[#101334]">
                    {formatDateTime(record.createdAt, locale)}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#F8FAFF] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">
                    {tDetail("updated")}
                  </p>
                  <p className="mt-2 text-[13px] font-black text-[#101334]">
                    {formatDateTime(record.updatedAt, locale)}
                  </p>
                </div>
              </div>

              {/* Source info */}
              {record.sourceType && (
                <div className="rounded-[10px] border border-[#E6EAF2] bg-white p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">
                    {tDetail("source")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">
                      <ArrowUpRight size={12} />
                    </span>
                    <span className="text-[12px] font-black text-[#101334]">
                      {record.sourceType}
                      {record.sourceId && (
                        <span className="ml-1 text-[10px] font-bold text-[#68739F]">
                          #{record.sourceId.slice(0, 8)}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Resolution textarea */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">
                  {tDetail("resolution")}
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  placeholder={tDetail("resolutionPlaceholder")}
                  className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none"
                />
                <button
                  type="button"
                  disabled={resolutionMutation.isPending || resolution === (record.resolution || "")}
                  onClick={() => resolutionMutation.mutate()}
                  className="mt-2 flex h-9 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50"
                >
                  {resolutionMutation.isPending && (
                    <RefreshCcw size={13} className="animate-spin" />
                  )}
                  {tDetail("editResolution")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main Page ─── */
export default function CasesPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null);

  const t = useTranslations("Workspace.cases");
  const tStatus = useTranslations("Workspace.cases.status");
  const tCreate = useTranslations("Workspace.cases.create");
  const tMetrics = useTranslations("Workspace.cases.metrics");
  const locale = useUiStore((state) => state.language);
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const createFormRef = useRef<HTMLFormElement | null>(null);
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  /* ─── Debounced search ─── */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  /* ─── Create modal focus trap ─── */
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateModalOpen(false);
        return;
      }
      if (event.key !== "Tab" || !createFormRef.current) return;

      const focusable = createFormRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isCreateModalOpen]);

  /* ─── Queries ─── */
  const casesQuery = useQuery({
    queryKey: [
      "cases",
      {
        page,
        search: debouncedSearchQuery,
        status: statusFilter,
        priority: priorityFilter,
      },
    ],
    queryFn: () =>
      getCases({
        page,
        limit: 10,
        search: debouncedSearchQuery || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
  });

  // Fetch ALL cases (no filter) for metric counts
  const allCasesQuery = useQuery({
    queryKey: ["cases-metrics"],
    queryFn: () => getCases({ page: 1, limit: 1 }),
    staleTime: 30_000,
  });

  // Fetch status-specific counts for metrics
  const openCasesQuery = useQuery({
    queryKey: ["cases-count", "open"],
    queryFn: () => getCases({ page: 1, limit: 1, status: "open" }),
    staleTime: 30_000,
  });
  const inProgressCasesQuery = useQuery({
    queryKey: ["cases-count", "in_progress"],
    queryFn: () => getCases({ page: 1, limit: 1, status: "in_progress" }),
    staleTime: 30_000,
  });
  const resolvedCasesQuery = useQuery({
    queryKey: ["cases-count", "resolved"],
    queryFn: () => getCases({ page: 1, limit: 1, status: "resolved" }),
    staleTime: 30_000,
  });
  const closedCasesQuery = useQuery({
    queryKey: ["cases-count", "closed"],
    queryFn: () => getCases({ page: 1, limit: 1, status: "closed" }),
    staleTime: 30_000,
  });

  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: getWorkspaceMembers,
    staleTime: 5 * 60 * 1000,
  });

  const members = membersQuery.data || [];

  /* ─── Metrics ─── */
  const metricsLoading =
    allCasesQuery.isPending ||
    openCasesQuery.isPending ||
    inProgressCasesQuery.isPending ||
    resolvedCasesQuery.isPending ||
    closedCasesQuery.isPending;

  const metrics = useMemo(
    () => [
      {
        label: tMetrics("total"),
        value: allCasesQuery.data?.meta?.total ?? 0,
        helper: tMetrics("totalHelper"),
        icon: FileText,
        tone: "purple" as Tone,
      },
      {
        label: tMetrics("open"),
        value: openCasesQuery.data?.meta?.total ?? 0,
        helper: tMetrics("openHelper"),
        icon: FolderOpen,
        tone: "amber" as Tone,
      },
      {
        label: tMetrics("inProgress"),
        value: inProgressCasesQuery.data?.meta?.total ?? 0,
        helper: tMetrics("inProgressHelper"),
        icon: Clock,
        tone: "blue" as Tone,
      },
      {
        label: tMetrics("resolved"),
        value: resolvedCasesQuery.data?.meta?.total ?? 0,
        helper: tMetrics("resolvedHelper"),
        icon: CheckCircle2,
        tone: "green" as Tone,
      },
    ],
    [
      allCasesQuery.data,
      openCasesQuery.data,
      inProgressCasesQuery.data,
      resolvedCasesQuery.data,
      tMetrics,
    ]
  );

  /* ─── Mutations ─── */
  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      priority?: string;
      assignedTo?: string;
      assignedTeam?: string;
      deadline?: string;
    }) => {
      const created = await createCase(data);
      if (!created) throw new Error("Failed to create case");
      return created;
    },
    onSuccess: () => {
      success(t("toast.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["cases-count"] });
      setIsCreateModalOpen(false);
    },
    onError: () => {
      error(t("toast.createFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const deleted = await deleteCase(id);
      if (!deleted) throw new Error("Failed to delete case");
      return deleted;
    },
    onSuccess: () => {
      success(t("toast.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["cases-count"] });
      setDeleteId(null);
    },
    onError: () => {
      error(t("toast.deleteFailed"));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updatedCase = await updateCase(id, { status });
      if (!updatedCase) throw new Error("Failed to update case status");
      return updatedCase;
    },
    onSuccess: () => {
      success(t("toast.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["cases-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["cases-count"] });
    },
    onError: () => {
      error(t("toast.statusUpdateFailed"));
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const updatedCase = await updateCase(id, { priority });
      if (!updatedCase) throw new Error("Failed to update priority");
      return updatedCase;
    },
    onSuccess: () => {
      success(t("toast.priorityUpdated"));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: () => {
      error(t("toast.priorityUpdateFailed"));
    },
  });

  const handleCreateCase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      priority: (formData.get("priority") as string) || undefined,
      assignedTo: (formData.get("assignedTo") as string) || undefined,
      deadline: dateInputToIsoDateTime(formData.get("deadline")),
    });
  };

  const handleRefresh = () => {
    casesQuery.refetch();
    allCasesQuery.refetch();
    openCasesQuery.refetch();
    inProgressCasesQuery.refetch();
    resolvedCasesQuery.refetch();
    closedCasesQuery.refetch();
  };

  const isLoading = casesQuery.isPending;
  const data = casesQuery.data?.data || [];
  const meta = casesQuery.data?.meta;

  return (
    <div className="space-y-6 pb-6">
      {/* ─── Header ─── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex rounded-full border-[#465FFF]/15 bg-[#465FFF]/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
            {t("eyebrow")}
          </span>
          <h1 className="mt-3 text-[28px] font-black tracking-tight text-slate-900">
            {t("header.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {t("header.desc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={casesQuery.isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={16}
              className={casesQuery.isFetching ? "animate-spin" : ""}
            />
            {t("header.refresh")}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:opacity-90 sm:w-fit"
          >
            <Plus size={15} />
            {t("header.newCase")}
          </button>
        </div>
      </header>

      {/* ─── KPI Metric Cards ─── */}
      {metricsLoading ? (
        <MetricRowSkeleton count={4} />
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>
      )}

      {/* ─── Filter Row ─── */}
      <section className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B95B8]" />
            <input
              type="search"
              aria-label={t("filter.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filter.search")}
              className="h-10 w-full rounded-[8px] border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
          >
            <option value="">{t("filter.allStatus")}</option>
            <option value="open">{tStatus("open")}</option>
            <option value="in_progress">{tStatus("in_progress")}</option>
            <option value="resolved">{tStatus("resolved")}</option>
            <option value="closed">{tStatus("closed")}</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15"
          >
            <option value="">{t("filter.allPriority")}</option>
            <option value="critical">{tStatus("critical")}</option>
            <option value="high">{tStatus("high")}</option>
            <option value="medium">{tStatus("medium")}</option>
            <option value="low">{tStatus("low")}</option>
          </select>
        </div>
      </section>

      {/* ─── Table ─── */}
      <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
        {casesQuery.isError || casesQuery.data === null ? (
          <DashboardErrorState
            title={t("error.title")}
            description={t("error.desc")}
            onRetry={() => casesQuery.refetch()}
          />
        ) : isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={7} />
          </div>
        ) : data.length === 0 ? (
          <DashboardEmptyState
            title={t("empty.title")}
            description={t("empty.desc")}
            icon="inbox"
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#5C4DFF] px-4 py-2.5 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90"
              >
                <Plus size={14} />
                {t("header.newCase")}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.case")}
                  </th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.priority")}
                  </th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.assignee")}
                  </th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.deadline")}
                  </th>
                  <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.created")}
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {t("table.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => {
                  const deadlineInfo = formatDeadline(item.deadline, locale);

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      {/* Case */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">
                            <FileText size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-[#101334]">
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="mt-0.5 text-[10px] font-bold text-[#68739F] line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status dropdown + badge */}
                      <td className="px-4 py-4 align-top">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              id: item.id,
                              status: e.target.value,
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          aria-label={t("table.updateStatus", {
                            title: item.title,
                          })}
                          className="rounded-[6px] border-0 bg-transparent text-[10px] font-black outline-none cursor-pointer hover:bg-[#F8FAFF] py-1 px-2 -ml-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="open">{tStatus("open")}</option>
                          <option value="in_progress">
                            {tStatus("in_progress")}
                          </option>
                          <option value="resolved">
                            {tStatus("resolved")}
                          </option>
                          <option value="closed">{tStatus("closed")}</option>
                        </select>
                        <div className="mt-1">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-black",
                              statusStyles[item.status as CaseStatus] ||
                                statusStyles.open
                            )}
                          >
                            {tStatus(item.status as CaseStatus)}
                          </span>
                        </div>
                      </td>

                      {/* Priority dropdown + badge */}
                      <td className="px-4 py-4 align-top">
                        <select
                          value={item.priority || "medium"}
                          onChange={(e) =>
                            updatePriorityMutation.mutate({
                              id: item.id,
                              priority: e.target.value,
                            })
                          }
                          disabled={updatePriorityMutation.isPending}
                          aria-label={t("table.updatePriority", {
                            title: item.title,
                          })}
                          className="rounded-[6px] border-0 bg-transparent text-[10px] font-black outline-none cursor-pointer hover:bg-[#F8FAFF] py-1 px-2 -ml-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="low">{tStatus("low")}</option>
                          <option value="medium">{tStatus("medium")}</option>
                          <option value="high">{tStatus("high")}</option>
                          <option value="critical">
                            {tStatus("critical")}
                          </option>
                        </select>
                        <div className="mt-1">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-black",
                              priorityStyles[
                                (item.priority as CasePriority) || "medium"
                              ]
                            )}
                          >
                            {tStatus(
                              (item.priority as CasePriority) || "medium"
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8B5CFF]/10 text-[10px] font-black text-[#8B5CFF]">
                            {(
                              item.assignedTo ||
                              item.assignedTeam ||
                              "?"
                            )[0].toUpperCase()}
                          </span>
                          <p className="text-[11px] font-bold text-[#31406B]">
                            {item.assignedTo ||
                              item.assignedTeam ||
                              t("table.unassigned")}
                          </p>
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-4 align-top">
                        {deadlineInfo ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar
                              size={12}
                              className={
                                deadlineInfo.isPast
                                  ? "text-[#EF4444]"
                                  : "text-[#8B95B8]"
                              }
                            />
                            <span
                              className={cn(
                                "text-[11px] font-bold",
                                deadlineInfo.isPast
                                  ? "text-[#EF4444]"
                                  : "text-[#31406B]"
                              )}
                            >
                              {deadlineInfo.formatted}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-[#8B95B8]">
                            {t("table.noDeadline")}
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-4 align-top">
                        <p className="text-[11px] font-black text-slate-900">
                          {formatRelativeTime(item.createdAt, locale)}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">
                          {formatDateTime(item.createdAt, locale)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right align-top">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={t("table.viewCase", {
                              title: item.title,
                            })}
                            onClick={() => setDetailCaseId(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A94B8] transition hover:bg-[#F0F3FF] hover:text-[#465FFF]"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label={t("table.deleteCase", {
                              title: item.title,
                            })}
                            onClick={() => setDeleteId(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A94B8] transition hover:bg-[#FFF4F4] hover:text-[#EF4444]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer — total + pagination */}
        {meta && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <span className="text-[11px] font-bold text-slate-500">
              {t("pagination.total", { total: meta.total })}
            </span>
            {meta.totalPages > 1 && (
              <DashboardPagination
                pagination={meta}
                onPageChange={setPage}
                disabled={isLoading}
              />
            )}
          </div>
        )}
      </section>

      {/* ─── Case Detail Sidebar ─── */}
      {detailCaseId && (
        <CaseDetailSidebar
          caseId={detailCaseId}
          onClose={() => setDetailCaseId(null)}
        />
      )}

      {/* ─── Create Case Modal ─── */}
      {isCreateModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setIsCreateModalOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              aria-describedby={dialogDescId}
              className="flex w-full max-w-lg flex-col max-h-[85vh] rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
                <div>
                  <h2
                    id={dialogTitleId}
                    className="text-lg font-black text-[#101334]"
                  >
                    {tCreate("title")}
                  </h2>
                  <p
                    id={dialogDescId}
                    className="mt-1 text-[11px] font-bold text-[#68739F]"
                  >
                    {tCreate("desc")}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label={tCreate("close")}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <form
                  ref={createFormRef}
                  onSubmit={handleCreateCase}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">
                      {tCreate("titleLabel")}
                    </label>
                    <input
                      name="title"
                      required
                      placeholder={tCreate("titlePlaceholder")}
                      className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">
                      {tCreate("descLabel")}
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder={tCreate("descPlaceholder")}
                      className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">
                        {tCreate("priorityLabel")}
                      </label>
                      <select
                        name="priority"
                        className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
                      >
                        <option value="medium">{tStatus("medium")}</option>
                        <option value="low">{tStatus("low")}</option>
                        <option value="high">{tStatus("high")}</option>
                        <option value="critical">{tStatus("critical")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">
                        {tCreate("deadlineLabel")}
                      </label>
                      <input
                        name="deadline"
                        type="date"
                        className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">
                      {tCreate("assignedToLabel")}
                    </label>
                    <select
                      name="assignedTo"
                      className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
                    >
                      <option value="">
                        {tCreate("assignedToPlaceholder")}
                      </option>
                      {members.map((member) => (
                        <option
                          key={member.userId}
                          value={
                            member.user?.name ||
                            member.user?.email ||
                            member.userId
                          }
                        >
                          {member.user?.name ||
                            member.user?.email ||
                            member.userId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]"
                    >
                      {tCreate("cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50"
                    >
                      {createMutation.isPending ? (
                        <RefreshCcw size={13} className="animate-spin" />
                      ) : null}
                      {tCreate("submit")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─── Delete Confirmation ─── */}
      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("delete.title")}
        description={t("delete.description")}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("delete.cancel")}
        tone="danger"
      />
    </div>
  );
}
