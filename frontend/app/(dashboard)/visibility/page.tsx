"use client";

import { CalendarDays, Download, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, SectionHeader, StatusPill } from "@/components/dashboard/dashboard-kit";
import { AiMentionsLineChart, PlatformBarChart } from "@/components/dashboard/charts";
import { CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { activitySeries, aiPlatforms, text, topTopics, visibilityMetrics } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function VisibilityPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const aiMentionData = activitySeries.slice(2, 9).map((value, index) => ({
    label: `${8 + index} Mei`,
    value: value + 640,
    competitor: Math.round(value * 0.58 + 420),
    secondary: Math.round(value * 0.3 + 240),
  }));

  return (
    <div className="space-y-8 pb-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-400">Dashboard / AI Visibility</p>
          <h1 className="mt-2 text-[34px] font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800">{t("pages.visibility.title")}</h1>
          <p className="mt-3 text-[15px] font-semibold text-slate-400">{t("pages.visibility.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex h-[42px] items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-all">
            <CalendarDays size={16} className="text-slate-500" />
            7 Mei 2025 - 14 Mei 2025
          </button>
          <button className="inline-flex h-[42px] items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-all">
            <Download size={16} className="text-slate-500" />
            {t("common.export")}
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {visibilityMetrics.map((metric) => (
          <MetricTile 
            key={text(metric.label, language)} 
            label={text(metric.label, language)} 
            value={metric.value} 
            helper={metric.helper} 
            icon={metric.icon} 
            tone={metric.tone} 
          />
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.trend")} description="Perkembangan jumlah penyebutan brand Anda di platform AI." />
            <AiMentionsLineChart data={aiMentionData} />
            <button className="mx-auto mt-6 flex items-center gap-2 text-sm font-bold text-[#465FFF] hover:text-[#465FFF] hover:underline transition-all">
              Lihat analisis lengkap
            </button>
          </CardContent>
        </AppCard>
        
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.platform")} description="Platform AI tempat brand Anda paling sering disebut." />
            <div className="mt-6"><PlatformBarChart data={aiPlatforms} /></div>
          </CardContent>
        </AppCard>
      </div>

      {/* Insight details */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.8fr_0.9fr]">
        {/* Insights list */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.insights")} description="Wawasan penting dari performa AI Visibility Anda." />
            <div className="space-y-3 mt-4">
              {["Brand Anda semakin sering direkomendasikan oleh AI.", "Topik AI di Indonesia mendorong peningkatan visibility.", "Kompetitor 1 unggul dalam topik Cloud Security."].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-[8px] border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200">
                  <MessageCircle size={20} className={index === 2 ? "text-[#F59E0B]" : "text-[#10B981]"} />
                  <p className="flex-1 text-sm font-semibold text-slate-700">{item}</p>
                  <StatusPill tone={index === 2 ? "amber" : "green"}>
                    {index === 2 ? "Perhatian" : "Positif"}
                  </StatusPill>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Topics Table */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.topics")} description="Topik yang paling sering dikaitkan dengan brand Anda." />
            <div className="mt-4 border border-slate-100 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-semibold">Topik</TableHead>
                    <TableHead className="text-slate-500 font-semibold text-right">Mentions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTopics.map((topic) => (
                    <TableRow key={text(topic.name, language)} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                      <TableCell className="font-bold text-slate-800">{text(topic.name, language)}</TableCell>
                      <TableCell className="text-right text-slate-600 font-semibold">{topic.mentions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </AppCard>

        {/* Brand Mention examples */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.mentions")} description="Contoh bagaimana brand Anda disebut di platform AI." />
            <div className="space-y-4 mt-6">
              {["ChatGPT", "Google Gemini", "Perplexity"].map((name) => (
                <div key={name} className="flex gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/20 font-black text-base shadow-[0_0_8px_rgba(139,92,255,0.25)]">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Narriv adalah platform intelligence yang membantu organisasi memantau sinyal dan menganalisis data...
                    </p>
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
