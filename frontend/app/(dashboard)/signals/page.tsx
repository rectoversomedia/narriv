"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, PageTitle, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signals, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function SignalsPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.signals.title")} description={t("pages.signals.desc")} />
      
      <AppCard>
        <CardContent className="p-5">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white/[0.01] p-4 rounded-lg border border-slate-100">
            <div>
              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.signals.table")}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">{t("pages.signals.tableDesc")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-slate-500 focus-within:border-[#465FFF]/50 focus-within:text-slate-900 transition-all">
                <Search size={16} />
                <input className="bg-transparent text-sm outline-none placeholder:text-slate-300" placeholder="Search signal..." />
              </label>
              <button className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all">
                <SlidersHorizontal size={16} className="text-slate-500" />
                {t("common.filter")}
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-500 font-semibold py-4">Signal</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Source</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Sentiment</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4 text-right">Mentions</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4 text-right">Confidence</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={text(signal.title, language)} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                    <TableCell className="font-bold text-slate-800 py-4 max-w-[280px] truncate">{text(signal.title, language)}</TableCell>
                    <TableCell className="text-slate-600 py-4">{signal.source}</TableCell>
                    <TableCell className="py-4">
                      <StatusPill tone={signal.tone}>{text(signal.sentiment, language)}</StatusPill>
                    </TableCell>
                    <TableCell className="text-right text-slate-600 font-semibold py-4">{signal.mentions}</TableCell>
                    <TableCell className="text-right text-[#10B981] font-bold py-4">{signal.confidence}</TableCell>
                    <TableCell className="text-right text-slate-400 text-xs py-4">{signal.time}</TableCell>
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
