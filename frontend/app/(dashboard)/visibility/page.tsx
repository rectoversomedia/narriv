"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getVisibility } from "@/lib/api-service";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

interface PromptData {
  prompt: string;
  engine: string;
  brand: string;
  competitor: string;
  brandTone: "text-[#12B76A]" | "text-[#F97066]" | "text-[#FDB022]" | "text-[#D0D5DD]";
  compTone: "text-[#12B76A]" | "text-[#F97066]" | "text-[#FDB022]" | "text-[#D0D5DD]";
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
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

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
        title={t.visibility.title}
        description={t.visibility.subtitle}
        action={
          <Link
            href="/action-plans"
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {t.common.generateAction}
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
          title="No Visibility Data Available"
          description="We are currently gathering data from AI search engines to measure your brand's narrative presence. Please check back later."
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[354px_354px_1fr]">
            <DesignFrame className="min-h-[220px] border-white/5 backdrop-blur-xl transition-all hover:border-white/10">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t.visibility.score}</h2>
              <p className="mt-5 text-[64px] font-bold leading-none text-white tracking-tight">{data.score || 0}</p>
              <p className="theme-muted mt-5 max-w-[282px] text-[14px] leading-relaxed">Composite score from brand mentions, citation quality, competitor displacement, and prompt coverage.</p>
            </DesignFrame>
            <DesignFrame className="min-h-[220px] border-white/5 backdrop-blur-xl transition-all hover:border-white/10">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t.visibility.presence}</h2>
              <p className="mt-5 text-[54px] font-bold leading-none text-white tracking-tight">{data.presence || 0}%</p>
              <p className="theme-muted mt-5 max-w-[282px] text-[14px] leading-relaxed">Brand mentioned in <span className="font-semibold text-white">{data.presenceMentions || 0}</span> priority answer prompts.</p>
            </DesignFrame>
            <DesignFrame className="min-h-[220px] border-white/5 backdrop-blur-xl transition-all hover:border-white/10">
              <h2 className="theme-text text-xl font-bold tracking-tight">{t.visibility.competitor}</h2>
              <p className="mt-5 bg-linear-to-r from-[#F97066] to-[#FDA29B] bg-clip-text text-[54px] font-extrabold tracking-tight text-transparent">{data.competitor || 0}%</p>
              <p className="theme-muted mt-5 max-w-[270px] text-[14px] leading-relaxed">Competitors appear more frequently in AI answers for crisis-management and monitoring prompts.</p>
            </DesignFrame>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_376px]">
            <DesignFrame className="min-h-[360px] border-white/5 backdrop-blur-xl p-0">
              <div className="p-7 pb-0">
                <h2 className="theme-text text-xl font-bold tracking-tight">{t.visibility.prompts}</h2>
                <div className="theme-muted mt-6 hidden text-[11px] font-bold uppercase tracking-widest md:grid md:grid-cols-[1fr_92px_76px_90px]">
                  <span>{t.visibility.prompt}</span>
                  <span>{t.visibility.engine}</span>
                  <span>{t.visibility.brand}</span>
                  <span>Competitor</span>
                </div>
              </div>
              <div className="mt-2 divide-y divide-white/5">
                {data.prompts && data.prompts.length ? data.prompts.map((p: PromptData, i: number) => (
                  <div key={i} className="group grid min-h-[64px] gap-2 px-7 py-4 text-[14px] transition-colors hover:bg-white/1 md:grid-cols-[1fr_92px_76px_90px] md:items-center">
                    <p className="theme-text font-medium">{p.prompt}</p>
                    <p className="theme-muted">{p.engine}</p>
                    <p className={`font-semibold tracking-wide ${p.brandTone}`}>{p.brand}</p>
                    <p className={`font-medium ${p.compTone}`}>{p.competitor}</p>
                  </div>
                )) : (
                  <p className="theme-muted px-7 pb-6 text-sm">No prompts analyzed yet.</p>
                )}
              </div>
            </DesignFrame>

            <DesignFrame className="min-h-[360px] border-white/5 backdrop-blur-xl">
              <div className="space-y-1">
                <h2 className="theme-text text-xl font-bold tracking-tight">{t.visibility.geoAction}</h2>
                <p className="theme-muted text-[14px] leading-relaxed">{t.visibility.geoDesc}</p>
              </div>
              <div className="mt-8 space-y-3">
                {data.geoActions && data.geoActions.length ? data.geoActions.map((action: GeoAction, i: number) =>
                  action.highlighted ? (
                    <Link
                      key={i}
                      href="/action-plans"
                      className="group flex min-h-[64px] items-center justify-center rounded-xl bg-linear-to-br from-[#465FFF] to-[#3B4DCD] px-6 text-[14px] font-bold tracking-wide text-white shadow-[0_0_20px_rgba(70,95,255,0.2)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(70,95,255,0.4)]"
                    >
                      {language === "id" ? "Buat action plan dari gap visibility" : action.title}
                    </Link>
                  ) : (
                    <InnerPanel key={i} className="grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:border-white/10">
                      <p className="theme-text max-w-[240px] text-[14px] font-medium">{action.title}</p>
                      <p className="text-[12px] font-bold tracking-wide text-[#A4BCFD]">{action.tag}</p>
                    </InnerPanel>
                  )
                ) : (
                  <p className="theme-muted text-sm">No recommended actions available.</p>
                )}
              </div>
            </DesignFrame>
          </div>

          <div className="rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45] text-[#D0D5DD]">
            {t.visibility.footer}
          </div>
        </>
      )}
    </div>
  );
}
