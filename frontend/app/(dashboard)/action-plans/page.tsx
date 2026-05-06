"use client";

import { useEffect, useState } from "react";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getActionPlans } from "@/lib/api-service";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

interface ActionPlanData {
  inputNarrative?: string;
  evidenceSummary?: string;
  outputs?: [string, string][];
  plan?: [string, string][];
}

export default function ActionPlansPage() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  const [data, setData] = useState<ActionPlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getActionPlans();
      setData(res as ActionPlanData);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.action.title}
        description={t.action.subtitle}
        action={
          <button
            type="button"
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {t.common.generateAction}
          </button>
        }
      />

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
      ) : !data ? (
        <EmptyState
          icon="search"
          title="No Action Plans Generated"
          description="Action plans are generated automatically when a high-severity narrative is detected. Currently, no plans are required."
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
            <DesignFrame className="min-h-[248px] border-white/5 backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t.action.input}</h2>
              <p className="theme-text mt-6 max-w-[430px] text-[15px] leading-relaxed">
                {data.inputNarrative || "Narrative: delivery reliability narrative spreading across TikTok, forums, and regional news. Sentiment is negative and volume velocity is 2.4x baseline."}
              </p>
              <p className="theme-muted mt-8 max-w-[440px] text-[13px] font-medium tracking-wide">
                {data.evidenceSummary || "Evidence: 1,248 signals · 6 source types · 92% confidence · 84% escalation probability"}
              </p>
            </DesignFrame>

            <DesignFrame className="min-h-[248px] border-white/5 backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t.action.outputs}</h2>
              <div className="mt-7 space-y-5 text-[14px]">
                {data.outputs && data.outputs.length ? data.outputs.map(([label, value]: [string, string]) => (
                  <div key={label} className="grid grid-cols-[136px_1fr] gap-5 border-b border-white/5 pb-5 last:border-0 last:pb-0">
                    <p className="theme-muted font-bold tracking-wide">{label}</p>
                    <p className="theme-text">{value}</p>
                  </div>
                )) : (
                  <p className="theme-muted">No strategic outputs identified.</p>
                )}
              </div>
            </DesignFrame>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_392px]">
            <DesignFrame className="min-h-[332px] border-white/5 backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t.action.plan}</h2>
              <div className="mt-7 space-y-3">
                {data.plan && data.plan.length ? data.plan.map(([step, time]: [string, string]) => (
                  <InnerPanel key={step} className="group grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:border-white/10">
                    <p className="theme-text text-[14px] font-medium">{step}</p>
                    <p className="text-[12px] font-bold tracking-wide text-[#A4BCFD]">{time}</p>
                  </InnerPanel>
                )) : (
                  <p className="theme-muted">Execution steps are pending.</p>
                )}
              </div>
            </DesignFrame>

            <DesignFrame className="min-h-[332px] border-white/5 backdrop-blur-xl">
              <div className="space-y-1">
                <h2 className="theme-text text-xl font-bold tracking-tight">{t.action.feedback}</h2>
                <p className="theme-muted text-[14px] leading-relaxed">{t.action.feedbackDesc}</p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <button onClick={() => setFeedback("accepted")} className="h-12 rounded-xl bg-linear-to-b from-[#12B76A] to-[#0E9355] text-[13px] font-bold tracking-wide text-white shadow-[0_0_15px_rgba(18,183,106,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(18,183,106,0.4)]" type="button">{t.action.accept}</button>
                <button onClick={() => setFeedback("edited")} className="h-12 rounded-xl bg-linear-to-b from-[#465FFF] to-[#3B4DCD] text-[13px] font-bold tracking-wide text-white shadow-[0_0_15px_rgba(70,95,255,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(70,95,255,0.4)]" type="button">{t.action.edit}</button>
                <button onClick={() => setFeedback("rejected")} className="h-12 rounded-xl border border-[#F04438]/20 bg-[#F04438]/10 text-[13px] font-bold tracking-wide text-[#F97066] transition-colors hover:bg-[#F04438]/20" type="button">{t.action.reject}</button>
              </div>
              <InnerPanel className="mt-6 min-h-[92px] p-5">
                <p className="theme-muted text-[11px] font-bold uppercase tracking-widest">{t.action.required}</p>
                <p className="theme-text mt-3 text-[14px] leading-relaxed">{t.action.reason}</p>
              </InnerPanel>
              <p className="theme-muted mt-5 text-[12px] font-medium tracking-wide">{feedback ? `${language === "id" ? "Feedback tercatat" : "Feedback captured"}: ${feedback}. ` : ""}{t.action.saved}</p>
            </DesignFrame>
          </div>

          <div className="rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45] text-[#D0D5DD]">
            {t.action.footer}
          </div>
        </>
      )}
    </div>
  );
}
