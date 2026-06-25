"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCases, createCase, updateCase, deleteCase, getWorkspaceMembers } from "@/lib/api-service";
import { Plus, Trash2, FileText, Search, RefreshCcw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardErrorState, DashboardEmptyState, DashboardPagination } from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

type CaseStatus = "open" | "in_progress" | "resolved" | "closed";
type CasePriority = "critical" | "high" | "medium" | "low";

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

function dateInputToIsoDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export default function CasesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const t = useTranslations("Workspace.cases");
  const tStatus = useTranslations("Workspace.cases.status");
  const tCreate = useTranslations("Workspace.cases.create");
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const casesQuery = useQuery({
    queryKey: ["cases", { page, status: statusFilter, priority: priorityFilter }],
    queryFn: () => getCases({ page, limit: 10, status: statusFilter || undefined, priority: priorityFilter || undefined }),
  });

  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: getWorkspaceMembers,
    staleTime: 5 * 60 * 1000,
  });

  const members = membersQuery.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; priority?: string; assignedTo?: string; assignedTeam?: string; deadline?: string }) => {
      const created = await createCase(data);
      if (!created) throw new Error("Failed to create case");
      return created;
    },
    onSuccess: () => {
      success(t("toast.statusUpdated"));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setIsCreateModalOpen(false);
    },
    onError: () => {
      error(t("toast.statusUpdateFailed"));
    }
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
      setDeleteId(null);
    },
    onError: () => {
      error(t("toast.deleteFailed"));
    }
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
    },
    onError: () => {
      error(t("toast.statusUpdateFailed"));
    }
  });

  const handleCreateCase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      priority: formData.get("priority") as string || undefined,
      assignedTo: formData.get("assignedTo") as string || undefined,
      assignedTeam: formData.get("assignedTeam") as string || undefined,
      deadline: dateInputToIsoDateTime(formData.get("deadline")),
    });
  };

  const isLoading = casesQuery.isPending;
  const data = casesQuery.data?.data || [];
  const meta = casesQuery.data?.meta;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#060A23]">{t("header.title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("header.desc")}</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:opacity-90 sm:w-fit">
          <Plus size={15} />
          {t("header.newCase")}
        </button>
      </header>

      <Card className="border-[#DDE3EF]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B95B8]" />
              <input
                type="search"
                placeholder={t("filter.search")}
                className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] pl-9 pr-3 text-[11px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[11px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
            >
              <option value="">{t("filter.allStatus")}</option>
              <option value="open">{tStatus("open")}</option>
              <option value="in_progress">{tStatus("in_progress")}</option>
              <option value="resolved">{tStatus("resolved")}</option>
              <option value="closed">{tStatus("closed")}</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[11px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
            >
              <option value="">{t("filter.allPriority")}</option>
              <option value="critical">{tStatus("critical")}</option>
              <option value="high">{tStatus("high")}</option>
              <option value="medium">{tStatus("medium")}</option>
              <option value="low">{tStatus("low")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#DDE3EF] overflow-hidden">
        {casesQuery.isError || casesQuery.data === null ? (
          <DashboardErrorState
            title={t("empty.title")}
            description={t("empty.desc")}
            onRetry={() => casesQuery.refetch()}
          />
        ) : isLoading ? (
          <div className="p-8 flex justify-center">
            <RefreshCcw className="animate-spin text-[#8A94B8]" size={24} />
          </div>
        ) : data.length === 0 ? (
          <DashboardEmptyState
            title={t("empty.title")}
            description={t("empty.desc")}
            icon="inbox"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E6EAF2] text-[9.5px] font-black uppercase tracking-[0.15em] text-[#68739F]">
                  <th className="px-6 py-4">{t("table.case")}</th>
                  <th className="px-6 py-4">{t("table.status")}</th>
                  <th className="px-6 py-4">{t("table.priority")}</th>
                  <th className="px-6 py-4">{t("table.assignee")}</th>
                  <th className="px-6 py-4 text-right">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F7]">
                {data.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[#F8FAFF]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">
                          <FileText size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-[#101334]">{item.title}</p>
                          {item.description && <p className="mt-0.5 text-[10px] font-bold text-[#68739F] line-clamp-1">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: item.id, status: e.target.value })}
                        className="rounded-[6px] border-0 bg-transparent text-[10px] font-black outline-none cursor-pointer hover:bg-[#F8FAFF] py-1 px-2 -ml-2"
                      >
                        <option value="open">{tStatus("open")}</option>
                        <option value="in_progress">{tStatus("in_progress")}</option>
                        <option value="resolved">{tStatus("resolved")}</option>
                        <option value="closed">{tStatus("closed")}</option>
                      </select>
                      <div className="mt-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", statusStyles[item.status as CaseStatus] || statusStyles.open)}>
                          {tStatus(item.status as CaseStatus)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", priorityStyles[(item.priority as CasePriority) || "medium"])}>
                        {tStatus((item.priority as CasePriority) || "medium")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-bold text-[#31406B]">{item.assignedTo || item.assignedTeam || t("table.unassigned")}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDeleteId(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A94B8] transition hover:bg-[#FFF4F4] hover:text-[#EF4444]">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="border-t border-[#EDF1F7] p-4">
            <DashboardPagination pagination={meta} onPageChange={setPage} disabled={isLoading} />
          </div>
        )}
      </Card>

      {/* Create Case Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}>
          <div className="flex w-full max-w-lg flex-col max-h-[85vh] rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{tCreate("title")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{tCreate("desc")}</p>
              </div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <form onSubmit={handleCreateCase} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tCreate("titleLabel")}</label>
                  <input name="title" required placeholder={tCreate("titlePlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tCreate("descLabel")}</label>
                  <textarea name="description" rows={3} placeholder={tCreate("descPlaceholder")} className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tCreate("priorityLabel")}</label>
                    <select name="priority" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="medium">{tStatus("medium")}</option>
                      <option value="low">{tStatus("low")}</option>
                      <option value="high">{tStatus("high")}</option>
                      <option value="critical">{tStatus("critical")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tCreate("deadlineLabel")}</label>
                    <input name="deadline" type="date" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tCreate("assignedToLabel")}</label>
                    <select name="assignedTo" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="">{tCreate("assignedToPlaceholder")}</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.user?.name || member.user?.email || member.userId}>
                          {member.user?.name || member.user?.email || member.userId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{tCreate("assignedTeamLabel")}</label>
                    <select name="assignedTeam" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="">{tCreate("assignedTeamPlaceholder")}</option>
                      {[...new Set(members.map((m) => m.role))].map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                    {tCreate("cancel")}
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:opacity-50">
                    {createMutation.isPending ? <RefreshCcw size={13} className="animate-spin" /> : null}
                    {tCreate("submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

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
