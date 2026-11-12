"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClientWorkspace, listMyWorkspaces, type WorkspaceSummary } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export const ROLE_LABEL: Record<string, [string, string]> = { owner: ["Owner", "Pemilik"], admin: ["Admin", "Admin"], analyst: ["Analyst", "Analis"], viewer: ["Viewer", "Pembaca"] };

/** The signed-in user's workspaces and the current one; the demo session has exactly one and never lists. */
export function useMyWorkspaces() {
  const user = useAuthStore((s) => s.user);
  const isDemo = isDemoSession(user);
  const selectedId = useWorkspaceStore((s) => s.selectedWorkspaceId);
  const setSelectedId = useWorkspaceStore((s) => s.setSelectedWorkspaceId);
  const query = useQuery({ queryKey: ["my-workspaces", user?.id ?? null], queryFn: listMyWorkspaces, enabled: Boolean(user) && !isDemo, staleTime: 60 * 1000 });
  const workspaces = useMemo(() => query.data?.data ?? [], [query.data]);
  const currentId = query.data?.currentWorkspaceId ?? null;

  // A remembered workspace the user no longer belongs to is dropped.
  useEffect(() => {
    if (selectedId && query.data && !workspaces.some((w) => w.id === selectedId)) setSelectedId(null);
  }, [selectedId, workspaces, query.data, setSelectedId]);

  return { isDemo, query, workspaces, currentId, current: workspaces.find((w) => w.id === currentId) ?? null };
}

/**
 * The list of client workspaces with "New client workspace" at the end. Every API call is scoped to the selected
 * workspace (X-Workspace-Id), so switching clears the cache and client data never mixes.
 */
export function WorkspaceOptions({ onDone }: { onDone?: () => void }) {
  const L = useL();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSelectedId = useWorkspaceStore((s) => s.setSelectedWorkspaceId);
  const { query, workspaces, currentId } = useMyWorkspaces();
  const [creating, setCreating] = useState(false);

  const switchTo = (id: string) => {
    onDone?.();
    if (id === currentId) return;
    setSelectedId(id);
    // Drop every cached query so nothing from the previous client stays on screen.
    queryClient.clear();
    router.refresh();
  };

  return (
    <>
      <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-extrabold text-[#5A6478]">{L("Workspaces", "Workspace")}</p>
      {query.isLoading ? (
        <p className="px-2.5 py-2 text-[12px] text-[#5A6478]">{L("Loading…", "Memuat…")}</p>
      ) : query.isError ? (
        <p className="px-2.5 py-2 text-[12px] text-[#C81E1E]">{L("Workspaces could not be loaded.", "Workspace gagal dimuat.")}</p>
      ) : (
        <ul className="max-h-[280px] overflow-y-auto" role="listbox" aria-label={L("Workspaces", "Workspace")}>
          {workspaces.map((w: WorkspaceSummary) => (
            <li key={w.id}>
              <button
                type="button"
                role="option"
                aria-selected={w.id === currentId}
                onClick={() => switchTo(w.id)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#101334]">{w.name}</span>
                  <span className="block text-[11px] text-[#5A6478]">{w.role && ROLE_LABEL[w.role] ? L(...ROLE_LABEL[w.role]) : L("Member", "Anggota")}</span>
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
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] font-semibold text-[#3B52F5] transition hover:bg-[#465FFF]/5"
        >
          <Plus size={15} aria-hidden="true" />
          {L("New client workspace", "Workspace klien baru")}
        </button>
      </div>
      {creating ? (
        <CreateWorkspaceDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); onDone?.(); setSelectedId(id); queryClient.clear(); router.push("/workspace/settings#keywords"); }}
        />
      ) : null}
    </>
  );
}

/**
 * Wraps a trigger (the sidebar's workspace card) in the workspace picker. In the demo, which has one workspace,
 * the trigger is shown as is.
 */
export function WorkspaceSwitcher({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  const L = useL();
  const { isDemo } = useMyWorkspaces();
  const [open, setOpen] = useState(false);
  if (isDemo) return <div className={className} title={title}>{children}</div>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger type="button" title={title} aria-label={L("Switch workspace", "Ganti workspace")} className={cn("text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/40", className)}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" side="right" sideOffset={12} className="w-[min(320px,calc(100vw-2rem))] gap-0 rounded-[14px] border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)] ring-0">
        <WorkspaceOptions onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function CreateWorkspaceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const L = useL();
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
            <h2 id="create-ws-title" className="text-[16px] font-bold text-[#101334]">{L("New client workspace", "Workspace klien baru")}</h2>
            <p className="mt-1 text-[13px] text-[#5A6478]">{L("A separate workspace keeps this client's keywords, mentions and reports apart from every other client. You will be its owner.", "Workspace terpisah menjaga kata kunci, percakapan, dan laporan klien ini tidak tercampur dengan klien lain. Anda menjadi pemiliknya.")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={L("Close", "Tutup")} className="rounded-md p-1 text-[#5A6478] hover:bg-slate-100"><X size={16} /></button>
        </div>
        <label className="mt-4 block text-[12px] font-semibold text-[#31406B]" htmlFor="ws-name">{L("Client or company name", "Nama klien atau perusahaan")}</label>
        <input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus required minLength={2} placeholder={L("e.g. PT Example Indonesia", "mis. PT Contoh Indonesia")} className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-200 px-3 text-[13px] outline-none focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15" />
        <label className="mt-3 block text-[12px] font-semibold text-[#31406B]" htmlFor="ws-industry">{L("Industry (optional)", "Industri (opsional)")}</label>
        <input id="ws-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} maxLength={80} placeholder={L("e.g. Banking", "mis. Perbankan")} className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-200 px-3 text-[13px] outline-none focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15" />
        {mutation.isError ? <p className="mt-3 text-[12px] font-semibold text-[#C81E1E]" role="alert">{mutation.error instanceof Error ? mutation.error.message : L("The workspace could not be created.", "Workspace gagal dibuat.")}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-slate-200 px-4 text-[13px] font-semibold text-[#31406B] hover:bg-slate-50">{L("Cancel", "Batal")}</button>
          <button type="submit" disabled={mutation.isPending || name.trim().length < 2} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#465FFF] px-4 text-[13px] font-semibold text-white hover:bg-[#3B52F5] disabled:opacity-60">
            {mutation.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
            {L("Create workspace", "Buat workspace")}
          </button>
        </div>
      </form>
    </div>
  );
}
