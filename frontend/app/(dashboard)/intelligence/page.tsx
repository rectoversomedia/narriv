"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Bot,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Filter,
  Info,
  Layers3,
  Maximize2,
  MoreHorizontal,
  Network,
  RefreshCcw,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { intelligenceClusters, text, type Tone } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

type Cluster = (typeof intelligenceClusters)[number];

type ToneStyle = {
  color: string;
  rgb: string;
  badge: "default" | "green" | "amber" | "red" | "purple" | "slate";
};

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", badge: "default" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", badge: "purple" },
  green: { color: "#10B981", rgb: "16,185,129", badge: "green" },
  red: { color: "#EF4444", rgb: "239,68,68", badge: "red" },
  amber: { color: "#F59E0B", rgb: "245,158,11", badge: "amber" },
  slate: { color: "#64748B", rgb: "100,116,139", badge: "slate" },
};

const connections: Array<{ from: string; to: string; strength: "weak" | "strong" }> = [
  { from: "payment_delay", to: "customer_education", strength: "strong" },
  { from: "payment_delay", to: "service_quality", strength: "strong" },
  { from: "payment_delay", to: "mobile_app_stability", strength: "strong" },
  { from: "payment_delay", to: "refund_complaints", strength: "strong" },
  { from: "payment_delay", to: "pricing_transparency", strength: "weak" },
  { from: "payment_delay", to: "privacy_policy", strength: "strong" },
  { from: "payment_delay", to: "security_concerns", strength: "weak" },
  { from: "payment_delay", to: "kyc_process", strength: "weak" },
  { from: "mobile_app_stability", to: "customer_education", strength: "weak" },
  { from: "pricing_transparency", to: "privacy_policy", strength: "weak" },
  { from: "refund_complaints", to: "pricing_transparency", strength: "weak" },
  { from: "customer_education", to: "service_quality", strength: "weak" },
  { from: "security_concerns", to: "service_quality", strength: "weak" },
  { from: "security_concerns", to: "kyc_process", strength: "weak" },
  { from: "privacy_policy", to: "kyc_process", strength: "weak" },
];

const mapSpecks: Array<{ x: number; y: number; tone: Tone; size: number; opacity: number }> = [
  { x: 18, y: 26, tone: "blue", size: 12, opacity: 0.42 },
  { x: 22, y: 53, tone: "blue", size: 10, opacity: 0.38 },
  { x: 28, y: 34, tone: "red", size: 8, opacity: 0.2 },
  { x: 32, y: 63, tone: "purple", size: 11, opacity: 0.26 },
  { x: 38, y: 19, tone: "red", size: 8, opacity: 0.18 },
  { x: 42, y: 68, tone: "red", size: 12, opacity: 0.28 },
  { x: 47, y: 30, tone: "red", size: 8, opacity: 0.16 },
  { x: 54, y: 20, tone: "purple", size: 9, opacity: 0.2 },
  { x: 58, y: 39, tone: "green", size: 11, opacity: 0.32 },
  { x: 63, y: 60, tone: "amber", size: 8, opacity: 0.22 },
  { x: 69, y: 28, tone: "green", size: 12, opacity: 0.28 },
  { x: 76, y: 41, tone: "purple", size: 11, opacity: 0.32 },
  { x: 82, y: 56, tone: "blue", size: 12, opacity: 0.36 },
  { x: 86, y: 31, tone: "purple", size: 10, opacity: 0.28 },
  { x: 15, y: 69, tone: "blue", size: 11, opacity: 0.34 },
  { x: 24, y: 74, tone: "amber", size: 7, opacity: 0.18 },
  { x: 35, y: 78, tone: "blue", size: 8, opacity: 0.18 },
  { x: 51, y: 76, tone: "red", size: 9, opacity: 0.18 },
  { x: 66, y: 73, tone: "amber", size: 8, opacity: 0.2 },
  { x: 79, y: 70, tone: "blue", size: 9, opacity: 0.26 },
  { x: 13, y: 39, tone: "blue", size: 9, opacity: 0.34 },
  { x: 30, y: 22, tone: "amber", size: 8, opacity: 0.22 },
  { x: 45, y: 16, tone: "red", size: 11, opacity: 0.15 },
  { x: 60, y: 17, tone: "green", size: 9, opacity: 0.24 },
  { x: 73, y: 18, tone: "green", size: 8, opacity: 0.18 },
  { x: 90, y: 49, tone: "blue", size: 9, opacity: 0.28 },
];

const lifecycleSeries = {
  emerging: [10, 15, 8, 20, 14, 25, 18, 30, 22, 35],
  accelerating: [5, 10, 15, 12, 22, 18, 28, 32, 26, 40],
  peaking: [20, 30, 25, 45, 38, 50, 48, 55, 42, 60],
  declining: [60, 55, 48, 42, 38, 30, 28, 22, 18, 15],
  dormant: [15, 14, 15, 12, 13, 11, 12, 10, 12, 9],
};

const nodeSizeClasses = {
  high: "size-[92px] text-[10px] sm:size-[116px] sm:text-[11px]",
  large: "size-[82px] text-[9px] sm:size-[96px] sm:text-[10px]",
  medium: "size-[72px] text-[8px] sm:size-[84px] sm:text-[9px]",
  small: "size-[60px] text-[8px] sm:size-[70px] sm:text-[8px]",
};

const sentimentColor = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#94A3B8",
};

const donutData = [
  { name: "Your Brand", value: 32, tone: "purple" as Tone },
  { name: "Competitor A", value: 28, tone: "red" as Tone },
  { name: "Competitor B", value: 20, tone: "amber" as Tone },
  { name: "Competitor C", value: 12, tone: "green" as Tone },
  { name: "Others", value: 8, tone: "slate" as Tone },
];

function formatSignals(value: number) {
  return value.toLocaleString("en-US");
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("rounded-[14px] border-[#E6EAF2] bg-white text-[#101334] shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      {children}
    </Card>
  );
}

function IconHalo({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const toneStyle = toneStyles[tone];

  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-full border shadow-[0_12px_22px_rgba(16,24,40,0.06)]"
      style={{
        color: toneStyle.color,
        borderColor: `rgba(${toneStyle.rgb}, 0.12)`,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.9), rgba(${toneStyle.rgb}, .13))`,
      }}
    >
      <Icon size={22} strokeWidth={2.3} />
    </div>
  );
}

function MetricCard({ label, value, helper, icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  return (
    <Panel>
      <CardContent className="flex min-h-[88px] items-center gap-4 p-4">
        <IconHalo icon={icon} tone={tone} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-extrabold leading-none text-[#68739F]">{label}</p>
          <p className="mt-2 text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
          <p className="mt-2 flex items-center gap-1 text-[11px] font-black text-[#10B981]">
            <span className="size-1.5 rounded-full bg-[#10B981]" />
            {helper.replace("▲ ", "")}
          </p>
        </div>
      </CardContent>
    </Panel>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 100;
  const height = 36;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 96 + 2;
      const y = height - ((value - min) / range) * 28 - 4;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg className="h-10 w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={`${path} L 98 ${height} L 2 ${height} Z`} fill={color} opacity="0.08" />
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function ClusterIcon({ tone }: { tone: Tone }) {
  const toneStyle = toneStyles[tone];

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border"
      style={{
        color: toneStyle.color,
        borderColor: `rgba(${toneStyle.rgb}, 0.14)`,
        backgroundColor: `rgba(${toneStyle.rgb}, 0.09)`,
      }}
    >
      <Network size={15} strokeWidth={2.4} />
    </span>
  );
}

function TrendBadge({ value, tone, className }: { value: string; tone: Tone; className?: string }) {
  return (
    <Badge variant={toneStyles[tone].badge} className={cn("normal-case tracking-normal", className)}>
      {value}
    </Badge>
  );
}

function CompetitorDonut({ label }: { label: string }) {
  return (
    <div className="relative flex size-[150px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(#8B5CFF_0_32%,#EF4444_32%_60%,#F59E0B_60%_80%,#10B981_80%_92%,#94A3B8_92%_100%)] shadow-[0_12px_24px_rgba(70,95,255,0.10)]">
      <div className="absolute size-[102px] rounded-full bg-white" />
      <div className="relative max-w-[86px] text-center">
        <p className="text-[12px] font-black leading-tight text-[#101334]">Total</p>
        <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#737D9F]">{label}</p>
      </div>
    </div>
  );
}

function MapNode({ cluster, selected, language, onSelect }: { cluster: Cluster; selected: boolean; language: "en" | "id"; onSelect: (cluster: Cluster) => void }) {
  const toneStyle = toneStyles[cluster.tone];
  const style = {
    left: `${cluster.x}%`,
    top: `${cluster.y}%`,
    zIndex: selected ? 20 : 10,
    borderColor: selected ? toneStyle.color : `rgba(${toneStyle.rgb}, 0.28)`,
    boxShadow: selected ? `0 0 0 10px rgba(${toneStyle.rgb}, .13), 0 18px 42px rgba(${toneStyle.rgb}, .22)` : "0 10px 26px rgba(16,24,40,.07)",
  } satisfies CSSProperties;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(cluster)}
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border bg-white/95 text-center outline-none backdrop-blur transition duration-300 hover:-translate-y-[52%] hover:shadow-[0_18px_42px_rgba(16,24,40,0.1)]",
        nodeSizeClasses[cluster.size]
      )}
      style={style}
    >
      {selected ? <span className="absolute -inset-3 rounded-full opacity-20 blur-xl" style={{ backgroundColor: toneStyle.color }} /> : null}
      <span
        className="absolute right-[17%] top-[17%] size-2 rounded-full border border-white shadow-sm"
        style={{ backgroundColor: sentimentColor[cluster.sentiment] }}
      />
      <span className="relative px-2 font-black leading-tight text-[#101334]">{text(cluster.topic, language)}</span>
      <span className="relative mt-1 text-[9px] font-bold text-[#8A94B8]">{formatSignals(cluster.signals)} signals</span>
      <span className="relative mt-1.5 rounded-full px-2 py-0.5 text-[8px] font-black" style={{ backgroundColor: `rgba(${toneStyle.rgb}, .1)`, color: toneStyle.color }}>
        {cluster.growth}
      </span>
    </button>
  );
}

export default function IntelligencePage() {
  const language = useUiStore((state) => state.language);
  const [selectedCluster, setSelectedCluster] = useState(intelligenceClusters[0]);

  const dictionary = {
    en: {
      title: "Intelligence",
      subtitle: "Understand topic clusters, narrative growth, and strategic context.",
      last7Days: "Last 7 days (May 12 - May 18, 2025)",
      metrics: {
        clusters: { label: "Clusters Identified", value: "28", helper: "6 accelerating" },
        confidence: { label: "Narrative Confidence", value: "89%", helper: "Evidence weighted" },
        emerging: { label: "Emerging Narratives", value: "7", helper: "2 new this week" },
        opportunities: { label: "Opportunities Detected", value: "5", helper: "2 high potential" },
      },
      topicMap: {
        title: "Topic Map",
        desc: "Visualize how narratives connect and influence each other.",
        allTopics: "All Topics",
        filter: "Filter",
        intensity: "Intensity",
        sentiment: "Sentiment",
        connStrength: "Connection Strength",
        pos: "Positive",
        neu: "Neutral",
        neg: "Negative",
        weak: "Weak",
        strong: "Strong",
        tip: "Tip: Click on any cluster to explore detailed insights and related narratives.",
      },
      growingClusters: { title: "Growing Narrative Clusters", viewAll: "View all" },
      selectedNarrative: {
        title: "Selected Narrative",
        related: "Top Related Narratives",
        aiRec: "AI Recommendation",
        btnAnalysis: "See Full Analysis",
        highImpact: "High Impact",
        emerging: "Emerging",
      },
      competitorShare: { title: "Competitor Narrative Share", totalShare: "Total Narrative Share", viewLandscape: "View Competitive Landscape" },
      aiSummary: {
        title: "Narrative Insights (AI Summary)",
        box: "The main narrative this week is dominated by operational and customer service issues, with a high potential reputational impact if not addressed immediately.",
        bullets: [
          "Payment delay is the fastest growing issue.",
          "Refund complaints are beginning to connect with trust issues.",
          "Increased discussions in forums and social media.",
          "No significant spike in regulatory issues.",
        ],
        btn: "View Full Insight Report",
      },
      lifecycle: {
        title: "Narrative Lifecycle",
        phases: {
          emerging: { title: "Emerging", desc: "Newly emerging and starting to grow" },
          accelerating: { title: "Accelerating", desc: "Fast growth and spreading" },
          peaking: { title: "Peaking", desc: "Reaching peak public attention" },
          declining: { title: "Declining", desc: "Starting to decline and stabilize" },
          dormant: { title: "Dormant", desc: "Minimal activity, needs monitoring" },
        },
      },
      footer: {
        dataCoverage: "Data Coverage",
        sourcesActive: "62 / 72 Sources Active",
        coveragePercent: "86% Coverage",
        updateFreq: "Update Frequency",
        realtime: "Real-time",
        autoUpdated: "Auto-updated 30 seconds ago",
        aiStatus: "AI Model Status",
        operational: "Operational",
        systemsNormal: "All systems normal",
        analysisDepth: "Analysis Depth",
        deep: "Deep Analysis",
        multilingual: "Cross-platform & multilingual",
        btnSettings: "Configure Intelligence Settings",
      },
    },
    id: {
      title: "Intelligence",
      subtitle: "Pahami cluster topik, pertumbuhan narasi, dan konteks strategis.",
      last7Days: "7 hari terakhir (12 Mei - 18 Mei 2025)",
      metrics: {
        clusters: { label: "Clusters Identified", value: "28", helper: "6 mempercepat" },
        confidence: { label: "Narrative Confidence", value: "89%", helper: "Evidence weighted" },
        emerging: { label: "Emerging Narratives", value: "7", helper: "2 baru minggu ini" },
        opportunities: { label: "Opportunities Detected", value: "5", helper: "2 potensi tinggi" },
      },
      topicMap: {
        title: "Peta Topik",
        desc: "Visualisasikan bagaimana narasi saling terhubung dan memengaruhi satu sama lain.",
        allTopics: "Semua Topik",
        filter: "Filter",
        intensity: "Intensitas",
        sentiment: "Sentimen",
        connStrength: "Kekuatan Koneksi",
        pos: "Positif",
        neu: "Netral",
        neg: "Negatif",
        weak: "Lemah",
        strong: "Kuat",
        tip: "Klik pada cluster untuk mengeksplorasi insight detail dan narasi terkait.",
      },
      growingClusters: { title: "Cluster Narasi Berkembang", viewAll: "Lihat semua" },
      selectedNarrative: {
        title: "Narasi Terpilih",
        related: "Top Narasi Terkait",
        aiRec: "Rekomendasi AI",
        btnAnalysis: "Lihat Analisis Lengkap",
        highImpact: "Dampak Tinggi",
        emerging: "Emerging",
      },
      competitorShare: { title: "Pangsa Narasi Kompetitor", totalShare: "Total Pangsa Narasi", viewLandscape: "Lihat Lanskap Kompetitif" },
      aiSummary: {
        title: "Insight Narasi (Ringkasan AI)",
        box: "Narrative utama minggu ini didominasi oleh isu operasional dan layanan pelanggan, dengan potensi dampak reputasi yang tinggi jika tidak ditangani segera.",
        bullets: [
          "Payment delay menjadi isu paling cepat berkembang.",
          "Keluhan refund mulai terkoneksi dengan isu kepercayaan.",
          "Peningkatan pembahasan di forum dan social media.",
          "Tidak ada lonjakan signifikan pada isu regulasi.",
        ],
        btn: "Lihat Laporan Insight Lengkap",
      },
      lifecycle: {
        title: "Siklus Hidup Narasi",
        phases: {
          emerging: { title: "Emerging", desc: "Baru muncul dan mulai berkembang" },
          accelerating: { title: "Accelerating", desc: "Pertumbuhan cepat dan meluas" },
          peaking: { title: "Peaking", desc: "Mencapai puncak perhatian publik" },
          declining: { title: "Declining", desc: "Mulai menurun dan stabil" },
          dormant: { title: "Dormant", desc: "Minim aktivitas, perlu monitoring" },
        },
      },
      footer: {
        dataCoverage: "Cakupan Data",
        sourcesActive: "62 / 72 Sumber Aktif",
        coveragePercent: "86% Cakupan",
        updateFreq: "Frekuensi Pembaruan",
        realtime: "Real-time",
        autoUpdated: "Diperbarui otomatis 30 detik lalu",
        aiStatus: "Status Model AI",
        operational: "Operasional",
        systemsNormal: "Semua sistem normal",
        analysisDepth: "Kedalaman Analisis",
        deep: "Analisis Mendalam",
        multilingual: "Lintas platform & multibahasa",
        btnSettings: "Konfigurasi Pengaturan Intelijen",
      },
    },
  };

  const dict = dictionary[language] ?? dictionary.en;
  const selectedTone = toneStyles[selectedCluster.tone];

  const metrics = [
    { ...dict.metrics.clusters, icon: Network, tone: "purple" as Tone },
    { ...dict.metrics.confidence, icon: Brain, tone: "blue" as Tone },
    { ...dict.metrics.emerging, icon: TrendingUp, tone: "amber" as Tone },
    { ...dict.metrics.opportunities, icon: Target, tone: "green" as Tone },
  ];

  const lifecycleCards = [
    { key: "emerging" as const, count: 7, tone: "green" as Tone, values: lifecycleSeries.emerging },
    { key: "accelerating" as const, count: 6, tone: "amber" as Tone, values: lifecycleSeries.accelerating },
    { key: "peaking" as const, count: 3, tone: "red" as Tone, values: lifecycleSeries.peaking },
    { key: "declining" as const, count: 5, tone: "blue" as Tone, values: lifecycleSeries.declining },
    { key: "dormant" as const, count: 7, tone: "slate" as Tone, values: lifecycleSeries.dormant },
  ];

  const footerItems = [
    {
      icon: Database,
      title: dict.footer.dataCoverage,
      value: dict.footer.sourcesActive,
      detail: dict.footer.coveragePercent,
      tone: "purple" as Tone,
      progress: true,
    },
    {
      icon: RefreshCcw,
      title: dict.footer.updateFreq,
      value: dict.footer.realtime,
      detail: dict.footer.autoUpdated,
      tone: "blue" as Tone,
    },
    {
      icon: Bot,
      title: dict.footer.aiStatus,
      value: dict.footer.operational,
      detail: dict.footer.systemsNormal,
      tone: "green" as Tone,
    },
    {
      icon: Layers3,
      title: dict.footer.analysisDepth,
      value: dict.footer.deep,
      detail: dict.footer.multilingual,
      tone: "purple" as Tone,
    },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-[-0.045em] text-[#060A23]">{dict.title}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#737D9F]">{dict.subtitle}</p>
        </div>
        <button type="button" className="flex h-10 w-fit items-center gap-2 rounded-[10px] border border-[#E5E9F3] bg-white px-4 text-xs font-extrabold text-[#475070] shadow-sm transition hover:bg-[#F8FAFF]">
          <Calendar size={15} className="text-[#8A94B8]" />
          {dict.last7Days}
          <ChevronDown size={14} className="text-[#8A94B8]" />
        </button>
      </header>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_408px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel className="overflow-hidden">
            <CardContent className="p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-[17px] font-black tracking-[-0.02em] text-[#101334]">
                    {dict.topicMap.title}
                    <Info size={14} className="text-[#98A2B3]" />
                  </h2>
                  <p className="mt-1 text-[12px] font-semibold text-[#737D9F]">{dict.topicMap.desc}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="flex h-9 items-center gap-2 rounded-[9px] border border-[#E5E9F3] bg-white px-3 text-[11px] font-extrabold text-[#4F5877] shadow-sm transition hover:bg-[#F8FAFF]">
                    {dict.topicMap.allTopics}
                    <ChevronDown size={13} className="text-[#8A94B8]" />
                  </button>
                  <button type="button" className="flex h-9 items-center gap-2 rounded-[9px] border border-[#E5E9F3] bg-white px-3 text-[11px] font-extrabold text-[#4F5877] shadow-sm transition hover:bg-[#F8FAFF]">
                    <Filter size={13} className="text-[#8A94B8]" />
                    {dict.topicMap.filter}
                  </button>
                  <button type="button" aria-label="Expand map" className="flex size-9 items-center justify-center rounded-[9px] border border-[#E5E9F3] bg-white text-[#4F5877] shadow-sm transition hover:bg-[#F8FAFF]">
                    <Maximize2 size={13} />
                  </button>
                </div>
              </div>

              <div className="relative min-h-[350px] overflow-hidden rounded-[12px] bg-[#FEFEFF] sm:min-h-[382px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(139,92,255,0.08),transparent_28%),radial-gradient(circle_at_24%_40%,rgba(16,185,129,0.05),transparent_18%),radial-gradient(circle_at_72%_28%,rgba(245,158,11,0.06),transparent_18%)]" />
                <div className="absolute left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#E8ECF5]" />
                <div className="absolute left-1/2 top-1/2 size-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#EDF0F7]" />

                {mapSpecks.map((speck, index) => {
                  const toneStyle = toneStyles[speck.tone];
                  return (
                    <span
                      key={`${speck.x}-${speck.y}-${index}`}
                      className="absolute rounded-full border"
                      style={{
                        left: `${speck.x}%`,
                        top: `${speck.y}%`,
                        width: speck.size,
                        height: speck.size,
                        opacity: speck.opacity,
                        borderColor: toneStyle.color,
                        backgroundColor: `rgba(${toneStyle.rgb}, .08)`,
                      }}
                    />
                  );
                })}

                <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {connections.map((connection, index) => {
                    const from = intelligenceClusters.find((cluster) => cluster.id === connection.from);
                    const to = intelligenceClusters.find((cluster) => cluster.id === connection.to);
                    if (!from || !to) return null;

                    const highlighted = selectedCluster.id === connection.from || selectedCluster.id === connection.to;
                    return (
                      <line
                        key={`${connection.from}-${connection.to}-${index}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={highlighted ? selectedTone.color : "#E6EAF4"}
                        strokeDasharray={connection.strength === "weak" ? "1.1 1.2" : undefined}
                        strokeLinecap="round"
                        strokeWidth={highlighted ? 0.34 : 0.2}
                        opacity={highlighted ? 0.68 : 0.76}
                      />
                    );
                  })}
                </svg>

                {intelligenceClusters.map((cluster) => (
                  <MapNode key={cluster.id} cluster={cluster} selected={selectedCluster.id === cluster.id} language={language} onSelect={setSelectedCluster} />
                ))}

                <div className="absolute bottom-5 left-5 z-30 flex flex-col gap-1 rounded-[9px] border border-[#E7EBF4] bg-white p-1 shadow-[0_10px_24px_rgba(16,24,40,0.08)]">
                  {[ZoomIn, ZoomOut, Maximize2].map((Icon, index) => (
                    <button key={index} type="button" className="flex size-7 items-center justify-center rounded-[6px] text-[#53608C] transition hover:bg-[#F5F7FC]" aria-label="Map control">
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-9 gap-y-2 border-t border-[#EEF1F7] pt-3 text-[10px] font-extrabold text-[#53608C]">
                <div className="flex items-center gap-2">
                  <span className="text-[#8A94B8]">{dict.topicMap.intensity}</span>
                  <span className="size-1.5 rounded-full bg-[#C9D0E2]" />
                  <span className="size-2 rounded-full bg-[#B3BDD4]" />
                  <span className="size-2.5 rounded-full bg-[#98A2B8]" />
                  <span className="size-3.5 rounded-full border border-[#9AA4BE] bg-white" />
                  <span className="text-[#8A94B8]">High</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#8A94B8]">{dict.topicMap.sentiment}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#10B981]" />{dict.topicMap.pos}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#CBD5E1]" />{dict.topicMap.neu}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#EF4444]" />{dict.topicMap.neg}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#8A94B8]">{dict.topicMap.connStrength}</span>
                  <span className="flex items-center gap-1.5"><span className="w-9 border-b border-dashed border-[#B9C2D6]" />{dict.topicMap.weak}</span>
                  <span className="flex items-center gap-1.5"><span className="w-9 border-b border-[#8A94B8]" />{dict.topicMap.strong}</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] font-semibold text-[#98A2B3]">{dict.topicMap.tip}</p>
            </CardContent>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[350px_minmax(0,1fr)]">
            <Panel>
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                    <Sparkles size={16} className="text-[#8B5CFF]" />
                    {dict.aiSummary.title}
                  </h3>
                  <div className="mt-4 rounded-[11px] border border-[#8B5CFF]/10 bg-[#8B5CFF]/7 p-3 text-[11px] font-bold leading-relaxed text-[#7654E7]">
                    {dict.aiSummary.box}
                  </div>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {dict.aiSummary.bullets.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[12px] font-semibold leading-snug text-[#53608C]">
                        <Check size={14} className="mt-0.5 shrink-0 text-[#53608C]" strokeWidth={2.6} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <button type="button" className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white text-[11px] font-extrabold text-[#53608C] transition hover:bg-[#F8FAFF]">
                  {dict.aiSummary.btn}
                  <ChevronRight size={13} />
                </button>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5">
                <h3 className="flex items-center gap-2 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                  {dict.lifecycle.title}
                  <Info size={13} className="text-[#98A2B3]" />
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {lifecycleCards.map((phase) => {
                    const toneStyle = toneStyles[phase.tone];
                    const copy = dict.lifecycle.phases[phase.key];
                    return (
                      <div key={phase.key} className="flex min-h-[182px] flex-col justify-between rounded-[12px] border border-[#EEF1F7] bg-[#FBFCFF] p-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.06em]" style={{ color: toneStyle.color }}>{copy.title}</p>
                          <p className="mt-2 text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{phase.count}</p>
                          <p className="mt-2 text-[10px] font-bold leading-snug text-[#737D9F]">{copy.desc}</p>
                        </div>
                        <Sparkline values={phase.values} color={toneStyle.color} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Panel>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <Panel>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-black tracking-[-0.02em] text-[#101334]">{dict.growingClusters.title}</h3>
                <button type="button" className="text-[11px] font-black text-[#465FFF] transition hover:text-[#351EFF]">{dict.growingClusters.viewAll}</button>
              </div>
              <div className="flex flex-col gap-2">
                {intelligenceClusters.slice(0, 5).map((cluster) => {
                  const selected = selectedCluster.id === cluster.id;
                  const toneStyle = toneStyles[cluster.tone];
                  return (
                    <button
                      key={cluster.id}
                      type="button"
                      onClick={() => setSelectedCluster(cluster)}
                      className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-left transition hover:border-[#DCE2F0]"
                      style={{
                        borderColor: selected ? `rgba(${toneStyle.rgb}, .18)` : "#EEF1F7",
                        backgroundColor: selected ? `rgba(${toneStyle.rgb}, .075)` : "#FFFFFF",
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ClusterIcon tone={cluster.tone} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-black text-[#101334]">{text(cluster.topic, language)}</span>
                          <span className="mt-1 block text-[10px] font-bold text-[#8A94B8]">{formatSignals(cluster.signals)} signals</span>
                        </span>
                      </span>
                      <TrendBadge value={cluster.growth} tone={cluster.tone} className="shrink-0 px-2 py-0.5 text-[10px]" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Panel>

          <Panel className="border-[#D9D6FF]">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black text-[#53608C]">{dict.selectedNarrative.title}</p>
                <button type="button" aria-label="More selected narrative actions" className="rounded-full p-1 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div className="flex items-start gap-3">
                <ClusterIcon tone={selectedCluster.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{text(selectedCluster.topic, language)}</h3>
                    <TrendBadge value={text(selectedCluster.priority, language)} tone={selectedCluster.priorityTone} className="shrink-0 px-2.5 py-1 text-[9px]" />
                  </div>
                  <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#53608C]">{text(selectedCluster.description, language)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <TrendBadge value={selectedCluster.growth} tone={selectedCluster.tone} className="px-2.5 py-1 text-[10px]" />
                <Badge variant="default" className="normal-case tracking-normal px-2.5 py-1 text-[10px]">{dict.selectedNarrative.highImpact}</Badge>
                <Badge variant="purple" className="normal-case tracking-normal px-2.5 py-1 text-[10px]">{dict.selectedNarrative.emerging}</Badge>
              </div>
              <div className="mt-3 border-t border-[#EEF1F7] pt-3">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#53608C]">{dict.selectedNarrative.related}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCluster.related.map((item) => (
                    <span key={`${text(item.topic, language)}-${item.growth}`} className="rounded-full bg-[#F5F7FC] px-2.5 py-1 text-[10px] font-bold text-[#53608C]">
                      {text(item.topic, language)} <span className="ml-1 text-[#EF4444]">{item.growth}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-[12px] bg-[#F6F8FF] p-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles size={15} className="mt-0.5 shrink-0 text-[#465FFF]" />
                  <div>
                    <p className="text-[10px] font-black text-[#53608C]">{dict.selectedNarrative.aiRec}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#53608C]">{text(selectedCluster.aiRec, language)}</p>
                  </div>
                </div>
              </div>
              <button type="button" className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.22)] transition hover:brightness-105">
                {dict.selectedNarrative.btnAnalysis}
                <ChevronRight size={14} />
              </button>
            </CardContent>
          </Panel>

          <Panel>
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                {dict.competitorShare.title}
                <Info size={13} className="text-[#98A2B3]" />
              </h3>
              <div className="grid items-center justify-items-center gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:justify-items-stretch xl:grid-cols-[156px_minmax(0,1fr)]">
                <CompetitorDonut label={dict.competitorShare.totalShare} />
                <div className="flex w-full min-w-0 flex-col gap-2 text-[12px] font-bold text-[#53608C]">
                  {donutData.map((item) => {
                    const toneStyle = toneStyles[item.tone];
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: toneStyle.color }} />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-black text-[#101334]">{item.value}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button type="button" className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-extrabold text-[#465FFF] transition hover:text-[#351EFF]">
                {dict.competitorShare.viewLandscape}
                <ChevronRight size={13} />
              </button>
            </CardContent>
          </Panel>
        </aside>
      </section>

      <footer className="mt-1 flex flex-col gap-5 border-t border-[#E9EDF5] pt-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {footerItems.map((item, index) => {
            const Icon = item.icon;
            const toneStyle = toneStyles[item.tone];
            return (
              <div key={item.title} className={cn("flex gap-3 xl:border-r xl:border-[#E9EDF5] xl:pr-5", index === footerItems.length - 1 && "xl:border-r-0")}> 
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ color: toneStyle.color, backgroundColor: `rgba(${toneStyle.rgb}, .1)` }}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#8A94B8]">{item.title}</p>
                  <p className="mt-1 text-[12px] font-black text-[#101334]">{item.value}</p>
                  {item.progress ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF1F7]"><span className="block h-full w-[86%] rounded-full bg-[#10B981]" /></span>
                      <span className="text-[10px] font-bold text-[#8A94B8]">{item.detail}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] font-bold text-[#8A94B8]">{item.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#C9C6F8] bg-white px-5 text-[12px] font-black text-[#6B4DE6] shadow-sm transition hover:bg-[#F8F6FF]">
          <Settings size={14} />
          {dict.footer.btnSettings}
        </button>
      </footer>
    </div>
  );
}
