"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  type IntelligenceRecommendation,
  type RiskModelExplanation,
} from "@/lib/intelligence-api";
import { Skeleton } from "@/components/ui/Skeleton";

// Pill tones per band; the labels come from the IntelPanels.risk / IntelPanels.rep messages.
const RISK_TONE: Record<string, string> = {
  low: "text-emerald-700 bg-emerald-50 border-transparent",
  medium: "text-amber-700 bg-amber-50 border-transparent",
  high: "text-rose-700 bg-rose-50 border-transparent",
  critical: "text-red-700 bg-red-50 border-transparent",
};

const REP_TONE: Record<string, string> = {
  strong: "text-emerald-700 bg-emerald-50 border-transparent",
  stable: "text-sky-700 bg-sky-50 border-transparent",
  at_risk: "text-amber-700 bg-amber-50 border-transparent",
  critical: "text-red-700 bg-red-50 border-transparent",
  neutral: "text-slate-600 bg-slate-50 border-slate-200",
  insufficient_data: "text-[#5A6478] bg-white border-dashed border-slate-300",
};

const COMPONENT_KEYS = new Set(["negative_share", "severity", "volume_change", "active_alerts", "narrative_momentum"]);
const ACTION_KEYS = new Set(["monitor", "investigate", "escalate", "prepare_response", "prepare_clarification", "prepare_statement", "brief_spokesperson", "engage_media", "prepare_social", "adjust_campaign", "monitor_competitor", "escalate_internal"]);
const LEVEL_KEYS = new Set(["critical", "high", "medium", "low"]);
const URGENCY_KEYS = new Set(["immediate", "today", "this_week", "monitor"]);

// Backend codes → UI language (unknown codes fall back to a readable form of the code).
export function useCodeLabels() {
  const t = useTranslations("IntelPanels");
  return {
    action: (code: string) => (ACTION_KEYS.has(code) ? t(`action.${code}`) : code.replace(/_/g, " ")),
    level: (code: string) => (LEVEL_KEYS.has(code) ? t(`level.${code}`) : code),
    urgency: (code: string) => (URGENCY_KEYS.has(code) ? t(`urgencyCode.${code}`) : code.replace(/_/g, " ")),
    uncertainty: (code: string) => (LEVEL_KEYS.has(code) ? t(`uncertaintyCode.${code}`) : code),
  };
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", tone)}>
      {children}
    </span>
  );
}

function InsufficientData({ label }: { label: string }) {
  const t = useTranslations("IntelPanels");
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{label}</div>
      <div className="mt-1.5 text-[15px] font-medium text-slate-700">{t("insufficientTitle")}</div>
      <p className="mt-1 text-[13px] text-[#5A6478]">{t("insufficientDesc")}</p>
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
  const t = useTranslations("IntelPanels");
  const code = useCodeLabels();
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
  // null = not computed (insufficient data), shown as "—", never as 0.
  const riskScore = typeof narrative.data?.riskScore === "number" ? narrative.data.riskScore : null;
  const riskKey = RISK_TONE[riskBand] ? riskBand : "low";

  const repBand = (reputation.data?.reputationBand as string) || "neutral";
  const repKey = REP_TONE[repBand] ? repBand : "neutral";
  const repScore = typeof reputation.data?.reputationScore === "number" ? reputation.data.reputationScore : null;

  const grounded = brief.data?.grounded;
  const whatChanged = brief.data?.sections?.whatChanged?.summary;

  const recsList = (recs.data?.recommendations || []) as IntelligenceRecommendation[];
  const topRec = recsList[0];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("riskScore")}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-[#5A6478]">{t("riskScoreDesc", { hours: windowHours })}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none text-slate-900">{riskScore ?? "—"}</span>
          {riskScore !== null ? <span className="text-[12px] text-[#5A6478]">/100</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {riskScore !== null ? <Pill tone={RISK_TONE[riskKey]}>{t(`risk.${riskKey}`)}</Pill> : <span className="text-[11px] text-[#5A6478]">{t("notEnoughData")}</span>}
          {riskScore !== null && narrative.data?.riskModel ? (
            <span className="text-[11px] text-[#5A6478]">{t("uncertainty", { level: code.uncertainty(narrative.data.riskModel.uncertainty.level) })}</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("reputation")}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-[#5A6478]">{t("reputationDesc")}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none text-slate-900">{repScore ?? "—"}</span>
          {repScore !== null ? <span className="text-[12px] text-[#5A6478]">/100</span> : null}
        </div>
        <div className="mt-2">
          {repScore !== null ? <Pill tone={REP_TONE[repKey]}>{t(`rep.${repKey}`)}</Pill> : <span className="text-[11px] text-[#5A6478]">{t("notEnoughData")}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("whatChanged")}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-[#5A6478]">{t("whatChangedDesc", { hours: windowHours })}</p>
        <p className="mt-2 text-[13px] leading-snug text-slate-700 line-clamp-3">
          {whatChanged || (grounded === false ? t("insufficientTitle") : t("noChanges"))}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("topRec")}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-[#5A6478]">{t("topRecDesc")}</p>
        {topRec ? (
          <>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-slate-900 first-letter:uppercase">{code.action(topRec.action)}</p>
            <p className="mt-1 text-[12px] leading-snug text-slate-600 line-clamp-2">{topRec.reason}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{t("priority", { value: code.level(topRec.priority) })}</Pill>
              <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{t("urgency", { value: code.urgency(topRec.urgency) })}</Pill>
            </div>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-[#5A6478]">{t("noActions")}</p>
        )}
      </div>
    </div>
  );
}

export function NarrativeLandscapePanel({ windowHours = 168 }: { windowHours?: number }) {
  const t = useTranslations("IntelPanels");
  const narrative = useNarrative(windowHours);
  if (narrative.isLoading) return <Skeleton className="h-[180px] w-full rounded-xl" />;
  if (!narrative.data) return <InsufficientData label={t("narrativeIntel")} />;
  if (narrative.data.status === "insufficient_data" || (narrative.data.facts.find((f) => f.kind === "signal_count_window")?.value as number) === 0) {
    return <InsufficientData label={t("narrativeIntel")} />;
  }
  const emerging = narrative.data.inferences.find((i) => i.kind === "emerging_narratives");
  const items = (emerging?.items || []) as Array<{ clusterId: string; title: string; momentum: number; signalCount: number }>;
  const volumeRatio = narrative.data.inferences.find((i) => i.kind === "volume_ratio");
  const negShare = narrative.data.inferences.find((i) => i.kind === "negative_sentiment_share");
  const band = narrative.data.riskBand;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("narrativeIntel")}</div>
          <div className="mt-0.5 text-[15px] font-semibold text-slate-900">{t("lastHours", { hours: narrative.data.windowHours })}</div>
        </div>
        <Pill tone={RISK_TONE[band] || ""}>{RISK_TONE[band] ? t(`risk.${band}`) : "—"}</Pill>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <div className="text-[#5A6478]">{t("volume")}</div>
          <div className="font-semibold text-slate-800">
            {volumeRatio?.label || t("stable")}
          </div>
        </div>
        <div>
          <div className="text-[#5A6478]">{t("negativeShare")}</div>
          <div className="font-semibold text-slate-800">
            {negShare ? `${Math.round((negShare.value as number) * 100)}%` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-[#5A6478]">{t("emerging")}</div>
        {items.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-[#5A6478]">{t("noEmerging")}</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {items.slice(0, 4).map((it) => (
              <li key={it.clusterId} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-[13px]">
                <span className="truncate text-slate-800">{it.title}</span>
                <span className="ml-3 shrink-0 text-[11px] font-semibold text-[#5A6478]">{t("velocity", { value: Math.round(it.momentum) })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {narrative.data.riskModel ? <RiskExplanation model={narrative.data.riskModel} score={narrative.data.riskScore} /> : null}
    </div>
  );
}

/** Explains the risk index: contributing components, their evidence and the uncertainty. */
function RiskExplanation({ model, score }: { model: RiskModelExplanation; score: number }) {
  const t = useTranslations("IntelPanels");
  const code = useCodeLabels();
  const drivers = model.components.filter((c) => c.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-[#5A6478]">{t("whyScore", { score })}</div>
        <span className="text-[11px] text-[#5A6478]">{t("heuristic", { version: model.version })}</span>
      </div>
      {drivers.length === 0 ? (
        <p className="mt-1.5 text-[13px] text-[#5A6478]">{t("noComponent")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {drivers.map((c) => (
            <li key={c.key} className="text-[12px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{COMPONENT_KEYS.has(c.key) ? t(`component.${c.key}`) : c.key}</span>
                <span className="font-semibold tabular-nums text-slate-600">+{c.contribution}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-[#465FFF]" style={{ width: `${Math.min(100, c.contribution * (100 / Math.max(1, c.weight * 100)))}%` }} />
              </div>
              <p className="mt-1 text-slate-600">{c.reason}</p>
              {c.evidenceIds.length > 0 ? (
                <p className="mt-0.5 text-[11px] text-[#5A6478]">
                  {t("evidence")} {c.key === "active_alerts"
                    ? c.evidenceIds.map((id, i) => (
                        <span key={id}>{i > 0 ? ", " : ""}<Link href={`/alerts/${id}`} className="font-semibold text-[#3B52F5] hover:underline">{t("alertRef", { id: id.slice(0, 8) })}</Link></span>
                      ))
                    : `${t(c.key === "narrative_momentum" ? "recordsCluster" : "recordsSignal", { count: c.evidenceIds.length })} · ${c.evidenceIds.slice(0, 3).map((id) => id.slice(0, 8)).join(", ")}${c.evidenceIds.length > 3 ? "…" : ""}`}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {model.uncertainty.reasons.length > 0 ? (
        <div className="mt-3 rounded-md border border-transparent bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <span className="font-semibold">{t("uncertaintyLevel", { level: code.uncertainty(model.uncertainty.level) })}</span> {model.uncertainty.reasons.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

export function ReputationPanel({ windowHours = 24 }: { windowHours?: number }) {
  const t = useTranslations("IntelPanels");
  const reputation = useReputation(windowHours);
  if (reputation.isLoading) return <Skeleton className="h-[140px] w-full rounded-xl" />;
  if (!reputation.data) return <InsufficientData label={t("reputation")} />;
  const r = reputation.data;
  if (r.note) return <InsufficientData label={t("reputation")} />;
  const sent = (r.facts.find((f) => f.kind === "sentiment_breakdown")?.value || {}) as Record<string, number>;
  const total = Object.values(sent).reduce((a, b) => a + b, 0) || 1;
  const neg = Math.round(((sent.NEGATIVE || 0) / total) * 100);
  const pos = Math.round(((sent.POSITIVE || 0) / total) * 100);
  const band = r.reputationBand;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("reputation")}</div>
          <div className="mt-0.5 text-[15px] font-semibold text-slate-900">{t("lastHours", { hours: r.windowHours })}</div>
        </div>
        <Pill tone={REP_TONE[band] || ""}>{REP_TONE[band] ? t(`rep.${band}`) : "—"}</Pill>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[32px] font-bold leading-none text-slate-900">{r.reputationScore}</span>
        <span className="text-[12px] text-[#5A6478]">/100</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full">
          <div className="bg-emerald-500" style={{ width: `${pos}%` }} />
          <div className="bg-rose-500" style={{ width: `${neg}%` }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[12px]">
        <span className="text-emerald-700">{t("positive", { value: pos })}</span>
        <span className="text-rose-700">{t("negative", { value: neg })}</span>
        <span className="text-[#5A6478]">{t("neutralMixed", { value: 100 - pos - neg })}</span>
      </div>
    </div>
  );
}

export function EntityPanel({ windowHours = 168, limit = 5 }: { windowHours?: number; limit?: number }) {
  const t = useTranslations("IntelPanels");
  const ent = useQuery({
    queryKey: ["intelligence", "entity", windowHours],
    queryFn: () => getEntityIntelligence(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });
  if (ent.isLoading) return <Skeleton className="h-[160px] w-full rounded-xl" />;
  const data = ent.data;
  if (!data || data.entities.length === 0) return <InsufficientData label={t("entityIntel")} />;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("entityIntel")}</div>
      <div className="mt-0.5 text-[15px] font-semibold text-slate-900">{t("lastHours", { hours: windowHours })}</div>
      <ul className="mt-3 space-y-1.5">
        {data.entities.slice(0, limit).map((e) => (
          <li key={e.entity} className="flex items-center justify-between text-[13px]">
            <a
              href={`/signals?keyword=${encodeURIComponent(e.entity)}`}
              className="truncate text-slate-800 transition hover:text-slate-900 hover:underline"
              title={t("viewSignalsFor", { entity: e.entity })}
            >
              {e.entity}
            </a>
            <span className="ml-3 flex items-center gap-2 text-[11px] font-semibold text-[#5A6478]">
              <span>{t("mentions", { count: e.mentions })}</span>
              {e.avgSentiment < 0 ? <span className="text-rose-600">{t("neg")}</span> : e.avgSentiment > 0 ? <span className="text-emerald-700">{t("pos")}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <a
        href={`/signals?keyword=${encodeURIComponent(data.entities[0].entity)}`}
        className="mt-3 inline-block text-[12px] font-semibold text-slate-600 hover:text-slate-900"
      >
        {t("viewTopEntity")}
      </a>
    </div>
  );
}

export function PredictiveSignalsPanel({ windowHours = 24 }: { windowHours?: number }) {
  const t = useTranslations("IntelPanels");
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("predictive")}</div>
        <p className="mt-1.5 text-[15px] font-medium text-slate-700">{t("noPredictiveTitle")}</p>
        <p className="mt-1 text-[13px] text-[#5A6478]">{t("noPredictiveDesc")}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("predictive")}</div>
      <p className="mt-1 text-[12px] text-[#5A6478]">{t("heuristicForecast")}</p>
      <ul className="mt-3 space-y-2">
        {signals.slice(0, 4).map((s, idx) => (
          <li key={`${s.signal}-${idx}`} className="rounded-md border border-slate-100 bg-slate-50/60 p-3 text-[13px]">
            <div className="font-semibold text-slate-800">{s.label}</div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-[#5A6478]">
              <span>{t("confidence", { value: Math.round(s.confidence * 100) })}</span>
              <span>{t("timeframe", { value: s.timeframe })}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecommendedActionsPanel({ windowHours = 24, limit = 5 }: { windowHours?: number; limit?: number }) {
  const t = useTranslations("IntelPanels");
  const code = useCodeLabels();
  const recs = useRecommendations(windowHours);
  if (recs.isLoading) return <Skeleton className="h-[160px] w-full rounded-xl" />;
  const list = (recs.data?.recommendations || []) as IntelligenceRecommendation[];
  if (list.length === 0) {
    return <InsufficientData label={t("recommended")} />;
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6478]">{t("recommended")}</div>
        <span className="text-[11px] text-[#5A6478]">{t("humanApproval")}</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {list.slice(0, limit).map((r, idx) => (
          <li key={`${r.action}-${idx}`} className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-900 first-letter:uppercase">{code.action(r.action)}</span>
              <span className="flex items-center gap-1.5">
                <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{code.level(r.priority)}</Pill>
                <Pill tone="text-slate-700 bg-slate-50 border-slate-200">{code.urgency(r.urgency)}</Pill>
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-600">{r.reason}</p>
            {r.observedIssue ? <p className="mt-1 text-[12px] text-[#5A6478]">{t("observed", { value: r.observedIssue })}</p> : null}
            {r.expectedOutcome ? (
              <p className="mt-1 text-[12px] text-[#5A6478]">{t("expected", { value: r.expectedOutcome })}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#5A6478]">
              <span>{t("confidence", { value: Math.round((r.confidence ?? 0) * 100) })}</span>
              {r.sourceIds ? <span>{r.sourceIds.length ? t("basedOnRecords", { count: r.sourceIds.length }) : t("basedOnAggregate")}</span> : null}
              {r.status === "suggested" ? <span>{t("suggestedNotActed")}</span> : null}
            </div>
            {r.limitations?.length ? <p className="mt-1 text-[11px] text-amber-700">{r.limitations[0]}</p> : null}
            {r.monitorNext ? <p className="mt-1 text-[11px] text-[#5A6478]">{t("watchNext", { value: r.monitorNext })}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
