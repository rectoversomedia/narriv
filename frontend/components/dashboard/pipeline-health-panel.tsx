"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCcw } from "lucide-react";
import { getPipelineStatus, timeAgo, type PipelineStatusPayload } from "@/lib/intelligence-api";
import { cn } from "@/lib/utils";

/**
 * Ingestion and analysis health for the current workspace, read from
 * GET /pipeline/status. Every figure is a logged observation; nothing is estimated.
 */
export function PipelineHealthPanel({ className }: { className?: string }) {
  const query = useQuery({ queryKey: ["pipeline-status"], queryFn: getPipelineStatus, staleTime: 60 * 1000, retry: 1 });

  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)} aria-labelledby="pipeline-health-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]"><Activity size={18} /></span>
          <div>
            <h2 id="pipeline-health-title" className="text-[14px] font-black text-[#101334]">Ingestion &amp; analysis health</h2>
            <p className="text-[11px] font-semibold text-[#68739F]">From the scheduled ingestion log and stored analyses for this workspace.</p>
          </div>
        </div>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DDE3EF] px-3 text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCcw size={12} className={query.isFetching ? "animate-spin" : undefined} /> Refresh
        </button>
      </div>

      {query.isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : query.isError || !query.data ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">Pipeline status could not be loaded. Ingestion may still be running normally.</p>
      ) : (
        <PipelineHealthBody data={query.data} />
      )}
    </section>
  );
}

function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "warn" | "bad" }) {
  return (
    <div className="rounded-lg border border-[#EEF1F7] bg-[#FBFCFF] p-3" title={hint}>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#8A94B8]">{label}</dt>
      <dd className={cn("mt-1 text-[15px] font-black", tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-[#101334]")}>{value}</dd>
    </div>
  );
}

function PipelineHealthBody({ data }: { data: PipelineStatusPayload }) {
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
        <Stat label="Last attempted run" value={health?.recentRuns[0] ? timeAgo(health.recentRuns[0].at) : "never"} hint={health?.recentRuns[0] ? `${health.recentRuns[0].status} · ${health.recentRuns[0].trigger ?? "unknown trigger"}` : undefined} />
        <Stat label="Last successful ingestion" value={timeAgo(data.scheduler.lastSuccessfulIngestionForWorkspace)} />
        <Stat label="Scheduled runs (24h)" value={health ? `${health.expectedSlotsLast24h - missed}/${health.expectedSlotsLast24h}` : "—"} hint={health?.basis} tone={missed ? "warn" : "default"} />
        <Stat label="Awaiting analysis" value={pending === null ? "—" : String(pending)} tone={pending ? "warn" : "default"} />
      </dl>
      {ws ? (
        <p className="mt-3 text-[12px] font-semibold text-[#58648C]">
          Latest run for this workspace ({timeAgo(ws.at)}): <span className="font-black text-[#101334]">{totals.fetched}</span> items found, <span className="font-black text-[#101334]">{totals.inserted}</span> new, <span className="font-black text-[#101334]">{totals.duplicates}</span> duplicates skipped
          {totals.failed ? <span className="text-rose-600"> · {totals.failed} keyword(s) failed ({failedCategories.join(", ")})</span> : null}.
        </p>
      ) : (
        <p className="mt-3 text-[12px] font-semibold text-[#58648C]">No scheduled run has processed this workspace yet. Add an active monitoring keyword in Settings to include it in the next run.</p>
      )}
      {(data.analysis.analysisFailuresLast7d ?? 0) > 0 ? (
        <p className="mt-1 text-[12px] font-semibold text-amber-700">{data.analysis.analysisFailuresLast7d} analysis failure(s) in the last 7 days.</p>
      ) : null}
      {missed > 0 ? (
        <p className="mt-1 text-[12px] font-semibold text-amber-700">Missed scheduled slots: {health!.missedSlotsLast24h.map((iso) => new Date(iso).toISOString().slice(11, 16) + " UTC").join(", ")}.</p>
      ) : null}
      {data.partial ? <p className="mt-1 text-[11px] font-semibold text-slate-500">Some status checks failed; figures may be incomplete.</p> : null}
    </>
  );
}
