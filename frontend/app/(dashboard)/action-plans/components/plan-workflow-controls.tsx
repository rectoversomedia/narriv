"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceMembers, updateActionPlanAssignment, type AssignmentInput } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { useL } from "@/lib/use-l";

type WorkflowStatus = NonNullable<AssignmentInput["workflowStatus"]>;

const STATUS_OPTIONS: Array<{ value: WorkflowStatus; label: [string, string] }> = [
  { value: "pending", label: ["Not started", "Belum dimulai"] },
  { value: "in_progress", label: ["In progress", "Sedang dikerjakan"] },
  { value: "blocked", label: ["Blocked", "Terhambat"] },
  { value: "done", label: ["Done", "Selesai"] },
];

function toWorkflowStatus(status?: string | null): WorkflowStatus {
  if (status === "in_progress" || status === "in-progress" || status === "approved") return "in_progress";
  if (status === "blocked") return "blocked";
  if (status === "done" || status === "completed") return "done";
  return "pending";
}

/**
 * Records an action plan's status and owner (PATCH /action-plans/:id/assign).
 * The owner list comes from workspace members; the server rejects non-members.
 */
export function PlanWorkflowControls({ planId, status, assignedTo }: { planId: string; status?: string | null; assignedTo?: string | null }) {
  const toast = useToast();
  const L = useL();
  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState<WorkflowStatus>(toWorkflowStatus(status));
  const [owner, setOwner] = useState<string>(assignedTo ?? "");
  const [saving, setSaving] = useState(false);
  const members = useQuery({ queryKey: ["workspace-members"], queryFn: getWorkspaceMembers, staleTime: 60 * 1000 });

  const dirty = nextStatus !== toWorkflowStatus(status) || owner !== (assignedTo ?? "");

  const save = async () => {
    setSaving(true);
    const result = await updateActionPlanAssignment(planId, { workflowStatus: nextStatus, assignedTo: owner || null });
    setSaving(false);
    if (!result) {
      toast.error(L("The change was not saved. Check that the owner is a workspace member and try again.", "Perubahan belum tersimpan. Pastikan penanggung jawab adalah anggota workspace, lalu coba lagi."), L("Update failed", "Gagal menyimpan"));
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["action-queue"] }),
      queryClient.invalidateQueries({ queryKey: ["action-plans-metrics"] }),
      queryClient.invalidateQueries({ queryKey: ["action-plan"] }),
    ]);
    toast.success(L("Status and owner saved.", "Status dan penanggung jawab tersimpan."));
  };

  return (
    <div className="mt-3">
      <p className="text-[12px] font-semibold text-[#647099]">{L("Draft only; nothing is sent for you.", "Hanya draf; tidak ada yang dikirim otomatis.")}</p>
      <div className="mt-3 grid gap-3">
        <label className="text-[12px] font-bold text-[#31406B]">
          {L("Status", "Status")}
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as WorkflowStatus)} className="mt-1.5 h-11 w-full rounded-[10px] border-[1.5px] border-[#DDE3EF] bg-white px-3 text-[13px] font-bold text-[#101334] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/30">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{L(o.label[0], o.label[1])}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-bold text-[#31406B]">
          {L("Owner", "Penanggung jawab")}
          <select value={owner} onChange={(e) => setOwner(e.target.value)} disabled={members.isLoading} className="mt-1.5 h-11 w-full rounded-[10px] border-[1.5px] border-[#DDE3EF] bg-white px-3 text-[13px] font-bold text-[#101334] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/30">
            <option value="">{L("Unassigned", "Belum ditugaskan")}</option>
            {(members.data ?? []).map((m) => <option key={m.userId} value={m.userId}>{m.user?.name || m.user?.email || m.userId}</option>)}
          </select>
        </label>
      </div>
      {members.isError ? <p className="mt-2 text-[10px] font-semibold text-rose-600">{L("Workspace members could not be loaded.", "Daftar anggota workspace gagal dimuat.")}</p> : null}
      <button type="button" onClick={save} disabled={!dirty || saving} className="mt-3 h-11 w-full rounded-[12px] bg-[#465FFF] text-[14px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? L("Saving…", "Menyimpan…") : L("Save", "Simpan")}
      </button>
    </div>
  );
}
