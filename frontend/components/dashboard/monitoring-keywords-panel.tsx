"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pause, Pencil, Play, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import {
  createMonitoringKeyword,
  deleteMonitoringKeyword,
  getMonitoringKeywords,
  runKeywordMonitoring,
  updateMonitoringKeyword,
  type MonitoringRunResponse,
  type MonitoringKeyword,
  type MonitoringKeywordsResponse,
} from "@/lib/api-service";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/intelligence-api";

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
    <section id="keywords" className={cn("scroll-mt-24 rounded-[14px] border border-[#DDE3EF] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#3B52F5]">
          <Search size={18} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-black text-[#101334]">{t("title")}</h3>
          <p className="text-[10px] font-semibold text-[#5F6B94]">{t("desc")}</p>
          {keywordsQuery.data?.note ? <p className="mt-1 text-[10px] font-semibold text-[#5A6478]">{keywordsQuery.data.note}</p> : null}
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
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10.5px] font-semibold text-[#5A6478]">{t("readOnly")}</p>
          )}

          {keywords.length === 0 ? (
            <p className="mt-4 text-[11px] font-semibold text-[#5A6478]">{t("empty")}</p>
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
                      <button type="submit" disabled={busy} title={t("save")} className="rounded-md border border-[#DDE3EF] p-1.5 text-emerald-700 hover:bg-emerald-50">
                        <Check size={13} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} title={t("cancel")} className="rounded-md border border-[#DDE3EF] p-1.5 text-[#5A6478] hover:bg-slate-50">
                        <X size={13} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-[11.5px] font-black", k.isActive ? "text-[#101334]" : "text-[#5A6478]")}>{k.keyword}</span>
                        <LastRunLine keyword={k} t={t} />
                      </span>
                      <KeywordStatus keyword={k} t={t} />
                      {canEdit ? (
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateMutation.mutate({ id: k.id, input: { isActive: !k.isActive } })}
                            title={k.isActive ? t("deactivate") : t("activate")}
                            className="rounded-md border border-[#DDE3EF] p-1.5 text-[#5A6478] hover:bg-slate-50 disabled:opacity-50"
                          >
                            {k.isActive ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditing({ id: k.id, value: k.keyword })}
                            title={t("rename")}
                            className="rounded-md border border-[#DDE3EF] p-1.5 text-[#5A6478] hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setToDelete(k)}
                            title={t("delete")}
                            className="rounded-md border border-[#DDE3EF] p-1.5 text-[#5A6478] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
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
          {canEdit && keywords.some((k) => k.isActive) ? <RunMonitoringNow onDone={() => queryClient.invalidateQueries()} /> : null}
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

const STATUS_STYLE: Record<string, string> = {
  active: "border-[#CDEEDD] bg-[#F1FCF6] text-[#047857]",
  failing: "border-rose-200 bg-rose-50 text-rose-700",
  paused: "border-slate-200 bg-slate-100 text-[#5A6478]",
  awaiting_first_run: "border-sky-200 bg-sky-50 text-sky-700",
  not_in_rotation: "border-amber-200 bg-amber-50 text-amber-700",
};

type T = ReturnType<typeof useTranslations<"Workspace.settings.keywords">>;

function KeywordStatus({ keyword, t }: { keyword: MonitoringKeyword; t: T }) {
  const status = keyword.monitoringStatus ?? (!keyword.isActive ? "paused" : keyword.scheduled ? "awaiting_first_run" : "not_in_rotation");
  return (
    <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-black", STATUS_STYLE[status])}>
      {t(`status_${status}`)}
    </span>
  );
}

function LastRunLine({ keyword, t }: { keyword: MonitoringKeyword; t: T }) {
  const run = keyword.lastRun;
  if (!run || !keyword.isActive) return null;
  if (run.status === "failed") {
    return <span className="block text-[9.5px] font-semibold text-rose-600">{t("lastRunFailed", { time: timeAgo(run.at), reason: run.errorCategory || "unknown" })}</span>;
  }
  if (run.status === "deferred") return null;
  return (
    <span className="block text-[9.5px] font-semibold text-[#5A6478]">
      {t("lastRun", { time: timeAgo(run.at), fetched: run.fetched ?? 0, inserted: run.inserted ?? 0, duplicates: run.deduplicated ?? 0 })}
    </span>
  );
}

const RUN_STATUS_TEXT: Record<MonitoringRunResponse["status"], string> = {
  completed: "Completed",
  completed_with_errors: "Completed with some errors",
  partial: "Partially completed: some keywords were not reached in time",
  failed: "Failed",
  skipped_overlap: "Skipped: another run was in progress",
};

/**
 * "Run monitoring now" for owners/admins: collects Google News articles for
 * this workspace's active keywords through the same pipeline as the scheduled
 * runs (dedup, storage, AI analysis, clustering) and reports what happened.
 */
type RunError = Error & { status?: number; code?: string; info?: { retryAt?: string; status?: string } };

/** What to tell the user for each way a run request can end without a result. */
function describeRunError(err: RunError): { tone: "error" | "info"; text: string } {
  if (err.code === "CLIENT_TIMEOUT") {
    return { tone: "info", text: "The run is taking longer than expected. It continues on the server; the keyword list below refreshes in a minute with the real result." };
  }
  if (err.status === 429) {
    const at = err.info?.retryAt ? new Date(err.info.retryAt) : null;
    return { tone: "info", text: at ? `A run for this workspace started less than 10 minutes ago. You can run again at ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : err.message };
  }
  if (err.status === 400) return { tone: "info", text: "Add or resume at least one keyword before running monitoring." };
  if (err.status === 403) return { tone: "error", text: "Only workspace owners and admins can run monitoring." };
  return { tone: "error", text: err.message || "The monitoring run failed." };
}

function RunMonitoringNow({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: runKeywordMonitoring,
    onSuccess: onDone,
    onError: (err: RunError) => {
      // The server keeps working after the browser stops waiting: pick up its result later.
      if (err.code === "CLIENT_TIMEOUT") setTimeout(() => void queryClient.invalidateQueries(), 60_000);
    },
  });
  const result = mutation.data;
  const failure = mutation.isError ? describeRunError(mutation.error as RunError) : null;
  return (
    <div className="mt-4 rounded-lg border border-[#DDE3EF] bg-[#FBFCFF] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11.5px] font-black text-[#101334]">Run monitoring now</p>
          <p className="text-[10px] font-semibold text-[#5A6478]">Collects the latest public news for up to 3 active keywords (8 articles each) and analyses it. Takes up to 2 minutes; one run per 10 minutes.</p>
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#465FFF] px-3 text-[11px] font-black text-white hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          {mutation.isPending ? "Running…" : "Run now"}
        </button>
      </div>
      {failure ? (
        <p role={failure.tone === "error" ? "alert" : "status"} className={cn("mt-2 text-[10.5px] font-semibold", failure.tone === "error" ? "text-[#C81E1E]" : "text-[#31406B]")}>{failure.text}</p>
      ) : null}
      {result ? (
        <div className="mt-2 text-[10.5px] font-semibold text-[#31406B]" role="status">
          <p>
            {RUN_STATUS_TEXT[result.status] ?? result.status} in {Math.max(1, Math.round(result.durationMs / 1000))} s: {result.totals.fetched} articles found, {result.totals.inserted} new saved, {result.totals.deduplicated} already saved (skipped), {result.totals.analyzed} analysed{result.totals.analysisFailed ? `, ${result.totals.analysisFailed} analysis failures` : ""}{result.totals.failedKeywords ? `, ${result.totals.failedKeywords} keyword(s) failed` : ""}.
          </p>
          <ul className="mt-1 space-y-0.5">
            {result.results.filter((r) => r.keyword).map((r) => (
              <li key={r.keyword} className={r.status === "failed" ? "text-[#C81E1E]" : "text-[#5A6478]"}>
                &ldquo;{r.keyword}&rdquo;: {r.status === "ok" ? `${r.fetched ?? 0} found, ${r.inserted ?? 0} new, ${r.deduplicated ?? 0} already saved` : r.status === "deferred" ? "not reached in this run (time limit)" : `failed (${r.errorCategory || "error"})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
