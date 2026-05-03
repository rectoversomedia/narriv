"use client";

import { useState } from "react";
import Link from "next/link";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

const alerts = [
  ["Delivery reliability narrative likely to escalate", "84% · 6h window", "Velocity 2.4x · source authority high · negative skew rising", "text-[#F97066]"],
  ["Competitor AI visibility advantage widening", "71% · 48h", "Brand absent in 6 priority prompts · competitor citations rising", "text-[#FDB022]"],
  ["Podcast discussion may trigger regional news pickup", "58% · watch", "Source type expansion detected · sentiment still mixed", "text-[#D0D5DD]"],
];

const flow = [
  ["1. Recommend", "AI proposes action from narrative evidence."],
  ["2. Human feedback", "Accept, edit, reject, and explain why."],
  ["3. Score prompt", "Quality signal updates prompt scoring."],
  ["4. Improve model", "Ranking, tone, evidence fit improve."],
  ["5. Better alerts", "Future recommendations get sharper."],
];

export default function AlertsPage() {
  const [reviewed, setReviewed] = useState(false);
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.alerts.title}
        description={t.alerts.subtitle}
      />

      <div className="grid gap-6 xl:grid-cols-[660px_416px]">
        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t.alerts.queue}</h2>
          <div className="mt-7 space-y-3">
            {alerts.map(([title, metric, detail, tone], index) => (
              <Link key={title} href={`/alerts/alert-${index + 1}`} className="block">
                <InnerPanel className="min-h-[76px] px-4 py-3 transition-colors hover:border-[#465FFF33]">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <p className="theme-text max-w-[360px] text-sm font-semibold">{title}</p>
                    <p className={`text-[13px] font-semibold ${tone}`}>{metric}</p>
                  </div>
                  <p className="theme-muted mt-2 text-xs">{detail}</p>
                </InnerPanel>
              </Link>
            ))}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t.alerts.scoring}</h2>
          <p className="mt-8 text-[58px] font-semibold leading-none text-[#12B76A]">+8.4</p>
          <p className="theme-muted mt-5 max-w-[330px] text-[13px] leading-[1.45]">{t.alerts.scoringDesc}</p>
          <div className="mt-12 grid grid-cols-3 gap-5">
            {[[t.alerts.accepted, "81"], [t.alerts.edited, "34"], [t.alerts.rejected, "12"]].map(([label, value]) => (
              <div key={label}>
                <p className="theme-muted text-xs font-semibold">{label}</p>
                <p className="theme-text mt-2 text-[28px] font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setReviewed(true)} className="mt-6 rounded-lg bg-[#465FFF] px-4 py-2 text-[13px] font-semibold text-white" type="button">
            {reviewed ? t.alerts.reviewed : t.common.learningQueue}
          </button>
        </DesignFrame>
      </div>

      <DesignFrame className="min-h-[204px]">
        <h2 className="theme-text text-lg font-semibold">{t.alerts.flow}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-5">
          {flow.map(([title, detail], index) => (
            <div key={title} className={`min-h-[82px] rounded-xl border p-[16px_18px] ${index === 4 ? "border-[#465FFF33] bg-[#465FFF14]" : "theme-panel"}`}>
              <p className="theme-text text-sm font-semibold">{title}</p>
              <p className={`mt-2 text-xs leading-[1.35] ${index === 4 ? "text-[#9AA8FF]" : "theme-muted"}`}>{detail}</p>
            </div>
          ))}
        </div>
      </DesignFrame>

      <div className="rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45] text-[#D0D5DD]">
        {t.alerts.footer}
      </div>
    </div>
  );
}
