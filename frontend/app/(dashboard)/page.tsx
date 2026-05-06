"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";
import {
  getDashboardSummary,
  buildDashboardMetrics,
  type DashboardSummary,
} from "@/lib/api-service";

// Tone mapping by metric index
const metricTones = [
  "text-[#12B76A]",
  "theme-soft",
  "text-[#F97066]",
  "theme-soft",
] as const;

const pipelineSteps = [
  { label: "Temuan", tone: "blue" as const },
  { label: "Isu Utama", tone: "slate" as const },
  { label: "Peringatan Dini", tone: "slate" as const },
  { label: "Muncul di AI", tone: "slate" as const },
  { label: "Rencana Tindakan", tone: "slate" as const },
  { label: "Feedback", tone: "slate" as const },
];

const pipelineStaticCounts = ["126", "3", "84%", "42%", "3", "127"];

export default function DashboardPage() {
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  const metrics = buildDashboardMetrics(summary);

  // Live pipeline counts from API, or static placeholders
  const pipelineCounts = summary
    ? [
        String(summary.kpis.total_signals),
        "3", // cluster count not in current API
        "84%", // alert probability not in current API
        "42%", // GEO visibility gap not in current API
        "3", // action count not in current API
        "127", // learning feedback count not in current API
      ]
    : pipelineStaticCounts;

  // Alert probability from mock; backend alerts page will have real data
  const alertProbability = "84%";

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.command.title}
        description={t.command.subtitle}
        action={<div className="theme-card theme-soft hidden h-10 w-[204px] items-center justify-center rounded-lg border text-sm font-medium lg:flex">{t.common.last7Days}</div>}
      />

      {/* Metrics Row */}
      <DesignFrame className="p-0 border-white/5 backdrop-blur-xl">
        <div className="grid divide-y divide-white/5 md:grid-cols-4 md:divide-x md:divide-y-0">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="group relative overflow-hidden px-6 py-5 transition-colors hover:bg-white/[0.01]">
              <div className="absolute inset-0 bg-linear-to-br from-white/2 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <p className="theme-muted text-[11px] font-bold uppercase tracking-widest">
                {metric.label}
              </p>
              <p className="mt-3 text-[34px] font-bold tracking-tight text-white">
                {metric.value}
              </p>
              <p className={`mt-2 text-xs font-semibold tracking-wide ${metricTones[index]}`}>{metric.delta}</p>
            </div>
          ))}
        </div>
      </DesignFrame>

      {/* Primary Narrative + Decision Queue */}
      <div className="grid gap-6 xl:grid-cols-[1fr_406px]">
        <DesignFrame className="flex flex-col gap-5 border-white/5 backdrop-blur-xl">
          <div className="space-y-1">
            <h2 className="theme-text text-2xl font-bold tracking-tight">
              {t.command.narrativeTitle}
            </h2>
            <p className="theme-muted max-w-xl text-[15px] leading-relaxed">
              {t.command.narrativeDesc}
            </p>
          </div>

          {/* Pipeline Steps */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pipelineSteps.map((step, i) => (
              <InnerPanel
                key={step.label}
                className={`group flex flex-col gap-2 p-4 transition-all duration-300 hover:scale-[1.02] ${step.tone === "blue" ? "border-[#465FFF]/20 bg-linear-to-br from-[#465FFF]/10 to-transparent" : "hover:border-white/10"}`}
              >
                <p className="theme-muted text-[11px] font-bold uppercase tracking-widest">{step.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${step.tone === "blue" ? "text-[#A4BCFD]" : "text-white"}`}>
                  {pipelineCounts[i]}
                </p>
              </InnerPanel>
            ))}
          </div>

          {/* Rule Card */}
          <InnerPanel className="mt-2 flex flex-col gap-2 border-l-2 border-l-[#465FFF] p-5">
            <p className="theme-text text-[15px] font-semibold tracking-wide">{t.command.narrativeRuleTitle}</p>
            <p className="theme-muted text-[14px] leading-relaxed">{t.command.narrativeRuleDesc}</p>
          </InnerPanel>
        </DesignFrame>

        <DesignFrame className="flex flex-col gap-4 border-white/5 backdrop-blur-xl">
          <div className="space-y-1">
            <h2 className="theme-text text-2xl font-bold tracking-tight">
              {t.command.alertTitle}
            </h2>
            <p className="theme-muted text-[15px] leading-relaxed">{t.command.alertDesc}</p>
          </div>
          <p className="mt-2 bg-linear-to-r from-[#F97066] to-[#FDA29B] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
            {alertProbability}
          </p>
          <Link
            href="/action-plans"
            className="mt-auto flex h-12 items-center justify-center rounded-xl bg-linear-to-br from-[#465FFF] to-[#3B4DCD] text-[15px] font-bold tracking-wide text-white shadow-[0_0_20px_rgba(70,95,255,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(70,95,255,0.5)]"
          >
            {t.command.reviewAlert}
          </Link>
        </DesignFrame>
      </div>

      {/* GEO to Action + Structured Recommendation */}
      <div className="grid gap-6 xl:grid-cols-[1fr_542px]">
        <DesignFrame className="flex flex-col gap-4 border-white/5 backdrop-blur-xl">
          <div className="space-y-1">
            <h2 className="theme-text text-[20px] font-bold tracking-tight">{t.command.geoCardTitle}</h2>
            <p className="theme-muted text-[14px] leading-relaxed">{t.command.geoCardDesc}</p>
          </div>
          <Link
            href="/action-plans"
            className="mt-auto inline-flex h-9 w-fit items-center justify-center rounded-full border border-[#465FFF]/30 bg-[#465FFF]/10 px-5 text-[13px] font-bold tracking-wide text-[#A4BCFD] transition-all duration-300 hover:border-[#465FFF]/60 hover:bg-[#465FFF]/20"
          >
            {t.command.geoAction}
          </Link>
        </DesignFrame>

        <DesignFrame className="flex flex-col gap-5 border-white/5 backdrop-blur-xl">
          <div className="space-y-1">
            <h2 className="theme-text text-[20px] font-bold tracking-tight">{t.command.recTitle}</h2>
            <p className="theme-muted text-[14px] leading-relaxed">{t.command.recDesc}</p>
          </div>
          <div className="mt-auto grid grid-cols-[1fr_180px] gap-4">
            <div />
            <InnerPanel className="group flex flex-col gap-2 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-white/10">
              <p className="theme-muted text-[11px] font-bold uppercase tracking-widest">Feedback</p>
              <p className="text-[28px] font-bold tracking-tight text-white transition-transform group-hover:text-[#A4BCFD]">{t.command.feedbackStats}</p>
              <p className="theme-muted text-[12px] leading-tight font-medium">{t.command.feedbackLabel}</p>
            </InnerPanel>
          </div>
        </DesignFrame>
      </div>
    </div>
  );
}
