"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Loader2, Newspaper, Pause, Pencil, Play, RefreshCw, Tags, Trash2, X } from "lucide-react";
import { BrandHero } from "@/components/dashboard/brand-hero";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import {
  createMonitoringKeyword,
  deleteMonitoringKeyword,
  getMonitoringKeywords,
  getWorkspaceSettings,
  runKeywordMonitoring,
  updateMonitoringKeyword,
  type MonitoringRunResponse,
  type MonitoringKeyword,
  type MonitoringKeywordsResponse,
} from "@/lib/api-service";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/intelligence-api";
import { pickL } from "@/lib/use-l";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { intlLocale } from "@/store/useUiStore";

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
  const workspaceQuery = useQuery({ queryKey: ["workspace-settings"], queryFn: () => getWorkspaceSettings(), staleTime: 60 * 1000 });
  const isDemo = isDemoSession(useAuthStore((s) => s.user));
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

  const activeCount = keywords.filter((k) => k.isActive).length;
  const maxActive = keywordsQuery.data?.limits?.maxActive ?? null;
  const iconBtn = "flex size-8 items-center justify-center rounded-[8px] text-[#5A6478] transition hover:bg-[#EEF1F7] disabled:opacity-50";

  return (
    <section id="keywords" className={cn("scroll-mt-24 overflow-hidden rounded-[18px] bg-white shadow-[0_8px_28px_rgba(16,19,52,0.10)]", className)}>
      {/* The most important setting: what Narriv watches. Big, on top, with the count. */}
      <BrandHero
        className="rounded-none shadow-none"
        eyebrow={t("title")}
        brandName={workspaceQuery.data?.brandName || pickL("Your brand", "Brand Anda")}
        logoUrl={workspaceQuery.data?.logoUrl}
        pills={[
          { icon: Tags, value: maxActive ? `${activeCount} / ${maxActive}` : activeCount, label: pickL("active keywords", "kata kunci aktif") },
          // The demo bank is fictional, so it is not fetched live; its sample data is reset every night.
          { icon: Clock3, label: isDemo ? pickL("Sample data, reset nightly", "Data contoh, diperbarui tiap malam") : pickL("Checked every hour", "Dicek setiap jam") },
          { icon: Newspaper, label: pickL("News and social media", "Berita dan media sosial") },
        ]}
      />

      <div className="p-6">
      {keywordsQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-[132px] animate-pulse rounded-[14px] bg-slate-100" />)}
        </div>
      ) : keywordsQuery.isError ? (
        <div className="flex items-center justify-between rounded-[12px] bg-[#FDECEC] px-4 py-3 text-[12px] font-bold text-[#C81E1E]">
          <span>{t("loadFailed")}</span>
          <button type="button" onClick={() => keywordsQuery.refetch()} className="font-black underline">{t("retry")}</button>
        </div>
      ) : (
        <>
          {canEdit ? (
            <form onSubmit={submit} className="flex gap-2 rounded-[14px] bg-[#EEF1FF] p-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={100}
                placeholder={pickL("Add a brand, product or person to watch, e.g. Arunika Mobile", "Tambah brand, produk, atau tokoh yang dipantau, mis. Arunika Mobile")}
                aria-label={t("placeholder")}
                className="h-12 min-w-0 flex-1 rounded-[10px] bg-white px-4 text-[15px] font-bold text-[#101334] outline-none placeholder:text-[#A8B0C7] focus:ring-2 focus:ring-[#465FFF]/40"
              />
              <button type="submit" disabled={busy || draft.trim().length < 2} className="h-12 shrink-0 rounded-[10px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50">
                {createMutation.isPending ? t("adding") : `+ ${t("add")}`}
              </button>
            </form>
          ) : (
            <p className="rounded-[12px] bg-[#F4F6FC] px-4 py-3 text-[12px] font-bold text-[#5A6478]">{t("readOnly")}</p>
          )}

          {keywords.length === 0 ? (
            <div className="mt-4 rounded-[14px] bg-[#FFF3DC] px-5 py-4">
              <p className="text-[15px] font-black text-[#A04606]">{pickL("Nothing is being watched yet", "Belum ada yang dipantau")}</p>
              <p className="text-[12px] font-bold text-[#A04606]/80">{t("empty")}</p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {keywords.map((k) => {
                const run = k.lastRun && k.isActive && run_ok(k.lastRun.status) ? k.lastRun : null;
                return (
                  <li key={k.id} className={cn("flex flex-col rounded-[14px] p-4", k.isActive ? "bg-[#F7F8FC]" : "bg-[#F7F8FC] opacity-60")}>
                    {editing?.id === k.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const value = editing.value.trim();
                          if (value.length >= 2 && value !== k.keyword) updateMutation.mutate({ id: k.id, input: { keyword: value } });
                          else setEditing(null);
                        }}
                      >
                        <input autoFocus value={editing.value} maxLength={100} onChange={(e) => setEditing({ id: k.id, value: e.target.value })} aria-label={t("rename")} className="h-10 min-w-0 flex-1 rounded-[10px] bg-white px-3 text-[14px] font-black text-[#101334] outline-none focus:ring-2 focus:ring-[#465FFF]/40" />
                        <button type="submit" disabled={busy} title={t("save")} className="flex size-10 items-center justify-center rounded-[10px] bg-[#12A66A] text-white"><Check size={15} /></button>
                        <button type="button" onClick={() => setEditing(null)} title={t("cancel")} className="flex size-10 items-center justify-center rounded-[10px] bg-white text-[#5A6478]"><X size={15} /></button>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words text-[18px] font-black leading-tight text-[#101334]">{k.keyword}</p>
                        <KeywordStatus keyword={k} t={t} />
                      </div>
                    )}
                    {/* The last collection in three numbers. */}
                    {run ? (
                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                        {([[pickL("Found", "Ditemukan"), run.fetched ?? 0, "#101334"], [pickL("New", "Baru"), run.inserted ?? 0, "#047857"], [pickL("Duplicates", "Duplikat"), run.deduplicated ?? 0, "#8A93AD"]] as const).map(([label, n, color]) => (
                          <div key={label} className="rounded-[10px] bg-white px-2.5 py-2">
                            <p className="text-[18px] font-black leading-none" style={{ color }}>{n}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#8A93AD]">{label}</p>
                          </div>
                        ))}
                        {(run.fetched ?? 0) === 0 ? <p className="col-span-3 mt-1 rounded-[8px] bg-[#FFF3DC] px-2.5 py-1.5 text-[11px] font-bold text-[#A04606]">{pickL("Nothing found: try a more common name or spelling.", "Tidak ada hasil: coba nama atau ejaan yang lebih umum.")}</p> : null}
                      </div>
                    ) : (
                      <div className="mt-3"><LastRunLine keyword={k} t={t} /></div>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <span className="text-[11px] font-bold text-[#8A93AD]">{k.lastRun ? pickL(`last run ${timeAgo(k.lastRun.at)}`, `terakhir ${timeAgo(k.lastRun.at)}`) : pickL("not run yet", "belum pernah diambil")}</span>
                      {canEdit && editing?.id !== k.id ? (
                        <span className="flex items-center gap-0.5">
                          <button type="button" disabled={busy} onClick={() => updateMutation.mutate({ id: k.id, input: { isActive: !k.isActive } })} title={k.isActive ? t("deactivate") : t("activate")} className={iconBtn}>
                            {k.isActive ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button type="button" disabled={busy} onClick={() => setEditing({ id: k.id, value: k.keyword })} title={t("rename")} className={iconBtn}><Pencil size={14} /></button>
                          <button type="button" disabled={busy} onClick={() => setToDelete(k)} title={t("delete")} className={cn(iconBtn, "hover:bg-[#FDECEC] hover:text-[#C81E1E]")}><Trash2 size={14} /></button>
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && keywords.some((k) => k.isActive) ? <RunMonitoringNow onDone={() => queryClient.invalidateQueries()} /> : null}
        </>
      )}
      </div>

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
  active: "bg-[#12A66A] text-white",
  failing: "bg-[#C81E1E] text-white",
  paused: "bg-[#E3E7F1] text-[#5A6478]",
  awaiting_first_run: "bg-[#EEF1FF] text-[#3B52F5]",
  not_in_rotation: "bg-[#FFF3DC] text-[#A04606]",
};

type T = ReturnType<typeof useTranslations<"Workspace.settings.keywords">>;

const run_ok = (status: string) => status !== "failed" && status !== "deferred";

function KeywordStatus({ keyword, t }: { keyword: MonitoringKeyword; t: T }) {
  const status = keyword.monitoringStatus ?? (!keyword.isActive ? "paused" : keyword.scheduled ? "awaiting_first_run" : "not_in_rotation");
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black", STATUS_STYLE[status])}>
      {t(`status_${status}`)}
    </span>
  );
}

function LastRunLine({ keyword, t }: { keyword: MonitoringKeyword; t: T }) {
  const run = keyword.lastRun;
  if (!run || !keyword.isActive) return null;
  if (run.status === "failed") {
    return <span className="block text-[12px] font-bold text-[#C81E1E]">{t("lastRunFailed", { time: timeAgo(run.at), reason: run.errorCategory || "unknown" })}</span>;
  }
  if (run.status === "deferred") return null;
  return (
    <span className="block text-[12px] font-bold text-[#5A6478]">
      {t("lastRun", { time: timeAgo(run.at), fetched: run.fetched ?? 0, inserted: run.inserted ?? 0, duplicates: run.deduplicated ?? 0 })}
    </span>
  );
}

const RUN_STATUS_TEXT: Record<MonitoringRunResponse["status"], [string, string]> = {
  completed: ["Completed", "Selesai"],
  completed_with_errors: ["Completed with some errors", "Selesai dengan beberapa galat"],
  partial: ["Partially completed: some keywords were not reached in time", "Selesai sebagian: beberapa kata kunci belum sempat diproses"],
  failed: ["Failed", "Gagal"],
  skipped_overlap: ["Skipped: another run was in progress", "Dilewati: ada run lain yang sedang berjalan"],
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
    return { tone: "info", text: pickL("The run is taking longer than expected. It continues on the server; the keyword list below refreshes in a minute with the real result.", "Run ini butuh waktu lebih lama dari perkiraan. Prosesnya tetap berjalan di server; daftar kata kunci di bawah akan diperbarui dalam semenit dengan hasil aslinya.") };
  }
  if (err.status === 429) {
    const at = err.info?.retryAt ? new Date(err.info.retryAt) : null;
    const when = at ? at.toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" }) : "";
    return { tone: "info", text: at ? pickL(`A run for this workspace started less than 10 minutes ago. You can run again at ${when}.`, `Run untuk workspace ini dimulai kurang dari 10 menit lalu. Anda bisa menjalankan lagi pukul ${when}.`) : err.message };
  }
  if (err.status === 400) return { tone: "info", text: pickL("Add or resume at least one keyword before running monitoring.", "Tambahkan atau aktifkan lagi minimal satu kata kunci sebelum menjalankan pemantauan.") };
  if (err.status === 403) return { tone: "error", text: pickL("Only workspace owners and admins can run monitoring.", "Hanya pemilik dan admin workspace yang bisa menjalankan pemantauan.") };
  return { tone: "error", text: err.message || pickL("The monitoring run failed.", "Run pemantauan gagal.") };
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
    <div className="mt-4 rounded-[14px] bg-[#F7F8FC] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-black text-[#101334]">{pickL("Need the latest now?", "Butuh data terbaru sekarang?")}</p>
          <p className="text-[11px] font-semibold text-[#5A6478]">{pickL("Collects the latest public news for up to 3 active keywords (8 articles each) and analyses it. Takes up to 2 minutes; one run per 10 minutes.", "Mengambil berita publik terbaru untuk hingga 3 kata kunci aktif (8 artikel per kata kunci) lalu menganalisisnya. Butuh hingga 2 menit; satu run per 10 menit.")}</p>
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] bg-[#101334] px-4 text-[13px] font-black text-white hover:bg-[#1F2452] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          {mutation.isPending ? pickL("Running…", "Berjalan…") : pickL("Run now", "Jalankan sekarang")}
        </button>
      </div>
      {failure ? (
        <p role={failure.tone === "error" ? "alert" : "status"} className={cn("mt-2 text-[10.5px] font-semibold", failure.tone === "error" ? "text-[#C81E1E]" : "text-[#31406B]")}>{failure.text}</p>
      ) : null}
      {result ? (
        <div className="mt-2 text-[10.5px] font-semibold text-[#31406B]" role="status">
          <p>
            {RUN_STATUS_TEXT[result.status] ? pickL(...RUN_STATUS_TEXT[result.status]) : result.status}{" "}
            {pickL(
              `in ${Math.max(1, Math.round(result.durationMs / 1000))} s: ${result.totals.fetched} articles found, ${result.totals.inserted} new saved, ${result.totals.deduplicated} already saved (skipped), ${result.totals.analyzed} analysed${result.totals.analysisFailed ? `, ${result.totals.analysisFailed} analysis failures` : ""}${result.totals.failedKeywords ? `, ${result.totals.failedKeywords} keyword(s) failed` : ""}.`,
              `dalam ${Math.max(1, Math.round(result.durationMs / 1000))} dtk: ${result.totals.fetched} artikel ditemukan, ${result.totals.inserted} baru disimpan, ${result.totals.deduplicated} sudah tersimpan (dilewati), ${result.totals.analyzed} dianalisis${result.totals.analysisFailed ? `, ${result.totals.analysisFailed} analisis gagal` : ""}${result.totals.failedKeywords ? `, ${result.totals.failedKeywords} kata kunci gagal` : ""}.`,
            )}
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
