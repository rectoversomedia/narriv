"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  cn,
} from "@/lib/utils";
import {
  getExecutiveBrief,
  getNarrativeIntelligence,
  getReputationIntelligence,
  getRecommendations,
  getEntityIntelligence,
  getPredictiveSignals,
  type ExecutiveBriefPayload,
  type NarrativeIntelligencePayload,
  type ReputationIntelligencePayload,
  type RecommendationsPayload,
  type IntelligenceRecommendation,
  type RiskModelExplanation,
} from "@/lib/intelligence-api";
import { Skeleton } from "@/components/ui/Skeleton";

const RISK_LABEL: Record<string, { label: string; tone: string }> = {
  low: { label: "Low", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  medium: { label: "Moderate", tone: "text-amber-700 bg-amber-50 border-amber-200" },
  high: { label: "Elevated", tone: "text-rose-700 bg-rose-50 border-rose-200" },
  critical: { label: "Critical", tone: "text-red-700 bg-red-50 border-red-200" },
};

const REP_LABEL: Record<string, { label: string; tone: string }> = {
  strong: { label: "Strong", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  stable: { label: "Stable", tone: "text-sky-700 bg-sky-50 border-sky-200" },
  at_risk: { label: "At risk", tone: "text-amber-700 bg-amber-50 border-amber-200" },
  critical: { label: "Critical", tone: "text-red-700 bg-red-50 border-red-200" },
  neutral: { label: "Neutral", tone: "text-slate-600 bg-slate-50 border-slate-200" },
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", tone)}>
      {children}
    </span>
  );
}

function InsufficientData({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-[15px] font-medium text-slate-700">Insufficient data</div>
      <p className="mt-1 text-[13px] text-slate-500">
        Narriv does not have enough signals in the current window to compute this. Once data arrives, this section updates automatically.
      </p>
    </div>
  );
}

function useBrief(windowHours: number) {
  return useQuery({
    queryKey: ["intelligence", "brief", windowHours],
    queryFn: () => getExecutiveBrief(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

function useNarrative(windowHours: number) {
  return useQuery({
    queryKey: ["intelligence", "narrative", windowHours],
    queryFn: () => getNarrativeIntelligence(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

function useReputation(windowHours: number) {
  return useQuery({
    queryKey: ["intelligence", "reputation", windowHours],
    queryFn: () => getReputationIntelligence(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

function useRecommendations(windowHours: number) {
  return useQuery({
    queryKey: ["intelligence", "recommendations", windowHours],
    queryFn: () => getRecommendations(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function TodaysIntelligenceStrip({ windowHours = 24 }: { windowHours?: number }) {
  const brief = useBrief(windowHours);
  const narrative = useNarrative(windowHours);
  const reputation = useReputation(windowHours);
  const recs = useRecommendations(windowHours);

  const loading = brief.isLoading || narrative.isLoading || reputation.isLoading || recs.isLoading;
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const riskBand = (narrative.data?.riskBand as string) || "low";
  const riskScore = narrative.data?.riskScore ?? 0;
  const riskPill = RISK_LABEL[riskBand] || RISK_LABEL.low;

  const repBand = (reputation.data?.reputationBand as string) || "neutral";
  const repPill = REP_LABEL[repBand] || REP_LABEL.neutral;
  const repScore = reputation.data?.reputationScore ?? 50;

  const grounded = brief.data?.grounded;
  const whatChanged = brief.data?.sections?.whatChanged?.summary;

  const recsList = (recs.data?.recommendations || []) as IntelligenceRecommendation[];
  const topRec = recsList[0];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Risk score</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none text-slate-900">{riskScore}</span>
          <span className="text-[12px] text-slate-500">/100</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone={riskPill.tone}>{riskPill.label}</Pill>
          {narrative.data?.riskModel ? (
            <span className="text-[11px] text-slate-500">{narrative.data.riskModel.uncertainty.level} uncertainty</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reputation</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none text-slate-900">{repScore}</span>
          <span className="text-[12px] text-slate-500">/100</span>
        </div>
        <div className="mt-2">
          <Pill tone={repPill.tone}>{repPill.label}</Pill>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">What changed</div>
        <p className="mt-1.5 text-[13px] leading-snug text-slate-700 line-clamp-3">
          {whatChanged || (grounded === false ? "Insufficient data" : "No changes detected in this window.")}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Top recommendation</div>
        {topRec ? (
          <>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-slate-900">{topRec.action.replace(/_/g, " ")}</p>
            <p className="mt-1 text-[12px] leading-snug text-slate-600 line-clamp-2">{topRec.reason}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{topRec.priority}</Pill>
              <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{topRec.urgency}</Pill>
            </div>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-slate-500">No actions needed right now.</p>
        )}
      </div>
    </div>
  );
}

export function NarrativeLandscapePanel({ windowHours = 168 }: { windowHours?: number }) {
  const narrative = useNarrative(windowHours);
  if (narrative.isLoading) return <Skeleton className="h-[180px] w-full rounded-xl" />;
  if (!narrative.data) return <InsufficientData label="Narrative intelligence" />;
  if (narrative.data.status === "insufficient_data" || (narrative.data.facts.find((f) => f.kind === "signal_count_window")?.value as number) === 0) {
    return <InsufficientData label="Narrative intelligence" />;
  }
  const emerging = narrative.data.inferences.find((i) => i.kind === "emerging_narratives");
  const items = (emerging?.items || []) as Array<{ clusterId: string; title: string; momentum: number; signalCount: number }>;
  const volumeRatio = narrative.data.inferences.find((i) => i.kind === "volume_ratio");
  const negShare = narrative.data.inferences.find((i) => i.kind === "negative_sentiment_share");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Narrative intelligence</div>
          <div className="mt-0.5 text-[15px] font-semibold text-slate-900">Last {narrative.data.windowHours}h</div>
        </div>
        <Pill tone={RISK_LABEL[narrative.data.riskBand]?.tone || ""}>{RISK_LABEL[narrative.data.riskBand]?.label || "—"}</Pill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <div className="text-slate-500">Volume</div>
          <div className="font-semibold text-slate-800">
            {volumeRatio?.label || "Stable"}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Negative share</div>
          <div className="font-semibold text-slate-800">
            {negShare ? `${Math.round((negShare.value as number) * 100)}%` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Emerging narratives</div>
        {items.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-slate-500">No emerging narratives detected.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {items.slice(0, 4).map((it) => (
              <li key={it.clusterId} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-[13px]">
                <span className="truncate text-slate-800">{it.title}</span>
                <span className="ml-3 shrink-0 text-[11px] font-semibold text-slate-500">velocity {Math.round(it.momentum)}/100</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {narrative.data.riskModel ? <RiskExplanation model={narrative.data.riskModel} score={narrative.data.riskScore} /> : null}
    </div>
  );
}

const COMPONENT_LABEL: Record<string, string> = {
  negative_share: "Negative sentiment",
  severity: "Issue severity",
  volume_change: "Volume change",
  active_alerts: "Unresolved alerts",
  narrative_momentum: "Narrative momentum",
};

/** Explains the risk index: contributing components, their evidence and the uncertainty. */
function RiskExplanation({ model, score }: { model: RiskModelExplanation; score: number }) {
  const drivers = model.components.filter((c) => c.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Why this score ({score}/100)</div>
        <span className="text-[11px] text-slate-400">{model.version} · heuristic index, not a probability</span>
      </div>
      {drivers.length === 0 ? (
        <p className="mt-1.5 text-[13px] text-slate-500">No risk component is elevated in this window.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {drivers.map((c) => (
            <li key={c.key} className="text-[12px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{COMPONENT_LABEL[c.key] || c.key}</span>
                <span className="font-semibold tabular-nums text-slate-600">+{c.contribution}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-[#465FFF]" style={{ width: `${Math.min(100, c.contribution * (100 / Math.max(1, c.weight * 100)))}%` }} />
              </div>
              <p className="mt-1 text-slate-600">{c.reason}</p>
              {c.evidenceIds.length > 0 ? (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Evidence: {c.key === "active_alerts"
                    ? c.evidenceIds.map((id, i) => (
                        <span key={id}>{i > 0 ? ", " : ""}<Link href={`/alerts/${id}`} className="font-semibold text-[#465FFF] hover:underline">alert {id.slice(0, 8)}</Link></span>
                      ))
                    : `${c.evidenceIds.length} ${c.key === "narrative_momentum" ? "cluster" : "signal"} record(s) · ${c.evidenceIds.slice(0, 3).map((id) => id.slice(0, 8)).join(", ")}${c.evidenceIds.length > 3 ? "…" : ""}`}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {model.uncertainty.reasons.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <span className="font-semibold">{model.uncertainty.level} uncertainty:</span> {model.uncertainty.reasons.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

export function ReputationPanel({ windowHours = 24 }: { windowHours?: number }) {
  const reputation = useReputation(windowHours);
  if (reputation.isLoading) return <Skeleton className="h-[140px] w-full rounded-xl" />;
  if (!reputation.data) return <InsufficientData label="Reputation" />;
  const r = reputation.data;
  if (r.note) return <InsufficientData label="Reputation" />;
  const sent = (r.facts.find((f) => f.kind === "sentiment_breakdown")?.value || {}) as Record<string, number>;
  const total = Object.values(sent).reduce((a, b) => a + b, 0) || 1;
  const neg = Math.round(((sent.NEGATIVE || 0) / total) * 100);
  const pos = Math.round(((sent.POSITIVE || 0) / total) * 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Reputation</div>
          <div className="mt-0.5 text-[15px] font-semibold text-slate-900">Last {r.windowHours}h</div>
        </div>
        <Pill tone={REP_LABEL[r.reputationBand]?.tone || ""}>{REP_LABEL[r.reputationBand]?.label || "—"}</Pill>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[32px] font-bold leading-none text-slate-900">{r.reputationScore}</span>
        <span className="text-[12px] text-slate-500">/100</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full">
          <div className="bg-emerald-500" style={{ width: `${pos}%` }} />
          <div className="bg-rose-500" style={{ width: `${neg}%` }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[12px]">
        <span className="text-emerald-700">{pos}% positive</span>
        <span className="text-rose-700">{neg}% negative</span>
        <span className="text-slate-500">{100 - pos - neg}% neutral/mixed</span>
      </div>
    </div>
  );
}

export function EntityPanel({ windowHours = 168, limit = 5 }: { windowHours?: number; limit?: number }) {
  const ent = useQuery({
    queryKey: ["intelligence", "entity", windowHours],
    queryFn: () => getEntityIntelligence(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
  if (ent.isLoading) return <Skeleton className="h-[160px] w-full rounded-xl" />;
  const data = ent.data;
  if (!data || data.entities.length === 0) return <InsufficientData label="Entity intelligence" />;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Entity intelligence</div>
      <div className="mt-0.5 text-[15px] font-semibold text-slate-900">Last {windowHours}h</div>
      <ul className="mt-3 space-y-1.5">
        {data.entities.slice(0, limit).map((e) => (
          <li key={e.entity} className="flex items-center justify-between text-[13px]">
            <a
              href={`/signals?keyword=${encodeURIComponent(e.entity)}`}
              className="truncate text-slate-800 transition hover:text-slate-900 hover:underline"
              title={`View signals mentioning ${e.entity}`}
            >
              {e.entity}
            </a>
            <span className="ml-3 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span>{e.mentions} mentions</span>
              {e.avgSentiment < 0 ? <span className="text-rose-600">neg</span> : e.avgSentiment > 0 ? <span className="text-emerald-600">pos</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <a
        href={`/signals?keyword=${encodeURIComponent(data.entities[0].entity)}`}
        className="mt-3 inline-block text-[12px] font-semibold text-slate-600 hover:text-slate-900"
      >
        View top entity in signals →
      </a>
    </div>
  );
}

export function PredictiveSignalsPanel({ windowHours = 24 }: { windowHours?: number }) {
  const pred = useQuery({
    queryKey: ["intelligence", "predictive", windowHours],
    queryFn: () => getPredictiveSignals(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
  if (pred.isLoading) return <Skeleton className="h-[140px] w-full rounded-xl" />;
  const data = pred.data;
  const signals = data?.signals || [];
  if (signals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Predictive signals</div>
        <p className="mt-1.5 text-[15px] font-medium text-slate-700">No signals detected</p>
        <p className="mt-1 text-[13px] text-slate-500">Current signals are not strong enough to produce a prediction. This is informative, not a failure.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Predictive signals</div>
      <p className="mt-1 text-[12px] text-slate-500">Heuristic forecasts. Not scientific predictions.</p>
      <ul className="mt-3 space-y-2">
        {signals.slice(0, 4).map((s, idx) => (
          <li key={`${s.signal}-${idx}`} className="rounded-md border border-slate-100 bg-slate-50/60 p-3 text-[13px]">
            <div className="font-semibold text-slate-800">{s.label}</div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
              <span>Confidence {Math.round(s.confidence * 100)}%</span>
              <span>Timeframe: {s.timeframe}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecommendedActionsPanel({ windowHours = 24, limit = 5 }: { windowHours?: number; limit?: number }) {
  const recs = useRecommendations(windowHours);
  if (recs.isLoading) return <Skeleton className="h-[160px] w-full rounded-xl" />;
  const list = (recs.data?.recommendations || []) as IntelligenceRecommendation[];
  if (list.length === 0) {
    return <InsufficientData label="Recommended actions" />;
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Recommended actions</div>
        <span className="text-[11px] text-slate-500">All actions require human approval</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {list.slice(0, limit).map((r, idx) => (
          <li key={`${r.action}-${idx}`} className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-900">{r.action.replace(/_/g, " ")}</span>
              <span className="flex items-center gap-1.5">
                <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{r.priority}</Pill>
                <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{r.urgency}</Pill>
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-600">{r.reason}</p>
            {r.observedIssue ? <p className="mt-1 text-[12px] text-slate-500">Observed: {r.observedIssue}</p> : null}
            {r.expectedOutcome ? (
              <p className="mt-1 text-[12px] text-slate-500">Expected: {r.expectedOutcome}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>Confidence {Math.round((r.confidence ?? 0) * 100)}%</span>
              {r.sourceIds ? <span>{r.sourceIds.length ? `Based on ${r.sourceIds.length} source record(s)` : "Based on aggregate metrics only"}</span> : null}
              {r.status === "suggested" ? <span>Suggested · not acted on</span> : null}
            </div>
            {r.limitations?.length ? <p className="mt-1 text-[11px] text-amber-700">{r.limitations[0]}</p> : null}
            {r.monitorNext ? <p className="mt-1 text-[11px] text-slate-500">Watch next: {r.monitorNext}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
