"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getVisibility } from "@/lib/api-service";

interface PromptData {
  prompt: string;
  engine: string;
  brand: string;
  competitor: string;
  brandTone: "text-[#12B76A]" | "text-[#F97066]" | "text-[#FDB022]" | "theme-soft";
  compTone: "text-[#12B76A]" | "text-[#F97066]" | "text-[#FDB022]" | "theme-soft";
}

interface GeoAction {
  title: string;
  tag: string;
  highlighted?: boolean;
}

interface VisibilityData {
  score?: number | string;
  presence?: number | string;
  presenceMentions?: number | string;
  competitor?: number | string;
  prompts?: PromptData[];
  geoActions?: GeoAction[];
}

export default function VisibilityPage() {
  const t = useTranslations("Visibility");

  const [data, setData] = useState<VisibilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getVisibility();
      setData(res as VisibilityData);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link
            href="/action-plans"
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {t("generateAction")}
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[354px_354px_1fr]">
          <Skeleton className="h-[220px] w-full" />
          <Skeleton className="h-[220px] w-full" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      ) : !data ? (
        <EmptyState
          icon="search"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[354px_354px_1fr]">
            <DesignFrame className="min-h-[220px] backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t("score")}</h2>
              <p className="theme-text mt-5 text-[64px] font-bold leading-none tracking-tight">{data.score || 0}</p>
              <p className="theme-muted mt-5 max-w-[282px] text-[14px] leading-relaxed">{t("scoreDesc")}</p>
            </DesignFrame>
            <DesignFrame className="min-h-[220px] backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t("presence")}</h2>
              <p className="theme-text mt-5 text-[54px] font-bold leading-none tracking-tight">{data.presence || 0}%</p>
              <p className="theme-muted mt-5 max-w-[282px] text-[14px] leading-relaxed">{t("presenceDescPrefix")} <span className="theme-text font-semibold">{data.presenceMentions || 0}</span> {t("presenceDescSuffix")}</p>
            </DesignFrame>
            <DesignFrame className="min-h-[220px] backdrop-blur-xl">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t("competitor")}</h2>
              <p className="mt-5 bg-linear-to-r from-[#F97066] to-[#FDA29B] bg-clip-text text-[54px] font-extrabold tracking-tight text-transparent">{data.competitor || 0}%</p>
              <p className="theme-muted mt-5 max-w-[270px] text-[14px] leading-relaxed">{t("competitorDesc")}</p>
            </DesignFrame>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_376px]">
            <DesignFrame className="min-h-[360px] p-0 backdrop-blur-xl">
              <div className="p-7 pb-0">
                <h2 className="theme-text text-xl font-bold tracking-tight">{t("prompts")}</h2>
                <div className="theme-muted mt-6 hidden text-[11px] font-bold uppercase tracking-widest md:grid md:grid-cols-[1fr_92px_76px_90px]">
                  <span>{t("prompt")}</span>
                  <span>{t("engine")}</span>
                  <span>{t("brand")}</span>
                  <span>{t("competitorColumn")}</span>
                </div>
              </div>
              <div className="mt-2 divide-y divide-[var(--border)]">
                {data.prompts && data.prompts.length ? data.prompts.map((p: PromptData, i: number) => (
                  <div key={i} className="theme-row-hover group grid min-h-[64px] gap-2 px-7 py-4 text-[14px] transition-colors md:grid-cols-[1fr_92px_76px_90px] md:items-center">
                    <p className="theme-text font-medium">{p.prompt}</p>
                    <p className="theme-muted">{p.engine}</p>
                    <p className={`font-semibold tracking-wide ${p.brandTone}`}>{p.brand}</p>
                    <p className={`font-medium ${p.compTone}`}>{p.competitor}</p>
                  </div>
                )) : (
                  <p className="theme-muted px-7 pb-6 text-sm">{t("noPrompts")}</p>
                )}
              </div>
            </DesignFrame>

            <DesignFrame className="min-h-[360px] backdrop-blur-xl">
              <div className="space-y-1">
                <h2 className="theme-text text-xl font-bold tracking-tight">{t("geoAction")}</h2>
                <p className="theme-muted text-[14px] leading-relaxed">{t("geoDesc")}</p>
              </div>
              <div className="mt-8 space-y-3">
                {data.geoActions && data.geoActions.length ? data.geoActions.map((action: GeoAction, i: number) =>
                  action.highlighted ? (
                    <Link
                      key={i}
                      href="/action-plans"
                      className="group flex min-h-[64px] items-center justify-center rounded-xl bg-linear-to-br from-[#465FFF] to-[#3B4DCD] px-6 text-[14px] font-bold tracking-wide text-white shadow-[0_0_20px_rgba(70,95,255,0.2)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(70,95,255,0.4)]"
                    >
                      {t("visibilityGapAction")}
                    </Link>
                  ) : (
                    <InnerPanel key={i} className="grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors">
                      <p className="theme-text max-w-[240px] text-[14px] font-medium">{action.title}</p>
                      <p className="theme-accent text-[12px] font-bold tracking-wide">{action.tag}</p>
                    </InnerPanel>
                  )
                ) : (
                  <p className="theme-muted text-sm">{t("noActions")}</p>
                )}
              </div>
            </DesignFrame>
          </div>

          <div className="theme-soft rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45]">
            {t("footer")}
          </div>
        </>
      )}
    </div>
  );
}
