"use client";

import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BarChart3,
  Bell,

  ChevronDown,
  CirclePlus,
  Clock3,
  Database,
  Grid3X3,
  Heart,
  KeyRound,
  List,
  Newspaper,
  PieChart,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Webhook,
  Zap,
  Check,
  type LucideIcon,
} from "lucide-react";
import { SiDiscourse, SiShopee } from "react-icons/si";
import { Facebook, Google, Instagram, Spotify, ThreadsDark, TikTokDark, XDark, YouTube } from "@ridemountainpig/svgl-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { AddSourceModal } from "@/components/dashboard/add-source-modal";
import { bootstrapDefaultSources, getSources, updateSource, deleteSource, runBatchSourceIngestion, runSourceIngestion, getSourceHealth, getSourceCoverage, type SourceRecord, type SourceHealthSummary } from "@/lib/api-service";
import { isDemoMode, getMockSources } from "@/lib/demo-mock-data";
import { cn } from "@/lib/utils";
type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate" | "pink" | "black" | "orange";

type Connector = {
  id: string;
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
  targetKeyword?: string;
};

type SourceIcon = ComponentType<{ className?: string }>;

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

function TokopediaMascot({ className }: { className?: string }) {
  const sizeClass = className?.includes("size-[18px]") ? "size-[18px]" : "size-[21px]";
  return (
    <Image
      src="/icon/Tokopedia_Mascot.png"
      alt="Tokopedia"
      width={36}
      height={36}
      className={sizeClass}
      loading="lazy"
      unoptimized
    />
  );
}

function sourceIconForSource(source: SourceRecord): SourceIcon {
  const normalized = `${source.name} ${source.type} ${source.actorId ?? ""}`.toLowerCase();
  if (normalized.includes("tiktok")) return TikTokDark;
  if (normalized.includes("instagram")) return Instagram;
  if (normalized.includes("threads")) return ThreadsDark;
  if (normalized.includes("facebook")) return Facebook;
  if (normalized.includes("youtube")) return YouTube;
  if (normalized.includes("spotify")) return Spotify;
  if (normalized.includes("shopee")) return SiShopee;
  if (normalized.includes("tokopedia")) return TokopediaMascot;
  if (normalized.includes("google")) return Google;
  if (normalized.includes("kaskus") || normalized.includes("forum")) return SiDiscourse;
  if (normalized.includes("social") || normalized.includes("twitter") || normalized.includes("x /")) return XDark;
  if (normalized.includes("news") || normalized.includes("web") || normalized.includes("blog")) return Newspaper;
  return Database;
}

function sourceToneForSource(source: SourceRecord): Tone {
  const normalized = `${source.name} ${source.type} ${source.actorId ?? ""}`.toLowerCase();
  if (normalized.includes("tiktok")) return "black";
  if (normalized.includes("instagram")) return "pink";
  if (normalized.includes("threads")) return "black";
  if (normalized.includes("facebook")) return "slate";
  if (normalized.includes("youtube")) return "red";
  if (normalized.includes("spotify")) return "green";
  if (normalized.includes("shopee")) return "orange";
  if (normalized.includes("tokopedia")) return "green";
  if (normalized.includes("google")) return "slate";
  if (normalized.includes("kaskus") || normalized.includes("forum")) return "blue";
  if (normalized.includes("twitter") || normalized.includes("x /")) return "black";
  if (normalized.includes("social")) return "black";
  if (normalized.includes("video")) return "red";
  if (normalized.includes("podcast")) return "purple";
  if (normalized.includes("news")) return "blue";
  if (normalized.includes("web") || normalized.includes("blog")) return "green";
  return "slate";
}

function buildApiConnectors(sources: SourceRecord[]): Connector[] {
  return sources.map((source) => {
    const type = source.type || "source";
    const active = source.isActive ?? true;
    
    let targetKeyword = undefined;
    if (source.inputConfig && typeof source.inputConfig === "object") {
      const cfg = source.inputConfig as Record<string, unknown>;
      targetKeyword = 
        (Array.isArray(cfg.searchTerms) && typeof cfg.searchTerms[0] === "string" ? cfg.searchTerms[0] : undefined) ||
        (Array.isArray(cfg.hashtags) && typeof cfg.hashtags[0] === "string" ? cfg.hashtags[0] : undefined) ||
        (Array.isArray(cfg.searchQueries) && typeof cfg.searchQueries[0] === "string" ? cfg.searchQueries[0] : undefined) ||
        (Array.isArray(cfg.keywords) && typeof cfg.keywords[0] === "string" ? cfg.keywords[0] : undefined) ||
        (typeof cfg.queries === "string" ? cfg.queries : undefined) ||
        (typeof cfg.keyword === "string" ? cfg.keyword : undefined) ||
        (typeof cfg.search === "string" ? cfg.search : undefined);
      
      if (typeof targetKeyword === "string" && targetKeyword.endsWith(" forum lokal kaskus")) {
        targetKeyword = targetKeyword.replace(" forum lokal kaskus", "");
      }
    }

    return {
      id: source.id,
      name: source.name,
      category: type.charAt(0).toUpperCase() + type.slice(1),
      health: active ? "Live" : "Paused",
      signals: "-",
      lastSync: formatSourceTime(source.updatedAt || source.createdAt),
      active,
      status: active ? "Live" : "Paused",
      tone: sourceToneForSource(source),
      icon: sourceIconForSource(source),
      spark: stableSpark(source.id),
      targetKeyword,
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

function ConnectorCard({ source, selected, onSelect, onToggle, onDelete, onSync }: { source: Connector; selected: boolean; onSelect: (source: Connector) => void; onToggle?: (source: Connector) => void; onDelete?: (source: Connector) => void; onSync?: (source: Connector) => void }) {
  const style = toneStyles[source.tone];
  const Icon = source.icon;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(source);
  };

  return (
    <div role="button" tabIndex={0} onClick={() => onSelect(source)} onKeyDown={handleKeyDown} className={cn("group rounded-[13px] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(16,24,40,0.08)] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30", selected ? "border-[#465FFF] shadow-[0_12px_30px_rgba(70,95,255,0.08)]" : "border-[#E8ECF5]")}> 
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-[10px]", style.bg)} style={source.tone === "black" ? undefined : { backgroundColor: `rgba(${style.rgb}, .10)`, color: style.color }}><Icon className="size-[21px]" /></span>
        <div className="flex items-center gap-2">
          {onSync && (
            <button
              type="button"
              aria-label="Sync source"
              onClick={(e) => { e.stopPropagation(); onSync(source); }}
              className="flex size-7 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 focus:opacity-100 group-hover:opacity-100"
            >
              <RotateCw size={13} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label="Delete source"
              onClick={(e) => { e.stopPropagation(); onDelete(source); }}
              className="flex size-7 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          )}
          <span className={cn("rounded-full px-2.5 py-1 text-[9px] font-black", source.status === "Live" ? "bg-[#10B981]/12 text-[#0C9B69]" : "bg-[#F59E0B]/12 text-[#F59E0B]")}>{source.status}</span>
        </div>
      </div>
      <h3 className="mt-3 text-[13px] font-black text-[#101334]">{source.name}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-[#68739F]">
        {source.category}
        {source.targetKeyword && (
          <>
            <span>•</span>
            <span className="truncate text-[#53608C]">&quot;{source.targetKeyword}&quot;</span>
          </>
        )}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold text-[#68739F]"><span>Health<br /><b className="text-[14px] text-[#101334]">{source.health}</b></span><span>Signals (24h)<br /><b className="text-[14px] text-[#101334]">{source.signals}</b></span></div>
      <div className="mt-3"><MiniSparkline values={source.spark} color={style.color} /></div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold text-[#68739F]"><span>Last Sync</span><span>{source.lastSync}</span><button type="button" onClick={(e) => { e.stopPropagation(); onToggle?.(source); }} className="focus:outline-none"><Toggle active={source.active} /></button></div>
    </div>
  );
}

function ConnectorListRow({ source, selected, onSelect, onToggle, onDelete, onSync }: { source: Connector; selected: boolean; onSelect: (source: Connector) => void; onToggle?: (source: Connector) => void; onDelete?: (source: Connector) => void; onSync?: (source: Connector) => void }) {
  const style = toneStyles[source.tone];
  const Icon = source.icon;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(source);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(source)}
      onKeyDown={handleKeyDown}
      className={cn(
        "group grid grid-cols-[minmax(0,1fr)_120px_120px_140px_120px_auto] items-center gap-4 rounded-[12px] border bg-white px-4 py-3 text-left transition hover:border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30",
        selected ? "border-[#465FFF] shadow-[0_8px_22px_rgba(70,95,255,0.06)]" : "border-[#E8ECF5]"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-[9px]", style.bg)}
          style={source.tone === "black" ? undefined : { backgroundColor: `rgba(${style.rgb}, .10)`, color: style.color }}
        >
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black text-[#101334]">{source.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-bold text-[#68739F]">
            <span>{source.category}</span>
            {source.targetKeyword && (
              <>
                <span>•</span>
                <span className="truncate text-[#53608C]">&quot;{source.targetKeyword}&quot;</span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="text-[12px] font-bold text-[#53608C]">
        <span className="block text-[10px] uppercase tracking-wide text-[#A0ABC0]">Health</span>
        <span className="text-[14px] font-black text-[#101334]">{source.health}</span>
      </div>
      <div className="text-[12px] font-bold text-[#53608C]">
        <span className="block text-[10px] uppercase tracking-wide text-[#A0ABC0]">Signals (24h)</span>
        <span className="text-[14px] font-black text-[#101334]">{source.signals}</span>
      </div>
      <div className="text-[12px] font-bold text-[#53608C]">
        <span className="block text-[10px] uppercase tracking-wide text-[#A0ABC0]">Last Sync</span>
        <span className="text-[12px] font-black text-[#101334]">{source.lastSync}</span>
      </div>
      <span className={cn("rounded-full px-2.5 py-1 text-center text-[9px] font-black", source.status === "Live" ? "bg-[#10B981]/12 text-[#0C9B69]" : "bg-[#F59E0B]/12 text-[#F59E0B]")}>{source.status}</span>
      <div className="flex items-center gap-2">
        {onSync && (
          <button
            type="button"
            aria-label="Sync source"
            onClick={(e) => { e.stopPropagation(); onSync(source); }}
            className="flex size-7 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 focus:opacity-100 group-hover:opacity-100"
          >
            <RotateCw size={13} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label="Delete source"
            onClick={(e) => { e.stopPropagation(); onDelete(source); }}
            className="flex size-7 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(source); }}
          aria-label="Toggle source"
          className="focus:outline-none"
        >
          <Toggle active={source.active} />
        </button>
      </div>
    </div>
  );
}

const ALL_CATEGORIES = "All";

function CategoryFilterDropdown({ value, options, onChange, label }: { value: string; options: string[]; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const currentLabel = value === ALL_CATEGORIES ? label : value;

  return (
    <div ref={ref} className="relative flex-1 sm:flex-none">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-[8px] border px-4 text-[12px] font-black transition sm:w-auto sm:min-w-[160px]",
          open ? "border-[#465FFF] bg-white text-[#101334]" : "border-[#DDE3EF] bg-white text-[#101334] hover:border-[#CBD5E1]"
        )}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown size={13} className={cn("text-[#8A94B8] transition", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-[220px] overflow-hidden rounded-[10px] border border-[#E5E9F3] bg-white py-1 shadow-[0_18px_42px_rgba(16,24,40,0.12)]"
        >
          {options.map((option) => {
            const isActive = option === value;
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => { onChange(option); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-bold transition",
                    isActive ? "bg-[#F4F6FF] text-[#101334]" : "text-[#53608C] hover:bg-[#F5F7FC]"
                  )}
                >
                  <span className="truncate">{option === ALL_CATEGORIES ? label : option}</span>
                  {isActive && <Check size={12} className="shrink-0 text-[#465FFF]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function HealthDonut({ total }: { total: number }) {
  if (total === 0) {
    return (
      <div className="flex size-[128px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#E5E9F3] bg-[#F8FAFF]">
        <div className="text-center">
          <Heart size={22} className="mx-auto text-[#A0ABC0]" />
          <p className="mt-2 text-[10px] font-bold text-[#A0ABC0]">No data</p>
        </div>
      </div>
    );
  }
  return (
    <div className="chart-donut-enter relative flex size-[128px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#10B981_0_83%,#F59E0B_83%_96%,#EF4444_96%_100%)]">
      <span className="absolute size-[86px] rounded-full bg-white" />
      <span className="relative text-center"><b className="block text-[26px] font-black text-[#101334]">{total}</b><span className="text-[10px] font-bold text-[#68739F]">Total</span></span>
    </div>
  );
}

function DistributionDonut({ total }: { total: number }) {
  if (total === 0) {
    return (
      <div className="flex size-[154px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#E5E9F3] bg-[#F8FAFF]">
        <div className="text-center">
          <PieChart size={24} className="mx-auto text-[#A0ABC0]" />
          <p className="mt-2 text-[10px] font-bold text-[#A0ABC0]">No data</p>
        </div>
      </div>
    );
  }
  return (
    <div className="chart-donut-enter relative flex size-[154px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_33%,#8B5CFF_33%_58%,#FF1D1D_58%_71%,#10B981_71%_86%,#F59E0B_86%_100%)]">
      <span className="absolute size-[104px] rounded-full bg-white" />
      <span className="relative text-center"><b className="block text-[24px] font-black text-[#101334]">{total}</b><span className="text-[10px] font-bold text-[#68739F]">Total</span></span>
    </div>
  );
}

function VolumeBars({ bars, isEmpty }: { bars: Array<{ label: string; value: string; height: number; color: string }>; isEmpty?: boolean }) {
  if (isEmpty || bars.length === 0 || (bars.length === 1 && bars[0].value === "0")) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-4 pt-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#F4F6FF]">
          <BarChart3 size={24} className="text-[#A0ABC0]" />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-bold text-[#53608C]">Belum ada data volume</p>
          <p className="mt-1 text-[11px] font-semibold text-[#A0ABC0]">Data akan muncul setelah source selesai di-sync</p>
        </div>
      </div>
    );
  }
  return <div className="grid h-[220px] grid-cols-7 items-end gap-4 px-4 pt-4">{bars.map(({ label, value, height, color }) => <div key={label} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[11px] font-black text-[#101334]">{value}</span><span className="w-8 rounded-t-[8px]" style={{ height: `${height}%`, backgroundColor: color }} /><span className="whitespace-pre-line text-center text-[10px] font-bold leading-tight text-[#68739F]">{label}</span></div>)}</div>;
}

function healthText(summary?: SourceHealthSummary, t?: ReturnType<typeof useTranslations>) {
  if (!summary || summary.total === 0) return t ? t("noSourcesYet") : "No sources yet";
  return t ? t("healthHealthyCount", { healthy: summary.healthy, total: summary.total }) : `${summary.healthy}/${summary.total} healthy`;
}

function formatCompact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return value.toLocaleString("id-ID");
}

function DistributionPanel({ total, legend }: { total: number; legend: Array<{ label: string; value: string; tone: Tone }> }) {
  const t = useTranslations("Sources");

  if (total === 0) {
    return (
      <Panel>
        <CardContent className="p-5">
          <h2 className="text-[17px] font-black text-[#101334]">{t("distribution")}</h2>
          <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("distributionDesc")}</p>
          <div className="mt-6 flex flex-col items-center gap-3 py-6">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#F4F6FF]">
              <PieChart size={24} className="text-[#A0ABC0]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-bold text-[#53608C]">{t("emptyDistribution")}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#A0ABC0]">{t("emptyDistributionDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Panel>
    );
  }

  return (
    <Panel>
      <CardContent className="p-5">
        <h2 className="text-[17px] font-black text-[#101334]">{t("distribution")}</h2>
        <p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("distributionDesc")}</p>
        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[170px_1fr]">
          <DistributionDonut total={total} />
          <div className="grid gap-3 text-[12px] font-bold text-[#53608C]">
            {legend.map(({ label, value, tone }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: toneStyles[tone].color }} />
                  {label}
                </span>
                <b className="text-[#101334]">{value}</b>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Panel>
  );
}

function buildCoverageBars(coverage: Awaited<ReturnType<typeof getSourceCoverage>> | undefined) {
  const entries = Object.entries(coverage?.typeCoverage ?? {}).slice(0, 7);
  const maxDocuments = Math.max(...entries.map(([, item]) => item.documents), 1);
  return entries.length > 0
    ? entries.map(([type, item], index) => ({
        label: type.charAt(0).toUpperCase() + type.slice(1),
        value: formatCompact(item.documents),
        height: Math.max(8, Math.round((item.documents / maxDocuments) * 100)),
        color: toneStyles[["black", "pink", "blue", "red", "green", "purple", "orange"][index % 7] as Tone].color,
      }))
    : [
        { label: "Belum\nAda", value: "0", height: 8, color: "#94A3B8" },
      ];
}

function buildCoverageLegend(coverage: Awaited<ReturnType<typeof getSourceCoverage>> | undefined) {
  return Object.entries(coverage?.typeCoverage ?? {}).map(([type, item], index) => {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const pct = coverage?.totalSources ? Math.round((item.sources / coverage.totalSources) * 100) : 0;
    return { label, value: `${item.sources} (${pct}%)`, tone: ["blue", "purple", "red", "green", "slate", "orange"][index % 6] as Tone };
  });
}

export default function SourcesPage() {
  const t = useTranslations("Sources");
  const tPagination = useTranslations("DashboardStates.pagination");
  const queryClient = useQueryClient();
  const toastHook = useToast();

  // Demo mode state
  const [demoMode, setDemoMode] = useState(false);
  const [hasCheckedDemoMode, setHasCheckedDemoMode] = useState(false);

  // Check demo mode on mount
  useEffect(() => {
    setDemoMode(isDemoMode());
    setHasCheckedDemoMode(true);
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    if (type === "info") { toastHook.info(message); return; }
    toastHook.success(message);
  };
  const toast = useTranslations("Sources.toasts");

  const sourcesQuery = useQuery({
    queryKey: ["sources", { limit: 50, demoMode }],
    queryFn: () => demoMode
      ? Promise.resolve(getMockSources())
      : getSources({ limit: 50 }),
    staleTime: 30 * 1000,
    enabled: hasCheckedDemoMode,
  });
  const sourceHealthQuery = useQuery({
    queryKey: ["source-health"],
    queryFn: getSourceHealth,
    staleTime: 60 * 1000,
  });
  const sourceCoverageQuery = useQuery({
    queryKey: ["source-coverage"],
    queryFn: getSourceCoverage,
    staleTime: 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateSource(id, { isActive }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      showToast(result ? toast("statusUpdated") : toast("statusUpdateFailed"), result ? "success" : "error");
    },
    onError: () => showToast(toast("statusUpdateRetry"), "error"),
  });

  const syncAllMutation = useMutation({
    mutationFn: (sourceIds: string[]) => runBatchSourceIngestion(sourceIds),
    onSuccess: async (summary) => {
      if (!summary || summary.total === 0) {
        showToast(toast("syncAllNone"), "error");
        return;
      }
      if (summary.failed === 0) {
        showToast(toast("syncAllScheduled", { count: summary.queued }));
      } else if (summary.queued === 0) {
        showToast(toast("syncAllAllFailed", { failed: summary.failed }), "error");
        console.warn("Sync All failed for every source:", summary.failures);
      } else {
        showToast(toast("syncAllPartial", { queued: summary.queued, failed: summary.failed }), "error");
        console.warn("Sync All partial failure:", summary.failures);
      }
      await queryClient.invalidateQueries({ queryKey: ["source-health"] });
    },
    onError: (error) => {
      console.error("Sync All mutation threw:", error);
      showToast(toast("syncAllError"), "error");
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: (data: { keyword: string; tiers: number[] }) => bootstrapDefaultSources({ keyword: data.keyword, tiers: data.tiers, includeActors: data.tiers.length > 0, includeWebScrapers: false, maxWebItems: 20 }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["source-health"] });
      await queryClient.invalidateQueries({ queryKey: ["source-coverage"] });
      if (result) {
        showToast(toast("bootstrapCreated", { created: result.created, skipped: result.skipped }));
        setIsModalOpen(false);
      } else {
        showToast(toast("bootstrapFailed"), "error");
      }
    },
    onError: () => showToast(toast("bootstrapFailed"), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: async (result) => {
      if (!result) {
        showToast(toast("deleteFailed"), "error");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["source-health"] });
      await queryClient.invalidateQueries({ queryKey: ["source-coverage"] });
      showToast(toast("deleted"));
      setSourceToDelete(null);
    },
    onError: () => showToast(toast("deleteFailed"), "error"),
  });

  const syncSingleMutation = useMutation({
    mutationFn: (sourceId: string) => runSourceIngestion(sourceId),
    onSuccess: async (result) => {
      if (result) {
        showToast(`Sync started: ${result.jobId.slice(0, 8)}...`);
        await queryClient.invalidateQueries({ queryKey: ["source-health"] });
        await queryClient.invalidateQueries({ queryKey: ["source-history"] });
      } else {
        showToast(toast("syncAllError"), "error");
      }
    },
    onError: () => showToast(toast("syncAllError"), "error"),
  });

  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Connector | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const liveConnectors = sourcesQuery.data?.data ? buildApiConnectors(sourcesQuery.data.data) : [];
  const isLiveUnavailable = sourcesQuery.data === null;
  const availableCategories = Array.from(new Set(liveConnectors.map((item) => item.category))).sort();
  const categoryOptions = [ALL_CATEGORIES, ...availableCategories];
  const baseItems = liveConnectors;
  
  const filteredItems = (categoryFilter === ALL_CATEGORIES
    ? baseItems
    : baseItems.filter((item) => item.category === categoryFilter)
  ).filter((item) => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalFilteredItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  
  const validPage = Math.min(Math.max(1, currentPage), totalPages > 0 ? totalPages : 1);
  const items = filteredItems.slice((validPage - 1) * pageSize, validPage * pageSize);

  const healthSummary = sourceHealthQuery.data?.summary;
  const coverage = sourceCoverageQuery.data ?? undefined;
  const coverageBars = buildCoverageBars(coverage);
  const coverageLegend = buildCoverageLegend(coverage);
  const activeSources = coverage?.activeSources ?? healthSummary?.active ?? filteredItems.filter((item) => item.active).length;
  const totalSources = coverage?.totalSources ?? healthSummary?.total ?? totalFilteredItems;
  const totalDocuments = coverage?.totalDocuments ?? 0;
  const warningCount = (healthSummary?.warning ?? 0) + (healthSummary?.unknown ?? 0);

  const recentHealthEntries = (sourceHealthQuery.data?.sources ?? [])
    .filter((source) => source.health.lastSyncAt)
    .slice(0, 5)
    .map((source) => {
      const tone = source.health.health === "healthy" ? "green" : source.health.health === "warning" ? "amber" : "red";
      return [source.id, source.name, source.health.health, formatSourceTime(source.health.lastSyncAt ?? undefined), tone, Database] as const;
    });

  const settings = [
    [t("settingsKeyword"), t("settingsKeywordDesc"), KeyRound, "blue"],
    [t("settingsDedup"), t("settingsDedupDesc"), Database, "purple"],
    [t("settingsRateLimit"), t("settingsRateLimitDesc"), Clock3, "purple"],
    [t("settingsRetention"), t("settingsRetentionDesc"), Bell, "orange"],
    [t("settingsWebhooks"), t("settingsWebhooksDesc"), Webhook, "purple"],
  ] as const;

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="flex items-center justify-center gap-2 rounded-[10px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-4 py-3">
          <Sparkles size={16} className="text-[#8B5CFF]" />
          <p className="text-[13px] font-bold text-[#8B5CFF]">
            Demo Mode — Showing sample data for demonstration purposes
          </p>
        </div>
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("title")}</h1><p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("desc")}</p></div>
        <button type="button" onClick={() => setIsModalOpen(true)} disabled={bootstrapMutation.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] px-4 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"><Plus size={15} />{bootstrapMutation.isPending ? toast("bootstrapInProgress") : t("add")}</button>
      </header>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t("metricConnectedSources")} value={String(totalSources)} helper={t("metricActive", { count: activeSources })} icon={Database} tone="purple" />
        <MetricCard label={t("metricLiveMonitoring")} value={activeSources > 0 ? "24/7" : "-"} helper={healthText(healthSummary, t)} icon={Play} tone="green" />
        <MetricCard label={t("metricTotalDocuments")} value={formatCompact(totalDocuments)} helper={t("metricCoverage", { count: coverage?.coverageRate ?? 0 })} icon={Zap} tone="blue" />
        <MetricCard label={t("metricHealthWarning")} value={String(warningCount)} helper={t("metricCritical", { count: healthSummary?.critical ?? 0 })} icon={RefreshCw} tone="amber" />
        <MetricCard label={t("metricLastSync")} value={sourceHealthQuery.data?.sources.find((source) => source.health.lastSyncAt)?.health.lastSyncAt ? formatSourceTime(sourceHealthQuery.data.sources.find((source) => source.health.lastSyncAt)?.health.lastSyncAt ?? undefined) : "-"} helper={t("metricFromHealthApi")} icon={Clock3} tone="purple" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <CardContent className="p-4">
              <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div><h2 className="text-[18px] font-black tracking-[-0.02em] text-[#101334]">{t("gridTitle")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("gridDesc")}</p></div>
                <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder={t("searchPlaceholder")}
                    className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] placeholder:text-[#A0ABC0] focus:border-[#465FFF] focus:outline-none sm:w-[180px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const liveIds = (sourcesQuery.data?.data ?? [])
                        .filter((source) => source.isActive !== false)
                        .map((source) => source.id);
                      if (liveIds.length === 0) {
                        showToast(toast("syncAllNoneActive"), "error");
                        return;
                      }
                      syncAllMutation.mutate(liveIds);
                    }}
                    disabled={syncAllMutation.isPending || sourcesQuery.isPending}
                    className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] px-4 text-[12px] font-black text-[#53608C] transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                  >
                    <RotateCw size={14} className={syncAllMutation.isPending ? "animate-spin" : ""} />
                    {syncAllMutation.isPending ? toast("syncAllInProgress") : t("syncAll")}
                  </button>
                  <button
                    type="button"
                    aria-label="Tampilkan sumber dalam grid"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-[8px] border transition",
                      viewMode === "grid"
                        ? "border-[#465FFF]/40 bg-[#EEF0FF] text-[#465FFF]"
                        : "border-[#DDE3EF] bg-white text-[#53608C] hover:border-[#CBD5E1]"
                    )}
                  >
                    <Grid3X3 size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Tampilkan sumber dalam daftar"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-[8px] border transition",
                      viewMode === "list"
                        ? "border-[#465FFF]/40 bg-[#EEF0FF] text-[#465FFF]"
                        : "border-[#DDE3EF] bg-white text-[#53608C] hover:border-[#CBD5E1]"
                    )}
                  >
                    <List size={15} />
                  </button>
                  <CategoryFilterDropdown
                    value={categoryFilter}
                    options={categoryOptions}
                    onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
                    label={t("allCategories")}
                  />
                </div>
              </div>
              {categoryFilter !== ALL_CATEGORIES && items.length === 0 ? (
                <DashboardEmptyState title={t("noCategoryMatch")} description={t("noCategoryMatchDesc")} icon="search" minHeight="min-h-[180px]" />
              ) : null}
              {sourcesQuery.isPending ? (
                <PanelSkeleton />
              ) : sourcesQuery.data && liveConnectors.length === 0 ? (
                <DashboardEmptyState title={t("noLiveSources")} description={t("noLiveSourcesDesc")} icon="inbox" minHeight="min-h-[320px]" />
              ) : (
                <>
                  {isLiveUnavailable ? <DashboardErrorState title={t("liveUnavailable")} description={t("liveUnavailableDesc")} onRetry={() => void sourcesQuery.refetch()} minHeight="min-h-[150px]" /> : null}
                  {viewMode === "grid" ? (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                      {items.map((source) => (
                        <ConnectorCard
                          key={source.id}
                          source={source}
                          selected={selectedSourceId === source.id}
                          onSelect={(item) => setSelectedSourceId(item.id)}
                          onToggle={(item) => toggleMutation.mutate({ id: item.id, isActive: !item.active })}
                          onDelete={(item) => setSourceToDelete(item)}
                          onSync={(item) => syncSingleMutation.mutate(item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_140px_120px_auto] items-center gap-4 px-4 text-[10px] font-black uppercase tracking-wide text-[#A0ABC0]">
                        <span>Source</span>
                        <span>Health</span>
                        <span>Signals (24h)</span>
                        <span>Last Sync</span>
                        <span>Status</span>
                        <span>Actions</span>
                      </div>
                      {items.map((source) => (
                        <ConnectorListRow
                          key={source.id}
                          source={source}
                          selected={selectedSourceId === source.id}
                          onSelect={(item) => setSelectedSourceId(item.id)}
                          onToggle={(item) => toggleMutation.mutate({ id: item.id, isActive: !item.active })}
                          onDelete={(item) => setSourceToDelete(item)}
                          onSync={(item) => syncSingleMutation.mutate(item.id)}
                        />
                      ))}
                    </div>
                  )}

                  {totalFilteredItems > pageSize && (
                    <div className="mt-6 flex items-center justify-between border-t border-[#E8ECF5] pt-4">
                      <span className="text-[12px] font-bold text-[#68739F]">
                        {tPagination("summary", {
                          start: (currentPage - 1) * pageSize + 1,
                          end: Math.min(currentPage * pageSize, totalFilteredItems),
                          total: totalFilteredItems,
                          label: "sources",
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex h-8 items-center justify-center rounded-[6px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#53608C] transition hover:bg-[#F4F6FF] hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {tPagination("prev")}
                        </button>
                        <span className="text-[12px] font-bold text-[#101334]">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="flex h-8 items-center justify-center rounded-[6px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#53608C] transition hover:bg-[#F4F6FF] hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {tPagination("next")}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <button type="button" onClick={() => setIsModalOpen(true)} disabled={bootstrapMutation.isPending} className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-[#DDE3EF] bg-[#FBFCFF] px-4 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-70"><span className="flex min-w-0 items-center gap-3"><CirclePlus size={20} className="shrink-0 text-[#465FFF]" /><span className="min-w-0"><b className="block text-[13px] font-black text-[#465FFF]">{bootstrapMutation.isPending ? toast("bootstrapInProgress") : t("connect")}</b><span className="block text-[11px] font-semibold leading-snug text-[#68739F]">{t("connectDesc")}</span></span></span><ArrowRight size={16} className="shrink-0 text-[#53608C]" /></button>
            </CardContent>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <Panel><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[17px] font-black text-[#101334]">{t("volume")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("volumeDesc")}</p></div><button type="button" onClick={() => showToast(toast("liveApiRefreshing"), "success")} className="flex h-9 items-center gap-2 rounded-[8px] border border-[#DDE3EF] px-3 text-[11px] font-black text-[#53608C] transition hover:border-[#CBD5E1]">Live API<ChevronDown size={12} /></button></div><VolumeBars bars={coverageBars} /></CardContent></Panel>
            <DistributionPanel
              total={totalSources}
              legend={coverageLegend.length > 0 ? coverageLegend : [{ label: t("noSourcesLegend"), value: "0 (0%)", tone: "slate" as Tone }]}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{t("healthTitle")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("healthDesc")}</p><div className="mt-5 grid items-center gap-5 sm:grid-cols-[128px_1fr] xl:grid-cols-1 2xl:grid-cols-[128px_1fr]"><HealthDonut total={healthSummary?.total ?? totalSources} /><div className="grid gap-3 text-[12px] font-bold text-[#53608C]"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#10B981]" />{t("healthHealthy")}</span><b className="text-[#101334]">{healthSummary?.healthy ?? 0}</b></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#F59E0B]" />{t("healthWarning")}</span><b className="text-[#101334]">{healthSummary?.warning ?? 0}</b></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#EF4444]" />{t("healthCritical")}</span><b className="text-[#101334]">{healthSummary?.critical ?? 0}</b></div></div></div><div className="mt-5 rounded-[12px] border border-[#BFEBD9] bg-[#ECFDF6] p-4"><div className="flex items-start gap-3"><ShieldCheck size={20} className="text-[#10B981]" /><span><b className="block text-[13px] font-black text-[#0C9B69]">{healthSummary && healthSummary.critical > 0 ? t("healthNeedsAttention") : t("optimal")}</b><span className="text-[12px] font-semibold text-[#53608C]">{healthText(healthSummary, t)}</span></span></div></div></CardContent></Panel>

          <Panel><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-[17px] font-black text-[#101334]">{t("activity")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("activityDesc")}</p></div></div>{recentHealthEntries.length > 0 ? <div className="grid gap-3">{recentHealthEntries.map(([id, name, status, time, tone, Icon]) => { const TypedIcon = Icon as SourceIcon; const style = toneStyles[tone as Tone]; return <div key={id} className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-3"><span className="flex size-7 items-center justify-center rounded-[7px]" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}><TypedIcon className="size-[15px]" /></span><span className="min-w-0"><b className="block truncate text-[12px] text-[#101334]">{name}</b><span className="text-[11px] font-semibold capitalize" style={{ color: style.color }}>{status}</span></span></span><span className="shrink-0 text-[10px] font-bold text-[#68739F]">{time}</span><Check size={13} style={{ color: style.color }} /></div>; })}</div> : <DashboardEmptyState title={toast("activity.emptyTitle")} description={toast("activity.emptyDesc")} icon="search" minHeight="min-h-[120px]" />}</CardContent></Panel>

          <Panel><CardContent className="p-5"><h2 className="text-[17px] font-black text-[#101334]">{t("settings")}</h2><p className="mt-1 text-[12px] font-semibold text-[#68739F]">{t("settingsDesc")}</p><div className="mt-4 grid gap-2.5">{settings.map(([title, desc, Icon, tone]) => { const TypedIcon = Icon as LucideIcon; const style = toneStyles[tone as Tone]; return <button key={title as string} type="button" onClick={() => showToast(toast("settingsUnavailable", { title: title as string }), "error")} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#EEF1F7] bg-[#FBFCFF] p-3 text-left transition hover:border-[#CBD5E1] hover:bg-white"><span className="flex min-w-0 items-center gap-3"><span className="flex size-8 items-center justify-center rounded-[8px]" style={{ color: style.color, backgroundColor: `rgba(${style.rgb}, .10)` }}><TypedIcon size={16} /></span><span><b className="block text-[12px] text-[#101334]">{title as string}</b><span className="text-[10px] font-semibold text-[#68739F]">{desc as string}</span></span></span><ChevronDown size={14} className="-rotate-90 text-[#53608C]" /></button>; })}</div></CardContent></Panel>
        </aside>
      </section>

      <ConfirmationDialog
        open={!!sourceToDelete}
        onOpenChange={(open) => { if (!open) setSourceToDelete(null); }}
        title={toast("delete.title")}
        description={toast("delete.description", { name: sourceToDelete?.name ?? "" })}
        confirmLabel={deleteMutation.isPending ? toast("delete.deleting") : toast("delete.confirm")}
        tone="danger"
        onConfirm={() => {
          if (sourceToDelete) deleteMutation.mutate(sourceToDelete.id);
          else setSourceToDelete(null);
        }}
      />

      <AddSourceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        isPending={bootstrapMutation.isPending}
        onSubmit={(data) => bootstrapMutation.mutate(data)}
      />
    </div>
  );
}
