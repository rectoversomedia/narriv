"use client";

import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";

export default function IntelligencePage() {
  const t = useTranslations("Intelligence");

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <button
            type="button"
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {t("createAction")}
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_382px]">
        <DesignFrame className="flex min-h-[600px] flex-col gap-5">
          <h2 className="theme-text text-lg font-semibold">{t("map")}</h2>
          <p className="theme-muted text-[13px]">{t("mapDesc")}</p>
          <InnerPanel className="relative mt-4 min-h-[320px] overflow-hidden rounded-2xl">
            <div className="absolute left-[36%] top-[14%] h-[164px] w-[164px] rounded-full bg-[#465FFF] opacity-90" />
            <div className="absolute left-[55%] top-[36%] h-[104px] w-[104px] rounded-full bg-[#F04438] opacity-75" />
            <div className="absolute left-[18%] top-[48%] h-24 w-24 rounded-full bg-[#12B76A] opacity-70" />
            <div className="absolute left-[68%] top-[15%] h-[76px] w-[76px] rounded-full bg-[#F79009] opacity-70" />
            <p className="absolute left-[41%] top-[31%] text-2xl font-semibold text-white">{t("clusterCenter")}</p>
          </InnerPanel>
          <InnerPanel className="mt-1 min-h-[140px] rounded-2xl p-5">
            <h3 className="theme-text text-base font-semibold">{t("dominant")}</h3>
            <p className="theme-soft mt-3 max-w-[560px] text-[13px] leading-[1.45]">{t("dominantDesc")}</p>
          </InnerPanel>
        </DesignFrame>

        <DesignFrame className="flex min-h-[600px] flex-col gap-4">
          <h2 className="theme-text text-lg font-semibold">{t("detail")}</h2>
          <p className="theme-muted text-xs font-medium uppercase tracking-[0.06em]">{t("source")}</p>
          <h3 className="theme-text mt-2 text-[22px] font-semibold leading-[1.15]">{t("clusterTitle")}</h3>
          <InnerPanel className="mt-2 min-h-28 rounded-xl p-4"><p className="theme-soft text-[13px] leading-[1.45]">{t("clusterDesc")}</p></InnerPanel>
          <p className="theme-muted text-xs font-medium uppercase tracking-[0.08em]">{t("metrics")}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <InnerPanel className="min-h-[88px] rounded-xl p-4"><p className="theme-muted text-xs">{t("velocity")}</p><p className="mt-3 text-base font-semibold text-[#F97066]">+38%</p></InnerPanel>
            <InnerPanel className="min-h-[88px] rounded-xl p-4"><p className="theme-muted text-xs">{t("confidence")}</p><p className="theme-text mt-3 text-base font-semibold">94%</p></InnerPanel>
          </div>
          <InnerPanel className="mt-2 min-h-[100px] rounded-xl p-4"><p className="theme-text text-[15px] font-semibold">{t("focus")}</p><p className="theme-soft mt-2 text-[13px] leading-[1.4]">{t("focusDesc")}</p></InnerPanel>
          <button className="mt-auto h-11 w-full rounded-lg bg-[#465FFF] text-sm font-medium text-white transition-opacity hover:opacity-90" type="button">{t("open")}</button>
        </DesignFrame>
      </div>
    </div>
  );
}
