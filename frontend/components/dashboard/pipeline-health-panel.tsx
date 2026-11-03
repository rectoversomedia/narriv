"use client";

import { useQuery } from "@tanstack/react-query";
import { getPipelineStatus, timeAgo, type PipelineStatusPayload } from "@/lib/intelligence-api";
import { intlLocale } from "@/store/useUiStore";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Ingestion and analysis health for the current workspace, read from
 * GET /pipeline/status. Every figure is a logged observation; nothing is estimated.
 */
export function PipelineHealthPanel({ className }: { className?: string }) {
  const t = useTranslations("HealthPanels");
  const query = useQuery({ queryKey: ["pipeline-status"], queryFn: getPipelineStatus, staleTime: 60 * 1000, retry: 1 });

  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)} aria-labelledby="pipeline-health-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div>
            <h2 id="pipeline-health-title" className="text-[14px] font-black text-[#101334]">{t("title")}</h2>
            <p className="text-[11px] font-semibold text-[#5F6B94]">{t("desc")}</p>
          </div>
        </div>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DDE3EF] px-3 text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {t("refresh")}
        </button>
      </div>

      {query.isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : query.isError || !query.data ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">{t("loadError")}</p>
      ) : (
        <PipelineHealthBody data={query.data} />
      )}
    </section>
  );
}

function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "warn" | "bad" }) {
  return (
    <div className="rounded-lg border border-[#EEF1F7] bg-[#FBFCFF] p-3" title={hint}>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#647099]">{label}</dt>
      <dd className={cn("mt-1 text-[15px] font-black", tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-700" : "text-[#101334]")}>{value}</dd>
    </div>
  );
}

function PipelineHealthBody({ data }: { data: PipelineStatusPayload }) {
  const t = useTranslations("HealthPanels");
  const health = data.scheduler.health;
  const ws = data.scheduler.lastRunForWorkspace;
  const totals = (ws?.results || []).reduce<{ fetched: number; inserted: number; duplicates: number; failed: number }>(
    (acc, r) => ({ fetched: acc.fetched + (r.fetched || 0), inserted: acc.inserted + (r.inserted || 0), duplicates: acc.duplicates + (r.deduplicated || 0), failed: acc.failed + (r.status === "failed" ? 1 : 0) }),
    { fetched: 0, inserted: 0, duplicates: 0, failed: 0 },
  );
  const failedCategories = [...new Set((ws?.results || []).filter((r) => r.status === "failed").map((r) => r.errorCategory || "unknown"))];
  const missed = health?.missedSlotsLast24h.length ?? 0;
  const pending = data.analysis.unanalyzedRealSignals;

  return (
    <>
      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("lastAttempted")} value={health?.recentRuns[0] ? timeAgo(health.recentRuns[0].at) : t("never")} hint={health?.recentRuns[0] ? `${health.recentRuns[0].status} · ${health.recentRuns[0].trigger ?? t("unknownTrigger")}` : undefined} />
        <Stat label={t("lastSuccessful")} value={timeAgo(data.scheduler.lastSuccessfulIngestionForWorkspace)} />
        <Stat label={t("scheduledRuns")} value={health ? `${health.expectedSlotsLast24h - missed}/${health.expectedSlotsLast24h}` : "—"} hint={t("scheduledRunsHint")} tone={missed ? "warn" : "default"} />
        <Stat label={t("awaiting")} value={pending === null ? "—" : String(pending)} tone={pending ? "warn" : "default"} />
      </dl>
      {ws ? (
        <p className="mt-3 text-[12px] font-semibold text-[#58648C]">
          {t("latestRun", { ago: timeAgo(ws.at), fetched: totals.fetched, inserted: totals.inserted, duplicates: totals.duplicates })}
          {totals.failed ? <span className="text-rose-600">{t("keywordsFailed", { count: totals.failed, categories: failedCategories.join(", ") })}</span> : null}.
        </p>
      ) : (
        <p className="mt-3 text-[12px] font-semibold text-[#58648C]">{t("noRun")}</p>
      )}
      {(data.analysis.analysisFailuresLast7d ?? 0) > 0 ? (
        <p className="mt-1 text-[12px] font-semibold text-amber-700">{t("analysisFailures", { count: data.analysis.analysisFailuresLast7d ?? 0 })}</p>
      ) : null}
      {missed > 0 ? (
        <p className="mt-1 text-[12px] font-semibold text-amber-700">{t("missedSlots", { slots: health!.missedSlotsLast24h.map((iso) => new Date(iso).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" })).join(", ") })}</p>
      ) : null}
      {data.partial ? <p className="mt-1 text-[11px] font-semibold text-[#5A6478]">{t("partial")}</p> : null}
    </>
  );
}
