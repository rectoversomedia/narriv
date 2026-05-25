"use client";

import { useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  Database,
  FileText,
  Grid3X3,
  Headphones,
  KeyRound,
  List,
  Newspaper,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCw,
  Rss,
  ShieldCheck,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SiBlogger, SiDiscourse } from "react-icons/si";
import { Instagram, XDark, YouTube } from "@ridemountainpig/svgl-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate" | "pink" | "black" | "orange";

type Connector = {
  name: string;
  category: string;
  health: string;
  signals: string;
  lastSync: string;
  active: boolean;
  status: "Live" | "Paused";
  tone: Tone;
  icon: SourceIcon;
  spark: number[];
};

type SourceIcon = ComponentType<SVGProps<SVGSVGElement>>;

type ToneStyle = {
  color: string;
  rgb: string;
  bg: string;
};

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", bg: "bg-[#465FFF]/10 text-[#465FFF]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", bg: "bg-[#8B5CFF]/10 text-[#8B5CFF]" },
  green: { color: "#10B981", rgb: "16,185,129", bg: "bg-[#10B981]/10 text-[#10B981]" },
  red: { color: "#FF1D1D", rgb: "255,29,29", bg: "bg-[#FF1D1D]/10 text-[#FF1D1D]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", bg: "bg-[#F59E0B]/10 text-[#F59E0B]" },
  slate: { color: "#64748B", rgb: "100,116,139", bg: "bg-slate-100 text-slate-500" },
  pink: { color: "#E1306C", rgb: "225,48,108", bg: "bg-[#E1306C]/10 text-[#E1306C]" },
  black: { color: "#111827", rgb: "17,24,39", bg: "bg-[#111827] text-white" },
  orange: { color: "#F97316", rgb: "249,115,22", bg: "bg-[#F97316]/10 text-[#F97316]" },
};

const connectorsSeed: Connector[] = [
  { name: "Instagram", category: "Social Media", health: "99.8%", signals: "18.642", lastSync: "1 menit lalu", active: true, status: "Live", tone: "pink", icon: Instagram, spark: [18, 22, 17, 26, 20, 16, 34, 15, 24, 18, 25, 38, 28, 33, 27, 31] },
  { name: "News Sites", category: "News & Media", health: "99.2%", signals: "14.217", lastSync: "2 menit lalu", active: true, status: "Live", tone: "blue", icon: Newspaper, spark: [14, 18, 13, 20, 16, 12, 31, 13, 18, 14, 21, 33, 24, 29, 23, 27] },
  { name: "YouTube", category: "Video Platform", health: "97.4%", signals: "12.843", lastSync: "3 menit lalu", active: true, status: "Live", tone: "red", icon: YouTube, spark: [20, 25, 18, 31, 17, 23, 16, 21, 15, 20, 28, 19, 31, 25, 28, 26] },
  { name: "X (Twitter)", category: "Social Media", health: "98.7%", signals: "38.652", lastSync: "1 menit lalu", active: true, status: "Live", tone: "black", icon: XDark, spark: [24, 20, 28, 17, 35, 19, 21, 16, 22, 18, 26, 17, 31, 22, 27, 24] },
  { name: "Podcast", category: "Audio Content", health: "94.1%", signals: "2.136", lastSync: "5 menit lalu", active: true, status: "Live", tone: "purple", icon: Radio, spark: [13, 18, 12, 22, 11, 14, 8, 12, 9, 13, 17, 18, 25, 19, 21, 18] },
  { name: "Support Tickets", category: "Support Platform", health: "100%", signals: "6.784", lastSync: "1 menit lalu", active: true, status: "Live", tone: "green", icon: Headphones, spark: [18, 16, 24, 15, 14, 27, 12, 16, 13, 19, 15, 28, 20, 25, 21, 23] },
  { name: "Forums", category: "Online Community", health: "98.1%", signals: "8.934", lastSync: "2 menit lalu", active: true, status: "Live", tone: "blue", icon: SiDiscourse, spark: [16, 17, 24, 18, 15, 21, 14, 20, 13, 17, 22, 18, 26, 20, 23, 21] },
  { name: "Blogs", category: "Blog & Articles", health: "-", signals: "-", lastSync: "-", active: false, status: "Paused", tone: "orange", icon: SiBlogger, spark: [8, 8, 10, 8, 9, 8, 12, 8, 9, 8, 10, 8, 8, 8, 8, 8] },
];

const copy = {
  en: {
    title: "Data Sources",
    desc: "Manage and monitor every data source used by Narriv.",
    learnMore: "Learn more",
    add: "Add Integration",
    gridTitle: "Connector Grid",
    gridDesc: "Connection status and performance for every data source.",
    syncAll: "Sync All",
    allCategories: "All Categories",
    healthTitle: "Source Health Overview",
    healthDesc: "Summary of all source health.",
    optimal: "System is running optimally",
    optimalDesc: "All critical sources are in healthy condition.",
    activity: "Recent Activity",
    activityDesc: "Sync logs and connection changes.",
    viewAll: "View All",
    settings: "Global Configuration & Settings",
    settingsDesc: "General source management settings.",
    connect: "Connect New Source",
    connectDesc: "Add a new data source to expand monitoring coverage.",
    volume: "Signal Volume by Source (Last 7 Days)",
    volumeDesc: "Comparison of signal volume from every source.",
    distribution: "Source Type Distribution",
    distributionDesc: "Composition by source category.",
    last7: "Last 7 Days",
  },
  id: {
    title: "Data Sources",
    desc: "Kelola dan monitor semua sumber data yang digunakan Narriv.",
    learnMore: "Pelajari lebih lanjut",
    add: "Tambah Integrasi",
    gridTitle: "Connector Grid",
    gridDesc: "Status koneksi dan performa setiap sumber data.",
    syncAll: "Sync Semua",
    allCategories: "Semua Kategori",
    healthTitle: "Source Health Overview",
    healthDesc: "Ringkasan kesehatan semua sumber.",
    optimal: "Sistem berjalan optimal",
    optimalDesc: "Semua sumber kritis dalam kondisi sehat.",
    activity: "Aktivitas Terbaru",
    activityDesc: "Log sinkronisasi dan perubahan koneksi.",
    viewAll: "Lihat Semua",
    settings: "Konfigurasi & Pengaturan Global",
    settingsDesc: "Pengaturan umum untuk manajemen sumber.",
    connect: "Hubungkan Sumber Baru",
    connectDesc: "Tambah sumber data baru untuk memperluas cakupan monitoring.",
    volume: "Volume Signals per Sumber (7 Hari Terakhir)",
    volumeDesc: "Perbandingan volume signal dari setiap sumber.",
    distribution: "Distribusi Tipe Sumber",
    distributionDesc: "Komposisi berdasarkan kategori sumber data.",
    last7: "7 Hari Terakhir",
  },
};

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("rounded-[14px] border-[#E6EAF2] bg-white text-[#101334] shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>{children}</Card>;
}

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  return (
    <Panel>
      <CardContent className="flex min-h-[98px] items-center gap-4 p-4">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-full border" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)`, borderColor: `rgba(${style.rgb}, .12)` }}><Icon size={23} strokeWidth={2.2} /></span>
        <span className="min-w-0">
          <span className="block text-[12px] font-extrabold text-[#68739F]">{label}</span>
          <span className="mt-1 block text-[26px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</span>
          <span className="mt-2 block text-[11px] font-black text-[#10B981]">• {helper}</span>
        </span>
      </CardContent>
    </Panel>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const width = 150;
  const height = 38;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const path = values.map((value, index) => {
    const x = (index / (values.length - 1)) * (width - 4) + 2;
    const y = height - ((value - min) / range) * 26 - 6;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return <svg className="h-10 w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function Toggle({ active }: { active: boolean }) {
  return <span className={cn("relative h-5 w-9 rounded-full transition", active ? "bg-[#465FFF]" : "bg-[#CBD5E1]")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition", active ? "left-4" : "left-0.5")} /></span>;
}

function ConnectorCard({ source, selected, onSelect }: { source: Connector; selected: boolean; onSelect: (source: Connector) => void }) {
  const style = toneStyles[source.tone];
  const Icon = source.icon;
  return (
    <button type="button" onClick={() => onSelect(source)} className={cn("rounded-[13px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(16,24,40,0.08)]", selected ? "border-[#465FFF] shadow-[0_12px_30px_rgba(70,95,255,0.08)]" : "border-[#E8ECF5]")}> 
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-[10px]", style.bg)} style={source.tone === "black" ? undefined : { backgroundColor: `rgba(${style.rgb}, .10)`, color: style.color }}><Icon className="size-[21px]" /></span>
        <span className={cn("rounded-full px-2.5 py-1 text-[9px] font-black", source.status === "Live" ? "bg-[#10B981]/12 text-[#0C9B69]" : "bg-[#F59E0B]/12 text-[#F59E0B]")}>{source.status}</span>
      </div>
      <h3 className="mt-3 text-[13px] font-black text-[#101334]">{source.name}</h3>
      <p className="mt-1 text-[10px] font-bold text-[#68739F]">{source.category}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold text-[#68739F]"><span>Health<br /><b className="text-[14px] text-[#101334]">{source.health}</b></span><span>Signals (24h)<br /><b className="text-[14px] text-[#101334]">{source.signals}</b></span></div>
      <div className="mt-3"><MiniSparkline values={source.spark} color={style.color} /></div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold text-[#68739F]"><span>Last Sync</span><span>{source.lastSync}</span><Toggle active={source.active} /></div>
    </button>
  );
}

function HealthDonut() {
  return (
    <div className="relative flex size-[128px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#10B981_0_83%,#F59E0B_83%_96%,#EF4444_96%_100%)]">
      <span className="absolute size-[86px] rounded-full bg-white" />
      <span className="relative text-center"><b className="block text-[26px] font-black text-[#101334]">48</b><span className="text-[10px] font-bold text-[#68739F]">Total</span></span>
    </div>
  );
}

function DistributionDonut() {
  return (
    <div className="relative flex size-[154px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_33%,#8B5CFF_33%_58%,#FF1D1D_58%_71%,#10B981_71%_86%,#F59E0B_86%_100%)]">
      <span className="absolute size-[104px] rounded-full bg-white" />
      <span className="relative text-center"><b className="block text-[24px] font-black text-[#101334]">48</b><span className="text-[10px] font-bold text-[#68739F]">Total</span></span>
    </div>
  );
}

function VolumeBars() {
  const bars = [
    ["X (Twitter)", "38.7K", 100, "#050816"],
    ["Instagram", "18.6K", 48, "#E1306C"],
    ["News Sites", "14.2K", 37, "#465FFF"],
    ["YouTube", "12.8K", 33, "#FF1D1D"],
    ["Forums", "8.9K", 23, "#465FFF"],
    ["Support\nTickets", "6.8K", 18, "#10B981"],
    ["Podcast", "2.1K", 8, "#8B5CFF"],
  ] as const;
  return <div className="grid h-[220px] grid-cols-7 items-end gap-4 px-4 pt-4">{bars.map(([label, value, height, color]) => <div key={label} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[11px] font-black text-[#101334]">{value}</span><span className="w-8 rounded-t-[8px]" style={{ height: `${height}%`, backgroundColor: color }} /><span className="whitespace-pre-line text-center text-[10px] font-bold leading-tight text-[#68739F]">{label}</span></div>)}</div>;
}

export default function SourcesPage() {
  const language = useUiStore((state) => state.language);
  const dict = copy[language] ?? copy.en;
  const [items] = useState(connectorsSeed);
  const [selected, setSelected] = useState(connectorsSeed[0]);

  const activity = [
    ["Instagram", "Sinkronisasi berhasil", "1 menit lalu", "green", Instagram],
    ["News Sites", "Sinkronisasi berhasil", "2 menit lalu", "green", Newspaper],
    ["YouTube", "Sinkronisasi berhasil", "3 menit lalu", "green", YouTube],
    ["Blogs", "Sinkronisasi dijeda", "8 menit lalu", "amber", Rss],
    ["Forums", "Konfigurasi diperbarui", "15 menit lalu", "purple", FileText],
  ] as const;

  const settings = [
    ["Keyword Target Global", "Kelola keyword utama untuk semua sumber", KeyRound, "blue"],
    ["Deduplication Rules", "Aturan untuk menghindari data duplikat", Database, "purple"],
    ["Rate Limit & Throttling", "Atur batas permintaan dan kecepatan sinkronisasi", Clock3, "purple"],
    ["Data Retention Policy", "Kebijakan penyimpanan dan retensi data", Bell, "orange"],
    ["Webhooks & Integrations", "Integrasi lanjutan dengan sistem eksternal", Webhook, "purple"],
  ] as const;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{dict.title}</h1><p className="mt-2 text-[14px] font-semibold text-[#68739F]">{dict.desc} <button type="button" className="font-black text-[#465FFF]">{dict.learnMore} <ArrowRight size={13} className="inline" /></button></p></div>
        <button type="button" className="flex h-10 w-fit items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-4 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)]"><Plus size={15} />{dict.add}</button>
      </header>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Connected Sources" value="48" helper="77% vs 30 hari lalu" icon={Database} tone="purple" />
        <MetricCard label="Live Monitoring" value="24/7" helper="Semua sehat" icon={Play} tone="green" />
        <MetricCard label="Total Signals (24 Jam)" value="128.452" helper="18.6% vs kemarin" icon={Zap} tone="blue" />
        <MetricCard label="Auto Sync" value="6" helper="6 job berjalan" icon={RefreshCw} tone="amber" />
        <MetricCard label="Last Sync" value="2 menit lalu" helper="Semua sumber sinkron" icon={Clock3} tone="purple" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <CardContent className="p-4">
              <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div><h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{dict.gridTitle}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{dict.gridDesc}</p></div>
                <div className="flex flex-wrap gap-3"><button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] px-4 text-[12px] font-black text-[#53608C]"><RotateCw size={14} />{dict.syncAll}</button><button type="button" className="flex size-9 items-center justify-center rounded-[8px] bg-[#EEF0FF] text-[#465FFF]"><Grid3X3 size={15} /></button><button type="button" className="flex size-9 items-center justify-center rounded-[8px] border border-[#DDE3EF] text-[#53608C]"><List size={15} /></button><button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] px-4 text-[12px] font-black text-[#101334]">{dict.allCategories}<ChevronDown size={13} /></button></div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">{items.map((source) => <ConnectorCard key={source.name} source={source} selected={selected.name === source.name} onSelect={setSelected} />)}</div>
              <button type="button" className="mt-3 flex h-11 w-full items-center justify-between rounded-[10px] border border-[#DDE3EF] bg-[#FBFCFF] px-4 text-left"><span className="flex items-center gap-3"><CirclePlus size={20} className="text-[#465FFF]" /><span><b className="block text-[13px] font-black text-[#465FFF]">{dict.connect}</b><span className="text-[11px] font-semibold text-[#68739F]">{dict.connectDesc}</span></span></span><ArrowRight size={16} className="text-[#53608C]" /></button>
            </CardContent>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <Panel><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[17px] font-black text-[#101334]">{dict.volume}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{dict.volumeDesc}</p></div><button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] px-3 text-[11px] font-black text-[#53608C]">{dict.last7}<ChevronDown size={12} /></button></div><VolumeBars /></CardContent></Panel>
            <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{dict.distribution}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{dict.distributionDesc}</p><div className="mt-5 grid items-center gap-6 sm:grid-cols-[170px_1fr]"><DistributionDonut /><div className="grid gap-3 text-[12px] font-bold text-[#53608C]">{[["Social Media", "16 (33%)", "blue"], ["News & Media", "12 (25%)", "purple"], ["Video Platform", "6 (13%)", "red"], ["Support & Community", "7 (15%)", "green"], ["Lainnya", "7 (14%)", "slate"]].map(([label, value, tone]) => <div key={label} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: toneStyles[tone as Tone].color }} />{label}</span><b className="text-[#101334]">{value}</b></div>)}</div></div></CardContent></Panel>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{dict.healthTitle}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{dict.healthDesc}</p><div className="mt-5 grid items-center gap-5 sm:grid-cols-[128px_1fr] xl:grid-cols-1 2xl:grid-cols-[128px_1fr]"><HealthDonut /><div className="grid gap-3 text-[12px] font-bold text-[#53608C]"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#10B981]" />Sehat</span><b className="text-[#101334]">40 (83%)</b></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#F59E0B]" />Peringatan</span><b className="text-[#101334]">6 (13%)</b></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#EF4444]" />Bermasalah</span><b className="text-[#101334]">2 (4%)</b></div></div></div><div className="mt-5 rounded-[12px] border border-[#BFEBD9] bg-[#ECFDF6] p-4"><div className="flex items-start gap-3"><ShieldCheck size={20} className="text-[#10B981]" /><span><b className="block text-[13px] font-black text-[#0C9B69]">{dict.optimal}</b><span className="text-[12px] font-semibold text-[#53608C]">{dict.optimalDesc}</span></span></div></div></CardContent></Panel>

          <Panel><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[17px] font-black text-[#101334]">{dict.activity}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{dict.activityDesc}</p></div><button type="button" className="text-[11px] font-black text-[#465FFF]">{dict.viewAll}</button></div><div className="grid gap-3">{activity.map(([name, status, time, tone, Icon]) => { const TypedIcon = Icon as SourceIcon; const style = toneStyles[tone as Tone]; return <div key={name} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-3"><span className="flex size-7 items-center justify-center rounded-[7px]" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}><TypedIcon className="size-[15px]" /></span><span className="min-w-0"><b className="block truncate text-[12px] text-[#101334]">{name}</b><span className="text-[11px] font-semibold" style={{ color: style.color }}>{status}</span></span></span><span className="shrink-0 text-[10px] font-bold text-[#68739F]">{time}</span><Check size={13} style={{ color: style.color }} /></div>; })}</div></CardContent></Panel>

          <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{dict.settings}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{dict.settingsDesc}</p><div className="mt-4 grid gap-2.5">{settings.map(([title, desc, Icon, tone]) => { const TypedIcon = Icon as LucideIcon; const style = toneStyles[tone as Tone]; return <button key={title as string} type="button" className="flex items-center justify-between gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3 text-left"><span className="flex min-w-0 items-center gap-3"><span className="flex size-8 items-center justify-center rounded-[8px]" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}><TypedIcon size={16} /></span><span><b className="block text-[12px] text-[#101334]">{title as string}</b><span className="text-[10px] font-semibold text-[#68739F]">{desc as string}</span></span></span><ChevronDown size={14} className="-rotate-90 text-[#53608C]" /></button>; })}</div></CardContent></Panel>
        </aside>
      </section>
    </div>
  );
}
