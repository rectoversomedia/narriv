"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, ClipboardList, FileSearch, Gavel, Lightbulb } from "lucide-react";
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

/** The five steps as a progress row: numbered dots that fill as the journey advances. */
function JourneyProgress({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {steps.map((step, i) => (
        <li key={step.title} className="min-w-0">
          <div className={cn("h-2 rounded-full", step.done ? "bg-[#12A66A]" : "bg-[#E3E7F1]")} />
          <p className={cn("mt-1.5 truncate text-[10px] font-black uppercase tracking-[0.06em]", step.done ? "text-[#047857]" : "text-[#8A93AD]")} title={step.title}>{i + 1}. {step.title}</p>
        </li>
      ))}
    </ol>
  );
}

function Block({ title, children, tint }: { title: string; children: React.ReactNode; tint: string }) {
  return (
    <div className="min-w-0 rounded-[12px] p-3.5" style={{ background: tint }}>
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{title}</p>
      <div className="mt-1 text-[13px] font-semibold leading-snug text-[#101334]">{children}</div>
    </div>
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

  const L = (en: string, id: string) => (intlLocale().startsWith("id") ? id : en);
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
        </div>
        <div role="group" aria-label={to("period")} className="inline-flex rounded-[10px] border border-[#DDE3EF] bg-white p-0.5">
          {MONITORING_PERIODS.map((h) => (
            <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} className={cn("rounded-[8px] px-3 py-1.5 text-[12px] font-semibold", hours === h ? "bg-[#465FFF] text-white" : "text-[#31406B] hover:bg-slate-50")}>
              {to(`p${h}`)}
            </button>
          ))}
        </div>
      </div>

      {/* The period in four numbers: how many recommendations, and where they stand. */}
      {data && data.actions.length > 0 ? (() => {
        const all = data.actions.map((a) => stepsFor(a));
        const pending = all.filter((st) => !st[2].done).length;
        const done = all.filter((st) => st[4].done).length;
        const tiles = [
          { label: L("Recommendations", "Rekomendasi"), value: all.length, sub: L("from the evidence", "dari bukti"), rgb: "70,95,255", color: "#3B52F5" },
          { label: L("Waiting for a decision", "Menunggu keputusan"), value: pending, sub: pending > 0 ? L("decide first", "putuskan dulu") : L("none", "tidak ada"), rgb: pending > 0 ? "229,72,77" : "100,116,139", color: pending > 0 ? "#C81E1E" : "#5A6478" },
          { label: L("In follow-up", "Sedang ditindaklanjuti"), value: all.length - pending - done, sub: L("plans or cases open", "rencana atau kasus berjalan"), rgb: "245,158,11", color: "#A04606" },
          { label: L("Done", "Selesai"), value: done, sub: L("outcome recorded", "hasil tercatat"), rgb: "18,166,106", color: "#047857" },
        ];
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-[14px] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.05)]" style={{ backgroundImage: `linear-gradient(160deg, rgba(${tile.rgb},0.11), rgba(${tile.rgb},0.02) 60%)` }}>
                <p className="text-[11px] font-black uppercase tracking-[0.06em]" style={{ color: tile.color }}>{tile.label}</p>
                <p className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-[#101334]">{tile.value}</p>
                <p className="mt-2 text-[11px] font-bold text-[#5A6478]">{tile.sub}</p>
              </div>
            ))}
          </div>
        );
      })() : null}

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
              <li key={`${a.action}-${i}`} className={cn("rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]", !steps[2].done && "bg-[#FFFAFA]")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#101334] text-[14px] font-black text-white">{i + 1}</span>
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-black leading-snug tracking-[-0.02em] text-[#101334]">{to.has(`a_${a.action}`) ? to(`a_${a.action}`) : a.action}</h2>
                      {a.relatedNarrative?.title ? <p className="mt-0.5 text-[12px] font-bold text-[#5A6478]">{L("Issue", "Isu")}: {a.relatedNarrative.title}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-[10px] bg-[#EEF1FF] px-3 py-1 text-center"><b className="block text-[18px] font-black leading-none text-[#101334]">{a.evidenceCount}</b><span className="text-[10px] font-bold text-[#3B52F5]">{L("evidence", "bukti")}</span></span>
                    {steps[4].done ? <span className="rounded-full bg-[#047857] px-3 py-1 text-[11px] font-black text-white">{L("Done", "Selesai")}</span>
                      : steps[2].done ? <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-[11px] font-black text-white">{L("In follow-up", "Ditindaklanjuti")}</span>
                        : <span className="rounded-full bg-[#C81E1E] px-3 py-1 text-[11px] font-black text-white">{L("Needs a decision", "Perlu keputusan")}</span>}
                  </div>
                </div>
                <div className="mt-4"><JourneyProgress steps={steps} /></div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Block title={steps[0].title} tint="#F4F6FC">{steps[0].body}</Block>
                  <Block title={steps[1].title} tint="#EEF1FF">{steps[1].body}</Block>
                  <Block title={steps[2].done ? steps[3].title : steps[2].title} tint={steps[2].done ? "#FFF6E0" : "#FDECEC"}>
                    {steps[2].done ? steps[3].body : steps[2].body}
                    {steps[4].done ? <p className="mt-2 text-[12px] font-black text-[#047857]">{steps[4].body}</p> : null}
                  </Block>
                </div>
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
