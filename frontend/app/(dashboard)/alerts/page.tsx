"use client";

import { useEffect, useState } from "react";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";
import {
  getAlerts,
  updateAlertStatus,
  buildAlertItems,
  getMockAlertItems,
} from "@/lib/api-service";

type AlertItem = {
  id: string;
  title: string;
  metric: string;
  detail: string;
  tone: string;
  status: string;
};

const flow = [
  ["1. Recommend", "AI proposes action from narrative evidence."],
  ["2. Human feedback", "Accept, edit, reject, and explain why."],
  ["3. Score prompt", "Quality signal updates prompt scoring."],
  ["4. Improve model", "Ranking, tone, evidence fit improve."],
  ["5. Better alerts", "Future recommendations get sharper."],
];

export default function AlertsPage() {
  const [alertItems, setAlertItems] = useState<AlertItem[]>(getMockAlertItems());
  const [isLive, setIsLive] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  useEffect(() => {
    getAlerts({ limit: 10 }).then((res) => {
      if (res && res.data.length > 0) {
        setAlertItems(buildAlertItems(res.data));
        setIsLive(true);
      }
      // Keep mock data if backend is down
    });
  }, []);

  const handleStatusChange = async (id: string, status: "acknowledged" | "resolved") => {
    if (!isLive) return; // No-op for demo/mock items
    const updated = await updateAlertStatus(id, status);
    if (updated) {
      setAlertItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a))
      );
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.alerts.title}
        description={t.alerts.subtitle}
        action={
          <button
            type="button"
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {t.common.learningQueue}
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_416px]">
        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t.alerts.queue}</h2>
          {!isLive && (
            <p className="mt-1 text-xs text-[#FDB022]">Demo data — connect backend to see live alerts</p>
          )}
          <div className="mt-7 space-y-3">
            {alertItems.map((item) => (
              <div key={item.id} className="block">
                <InnerPanel className="min-h-[76px] px-4 py-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <p className="theme-text max-w-[360px] text-sm font-semibold">{item.title}</p>
                    <p className={`text-[13px] font-semibold ${item.tone}`}>{item.metric}</p>
                  </div>
                  <p className="theme-muted mt-2 text-xs">{item.detail}</p>
                  {isLive && item.status === "open" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "acknowledged")}
                        className="rounded-md bg-[#465FFF] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "resolved")}
                        className="rounded-md border border-[#465FFF33] px-3 py-1 text-xs font-semibold text-[#9AA8FF] hover:border-[#465FFF55]"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                  {isLive && item.status !== "open" && (
                    <span className="mt-2 inline-block rounded-full border border-[#12B76A]/30 bg-[#12B76A]/10 px-3 py-0.5 text-xs font-semibold text-[#6CE9A6]">
                      {item.status}
                    </span>
                  )}
                </InnerPanel>
              </div>
            ))}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t.alerts.scoring}</h2>
          <p className="mt-8 text-[58px] font-semibold leading-none text-[#12B76A]">+8.4</p>
          <p className="theme-muted mt-5 max-w-[330px] text-[13px] leading-[1.45]">
            {t.alerts.scoringDesc}
          </p>
          <div className="mt-12 grid grid-cols-3 gap-5">
            {[[t.alerts.accepted, "81"], [t.alerts.edited, "34"], [t.alerts.rejected, "12"]].map(
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
            {reviewed ? t.alerts.reviewed : t.common.learningQueue}
          </button>
        </DesignFrame>
      </div>

      <DesignFrame className="min-h-[204px]">
        <h2 className="theme-text text-lg font-semibold">{t.alerts.flow}</h2>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {flow.map(([title, detail], index) => (
            <div
              key={title}
              className={`flex min-h-[82px] flex-col gap-2 rounded-xl border p-4 ${index === 4 ? "border-[#465FFF33] bg-[#465FFF14]" : "theme-panel"}`}
            >
              <p className="theme-text text-sm font-semibold">{title}</p>
              <p className={`text-xs leading-[1.35] ${index === 4 ? "text-[#9AA8FF]" : "theme-muted"}`}>
                {detail}
              </p>
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
