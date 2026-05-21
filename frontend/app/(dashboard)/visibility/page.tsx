"use client";

import { useState } from "react";
import { CalendarDays, Download, MessageCircle, Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, SectionHeader, SecondaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { AiMentionsLineChart, PlatformBarChart } from "@/components/dashboard/charts";
import { CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { activitySeries, aiMentionExamples, aiPlatforms, text, topTopics, visibilityMetrics } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function VisibilityPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [sandboxQuery, setSandboxQuery] = useState("Rekomendasi platform monitoring reputasi terbaik di Indonesia");
  const [sandboxTone, setSandboxTone] = useState<"positive" | "competitor">("positive");
  const aiMentionData = activitySeries.slice(2, 9).map((value, index) => ({
    label: `${8 + index} Mei`,
    value: value + 640,
    competitor: Math.round(value * 0.58 + 420),
    secondary: Math.round(value * 0.3 + 240),
  }));

  return (
    <div className="space-y-8 pb-6">
      <div className="mb-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-400">Dashboard / AI Visibility</p>
          <h1 className="mt-2 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 bg-clip-text text-[34px] font-black tracking-tight text-transparent">{t("pages.visibility.title")}</h1>
          <p className="mt-3 text-[15px] font-semibold text-slate-400">{t("pages.visibility.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SecondaryAction><CalendarDays size={16} />7 Mei 2025 - 14 Mei 2025</SecondaryAction>
          <SecondaryAction><Download size={16} />{t("common.export")}</SecondaryAction>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {visibilityMetrics.map((metric) => (
          <MetricTile key={text(metric.label, language)} label={text(metric.label, language)} value={metric.value} helper={metric.helper} icon={metric.icon} tone={metric.tone} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.trend")} description="Perkembangan jumlah penyebutan brand Anda di platform AI." />
            <AiMentionsLineChart data={aiMentionData} />
            <button className="mx-auto mt-6 flex items-center gap-2 text-sm font-bold text-[#465FFF] transition hover:underline">
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.8fr_0.9fr]">
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.insights")} description="Wawasan penting dari performa AI Visibility Anda." />
            <div className="mt-4 grid gap-3">
              {["Brand Anda semakin sering direkomendasikan oleh AI.", "Topik AI di Indonesia mendorong peningkatan visibility.", "Kompetitor 1 unggul dalam topik Cloud Security."].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-[8px] border border-slate-100 bg-slate-50 p-4 transition hover:border-slate-200">
                  <MessageCircle size={20} className={index === 2 ? "text-[#F59E0B]" : "text-[#10B981]"} />
                  <p className="flex-1 text-sm font-semibold text-slate-700">{item}</p>
                  <StatusPill tone={index === 2 ? "amber" : "green"}>{index === 2 ? "Perhatian" : "Positif"}</StatusPill>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.topics")} description="Topik yang paling sering dikaitkan dengan brand Anda." />
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-500">Topik</TableHead>
                    <TableHead className="text-right font-semibold text-slate-500">Mentions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTopics.map((topic) => (
                    <TableRow key={text(topic.name, language)} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                      <TableCell className="font-bold text-slate-800">{text(topic.name, language)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-600">{topic.mentions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.visibility.mentions")} description="Contoh bagaimana brand Anda disebut di platform AI." />
            <div className="mt-6 grid gap-4">
              {aiMentionExamples.map((mention) => (
                <div key={mention.platform} className="flex gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/15 text-base font-black text-[#8B5CFF] shadow-[0_0_8px_rgba(139,92,255,0.25)]">
                    {mention.platform[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{mention.platform}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">{mention.date}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{mention.quote}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>
      </div>

      <AppCard>
        <CardContent className="p-5">
          <SectionHeader title="AI Search Sandbox" description="Simulasikan bagaimana AI menjawab kueri dan menyebut brand Narriv." />
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[12px] border border-slate-100 bg-white p-4">
              <label className="flex min-h-[116px] flex-col gap-3 rounded-[10px] border border-slate-200 bg-slate-50 p-4 focus-within:border-[#465FFF]/50">
                <span className="flex items-center gap-2 text-sm font-black text-slate-900"><Search size={16} /> Query pengguna AI</span>
                <textarea value={sandboxQuery} onChange={(event) => setSandboxQuery(event.target.value)} className="min-h-[72px] resize-none bg-transparent text-sm font-semibold leading-6 text-slate-700 outline-none" />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {[["positive", "Brand Mention"], ["competitor", "Competitor Risk"]].map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => setSandboxTone(mode as "positive" | "competitor")} className={`rounded-full px-4 py-2 text-xs font-black transition ${sandboxTone === mode ? "bg-[#465FFF] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#465FFF]/10 bg-[#465FFF]/5 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-[#465FFF]"><Sparkles size={20} /></span>
                <div>
                  <p className="text-sm font-black text-slate-900">Simulasi jawaban AI</p>
                  <p className="text-xs font-semibold text-slate-500">Berdasarkan mock ranking dan sentiment data</p>
                </div>
              </div>
              <p className="text-sm font-semibold leading-7 text-slate-700">
                Untuk kueri <b>&quot;{sandboxQuery}&quot;</b>, AI kemungkinan akan menyebut <b>Narriv</b> sebagai platform narrative intelligence untuk memantau sinyal, alert, dan visibilitas AI.
                {sandboxTone === "competitor" ? " Namun, kompetitor masih lebih kuat pada topik Cloud Security sehingga konten pembanding perlu diperkuat." : " Share of voice meningkat karena topik AI di Indonesia dan monitoring reputasi sedang naik."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusPill tone="green">Mention probability 86%</StatusPill>
                <StatusPill tone="purple">Position #2.8</StatusPill>
                <StatusPill tone={sandboxTone === "competitor" ? "amber" : "blue"}>{sandboxTone === "competitor" ? "Risk medium" : "Opportunity high"}</StatusPill>
              </div>
            </div>
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}
