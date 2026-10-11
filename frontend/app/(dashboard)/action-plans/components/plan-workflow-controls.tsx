"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceMembers, updateActionPlanAssignment, type AssignmentInput } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";

type WorkflowStatus = NonNullable<AssignmentInput["workflowStatus"]>;

const STATUS_OPTIONS: Array<{ value: WorkflowStatus; label: string }> = [
  { value: "pending", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
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
      toast.error("The change was not saved. Check that the owner is a workspace member and try again.", "Update failed");
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["action-queue"] }),
      queryClient.invalidateQueries({ queryKey: ["action-plans-metrics"] }),
      queryClient.invalidateQueries({ queryKey: ["action-plan"] }),
    ]);
    toast.success("Status and owner saved.");
  };

  return (
    <div className="mt-5 rounded-[10px] border border-[#E8ECF5] p-3">
      <p className="text-[12px] font-black text-[#101334]">Track this action</p>
      <p className="mt-0.5 text-[10px] font-semibold text-[#8A94B8]">AI-generated content is a draft. Narriv does not publish or send anything on your behalf.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] font-black text-[#8A94B8]">
          Status
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as WorkflowStatus)} className="mt-1 h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-2 text-[12px] font-bold text-[#101334] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/30">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-black text-[#8A94B8]">
          Owner
          <select value={owner} onChange={(e) => setOwner(e.target.value)} disabled={members.isLoading} className="mt-1 h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-2 text-[12px] font-bold text-[#101334] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/30">
            <option value="">Unassigned</option>
            {(members.data ?? []).map((m) => <option key={m.userId} value={m.userId}>{m.user?.name || m.user?.email || m.userId}</option>)}
          </select>
        </label>
      </div>
      {members.isError ? <p className="mt-2 text-[10px] font-semibold text-rose-600">Workspace members could not be loaded.</p> : null}
      <button type="button" onClick={save} disabled={!dirty || saving} className="mt-3 h-9 w-full rounded-[8px] bg-[#465FFF] text-[12px] font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
