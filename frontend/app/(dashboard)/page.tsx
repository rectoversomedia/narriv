"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BarChart3, CheckCircle2, Radio, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createActionPlan,
  getAlerts,
  getDashboardSummary,
  type Alert,
  type ActionStrategyType,
  type DashboardSummary,
} from "@/lib/api-service";

const metricTones = [
  "text-[#465FFF]",
  "text-[#12B76A]",
  "theme-text",
  "text-[#B54708]",
] as const;

export default function DashboardPage() {
  const t = useTranslations("CommandCenter");
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAction, setIsGeneratingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [summaryData, alertData] = await Promise.all([
        getDashboardSummary(),
        getAlerts({ limit: 3, status: "open" }),
      ]);

      setSummary(summaryData);
      setAlerts(alertData?.data ?? []);
      setIsLoading(false);
    }

    void fetchData();
  }, []);

  const metrics = summary ? [
    {
      label: t("metrics.totalSignals"),
      value: String(summary.kpis.total_signals),
      delta: t("metrics.analyzed", { count: summary.kpis.analyzed_signals }),
    },
    {
      label: t("metrics.positiveSentiment"),
      value: `${summary.kpis.positive_percentage}%`,
      delta: t("metrics.negative", { count: summary.kpis.negative_percentage }),
    },
    {
      label: t("metrics.analyzedSignals"),
      value: String(summary.kpis.analyzed_signals),
      delta: t("metrics.ofTotal", { count: summary.kpis.total_signals }),
    },
    {
      label: t("metrics.neutralMixed"),
      value: `${summary.kpis.neutral_percentage + summary.kpis.mixed_percentage}%`,
      delta: t("metrics.neutral", { count: summary.kpis.neutral_percentage }),
    },
  ] : [];
  const pipelineSteps = [
    { label: t("pipeline.signals"), value: summary ? String(summary.kpis.total_signals) : "-" },
    { label: t("pipeline.issues"), value: "-" },
    { label: t("pipeline.alerts"), value: "-" },
    { label: t("pipeline.visibility"), value: "-" },
    { label: t("pipeline.actions"), value: "-" },
    { label: t("pipeline.feedback"), value: "-" },
  ];
  const latestSignal = summary?.latest_signals[0];
  const trendMax = Math.max(...(summary?.trends.map((point) => point.count) ?? [1]), 1);

  const handleCreateAction = async (strategyType: ActionStrategyType, alertId?: string) => {
    setActionError(null);
    setIsGeneratingAction(true);
    const created = await createActionPlan({ strategyType, alertId });
    setIsGeneratingAction(false);

    if (!created) {
      setActionError(t("createActionFailed"));
      return;
    }

    router.push("/action-plans");
  };

  const primaryAlert = alerts[0];
  const displaySeverity = (severity: string | null | undefined) => {
    if (severity === "high") return t("severity.high");
    if (severity === "medium") return t("severity.medium");
    if (severity === "low") return t("severity.low");
    return t("severity.clear");
  };
  const displaySentiment = (sentiment: string | null | undefined) => {
    if (sentiment === "positive") return t("sentiment.positive");
    if (sentiment === "negative") return t("sentiment.negative");
    if (sentiment === "mixed") return t("sentiment.mixed");
    return t("sentiment.neutral");
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
        action={
          <div className="theme-panel flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold">
            <Radio size={15} className="text-[#12B76A]" />
            <span className="theme-soft">{t("last7Days")}</span>
          </div>
        }
      />

      {actionError ? (
        <div className="rounded-2xl border border-[#F04438]/20 bg-[#F04438]/10 px-4 py-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[148px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : !summary ? (
        <EmptyState icon="search" title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <DesignFrame key={metric.label} className="min-h-[150px] p-5">
                <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.18em]">{metric.label}</p>
                <p className={`mt-5 text-[42px] font-semibold leading-none tracking-[-0.06em] ${metricTones[index]}`}>{metric.value}</p>
                <p className="theme-muted mt-4 text-sm font-medium">{metric.delta}</p>
              </DesignFrame>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <DesignFrame className="min-h-[420px]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#465FFF]/20 bg-[#465FFF]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#465FFF]">
                    <BarChart3 size={14} /> {t("narrativeRuleTitle")}
                  </div>
                  <h2 className="theme-text mt-5 text-[32px] font-semibold leading-[1.08] tracking-[-0.05em]">
                    {latestSignal?.title || t("narrativeTitle")}
                  </h2>
                  <p className="theme-muted mt-4 max-w-xl text-[15px] leading-7">
                    {latestSignal ? `${latestSignal.platform} · ${displaySentiment(latestSignal.sentiment)} · ${latestSignal.published_at}` : t("narrativeDesc")}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[#465FFF]/20 bg-[#465FFF]/10 p-4 text-[#465FFF]">
                  <ArrowUpRight size={24} />
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pipelineSteps.map((step, index) => (
                  <InnerPanel key={step.label} className={`p-4 ${index === 0 ? "border-[#465FFF]/25 bg-[#465FFF]/10" : ""}`}>
                    <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.16em]">{step.label}</p>
                    <p className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${index === 0 ? "text-[#465FFF]" : "theme-text"}`}>{step.value}</p>
                  </InnerPanel>
                ))}
              </div>

              <div className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--subtle-bg)] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="theme-text text-sm font-semibold">{t("narrativeRuleTitle")}</p>
                    <p className="theme-muted mt-1 text-sm leading-6">{t("narrativeRuleDesc")}</p>
                  </div>
                  <div className="hidden h-12 items-end gap-1.5 sm:flex">
                    {(summary.trends.length ? summary.trends : [{ date: "", count: 1 }]).slice(-12).map((point, index) => (
                      <span
                        key={`${point.date}-${index}`}
                        className="w-2 rounded-full bg-[#465FFF]/70"
                        style={{ height: `${Math.max(10, Math.round((point.count / trendMax) * 48))}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </DesignFrame>

            <DesignFrame className="flex min-h-[420px] flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.18em]">{t("decisionQueueLabel")}</p>
                  <h2 className="theme-text mt-3 text-[28px] font-semibold tracking-[-0.05em]">{t("alertTitle")}</h2>
                  <p className="theme-muted mt-3 text-sm leading-6">{t("alertDesc")}</p>
                </div>
                <ShieldAlert className="text-[#F97066]" size={24} />
              </div>

              <div className="my-7 rounded-[28px] border border-[#F97066]/20 bg-[#F97066]/10 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[54px] font-semibold leading-none tracking-[-0.08em] text-[#B42318] dark:text-[#FDA29B]">{alerts.length}</p>
                    <p className="theme-muted mt-2 text-sm font-medium">{t("openWarnings")}</p>
                  </div>
                  <span className="rounded-full border border-[#F97066]/25 bg-[#F97066]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#B42318] dark:text-[#FDA29B]">
                    {displaySeverity(primaryAlert?.severity)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {alerts.length ? alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => router.push(`/alerts/${alert.id}`)}
                    className="theme-panel theme-hover w-full rounded-2xl border p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="theme-text line-clamp-2 text-sm font-semibold leading-5">{alert.title}</p>
                      <span className="shrink-0 rounded-full bg-[#F97066]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B42318] dark:text-[#FDA29B]">
                        {displaySeverity(alert.severity)}
                      </span>
                    </div>
                    <p className="theme-muted mt-2 line-clamp-2 text-xs leading-5">{alert.whyItMatters ?? alert.whatHappened ?? alert.whatToDo ?? t("alertDesc")}</p>
                  </button>
                )) : (
                  <div className="theme-panel rounded-2xl border p-4">
                    <p className="theme-text text-sm font-semibold">{t("noDecisionItems")}</p>
                    <p className="theme-muted mt-2 text-xs leading-5">{t("noDecisionItemsDesc")}</p>
                  </div>
                )}
              </div>

            </DesignFrame>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <DesignFrame className="min-h-[240px]">
              <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.18em]">{t("visibilityLabel")}</p>
              <h2 className="theme-text mt-4 text-2xl font-semibold tracking-[-0.04em]">{t("geoCardTitle")}</h2>
              <p className="theme-muted mt-3 text-sm leading-6">{t("geoCardDesc")}</p>
              <button
                type="button"
                onClick={() => void handleCreateAction("content_strategy")}
                disabled={isGeneratingAction}
                className="mt-7 inline-flex h-10 items-center justify-center rounded-2xl border border-[#465FFF]/25 bg-[#465FFF]/10 px-4 text-sm font-semibold text-[#465FFF] transition-colors hover:bg-[#465FFF]/15 disabled:pointer-events-none disabled:opacity-50"
              >
                {isGeneratingAction ? t("creatingAction") : t("geoAction")}
              </button>
            </DesignFrame>

            <DesignFrame className="min-h-[240px]">
              <div className="grid gap-5 md:grid-cols-[1fr_220px] md:items-end">
                <div>
                  <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.18em]">{t("recommendationLabel")}</p>
                  <h2 className="theme-text mt-4 text-2xl font-semibold tracking-[-0.04em]">{t("recTitle")}</h2>
                  <p className="theme-muted mt-3 text-sm leading-6">{t("recDesc")}</p>
                </div>
                <InnerPanel className="p-5">
                  <CheckCircle2 size={20} className="text-[#12B76A]" />
                  <p className="theme-muted mt-4 text-[11px] font-bold uppercase tracking-[0.16em]">{t("feedback")}</p>
                  <p className="theme-text mt-2 text-3xl font-semibold tracking-[-0.05em]">{t("feedbackStats")}</p>
                  <p className="theme-muted mt-1 text-xs leading-5">{t("feedbackLabel")}</p>
                </InnerPanel>
              </div>
            </DesignFrame>
          </div>
        </>
      )}
    </div>
  );
}
