"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Clock, AlertCircle, CheckCircle2, ChevronRight, RefreshCcw } from "lucide-react";
import { DashboardEmptyState, DashboardErrorState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { getRecommendations, getExecutiveBrief, type RecommendationsPayload, type ExecutiveBriefPayload } from "@/lib/intelligence-api";
import { cn } from "@/lib/utils";

const PRIORITY_TONE: Record<string, string> = {
  low: "text-slate-700 bg-slate-50 border-slate-200",
  medium: "text-sky-700 bg-sky-50 border-sky-200",
  high: "text-amber-700 bg-amber-50 border-amber-200",
  critical: "text-red-700 bg-red-50 border-red-200",
};

const URGENCY_TONE: Record<string, string> = {
  monitor: "text-slate-600 bg-slate-50 border-slate-200",
  this_week: "text-sky-700 bg-sky-50 border-sky-200",
  today: "text-amber-700 bg-amber-50 border-amber-200",
  immediate: "text-red-700 bg-red-50 border-red-200",
};

export default function ActionCenterPage() {
  const recs = useQuery({
    queryKey: ["action-center", "recs"],
    queryFn: () => getRecommendations(24),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const brief = useQuery({
    queryKey: ["action-center", "brief"],
    queryFn: () => getExecutiveBrief(24),
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (recs.isLoading || brief.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (recs.error) return <DashboardErrorState title="Action Center unavailable" description="Could not load recommendations." onRetry={() => recs.refetch()} />;

  const data = recs.data as RecommendationsPayload | undefined;
  const briefData = brief.data as ExecutiveBriefPayload | undefined;
  const list = data?.recommendations || [];
  const topRec = briefData?.sections?.recommendedActions || [];

  if (list.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Action Center</h1>
          <p className="mt-1 text-sm text-slate-500">Recommended actions based on the latest intelligence. All actions require human approval.</p>
        </div>
        <DashboardEmptyState
          title="No actions needed right now"
          description="Current signals do not warrant any recommendation. This is informative, not a failure."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Action Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recommended actions from the current intelligence window. Every action requires human approval before any external step.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" /> Approval required
          </div>
          <p className="mt-2 text-[13px] text-slate-700">Narriv does not execute external actions. Recommendations are guidance for human review.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <Clock size={14} className="text-sky-600" /> Time horizon
          </div>
          <p className="mt-2 text-[13px] text-slate-700">Window: last 24h. Refreshed every 60s when the tab is active.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <CheckCircle2 size={14} className="text-emerald-600" /> Evidence
          </div>
          <p className="mt-2 text-[13px] text-slate-700">Every recommendation cites the evidence used to derive it.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900">{list.length} recommendation(s)</h2>
          <button type="button" onClick={() => { recs.refetch(); brief.refetch(); }} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900">
            <RefreshCcw size={12} /> Refresh
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {list.map((r, idx) => (
            <li key={`${r.action}-${idx}`} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={14} className="shrink-0 text-slate-400" />
                    <h3 className="text-[14px] font-semibold capitalize text-slate-900">{r.action.replace(/_/g, " ")}</h3>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-600">{r.reason}</p>
                  {r.expectedOutcome ? (
                    <p className="mt-1.5 text-[12px] text-slate-500">
                      <span className="font-semibold">Expected outcome:</span> {r.expectedOutcome}
                    </p>
                  ) : null}
                  {r.evidence && r.evidence.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.evidence.slice(0, 5).map((e, i) => (
                        <span key={`${e}-${i}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">{e}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", PRIORITY_TONE[r.priority] || PRIORITY_TONE.low)}>
                    {r.priority}
                  </span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", URGENCY_TONE[r.urgency] || URGENCY_TONE.monitor)}>
                    {r.urgency}
                  </span>
                  <span className="text-[10.5px] text-slate-500">Confidence {Math.round(r.confidence * 100)}%</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {topRec.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">From executive brief</div>
          <p className="mt-1 text-[13px] text-slate-700">These top actions also appear in your daily brief.</p>
        </div>
      ) : null}
    </div>
  );
}
