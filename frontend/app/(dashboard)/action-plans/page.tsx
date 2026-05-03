"use client";

import { useState } from "react";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

const outputs = [
  ["PR Response", "Issue transparent update, add support FAQ, prepare executive quote."],
  ["Content Strategy", "Publish service timeline explainer and customer-facing proof points."],
  ["Influencer Strategy", "Brief logistics reviewers and regional creator partners with verified facts."],
  ["Crisis Steps", "Open war-room, assign owner, monitor escalation every 30 minutes."],
];

const plan = [
  ["1. Validate evidence pack with CX and operations owner", "30m"],
  ["2. Draft PR response and customer-facing support FAQ", "2h"],
  ["3. Publish update, monitor spread, and trigger report snapshot", "6h"],
];

export default function ActionPlansPage() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.action.title}
        description={t.action.subtitle}
      />

      <div className="grid gap-6 xl:grid-cols-[520px_556px]">
        <DesignFrame className="min-h-[248px]">
          <h2 className="theme-text text-lg font-semibold">{t.action.input}</h2>
          <p className="theme-soft mt-6 max-w-[430px] text-sm leading-[1.45]">
            Narrative: delivery reliability narrative spreading across TikTok, forums, and regional news. Sentiment is negative and volume velocity is 2.4x baseline.
          </p>
          <p className="theme-muted mt-8 max-w-[440px] text-[13px] leading-[1.45]">Evidence: 1,248 signals · 6 source types · 92% confidence · 84% escalation probability</p>
        </DesignFrame>

        <DesignFrame className="min-h-[248px]">
          <h2 className="theme-text text-lg font-semibold">{t.action.outputs}</h2>
          <div className="mt-7 space-y-[18px] text-[13px]">
            {outputs.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[136px_1fr] gap-4">
                <p className="theme-text font-semibold">{label}</p>
                <p className="theme-soft">{value}</p>
              </div>
            ))}
          </div>
        </DesignFrame>
      </div>

      <div className="grid gap-6 xl:grid-cols-[684px_392px]">
        <DesignFrame className="min-h-[332px]">
          <h2 className="theme-text text-lg font-semibold">{t.action.plan}</h2>
          <div className="mt-7 space-y-3">
            {plan.map(([step, time]) => (
              <InnerPanel key={step} className="grid min-h-[54px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-[13px]">
                <p className="theme-text">{step}</p>
                <p className="font-semibold text-[#9AA8FF]">{time}</p>
              </InnerPanel>
            ))}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[332px]">
          <h2 className="theme-text text-lg font-semibold">{t.action.feedback}</h2>
          <p className="theme-muted mt-3 max-w-[300px] text-[13px] leading-[1.4]">{t.action.feedbackDesc}</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <button onClick={() => setFeedback("accepted")} className="h-11 rounded-lg bg-[#12B76A] text-[13px] font-semibold text-white" type="button">{t.action.accept}</button>
            <button onClick={() => setFeedback("edited")} className="h-11 rounded-lg bg-[#465FFF] text-[13px] font-semibold text-white" type="button">{t.action.edit}</button>
            <button onClick={() => setFeedback("rejected")} className="h-11 rounded-lg border border-[#F0443844] bg-[#F044381F] text-[13px] font-semibold text-[#F97066]" type="button">{t.action.reject}</button>
          </div>
          <InnerPanel className="mt-6 min-h-[82px] p-4">
            <p className="theme-muted text-xs font-semibold">{t.action.required}</p>
            <p className="theme-soft mt-2 text-[13px] leading-[1.35]">{t.action.reason}</p>
          </InnerPanel>
          <p className="theme-muted mt-5 text-xs leading-[1.4]">{feedback ? `${language === "id" ? "Feedback tercatat" : "Feedback captured"}: ${feedback}. ` : ""}{t.action.saved}</p>
        </DesignFrame>
      </div>

      <div className="rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45] text-[#D0D5DD]">
        {t.action.footer}
      </div>
    </div>
  );
}
