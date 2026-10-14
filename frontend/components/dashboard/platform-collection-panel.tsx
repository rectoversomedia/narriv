"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Radar } from "lucide-react";
import {
  getMonitoringKeywords,
  getPlatformCollections,
  startPlatformCollection,
  syncPlatformCollection,
  type PlatformCollection,
} from "@/lib/api-service";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X / Twitter",
  tiktok: "TikTok",
  instagram: "Instagram",
  threads: "Threads",
  youtube: "YouTube",
  facebook: "Facebook",
  web: "Google Search (web)",
  news: "Indonesian news",
};

const ERROR_TEXT: Record<string, string> = {
  authentication_failed: "Apify rejected the API token",
  billing_or_quota: "the Apify account has no usage left or needs billing",
  actor_not_rented: "this actor must be rented on the Apify account",
  permission_denied: "the Apify token lacks permission",
  actor_not_found: "the actor was not found on Apify",
  rate_limited: "Apify rate limit, try again later",
  provider_unavailable: "Apify is temporarily unavailable",
  timeout: "the actor run hit its time limit",
  actor_run_failed: "the actor run failed on Apify",
  run_not_found: "Apify no longer has this run",
  persist_failed: "the results could not be stored",
  request_failed: "the request to Apify failed",
};

const ACTIVE = new Set(["starting", "running", "persisting"]);

/**
 * Collection history; while a run is active it is checked every 15 seconds,
 * which also stores its results once Apify reports it has finished.
 */
export function usePlatformCollections(enabled = true) {
  return useQuery({
    queryKey: ["platform-collections"],
    queryFn: async () => {
      const list = await getPlatformCollections();
      const active = list.data.filter((r) => ACTIVE.has(r.status)).slice(0, 2);
      if (active.length === 0) return list;
      await Promise.all(active.map((r) => syncPlatformCollection(r.id).catch(() => null)));
      return getPlatformCollections();
    },
    enabled,
    refetchInterval: (query) => (query.state.data?.data.some((r) => ACTIVE.has(r.status)) ? 15000 : false),
  });
}

function describe(run: PlatformCollection): { text: string; tone: "muted" | "ok" | "warn" | "error" } {
  if (ACTIVE.has(run.status)) {
    return { text: run.status === "persisting" ? "Storing and analysing results…" : `Collecting on Apify${run.apifyStatus ? ` (${run.apifyStatus.toLowerCase()})` : ""}…`, tone: "muted" };
  }
  if (run.status === "failed") {
    const reason = run.error?.startsWith("dataset_") ? `results could not be read: ${ERROR_TEXT[run.error.slice(8)] ?? run.error.slice(8)}` : ERROR_TEXT[run.error ?? ""] ?? run.error ?? "unknown error";
    return { text: `Failed: ${reason}.`, tone: "error" };
  }
  if (run.status === "skipped_overlap") return { text: "Not started: another collection was running.", tone: "muted" };
  const t = run.totals;
  if (run.status === "completed_empty" || !t) return { text: "Finished: Apify returned no results for this keyword.", tone: "warn" };
  const parts = [`${t.inserted} new`, `${t.deduplicated} already stored`];
  if (t.invalid) parts.push(`${t.invalid} without usable text`);
  if (t.analysisFailed) parts.push(`${t.analysisFailed} awaiting AI analysis`);
  return { text: `Stored ${parts.join(", ")}.`, tone: run.status === "completed_with_errors" ? "warn" : "ok" };
}

const TONE_CLASS = { muted: "text-[#5A6478]", ok: "text-[#0F7B4F]", warn: "text-[#9A5B00]", error: "text-[#C81E1E]" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

/**
 * Social and web collection through Apify for this workspace's own keywords.
 * A run starts on Apify's side; while it is active this panel checks it every
 * 15 seconds, and the results are stored once Apify reports it has finished.
 */
export function PlatformCollectionPanel() {
  const queryClient = useQueryClient();
  const keywordsQuery = useQuery({ queryKey: ["monitoring-keywords"], queryFn: getMonitoringKeywords, staleTime: 30 * 1000 });
  const canManage = Boolean(keywordsQuery.data?.canEdit);
  const activeKeywords = (keywordsQuery.data?.data ?? []).filter((k) => k.isActive !== false).map((k) => k.keyword);

  const collectionsQuery = usePlatformCollections();

  const [preset, setPreset] = useState("");
  const [keyword, setKeyword] = useState("");
  const data = collectionsQuery.data;
  const presets = data?.presets ?? [];
  const selectedPreset = preset || presets[0]?.key || "";
  const selectedKeyword = keyword && activeKeywords.includes(keyword) ? keyword : activeKeywords[0] || "";
  const start = useMutation({
    mutationFn: () => startPlatformCollection({ preset: selectedPreset, keyword: selectedKeyword || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-collections"] });
    },
  });

  const running = data?.data.some((r) => ACTIVE.has(r.status));

  return (
    <section className="rounded-[14px] border border-[#DDE3EF] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#0B6BCB]"><Radar size={18} strokeWidth={2.3} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-black text-[#101334]">Social and web collection</h3>
          <p className="text-[10px] font-semibold text-[#5F6B94]">
            Collects public posts for one of this workspace&apos;s keywords through Apify. Scheduled monitoring covers Google News only; social platforms are collected when you start a run here.
          </p>
        </div>
      </div>

      {collectionsQuery.isError ? (
        <p className="mt-4 text-[11px] font-semibold text-[#C81E1E]">Collection status could not be loaded.</p>
      ) : !data ? (
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
      ) : (
        <>
          {!data.configured ? (
            <p className="mt-4 text-[11px] font-semibold text-[#9A5B00]">Apify is not configured on the server, so social collection is unavailable.</p>
          ) : canManage ? (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => { e.preventDefault(); start.mutate(); }}
            >
              <label className="text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                Platform
                <select value={selectedPreset} onChange={(e) => setPreset(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[#DDE3EF] bg-white px-2 text-[12px] font-semibold normal-case tracking-normal text-[#31406B]">
                  {presets.map((p) => <option key={p.key} value={p.key}>{PLATFORM_LABEL[p.platform] ?? p.platform}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                Keyword
                <select value={selectedKeyword} onChange={(e) => setKeyword(e.target.value)} disabled={activeKeywords.length === 0} className="mt-1 block h-9 max-w-[220px] rounded-lg border border-[#DDE3EF] bg-white px-2 text-[12px] font-semibold normal-case tracking-normal text-[#31406B]">
                  {activeKeywords.length === 0 ? <option value="">No active keyword</option> : null}
                  {activeKeywords.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <button
                type="submit"
                disabled={start.isPending || running || activeKeywords.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#465FFF] px-3 text-[11px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-60"
              >
                {start.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                Start collection
              </button>
              <p className="basis-full text-[10px] font-semibold text-[#5A6478]">
                Uses your Apify account: up to 20 results per run, capped at $0.25 by Apify, one run at a time, 10 per day. Each stored post is analysed by AI.
              </p>
            </form>
          ) : (
            <p className="mt-4 text-[11px] font-semibold text-[#5A6478]">Owners and admins can start a collection.</p>
          )}

          {start.isError ? (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-[#C81E1E]">
              {start.error instanceof Error ? start.error.message : "The collection could not be started."}
            </p>
          ) : null}

          {data.data.length > 0 ? (
            <ul className="mt-4 divide-y divide-[#EEF1F7] text-[11px] font-semibold" role="status" aria-live="polite">
              {data.data.slice(0, 8).map((run) => {
                const d = describe(run);
                return (
                  <li key={run.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                    <span className="min-w-0 text-[#31406B]">
                      <b>{PLATFORM_LABEL[run.platform] ?? run.platform}</b> · {run.keyword}
                      <span className={`block ${TONE_CLASS[d.tone]}`}>
                        {ACTIVE.has(run.status) ? <Loader2 size={11} className="mr-1 inline animate-spin" aria-hidden="true" /> : null}
                        {d.text}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-[#5A6478]">
                      {when(run.startedAt)}
                      {typeof run.costUsd === "number" ? ` · Apify $${run.costUsd.toFixed(3)}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-[11px] font-semibold text-[#5A6478]">No social or web collection has run for this workspace yet.</p>
          )}
        </>
      )}
    </section>
  );
}
