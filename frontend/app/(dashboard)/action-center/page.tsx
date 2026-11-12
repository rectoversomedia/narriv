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
import { BOX } from "@/lib/surface";
import { MonoLabel, StatStrip } from "@/components/ui/stamp";
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
          <p className={cn("mt-1.5 truncate text-[10px] font-black", step.done ? "text-[#047857]" : "text-[#8A93AD]")} title={step.title}>{i + 1}. {step.title}</p>
        </li>
      ))}
    </ol>
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

  const actionTitle = (a: OverviewAction) => (to.has(`a_${a.action}`) ? to(`a_${a.action}`) : a.action);
  const actionWhy = (a: OverviewAction) => (to.has(`w_${a.action}`) ? to(`w_${a.action}`) : a.whyItMatters);
  const ghost = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] px-5 text-[14px] font-black text-white transition hover:bg-white/10 disabled:opacity-50 sm:w-auto";
  const primary = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5] sm:w-auto";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{t("title")}</h1>
          <p className="mt-1 text-[14px] text-[#5F6B94]">{L("What Narriv suggests from the evidence, and where each one stands.", "Saran Narriv dari bukti, dan sejauh mana tiap saran sudah ditindaklanjuti.")}</p>
        </div>
        <div role="group" aria-label={to("period")} className="inline-flex rounded-[12px] border-[1.5px] border-[#101334] bg-white p-1 shadow-[0_2px_0_#101334]">
          {MONITORING_PERIODS.map((h) => (
            <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} className={cn("rounded-[8px] px-3 py-1.5 text-[12.5px] font-bold", hours === h ? "bg-[#101334] text-white" : "text-[#5F6B94] hover:text-[#101334]")}>
              {to(`p${h}`)}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-28 w-full rounded-[18px]" /><Skeleton className="h-64 w-full rounded-[18px]" /></div>
      ) : query.isError || !data ? (
        <DashboardErrorState title={t("errorTitle")} description={t("errorDesc")} onRetry={() => void query.refetch()} />
      ) : data.status === "insufficient_data" ? (
        <DashboardEmptyState title={to("insufficientTitle")} description={to("insufficientBody", { count: data.coverage.signals, min: data.minimumSignals ?? 3 })} />
      ) : data.actions.length === 0 ? (
        <DashboardEmptyState title={t("emptyTitle")} description={to("noActions")} />
      ) : (
        (() => {
        // Open work first (needs a decision, then in follow-up). A finished one with new data since is not really
        // finished: it comes back up as "check again". The rest fold into one compact list.
        const rank = (st: Step[]) => (st[4].done ? 2 : st[2].done ? 1 : 0);
        const ordered = data.actions.map((a) => ({ a, steps: stepsFor(a) })).sort((x, y) => rank(x.steps) - rank(y.steps));
        const reopened = (a: OverviewAction) => a.followUp?.stage === "in_progress" && !a.unchangedSinceFollowUp;
        const open = ordered.filter((x) => !x.steps[4].done);
        const recheck = ordered.filter((x) => x.steps[4].done && reopened(x.a));
        const finished = ordered.filter((x) => x.steps[4].done && !reopened(x.a));
        const pending = open.filter((x) => !x.steps[2].done).length;
        return (
        <>
        <StatStrip
          stats={[
            { key: "all", value: ordered.length, label: L("Recommendations", "Rekomendasi"), helper: L("from the evidence", "dari bukti"), tone: "text-[#3B52F5]" },
            { key: "decide", value: pending, label: L("Need a Decision", "Perlu Keputusan"), helper: pending > 0 ? L("decide first", "putuskan dulu") : L("none", "tidak ada"), tone: pending > 0 ? "text-[#B42318]" : "text-[#101334]" },
            { key: "recheck", value: recheck.length, label: L("New Data Since", "Ada Data Baru"), helper: recheck.length > 0 ? L("check again", "cek ulang") : L("none", "tidak ada"), tone: recheck.length > 0 ? "text-[#B45309]" : "text-[#101334]" },
            { key: "done", value: finished.length, label: L("Done", "Selesai"), helper: L("outcome recorded", "hasil tercatat"), tone: "text-[#047857]" },
          ]}
        />

        {open.length === 0 && recheck.length === 0 ? (
          <div className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-[#047857] bg-[#ECFDF5] px-5 py-4 shadow-[0_4px_0_#047857]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#12A66A] text-white"><CheckCircle2 size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-black text-[#065F46]">{L("Nothing waiting for you", "Tidak ada yang menunggu Anda")}</p>
              <p className="text-[13px] font-semibold text-[#047857]">{L(`All ${finished.length} recommendations have a recorded outcome.`, `Semua ${finished.length} rekomendasi sudah ada hasilnya.`)}</p>
            </div>
            <Link href="/alerts" className="hidden shrink-0 text-[13px] font-black text-[#047857] hover:underline sm:inline">{L("See Alerts →", "Lihat Peringatan →")}</Link>
          </div>
        ) : null}

        {/* Each open recommendation as a decision card: why, evidence, progress, and the buttons that act on it. */}
        {[...open.map((x) => ({ ...x, kind: x.steps[2].done ? "follow" : "decide" })), ...recheck.map((x) => ({ ...x, kind: "recheck" }))].map(({ a, steps, kind }, i) => {
          const tone = kind === "decide" ? { band: "bg-[#B42318]", stamp: "bg-[#B42318] text-white", label: L("Needs a Decision", "Perlu Keputusan") }
            : kind === "recheck" ? { band: "bg-[#F59E0B]", stamp: "bg-[#F59E0B] text-white", label: L("New Data Since", "Ada Data Baru") }
              : { band: "bg-[#465FFF]", stamp: "bg-[#EEF1FF] text-[#3B52F5]", label: L("In Follow-up", "Ditindaklanjuti") };
          const plans = a.followUp?.plans ?? [];
          const cases = a.followUp?.cases ?? [];
          return (
            <section key={`${a.action}-${kind}-${i}`} className={cn(BOX, "overflow-hidden !p-0")}>
              <div className={cn("h-2", tone.band)} />
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em]", tone.stamp)}>{tone.label}</span>
                  {a.urgency && to.has(`urgency_${a.urgency}`) ? <span className="nv-stamp">{to(`urgency_${a.urgency}`)}</span> : null}
                  <span className="font-mono text-[11.5px] font-medium text-[#5F6B94]">{L(`${a.evidenceCount} evidence`, `${a.evidenceCount} bukti`)}</span>
                </div>
                <h2 className="mt-4 text-balance text-[26px] font-black leading-[1.15] tracking-[-0.03em] text-[#101334] sm:text-[30px]">{actionTitle(a)}</h2>
                {a.relatedNarrative?.title ? (
                  <Link href={monitoringHref({ hours, narrative: a.relatedNarrative.id })} className="mt-1.5 inline-block text-[14px] font-bold text-[#31406B] hover:text-[#3B52F5]">{L("Issue", "Isu")}: {a.relatedNarrative.title} →</Link>
                ) : null}

                <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div>
                    <MonoLabel>{L("Why", "Kenapa")}</MonoLabel>
                    <p className="mt-2 text-[16px] font-semibold leading-relaxed text-[#101334]">{actionWhy(a)}</p>
                    <Link href={monitoringHref({ hours, narrative: a.relatedNarrative?.id })} className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[#3B52F5] hover:underline">{L(`See ${a.evidenceCount} evidence`, `Lihat ${a.evidenceCount} bukti`)} <ArrowRight size={14} /></Link>
                  </div>
                  <div>
                    <MonoLabel>{L("Progress", "Perjalanan")}</MonoLabel>
                    <div className="mt-3"><JourneyProgress steps={steps} /></div>
                    {plans.length || cases.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {plans.map((pl) => (
                          <Link key={pl.id} href="/action-plans" className="inline-flex max-w-full items-center gap-1.5 rounded-full border-[1.5px] border-[#101334] bg-white px-3 py-1 text-[12px] font-bold text-[#101334] hover:bg-[#EEF1FF]">
                            <span className={cn("size-2 shrink-0 rounded-full", pl.status === "done" || pl.status === "completed" ? "bg-[#12A66A]" : "bg-[#F59E0B]")} />
                            <span className="truncate">{pl.title || to("untitled")}</span>
                          </Link>
                        ))}
                        {cases.map((c) => (
                          <Link key={c.id} href="/workspace/cases" className="inline-flex max-w-full items-center gap-1.5 rounded-full border-[1.5px] border-[#101334] bg-white px-3 py-1 text-[12px] font-bold text-[#101334] hover:bg-[#EEF1FF]">
                            <span className={cn("size-2 shrink-0 rounded-full", c.status === "resolved" || c.status === "closed" ? "bg-[#12A66A]" : "bg-[#465FFF]")} />
                            <span className="truncate">{L("Case", "Kasus")}: {c.title || to("untitled")}</span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* The decision bar. */}
                <div className="mt-6 flex flex-col gap-2.5 rounded-[18px] bg-[#101334] p-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <p className="px-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF] sm:mr-2">
                    {kind === "decide" ? L("Decide Now", "Putuskan Sekarang") : kind === "recheck" ? L("Check Again", "Cek Ulang") : L("Keep It Moving", "Lanjutkan")}
                  </p>
                  {kind === "recheck" ? (
                    <Link href={monitoringHref({ hours, narrative: a.relatedNarrative?.id })} className={primary}>{L("Check the New Data", "Cek Data Baru")}</Link>
                  ) : null}
                  {kind === "follow" ? (
                    <Link href={plans.length ? "/action-plans" : "/workspace/cases"} className={primary}>{plans.length ? L("Open the Plan", "Buka Rencana") : L("Open the Case", "Buka Kasus")}</Link>
                  ) : (
                    <button type="button" onClick={() => setPlanFor(a)} className={kind === "decide" ? primary : cn(ghost, "border-white/80")}>{t("createPlan")}</button>
                  )}
                  <button type="button" onClick={() => setCaseFor(a)} disabled={!a.signalIds?.length} className={cn(ghost, "border-white/40 text-white/90")}>{t("createCase")}</button>
                </div>
                {kind === "decide" ? <p className="mt-2.5 text-[12px] font-medium text-[#8A93AD]">{to("needsApproval")}</p> : null}
              </div>
            </section>
          );
        })}

        {finished.length > 0 ? (
          <section className={BOX}>
            <MonoLabel>{L("Done", "Selesai")}</MonoLabel>
            <h2 className="mt-1.5 text-[19px] font-black tracking-[-0.02em] text-[#101334]">{L(`${finished.length} With a Recorded Outcome`, `${finished.length} Sudah Ada Hasilnya`)}</h2>
            <ul className="mt-3 divide-y divide-[#EEF0F6]">
              {finished.map(({ a }, i) => {
                const items = (a.followUp?.plans?.length ?? 0) + (a.followUp?.cases?.length ?? 0);
                return (
                  <li key={`${a.action}-done-${i}`}>
                    <Link href="/action-plans" className="group -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-3 transition hover:bg-[#F7F8FC]">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#12A66A] text-white"><CheckCircle2 size={13} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-bold text-[#101334] group-hover:text-[#3B52F5]">{actionTitle(a)}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11.5px] font-medium text-[#5F6B94]">{a.relatedNarrative?.title ? `${a.relatedNarrative.title} · ` : ""}{L(`${items} follow-ups`, `${items} tindak lanjut`)} · {L(`${a.evidenceCount} evidence`, `${a.evidenceCount} bukti`)}</span>
                      </span>
                      <ArrowRight size={16} className="shrink-0 text-[#9AA3BC] transition group-hover:text-[#3B52F5]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        </>
        );
        })()
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
