"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Headphones,
  HelpCircle,
  Info,
  Megaphone,
  MoreVertical,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AppStore,
  Discourse,
  Facebook,
  GooglePlay,
  Instagram,
  TikTokDark,
  XLight,
} from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, DashboardPagination, TableSkeleton, formatPaginationSummary } from "@/components/dashboard/dashboard-states";
import { getAlerts, updateAlertStatus, type Alert as ApiAlert, type PaginationInfo } from "@/lib/api-service";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Sentiment = "NEGATIF" | "POSITIF" | "CAMPURAN";
type AlertStatus = "Baru" | "Investigating" | "Escalated" | "Resolved";
type SourceKey = keyof typeof sourceIcons;

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
  text: string;
  border: string;
};

type AlertRow = {
  id: number | string;
  title: string;
  description: string;
  tags: string[];
  sourceLabel: string;
  sources: SourceKey[];
  extraSources: number;
  sentiment: Sentiment;
  velocity: string;
  velocityPeriod: string;
  velocityTrend: number[];
  mentions: string;
  confidence: string;
  impact: "Tinggi" | "Sedang";
  status: AlertStatus;
  time: string;
  tone: Exclude<Tone, "purple" | "slate">;
};

const alertsApiLimit = 10;

const aiAgentImage = "/mainapp/alerts-ai-agent.png";

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#465FFF]", border: "border-[#465FFF]/15" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#8B5CFF]", border: "border-[#8B5CFF]/15" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/15" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/15" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/15" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

const metricCards = [
  { label: "Total Alert (30 Hari)", value: "1.248", helper: "▲ 18,7% vs 30 hari", helperTone: "green", icon: Bell, tone: "purple", spark: [18, 21, 20, 26, 24, 31, 25, 35, 30, 38, 34, 42] },
  { label: "Alert Kritis", value: "32", helper: "▲ 11,1% vs 30 hari", helperTone: "red", icon: AlertTriangle, tone: "red", spark: [18, 17, 19, 18, 20, 16, 18, 15, 17, 16, 15, 14] },
  { label: "Alert Peringatan", value: "156", helper: "▲ 9,3% vs 30 hari", helperTone: "green", icon: AlertTriangle, tone: "amber", spark: [12, 16, 14, 18, 15, 22, 17, 20, 18, 24, 21, 26] },
  { label: "Alert Informasi", value: "1.060", helper: "▲ 21,4% vs 30 hari", helperTone: "blue", icon: Info, tone: "blue", spark: [20, 24, 22, 29, 25, 34, 28, 32, 30, 37, 35, 40] },
  { label: "Terselesaikan", value: "1.216", helper: "▲ 24,8% vs 30 hari", helperTone: "green", icon: ShieldCheck, tone: "green", spark: [16, 21, 19, 24, 22, 28, 26, 34, 30, 38, 35, 41] },
] satisfies Array<{ label: string; value: string; helper: string; helperTone: Tone; icon: LucideIcon; tone: Tone; spark: number[] }>;

const alertRows: AlertRow[] = [
  {
    id: 1,
    title: "Payment delay complaints are rising",
    description: "Keluhan pembayaran tertunda meningkat signifikan di X/Twitter wilayah Jabodetabek.",
    tags: ["Reputation Risk", "Customer Experience"],
    sourceLabel: "Social Media",
    sources: ["x", "instagram", "tiktok"],
    extraSources: 3,
    sentiment: "NEGATIF",
    velocity: "+248%",
    velocityPeriod: "in 2 hours",
    velocityTrend: [8, 13, 10, 22, 18, 29, 35, 31, 44],
    mentions: "1.248",
    confidence: "94%",
    impact: "Tinggi",
    status: "Baru",
    time: "10:23 WIB",
    tone: "red",
  },
  {
    id: 2,
    title: "Mobile app stability disruption",
    description: "Pengguna melaporkan aplikasi sering crash saat melakukan transaksi.",
    tags: ["Operational Risk", "Customer Experience"],
    sourceLabel: "App Reviews",
    sources: ["appstore", "googleplay"],
    extraSources: 1,
    sentiment: "NEGATIF",
    velocity: "+89%",
    velocityPeriod: "in 4 hours",
    velocityTrend: [7, 9, 8, 13, 11, 18, 16, 23, 28],
    mentions: "842",
    confidence: "89%",
    impact: "Tinggi",
    status: "Investigating",
    time: "09:45 WIB",
    tone: "amber",
  },
  {
    id: 3,
    title: "New promo receives positive response",
    description: "Promo cashback terbaru mendapatkan respon positif dari pelanggan.",
    tags: ["Marketing Opportunity"],
    sourceLabel: "Social Media",
    sources: ["instagram", "facebook", "tiktok"],
    extraSources: 2,
    sentiment: "POSITIF",
    velocity: "+67%",
    velocityPeriod: "in 6 hours",
    velocityTrend: [6, 8, 10, 12, 15, 18, 16, 22, 29],
    mentions: "621",
    confidence: "87%",
    impact: "Sedang",
    status: "Baru",
    time: "09:10 WIB",
    tone: "green",
  },
  {
    id: 4,
    title: "FAQ confusion around credit terms",
    description: "Banyak pengguna bingung dengan syarat kredit baru pada fitur pembayaran.",
    tags: ["Customer Experience"],
    sourceLabel: "Support Tickets",
    sources: ["support"],
    extraSources: 1,
    sentiment: "CAMPURAN",
    velocity: "+32%",
    velocityPeriod: "in 5 hours",
    velocityTrend: [9, 11, 10, 13, 12, 16, 18, 21, 24],
    mentions: "398",
    confidence: "81%",
    impact: "Sedang",
    status: "Escalated",
    time: "09:20 WIB",
    tone: "blue",
  },
  {
    id: 5,
    title: "Data security issue",
    description: "Pertanyaan terkait keamanan data akun meningkat di forum komunitas.",
    tags: ["Security Risk"],
    sourceLabel: "Forums",
    sources: ["discourse"],
    extraSources: 2,
    sentiment: "NEGATIF",
    velocity: "+18%",
    velocityPeriod: "in 7 hours",
    velocityTrend: [5, 7, 6, 9, 8, 10, 9, 12, 10],
    mentions: "276",
    confidence: "78%",
    impact: "Tinggi",
    status: "Investigating",
    time: "07:50 WIB",
    tone: "amber",
  },
];

const sourceIcons = {
  x: <XLight className="size-3.5" />,
  instagram: <Instagram className="size-3.5" />,
  tiktok: <TikTokDark className="size-3.5" />,
  facebook: <Facebook className="size-3.5" />,
  appstore: <AppStore className="size-3.5" />,
  googleplay: <GooglePlay className="size-3.5" />,
  support: <Headphones className="size-3.5 text-[#465FFF]" strokeWidth={2.4} />,
  discourse: <Discourse className="size-3.5" />,
};

const actionableAlerts = [
  { title: "Payment delay complaints are rising", meta: "1.248 mentions • Confidence 94%", badge: "KRITIS", time: "10:23 WIB", tone: "red" },
  { title: "Mobile app stability disruption", meta: "842 mentions • Confidence 89%", badge: "PERINGATAN", time: "09:45 WIB", tone: "amber" },
  { title: "Service disruption", meta: "Mobile app issue", badge: "PERINGATAN", time: "09:10 WIB", tone: "blue" },
  { title: "Data security issue", meta: "Account security", badge: "PERINGATAN", time: "09:00 WIB", tone: "amber" },
  { title: "New promo receives positive response", meta: "621 mentions • Confidence 87%", badge: "INFORMASI", time: "08:15 WIB", tone: "green" },
] satisfies Array<{ title: string; meta: string; badge: string; time: string; tone: Exclude<Tone, "purple" | "slate"> }>;

const aiRecommendations = [
  { action: "Investigasi keluhan payment delay", desc: "Prioritas tinggi karena dampak reputasi.", badge: "High Priority", icon: AlertTriangle, tone: "red" },
  { action: "Buat klarifikasi publik proaktif", desc: "Cegah eskalasi sentiment negatif.", badge: "High Priority", icon: Megaphone, tone: "blue" },
  { action: "Escalate ke Ops Team", desc: "Masalah stabilitas aplikasi meningkat.", badge: "Medium Priority", icon: UserCheck, tone: "purple" },
] satisfies Array<{ action: string; desc: string; badge: string; icon: LucideIcon; tone: Tone }>;

const sourceDistribution = [
  { name: "X / Twitter", value: "48% (1.364)", color: "#465FFF" },
  { name: "TikTok", value: "22% (625)", color: "#8B5CFF" },
  { name: "News", value: "14% (398)", color: "#EF4444" },
  { name: "App Reviews", value: "10% (284)", color: "#10B981" },
  { name: "Lainnya", value: "6% (171)", color: "#94A3B8" },
];

const timeline = [320, 450, 380, 690, 470, 720, 930, 1024, 850, 670, 980, 720, 710];

function compactTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function stableTrend(seed: string) {
  const base = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0) || 37;
  return Array.from({ length: 9 }, (_, index) => 7 + ((base + index * 11) % 36));
}

function toneFromSeverity(severity: string | null): Exclude<Tone, "purple" | "slate"> {
  const value = severity?.toLowerCase() ?? "";
  if (value.includes("critical") || value.includes("high")) return "red";
  if (value.includes("medium")) return "amber";
  if (value.includes("low")) return "blue";
  return "green";
}

function statusFromApi(status: string): AlertStatus {
  const value = status.toLowerCase();
  if (value.includes("resolved")) return "Resolved";
  if (value.includes("acknowledged") || value.includes("investigating")) return "Investigating";
  if (value.includes("escalated")) return "Escalated";
  return "Baru";
}

function buildApiAlertRows(apiAlerts: ApiAlert[]): AlertRow[] {
  return apiAlerts.map((alert) => {
    const tone = toneFromSeverity(alert.severity);
    const isPositive = tone === "green";

    return {
      id: alert.id,
      title: alert.title,
      description: alert.whatHappened || alert.whyItMatters || alert.whatToDo || "Alert live dari backend Narriv.",
      tags: [alert.type || "Alert", alert.severity || "Open"],
      sourceLabel: "Narriv API",
      sources: [tone === "blue" ? "support" : "discourse"],
      extraSources: 0,
      sentiment: isPositive ? "POSITIF" : tone === "blue" ? "CAMPURAN" : "NEGATIF",
      velocity: "Live",
      velocityPeriod: "from API",
      velocityTrend: stableTrend(alert.id),
      mentions: "1",
      confidence: "-",
      impact: tone === "red" ? "Tinggi" : "Sedang",
      status: statusFromApi(alert.status),
      time: compactTime(alert.createdAt),
      tone,
    };
  });
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      {children}
    </section>
  );
}

function Sparkline({ values, tone, id, className = "h-9" }: { values: number[]; tone: Tone; id: string; className?: string }) {
  const style = toneStyles[tone];
  const width = 150;
  const height = 42;
  const path = makeLinePath(values, width, height, 5);
  const areaPath = `${path} L ${width - 2} ${height} L 2 ${height} Z`;

  return (
    <svg className={cn("chart-line-draw w-full overflow-visible", className)} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={style.color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={style.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={style.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
    </svg>
  );
}

function makeLinePath(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function MetricCard({ label, value, helper, helperTone, icon: Icon, tone, spark }: { label: string; value: string; helper: string; helperTone: Tone; icon: LucideIcon; tone: Tone; spark: number[] }) {
  const style = toneStyles[tone];
  const helperStyle = toneStyles[helperTone];

  return (
    <Panel className="relative min-h-[102px] overflow-hidden p-4">
      <div className="flex items-center gap-3.5">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-[0_10px_26px_rgba(70,95,255,0.10)]", style.soft, style.text, style.border)}>
          <Icon size={20} strokeWidth={2.35} />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-extrabold text-[#68739F]">{label}</span>
          <span className="mt-1 block text-[25px] font-black leading-none tracking-[-0.045em] text-[#101334]">{value}</span>
          <span className={cn("mt-1.5 block text-[10px] font-black", helperStyle.text)}>{helper}</span>
        </span>
      </div>
      <div className="absolute inset-x-4 bottom-1">
        <Sparkline values={spark} tone={tone} id={`metric-${tone}-${label.replace(/\W/g, "")}`} className="h-7" />
      </div>
    </Panel>
  );
}

function AlertAgentImage() {
  return (
    <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-b from-[#EEF0FF] via-white to-[#F1EEFF] shadow-[inset_0_0_24px_rgba(70,95,255,0.10)]">
      <Image
        src={aiAgentImage}
        alt="AI alert assistant illustration"
        width={96}
        height={96}
        sizes="96px"
        unoptimized
        className="relative h-full w-full object-cover"
        style={{ transform: "scale(1.25)" }}
      />
    </div>
  );
}

function SummaryCard() {
  return (
    <Panel className="overflow-hidden p-5">
      <div className="grid gap-5 md:grid-cols-[96px_1fr]">
        <AlertAgentImage />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">AI Alert Summary</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#8B5CFF]">
              <Sparkles size={12} /> AI Generated
            </span>
          </div>
          <p className="mt-3 max-w-[720px] text-[14px] font-black leading-relaxed text-[#101334]">
            Dalam 24 jam terakhir, terjadi lonjakan keluhan terkait payment delay dan stabilitas aplikasi di wilayah Jabodetabek.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <SummaryPoint color="#EF4444" title="Risiko Tertinggi" text="Payment delay complaints (Confidence 94%)" />
            <SummaryPoint color="#F59E0B" title="Peningkatan Signifikan" text="Keluhan meningkat +248% dalam 2 jam terakhir di X/Twitter." />
            <SummaryPoint color="#10B981" title="Rekomendasi AI" text="Investigasi SLA pembayaran dan komunikasi publik proaktif." />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SummaryPoint({ color, title, text }: { color: string; title: string; text: string }) {
  return (
    <div className="border-l border-[#D8DEEF] pl-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-[11px] font-black text-[#101334]">{title}</p>
      </div>
      <p className="mt-2 text-[11px] font-bold leading-relaxed text-[#58648C]">{text}</p>
    </div>
  );
}

function QuickFilter() {
  return (
    <Panel className="flex min-h-full flex-col justify-between gap-5 p-5">
      <div>
        <h3 className="text-[12px] font-black text-[#101334]">Quick Filter</h3>
        <label className="relative mt-3 block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#68739F]" />
          <input
            type="search"
            placeholder="Cari alert..."
            className="h-10 w-full rounded-[9px] border border-[#DDE3EF] bg-[#F8FAFF] px-10 text-[11px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white"
          />
          <SlidersHorizontal className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#68739F]" />
        </label>
      </div>
      <div>
        <h3 className="text-[12px] font-black text-[#101334]">Filter Cepat</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Semua', 'Kritis', 'Peringatan', 'Informasi'].map((label, index) => (
            <button
              key={label}
              type="button"
              className={cn("h-7 rounded-[7px] px-3 text-[10px] font-black transition", index === 0 ? "bg-[#465FFF] text-white shadow-[0_8px_18px_rgba(70,95,255,0.22)]" : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#58648C] hover:bg-white")}
            >
              {label}
            </button>
          ))}
          <button type="button" className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[10px] font-black text-[#58648C] transition hover:bg-white">
            Terbaru <ChevronDown size={13} />
          </button>
        </div>
      </div>
    </Panel>
  );
}

function SourceIconList({ label, sources, extraSources }: { label: string; sources: SourceKey[]; extraSources: number }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black text-[#68739F]">{label}</p>
      <div className="flex items-center gap-1.5">
        {sources.map((source) => (
          <span key={source} className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border border-[#E6EAF2] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {sourceIcons[source]}
          </span>
        ))}
        {extraSources > 0 ? <span className="rounded-full bg-[#F1F4FB] px-1.5 py-0.5 text-[9px] font-black text-[#68739F]">+{extraSources}</span> : null}
      </div>
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    "Reputation Risk": "bg-[#EF4444]/10 text-[#EF4444]",
    "Customer Experience": "bg-[#F97316]/10 text-[#F97316]",
    "Operational Risk": "bg-[#F59E0B]/12 text-[#D97706]",
    "Marketing Opportunity": "bg-[#10B981]/10 text-[#0C9B69]",
    "Security Risk": "bg-[#F59E0B]/12 text-[#D97706]",
  };

  return <span className={cn("rounded-full px-2 py-1 text-[9px] font-black", styles[tag] ?? "bg-slate-100 text-slate-500")}>{tag}</span>;
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const styles: Record<Sentiment, string> = {
    NEGATIF: "bg-[#EF4444]/10 text-[#EF4444]",
    POSITIF: "bg-[#10B981]/10 text-[#0C9B69]",
    CAMPURAN: "bg-[#8B5CFF]/10 text-[#8B5CFF]",
  };

  return <span className={cn("rounded-[7px] px-2 py-1 text-[10px] font-black tracking-[0.14em]", styles[sentiment])}>{sentiment}</span>;
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, string> = {
    Baru: "bg-[#8B5CFF]/10 text-[#465FFF]",
    Investigating: "bg-[#465FFF]/10 text-[#465FFF]",
    Escalated: "bg-[#F97316]/12 text-[#F97316]",
    Resolved: "bg-[#10B981]/10 text-[#0C9B69]",
  };

  return <span className={cn("rounded-[8px] px-2.5 py-1 text-[10px] font-black", styles[status])}>{status}</span>;
}

function AlertIcon({ tone }: { tone: AlertRow["tone"] }) {
  const style = toneStyles[tone];
  const Icon = tone === "green" ? Star : tone === "blue" ? HelpCircle : AlertTriangle;

  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", style.soft, style.text)}>
      <Icon size={17} fill={tone === "green" ? style.color : "none"} strokeWidth={2.3} />
    </span>
  );
}

function AlertsTable({ rows, footerText, pagination, onPageChange, isFetching, onStatusChange, openMenuId, setOpenMenuId, menuRef }: { rows: AlertRow[]; footerText: string; pagination?: PaginationInfo | null; onPageChange: (page: number) => void; isFetching?: boolean; onStatusChange: (id: string | number, status: "open" | "acknowledged" | "resolved") => void; openMenuId: string | number | null; setOpenMenuId: (id: string | number | null) => void; menuRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <Panel className="p-4">
      <div>
        <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Daftar Alert</h2>
        <p className="mt-1 text-[11px] font-bold text-[#68739F]">Menampilkan alert dengan prioritas tertinggi.</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[10px] font-black uppercase tracking-[0.18em] text-[#68739F]">
              {['Alert', 'Sumber', 'Sentimen', 'Velocity', 'Mentions', 'Confidence', 'Dampak', 'Status', 'Waktu', ''].map((header) => (
                <th key={header || 'actions'} className="px-3 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7]">
            {rows.map((alert) => (
              <tr key={alert.id} className="transition hover:bg-[#F8FAFF]">
                <td className="min-w-[240px] max-w-[315px] px-3 py-3.5">
                  <div className="flex items-start gap-3">
                    <AlertIcon tone={alert.tone} />
                    <div className="min-w-0">
                      <Link href={`/alerts/${alert.id}`} className="text-[12px] font-black leading-snug text-[#101334] hover:text-[#465FFF]">
                        {alert.title}
                      </Link>
                      <p className="mt-1 text-[11px] font-bold leading-snug text-[#68739F]">{alert.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alert.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle"><SourceIconList label={alert.sourceLabel} sources={alert.sources} extraSources={alert.extraSources} /></td>
                <td className="px-3 py-3.5 align-middle"><SentimentBadge sentiment={alert.sentiment} /></td>
                <td className="px-3 py-3.5 align-middle">
                  <div className="flex items-center gap-3">
                    <span>
                      <span className={cn("block text-[12px] font-black", alert.sentiment === "POSITIF" ? "text-[#10B981]" : "text-[#EF4444]")}>{alert.velocity}</span>
                      <span className="mt-1 block whitespace-nowrap text-[10px] font-bold text-[#68739F]">{alert.velocityPeriod}</span>
                    </span>
                    <Sparkline values={alert.velocityTrend} tone={alert.tone} id={`row-${alert.id}`} className="h-8 w-[62px]" />
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle text-[12px] font-black text-[#101334]">{alert.mentions}</td>
                <td className="px-3 py-3.5 align-middle text-[12px] font-black text-[#10B981]">{alert.confidence}</td>
                <td className="px-3 py-3.5 align-middle text-[12px] font-black text-[#101334]">{alert.impact}</td>
                <td className="px-3 py-3.5 align-middle"><StatusBadge status={alert.status} /></td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-black text-[#31406B]">{alert.time}</td>
                <td className="relative px-3 py-3.5 text-right align-middle">
                  <button type="button" aria-label={`Open actions for ${alert.title}`} onClick={() => setOpenMenuId(openMenuId === alert.id ? null : alert.id)} className="rounded-md p-1 text-[#68739F] transition hover:bg-[#EEF2FF] hover:text-[#465FFF]"><MoreVertical size={16} /></button>
                  {openMenuId === alert.id && (
                    <div ref={menuRef} className="absolute right-3 top-full z-50 mt-1 w-48 rounded-[10px] border border-[#E6EAF2] bg-white py-1 shadow-[0_12px_36px_rgba(16,24,40,0.12)]">
                      <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#8B95B8]">Ubah Status</p>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "open"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><Bell size={13} className="text-[#465FFF]" /> Baru</button>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "acknowledged"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><Check size={13} className="text-[#10B981]" /> Investigating</button>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "resolved"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><ShieldCheck size={13} className="text-[#0C9B69]" /> Resolved</button>
                      <div className="my-1 border-t border-[#EDF1F7]" />
                      <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#8B95B8]">Tugaskan</p>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "acknowledged"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><UserPlus size={13} className="text-[#8B5CFF]" /> Tugaskan ke Saya</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row">
        <p className="text-[11px] font-bold text-[#68739F]">{footerText}</p>
        <DashboardPagination pagination={pagination} onPageChange={onPageChange} disabled={isFetching} />
      </div>
    </Panel>
  );
}

function SidePanel() {
  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Perlu Ditindaklanjuti</h3>
        <p className="mt-1 text-[12px] font-bold text-[#68739F]">Alert yang membutuhkan perhatian segera.</p>
        <div className="mt-4 space-y-2.5">
          {actionableAlerts.map((alert) => <ActionableAlert key={alert.title} {...alert} />)}
        </div>
        <Link href="/alerts" className="mt-4 flex items-center justify-center gap-2 text-[12px] font-black text-[#465FFF] hover:underline">
          Lihat semua alert <ArrowRight size={14} />
        </Link>
      </Panel>
      <Panel className="p-4">
        <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Rekomendasi Tindakan AI</h3>
        <p className="mt-1 text-[12px] font-bold text-[#68739F]">Disarankan berdasarkan prioritas dan dampak.</p>
        <div className="mt-5 space-y-4">
          {aiRecommendations.map((item) => <Recommendation key={item.action} {...item} />)}
        </div>
        <button type="button" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-[#E6EAF2] bg-white text-[12px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
          Buat Rencana Tindakan <ArrowRight size={14} />
        </button>
      </Panel>
    </div>
  );
}

function ActionableAlert({ title, meta, badge, time, tone }: (typeof actionableAlerts)[number]) {
  const style = toneStyles[tone];
  const Icon = tone === "green" ? Star : tone === "blue" ? HelpCircle : AlertTriangle;

  return (
    <div className={cn("grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-[12px] border p-3 sm:grid-cols-[34px_minmax(0,1fr)_auto]", tone === "red" ? "border-[#FDE2E2] bg-[#FFF5F5]" : "border-[#EDF1F7] bg-[#FBFCFF]")}>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", style.soft, style.text)}><Icon size={15} fill={tone === "green" ? style.color : "none"} /></span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-black text-[#101334]">{title}</span>
        <span className="mt-1 block text-[10px] font-bold text-[#58648C]">{meta}</span>
      </span>
      <span className="col-start-2 text-left sm:col-start-auto sm:text-right">
        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.16em]", style.soft, style.text)}>{badge}</span>
        <span className="mt-2 block text-[10px] font-bold text-[#31406B]">{time}</span>
      </span>
    </div>
  );
}

function Recommendation({ action, desc, badge, icon: Icon, tone }: (typeof aiRecommendations)[number]) {
  const style = toneStyles[tone];
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 sm:grid-cols-[32px_minmax(0,1fr)_auto]">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-[9px]", style.soft, style.text)}><Icon size={15} /></span>
      <span className="min-w-0">
        <span className="block text-[12px] font-black leading-snug text-[#101334]">{action}</span>
        <span className="mt-1 block text-[10.5px] font-bold text-[#68739F]">{desc}</span>
      </span>
      <span className={cn("col-start-2 h-fit w-fit rounded-full px-2 py-1 text-[9px] font-black sm:col-start-auto", badge.startsWith("High") ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#F59E0B]/12 text-[#F59E0B]")}>{badge}</span>
    </div>
  );
}

function SourceDonut() {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-black text-[#101334]">Sumber Alert</h3>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">Distribusi alert berdasarkan sumber data.</p>
        </div>
        <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[10px] font-black text-[#31406B] shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:bg-[#F8FAFF]">
          24 Jam Terakhir <ChevronDown size={12} />
        </button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-[136px_1fr] md:grid-cols-1 xl:grid-cols-[136px_1fr]">
        <div className="chart-donut-enter relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_48%,#8B5CFF_48%_70%,#EF4444_70%_84%,#10B981_84%_94%,#94A3B8_94%_100%)]">
          <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
          <span className="relative text-center"><b className="block text-[22px] font-black text-[#101334]">2.842</b><span className="text-[10px] font-bold text-[#68739F]">Total Alert</span></span>
        </div>
        <div className="space-y-2.5 self-center">
          {sourceDistribution.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-2 text-[#31406B]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
              <span className="text-[#68739F]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TimelineChart() {
  const path = makeLinePath(timeline, 520, 170, 14);
  const area = `${path} L 506 170 L 14 170 Z`;

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">Timeline Alert <span className="text-[11px] font-bold text-[#68739F]">(24 Jam Terakhir)</span></h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">Volume alert per jam.</p>
      <div className="relative mt-5 h-[190px] rounded-[12px] bg-linear-to-b from-white to-[#F8FAFF]">
        <div className="absolute left-0 top-0 bottom-[22px] flex w-[38px] flex-col justify-between py-1 text-right text-[9px] font-bold text-[#8B95B8]">
          <span>1.200</span><span>900</span><span>600</span><span>300</span><span>0</span>
        </div>
        <div className="absolute inset-0 left-[40px] bottom-[22px] overflow-hidden">
          <svg className="chart-enter chart-line-draw h-full w-full" viewBox="0 0 520 170" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="alerts-timeline" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#465FFF" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[34, 70, 106, 142].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#EDF1F7" strokeWidth="1" />)}
            <path d={area} fill="url(#alerts-timeline)" />
            <path d={path} fill="none" stroke="#465FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="absolute left-[48%] top-1 flex -translate-x-1/2 flex-col items-center">
            <span className="rounded-[8px] bg-[#101334] px-3 py-2 text-center shadow-lg"><b className="block text-[9px] font-black text-white">12:00</b><span className="text-[10px] font-black text-white">1.024 alert</span></span>
            <span className="h-10 border-l border-dashed border-[#8B95B8]" />
            <span className="h-3 w-3 rounded-full border-2 border-white bg-[#465FFF] ring-4 ring-[#465FFF]/15" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-between pl-[40px] text-[9px] font-bold text-[#68739F]"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div>
      </div>
    </Panel>
  );
}

function InvestigationStatus() {
  const segments = [
    { label: "Baru", value: "28% (694)", width: "28%", color: "#465FFF" },
    { label: "Investigating", value: "32% (790)", width: "32%", color: "#0284C7" },
    { label: "Escalated", value: "18% (445)", width: "18%", color: "#F97316" },
    { label: "Resolved", value: "22% (543)", width: "22%", color: "#10B981" },
  ];

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">Status Investigasi</h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">Monitoring penyelesaian alert.</p>
      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-[#EEF2F8]">
        {segments.map((segment) => <span key={segment.label} style={{ width: segment.width, backgroundColor: segment.color }} />)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.label}>
            <p className="text-[10px] font-black" style={{ color: segment.color }}>{segment.label}</p>
            <p className="mt-1 text-[12px] font-black text-[#101334]">{segment.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#EDF1F7] pt-4">
        <StatusMetric label="Rata-rata waktu respons" value="1h 24m" delta="↓ 12%" />
        <StatusMetric label="Rata-rata waktu resolusi" value="6h 42m" delta="↓ 8%" />
      </div>
    </Panel>
  );
}

function StatusMetric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <div><p className="text-[11px] font-bold text-[#68739F]">{label}</p><div className="mt-1 flex items-center gap-2"><b className="text-[18px] font-black text-[#101334]">{value}</b><span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-black text-[#10B981]">{delta}</span></div></div>;
}

export default function AlertsPage() {
  const t = useTranslations("DemoApp");
  const queryClient = useQueryClient();
  const toastHook = useToast();
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    toastHook.success(message);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: "open" | "acknowledged" | "resolved" }) => updateAlertStatus(String(id), status),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      if (result) {
        showToast("Status alert berhasil diperbarui.");
      } else {
        showToast("Status alert belum bisa diperbarui. Coba lagi.", "error");
      }
    },
    onError: () => showToast("Status alert belum bisa diperbarui. Coba lagi.", "error"),
  });

  const alertsQuery = useQuery({
    queryKey: ["alerts", { page, limit: alertsApiLimit }],
    queryFn: () => getAlerts({ page, limit: alertsApiLimit }),
    staleTime: 30 * 1000,
  });
  const liveRows = alertsQuery.data?.data ? buildApiAlertRows(alertsQuery.data.data) : [];
  const isLiveUnavailable = alertsQuery.data === null;
  const rows = liveRows.length > 0 || alertsQuery.data ? liveRows : alertRows;
  const footerText = alertsQuery.data?.pagination
    ? formatPaginationSummary(alertsQuery.data.pagination, "alert live")
    : isLiveUnavailable
      ? "Data live belum bisa dimuat. Menampilkan data contoh."
      : "Menampilkan 1-5 dari 24 alert";

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("pages.alerts.title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("pages.alerts.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] sm:w-auto"><Users size={14} />Kelola Kontak</button>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] sm:w-auto"><Settings size={14} />Pengaturan Notifikasi</button>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] sm:w-auto"><Plus size={15} />Buat Alert Baru</button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_372px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <SummaryCard />
            <QuickFilter />
          </div>
          {alertsQuery.isPending ? (
            <TableSkeleton rows={6} columns={9} />
          ) : alertsQuery.data && liveRows.length === 0 ? (
            <DashboardEmptyState title="Belum ada alert live" description="Backend berhasil dihubungi, tetapi belum ada alert yang perlu ditampilkan." icon="alert" minHeight="min-h-[420px]" />
          ) : (
            <>
              {isLiveUnavailable ? <DashboardErrorState title="Data live belum bisa dimuat" description="API client sudah mencoba token refresh. Untuk sementara, halaman menampilkan data contoh." onRetry={() => void alertsQuery.refetch()} minHeight="min-h-[150px]" /> : null}
              <AlertsTable rows={rows} footerText={footerText} pagination={alertsQuery.data?.pagination} onPageChange={setPage} isFetching={alertsQuery.isFetching} onStatusChange={(id, status) => statusMutation.mutate({ id, status })} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} menuRef={menuRef} />
            </>
          )}
        </div>
        <SidePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SourceDonut />
        <TimelineChart />
        <InvestigationStatus />
      </div>

      <div className="sr-only" aria-live="polite">AI image slot: {aiAgentImage}</div>
    </div>
  );
}
