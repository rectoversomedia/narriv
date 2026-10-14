"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Radar } from "lucide-react";
import { useTranslations } from "next-intl";
import { intlLocale } from "@/store/useUiStore";
import {
  getMonitoringKeywords,
  getPlatformCollections,
  startPlatformCollection,
  syncPlatformCollection,
  type PlatformCollection,
} from "@/lib/api-service";

const PLATFORMS = ["x", "tiktok", "instagram", "threads", "youtube", "facebook", "web", "news"];
const ERROR_CODES = ["authentication_failed", "billing_or_quota", "actor_not_rented", "permission_denied", "actor_not_found", "rate_limited", "provider_unavailable", "timeout", "actor_run_failed", "run_not_found", "persist_failed", "request_failed"];
type T = ReturnType<typeof useTranslations>;
const platformLabel = (t: T, p: string) => (PLATFORMS.includes(p) ? t(`platform_${p}`) : p);
const errorText = (t: T, code: string) => (ERROR_CODES.includes(code) ? t(`errors.${code}`) : code);

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

function describe(run: PlatformCollection, t: T, te: T): { text: string; tone: "muted" | "ok" | "warn" | "error" } {
  if (ACTIVE.has(run.status)) {
    return { text: run.status === "persisting" ? t("persisting") : t("collecting", { status: run.apifyStatus ? ` (${run.apifyStatus.toLowerCase()})` : "" }), tone: "muted" };
  }
  if (run.status === "failed") {
    const reason = run.error?.startsWith("dataset_") ? t("datasetFailed", { reason: errorText(te, run.error.slice(8)) }) : run.error ? errorText(te, run.error) : te("errors.unknown");
    return { text: t("failed", { reason }), tone: "error" };
  }
  if (run.status === "skipped_overlap") return { text: t("skippedOverlap"), tone: "muted" };
  const tot = run.totals;
  if (run.status === "completed_empty" || !tot) return { text: t("empty"), tone: "warn" };
  const parts = [t("partNew", { count: tot.inserted }), t("partDuplicate", { count: tot.deduplicated })];
  if (tot.invalid) parts.push(t("partInvalid", { count: tot.invalid }));
  if (tot.analysisFailed) parts.push(t("partAwaiting", { count: tot.analysisFailed }));
  return { text: t("stored", { parts: parts.join(", ") }), tone: run.status === "completed_with_errors" ? "warn" : "ok" };
}

const TONE_CLASS = { muted: "text-[#5A6478]", ok: "text-[#0F7B4F]", warn: "text-[#9A5B00]", error: "text-[#C81E1E]" };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(intlLocale(), { dateStyle: "medium", timeStyle: "short" }) : "");

/**
 * Social and web collection through Apify for this workspace's own keywords.
 * A run starts on Apify's side; while it is active this panel checks it every
 * 15 seconds, and the results are stored once Apify reports it has finished.
 */
export function PlatformCollectionPanel() {
  const t = useTranslations("Collection");
  const te = useTranslations("Sources");
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
          <h3 className="text-[13.5px] font-black text-[#101334]">{t("title")}</h3>
          <p className="text-[10px] font-semibold text-[#5F6B94]">
            {t("desc")}
          </p>
        </div>
      </div>

      {collectionsQuery.isError ? (
        <p className="mt-4 text-[11px] font-semibold text-[#C81E1E]">{t("loadFailed")}</p>
      ) : !data ? (
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
      ) : (
        <>
          {!data.configured ? (
            <p className="mt-4 text-[11px] font-semibold text-[#9A5B00]">{t("notConfigured")}</p>
          ) : canManage ? (
            <form
              className="mt-4 flex flex-wrap items-end gap-2"
              onSubmit={(e) => { e.preventDefault(); start.mutate(); }}
            >
              <label className="text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                {t("platform")}
                <select value={selectedPreset} onChange={(e) => setPreset(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[#DDE3EF] bg-white px-2 text-[12px] font-semibold normal-case tracking-normal text-[#31406B]">
                  {presets.map((p) => <option key={p.key} value={p.key}>{platformLabel(t, p.platform)}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">
                {t("keyword")}
                <select value={selectedKeyword} onChange={(e) => setKeyword(e.target.value)} disabled={activeKeywords.length === 0} className="mt-1 block h-9 max-w-[220px] rounded-lg border border-[#DDE3EF] bg-white px-2 text-[12px] font-semibold normal-case tracking-normal text-[#31406B]">
                  {activeKeywords.length === 0 ? <option value="">{t("noKeyword")}</option> : null}
                  {activeKeywords.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <button
                type="submit"
                disabled={start.isPending || running || activeKeywords.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#465FFF] px-3 text-[11px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-60"
              >
                {start.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                {t("start")}
              </button>
              <p className="basis-full text-[10px] font-semibold text-[#5A6478]">
                {t("costNote")}
              </p>
            </form>
          ) : (
            <p className="mt-4 text-[11px] font-semibold text-[#5A6478]">{t("ownersOnly")}</p>
          )}

          {start.isError ? (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-[#C81E1E]">
              {start.error instanceof Error ? start.error.message : t("startFailed")}
            </p>
          ) : null}

          {data.data.length > 0 ? (
            <ul className="mt-4 divide-y divide-[#EEF1F7] text-[11px] font-semibold" role="status" aria-live="polite">
              {data.data.slice(0, 8).map((run) => {
                const d = describe(run, t, te);
                return (
                  <li key={run.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                    <span className="min-w-0 text-[#31406B]">
                      <b>{platformLabel(t, run.platform)}</b> · {run.keyword}
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
            <p className="mt-4 text-[11px] font-semibold text-[#5A6478]">{t("none")}</p>
          )}
        </>
      )}
    </section>
  );
}
