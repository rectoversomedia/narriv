"use client";

import { useMemo, useState } from "react";
import { Flag, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, PageTitle, PrimaryAction, SecondaryAction, StatusPill } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { signalEvidence, signalFilters, signals, text } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

export default function SignalsPage() {
  const t = useTranslations("DemoApp");
  const language = useUiStore((state) => state.language);
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [selectedSignal, setSelectedSignal] = useState(signals[0]);

  const filteredSignals = useMemo(() => {
    if (activeFilter === "Semua") return signals;
    if (activeFilter === "Kritis") return signals.filter((signal) => signal.tone === "red" || signal.tone === "amber");
    return signals.filter((signal) => text(signal.sentiment, "id") === activeFilter);
  }, [activeFilter]);

  return (
    <div className="space-y-8 pb-6">
      <PageTitle
        title={t("pages.signals.title")}
        description={t("pages.signals.desc")}
        action={<PrimaryAction><Flag size={16} />Flag Critical Signal</PrimaryAction>}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <AppCard>
          <CardContent className="p-5">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-lg border border-slate-100 bg-white p-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">{t("pages.signals.table")}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">{t("pages.signals.tableDesc")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-slate-500 focus-within:border-[#465FFF]/50">
                  <Search size={16} />
                  <input className="bg-transparent text-sm outline-none placeholder:text-slate-300" placeholder="Search signal..." />
                </label>
                <SecondaryAction><SlidersHorizontal size={16} />{t("common.filter")}</SecondaryAction>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {signalFilters.map((filter) => (
                <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`rounded-full border px-4 py-2 text-xs font-black transition ${activeFilter === filter ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                  {filter}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="py-4 font-semibold text-slate-500">Signal</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Source</TableHead>
                    <TableHead className="py-4 font-semibold text-slate-500">Sentiment</TableHead>
                    <TableHead className="py-4 text-right font-semibold text-slate-500">Mentions</TableHead>
                    <TableHead className="py-4 text-right font-semibold text-slate-500">Confidence</TableHead>
                    <TableHead className="py-4 text-right font-semibold text-slate-500">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignals.map((signal) => (
                    <TableRow key={text(signal.title, language)} onClick={() => setSelectedSignal(signal)} className={`cursor-pointer border-b border-slate-100 last:border-0 ${selectedSignal.title.en === signal.title.en ? "bg-[#465FFF]/5" : "hover:bg-slate-50"}`}>
                      <TableCell className="max-w-[280px] truncate py-4 font-bold text-slate-800">{text(signal.title, language)}</TableCell>
                      <TableCell className="py-4 text-slate-600">{signal.source}</TableCell>
                      <TableCell className="py-4"><StatusPill tone={signal.tone}>{text(signal.sentiment, language)}</StatusPill></TableCell>
                      <TableCell className="py-4 text-right font-semibold text-slate-600">{signal.mentions}</TableCell>
                      <TableCell className="py-4 text-right font-bold text-[#10B981]">{signal.confidence}</TableCell>
                      <TableCell className="py-4 text-right text-xs text-slate-400">{signal.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Triage Panel</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Klik signal untuk melihat konteks dan aksi cepat.</p>
            <div className="mt-5 rounded-[12px] border border-slate-100 bg-white p-4">
              <StatusPill tone={selectedSignal.tone}>{text(selectedSignal.sentiment, language)}</StatusPill>
              <h3 className="mt-4 text-lg font-black leading-6 text-slate-900">{text(selectedSignal.title, language)}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{selectedSignal.source} · {selectedSignal.mentions} mentions · confidence {selectedSignal.confidence}</p>
              <div className="mt-5 grid gap-3">
                <Button className="h-10 rounded-[8px] bg-[#465FFF] text-white hover:bg-[#3B20EA]"><UserPlus size={16} />Assign to Case</Button>
                <Button variant="outline" className="h-10 rounded-[8px] border-slate-200 bg-slate-50"><Flag size={16} />Mark Critical</Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {signalEvidence.map((item) => (
                <div key={item.source} className="rounded-[10px] border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-900">{item.source}</p>
                    <StatusPill tone={item.tone}>{item.reach}</StatusPill>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{item.snippet}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </AppCard>
      </div>
    </div>
  );
}
