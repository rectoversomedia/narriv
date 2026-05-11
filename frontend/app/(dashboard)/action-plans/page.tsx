"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { createActionPlan, getActionPlans, submitActionPlanFeedback } from "@/lib/api-service";

interface ActionPlanData {
  id?: string;
  inputNarrative?: string;
  evidenceSummary?: string;
  outputs?: [string, string][];
  plan?: [string, string][];
}

export default function ActionPlansPage() {
  const t = useTranslations("ActionPlans");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isGeneratingAction, setIsGeneratingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [data, setData] = useState<ActionPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getActionPlans();
      setData(res as ActionPlanData);
      setIsLoading(false);
    }
    fetchData();
  }, [reloadKey]);

  const displayOutputLabel = (label: string) => {
    if (label === "Primary action") return t("outputs.primaryAction");
    if (label === "Channel") return t("outputs.channel");
    if (label === "Impact / effort") return t("outputs.impactEffort");
    if (label === "Confidence") return t("outputs.confidence");
    return label;
  };

  const displayPlanTime = (time: string) => {
    if (time === "Today") return t("time.today");
    if (time === "Next 6h") return t("time.next6h");
    if (time === "24h") return t("time.twentyFourHours");
    if (time === "48h") return t("time.fortyEightHours");
    return time;
  };

  const feedbackLabel = feedback ? t(`feedbackState.${feedback}`) : "";

  const handleFeedback = async (action: "accepted" | "edited" | "rejected") => {
    setFeedback(action);
    if (!data?.id) return;

    setIsSubmittingFeedback(true);
    await submitActionPlanFeedback(data.id, action, action === "accepted" ? undefined : t("reason"));
    setIsSubmittingFeedback(false);
  };

  const handleGenerateAction = async () => {
    setActionError(null);
    setIsGeneratingAction(true);
    const created = await createActionPlan({ strategyType: "content_strategy" });
    if (!created) {
      setActionError(t("createActionFailed"));
      setIsGeneratingAction(false);
      return;
    }

    const res = await getActionPlans();
    setData(res as ActionPlanData);
    setIsGeneratingAction(false);
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <button
            type="button"
            onClick={() => void handleGenerateAction()}
            disabled={isGeneratingAction}
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {isGeneratingAction ? t("creatingAction") : t("generateAction")}
          </button>
        }
      />

      {actionError ? (
        <div className="rounded-lg border border-[#F04438]/20 bg-[#F04438]/10 px-4 py-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
            <Skeleton className="h-[248px] w-full" />
            <Skeleton className="h-[248px] w-full" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_392px]">
            <Skeleton className="h-[332px] w-full" />
            <Skeleton className="h-[332px] w-full" />
          </div>
        </>
      ) : !data || (!data.inputNarrative && !data.evidenceSummary && !data.outputs?.length && !data.plan?.length) ? (
        <EmptyState
          icon="search"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={(
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="rounded-lg bg-[#465FFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3547D8]">
              {t("retry")}
            </button>
          )}
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
            <DesignFrame className="min-h-[248px] backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t("input")}</h2>
              <p className="theme-text mt-6 max-w-[430px] text-[15px] leading-relaxed">
                {data.inputNarrative || t("emptyDesc")}
              </p>
              <p className="theme-muted mt-8 max-w-[440px] text-[13px] font-medium tracking-wide">
                {data.evidenceSummary || t("noOutputs")}
              </p>
            </DesignFrame>

            <DesignFrame className="min-h-[248px] backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t("outputsTitle")}</h2>
              <div className="mt-7 space-y-5 text-[14px]">
                {data.outputs && data.outputs.length ? data.outputs.map(([label, value]: [string, string]) => (
                  <div key={label} className="grid grid-cols-[136px_1fr] gap-5 border-b border-[var(--border)] pb-5 last:border-0 last:pb-0">
                    <p className="theme-muted font-bold tracking-wide">{displayOutputLabel(label)}</p>
                    <p className="theme-text">{value}</p>
                  </div>
                )) : (
                  <p className="theme-muted">{t("noOutputs")}</p>
                )}
              </div>
            </DesignFrame>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_392px]">
            <DesignFrame className="min-h-[332px] backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t("plan")}</h2>
              <div className="mt-7 space-y-3">
                {data.plan && data.plan.length ? data.plan.map(([step, time]: [string, string]) => (
                  <InnerPanel key={step} className="group grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors">
                    <p className="theme-text text-[14px] font-medium">{step}</p>
                    <p className="theme-accent text-[12px] font-bold tracking-wide">{displayPlanTime(time)}</p>
                  </InnerPanel>
                )) : (
                  <p className="theme-muted">{t("noPlan")}</p>
                )}
              </div>
            </DesignFrame>

            <DesignFrame className="min-h-[332px] backdrop-blur-xl">
              <div className="space-y-1">
                <h2 className="theme-text text-xl font-bold tracking-tight">{t("feedback")}</h2>
                <p className="theme-muted text-[14px] leading-relaxed">{t("feedbackDesc")}</p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <button onClick={() => void handleFeedback("accepted")} disabled={isSubmittingFeedback} className="h-12 rounded-xl bg-linear-to-b from-[#12B76A] to-[#0E9355] text-[13px] font-bold tracking-wide text-white shadow-[0_0_15px_rgba(18,183,106,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(18,183,106,0.4)] disabled:pointer-events-none disabled:opacity-50" type="button">{t("accept")}</button>
                <button onClick={() => void handleFeedback("edited")} disabled={isSubmittingFeedback} className="h-12 rounded-xl bg-linear-to-b from-[#465FFF] to-[#3B4DCD] text-[13px] font-bold tracking-wide text-white shadow-[0_0_15px_rgba(70,95,255,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(70,95,255,0.4)] disabled:pointer-events-none disabled:opacity-50" type="button">{t("edit")}</button>
                <button onClick={() => void handleFeedback("rejected")} disabled={isSubmittingFeedback} className="h-12 rounded-xl border border-[#F04438]/20 bg-[#F04438]/10 text-[13px] font-bold tracking-wide text-[#F97066] transition-colors hover:bg-[#F04438]/20 disabled:pointer-events-none disabled:opacity-50" type="button">{t("reject")}</button>
              </div>
              <InnerPanel className="mt-6 min-h-[92px] p-5">
                <p className="theme-muted text-[11px] font-bold uppercase tracking-widest">{t("required")}</p>
                <p className="theme-text mt-3 text-[14px] leading-relaxed">{t("reason")}</p>
              </InnerPanel>
              <p className="theme-muted mt-5 text-[12px] font-medium tracking-wide">{feedback ? `${t("feedbackCaptured")}: ${feedbackLabel}. ` : ""}{t("saved")}</p>
            </DesignFrame>
          </div>

          <div className="theme-soft rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45]">
            {t("footer")}
          </div>
        </>
      )}
    </div>
  );
}
