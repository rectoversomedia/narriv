"use client";

import { Play, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, IconBubble, MetricTile, PageTitle, PrimaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sources, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function SourcesPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  
  return (
    <div className="space-y-8 pb-6">
      <PageTitle 
        title={t("pages.sources.title")} 
        description={t("pages.sources.desc")} 
        action={<PrimaryAction><Plus size={16} />Add Source</PrimaryAction>} 
      />
      
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Connected Sources" value="48" helper="77% connected" icon={Plus} tone="purple" />
        <MetricTile label="Live Monitoring" value="24/7" helper="All healthy" icon={Play} tone="green" />
        <MetricTile label="Auto Sync" value="6" helper="Running jobs" icon={Play} tone="blue" />
      </div>

      {/* Add Source Input Card */}
      <AppCard>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_180px_auto] items-center">
          <Input 
            placeholder="Source name" 
            className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-[#465FFF]/50" 
          />
          <select 
            className="h-11 rounded-[8px] border border-slate-200 bg-slate-50 text-slate-900 px-3 text-sm font-semibold focus:border-[#465FFF]/50 outline-none cursor-pointer"
          >
            <option className="bg-slate-50 text-slate-900">Social</option>
            <option className="bg-slate-50 text-slate-900">News</option>
            <option className="bg-slate-50 text-slate-900">Forum</option>
          </select>
          <PrimaryAction className="h-11">
            <Plus size={16} />Add Source
          </PrimaryAction>
        </CardContent>
      </AppCard>

      {/* Connected Sources List */}
      <AppCard>
        <CardContent className="p-5">
          <h2 className="mb-5 text-[20px] font-bold text-slate-900 tracking-tight">{t("pages.sources.connected")}</h2>
          
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-500 font-semibold py-4">Source</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Status</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4">Health</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4 text-right">Signals</TableHead>
                  <TableHead className="text-slate-500 font-semibold py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => { 
                  const Icon = source.icon; 
                  return (
                    <TableRow key={source.name} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                      <TableCell className="font-bold text-slate-900 py-4">
                        <span className="flex items-center gap-3">
                          <IconBubble icon={Icon} tone={source.tone} className="h-9 w-9 shrink-0" />
                          {source.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusPill tone="green">{text(source.status, language)}</StatusPill>
                      </TableCell>
                      <TableCell className="text-slate-600 py-4">{text(source.health, language)}</TableCell>
                      <TableCell className="text-right text-slate-600 font-semibold py-4">{source.signals}</TableCell>
                      <TableCell className="text-right py-4">
                        <button className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-[0.98]">
                          <Play size={14} className="text-slate-500" />
                          Run
                        </button>
                      </TableCell>
                    </TableRow>
                  ); 
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </AppCard>
    </div>
  );
}
