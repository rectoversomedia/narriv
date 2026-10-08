"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Globe2, AlertCircle, Activity, Database, Building2, Filter, RefreshCcw, ChevronDown } from "lucide-react";
import { DashboardEmptyState, DashboardErrorState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getNarrativeIntelligence,
  getEntityIntelligence,
  getReputationIntelligence,
  getPredictiveSignals,
  getTrend,
  getGeoIntelligence,
  type NarrativeIntelligencePayload,
  type EntityIntelligencePayload,
  type ReputationIntelligencePayload,
  type PredictiveSignalsPayload,
  type GeoIntelligencePayload,
} from "@/lib/intelligence-api";
import { NarrativeLandscapePanel, ReputationPanel, EntityPanel, PredictiveSignalsPanel } from "@/components/intelligence/intelligence-panels";

const WINDOWS = [
  { id: "24h", label: "Last 24h", hours: 24 },
  { id: "7d", label: "Last 7d", hours: 168 },
  { id: "30d", label: "Last 30d", hours: 720 },
];

function TrendMini({ windowHours }: { windowHours: number }) {
  const q = useQuery({
    queryKey: ["insights", "trend", windowHours],
    queryFn: () => getTrend(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
  if (q.isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (q.isError) return <DashboardErrorState title="Trend unavailable" description="Could not load trend." onRetry={() => q.refetch()} />;
  const t = q.data;
  if (!t || t.note) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <Activity size={14} /> Trend
        </div>
        <p className="mt-2 text-[15px] font-medium text-slate-700">Insufficient data</p>
        <p className="mt-1 text-[13px] text-slate-500">Need at least two consecutive time windows to compute a trend.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <Activity size={14} /> Trend
      </div>
      <p className="mt-2 text-[15px] font-semibold text-slate-900 capitalize">{String(t.status || "—").toLowerCase()}</p>
      <div className="mt-2 text-[12px] text-slate-500">
        {t.ratio != null ? <>Ratio {t.ratio.toFixed(2)}x</> : null}
        {t.acceleration != null ? <> · Acceleration {t.acceleration.toFixed(2)}</> : null}
      </div>
    </div>
  );
}

function GeoPanel({ windowHours }: { windowHours: number }) {
  const q = useQuery({
    queryKey: ["insights", "geo", windowHours],
    queryFn: () => getGeoIntelligence(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
  if (q.isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  const data = q.data as GeoIntelligencePayload | undefined;
  if (!data || data.status === "no_data" || data.status === "insufficient_data") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <Globe2 size={14} /> GEO intelligence
        </div>
        <p className="mt-2 text-[15px] font-medium text-slate-700">No GEO data yet</p>
        <p className="mt-1 text-[13px] text-slate-500">Run a GEO check or ingest AI search results to enable this panel.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <Globe2 size={14} /> GEO intelligence
      </div>
      <p className="mt-2 text-[15px] font-semibold text-slate-900">Live data</p>
      <ul className="mt-3 space-y-1 text-[12px] text-slate-600">
        {Object.entries(data.counts || {}).map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span className="text-slate-500">{k}</span>
            <span className="font-semibold text-slate-700">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InsightsPage() {
  const [windowId, setWindowId] = useState<string>("24h");
  const win = WINDOWS.find((w) => w.id === windowId)!;
  const refreshAll = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-screen-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
              <p className="mt-1 text-sm text-slate-500">What is happening around your brand right now. Every panel is grounded in current Narriv data.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={windowId}
                  onChange={(e) => setWindowId(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-[13px] font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  {WINDOWS.map((w) => (
                    <option key={w.id} value={w.id}>{w.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={refreshAll}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCcw size={12} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl space-y-4 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NarrativeLandscapePanel windowHours={win.hours} />
          <ReputationPanel windowHours={win.hours} />
          <EntityPanel windowHours={win.hours} limit={8} />
          <PredictiveSignalsPanel windowHours={win.hours} />
          <TrendMini windowHours={win.hours} />
          <GeoPanel windowHours={win.hours} />
        </div>
      </div>
    </div>
  );
}
