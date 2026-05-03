"use client";

import Link from "next/link";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";

const prompts = [
  ["best platform for narrative risk monitoring", "ChatGPT", "Yes", "Low", "text-[#12B76A]", "text-[#D0D5DD]"],
  ["social listening tool for reputation crisis", "Gemini", "No", "High", "text-[#F97066]", "text-[#F97066]"],
  ["enterprise communications intelligence dashboard", "Perplexity", "Partial", "Medium", "text-[#FDB022]", "text-[#FDB022]"],
];

export default function VisibilityPage() {
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t.visibility.title}
        description={t.visibility.subtitle}
      />

      <div className="grid gap-6 xl:grid-cols-[354px_354px_344px]">
        <DesignFrame className="min-h-[220px]">
          <h2 className="theme-text text-lg font-semibold">{t.visibility.score}</h2>
          <p className="mt-5 text-[64px] font-semibold leading-none">78</p>
          <p className="theme-muted mt-5 max-w-[282px] text-[13px] leading-[1.45]">Composite score from brand mentions, citation quality, competitor displacement, and prompt coverage.</p>
        </DesignFrame>
        <DesignFrame className="min-h-[220px]">
          <h2 className="theme-text text-lg font-semibold">{t.visibility.presence}</h2>
          <p className="mt-5 text-[54px] font-semibold leading-none">42%</p>
          <p className="theme-muted mt-5 max-w-[282px] text-[13px] leading-[1.45]">Brand mentioned in 34 of 81 priority answer prompts. Owned citations appear in 18.</p>
        </DesignFrame>
        <DesignFrame className="min-h-[220px]">
          <h2 className="theme-text text-lg font-semibold">{t.visibility.competitor}</h2>
          <p className="mt-5 text-[54px] font-semibold leading-none text-[#F97066]">61%</p>
          <p className="theme-muted mt-5 max-w-[270px] text-[13px] leading-[1.45]">Competitors appear more frequently in AI answers for crisis-management and monitoring prompts.</p>
        </DesignFrame>
      </div>

      <div className="grid gap-6 xl:grid-cols-[700px_376px]">
        <DesignFrame className="min-h-[360px]">
          <h2 className="theme-text text-lg font-semibold">{t.visibility.prompts}</h2>
          <p className="theme-muted mt-6 hidden text-[11px] font-semibold uppercase tracking-[0.04em] md:grid md:grid-cols-[1fr_92px_76px_90px]">
            <span>{t.visibility.prompt}</span><span>{t.visibility.engine}</span><span>{t.visibility.brand}</span><span>Competitor</span>
          </p>
          <div className="mt-4 space-y-3">
            {prompts.map(([prompt, engine, brand, competitor, brandTone, compTone]) => (
              <InnerPanel key={prompt} className="grid min-h-[54px] gap-2 px-4 py-4 text-[13px] md:grid-cols-[1fr_92px_76px_90px] md:items-center">
                <p className="theme-text">{prompt}</p>
                <p className="theme-soft">{engine}</p>
                <p className={`font-semibold ${brandTone}`}>{brand}</p>
                <p className={compTone}>{competitor}</p>
              </InnerPanel>
            ))}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[360px]">
          <h2 className="theme-text text-lg font-semibold">{t.visibility.geoAction}</h2>
          <p className="theme-muted mt-3 max-w-[300px] text-[13px] leading-[1.4]">{t.visibility.geoDesc}</p>
          <div className="mt-8 space-y-3">
            {[
              ["Publish comparison-neutral explainer page", "SEO"],
              ["Add owned citations to AI-friendly docs", "GEO"],
            ].map(([title, tag]) => (
              <InnerPanel key={title} className="grid min-h-[62px] grid-cols-[1fr_auto] items-center gap-4 px-4 py-3">
                <p className="theme-text max-w-[240px] text-[13px] font-semibold">{title}</p>
                <p className="text-xs font-semibold text-[#9AA8FF]">{tag}</p>
              </InnerPanel>
            ))}
            <Link href="/action-plans" className="flex min-h-[62px] items-center justify-center rounded-[10px] border border-[#465FFF33] bg-[#465FFF14] text-[13px] font-semibold text-[#9AA8FF]">
              {language === "id" ? "Buat action plan dari gap visibility" : "Create action plan from visibility gap"}
            </Link>
          </div>
        </DesignFrame>
      </div>

      <div className="rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45] text-[#D0D5DD]">
        {t.visibility.footer}
      </div>
    </div>
  );
}
