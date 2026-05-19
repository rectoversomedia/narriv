"use client";

import { Download, FileText, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, PageTitle, ProgressBar, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reports, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function ReportsPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.reports.title")} description={t("pages.reports.desc")} />
      
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Templates" value="8" helper="3 ready" icon={FileText} tone="blue" />
        <MetricTile label="Ready" value="4" helper="Executive review" icon={Download} tone="green" />
        <MetricTile label="Scheduled" value="7" helper="Weekly cadence" icon={Mail} tone="purple" />
      </div>
      
      {/* Reports Queue */}
      <AppCard>
        <CardContent className="p-5">
          <h2 className="mb-5 text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.reports.queue")}</h2>
          
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-500 font-semibold py-4">Report</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Sections</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Readiness</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Status</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={text(report.title, language)} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                    <TableCell className="font-bold text-slate-900 py-4 max-w-[280px] truncate">{text(report.title, language)}</TableCell>
                    <TableCell className="text-slate-600 py-4">{report.sections}</TableCell>
                    <TableCell className="min-w-[180px] py-4">
                      <ProgressBar value={report.readiness} tone={report.readiness > 85 ? "green" : "purple"} />
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusPill tone={report.readiness > 85 ? "green" : "amber"}>{text(report.status, language)}</StatusPill>
                    </TableCell>
                    <TableCell className="py-4">
                      <button className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-[0.98]">
                        <Download size={14} className="text-slate-500" />
                        {t("common.export")}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}
