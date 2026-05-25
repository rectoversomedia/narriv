"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type ReportStatus = "SIAP" | "REVIEW" | "DRAFT" | "SCHEDULED";

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
  text: string;
  border: string;
};

const aiAgentImage = "/mainapp/reports-ai-agent.png";

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#465FFF]", border: "border-[#465FFF]/15" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#8B5CFF]", border: "border-[#8B5CFF]/15" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/15" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/15" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/15" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

const metricCards = [
  { label: "Templates", value: "8", helper: "3 ready", icon: FileText, tone: "purple" },
  { label: "Ready", value: "4", helper: "Executive review", icon: Download, tone: "green" },
  { label: "Scheduled", value: "7", helper: "Weekly cadence", icon: Calendar, tone: "purple" },
  { label: "Generated (30 Hari)", value: "24", helper: "▲ 6 vs periode sebelumnya", icon: FileText, tone: "blue" },
] as const;

type ReportRow = {
  id: number;
  title: string;
  description: string;
  type: string;
  period: string;
  status: ReportStatus;
  progress: number | null;
  created: string;
  createdTime: string;
  tone: Tone;
};

const reportRows: ReportRow[] = [
  {
    id: 1,
    title: "Executive Narrative Brief",
    description: "Ringkasan eksekutif mingguan",
    type: "PDF · Harian",
    period: "12 Mei 2025",
    status: "SIAP",
    progress: 96,
    created: "10 Mei 2025",
    createdTime: "10:23 WIB",
    tone: "green",
  },
  {
    id: 2,
    title: "AI Visibility Weekly",
    description: "Performa AI visibility dan mention",
    type: "Slides · Mingguan",
    period: "5 - 11 Mei 2025",
    status: "REVIEW",
    progress: 84,
    created: "10 Mei 2025",
    createdTime: "09:15 WIB",
    tone: "amber",
  },
  {
    id: 3,
    title: "Crisis Response Pack",
    description: "Kompilasi isu kritis dan respon",
    type: "PDF · On-demand",
    period: "12 Mei 2025",
    status: "DRAFT",
    progress: 72,
    created: "10 Mei 2025",
    createdTime: "08:40 WIB",
    tone: "purple",
  },
  {
    id: 4,
    title: "Source Health Audit",
    description: "Audit kualitas sumber data",
    type: "CSV · Mingguan",
    period: "5 - 11 Mei 2025",
    status: "SIAP",
    progress: 91,
    created: "10 Mei 2025",
    createdTime: "07:30 WIB",
    tone: "blue",
  },
  {
    id: 5,
    title: "Isu Viral & Tren Harian",
    description: "Monitoring tren dan isu viral",
    type: "PDF · Harian",
    period: "12 Mei 2025",
    status: "SCHEDULED",
    progress: null,
    created: "10 Mei 2025",
    createdTime: "07:00 WIB",
    tone: "slate",
  },
];

const quickActions = [
  { title: "Bagikan ke Stakeholder", desc: "Kirim laporan ke email atau channel", icon: Share2, color: "text-[#465FFF] bg-[#465FFF]/10" },
  { title: "Jadwalkan Laporan", desc: "Atur pengiriman otomatis", icon: CalendarClock, color: "text-[#10B981] bg-[#10B981]/10" },
  { title: "Buat Laporan Kustom", desc: "Pilih data & template sendiri", icon: Plus, color: "text-[#8B5CFF] bg-[#8B5CFF]/10" },
  { title: "Lihat Riwayat Laporan", desc: "Akses semua laporan sebelumnya", icon: Clock, color: "text-[#F59E0B] bg-[#F59E0B]/10" },
];

const formatDistribution = [
  { name: "PDF", value: "50% (12)", color: "#465FFF" },
  { name: "Slides", value: "25% (6)", color: "#8B5CFF" },
  { name: "CSV", value: "17% (4)", color: "#EF4444" },
  { name: "Docs", value: "8% (2)", color: "#10B981" },
];

const popularReports = [
  { title: "Executive Narrative Brief", views: "128 akses" },
  { title: "AI Visibility Weekly", views: "96 akses" },
  { title: "Crisis Response Pack", views: "74 akses" },
];

const trendTimeline = [12, 19, 15, 22, 17, 24, 20, 26, 22, 28, 24, 30, 26];

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      {children}
    </section>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  const isTrend = helper.startsWith("▲") || helper.startsWith("▼");

  return (
    <Panel className="flex min-h-[88px] items-center gap-3.5 p-4">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-[0_10px_26px_rgba(70,95,255,0.05)]", style.soft, style.text, style.border)}>
        <Icon size={19} strokeWidth={2.35} />
      </span>
      <div className="min-w-0">
        <span className="block text-[10px] font-extrabold text-[#68739F]">{label}</span>
        <span className="mt-0.5 block text-[24px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</span>
        <span className={cn("mt-1.5 flex items-center gap-1 text-[10px] font-black", isTrend ? "text-[#10B981]" : "text-[#58648C]")}>
          {isTrend && <span className="h-1 w-1 rounded-full bg-[#10B981]" />}
          {helper}
        </span>
      </div>
    </Panel>
  );
}

function SentimentChart() {
  return (
    <div className="flex flex-col justify-between h-full min-h-[160px] border-l border-[#D8DEEF] pl-5">
      <h4 className="text-[11px] font-extrabold text-[#101334]">Sentimen 7 Hari Terakhir</h4>
      
      <div className="relative flex-1 mt-2 min-h-[90px]">
        {/* Y Axis Grid/Labels */}
        <div className="absolute inset-0 flex flex-col justify-between text-[8px] font-bold text-[#8B95B8] pointer-events-none">
          <div className="flex items-center justify-between border-b border-dashed border-[#EDF1F7] pb-1">
            <span>100%</span>
            <span className="w-full border-t border-dashed border-[#EDF1F7] mx-2" />
          </div>
          <div className="flex items-center justify-between border-b border-dashed border-[#EDF1F7] py-1">
            <span>50%</span>
            <span className="w-full border-t border-dashed border-[#EDF1F7] mx-2" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span>0%</span>
            <span className="w-full border-t border-dashed border-[#EDF1F7] mx-2" />
          </div>
        </div>

        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 80" preserveAspectRatio="none">
          {/* Positif (Green) */}
          <path d="M 10 60 L 50 68 L 90 60 L 130 50 L 150 42" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="150" cy="42" r="3" fill="#10B981" />

          {/* Netral (Blue) */}
          <path d="M 10 70 L 50 66 L 90 70 L 130 58 L 150 60" fill="none" stroke="#465FFF" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="150" cy="60" r="3" fill="#465FFF" />

          {/* Negatif (Red) */}
          <path d="M 10 32 L 50 30 L 90 24 L 130 35 L 150 38" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="150" cy="38" r="3" fill="#EF4444" />
        </svg>
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between text-[8px] font-bold text-[#8B95B8] mt-1.5">
        <span>6 Mei</span>
        <span>8 Mei</span>
        <span>10 Mei</span>
        <span>12 Mei</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[8.5px] font-black text-[#58648C] mt-2">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />Positif</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#465FFF]" />Netral</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />Negatif</span>
      </div>
    </div>
  );
}

function ReportAgentImage() {
  return (
    <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#465FFF]/10 bg-linear-to-b from-[#EEF0FF] via-white to-[#F1EEFF] shadow-[inset_0_0_24px_rgba(70,95,255,0.10)]">
      <Image
        src={aiAgentImage}
        alt="AI reports assistant illustration"
        width={96}
        height={96}
        sizes="96px"
        unoptimized
        className="relative h-full w-full object-cover"
        style={{ transform: "scale(1.35)" }}
      />
    </div>
  );
}

function AIReportSummary() {
  return (
    <Panel className="p-5">
      <div className="grid gap-5 md:grid-cols-[1fr_190px] lg:grid-cols-[96px_1fr_214px]">
        <div className="flex justify-center md:justify-start">
          <ReportAgentImage />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">AI Report Summary</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 text-[10px] font-black text-[#8B5CFF]">
              <Sparkles size={12} /> AI Generated
            </span>
          </div>
          <p className="mt-3 max-w-[660px] text-[13.5px] font-black leading-relaxed text-[#101334]">
            Dalam 7 hari terakhir, sentimen negatif meningkat 18% didorong oleh keluhan pembayaran dan stabilitas aplikasi di wilayah Jabodetabek.
          </p>
          <div className="mt-5 grid gap-x-4 gap-y-3 lg:grid-cols-4">
            <SummaryPoint color="#465FFF" title="Insight Utama" text="Payment delay menjadi top issue dengan volume tertinggi." />
            <SummaryPoint color="#EF4444" title="Risiko Tertinggi" text="Potensi eskalasi reputasi jika tidak ada komunikasi publik." />
            <SummaryPoint color="#F59E0B" title="Pergerakan Signifikan" text="Percakapan negatif di X/Twitter naik +248% dalam 2 jam terakhir." />
            <SummaryPoint color="#10B981" title="Rekomendasi AI" text="Publikasikan klarifikasi dan perbarui status sistem pembayaran." />
          </div>
        </div>
        <div className="w-full pt-4 border-t md:pt-0 md:border-t-0">
          <SentimentChart />
        </div>
      </div>
    </Panel>
  );
}

function SummaryPoint({ color, title, text }: { color: string; title: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="text-[11px] font-black text-[#101334]">{title}</p>
        <p className="mt-1 text-[11px] font-bold leading-normal text-[#58648C]">{text}</p>
      </div>
    </div>
  );
}

function ReportPreviewSidebar() {
  return (
    <Panel className="p-4">
      <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Pratinjau Laporan</h3>
      <p className="mt-1 text-[11.5px] font-bold text-[#68739F]">Lihat ringkasan sebelum dibagikan ke stakeholder.</p>
      
      <div className="mt-4 rounded-[12px] border border-[#DDE3EF] bg-[#F8FAFF] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#465FFF]/10 text-[#465FFF]"><FileText size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-black text-[#101334]">Executive Narrative Brief</p>
            <p className="mt-0.5 text-[10px] font-bold text-[#68739F]">PDF · Harian</p>
          </div>
          <span className="rounded-full bg-[#10B981]/10 px-2 py-1 text-[9px] font-black text-[#10B981]">SIAP</span>
        </div>

        <div className="mt-4 grid grid-cols-[82px_1fr] gap-4">
          <div className="relative h-[108px] w-[82px] shrink-0 select-none overflow-hidden rounded-[6px] border border-[#E6EAF2] bg-white p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-1 border-b border-[#EDF1F7] pb-1">
              <span className="h-2 w-2 rounded-full bg-[#465FFF]" />
              <span className="h-1 w-8 rounded-full bg-[#D8DEEF]" />
            </div>
            <div className="grid grid-cols-2 gap-1 py-2">
              <span className="h-10 rounded-[4px] bg-[#EEF0FF]" />
              <span className="space-y-1.5">
                <span className="block h-1 w-full rounded-full bg-[#D8DEEF]" />
                <span className="block h-1 w-5/6 rounded-full bg-[#EDF1F7]" />
                <span className="block h-1 w-4/6 rounded-full bg-[#EDF1F7]" />
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="block h-1 w-full rounded-full bg-[#EDF1F7]" />
              <span className="block h-1 w-5/6 rounded-full bg-[#EDF1F7]" />
              <span className="block h-1 w-4/6 rounded-full bg-[#EDF1F7]" />
            </div>
          </div>

          <div className="min-w-0 space-y-2.5 self-center">
            {["Executive Summary", "Risk Movement", "Key Insights", "Recommended Actions"].map((item) => (
              <div key={item} className="flex items-center justify-between gap-2 text-[9.5px] font-black text-[#31406B]">
                <span className="flex min-w-0 items-center gap-2"><CheckCircle2 size={13} className="shrink-0 text-[#10B981]" /> <span className="truncate">{item}</span></span>
                <span className="text-[#10B981]">Siap</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-[#465FFF] text-[12px] font-black text-white shadow-[0_8px_20px_rgba(70,95,255,0.18)] transition hover:bg-[#3B20EA]">
          <Eye size={15} /> Lihat Preview
        </button>
        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-[#E6EAF2] bg-white text-[12px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
          <Download size={15} /> Unduh PDF
        </button>
      </div>
    </Panel>
  );
}

function QuickActions() {
  return (
    <Panel className="p-4">
      <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Aksi Cepat</h3>
      <div className="mt-4 space-y-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#EDF1F7] bg-[#FBFCFF] p-3 text-left transition hover:border-[#DDE3EF] hover:bg-[#F8FAFF]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]", action.color)}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-[12px] font-black text-[#101334]">{action.title}</span>
                  <span className="mt-0.5 block truncate text-[9.5px] font-bold text-[#58648C]">{action.desc}</span>
                </div>
              </div>
              <ArrowRight size={13} className="text-[#8B95B8] shrink-0" />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    SIAP: "bg-[#10B981]/10 text-[#10B981]",
    REVIEW: "bg-[#F59E0B]/10 text-[#F59E0B]",
    DRAFT: "bg-[#8B5CFF]/10 text-[#8B5CFF]",
    SCHEDULED: "bg-[#465FFF]/10 text-[#465FFF]",
  };
  return <span className={cn("rounded-[7px] px-2 py-0.5 text-[9.5px] font-black tracking-[0.05em]", styles[status])}>{status}</span>;
}

function ProgressBar({ value, tone }: { value: number; tone: Tone }) {
  const barColors: Record<Tone, string> = {
    blue: "bg-[#465FFF]",
    purple: "bg-[#8B5CFF]",
    green: "bg-[#10B981]",
    red: "bg-[#EF4444]",
    amber: "bg-[#F59E0B]",
    slate: "bg-[#64748B]",
  };
  return (
    <div className="h-1.5 w-[80px] rounded-full bg-[#EDF1F7] overflow-hidden shrink-0">
      <div className={cn("h-full rounded-full", barColors[tone])} style={{ width: `${value}%` }} />
    </div>
  );
}

function ReportsTable() {
  const [activeTab, setActiveTab] = useState("Semua");
  const tabs = ["Semua", "Siap", "Review", "Draft", "Scheduled", "Archived"];

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">Dokumen Laporan</h2>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">Kelola semua laporan harian, mingguan, dan laporan khusus.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative block w-full sm:w-[180px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8B95B8]" />
            <input
              type="search"
              placeholder="Cari laporan..."
              className="h-8 w-full rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] pl-8 pr-3 text-[10px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white"
            />
          </label>
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-2.5 text-[10px] font-black text-[#58648C] transition hover:bg-white">
            <SlidersHorizontal size={12} /> Filter
          </button>
          <button type="button" className="inline-flex h-8 items-center gap-1 rounded-[7px] border border-[#DDE3EF] bg-[#F8FAFF] px-2.5 text-[10px] font-black text-[#58648C] transition hover:bg-white">
            Terbaru <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-[#EDF1F7] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "h-7 rounded-[7px] px-3 text-[10.5px] font-black transition",
              activeTab === tab
                ? "bg-[#465FFF] text-white shadow-[0_4px_12px_rgba(70,95,255,0.18)]"
                : "border border-[#DDE3EF] bg-[#F8FAFF] text-[#58648C] hover:bg-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[9.5px] font-black uppercase tracking-[0.15em] text-[#68739F]">
              <th className="px-3 py-3 w-[280px]">Laporan</th>
              <th className="px-3 py-3">Jenis</th>
              <th className="px-3 py-3">Periode</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Progress</th>
              <th className="px-3 py-3">Dibuat</th>
              <th className="px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7]">
            {reportRows.map((report) => (
              <tr key={report.id} className="transition hover:bg-[#F8FAFF]">
                <td className="px-3 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">
                      <FileText size={17} strokeWidth={2.3} />
                    </span>
                    <div className="min-w-0">
                      <Link href={`/reports/${report.id}`} className="text-[12.5px] font-black leading-snug text-[#101334] hover:text-[#465FFF] transition-colors">
                        {report.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] font-bold leading-snug text-[#68739F]">{report.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-black text-[#31406B]">{report.type}</td>
                <td className="px-3 py-3.5 align-middle text-[11px] font-bold text-[#68739F]">{report.period}</td>
                <td className="px-3 py-3.5 align-middle"><StatusBadge status={report.status} /></td>
                <td className="px-3 py-3.5 align-middle">
                  {report.progress !== null ? (
                    <div className="flex items-center gap-2">
                      <ProgressBar value={report.progress} tone={report.tone} />
                      <span className="text-[10px] font-black text-[#31406B]">{report.progress}%</span>
                    </div>
                  ) : (
                    <span className="text-[#8B95B8] text-[11px]">-</span>
                  )}
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <span className="block text-[11px] font-black text-[#31406B]">{report.created}</span>
                  <span className="mt-0.5 block text-[9.5px] font-bold text-[#8B95B8]">{report.createdTime}</span>
                </td>
                <td className="px-3 py-3.5 text-right align-middle">
                  <button type="button" className="rounded-md p-1.5 text-[#68739F] transition hover:bg-[#EEF2FF] hover:text-[#465FFF]">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row">
        <p className="text-[11px] font-bold text-[#68739F]">Menampilkan 1-5 dari 24 laporan</p>
        <button type="button" className="inline-flex h-[34px] items-center gap-2 rounded-[8px] border border-[#E6EAF2] bg-white px-5 text-[11px] font-black text-[#101334] transition hover:bg-[#F8FAFF]">
          Muat lebih banyak <ChevronDown size={13} />
        </button>
      </div>
    </Panel>
  );
}

function FormatDonut() {
  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">Distribusi Format</h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">Perbandingan format laporan yang dibuat.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-[136px_1fr] md:grid-cols-1 xl:grid-cols-[136px_1fr]">
        <div className="relative mx-auto flex h-[136px] w-[136px] items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_50%,#8B5CFF_50%_75%,#EF4444_75%_92%,#10B981_92%_100%)]">
          <span className="absolute h-[88px] w-[88px] rounded-full bg-white" />
          <span className="relative text-center">
            <b className="block text-[22px] font-black text-[#101334]">24</b>
            <span className="text-[10px] font-bold text-[#68739F]">Total Laporan</span>
          </span>
        </div>
        <div className="space-y-2.5 self-center">
          {formatDistribution.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-2 text-[#31406B]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="text-[#68739F]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TimelineChart() {
  // Sparkline/timeline line plotting
  const max = Math.max(...trendTimeline);
  const min = Math.min(...trendTimeline);
  const range = max - min || 1;
  const width = 520;
  const height = 170;
  const padding = 14;

  const path = trendTimeline.map((value, index) => {
    const x = padding + (index / (trendTimeline.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (value - min) / range) * (height - padding * 2 - 20);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const area = `${path} L ${width - padding} ${height - 22} L ${padding} ${height - 22} Z`;

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">Tren Pembuatan Laporan <span className="text-[11px] font-bold text-[#68739F]">(30 Hari Terakhir)</span></h3>
      <p className="mt-1 text-[11px] font-bold text-[#68739F]">Jumlah laporan yang dibuat per hari.</p>
      
      <div className="relative mt-5 h-[190px] rounded-[12px] bg-linear-to-b from-white to-[#F8FAFF]">
        {/* Y Axis */}
        <div className="absolute left-0 top-0 bottom-[22px] flex w-[38px] flex-col justify-between py-1 text-right text-[9px] font-bold text-[#8B95B8] pointer-events-none">
          <span>30</span><span>20</span><span>10</span><span>0</span>
        </div>

        {/* Chart plot */}
        <div className="absolute inset-0 left-[40px] bottom-[22px] overflow-hidden">
          <svg className="h-full w-full" viewBox="0 0 520 170" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="reports-timeline-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#465FFF" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Gridlines */}
            {[34, 70, 106, 142].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#EDF1F7" strokeWidth="1" />)}
            <path d={area} fill="url(#reports-timeline-grad)" />
            <path d={path} fill="none" stroke="#465FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* interactive dot / tooltip on 10 Mei (around 75% point) */}
          <div className="absolute left-[77%] top-[34px] flex -translate-x-1/2 flex-col items-center">
            <span className="rounded-[8px] bg-[#101334] px-2.5 py-1.5 text-center shadow-lg whitespace-nowrap">
              <b className="block text-[8px] font-black text-white">10 Mei</b>
              <span className="text-[9.5px] font-black text-white">24 laporan</span>
            </span>
            <span className="h-8 border-l border-dashed border-[#8B95B8]" />
            <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#465FFF] ring-4 ring-[#465FFF]/15" />
          </div>
        </div>

        {/* X Axis Labels */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between pl-[40px] text-[9px] font-bold text-[#68739F]">
          <span>13 Apr</span>
          <span>20 Apr</span>
          <span>27 Apr</span>
          <span>4 Mei</span>
          <span>11 Mei</span>
        </div>
      </div>
    </Panel>
  );
}

function PopularReports() {
  return (
    <Panel className="p-4 flex flex-col justify-between">
      <div>
        <h3 className="text-[15px] font-black text-[#101334]">Laporan Terpopuler</h3>
        <p className="mt-1 text-[11px] font-bold text-[#68739F]">Berdasarkan jumlah akses dalam 30 hari.</p>
        
        <div className="mt-5 space-y-3">
          {popularReports.map((report, idx) => (
            <div key={report.title} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[11px] font-black text-[#465FFF]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-black text-[#101334]">{report.title}</span>
              </div>
              <span className="text-[11px] font-bold text-[#68739F] shrink-0">{report.views}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-[#EDF1F7] pt-4">
        <Link href="/reports" className="flex items-center justify-between text-[11px] font-black text-[#465FFF] hover:text-[#3B20EA] transition-colors">
          <span>Lihat Semua Laporan</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </Panel>
  );
}

export default function ReportsPage() {
  const t = useTranslations("DemoApp");

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{t("pages.reports.title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#68739F]">{t("pages.reports.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="flex h-10 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:bg-[#F8FAFF]">
            <FileText size={14} /> Kelola Template
          </button>
          <button type="button" className="flex h-10 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:bg-[#F8FAFF]">
            <CalendarClock size={14} /> Pengaturan Jadwal
          </button>
          <button type="button" className="flex h-10 items-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:opacity-90">
            <Plus size={15} /> Buat Laporan Baru
          </button>
        </div>
      </header>

      {/* AI Summary and Preview */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <AIReportSummary />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
          <ReportsTable />
        </div>
        <div className="space-y-4">
          <ReportPreviewSidebar />
          <QuickActions />
        </div>
      </div>

      {/* Bottom Distribution charts */}
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.15fr_0.9fr]">
        <FormatDonut />
        <TimelineChart />
        <PopularReports />
      </div>

      {/* Screen Reader AI image slot */}
      <div className="sr-only" aria-live="polite">AI image slot: {aiAgentImage}</div>
    </div>
  );
}
