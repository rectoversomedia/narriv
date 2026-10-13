"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClientWorkspace, listMyWorkspaces, type WorkspaceSummary } from "@/lib/api-service";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", analyst: "Analyst", viewer: "Viewer" };

/**
 * Shows the workspace the user is working in and lets an admin switch between
 * client workspaces or create a new one. Every API call is scoped to the
 * selected workspace (X-Workspace-Id), so client data never mixes.
 */
export function WorkspaceSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDemo = isDemoSession(user);
  const selectedId = useWorkspaceStore((s) => s.selectedWorkspaceId);
  const setSelectedId = useWorkspaceStore((s) => s.setSelectedWorkspaceId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const workspacesQuery = useQuery({
    queryKey: ["my-workspaces", user?.id ?? null],
    queryFn: listMyWorkspaces,
    enabled: Boolean(user) && !isDemo,
    staleTime: 60 * 1000,
  });

  const workspaces = useMemo(() => workspacesQuery.data?.data ?? [], [workspacesQuery.data]);
  const currentId = workspacesQuery.data?.currentWorkspaceId ?? null;
  const current = workspaces.find((w) => w.id === currentId);

  // A remembered workspace the user no longer belongs to is dropped.
  useEffect(() => {
    if (selectedId && workspacesQuery.data && !workspaces.some((w) => w.id === selectedId)) setSelectedId(null);
  }, [selectedId, workspaces, workspacesQuery.data, setSelectedId]);

  const switchTo = (id: string) => {
    setOpen(false);
    if (id === currentId) return;
    setSelectedId(id);
    // Drop every cached query so nothing from the previous client stays on screen.
    queryClient.clear();
    router.refresh();
  };

  if (isDemo || !user) {
    return <p className="mt-1 text-[13px] font-semibold text-[var(--text-muted)]">{user?.workspace || "Demo Workspace"}</p>;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="mt-0.5 inline-flex max-w-[220px] items-center gap-1 rounded-md text-left text-[13px] font-semibold text-[var(--text-muted)] transition hover:text-[#3B52F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/40"
          aria-label="Switch workspace"
        >
          <span className="truncate">{current?.name || user.workspace || "Workspace"}</span>
          <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={10} className="w-[min(320px,calc(100vw-2rem))] gap-0 rounded-[14px] border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)] ring-0">
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5A6478]">Workspaces</p>
          {workspacesQuery.isLoading ? (
            <p className="px-2.5 py-2 text-[12px] text-[#5A6478]">Loading…</p>
          ) : workspacesQuery.isError ? (
            <p className="px-2.5 py-2 text-[12px] text-[#C81E1E]">Workspaces could not be loaded.</p>
          ) : (
            <ul className="max-h-[280px] overflow-y-auto" role="listbox" aria-label="Workspaces">
              {workspaces.map((w: WorkspaceSummary) => (
                <li key={w.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={w.id === currentId}
                    onClick={() => switchTo(w.id)}
                    className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-slate-50"
                  >
                    <Building2 size={15} className="shrink-0 text-[#5A6478]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#101334]">{w.name}</span>
                      <span className="block text-[11px] text-[#5A6478]">{w.role ? ROLE_LABEL[w.role] ?? w.role : "Member"}</span>
                    </span>
                    {w.id === currentId ? <Check size={15} className="shrink-0 text-[#3B52F5]" aria-hidden="true" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setCreating(true); }}
              className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] font-semibold text-[#3B52F5] transition hover:bg-[#465FFF]/5"
            >
              <Plus size={15} aria-hidden="true" /> New client workspace
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {creating ? <CreateWorkspaceDialog onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setSelectedId(id); queryClient.clear(); router.push("/workspace/settings#keywords"); }} /> : null}
    </>
  );
}

function CreateWorkspaceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const mutation = useMutation({
    mutationFn: () => createClientWorkspace({ name: name.trim(), industry: industry.trim() || null }),
    onSuccess: (res) => onCreated(res.data.id),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 2) mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-ws-title">
      <form onSubmit={submit} className="w-full max-w-[440px] rounded-[16px] border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="create-ws-title" className="text-[16px] font-bold text-[#101334]">New client workspace</h2>
            <p className="mt-1 text-[13px] text-[#5A6478]">A separate workspace keeps this client&apos;s keywords, signals and reports apart from every other client. You will be its owner.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#5A6478] hover:bg-slate-100"><X size={16} /></button>
        </div>
        <label className="mt-4 block text-[12px] font-semibold text-[#31406B]" htmlFor="ws-name">Client or company name</label>
        <input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus required minLength={2} placeholder="e.g. PT Example Indonesia" className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-200 px-3 text-[13px] outline-none focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15" />
        <label className="mt-3 block text-[12px] font-semibold text-[#31406B]" htmlFor="ws-industry">Industry (optional)</label>
        <input id="ws-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} maxLength={80} placeholder="e.g. Banking" className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-200 px-3 text-[13px] outline-none focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15" />
        {mutation.isError ? <p className="mt-3 text-[12px] font-semibold text-[#C81E1E]" role="alert">{mutation.error instanceof Error ? mutation.error.message : "The workspace could not be created."}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-slate-200 px-4 text-[13px] font-semibold text-[#31406B] hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending || name.trim().length < 2} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#465FFF] px-4 text-[13px] font-semibold text-white hover:bg-[#3B52F5] disabled:opacity-60">
            {mutation.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            Create workspace
          </button>
        </div>
      </form>
    </div>
  );
}
