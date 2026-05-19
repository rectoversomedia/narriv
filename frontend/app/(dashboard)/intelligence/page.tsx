"use client";

import { BrainCircuit, Network, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, IconBubble, MetricTile, PageTitle, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { intelligenceClusters, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function IntelligencePage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.intelligence.title")} description={t("pages.intelligence.desc")} />
      
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Clusters" value="14" helper="4 accelerating" icon={Network} tone="purple" />
        <MetricTile label="Confidence" value="89%" helper="Evidence weighted" icon={BrainCircuit} tone="blue" />
        <MetricTile label="Opportunities" value="3" helper="New positive gaps" icon={Sparkles} tone="green" />
      </div>

      {/* Map & Clusters Detail Section */}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Visual Map */}
        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.intelligence.map")}</h2>
            
            <div className="relative mt-5 min-h-[520px] overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50">
              {/* Sci-fi Radar Scanning lines */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(70,95,255,0.08)_0%,transparent_70%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
              
              {/* Cyberpunk Map Center Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[360px] h-[360px] border border-dashed border-slate-100 rounded-full animate-spin-slow opacity-30" />
                <div className="w-[180px] h-[180px] border border-dashed border-slate-200 rounded-full animate-spin-reverse-slow opacity-40" />
              </div>

              {/* Floating Nodes */}
              {intelligenceClusters.map((cluster, index) => (
                <div 
                  key={text(cluster.topic, language)} 
                  className="soft-float absolute flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#465FFF]/20 bg-slate-50/90 text-center shadow-[0_0_15px_rgba(70,95,255,0.1)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#8B5CFF] hover:shadow-[0_0_25px_rgba(139,92,255,0.25)] hover:z-10 cursor-pointer" 
                  style={{ 
                    left: `${26 + index * 18}%`, 
                    top: `${36 + (index % 2) * 24 + Math.sin(index) * 6}%`,
                    animationDelay: `${index * 0.4}s`
                  }}
                >
                  {/* Glowing core indicator */}
                  <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-[#465FFF] border border-slate-300 animate-pulse shadow-[0_0_8px_#465FFF]" />
                  
                  <p className="text-sm font-bold text-slate-900 px-2 leading-tight">{text(cluster.topic, language)}</p>
                  <p className="mt-1.5 text-xs font-semibold text-slate-400">{cluster.signals} signals</p>
                  
                  {/* Small growth pill */}
                  <span className="mt-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-[#10B981] border border-[#10B981]/25">
                    {cluster.growth}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Intelligence clusters list */}
        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.intelligence.clusters")}</h2>
            
            <div className="mt-5 space-y-3.5">
              {intelligenceClusters.map((cluster) => (
                <div 
                  key={text(cluster.topic, language)} 
                  className="flex gap-4 rounded-[10px] border border-slate-100 bg-slate-50 p-4 transition-all hover:border-slate-200 hover:bg-white/[0.03]"
                >
                  <IconBubble icon={Network} tone={cluster.tone} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{text(cluster.topic, language)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-400">{cluster.signals} signals</p>
                  </div>
                  <div className="flex items-center shrink-0">
                    <StatusPill tone={cluster.tone}>{cluster.growth}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>
      </div>
    </div>
  );
}
