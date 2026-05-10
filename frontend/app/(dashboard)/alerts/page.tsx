"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import {
  createActionPlan,
  getAlerts,
  updateAlertStatus,
  buildAlertItems,
} from "@/lib/api-service";

type AlertItem = {
  id: string;
  title: string;
  metric: string;
  detail: string;
  tone: string;
  status: string;
};

export default function AlertsPage() {
  const t = useTranslations("Alerts");
  const router = useRouter();
  const [alertItems, setAlertItems] = useState<AlertItem[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [creatingActionId, setCreatingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const flow = [
    [t("flowSteps.recommendTitle"), t("flowSteps.recommendDesc")],
    [t("flowSteps.feedbackTitle"), t("flowSteps.feedbackDesc")],
    [t("flowSteps.scoreTitle"), t("flowSteps.scoreDesc")],
    [t("flowSteps.improveTitle"), t("flowSteps.improveDesc")],
    [t("flowSteps.betterTitle"), t("flowSteps.betterDesc")],
  ];

  useEffect(() => {
    getAlerts({ limit: 10 }).then((res) => {
      setAlertItems(res ? buildAlertItems(res.data) : []);
    });
  }, []);

  const handleStatusChange = async (id: string, status: "acknowledged" | "resolved") => {
    const updated = await updateAlertStatus(id, status);
    if (updated) {
      setAlertItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a))
      );
    }
  };

  const handleCreateAction = async (alertId: string) => {
    setActionError(null);
    setCreatingActionId(alertId);
    const created = await createActionPlan({ strategyType: "crisis_response", alertId });
    setCreatingActionId(null);

    if (!created) {
      setActionError(t("createActionFailed"));
      return;
    }

    router.push("/action-plans");
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <button
            type="button"
            onClick={() => setReviewed(true)}
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {reviewed ? t("reviewed") : t("learningQueue")}
          </button>
        }
      />

      {actionError ? (
        <div className="rounded-lg border border-[#F04438]/20 bg-[#F04438]/10 px-4 py-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_416px]">
        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t("queue")}</h2>
          <div className="mt-7 space-y-3">
            {alertItems.length ? alertItems.map((item) => (
              <div key={item.id} className="block">
                <InnerPanel className="min-h-[76px] px-4 py-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <p className="theme-text max-w-[360px] text-sm font-semibold">{item.title}</p>
                    <p className={`text-[13px] font-semibold ${item.tone}`}>{item.metric}</p>
                  </div>
                  <p className="theme-muted mt-2 text-xs">{item.detail}</p>
                  {item.status === "open" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "acknowledged")}
                        className="rounded-md bg-[#465FFF] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                      >
                        {t("acknowledge")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "resolved")}
                        className="rounded-md border border-[#465FFF33] px-3 py-1 text-xs font-semibold text-[#465FFF] hover:border-[#465FFF55]"
                      >
                        {t("resolve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateAction(item.id)}
                        disabled={creatingActionId === item.id}
                        className="rounded-md border border-[#465FFF33] bg-[#465FFF0F] px-3 py-1 text-xs font-semibold text-[#465FFF] hover:border-[#465FFF55] disabled:pointer-events-none disabled:opacity-50"
                      >
                        {creatingActionId === item.id ? t("creatingAction") : t("createAction")}
                      </button>
                    </div>
                  )}
                  {item.status !== "open" && (
                    <span className="mt-2 inline-block rounded-full border border-[#12B76A]/30 bg-[#12B76A]/10 px-3 py-0.5 text-xs font-semibold text-[#027A48]">
                      {item.status}
                    </span>
                  )}
                </InnerPanel>
              </div>
            )) : <p className="theme-muted text-sm">{t("noAlerts")}</p>}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t("scoring")}</h2>
          <p className="mt-8 text-[58px] font-semibold leading-none text-[#12B76A]">-</p>
          <p className="theme-muted mt-5 max-w-[330px] text-[13px] leading-[1.45]">
            {t("scoringDesc")}
          </p>
          <div className="mt-12 grid grid-cols-3 gap-5">
            {[[t("accepted"), "-"], [t("edited"), "-"], [t("rejected"), "-"]].map(
              ([label, value]) => (
                <div key={label}>
                  <p className="theme-muted text-xs font-semibold">{label}</p>
                  <p className="theme-text mt-2 text-[28px] font-semibold">{value}</p>
                </div>
              )
            )}
          </div>
          <button
            onClick={() => setReviewed(true)}
            className="mt-6 rounded-lg bg-[#465FFF] px-4 py-2 text-[13px] font-semibold text-white"
            type="button"
          >
            {reviewed ? t("reviewed") : t("learningQueue")}
          </button>
        </DesignFrame>
      </div>

      <DesignFrame className="min-h-[204px]">
        <h2 className="theme-text text-lg font-semibold">{t("flow")}</h2>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {flow.map(([title, detail], index) => (
            <div
              key={title}
              className={`flex min-h-[82px] flex-col gap-2 rounded-xl border p-4 ${index === 4 ? "border-[#465FFF33] bg-[#465FFF14]" : "theme-panel"}`}
            >
              <p className="theme-text text-sm font-semibold">{title}</p>
              <p className={`text-xs leading-[1.35] ${index === 4 ? "text-[#465FFF]" : "theme-muted"}`}>
                {detail}
              </p>
            </div>
          ))}
        </div>
      </DesignFrame>

      <div className="theme-soft rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45]">
        {t("footer")}
      </div>
    </div>
  );
}
