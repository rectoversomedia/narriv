"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, RefreshCcw, Settings, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppCard, IconBubble, MetricTile, SectionHeader } from "@/components/dashboard/dashboard-kit";
import { ActivityAreaChart, DonutChart, MiniSparkline, WorldActivityMap } from "@/components/dashboard/charts";
import { CardContent } from "@/components/ui/card";
import { activitySeries, alerts, dashboardMetrics, miniTopics, quickActions, sources, systemStatus, text, topTopics } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function DashboardPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [timeRange, setTimeRange] = useState("24 Jam Terakhir");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const activityData = activitySeries.map((value, index) => ({ label: `${String(index * 2).padStart(2, "0")}:00`, value }));
  const sentimentData = [
    { name: "Positif", value: 1248, tone: "green" as const },
    { name: "Netral", value: 842, tone: "blue" as const },
    { name: "Negatif", value: 361, tone: "red" as const },
  ];

  return (
    <div className="space-y-8 pb-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-2">
        <div>
          <h1 className="text-[34px] font-black tracking-tight text-slate-900 flex items-center gap-2">
            {t("pages.command.title")}
          </h1>
          <p className="mt-3 text-[15px] font-medium text-slate-400">{t("pages.command.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            type="button" 
            className="inline-flex h-[42px] items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-[0.98]"
          >
            <Settings size={16} className="text-slate-500" />
            {t("pages.command.customize")}
          </button>
          <button 
            type="button" 
            className="inline-flex h-[42px] items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-[0.98]"
          >
            <RefreshCcw size={16} className="text-slate-500 animate-spin-slow" />
            {t("pages.command.refresh")}
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardMetrics.map((metric) => (
          <MetricTile 
            key={text(metric.label, language)} 
            label={text(metric.label, language)} 
            value={metric.value}
            helper={text(metric.helper, language)} 
            icon={metric.icon} 
            tone={metric.tone} 
          />
        ))}
      </div>

      {/* Main Insights Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1.05fr_0.8fr]">
        {/* Signal Volume Trends */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader 
              title={t("pages.command.activity")} 
              description={t("pages.command.activityDesc")} 
              action={
                <div className="flex flex-wrap gap-2">
                  {["24 Jam Terakhir", "7 Hari", "30 Hari"].map((range) => (
                    <button key={range} type="button" onClick={() => setTimeRange(range)} className={`rounded-[8px] border px-3 py-2 text-xs font-bold transition-all ${timeRange === range ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                      {range}
                    </button>
                  ))}
                </div>
              } 
            />
            <ActivityAreaChart data={activityData} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {miniTopics.map((topic) => (
                <div key={topic.label} className="rounded-[8px] border border-slate-100 bg-slate-50 p-3 transition hover:border-[#465FFF]/20">
                  <p className="text-xs font-bold text-slate-400 truncate">{topic.label}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{topic.value}</p>
                  <MiniSparkline tone={topic.tone} />
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Narrative Command Map */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader 
              title={t("pages.command.map")} 
              description={t("pages.command.mapDesc")} 
              action={
                <button className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all">
                  Semua Negara <ChevronDown size={14} className="inline ml-1 text-slate-400" />
                </button>
              }
            />
            <WorldActivityMap />
          </CardContent>
        </AppCard>

        {/* Predictive Alerts */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader 
              title={t("pages.command.alerts")} 
              description="Lihat peringatan yang memerlukan perhatian." 
              action={<Link href="/alerts" className="whitespace-nowrap text-[11px] font-bold text-[#465FFF] transition-all hover:text-[#8B5CFF] hover:underline">{t("common.viewAll")}</Link>} 
            />
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex gap-3 border-b border-slate-100 pb-3.5 last:border-0 last:pb-0">
                  <IconBubble icon={Zap} tone={alert.tone} className="h-9 w-9 rounded-[8px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800">{text(alert.title, language)}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{alert.source}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{alert.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-bold text-[#465FFF] hover:text-[#465FFF] transition-all group">
              {t("common.viewAll")} 
              <ArrowRight size={16} className="transform transition-transform group-hover:translate-x-1" />
            </button>
          </CardContent>
        </AppCard>
      </div>

      {/* Extra Details Grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr_0.8fr]">
        {/* Hot Topics */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.topics")} description="Topik yang paling banyak dibicarakan" />
            <div className="space-y-2 mt-4">
              {topTopics.map((topic, index) => (
                <div key={text(topic.name, language)} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8B5CFF]/15 text-xs font-bold text-[#8B5CFF] border border-[#8B5CFF]/20">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-sm font-bold text-slate-900 truncate">{text(topic.name, language)}</p>
                  <p className="text-xs font-semibold text-slate-400">{topic.mentions}</p>
                  <p className={`text-xs font-extrabold ${topic.tone === "red" ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                    {topic.delta}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Data Sources */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.sources")} description="Status dan performa sumber data" />
            <div className="space-y-2 mt-4">
              {sources.map((source) => (
                <div key={source.name} className="grid grid-cols-[1fr_75px_60px] items-center gap-2 py-3 border-b border-slate-100 last:border-0 last:pb-0 text-sm">
                  <p className="font-bold text-slate-800 truncate">{source.name}</p>
                  <p className="text-xs font-extrabold text-[#10B981] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    {text(source.status, language)}
                  </p>
                  <p className="text-right text-xs font-bold text-slate-500">{source.signals}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>

        {/* Mentions Sentiment Visibility */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.visibility")} description="Performa visibilitas AI" />
            <DonutChart center="2.451" label="Total Mentions" data={sentimentData} />
            <div className="mt-6 grid gap-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#12B76A]" />
                  Positif
                </span>
                <b className="text-slate-900">1.248</b>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#465FFF]" />
                  Netral
                </span>
                <b className="text-slate-900">842</b>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#F04438]" />
                  Negatif
                </span>
                <b className="text-slate-900">361</b>
              </div>
            </div>
          </CardContent>
        </AppCard>

        {/* Quick Actions */}
        <AppCard>
          <CardContent className="p-5">
            <SectionHeader title={t("pages.command.quick")} description="Lakukan tindakan cepat." />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {quickActions.map((action) => { 
                const Icon = action.icon; 
                return (
                    <button 
                      key={action.key} 
                      onClick={() => setSelectedAction(action.key)}
                      className={`flex min-h-[82px] flex-col items-center justify-center gap-2.5 rounded-[8px] border transition-all text-center text-xs font-bold active:scale-[0.96] ${selectedAction === action.key ? "border-[#465FFF] bg-[#465FFF]/5 text-[#465FFF]" : "border-slate-100 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-[#465FFF]/35"}`}
                    >
                    <Icon size={22} className="text-[#465FFF] drop-shadow-[0_0_8px_rgba(70,95,255,0.4)]" />
                    <span className="px-1">{t(`quickActions.${action.key}`)}</span>
                  </button>
                ); 
              })}
            </div>
            {selectedAction ? (
              <p className="mt-4 rounded-[8px] border border-[#465FFF]/10 bg-[#465FFF]/5 px-3 py-2 text-xs font-bold text-[#465FFF]">
                Mock action aktif: {t(`quickActions.${selectedAction}`)} siap ditampilkan sebagai drawer/modal.
              </p>
            ) : null}
          </CardContent>
        </AppCard>
      </div>

      {/* System Status Banner */}
      <AppCard>
        <CardContent className="p-5">
          <SectionHeader 
            title={t("pages.command.status")} 
            action={
              <a className="text-sm font-bold text-[#465FFF] hover:underline flex items-center gap-1">
                Lihat status lengkap <ArrowRight size={16} className="inline ml-1" />
              </a>
            } 
          />
          <div className="grid gap-3 md:grid-cols-5 mt-4">
            {systemStatus.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[10px] bg-slate-50 border border-slate-100 p-4 transition hover:border-[#10B981]/25">
                <IconBubble icon={CheckCircle2} tone="green" className="h-8 w-8 rounded-full shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{item}</p>
                  <p className="text-xs font-semibold text-[#10B981]">{t("common.operational")}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}
