"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Download,
  Search,
  TrendingUp,
  Target,
  Shield,
  MessageCircle,
  Info,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useUiStore } from "@/store/useUiStore";
import {
  OpenAILight,
  Gemini,
  MicrosoftCopilot,
  PerplexityAI,
  ClaudeAI
} from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";

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

const dictionary = {
  en: {
    breadcrumb: "Dashboard / AI Visibility",
    title: "AI Visibility",
    subtitle: "Monitor how your brand, topics, and competitors appear on generative AI platforms.",
    last7Days: "7 May 2025 - 14 May 2025",
    export: "Export",
    metrics: {
      totalMentions: { label: "Total AI Mentions", value: "2,451", helper: "+18.7% vs last 7 days" },
      brandMentions: { label: "Brand Mentions", value: "1,289", helper: "+22.1% vs last 7 days" },
      sov: { label: "Share of Voice", value: "24.3%", helper: "+4.6 p.p." },
      avgPos: { label: "Average Position (All AI)", value: "2.8", helper: "-0.4" },
    },
    execSummary: {
      title: "AI Executive Summary",
      aiGenerated: "A.I Generated",
      heading: "Your brand visibility increased +18.7% this week.",
      body: "The increase is driven by AI monitoring topics, cybersecurity discussions, and recommendations of ChatGPT for enterprise monitoring tools. However, competitors are leading on the 'cloud security' keyword in Google Gemini and Perplexity.",
      opportunity: "Top Opportunity",
      opportunityVal: "AI monitoring & enterprise intelligence tools",
      risk: "Top Risk",
      riskVal: "Cloud security (competitor dominated)",
      recActions: "AI Recommended Actions",
      rec1: "Push thought leadership content",
      rec2: "Optimize landing page (enterprise intel)",
      rec3: "Increase authority in cloud security",
      viewAll: "See all",
    },
    mentionsTrend: {
      title: "AI Mentions Trend",
      desc: "Growth in the number of mentions of your brand on AI platforms.",
      days7: "7 Days",
      days30: "30 Days",
    },
    topTopics: {
      title: "Top Topics Mentioned by AI",
      headers: { topic: "Topic", mentions: "Mentions", direction: "Direction", type: "Type" },
      viewAll: "See all topics",
    },
    sandbox: {
      title: "AI Search Sandbox",
      desc: "Simulate how AI responds to queries and mentions the Narriv brand.",
      queryPlaceholder: "Search for signals, topics, issues, or cases...",
      simulateBtn: "Simulate",
      responseTitle: "AI Response (ChatGPT)",
      citations: "Key Sources (Citations)",
      confidence: "Confidence",
    },
    competitorVs: {
      title: "Visibility vs Competitors (All AI Platforms)",
    },
    topPlatforms: {
      title: "Top AI Platforms",
    },
    competitorShare: {
      title: "Competitor Share of Voice",
      totalShare: "Total SOV",
    },
    latestMentions: {
      title: "Latest Mention Examples",
      viewAll: "View all",
    }
  },
  id: {
    breadcrumb: "Dashboard / AI Visibility",
    title: "AI Visibility",
    subtitle: "Pantau bagaimana brand, topik, dan kompetitor Anda muncul di platform generative AI.",
    last7Days: "7 Mei 2025 - 14 Mei 2025",
    export: "Ekspor",
    metrics: {
      totalMentions: { label: "Total AI Mentions", value: "2.451", helper: "+18,7% vs 7 hari terakhir" },
      brandMentions: { label: "Brand Mentions", value: "1.289", helper: "+22,1% vs 7 hari terakhir" },
      sov: { label: "Share of Voice", value: "24,3%", helper: "+4,6 p.p." },
      avgPos: { label: "Rata-rata Posisi (Semua AI)", value: "2,8", helper: "-0,4" },
    },
    execSummary: {
      title: "AI Executive Summary",
      aiGenerated: "A.I Generated",
      heading: "Visibility merek Anda meningkat +18,7% minggu ini.",
      body: "Peningkatan dipicu oleh topik AI monitoring, diskusi cybersecurity, dan rekomendasi ChatGPT terhadap tools monitoring enterprise. Namun, kompetitor mulai unggul pada keyword \"cloud security\" di Google Gemini dan Perplexity.",
      opportunity: "Top Opportunity",
      opportunityVal: "AI monitoring & enterprise intelligence tools",
      risk: "Top Risk",
      riskVal: "Cloud security (competitor dominated)",
      recActions: "AI Recommended Actions",
      rec1: "Dorong konten thought leadership",
      rec2: "Optimasi landing page (enterprise intel)",
      rec3: "Tingkatkan authority di cloud security",
      viewAll: "Lihat semua",
    },
    mentionsTrend: {
      title: "AI Mentions Trend",
      desc: "Perkembangan jumlah penyebutan brand Anda di platform AI.",
      days7: "7 Hari",
      days30: "30 Hari",
    },
    topTopics: {
      title: "Top Topics Mentioned by AI",
      headers: { topic: "Topik", mentions: "Penyebutan", direction: "Arah", type: "Tipe" },
      viewAll: "Lihat semua topik",
    },
    sandbox: {
      title: "AI Search Sandbox",
      desc: "Simulasi bagaimana AI merespons pertanyaan tentang brand Anda.",
      queryPlaceholder: "Cari sinyal, topik, isu, atau kasus...",
      simulateBtn: "Simulasi",
      responseTitle: "AI Response (ChatGPT)",
      citations: "Key Sources (Citations)",
      confidence: "Confidence",
    },
    competitorVs: {
      title: "Visibility vs Competitors (All AI Platforms)",
    },
    topPlatforms: {
      title: "Top AI Platforms",
    },
    competitorShare: {
      title: "Competitor Share of Voice",
      totalShare: "Total SOV",
    },
    latestMentions: {
      title: "Latest Mention Examples",
      viewAll: "Lihat semua",
    }
  }
};

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("rounded-[14px] border-[#E8ECF5] bg-white text-[#101334] shadow-[0_2px_14px_rgba(16,24,40,0.035)]", className)}>
      {children}
    </Card>
  );
}

function IconHalo({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const toneStyle = toneStyles[tone];
  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-full border shadow-[0_6px_12px_rgba(16,24,40,0.03)]"
      style={{
        color: toneStyle.color,
        borderColor: `rgba(${toneStyle.rgb}, 0.12)`,
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.9), rgba(${toneStyle.rgb}, .11))`,
      }}
    >
      <Icon size={20} strokeWidth={2.3} />
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;
  const width = 100;
  const height = 24;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const path = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * 96 + 2;
      const y = height - ((val - min) / range) * 16 - 4;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg className="h-6 w-24 shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function MetricCard({ label, value, helper, icon, tone, sparklineValues }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone; sparklineValues: number[] }) {
  const styles = toneStyles[tone];
  const isNegative = helper.startsWith("-") || helper.startsWith("▼");
  return (
    <Panel>
      <CardContent className="relative flex min-h-[94px] items-center justify-between gap-4 p-5 overflow-hidden">
        <div className="flex items-center gap-4 z-10 min-w-0">
          <IconHalo icon={icon} tone={tone} />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-extrabold leading-none text-[#68739F]">{label}</p>
            <p className="mt-2 text-[27px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
            <p className={cn("mt-2 flex items-center gap-1 text-[11px] font-black", isNegative ? "text-[#EF4444]" : "text-[#10B981]")}>
              <span className={cn("size-1.5 rounded-full", isNegative ? "bg-[#EF4444]" : "bg-[#10B981]")} />
              {helper}
            </p>
          </div>
        </div>
        <div className="absolute right-4 bottom-3 w-24 h-6 opacity-70">
          <Sparkline values={sparklineValues} color={styles.color} />
        </div>
      </CardContent>
    </Panel>
  );
}

function MentionsTrendChart() {
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const dates = ["8 Mei", "9 Mei", "10 Mei", "11 Mei", "12 Mei", "13 Mei", "14 Mei"];

  const datasets = [
    { name: "ChatGPT", color: "#8B5CFF", values: [650, 840, 950, 1100, 1200, 1150, 1248] },
    { name: "Google Gemini", color: "#465FFF", values: [420, 480, 520, 560, 590, 610, 643] },
    { name: "Microsoft Copilot", color: "#F59E0B", values: [210, 240, 260, 270, 290, 310, 321] },
    { name: "Perplexity", color: "#10B981", values: [80, 110, 130, 120, 140, 150, 156] },
    { name: "Claude", color: "#64748B", values: [40, 50, 60, 55, 70, 75, 83] },
  ];

  const maxVal = 1800;

  const getX = (index: number) => paddingLeft + (index / (dates.length - 1)) * (width - paddingLeft - paddingRight);
  const getY = (val: number) => paddingTop + (1 - val / maxVal) * (height - paddingTop - paddingBottom);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[500px]">
        <svg className="w-full h-[180px]" viewBox={`0 0 ${width} ${height}`}>
          {[0, 600, 1200, 1800].map((yVal) => {
            const y = getY(yVal);
            return (
              <g key={yVal}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#EEF1F7" strokeWidth="1" strokeDasharray={yVal === 0 ? "0" : "3 3"} />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-[#8A94B8]">
                  {yVal === 0 ? "0" : yVal >= 1000 ? `${(yVal / 1000).toFixed(1)}K` : yVal}
                </text>
              </g>
            );
          })}

          {dates.map((date, idx) => {
            const x = getX(idx);
            return (
              <text key={date} x={x} y={height - 5} textAnchor="middle" className="text-[10px] font-bold fill-[#8A94B8]">
                {date}
              </text>
            );
          })}

          {datasets.map((dataset) => {
            const path = dataset.values
              .map((val, idx) => {
                const x = getX(idx);
                const y = getY(val);
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={dataset.name}>
                <path d={path} fill="none" stroke={dataset.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {dataset.values.map((val, idx) => (
                  <circle key={idx} cx={getX(idx)} cy={getY(val)} r="3" fill="#FFFFFF" stroke={dataset.color} strokeWidth="1.5" />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CompetitorVsChart() {
  const width = 600;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 95;
  const paddingTop = 20;
  const paddingBottom = 25;

  const dates = ["8 Mei", "9 Mei", "10 Mei", "11 Mei", "12 Mei", "13 Mei", "14 Mei"];

  const datasets = [
    { name: "Narriv (You)", color: "#8B5CFF", values: [24.3, 25.1, 23.8, 26.2, 28.0, 25.5, 24.3] },
    { name: "Competitor A", color: "#EF4444", values: [20.1, 22.4, 21.0, 24.8, 30.2, 29.8, 31.2] },
    { name: "Competitor B", color: "#F59E0B", values: [15.2, 17.5, 14.8, 18.0, 20.1, 18.5, 16.8] },
    { name: "Competitor C", color: "#10B981", values: [10.1, 11.2, 10.5, 12.0, 13.5, 12.8, 14.5] },
  ];

  const maxVal = 40;

  const getX = (index: number) => paddingLeft + (index / (dates.length - 1)) * (width - paddingLeft - paddingRight);
  const getY = (val: number) => paddingTop + (1 - val / maxVal) * (height - paddingTop - paddingBottom);

  const targetIdx = 6;
  const targetX = getX(targetIdx);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[500px]">
        <svg className="w-full h-[180px]" viewBox={`0 0 ${width} ${height}`}>
          {[0, 20, 40].map((yVal) => {
            const y = getY(yVal);
            return (
              <g key={yVal}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#EEF1F7" strokeWidth="1" strokeDasharray={yVal === 0 ? "0" : "3 3"} />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-[#8A94B8]">
                  {yVal}%
                </text>
              </g>
            );
          })}

          {dates.map((date, idx) => {
            const x = getX(idx);
            return (
              <text key={date} x={x} y={height - 5} textAnchor="middle" className="text-[10px] font-bold fill-[#8A94B8]">
                {date}
              </text>
            );
          })}

          <line x1={targetX} y1={paddingTop - 5} x2={targetX} y2={height - paddingBottom} stroke="#8B5CFF" strokeWidth="1" strokeDasharray="3 3" />

          {datasets.map((dataset) => {
            const path = dataset.values
              .map((val, idx) => {
                const x = getX(idx);
                const y = getY(val);
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={dataset.name}>
                <path d={path} fill="none" stroke={dataset.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={targetX} cy={getY(dataset.values[targetIdx])} r="3.5" fill={dataset.color} stroke="#FFFFFF" strokeWidth="1" />
              </g>
            );
          })}

          <g transform={`translate(${targetX + 8}, ${paddingTop - 12})`}>
            <rect width="84" height="74" rx="6" fill="#FFFFFF" stroke="#DCE2F0" strokeWidth="1.2" />
            <text x="8" y="12" className="text-[8px] font-black fill-[#8A94B8]">14 Mei 2025</text>
            {datasets.map((ds, idx) => (
              <g key={ds.name} transform={`translate(8, ${24 + idx * 11})`}>
                <circle cx="3" cy="-3" r="2.5" fill={ds.color} />
                <text x="10" y="1" className="text-[8px] font-bold fill-[#53608C]">{ds.name.split(" ")[0]}</text>
                <text x="70" y="1" textAnchor="end" className="text-[8px] font-black fill-[#101334]">{ds.values[targetIdx].toFixed(1)}%</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function TopicTypeBadge({ type }: { type: string }) {
  let badgeVariant: "default" | "green" | "amber" | "red" | "purple" | "slate" = "slate";
  if (type === "Opportunity" || type === "Peluang") badgeVariant = "green";
  else if (type === "Alert" || type === "Peringatan") badgeVariant = "amber";
  else if (type === "Informational" || type === "Informasi") badgeVariant = "default";
  else if (type === "Risk" || type === "Risiko") badgeVariant = "red";
  return (
    <Badge variant={badgeVariant} className="px-2 py-0.5 text-[9px] font-bold">
      {type}
    </Badge>
  );
}

function TopicDirection({ val }: { val: string }) {
  const isUp = val.startsWith("▲") || val.startsWith("+") || val.includes("↑") || parseFloat(val) > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold", isUp ? "text-[#10B981]" : "text-[#EF4444]")}>
      {isUp ? "↑" : "↓"} {val.replace(/[▲▼↑↓+-]/g, "").trim()}
    </span>
  );
}

function DonutChartVisibility({ center, label }: { center: string; label: string }) {
  return (
    <div className="relative mx-auto flex size-[150px] items-center justify-center rounded-full bg-[conic-gradient(#8B5CFF_0_24.3%,#EF4444_24.3%_55.5%,#F59E0B_55.5%_72.3%,#10B981_72.3%_86.8%,#64748B_86.8%_100%)] shadow-[0_0_20px_rgba(70,95,255,0.08)]">
      <div className="absolute size-[104px] rounded-full bg-white" />
      <div className="relative text-center z-10">
        <p className="text-[24px] font-black text-[#101334]">{center}</p>
        <p className="mt-0.5 text-[9px] font-bold text-[#8A94B8]">{label}</p>
      </div>
    </div>
  );
}

export default function VisibilityPage() {
  const language = useUiStore((state) => state.language);
  const dict = dictionary[language] || dictionary.en;

  const [sandboxQuery, setSandboxQuery] = useState("Best AI monitoring platform for enterprise");
  const [confidence, setConfidence] = useState(82);
  const [simulatedResponse, setSimulatedResponse] = useState(
    "Narriv is an enterprise AI narrative intelligence platform that helps organizations monitor signals, analyze data in real-time, and make smarter decisions."
  );
  const [citations, setCitations] = useState([
    { text: "narriv.ai/blog/ai-monitoring-enterprise", url: "#" },
    { text: "TechInAsia: Top AI monitoring tools 2025", url: "#" },
    { text: "LinkedIn Discussion: AI monitoring trends", url: "#" }
  ]);

  const handleSimulate = () => {
    const textQuery = sandboxQuery.toLowerCase();
    if (textQuery.includes("security") || textQuery.includes("risk") || textQuery.includes("aman")) {
      setSimulatedResponse(
        "For cloud security intelligence, competitors currently hold higher visibility rankings. Narriv is noted for general monitoring but lacks authority in specific cybersecurity namespaces."
      );
      setConfidence(64);
      setCitations([
        { text: "techradar.com/news/cloud-security-leaders", url: "#" },
        { text: "Gemini Search: Enterprise security references", url: "#" },
        { text: "Perplexity citation: Competitor A Cloud Authority", url: "#" }
      ]);
    } else {
      setSimulatedResponse(
        "Narriv is an enterprise AI narrative intelligence platform that helps organizations monitor signals, analyze data in real-time, and make smarter decisions."
      );
      setConfidence(82);
      setCitations([
        { text: "narriv.ai/blog/ai-monitoring-enterprise", url: "#" },
        { text: "TechInAsia: Top AI monitoring tools 2025", url: "#" },
        { text: "LinkedIn Discussion: AI monitoring trends", url: "#" }
      ]);
    }
  };

  const topTopicsData = [
    { topic: "AI monitoring", mentions: "1.248", direction: "↑ 24,5%", type: language === "id" ? "Peluang" : "Opportunity" },
    { topic: "Service disruption", mentions: "842", direction: "↑ 18,3%", type: language === "id" ? "Peringatan" : "Alert" },
    { topic: "App update", mentions: "621", direction: "↑ 12,7%", type: language === "id" ? "Informasi" : "Informational" },
    { topic: "Cloud security", mentions: "498", direction: "↓ 16,2%", type: language === "id" ? "Risiko" : "Risk" },
    { topic: "Privacy policy", mentions: "368", direction: "↓ 6,2%", type: language === "id" ? "Netral" : "Neutral" }
  ];

  const shareOfVoiceLeg = [
    { name: language === "id" ? "Narriv (Anda)" : "Narriv (You)", val: "24.3%", tone: "purple" as Tone },
    { name: "Competitor A", val: "31.2%", tone: "red" as Tone },
    { name: "Competitor B", val: "16.8%", tone: "amber" as Tone },
    { name: "Competitor C", val: "14.5%", tone: "green" as Tone },
    { name: "Others", val: "13.2%", tone: "slate" as Tone }
  ];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#8A94B8]">{dict.breadcrumb}</p>
          <h1 className="mt-1 text-[28px] font-black leading-none tracking-[-0.03em] text-[#101334]">{dict.title}</h1>
          <p className="mt-2 text-[13px] font-bold text-[#53608C]">{dict.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className="flex h-10 items-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF]">
            <CalendarDays size={14} className="text-[#8A94B8]" />
            {dict.last7Days}
            <ChevronDown size={12} className="text-[#8A94B8]" />
          </button>
          <button type="button" className="flex h-10 items-center gap-2 rounded-[8px] border border-[#D9DEEA] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF]">
            <Download size={14} className="text-[#8A94B8]" />
            {dict.export}
          </button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_382px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={dict.metrics.totalMentions.label} value={dict.metrics.totalMentions.value} helper={dict.metrics.totalMentions.helper} icon={MessageCircle} tone="purple" sparklineValues={[260, 330, 310, 500, 470, 520, 680]} />
            <MetricCard label={dict.metrics.brandMentions.label} value={dict.metrics.brandMentions.value} helper={dict.metrics.brandMentions.helper} icon={Target} tone="blue" sparklineValues={[150, 180, 170, 220, 210, 240, 289]} />
            <MetricCard label={dict.metrics.sov.label} value={dict.metrics.sov.value} helper={dict.metrics.sov.helper} icon={Shield} tone="green" sparklineValues={[22.5, 23.1, 22.8, 24.0, 23.5, 24.1, 24.3]} />
            <MetricCard label={dict.metrics.avgPos.label} value={dict.metrics.avgPos.value} helper={dict.metrics.avgPos.helper} icon={TrendingUp} tone="amber" sparklineValues={[3.2, 3.1, 3.0, 2.9, 2.8, 2.8, 2.8]} />
          </div>

          <Panel className="border-[#D6DEFF] bg-gradient-to-r from-[#F6F8FF] to-[#F1F3FF]">
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_230px_260px] lg:items-center">
              <div className="flex items-start gap-4">
                <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-200 bg-[#F3ECFF] shadow-md sm:size-20">
                  <Image src="/mainapp/ai-avatar.png" alt="AI Agent avatar" fill sizes="80px" className="object-cover" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-black uppercase tracking-[0.06em] text-[#101334]">{dict.execSummary.title}</p>
                    <Badge variant="purple" className="px-2 py-0.5 text-[9px] font-bold normal-case tracking-normal">
                      {dict.execSummary.aiGenerated}
                    </Badge>
                  </div>
                  <h2 className="mt-1.5 text-[17px] font-black tracking-[-0.02em] text-[#101334]">{dict.execSummary.heading}</h2>
                  <p className="mt-2 max-w-[620px] text-[12px] font-semibold leading-relaxed text-[#53608C]">{dict.execSummary.body}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#D9DDF2] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#8A94B8]">
                    <TrendingUp size={11} className="text-[#10B981]" />
                    {dict.execSummary.opportunity}
                  </div>
                  <p className="mt-1 text-[11px] font-black leading-tight text-[#101334]">{dict.execSummary.opportunityVal}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#8A94B8]">
                    <AlertCircle size={11} className="text-[#EF4444]" />
                    {dict.execSummary.risk}
                  </div>
                  <p className="mt-1 text-[11px] font-black leading-tight text-[#101334]">{dict.execSummary.riskVal}</p>
                </div>
              </div>

              <div className="border-t border-[#D9DDF2] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <p className="text-[10px] font-black uppercase tracking-[0.04em] text-[#8A94B8]">{dict.execSummary.recActions}</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {[dict.execSummary.rec1, dict.execSummary.rec2, dict.execSummary.rec3].map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] font-semibold text-[#53608C]">
                      <CheckCircle size={13} className="mt-0.5 shrink-0 text-[#8B5CFF]" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
                <button type="button" className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-[8px] bg-white px-3 py-2 text-center text-[11px] font-black leading-tight text-[#8B5CFF] shadow-sm transition hover:bg-[#F8FAFF]">
                  <span className="min-w-0 break-words">{dict.execSummary.viewAll}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </CardContent>
          </Panel>

          {/* Row 1 Grid: Mentions Trend & Top Topics */}
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <Panel>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-black tracking-[-0.02em] text-[#101334]">{dict.mentionsTrend.title}</h3>
                    <p className="text-[11px] font-bold text-[#8A94B8]">{dict.mentionsTrend.desc}</p>
                  </div>
                  <div className="flex rounded-lg bg-[#F5F7FC] p-0.5">
                    <button type="button" className="rounded-md bg-white px-2.5 py-1 text-[10px] font-black text-[#101334] shadow-sm">
                      {dict.mentionsTrend.days7}
                    </button>
                    <button type="button" className="px-2.5 py-1 text-[10px] font-bold text-[#8A94B8] hover:text-[#101334]">
                      {dict.mentionsTrend.days30}
                    </button>
                  </div>
                </div>
                <MentionsTrendChart />
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-[#53608C]">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#8B5CFF]" />ChatGPT</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#465FFF]" />Google Gemini</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F59E0B]" />Microsoft Copilot</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#10B981]" />Perplexity</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#64748B]" />Claude</span>
                </div>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <h3 className="mb-4 text-[15px] font-black tracking-[-0.02em] text-[#101334]">{dict.topTopics.title}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-bold text-[#53608C]">
                      <thead>
                        <tr className="border-b border-[#EEF1F7] text-[10px] font-black uppercase text-[#8A94B8]">
                          <th className="pb-2.5">{dict.topTopics.headers.topic}</th>
                          <th className="pb-2.5 text-right">{dict.topTopics.headers.mentions}</th>
                          <th className="pb-2.5 text-center">{dict.topTopics.headers.direction}</th>
                          <th className="pb-2.5 text-center">{dict.topTopics.headers.type}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTopicsData.map((item) => (
                          <tr key={item.topic} className="border-b border-[#F5F7FC] last:border-0 hover:bg-[#FDFEFF]">
                            <td className="py-3 font-black text-[#101334]">{item.topic}</td>
                            <td className="py-3 text-right text-[#53608C]">{item.mentions}</td>
                            <td className="py-3 text-center"><TopicDirection val={item.direction} /></td>
                            <td className="py-3 text-center"><TopicTypeBadge type={item.type} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <button type="button" className="mt-4 flex items-center justify-center gap-1 text-[11px] font-black text-[#8B5CFF] hover:underline">
                  {dict.topTopics.viewAll}
                  <ChevronRight size={13} />
                </button>
              </CardContent>
            </Panel>
          </div>

          {/* Row 2 Grid: Sandbox & Visibility vs Competitors */}
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <Panel>
              <CardContent className="p-5">
                <h3 className="text-[15px] font-black tracking-[-0.02em] text-[#101334]">{dict.sandbox.title}</h3>
                <p className="text-[11px] font-bold text-[#8A94B8] mt-1">{dict.sandbox.desc}</p>
                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 size-4 text-[#8A94B8]" />
                    <input
                      type="text"
                      value={sandboxQuery}
                      onChange={(e) => setSandboxQuery(e.target.value)}
                      placeholder={dict.sandbox.queryPlaceholder}
                      className="h-10 w-full rounded-[8px] border border-[#D9DEEA] pl-10 pr-4 text-[12px] font-semibold text-[#101334] outline-none focus:border-[#8B5CFF]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulate}
                    className="h-10 rounded-[8px] bg-[#8B5CFF] px-4 text-[12px] font-black text-white transition hover:bg-[#764ee6] shadow-sm"
                  >
                    {dict.sandbox.simulateBtn}
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-[10px] bg-[#F6F8FF] border border-[#D9E1FC] p-4">
                    <p className="text-[10px] font-black uppercase text-[#8A94B8] tracking-[0.04em]">{dict.sandbox.responseTitle}</p>
                    <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#53608C]">{simulatedResponse}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8A94B8]">{dict.sandbox.confidence}</span>
                      <span className="text-[11px] font-black text-[#10B981]">{confidence}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#E5E9FC] overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full transition-all duration-300" style={{ width: `${confidence}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#8A94B8] tracking-[0.04em]">{dict.sandbox.citations}</p>
                      <div className="mt-2.5 space-y-2">
                        {citations.map((cite, idx) => (
                          <a key={idx} href={cite.url} className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#53608C] hover:text-[#8B5CFF] transition pb-2 border-b border-[#F0F2F7] last:border-0 last:pb-0">
                            <span className="truncate">{cite.text}</span>
                            <ExternalLink size={12} className="shrink-0 text-[#8A94B8]" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Panel>

            <Panel>
              <CardContent className="p-5">
                <h3 className="mb-4 text-[15px] font-black tracking-[-0.02em] text-[#101334]">{dict.competitorVs.title}</h3>
                <CompetitorVsChart />
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-[#53608C]">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#8B5CFF]" />Narriv (You)</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#EF4444]" />Competitor A</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#F59E0B]" />Competitor B</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#10B981]" />Competitor C</span>
                </div>
              </CardContent>
            </Panel>
          </div>
        </div>

        {/* Right Sidebar Stack */}
        <aside className="flex flex-col gap-4">
          <Panel>
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-1.5 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                {dict.topPlatforms.title}
                <Info size={13} className="text-[#98A2B3]" />
              </h3>
              <div className="space-y-4">
                {[
                  { name: "ChatGPT", logo: OpenAILight, mentions: "1.248", pct: "50,9%", width: "50.9%" },
                  { name: "Google Gemini", logo: Gemini, mentions: "643", pct: "26,2%", width: "26.2%" },
                  { name: "Microsoft Copilot", logo: MicrosoftCopilot, mentions: "321", pct: "13,1%", width: "13.1%" },
                  { name: "Perplexity", logo: PerplexityAI, mentions: "156", pct: "6,4%", width: "6.4%" },
                  { name: "Claude", logo: ClaudeAI, mentions: "83", pct: "3,4%", width: "3.4%" },
                ].map((plat) => (
                  <div key={plat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-[12px] font-bold text-[#53608C]">
                      <span className="flex items-center gap-2 text-[#101334] min-w-0">
                        <plat.logo className="size-[18px] shrink-0" />
                        <span className="truncate">{plat.name}</span>
                      </span>
                      <span className="shrink-0">{plat.mentions} <span className="text-[#8A94B8] font-semibold">({plat.pct})</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EEF1F7] overflow-hidden">
                      <div className="h-full bg-[#8B5CFF] rounded-full" style={{ width: plat.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Panel>

          <Panel>
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-1.5 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                {dict.competitorShare.title}
                <Info size={13} className="text-[#98A2B3]" />
              </h3>
              <div className="grid items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-[150px_minmax(0,1fr)]">
                <DonutChartVisibility center="24,3%" label={dict.competitorShare.totalShare} />
                <div className="flex w-full min-w-0 flex-col gap-2.5 text-[11px] font-bold text-[#53608C]">
                  {shareOfVoiceLeg.map((item) => {
                    const style = toneStyles[item.tone];
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: style.color }} />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-black text-[#101334]">{item.val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Panel>

          <Panel>
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-1.5 text-[15px] font-black tracking-[-0.02em] text-[#101334]">
                    {dict.latestMentions.title}
                    <Info size={13} className="text-[#98A2B3]" />
                  </h3>
                  <button type="button" className="text-[11px] font-black text-[#8B5CFF] hover:underline">
                    {dict.latestMentions.viewAll}
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { logo: OpenAILight, platform: "ChatGPT", time: "14 Mei 2025 • 10:23", quote: "“Narriv adalah platform AI intelligence yang membantu organisasi memantau sinyal dan menganalisis data reputasi...”" },
                    { logo: Gemini, platform: "Google Gemini", time: "14 Mei 2025 • 09:48", quote: "“Untuk kebutuhan monitoring sinyal dan analisis data real-time, Narriv bisa menjadi solusi yang tepat...”" },
                    { logo: PerplexityAI, platform: "Perplexity", time: "14 Mei 2025 • 08:15", quote: "“Narriv menyediakan dashboard intelligence yang powerful untuk pengambilan keputusan berbasis data...”" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-3 border-b border-[#F0F2F7] pb-3 last:border-0 last:pb-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[#EEF1F7] bg-white">
                        <item.logo className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#101334]">{item.platform}</p>
                        <p className="text-[9px] font-semibold text-[#8A94B8] mt-0.5">{item.time}</p>
                        <p className="text-[11px] font-semibold leading-relaxed text-[#53608C] mt-1.5 italic">{item.quote}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Panel>
        </aside>
      </section>
    </div>
  );
}
