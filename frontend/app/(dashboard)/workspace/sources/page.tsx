"use client";

import { useState } from "react";
import { Database, KeyRound, Play, Plus, RefreshCw, Signal } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppCard, MetricTile, PageTitle, PrimaryAction, SecondaryAction } from "@/components/dashboard/dashboard-kit";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectors } from "@/lib/mock-data";

export default function SourcesPage() {
  const t = useTranslations("DemoApp");
  const [items, setItems] = useState(connectors);
  const [selected, setSelected] = useState(connectors[0]);

  return (
    <div className="space-y-8 pb-6">
      <PageTitle title={t("pages.sources.title")} description={t("pages.sources.desc")} action={<PrimaryAction><Plus size={16} />Tambah Integrasi</PrimaryAction>} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile label="Connected Sources" value="48" helper="77% connected" icon={Database} tone="purple" />
        <MetricTile label="Live Monitoring" value="24/7" helper="All healthy" icon={Play} tone="green" />
        <MetricTile label="Auto Sync" value="6" helper="Running jobs" icon={RefreshCw} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <AppCard>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Connector Grid</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Status koneksi Instagram, News, YouTube, Podcast, dan Support Tickets.</p>
              </div>
              <SecondaryAction><RefreshCw size={16} />Sync Semua</SecondaryAction>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((source) => (
                <button key={source.name} type="button" onClick={() => setSelected(source)} className={`rounded-[14px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${selected.name === source.name ? "border-[#465FFF] bg-[#465FFF]/5" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#465FFF]/10 text-[#465FFF]"><Signal size={20} /></span>
                    <span className={`relative h-5 w-9 rounded-full ${source.active ? "bg-[#465FFF]" : "bg-slate-200"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${source.active ? "left-4" : "left-0.5"}`} />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-900">{source.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{source.status}</p>
                  <div className="mt-4 flex items-center justify-between text-xs font-bold">
                    <span className="text-[#10B981]">Health {source.health}</span>
                    <span className="text-slate-500">{source.signals} signals</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </AppCard>

        <AppCard>
          <CardContent className="p-5">
            <h2 className="text-[20px] font-bold tracking-tight text-slate-900">Konfigurasi Source</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Mock setup untuk {selected.name}.</p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Target Keyword</span>
                <Input defaultValue="Narriv, reputasi brand, layanan gangguan" className="h-11 border-slate-200 bg-slate-50" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">API Key</span>
                <div className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3">
                  <KeyRound size={16} className="text-slate-400" />
                  <Input defaultValue="••••••••••••••••" className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0" />
                </div>
              </label>
              <div className="grid gap-3 rounded-[12px] border border-slate-100 bg-white p-4">
                {[["Mode", selected.status], ["Health", selected.health], ["Last sync", "2 menit lalu"]].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
              <Button className="h-10 rounded-[8px] bg-[#465FFF] text-white hover:bg-[#3B20EA]">Ping Source Health</Button>
              <Button variant="outline" className="h-10 rounded-[8px] border-slate-200 bg-slate-50" onClick={() => setItems((list) => list.map((item) => item.name === selected.name ? { ...item, active: !item.active } : item))}>
                {selected.active ? "Pause Ingestion" : "Activate Source"}
              </Button>
            </div>
          </CardContent>
        </AppCard>
      </div>
    </div>
  );
}
