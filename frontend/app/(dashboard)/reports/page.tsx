"use client";

import { useState } from "react";
import { CalendarClock, Download, FileText, Mail, PlayCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, PageTitle, PrimaryAction, ProgressBar, SecondaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reportVault, reports, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function ReportsPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [selectedReport, setSelectedReport] = useState(reportVault[0]);

  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.reports.title")} description={t("pages.reports.desc")} action={<PrimaryAction><FileText size={16} />Generate Report</PrimaryAction>} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Templates" value="8" helper="3 ready" icon={FileText} tone="blue" />
        <MetricTile label="Ready" value="4" helper="Executive review" icon={Download} tone="green" />
        <MetricTile label="Scheduled" value="7" helper="Weekly cadence" icon={Mail} tone="purple" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <AppCard>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Document Vault</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Laporan harian, mingguan, dan laporan krisis khusus.</p>
              </div>
              <SecondaryAction><CalendarClock size={16} />Automated Scheduling</SecondaryAction>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {reportVault.map((report) => (
                <button key={report.name} type="button" onClick={() => setSelectedReport(report)} className={`rounded-[14px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${selectedReport.name === report.name ? "border-[#465FFF] bg-[#465FFF]/5" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#465FFF]/10 text-[#465FFF]"><FileText size={20} /></span>
                    <StatusPill tone={report.tone}>{report.status}</StatusPill>
                  </div>
                  <h3 className="mt-4 text-base font-black leading-6 text-slate-900">{report.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{report.type} · {report.cadence}</p>
                  <div className="mt-4"><ProgressBar value={report.readiness} tone={report.tone} /></div>
                  <p className="mt-2 text-xs font-bold text-slate-500">{report.readiness}% readiness</p>
                </button>
              ))}
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Report Preview</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">CTA ekspor dan share untuk stakeholder.</p>
            <div className="mt-5 rounded-[12px] border border-slate-100 bg-white p-4">
              <StatusPill tone={selectedReport.tone}>{selectedReport.type}</StatusPill>
              <h3 className="mt-4 text-xl font-black text-slate-900">{selectedReport.name}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Mencakup ringkasan eksekutif, sinyal utama, predictive alerts, AI visibility, dan rekomendasi action center.</p>
              <div className="mt-5 grid gap-2">
                {["Executive Summary", "Risk Movement", "Recommended Actions"].map((section) => (
                  <div key={section} className="flex items-center justify-between rounded-[8px] bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    {section}<span className="text-[#10B981]">Ready</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <Button className="h-10 rounded-[8px] bg-[#465FFF] text-white hover:bg-[#3B20EA]"><Download size={16} />Export PDF</Button>
              <Button variant="outline" className="h-10 rounded-[8px] border-slate-200 bg-slate-50"><Send size={16} />Share to Management</Button>
              <Button variant="outline" className="h-10 rounded-[8px] border-slate-200 bg-slate-50"><PlayCircle size={16} />Preview Slide</Button>
            </div>
          </CardContent>
        </AppCard>
      </div>

      <AppCard>
        <CardContent className="p-5">
          <h2 className="mb-5 text-[20px] font-bold tracking-tight text-slate-900">Report Queue</h2>
          <div className="grid gap-3">
            {reports.map((report) => (
              <div key={text(report.title, language)} className="grid gap-4 rounded-[12px] border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_220px_160px_120px] md:items-center">
                <div>
                  <p className="font-bold text-slate-900">{text(report.title, language)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">{report.sections}</p>
                </div>
                <ProgressBar value={report.readiness} tone={report.readiness > 85 ? "green" : "purple"} />
                <StatusPill tone={report.readiness > 85 ? "green" : "amber"}>{text(report.status, language)}</StatusPill>
                <SecondaryAction className="h-10"><Download size={14} />Export</SecondaryAction>
              </div>
            ))}
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}
