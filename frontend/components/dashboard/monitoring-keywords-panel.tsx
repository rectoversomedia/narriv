"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import {
  createMonitoringKeyword,
  deleteMonitoringKeyword,
  getMonitoringKeywords,
  updateMonitoringKeyword,
  type MonitoringKeyword,
  type MonitoringKeywordsResponse,
} from "@/lib/api-service";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["monitoring-keywords"];

/**
 * Persisted monitoring keywords (GET/POST/PATCH/DELETE /workspace/keywords).
 * Editing is gated by the server-provided `canEdit`; the backend enforces the
 * same owner/admin rule, so this gate is presentation only.
 */
export function MonitoringKeywordsPanel({ className }: { className?: string }) {
  const t = useTranslations("Workspace.settings.keywords");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [toDelete, setToDelete] = useState<MonitoringKeyword | null>(null);

  const keywordsQuery = useQuery({ queryKey: QUERY_KEY, queryFn: getMonitoringKeywords, staleTime: 30 * 1000 });
  const canEdit = Boolean(keywordsQuery.data?.canEdit);

  const onSaved = (data: MonitoringKeywordsResponse) => {
    // Mutations return the full list; keep canEdit from the last GET.
    queryClient.setQueryData<MonitoringKeywordsResponse>(QUERY_KEY, (prev) => ({ ...data, canEdit: prev?.canEdit ?? data.canEdit }));
  };
  const onError = (error: unknown) => {
    toast.error(error instanceof Error ? error.message : String(error), t("failed"));
  };

  const createMutation = useMutation({
    mutationFn: createMonitoringKeyword,
    onSuccess: (data) => {
      onSaved(data);
      setDraft("");
      toast.success(t("saved"));
    },
    onError,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { keyword?: string; isActive?: boolean } }) => updateMonitoringKeyword(id, input),
    onSuccess: (data) => {
      onSaved(data);
      setEditing(null);
    },
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMonitoringKeyword,
    onSuccess: (data) => {
      onSaved(data);
      toast.success(t("saved"));
    },
    onError,
  });

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (value.length < 2 || busy) return;
    createMutation.mutate(value);
  };

  const keywords = keywordsQuery.data?.data ?? [];

  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
          <Search size={18} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-black text-[#101334]">{t("title")}</h3>
          <p className="text-[10px] font-semibold text-[#68739F]">{t("desc")}</p>
          {keywordsQuery.data?.note ? <p className="mt-1 text-[10px] font-semibold text-slate-500">{keywordsQuery.data.note}</p> : null}
        </div>
      </div>

      {keywordsQuery.isLoading ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : keywordsQuery.isError ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
          <span>{t("loadFailed")}</span>
          <button type="button" onClick={() => keywordsQuery.refetch()} className="font-black underline">
            {t("retry")}
          </button>
        </div>
      ) : (
        <>
          {canEdit ? (
            <form onSubmit={submit} className="mt-4 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={100}
                placeholder={t("placeholder")}
                aria-label={t("placeholder")}
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#DDE3EF] bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20"
              />
              <button
                type="submit"
                disabled={busy || draft.trim().length < 2}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#465FFF] px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={13} />
                {createMutation.isPending ? t("adding") : t("add")}
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] font-semibold text-slate-500">{t("readOnly")}</p>
          )}

          {keywords.length === 0 ? (
            <p className="mt-4 text-[11px] font-semibold text-slate-500">{t("empty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#EEF1F7]">
              {keywords.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-2 py-2">
                  {editing?.id === k.id ? (
                    <form
                      className="flex min-w-0 flex-1 gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const value = editing.value.trim();
                        if (value.length >= 2 && value !== k.keyword) updateMutation.mutate({ id: k.id, input: { keyword: value } });
                        else setEditing(null);
                      }}
                    >
                      <input
                        autoFocus
                        value={editing.value}
                        maxLength={100}
                        onChange={(e) => setEditing({ id: k.id, value: e.target.value })}
                        aria-label={t("rename")}
                        className="h-8 min-w-0 flex-1 rounded-md border border-[#DDE3EF] bg-white px-2 text-[11px] font-semibold text-slate-700 focus:outline-none"
                      />
                      <button type="submit" disabled={busy} title={t("save")} className="rounded-md border border-[#DDE3EF] p-1.5 text-emerald-600 hover:bg-emerald-50">
                        <Check size={13} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} title={t("cancel")} className="rounded-md border border-[#DDE3EF] p-1.5 text-slate-500 hover:bg-slate-50">
                        <X size={13} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className={cn("min-w-0 flex-1 truncate text-[11.5px] font-black", k.isActive ? "text-[#101334]" : "text-slate-400 line-through")}>{k.keyword}</span>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[9px] font-black",
                          !k.isActive
                            ? "border-slate-200 bg-slate-100 text-slate-500"
                            : k.scheduled
                              ? "border-[#CDEEDD] bg-[#F1FCF6] text-[#10B981]"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                        )}
                      >
                        {!k.isActive ? t("inactive") : k.scheduled ? t("scheduled") : t("queued")}
                      </span>
                      {canEdit ? (
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateMutation.mutate({ id: k.id, input: { isActive: !k.isActive } })}
                            title={k.isActive ? t("deactivate") : t("activate")}
                            className="rounded-md border border-[#DDE3EF] p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {k.isActive ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditing({ id: k.id, value: k.keyword })}
                            title={t("rename")}
                            className="rounded-md border border-[#DDE3EF] p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setToDelete(k)}
                            title={t("delete")}
                            className="rounded-md border border-[#DDE3EF] p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmationDialog
        open={Boolean(toDelete)}
        title={t("delete")}
        description={toDelete ? `${toDelete.keyword} — ${t("deleteConfirm")}` : ""}
        confirmLabel={t("delete")}
        tone="danger"
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id);
          setToDelete(null);
        }}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      />
    </section>
  );
}
