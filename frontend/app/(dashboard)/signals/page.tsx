"use client";

import Link from "next/link";
import { useState } from "react";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

const feed = [
  ["Regulator stakeholder detected in outage narrative", "Legal", "Critical"],
  ["Media escalation gaining velocity across local press", "Comms", "High"],
];

export default function SignalsPage() {
  const [active, setActive] = useState(feed[0][0]);
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader title={t.signals.title} description={t.signals.subtitle} />

      <div className="grid gap-6 xl:grid-cols-[694px_382px]">
        <DesignFrame className="min-h-[716px] p-0">
          <div className="p-6 pb-4">
            <h2 className="theme-text text-lg font-semibold">{t.signals.feed}</h2>
            <p className="theme-muted mt-2 text-[13px]">{t.signals.feedDesc}</p>
          </div>
          <div className="theme-panel border-y px-6 py-4 text-xs font-medium uppercase tracking-[0.04em] md:grid md:grid-cols-[1fr_120px_108px]">
            <span>{t.signals.alert}</span><span>{t.signals.owner}</span><span>{t.signals.severity}</span>
          </div>
          <div>
            {feed.map(([title, owner, severity]) => (
              <button key={title} onClick={() => setActive(title)} className={`grid min-h-24 w-full gap-3 border-b border-[#1D2939] px-6 py-5 text-left md:grid-cols-[1fr_120px_108px] md:items-center ${active === title ? "bg-[#465FFF14]" : "bg-transparent"}`} type="button">
                <p className="theme-text max-w-[340px] text-sm font-medium leading-[1.25]">{title}</p>
                <p className="theme-soft text-[13px]">{owner}</p>
                <span className="w-fit rounded-full border border-[#F0443833] bg-[#F044381A] px-3 py-1 text-xs font-semibold text-[#F97066]">{severity}</span>
              </button>
            ))}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[716px]">
          <h2 className="theme-text text-lg font-semibold">{t.signals.panel}</h2>
          <p className="theme-muted mt-6 text-xs font-medium uppercase tracking-[0.06em]">{t.signals.source}</p>
          <h3 className="theme-text mt-4 max-w-[316px] text-[22px] font-semibold leading-[1.15]">{t.signals.detailTitle}</h3>
          <InnerPanel className="mt-8 min-h-28 p-4">
            <p className="theme-soft max-w-[286px] text-[13px] leading-[1.45]">{t.signals.detail}</p>
          </InnerPanel>
          <p className="theme-muted mt-9 text-xs font-medium uppercase tracking-[0.08em]">{t.signals.analysis}</p>
          <div className="mt-5 grid grid-cols-2 gap-[18px]">
            <InnerPanel className="min-h-[88px] p-4"><p className="theme-muted text-xs">{t.signals.sentiment}</p><p className="mt-3 text-base font-semibold text-[#F97066]">Negative</p></InnerPanel>
            <InnerPanel className="min-h-[88px] p-4"><p className="theme-muted text-xs">{t.signals.confidence}</p><p className="theme-text mt-3 text-base font-semibold">91%</p></InnerPanel>
          </div>
          <InnerPanel className="mt-7 min-h-[116px] p-4">
            <p className="theme-text text-[15px] font-semibold">{t.signals.recommended}</p>
            <p className="theme-soft mt-2 max-w-[286px] text-[13px] leading-[1.4]">{t.signals.recommendation}</p>
          </InnerPanel>
          <Link href="/action-plans" className="mt-10 flex h-11 items-center justify-center rounded-lg bg-[#465FFF] text-sm font-medium text-white">{t.signals.cta}</Link>
        </DesignFrame>
      </div>
    </div>
  );
}
