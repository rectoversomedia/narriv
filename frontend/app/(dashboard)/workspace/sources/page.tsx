"use client";

import { useState, type ComponentType, type KeyboardEvent, type ReactNode, type SVGProps } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { getSources, updateSource, deleteSource, runSourceIngestion, type SourceRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";

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

function formatSourceTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function stableSpark(seed: string) {
  const base = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0) || 19;
  return Array.from({ length: 16 }, (_, index) => 8 + ((base + index * 7) % 31));
}

function sourceIconForType(type: string): SourceIcon {
  const normalized = type.toLowerCase();
  if (normalized.includes("social")) return XDark;
  if (normalized.includes("video")) return YouTube;
  if (normalized.includes("podcast")) return Radio;
  if (normalized.includes("forum")) return SiDiscourse;
  if (normalized.includes("news") || normalized.includes("web")) return Newspaper;
  return Database;
}

function sourceToneForType(type: string): Tone {
  const normalized = type.toLowerCase();
  if (normalized.includes("social")) return "black";
  if (normalized.includes("video")) return "red";
  if (normalized.includes("podcast")) return "purple";
  if (normalized.includes("forum")) return "blue";
  if (normalized.includes("news")) return "blue";
  if (normalized.includes("web")) return "green";
  return "slate";
}

function buildApiConnectors(sources: SourceRecord[]): Connector[] {
  return sources.map((source) => {
    const type = source.type || "source";
    const active = source.isActive ?? true;
    return {
      name: source.name,
      category: type.charAt(0).toUpperCase() + type.slice(1),
      health: source.health ?? (active ? "Live" : "Paused"),
      signals: source.coverage ?? "-",
      lastSync: formatSourceTime(source.updatedAt || source.createdAt),
      active,
      status: active ? "Live" : "Paused",
      tone: sourceToneForType(type),
      icon: sourceIconForType(type),
      spark: stableSpark(source.id),
    };
  });
}

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
  return <svg className="chart-line-draw h-10 w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function Toggle({ active }: { active: boolean }) {
  return <span className={cn("relative h-5 w-9 rounded-full transition", active ? "bg-[#465FFF]" : "bg-[#CBD5E1]")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition", active ? "left-4" : "left-0.5")} /></span>;
}

function ConnectorCard({ source, selected, onSelect, onToggle }: { source: Connector; selected: boolean; onSelect: (source: Connector) => void; onToggle?: (source: Connector) => void }) {
  const style = toneStyles[source.tone];
  const Icon = source.icon;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(source);
  };

  return (
    <div role="button" tabIndex={0} onClick={() => onSelect(source)} onKeyDown={handleKeyDown} className={cn("rounded-[13px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(16,24,40,0.08)] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30", selected ? "border-[#465FFF] shadow-[0_12px_30px_rgba(70,95,255,0.08)]" : "border-[#E8ECF5]")}> 
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-[10px]", style.bg)} style={source.tone === "black" ? undefined : { backgroundColor: `rgba(${style.rgb}, .10)`, color: style.color }}><Icon className="size-[21px]" /></span>
        <span className={cn("rounded-full px-2.5 py-1 text-[9px] font-black", source.status === "Live" ? "bg-[#10B981]/12 text-[#0C9B69]" : "bg-[#F59E0B]/12 text-[#F59E0B]")}>{source.status}</span>
      </div>
      <h3 className="mt-3 text-[13px] font-black text-[#101334]">{source.name}</h3>
      <p className="mt-1 text-[10px] font-bold text-[#68739F]">{source.category}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold text-[#68739F]"><span>Health<br /><b className="text-[14px] text-[#101334]">{source.health}</b></span><span>Signals (24h)<br /><b className="text-[14px] text-[#101334]">{source.signals}</b></span></div>
      <div className="mt-3"><MiniSparkline values={source.spark} color={style.color} /></div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold text-[#68739F]"><span>Last Sync</span><span>{source.lastSync}</span><button type="button" onClick={(e) => { e.stopPropagation(); onToggle?.(source); }} className="focus:outline-none"><Toggle active={source.active} /></button></div>
    </div>
  );
}

function HealthDonut() {
  return (
    <div className="chart-donut-enter relative flex size-[128px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#10B981_0_83%,#F59E0B_83%_96%,#EF4444_96%_100%)]">
      <span className="absolute size-[86px] rounded-full bg-white" />
      <span className="relative text-center"><b className="block text-[26px] font-black text-[#101334]">48</b><span className="text-[10px] font-bold text-[#68739F]">Total</span></span>
    </div>
  );
}

function DistributionDonut() {
  return (
    <div className="chart-donut-enter relative flex size-[154px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_33%,#8B5CFF_33%_58%,#FF1D1D_58%_71%,#10B981_71%_86%,#F59E0B_86%_100%)]">
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
  const t = useTranslations("Sources");
  const queryClient = useQueryClient();
  const toastHook = useToast();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    toastHook.success(message);
  };

  const sourcesQuery = useQuery({
    queryKey: ["sources", { limit: 50 }],
    queryFn: () => getSources({ limit: 50 }),
    staleTime: 30 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateSource(id, { isActive }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      showToast(result ? "Status sumber berhasil diperbarui." : "Status sumber belum bisa diperbarui.", result ? "success" : "error");
    },
    onError: () => showToast("Status sumber belum bisa diperbarui. Coba lagi.", "error"),
  });

  const syncMutation = useMutation({
    mutationFn: (sourceId: string) => runSourceIngestion(sourceId),
    onSuccess: async (result) => {
      if (result) {
        showToast("Sinkronisasi berhasil dimulai.");
      } else {
        showToast("Sinkronisasi belum bisa dimulai. Coba lagi.", "error");
      }
    },
    onError: () => showToast("Sinkronisasi belum bisa dimulai. Coba lagi.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      showToast(result ? "Sumber berhasil dihapus." : "Sumber belum bisa dihapus.", result ? "success" : "error");
    },
    onError: () => showToast("Sumber belum bisa dihapus. Coba lagi.", "error"),
  });
  const liveConnectors = sourcesQuery.data?.data ? buildApiConnectors(sourcesQuery.data.data) : [];
  const isLiveUnavailable = sourcesQuery.data === null;
  const items = liveConnectors.length > 0 || sourcesQuery.data ? liveConnectors : connectorsSeed;
  const [selectedName, setSelectedName] = useState(connectorsSeed[0].name);

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
        <div><h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("title")}</h1><p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("desc")} <button type="button" className="font-black text-[#465FFF]">{t("learnMore")} <ArrowRight size={13} className="inline" /></button></p></div>
        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-4 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] sm:w-fit"><Plus size={15} />{t("add")}</button>
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
                <div><h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("gridTitle")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("gridDesc")}</p></div>
                <div className="flex w-full flex-wrap gap-3 xl:w-auto"><button type="button" onClick={() => { const liveIds = sourcesQuery.data?.data?.map((s) => s.id) ?? []; liveIds.forEach((id) => syncMutation.mutate(id)); showToast("Sinkronisasi semua sumber dimulai."); }} disabled={syncMutation.isPending} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] px-4 text-[12px] font-black text-[#53608C] sm:flex-none"><RotateCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} />{t("syncAll")}</button><button type="button" aria-label="Tampilkan sumber dalam grid" className="flex size-9 items-center justify-center rounded-[8px] bg-[#EEF0FF] text-[#465FFF]"><Grid3X3 size={15} /></button><button type="button" aria-label="Tampilkan sumber dalam daftar" className="flex size-9 items-center justify-center rounded-[8px] border border-[#DDE3EF] text-[#53608C]"><List size={15} /></button><button type="button" className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] px-4 text-[12px] font-black text-[#101334] sm:flex-none">{t("allCategories")}<ChevronDown size={13} /></button></div>
              </div>
              {sourcesQuery.isPending ? (
                <PanelSkeleton />
              ) : sourcesQuery.data && liveConnectors.length === 0 ? (
                <DashboardEmptyState title="Belum ada sumber live" description="Backend berhasil dihubungi, tetapi belum ada sumber data yang dibuat." icon="inbox" minHeight="min-h-[320px]" />
              ) : (
                <>
                  {isLiveUnavailable ? <DashboardErrorState title="Sumber live belum bisa dimuat" description="API client sudah mencoba token refresh. Untuk sementara, halaman menampilkan connector contoh." onRetry={() => void sourcesQuery.refetch()} minHeight="min-h-[150px]" /> : null}
                   <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">{items.map((source) => <ConnectorCard key={source.name} source={source} selected={selectedName === source.name} onSelect={(item) => setSelectedName(item.name)} onToggle={(item) => { const liveSource = sourcesQuery.data?.data?.find((s) => s.name === item.name); if (liveSource) toggleMutation.mutate({ id: liveSource.id, isActive: !item.active }); }} />)}</div>
                </>
              )}
              <button type="button" className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-[#DDE3EF] bg-[#FBFCFF] px-4 py-2 text-left"><span className="flex min-w-0 items-center gap-3"><CirclePlus size={20} className="shrink-0 text-[#465FFF]" /><span className="min-w-0"><b className="block text-[13px] font-black text-[#465FFF]">{t("connect")}</b><span className="block text-[11px] font-semibold leading-snug text-[#68739F]">{t("connectDesc")}</span></span></span><ArrowRight size={16} className="shrink-0 text-[#53608C]" /></button>
            </CardContent>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <Panel><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[17px] font-black text-[#101334]">{t("volume")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("volumeDesc")}</p></div><button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] px-3 text-[11px] font-black text-[#53608C]">{t("last7")}<ChevronDown size={12} /></button></div><VolumeBars /></CardContent></Panel>
            <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{t("distribution")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("distributionDesc")}</p><div className="mt-5 grid items-center gap-6 sm:grid-cols-[170px_1fr]"><DistributionDonut /><div className="grid gap-3 text-[12px] font-bold text-[#53608C]">{[["Social Media", "16 (33%)", "blue"], ["News & Media", "12 (25%)", "purple"], ["Video Platform", "6 (13%)", "red"], ["Support & Community", "7 (15%)", "green"], ["Lainnya", "7 (14%)", "slate"]].map(([label, value, tone]) => <div key={label} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: toneStyles[tone as Tone].color }} />{label}</span><b className="text-[#101334]">{value}</b></div>)}</div></div></CardContent></Panel>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{t("healthTitle")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("healthDesc")}</p><div className="mt-5 grid items-center gap-5 sm:grid-cols-[128px_1fr] xl:grid-cols-1 2xl:grid-cols-[128px_1fr]"><HealthDonut /><div className="grid gap-3 text-[12px] font-bold text-[#53608C]"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#10B981]" />Sehat</span><b className="text-[#101334]">40 (83%)</b></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#F59E0B]" />Peringatan</span><b className="text-[#101334]">6 (13%)</b></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#EF4444]" />Bermasalah</span><b className="text-[#101334]">2 (4%)</b></div></div></div><div className="mt-5 rounded-[12px] border border-[#BFEBD9] bg-[#ECFDF6] p-4"><div className="flex items-start gap-3"><ShieldCheck size={20} className="text-[#10B981]" /><span><b className="block text-[13px] font-black text-[#0C9B69]">{t("optimal")}</b><span className="text-[12px] font-semibold text-[#53608C]">{t("optimalDesc")}</span></span></div></div></CardContent></Panel>

          <Panel><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[17px] font-black text-[#101334]">{t("activity")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("activityDesc")}</p></div><button type="button" className="text-[11px] font-black text-[#465FFF]">{t("viewAll")}</button></div><div className="grid gap-3">{activity.map(([name, status, time, tone, Icon]) => { const TypedIcon = Icon as SourceIcon; const style = toneStyles[tone as Tone]; return <div key={name} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-3"><span className="flex size-7 items-center justify-center rounded-[7px]" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}><TypedIcon className="size-[15px]" /></span><span className="min-w-0"><b className="block truncate text-[12px] text-[#101334]">{name}</b><span className="text-[11px] font-semibold" style={{ color: style.color }}>{status}</span></span></span><span className="shrink-0 text-[10px] font-bold text-[#68739F]">{time}</span><Check size={13} style={{ color: style.color }} /></div>; })}</div></CardContent></Panel>

          <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{t("settings")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("settingsDesc")}</p><div className="mt-4 grid gap-2.5">{settings.map(([title, desc, Icon, tone]) => { const TypedIcon = Icon as LucideIcon; const style = toneStyles[tone as Tone]; return <button key={title as string} type="button" className="flex items-center justify-between gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3 text-left"><span className="flex min-w-0 items-center gap-3"><span className="flex size-8 items-center justify-center rounded-[8px]" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}><TypedIcon size={16} /></span><span><b className="block text-[12px] text-[#101334]">{title as string}</b><span className="text-[10px] font-semibold text-[#68739F]">{desc as string}</span></span></span><ChevronDown size={14} className="-rotate-90 text-[#53608C]" /></button>; })}</div></CardContent></Panel>
        </aside>
      </section>
    </div>
  );
}
