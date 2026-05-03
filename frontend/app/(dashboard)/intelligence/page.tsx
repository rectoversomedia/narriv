"use client";

import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

export default function IntelligencePage() {
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader title={t.intelligence.title} description={t.intelligence.subtitle} />

      <div className="grid gap-6 xl:grid-cols-[694px_382px]">
        <DesignFrame className="min-h-[716px]">
          <h2 className="theme-text text-lg font-semibold">{t.intelligence.map}</h2>
          <p className="theme-muted mt-2 text-[13px]">{t.intelligence.mapDesc}</p>
          <InnerPanel className="relative mt-10 min-h-[396px] overflow-hidden rounded-2xl">
            <div className="absolute left-[36%] top-[14%] h-[164px] w-[164px] rounded-full bg-[#465FFF] opacity-90" />
            <div className="absolute left-[55%] top-[36%] h-[104px] w-[104px] rounded-full bg-[#F04438] opacity-75" />
            <div className="absolute left-[18%] top-[48%] h-24 w-24 rounded-full bg-[#12B76A] opacity-70" />
            <div className="absolute left-[68%] top-[15%] h-[76px] w-[76px] rounded-full bg-[#F79009] opacity-70" />
            <p className="absolute left-[41%] top-[31%] text-2xl font-semibold text-white">Trust</p>
          </InnerPanel>
          <InnerPanel className="mt-7 min-h-[156px] rounded-2xl p-5">
            <h3 className="theme-text text-base font-semibold">{t.intelligence.dominant}</h3>
            <p className="theme-soft mt-3 max-w-[560px] text-[13px] leading-[1.45]">{t.intelligence.dominantDesc}</p>
          </InnerPanel>
        </DesignFrame>

        <DesignFrame className="min-h-[716px]">
          <h2 className="theme-text text-lg font-semibold">{t.intelligence.detail}</h2>
          <p className="theme-muted mt-6 text-xs font-medium uppercase tracking-[0.06em]">{t.intelligence.source}</p>
          <h3 className="theme-text mt-4 max-w-[316px] text-[22px] font-semibold leading-[1.15]">{t.intelligence.clusterTitle}</h3>
          <InnerPanel className="mt-8 min-h-28 p-4"><p className="theme-soft max-w-[286px] text-[13px] leading-[1.45]">{t.intelligence.clusterDesc}</p></InnerPanel>
          <p className="theme-muted mt-9 text-xs font-medium uppercase tracking-[0.08em]">{t.intelligence.metrics}</p>
          <div className="mt-5 grid grid-cols-2 gap-[18px]">
            <InnerPanel className="min-h-[88px] p-4"><p className="theme-muted text-xs">{t.intelligence.velocity}</p><p className="mt-3 text-base font-semibold text-[#F97066]">+38%</p></InnerPanel>
            <InnerPanel className="min-h-[88px] p-4"><p className="theme-muted text-xs">{t.signals.confidence}</p><p className="theme-text mt-3 text-base font-semibold">94%</p></InnerPanel>
          </div>
          <InnerPanel className="mt-7 min-h-[116px] p-4"><p className="theme-text text-[15px] font-semibold">{t.intelligence.focus}</p><p className="theme-soft mt-2 max-w-[286px] text-[13px] leading-[1.4]">{t.intelligence.focusDesc}</p></InnerPanel>
          <button className="mt-10 h-11 w-full rounded-lg bg-[#465FFF] text-sm font-medium text-white" type="button">{t.intelligence.open}</button>
        </DesignFrame>
      </div>
    </div>
  );
}
