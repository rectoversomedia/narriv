"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCases, updateCase, deleteCase } from "@/lib/api-service";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardErrorState, DashboardEmptyState, DashboardPagination } from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function CasesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const t = useTranslations("Workspace.cases");
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const casesQuery = useQuery({
    queryKey: ["cases", { page, status: statusFilter, priority: priorityFilter }],
    queryFn: () => getCases({ page, limit: 10, status: statusFilter || undefined, priority: priorityFilter || undefined }),
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

  const isLoading = casesQuery.isPending;
  const data = casesQuery.data?.data || [];
  const meta = casesQuery.data?.meta;

  const renderBadge = (value: string, type: 'status' | 'priority') => {
    if (type === 'status') {
      switch (value) {
        case 'open': return <Badge variant="amber" className="rounded-full">Open</Badge>;
        case 'in_progress': return <Badge variant="default" className="rounded-full bg-[#465FFF] hover:bg-[#465FFF]/90">In Progress</Badge>;
        case 'resolved': return <Badge variant="green" className="rounded-full">Resolved</Badge>;
        case 'closed': return <Badge variant="slate" className="rounded-full">Closed</Badge>;
        default: return <Badge variant="slate" className="rounded-full">{value}</Badge>;
      }
    } else {
      switch (value) {
        case 'critical': return <Badge variant="red" className="rounded-full">Critical</Badge>;
        case 'high': return <Badge variant="amber" className="rounded-full">High</Badge>;
        case 'medium': return <Badge variant="default" className="rounded-full bg-[#465FFF] hover:bg-[#465FFF]/90">Medium</Badge>;
        case 'low': return <Badge variant="slate" className="rounded-full">Low</Badge>;
        default: return <Badge variant="slate" className="rounded-full">{value}</Badge>;
      }
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-slate-900">{t("header.title")}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{t("header.desc")}</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#465FFF]/90">
          <Plus size={16} />
          {t("header.newCase")}
        </button>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[12px] bg-white p-4 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3">
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#465FFF] focus:ring-1 focus:ring-[#465FFF]"
          >
            <option value="">{t("filter.allStatus")}</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select 
            value={priorityFilter} 
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#465FFF] focus:ring-1 focus:ring-[#465FFF]"
          >
            <option value="">{t("filter.allPriority")}</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="rounded-[16px] border border-slate-200 bg-white overflow-hidden shadow-sm">
        {casesQuery.isError || casesQuery.data === null ? (
          <DashboardErrorState 
            title={t("empty.title")} 
            description={t("empty.desc")} 
            onRetry={() => casesQuery.refetch()} 
          />
        ) : isLoading ? (
          <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#465FFF]" /></div>
        ) : data.length === 0 ? (
          <DashboardEmptyState 
            title={t("empty.title")} 
            description={t("empty.desc")} 
            icon="inbox" 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500">{t("table.case")}</th>
                  <th className="px-6 py-4 font-bold text-slate-500">{t("table.status")}</th>
                  <th className="px-6 py-4 font-bold text-slate-500">{t("table.priority")}</th>
                  <th className="px-6 py-4 font-bold text-slate-500">{t("table.assignee")}</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      {item.description && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{item.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={item.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: item.id, status: e.target.value })}
                        className="rounded-[6px] border-0 bg-transparent text-xs font-bold outline-none cursor-pointer hover:bg-slate-100 py-1 px-2 -ml-2"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <div className="mt-1">{renderBadge(item.status, 'status')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {renderBadge(item.priority || 'medium', 'priority')}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-700">{item.assignedTo || item.assignedTeam || t("table.unassigned")}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDeleteId(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-slate-100 p-4">
            <DashboardPagination pagination={meta} onPageChange={setPage} disabled={isLoading} />
          </div>
        )}
      </div>

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
