"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, ClipboardList, FileSearch, Gavel, Lightbulb, ListChecks } from "lucide-react";
import { DashboardEmptyState, DashboardErrorState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { getExecutiveOverview, type OverviewAction } from "@/lib/intelligence-api";
import { MONITORING_PERIODS, monitoringHref, type MonitoringPeriod } from "@/lib/evidence-links";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { CreateInvestigationModal } from "@/app/(dashboard)/signals/components/create-investigation-modal";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(intlLocale(), { day: "numeric", month: "short" }) : "");

type Step = { icon: typeof Lightbulb; title: string; body: React.ReactNode; done: boolean };

function JourneyStep({ step, last }: { step: Step; last: boolean }) {
  const Icon = step.icon;
  return (
    <li className="relative flex gap-3 pb-4">
      {!last ? <span className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-[#E3E7F1]" aria-hidden="true" /> : null}
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", step.done ? "bg-[#465FFF] text-white" : "border border-[#DDE3EF] bg-white text-[#5A6478]")}>
        <Icon size={13} aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{step.title}</p>
        <div className="mt-0.5 text-[13px] text-[#31406B]">{step.body}</div>
      </div>
    </li>
  );
}

/**
 * Recommended Actions: each recommendation shown with the finding behind it,
 * the human decision, the follow-up (action plans, cases) and any recorded
 * outcome. Statuses come only from stored plans and cases; nothing is
 * executed or sent from here, and no outcome is assumed.
 */
export default function ActionCenterPage() {
  const t = useTranslations("ActionJourney");
  const to = useTranslations("Overview");
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<MonitoringPeriod>(168);
  const [planFor, setPlanFor] = useState<OverviewAction | null>(null);
  const [caseFor, setCaseFor] = useState<OverviewAction | null>(null);

  // A link from Overview carries its period.
  useEffect(() => {
    const h = Number(new URLSearchParams(window.location.search).get("hours"));
    if ((MONITORING_PERIODS as readonly number[]).includes(h)) setHours(h as MonitoringPeriod);
  }, []);

  const query = useQuery({ queryKey: ["executive-overview", hours], queryFn: () => getExecutiveOverview(hours), staleTime: 60 * 1000 });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["executive-overview"] });
  const data = query.data;

  const stepsFor = (a: OverviewAction): Step[] => {
    const fu = a.followUp;
    const plans = fu?.plans ?? [];
    const cases = fu?.cases ?? [];
    const decided = plans.length > 0 || cases.length > 0;
    const resolvedCase = cases.find((c) => c.hasResolution && (c.status === "resolved" || c.status === "closed"));
    const donePlan = plans.find((p) => p.status === "done" || p.status === "completed");
    const status = (kind: "plan" | "case", s: string) => (to.has(`${kind}Status_${s}`) ? to(`${kind}Status_${s}`) : s);
    return [
      {
        icon: FileSearch,
        title: t("stepFinding"),
        done: true,
        body: (
          <>
            {a.relatedNarrative?.title ? t("findingIssue", { title: a.relatedNarrative.title, count: a.evidenceCount }) : t("findingRecords", { count: a.evidenceCount })}{" "}
            <Link href={monitoringHref({ hours, narrative: a.relatedNarrative?.id, relevance: a.relatedNarrative ? undefined : data?.coverage.relevance?.configured ? "direct" : undefined })} className="font-semibold text-[#3B52F5] hover:underline">{t("seeEvidence")}</Link>
          </>
        ),
      },
      {
        icon: Lightbulb,
        title: t("stepRecommendation"),
        done: true,
        body: (
          <>
            <span className="font-semibold text-[#101334]">{to.has(`a_${a.action}`) ? to(`a_${a.action}`) : a.action}</span>
            {" · "}{to.has(`w_${a.action}`) ? to(`w_${a.action}`) : a.whyItMatters}
            {a.urgency && to.has(`urgency_${a.urgency}`) ? <span className="ml-1 rounded-full bg-[#465FFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B52F5]">{to(`urgency_${a.urgency}`)}</span> : null}
          </>
        ),
      },
      {
        icon: Gavel,
        title: t("stepDecision"),
        done: decided,
        body: decided ? (
          t("decisionMade", { date: fmtDate(fu?.openSince ?? plans[0]?.createdAt ?? cases[0]?.createdAt) })
        ) : (
          <>
            <p>{t("decisionPending")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPlanFor(a)} className="h-8 rounded-[8px] bg-[#465FFF] px-3 text-[12px] font-bold text-white hover:bg-[#3B52F5]">{t("createPlan")}</button>
              <button type="button" onClick={() => setCaseFor(a)} disabled={!a.signalIds?.length} className="h-8 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#31406B] hover:bg-slate-50 disabled:opacity-50">{t("createCase")}</button>
            </div>
            <p className="mt-1 text-[11px] text-[#5A6478]">{to("needsApproval")}</p>
          </>
        ),
      },
      {
        icon: ClipboardList,
        title: t("stepFollowUp"),
        done: decided,
        body: decided ? (
          <ul className="space-y-0.5">
            {plans.map((p) => <li key={p.id}><Link href="/action-plans" className="hover:text-[#3B52F5] hover:underline">{to("planItem", { title: p.title || to("untitled"), status: status("plan", p.status) })}</Link></li>)}
            {cases.map((c) => <li key={c.id}><Link href="/workspace/cases" className="hover:text-[#3B52F5] hover:underline">{to("caseItem", { title: c.title || to("untitled"), status: status("case", c.status) })}</Link></li>)}
            {a.unchangedSinceFollowUp ? <li className="text-[11px] text-[#5A6478]">{to("fu_unchanged", { date: fmtDate(fu?.openSince) })}</li> : fu?.stage === "in_progress" ? <li className="text-[11px] text-[#9A5B00]">{to("fu_newSince")}</li> : null}
          </ul>
        ) : t("followUpNone"),
      },
      {
        icon: CheckCircle2,
        title: t("stepOutcome"),
        done: Boolean(resolvedCase || donePlan),
        body: resolvedCase ? t("outcomeCaseResolved") : donePlan ? t("outcomePlanDone") : t("outcomeNone"),
      },
    ];
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-[14px] font-medium leading-6 text-body">{t("subtitle")}</p>
        </div>
        <div role="group" aria-label={to("period")} className="inline-flex rounded-[10px] border border-[#DDE3EF] bg-white p-0.5">
          {MONITORING_PERIODS.map((h) => (
            <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} className={cn("rounded-[8px] px-3 py-1.5 text-[12px] font-semibold", hours === h ? "bg-[#465FFF] text-white" : "text-[#31406B] hover:bg-slate-50")}>
              {to(`p${h}`)}
            </button>
          ))}
        </div>
      </div>

      {/* How the three action features relate. */}
      <div className="grid gap-3 md:grid-cols-3">
        {(["recommendations", "plans", "cases"] as const).map((k) => (
          <div key={k} className="rounded-[12px] border border-[#E8ECF5] bg-white p-4">
            <p className="text-[12px] font-black text-[#101334]">{t(`explain.${k}Title`)}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#5A6478]">{t(`explain.${k}Body`)}</p>
          </div>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-40 w-full rounded-xl" /></div>
      ) : query.isError || !data ? (
        <DashboardErrorState title={t("errorTitle")} description={t("errorDesc")} onRetry={() => void query.refetch()} />
      ) : data.status === "insufficient_data" ? (
        <DashboardEmptyState title={to("insufficientTitle")} description={to("insufficientBody", { count: data.coverage.signals, min: data.minimumSignals ?? 3 })} />
      ) : data.actions.length === 0 ? (
        <DashboardEmptyState title={t("emptyTitle")} description={to("noActions")} />
      ) : (
        <ol className="space-y-4">
          {data.actions.map((a, i) => {
            const steps = stepsFor(a);
            return (
              <li key={`${a.action}-${i}`} className="rounded-[14px] border border-[#E8ECF5] bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#101334]"><ListChecks size={16} className="text-[#3B52F5]" aria-hidden="true" />{to.has(`a_${a.action}`) ? to(`a_${a.action}`) : a.action}</h2>
                  {a.unchangedSinceFollowUp ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{to("alreadyHandled")}</span> : null}
                </div>
                <ol>{steps.map((s, j) => <JourneyStep key={s.title} step={s} last={j === steps.length - 1} />)}</ol>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[12px] text-[#5A6478]">
        {t("footer")}{" "}
        <Link href="/" className="inline-flex items-center gap-1 font-semibold text-[#3B52F5] hover:underline">{t("backToOverview")} <ArrowRight size={12} aria-hidden="true" /></Link>
      </p>

      <CreateActionPlanModal
        open={Boolean(planFor)}
        onOpenChange={(open) => { if (!open) { setPlanFor(null); refresh(); } }}
        initialClusterId={planFor?.relatedNarrative?.id}
        initialSignalId={planFor?.signalIds?.[0]}
        initialStrategyType={planFor?.action === "escalate_internal" ? "crisis_response" : "pr_response"}
      />
      <CreateInvestigationModal
        open={Boolean(caseFor)}
        onOpenChange={(open) => { if (!open) { setCaseFor(null); refresh(); } }}
        signalId={caseFor?.signalIds?.[0]}
        signalTitle={caseFor ? (caseFor.relatedNarrative?.title ?? caseFor.evidence.find((e) => e.kind === "signal")?.title ?? undefined) : undefined}
      />
    </div>
  );
}
