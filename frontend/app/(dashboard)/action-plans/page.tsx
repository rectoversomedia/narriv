"use client";

import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, PageTitle, PrimaryAction, ProgressBar, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actions, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function ActionPlansPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle 
        title={t("pages.actions.title")} 
        description={t("pages.actions.desc")} 
        action={<PrimaryAction><Plus size={16} />{t("common.newAction")}</PrimaryAction>} 
      />
      
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Tindakan Aktif" value="12" helper="20% vs 7 hari" icon={Plus} tone="blue" />
        <MetricTile label="Dalam Proses" value="7" helper="16% vs 7 hari" icon={Search} tone="amber" />
        <MetricTile label="Selesai" value="28" helper="25% vs 7 hari" icon={Plus} tone="green" />
        <MetricTile label="Perlu Perhatian" value="3" helper="-25% vs 7 hari" icon={Plus} tone="red" />
      </div>

      <AppCard>
        <CardContent className="p-5">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between bg-white/[0.01] p-4 rounded-lg border border-slate-100">
            <Tabs defaultValue="all" className="w-full xl:w-auto">
              <TabsList className="bg-slate-100 border border-slate-100 text-slate-500">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900">{t("pages.actions.all")}</TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900">{t("pages.actions.active")}</TabsTrigger>
                <TabsTrigger value="progress" className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900">{t("pages.actions.progress")}</TabsTrigger>
                <TabsTrigger value="done" className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900">{t("pages.actions.done")}</TabsTrigger>
                <TabsTrigger value="attention" className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900">{t("pages.actions.attention")}</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex flex-wrap gap-3">
              <label className="flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-slate-500 focus-within:border-[#465FFF]/50 focus-within:text-slate-900 transition-all">
                <Search size={16} />
                <input className="bg-transparent text-sm outline-none placeholder:text-slate-300" placeholder="Cari tindakan..." />
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
                  <TableHead className="text-slate-500 font-semibold py-4">Tindakan</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Terkait Isu</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Prioritas</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Penanggung Jawab</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Batas Waktu</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Status</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={text(action.title, language)} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                    <TableCell className="font-bold text-slate-800 py-4 max-w-[200px] truncate">{text(action.title, language)}</TableCell>
                    <TableCell className="text-slate-600 py-4 max-w-[200px] truncate">{text(action.issue, language)}</TableCell>
                    <TableCell className="py-4">
                      <StatusPill tone={action.tone}>{text(action.priority, language)}</StatusPill>
                    </TableCell>
                    <TableCell className="py-4">
                      <b className="text-slate-900">{action.owner}</b>
                      <br />
                      <span className="text-[11px] text-slate-400">{action.role}</span>
                    </TableCell>
                    <TableCell className="text-slate-600 py-4">{action.due}</TableCell>
                    <TableCell className="py-4">
                      <StatusPill tone={action.tone}>{text(action.status, language)}</StatusPill>
                    </TableCell>
                    <TableCell className="min-w-[140px] py-4">
                      <ProgressBar value={action.progress} tone="purple" />
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
