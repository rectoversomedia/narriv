"use client";

import Link from "next/link";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

const metrics = [
  ["78", "text-[#12B76A]"],
  ["36", "theme-soft"],
  ["12", "text-[#F97066]"],
  ["64%", "theme-soft"],
];

const clusters = [
  ["Delivery reliability narrative spreading across TikTok and forums", "92% confidence", "text-[#F97066]"],
  ["Competitor sustainability claims gaining AI answer coverage", "81% confidence", "text-[#FDB022]"],
];

export default function DashboardPage() {
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.command.title}
        description={t.command.subtitle}
        action={<div className="theme-card theme-soft hidden h-10 w-[204px] items-center justify-center rounded-lg border text-sm font-medium lg:flex">{t.common.last7Days}</div>}
      />

      <DesignFrame className="min-h-[126px] p-0">
        <div className="grid divide-y divide-[#1D2939] md:grid-cols-4 md:divide-x md:divide-y-0">
          {metrics.map(([value, tone], index) => (
            <div key={t.command.metrics[index]} className="px-6 py-[22px]">
              <p className="theme-muted text-xs font-semibold uppercase tracking-[0.04em]">{t.command.metrics[index]}</p>
              <p className="mt-1 text-[34px] font-semibold leading-tight text-white">{value}</p>
              <p className={`mt-1 text-xs ${tone}`}>{t.command.metricNotes[index]}</p>
            </div>
          ))}
        </div>
      </DesignFrame>

      <div className="grid gap-6 xl:grid-cols-[680px_396px]">
        <DesignFrame className="min-h-[288px]">
          <h2 className="theme-text text-lg font-semibold">{t.command.narrativeTitle}</h2>
          <p className="theme-muted mt-2 max-w-xl text-[13px] leading-[1.4]">{t.command.narrativeDesc}</p>
          <div className="mt-8 space-y-3">
            {clusters.map(([title, confidence, color]) => (
              <InnerPanel key={title} className="grid min-h-[54px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-3">
                <p className="theme-text max-w-[440px] text-[13px] leading-[1.35]">{title}</p>
                <p className={`text-xs font-semibold ${color}`}>{confidence}</p>
              </InnerPanel>
            ))}
            <Link href="/intelligence" className="flex h-9 items-center justify-center rounded-[10px] border border-[#465FFF33] bg-[#465FFF14] text-[13px] font-semibold text-[#9AA8FF]">
              {t.command.openMap}
            </Link>
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[288px]">
          <h2 className="theme-text text-lg font-semibold">{t.command.alertTitle}</h2>
          <div className="mt-7 flex items-center gap-5">
            <p className="text-[44px] font-semibold leading-none text-[#F97066]">84%</p>
            <p className="theme-muted text-[13px]">{t.command.escalation}</p>
          </div>
          <p className="theme-soft mt-5 max-w-[330px] text-[13px] leading-[1.45]">{t.command.alertDesc}</p>
          <Link href="/alerts" className="mt-8 flex h-10 w-[166px] items-center justify-center rounded-lg bg-[#465FFF] text-[13px] font-semibold text-white">
            {t.command.reviewAlert}
          </Link>
        </DesignFrame>
      </div>

      <div className="grid gap-6 xl:grid-cols-[520px_272px_260px]">
        <DesignFrame className="min-h-[230px]">
          <h2 className="theme-text text-lg font-semibold">{t.command.recTitle}</h2>
          <div className="mt-7 space-y-5 text-[13px]">
            {[
              ["PR Response", "Publish evidence-backed service update with support FAQ."],
              ["Content Strategy", "Seed explainer content against competitor AI-answer gap."],
              ["Crisis Steps", "Assign owner, prepare holding statement, monitor re-share velocity."],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[116px_1fr] gap-4">
                <p className="theme-text font-semibold">{label}</p>
                <p className="theme-soft">{value}</p>
              </div>
            ))}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[230px]">
          <h2 className="theme-text text-lg font-semibold">{t.command.geoWatch}</h2>
          <p className="mt-7 text-[38px] font-semibold leading-none text-white">42%</p>
          <p className="theme-muted mt-4 max-w-[200px] text-[13px] leading-[1.4]">{t.command.geoDesc}</p>
        </DesignFrame>

        <DesignFrame className="min-h-[230px]">
          <h2 className="theme-text text-lg font-semibold">{t.command.learning}</h2>
          <p className="theme-soft mt-7 max-w-[190px] text-[13px] leading-[1.45]">{t.command.learningDesc}</p>
        </DesignFrame>
      </div>
    </div>
  );
}
