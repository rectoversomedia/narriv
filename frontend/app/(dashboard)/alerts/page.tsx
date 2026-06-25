"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Eye,
  Headphones,
  HelpCircle,
  Mail,
  MoreVertical,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AppStore,
  Discourse,
  Facebook,
  GooglePlay,
  Instagram,
  MicrosoftTeams,
  Slack,
  TikTokDark,
  WhatsApp,
  XLight,
} from "@ridemountainpig/svgl-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getAlertsSummary } from "@/lib/api-service";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type Sentiment = "NEGATIF" | "POSITIF" | "CAMPURAN";
type AlertStatus = "New" | "Investigating" | "Escalated" | "Resolved";
type SourceKey = keyof typeof sourceIcons;

type ToneStyle = {
  color: string;
  rgb: string;
  soft: string;
  text: string;
  border: string;
};

type AlertRow = {
  id: string | number;
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
  ack: string;
  notificationChannels: Array<"whatsapp" | "email" | "teams" | "slack">;
  impact: "High" | "Medium";
  status: AlertStatus;
  time: string;
  tone: Exclude<Tone, "purple" | "slate">;
};

type Metric = {
  label: string;
  value: string;
  helper: string;
  helperTone: Tone;
  icon: LucideIcon;
  tone: Tone;
  spark: number[];
};

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#465FFF]", border: "border-[#465FFF]/15" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#8B5CFF]", border: "border-[#8B5CFF]/15" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/15" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/15" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/15" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

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

const mockRows: AlertRow[] = [
  {
    id: 1,
    title: "Payment delay complaints are rising",
    description: "Spike in payment delay complaints across social media and news.",
    tags: ["Critical"],
    sourceLabel: "Corporate Affairs",
    sources: ["x", "instagram", "tiktok"],
    extraSources: 2,
    sentiment: "NEGATIF",
    velocity: "+248%",
    velocityPeriod: "in 2 hours",
    velocityTrend: [8, 13, 10, 22, 18, 29, 35, 31, 44],
    mentions: "1.248",
    confidence: "94%",
    ack: "8/12",
    notificationChannels: ["whatsapp", "email", "teams", "slack"],
    impact: "High",
    status: "Investigating",
    time: "10:23 WIB",
    tone: "red",
  },
  {
    id: 2,
    title: "Mobile app stability disruption",
    description: "Users report repeated crashes during transactions.",
    tags: ["High"],
    sourceLabel: "IT Operations",
    sources: ["appstore", "googleplay"],
    extraSources: 1,
    sentiment: "NEGATIF",
    velocity: "+89%",
    velocityPeriod: "in 4 hours",
    velocityTrend: [7, 9, 8, 13, 11, 18, 16, 23, 28],
    mentions: "842",
    confidence: "89%",
    ack: "4/5",
    notificationChannels: ["email", "teams", "slack"],
    impact: "High",
    status: "Escalated",
    time: "09:45 WIB",
    tone: "amber",
  },
  {
    id: 3,
    title: "New promo receives positive response",
    description: "Recent cashback campaign is getting positive customer response.",
    tags: ["Info"],
    sourceLabel: "Marketing",
    sources: ["instagram", "facebook", "tiktok"],
    extraSources: 2,
    sentiment: "POSITIF",
    velocity: "+67%",
    velocityPeriod: "in 6 hours",
    velocityTrend: [6, 8, 10, 12, 15, 18, 16, 22, 29],
    mentions: "621",
    confidence: "87%",
    ack: "11/12",
    notificationChannels: ["email"],
    impact: "Medium",
    status: "Resolved",
    time: "08:15 WIB",
    tone: "green",
  },
  {
    id: 4,
    title: "FAQ confusion around credit terms",
    description: "Customers are confused by the updated credit payment terms.",
    tags: ["Warning"],
    sourceLabel: "Customer Care",
    sources: ["support"],
    extraSources: 1,
    sentiment: "CAMPURAN",
    velocity: "+23%",
    velocityPeriod: "in 5 hours",
    velocityTrend: [9, 11, 10, 13, 12, 16, 18, 21, 24],
    mentions: "338",
    confidence: "81%",
    ack: "6/8",
    notificationChannels: ["email", "teams"],
    impact: "Medium",
    status: "Resolved",
    time: "08:20 WIB",
    tone: "blue",
  },
  {
    id: 5,
    title: "Data security issue",
    description: "Account data protection questions are increasing in community forums.",
    tags: ["High"],
    sourceLabel: "IT Security",
    sources: ["discourse"],
    extraSources: 2,
    sentiment: "NEGATIF",
    velocity: "+16%",
    velocityPeriod: "in 7 hours",
    velocityTrend: [5, 7, 6, 9, 8, 10, 9, 12, 10],
    mentions: "276",
    confidence: "78%",
    ack: "3/5",
    notificationChannels: ["whatsapp", "email", "teams", "slack"],
    impact: "High",
    status: "Investigating",
    time: "07:50 WIB",
    tone: "amber",
  },
];

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

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>{children}</section>;
}

function Sparkline({ values, tone, id, className = "h-8" }: { values: number[]; tone: Tone; id: string; className?: string }) {
  const style = toneStyles[tone];
  const width = 150;
  const height = 42;
  const path = makeLinePath(values.length > 1 ? values : [0, 0], width, height, 5);
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

function buildMetricCards(ta: ReturnType<typeof useTranslations<"Alerts">>, summary: Awaited<ReturnType<typeof getAlertsSummary>>): Metric[] {
  const total = summary?.total ?? 0;
  const critical = summary?.by_severity?.critical ?? 0;
  const high = summary?.by_severity?.high ?? 0;
  const medium = summary?.by_severity?.medium ?? 0;
  const low = summary?.by_severity?.low ?? 0;
  const info = summary?.by_severity?.info ?? 0;
  const inProgress = summary?.by_status?.in_progress ?? 0;
  const resolved = summary?.by_status?.resolved ?? 0;
  const last7 = summary?.last_7_days ?? 0;
  const prev7 = summary?.previous_7_days ?? 0;
  const trendDelta = summary?.trend_delta ?? 0;
  const spark = summary?.timeline?.slice(-12) ?? [];

  const delta = prev7 > 0 ? `${((last7 - prev7) / prev7 * 100).toFixed(1)}%` : "0%";
  const deltaSign = trendDelta >= 0 ? "+" : "";
  const deltaLabel = trendDelta >= 0 ? ta("v2.metrics.vs30Days", { val: `${deltaSign}${delta}` }) : ta("v2.metrics.vs30Days", { val: delta });

  return [
    { label: ta("v2.metrics.totalAlerts"), value: String(total), helper: deltaLabel, helperTone: trendDelta >= 0 ? "green" : "red", icon: Bell, tone: "purple", spark },
    { label: ta("v2.metrics.criticalAlerts"), value: String(critical), helper: ta("v2.metrics.vs30Days", { val: `${critical}` }), helperTone: "red", icon: AlertTriangle, tone: "red", spark: spark.slice().reverse() },
    { label: ta("v2.metrics.warningAlerts"), value: String(high + medium), helper: ta("v2.metrics.vs30Days", { val: `${high + medium}` }), helperTone: "green", icon: AlertTriangle, tone: "amber", spark },
    { label: ta("v2.metrics.infoAlerts"), value: String(info + low), helper: ta("v2.metrics.vs30Days", { val: `${info + low}` }), helperTone: "blue", icon: HelpCircle, tone: "blue", spark },
    { label: ta("v2.metrics.deliveredAlerts"), value: String(total), helper: ta("v2.metrics.successRate", { val: total > 0 ? "100" : "0" }), helperTone: "green", icon: Shield, tone: "green", spark },
    { label: ta("v2.metrics.acknowledgedAlerts"), value: String(inProgress), helper: ta("v2.metrics.of", { val1: String(inProgress), val2: String(total) }), helperTone: "blue", icon: Users, tone: "purple", spark },
    { label: ta("v2.metrics.escalated"), value: String(critical), helper: ta("v2.metrics.criticalIncidents"), helperTone: "red", icon: AlertTriangle, tone: "red", spark: spark.slice().reverse() },
    { label: ta("v2.metrics.resolved"), value: String(resolved), helper: ta("v2.metrics.vs30Days", { val: `${resolved}` }), helperTone: "green", icon: CircleCheck, tone: "green", spark },
    { label: ta("v2.metrics.avgResponseTime"), value: total > 0 ? `${Math.round(last7 / Math.max(1, 7))}m` : "-", helper: ta("v2.metrics.target", { val: "15m" }), helperTone: "blue", icon: HelpCircle, tone: "blue", spark },
  ];
}

function MetricCard({ metric }: { metric: Metric }) {
  const style = toneStyles[metric.tone];
  const helperStyle = toneStyles[metric.helperTone];

  return (
    <Panel className="relative min-h-[104px] overflow-hidden p-3.5">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border shadow-[0_10px_22px_rgba(70,95,255,0.10)]", style.soft, style.text, style.border)}>
          <metric.icon size={19} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-black text-[#31406B]" title={metric.label}>{metric.label}</p>
          <p className="mt-1 text-[24px] font-black leading-none tracking-[-0.045em] text-[#070B28]">{metric.value}</p>
          <p className={cn("mt-1.5 truncate text-[9px] font-black", helperStyle.text)} title={metric.helper}>{metric.helper}</p>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-0">
        <Sparkline values={metric.spark} tone={metric.tone} id={`metric-${metric.label.replace(/\W/g, "")}`} className="h-7" />
      </div>
    </Panel>
  );
}

function SourceIconList({ label, sources, extraSources }: { label: string; sources: SourceKey[]; extraSources: number }) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-black text-[#68739F]">{label}</p>
      <div className="flex items-center gap-1.5">
        {sources.map((source) => (
          <span key={source} className="flex size-[22px] items-center justify-center rounded-[6px] border border-[#E6EAF2] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            {sourceIcons[source]}
          </span>
        ))}
        {extraSources > 0 ? <span className="rounded-full bg-[#F1F4FB] px-1.5 py-0.5 text-[9px] font-black text-[#68739F]">+{extraSources}</span> : null}
      </div>
    </div>
  );
}

function AlertIcon({ tone }: { tone: AlertRow["tone"] }) {
  const style = toneStyles[tone];
  const Icon = tone === "green" ? Star : tone === "blue" ? HelpCircle : AlertTriangle;

  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.soft, style.text)}>
      <Icon size={16} fill={tone === "green" ? style.color : "none"} strokeWidth={2.3} />
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const styles: Record<Sentiment, string> = {
    NEGATIF: "bg-[#EF4444]/10 text-[#EF4444]",
    POSITIF: "bg-[#10B981]/10 text-[#0C9B69]",
    CAMPURAN: "bg-[#8B5CFF]/10 text-[#8B5CFF]",
  };

  return <span className={cn("rounded-[7px] px-2 py-1 text-[9px] font-black tracking-[0.14em]", styles[sentiment])}>{sentiment}</span>;
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, string> = {
    New: "bg-[#8B5CFF]/10 text-[#465FFF]",
    Investigating: "bg-[#465FFF]/10 text-[#465FFF]",
    Escalated: "bg-[#F97316]/12 text-[#F97316]",
    Resolved: "bg-[#10B981]/10 text-[#0C9B69]",
  };

  return <span className={cn("rounded-[8px] px-2.5 py-1 text-[10px] font-black", styles[status])}>{status}</span>;
}

function ChannelIcon({ children, tone = "blue" }: { children: ReactNode; tone?: Tone }) {
  const style = toneStyles[tone];
  return <span className={cn("flex size-8 items-center justify-center rounded-[8px]", style.soft, style.text)}>{children}</span>;
}

function CriticalIncident({ alert, ta }: { alert: AlertRow; ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  return (
    <Panel className="overflow-hidden border-[#FAD7D7] bg-linear-to-br from-[#FFF4F4] via-white to-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444] ring-4 ring-[#EF4444]/5"><AlertTriangle size={17} fill="#EF4444" /></span>
          <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{ta("v2.incident.title")}</h2>
        </div>
        <Link href={`/alerts/${alert.id}`} className="inline-flex items-center gap-1 text-[11px] font-black text-[#465FFF] hover:underline">
          {ta("v2.incident.viewDetails")} <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[22px] font-black leading-tight tracking-[-0.04em] text-[#070B28]">{alert.title}</h3>
          <p className="mt-2 text-[12px] font-semibold text-[#31406B]">{alert.description}</p>
        </div>
        <span className="rounded-[7px] bg-[#EF4444]/10 px-3 py-1 text-[10px] font-black tracking-[0.12em] text-[#EF4444]">{ta("v2.incident.critical")}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 divide-x divide-[#E9EDF5] sm:grid-cols-5">
        {[
          [ta("v2.incident.mentions"), alert.mentions, alert.velocity],
          [ta("v2.incident.velocity"), alert.impact, alert.velocityPeriod],
          [ta("v2.incident.sentiment"), "-0,68", ta("v2.incident.negative")],
          [ta("v2.incident.impact"), alert.impact, ta("v2.incident.reputationRisk")],
          [ta("v2.incident.confidence"), alert.confidence, ta("v2.incident.veryHigh")],
        ].map(([label, value, helper], index) => (
          <div key={label} className={cn("px-4 first:pl-0", index >= 2 && "mt-4 sm:mt-0")}>
            <p className="text-[10px] font-black text-[#68739F]">{label}</p>
            <p className={cn("mt-2 text-[22px] font-black leading-none tracking-[-0.04em]", index === 4 ? "text-[#10B981]" : "text-[#101334]")}>{value}</p>
            <p className={cn("mt-2 text-[10px] font-black", index === 0 || index === 2 || index === 3 ? "text-[#EF4444]" : index === 4 ? "text-[#0C9B69]" : "text-[#31406B]")}>{helper}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 border-t border-[#F2DCDC] pt-4 sm:grid-cols-3">
        <SourceIconList label={ta("v2.incident.source")} sources={alert.sources} extraSources={alert.extraSources} />
        <div className="sm:-translate-x-5">
          <p className="mb-2 text-[9px] font-black text-[#68739F]">{ta("v2.incident.owner")}</p>
          <button type="button" className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] border border-[#E6EAF2] bg-white px-2 text-[8.5px] font-black leading-none text-[#101334] whitespace-nowrap">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">CA</span>
            {alert.sourceLabel || ta("v2.incident.corporateAffairs")}
            <ChevronDown size={12} className="text-[#68739F]" />
          </button>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-black text-[#68739F]">{ta("v2.incident.status")}</p>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={alert.status} /><span className="text-[9px] font-black text-[#31406B]">{ta("v2.incident.since", { time: alert.time })}</span></div>
        </div>
      </div>
    </Panel>
  );
}

function DeliveryStatus({ ta }: { ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const channels = [
    { icon: <WhatsApp className="size-4" />, title: ta("v2.delivery.whatsapp"), meta: ta("v2.delivery.recipients", { count: 8 }), tone: "green" as Tone },
    { icon: <Mail size={16} />, title: ta("v2.delivery.email"), meta: ta("v2.delivery.recipients", { count: 23 }), tone: "blue" as Tone },
    { icon: <Users size={16} />, title: ta("v2.delivery.msTeams"), meta: ta("v2.delivery.execChannel"), tone: "purple" as Tone },
    { icon: <Slack className="size-4" />, title: ta("v2.delivery.slack"), meta: ta("v2.delivery.corpAffairsChannel"), tone: "amber" as Tone },
  ];

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.delivery.title")} <span className="text-[11px] font-bold text-[#53608C]">{ta("v2.delivery.thisAlert")}</span></h3>
      <div className="mt-4 space-y-4">
        {channels.map((channel) => (
          <div key={channel.title} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3">
            <ChannelIcon tone={channel.tone}>{channel.icon}</ChannelIcon>
            <div className="min-w-0"><p className="text-[12px] font-black text-[#101334]">{channel.title}</p></div>
            <div className="text-right"><p className="text-[10px] font-black text-[#0C9B69]">✓ {ta("v2.delivery.delivered")}</p><p className="text-[9px] font-bold text-[#31406B]">{channel.meta}</p></div>
          </div>
        ))}
      </div>
      <button type="button" className="mt-5 inline-flex items-center gap-1 text-[11px] font-black text-[#465FFF] hover:underline">{ta("v2.delivery.viewAllChannels")} <ArrowRight size={13} /></button>
    </Panel>
  );
}

function StakeholderEngagement({ ta }: { ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const items = [
    { label: ta("v2.stakeholder.recipients"), value: "12", pct: "", icon: Users, tone: "purple" as Tone },
    { label: ta("v2.stakeholder.opened"), value: "10", pct: "83%", icon: Eye, tone: "blue" as Tone },
    { label: ta("v2.stakeholder.acknowledged"), value: "8", pct: "67%", icon: CircleCheck, tone: "green" as Tone },
    { label: ta("v2.stakeholder.actionStarted"), value: "5", pct: "42%", icon: Play, tone: "amber" as Tone },
  ];

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.stakeholder.title")}</h3>
      <div className="mt-4 divide-y divide-[#EDF1F7]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
              <ChannelIcon tone={item.tone}><Icon size={15} /></ChannelIcon>
              <p className="text-[12px] font-black text-[#101334]">{item.label}</p>
              <p className="text-right text-[12px] font-black text-[#101334]">{item.value} <span className="ml-3 text-[10px] font-bold text-[#53608C]">{item.pct}</span></p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function CriticalDeliveryStatus({ alert, ta }: { alert: AlertRow; ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const rows = [
    [ta("v2.stakeholder.recipients"), "12", Users, "purple"],
    [ta("v2.stakeholder.opened"), "10 (83%)", Eye, "blue"],
    [ta("v2.stakeholder.acknowledged"), "8 (67%)", CircleCheck, "green"],
    [ta("v2.criticalStatus.inProgress"), "5 (42%)", Play, "amber"],
    [ta("v2.criticalStatus.resolved"), "2 (17%)", CircleCheck, "green"],
  ] as const;

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.criticalStatus.title")}</h3>
        <button type="button" className="inline-flex items-center gap-1 text-[8.5px] font-black leading-none text-[#465FFF] whitespace-nowrap hover:underline">{ta("v2.criticalStatus.viewAll")} <ArrowRight size={11} /></button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-[#F4D8D8]">
        <div className="flex items-center justify-between gap-3 bg-[#FFF2F2] px-3 py-2">
          <p className="truncate text-[12px] font-black text-[#101334]">{alert.title}</p>
          <span className="rounded-[6px] bg-[#EF4444]/10 px-2 py-0.5 text-[9px] font-black text-[#EF4444]">{ta("v2.incident.critical")}</span>
        </div>
        <div className="divide-y divide-[#F1E5E5]">
          {rows.map(([label, value, Icon, tone]) => (
            <div key={label} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
              <ChannelIcon tone={tone as Tone}><Icon size={13} /></ChannelIcon>
              <span className="text-[10px] font-bold text-[#53608C]">{label}</span>
              <span className="text-[10px] font-black text-[#101334]">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-black text-[#31406B]"><span>{ta("v2.criticalStatus.firstSent", { time: "10:23 WIB" })}</span><span>{ta("v2.criticalStatus.lastUpdate", { time: "10:35 WIB" })}</span></div>
    </Panel>
  );
}

function EscalationMatrix({ ta }: { ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const levels = [
    [ta("v2.escalationMatrix.l1"), ta("v2.escalationMatrix.teamLead"), ta("v2.escalationMatrix.sla", { time: "5m" }), true],
    [ta("v2.escalationMatrix.l2"), ta("v2.escalationMatrix.deptHead"), ta("v2.escalationMatrix.sla", { time: "15m" }), true],
    [ta("v2.escalationMatrix.l3"), ta("v2.escalationMatrix.execTeam"), ta("v2.escalationMatrix.sla", { time: "30m" }), false],
  ] as const;

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.escalationMatrix.title")}</h3>
      <div className="mt-4 space-y-2">
        {levels.map(([level, title, sla, done], index) => (
          <div key={level}>
            <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] bg-[#F8FAFF] px-3 py-2">
              <span className="rounded-[6px] bg-[#EEEAFE] px-2 py-1 text-center text-[10px] font-black text-[#6B4DE6]">{level}</span>
              <p className="text-[11px] font-black text-[#101334]">{title}</p>
              <p className="flex items-center gap-2 text-[10px] font-bold text-[#31406B]">{sla} {done ? <CircleCheck size={14} className="text-[#10B981]" /> : <span className="size-3.5 rounded-full border-2 border-[#465FFF] border-r-transparent" />}</p>
            </div>
            {index < levels.length - 1 ? <ArrowDown size={14} className="mx-14 my-1 text-[#465FFF]" /> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AlertJourney({ alert, ta }: { alert: AlertRow; ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const steps = [
    ["10:23:15", ta("v2.journey.step1Title"), ta("v2.journey.step1Desc"), AlertTriangle, "red"],
    ["10:23:21", ta("v2.journey.step2Title"), ta("v2.journey.step2Desc", { count: 8 }), WhatsApp, "green"],
    ["10:23:22", ta("v2.journey.step3Title"), ta("v2.journey.step3Desc", { count: 23 }), Mail, "blue"],
    ["10:23:24", ta("v2.journey.step4Title"), ta("v2.journey.step4Desc"), Users, "purple"],
    ["10:24:10", ta("v2.journey.step5Title"), ta("v2.journey.step5Desc", { count: 10 }), Eye, "green"],
    ["10:25:05", ta("v2.journey.step6Title"), ta("v2.journey.step6Desc"), CircleCheck, "green"],
    ["10:31:42", ta("v2.journey.step7Title"), ta("v2.journey.step7Desc"), UserRound, "purple"],
  ] as const;

  return (
    <Panel className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.journey.title")} <span className="text-[10px] font-bold text-[#53608C]">({alert.title})</span></h3>
        <button type="button" className="inline-flex items-center gap-1 text-[8.5px] font-black leading-none text-[#465FFF] whitespace-nowrap hover:underline">{ta("v2.journey.viewFull")} <ArrowRight size={11} /></button>
      </div>
      <div className="relative space-y-4 pl-1 before:absolute before:left-[70px] before:top-2 before:h-[calc(100%-16px)] before:border-l before:border-[#DDE5F4]">
        {steps.map(([time, title, desc, Icon, tone]) => (
          <div key={`${time}-${title}`} className="relative grid grid-cols-[56px_32px_minmax(0,1fr)] items-start gap-3">
            <p className="pt-2 text-[9px] font-black text-[#31406B]">{time}</p>
            <ChannelIcon tone={tone as Tone}><Icon className="size-4" /></ChannelIcon>
            <div>
              <p className="text-[11px] font-black text-[#101334]">{title}</p>
              <p className="mt-0.5 text-[10px] font-bold leading-snug text-[#53608C]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function EscalationFlow({ ta }: { ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const steps = [
    [Bell, ta("v2.flow.step1Title"), ta("v2.flow.step1Desc"), "purple"],
    [AlertTriangle, ta("v2.flow.step2Title"), ta("v2.flow.step2Desc"), "blue"],
    [Mail, ta("v2.flow.step3Title"), ta("v2.flow.step3Desc"), "green"],
    [Shield, ta("v2.flow.step4Title"), ta("v2.flow.step4Desc"), "purple"],
    [Play, ta("v2.flow.step5Title"), ta("v2.flow.step5Desc"), "blue"],
    [CircleCheck, ta("v2.flow.step6Title"), ta("v2.flow.step6Desc"), "purple"],
  ] as const;

  return (
    <Panel className="p-4">
      <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.flow.title")} <span className="text-[11px] font-bold text-[#53608C]">{ta("v2.flow.desc")}</span></h3>
      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1.25fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)]">
        {steps.map(([Icon, title, desc, tone], index) => (
          <div key={title} className="contents">
            <div className={cn("flex min-h-[70px] items-center gap-3 rounded-[10px] border border-[#E6EAF2] bg-[#FBFCFF] p-3", index === 2 && "bg-[#F2EEFF]")}> 
              <ChannelIcon tone={tone as Tone}><Icon size={17} /></ChannelIcon>
              <div><p className="text-[11px] font-black text-[#465FFF]">{title}</p><p className="mt-1 text-[9px] font-bold text-[#53608C]">{desc}</p></div>
            </div>
            {index < steps.length - 1 ? <div className="hidden items-center justify-center text-[#465FFF] xl:flex"><ChevronRight size={18} /></div> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NotificationIcons({ channels }: { channels: AlertRow["notificationChannels"] }) {
  const shown = channels.slice(0, 3);
  const extra = channels.length - shown.length;
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((channel) => {
        if (channel === "whatsapp") return <WhatsApp key={channel} className="size-3.5" />;
        if (channel === "email") return <Mail key={channel} size={14} className="text-[#465FFF]" />;
        if (channel === "teams") return <MicrosoftTeams key={channel} className="size-3.5" />;
        return <Slack key={channel} className="size-3.5" />;
      })}
      {extra > 0 ? <span className="rounded-full bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] font-black text-[#53608C]">+{extra}</span> : null}
    </div>
  );
}

function MockPagination({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} className="flex size-9 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#8B95B8] transition hover:text-[#465FFF]" aria-label="Previous page">
        <ChevronDown size={14} className="rotate-90" />
      </button>
      {[1, 2, 3, 4, 5].map((item) => (
        <button key={item} type="button" onClick={() => onPageChange(item)} className={cn("flex size-9 items-center justify-center rounded-[8px] border text-[12px] font-black transition", page === item ? "border-[#465FFF] bg-white text-[#465FFF] shadow-[0_8px_18px_rgba(70,95,255,0.12)]" : "border-[#E6EAF2] bg-white text-[#31406B] hover:border-[#C9D4F6]")}>{item}</button>
      ))}
      <button type="button" onClick={() => onPageChange(Math.min(5, page + 1))} className="flex size-9 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#31406B] transition hover:text-[#465FFF]" aria-label="Next page">
        <ChevronDown size={14} className="-rotate-90" />
      </button>
    </div>
  );
}

function AlertsTable({ ta, rows, page, footerText, onPageChange, onStatusChange, openMenuId, setOpenMenuId, menuRef }: { ta: ReturnType<typeof useTranslations<"Alerts">>; rows: AlertRow[]; page: number; footerText: string; onPageChange: (page: number) => void; onStatusChange: (id: string | number, status: "open" | "acknowledged" | "resolved") => void; openMenuId: string | number | null; setOpenMenuId: (id: string | number | null) => void; menuRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#101334]">{ta("table.title")}</h2>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">{ta("table.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#68739F]" />
            <input type="search" placeholder={ta("filter.search")} className="h-10 w-full min-w-[220px] rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-10 text-[13px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white" />
          </label>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-4 text-[11px] font-black text-[#31406B]">{ta("v2.list.allSeverity")} <ChevronDown size={13} /></button>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-4 text-[11px] font-black text-[#31406B]">{ta("filter.allStatus")} <ChevronDown size={13} /></button>
          <button type="button" aria-label="Filter alerts" className="flex size-10 items-center justify-center rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] text-[#31406B]"><SlidersHorizontal size={16} /></button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[9px] font-black uppercase tracking-[0.18em] text-[#68739F]">
              {[ta("table.alert"), "Severity", "Owner", ta("table.source"), ta("table.sentiment"), ta("table.velocity"), ta("table.mentions"), ta("table.confidence"), "Notification", "Ack.", ta("table.status"), ta("table.time"), ""].map((header) => (
                <th key={header || "actions"} className="px-3 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7]">
            {rows.map((alert) => (
              <tr key={alert.id} className="transition hover:bg-[#F8FAFF]">
                <td className="min-w-[250px] max-w-[310px] px-3 py-3">
                  <div className="flex items-start gap-3">
                    <AlertIcon tone={alert.tone} />
                    <div className="min-w-0">
                      <Link href={`/alerts/${alert.id}`} className="text-[12px] font-black leading-snug text-[#101334] hover:text-[#465FFF]">{alert.title}</Link>
                      <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-snug text-[#68739F]">{alert.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle"><span className={cn("rounded-[6px] px-2 py-1 text-[9px] font-black", alert.tone === "red" ? "bg-[#EF4444]/10 text-[#EF4444]" : alert.tone === "amber" ? "bg-[#F59E0B]/12 text-[#D97706]" : "bg-[#10B981]/10 text-[#0C9B69]")}>{alert.tags[0]}</span></td>
                <td className="px-3 py-3 align-middle"><div className="flex items-center gap-1.5"><span className="flex size-6 items-center justify-center rounded-full bg-[#465FFF]/10 text-[9px] font-black text-[#465FFF]">{alert.sourceLabel.slice(0, 2).toUpperCase()}</span><span className="text-[10px] font-black text-[#31406B]">{alert.sourceLabel}</span></div></td>
                <td className="px-3 py-3 align-middle"><SourceIconList label="" sources={alert.sources} extraSources={alert.extraSources} /></td>
                <td className="px-3 py-3 align-middle"><SentimentBadge sentiment={alert.sentiment} /></td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex items-center gap-2">
                    <span><span className={cn("block text-[11px] font-black", alert.sentiment === "POSITIF" ? "text-[#10B981]" : "text-[#EF4444]")}>{alert.velocity}</span><span className="mt-1 block whitespace-nowrap text-[9px] font-bold text-[#68739F]">{alert.velocityPeriod}</span></span>
                    <Sparkline values={alert.velocityTrend} tone={alert.tone} id={`row-${alert.id}`} className="h-7 w-[56px]" />
                  </div>
                </td>
                <td className="px-3 py-3 align-middle text-[12px] font-black text-[#101334]">{alert.mentions}</td>
                <td className="px-3 py-3 align-middle text-[12px] font-black text-[#0C9B69]">{alert.confidence}</td>
                <td className="px-3 py-3 align-middle"><NotificationIcons channels={alert.notificationChannels} /></td>
                <td className="px-3 py-3 align-middle text-[11px] font-black text-[#101334]">{alert.ack}</td>
                <td className="px-3 py-3 align-middle"><StatusBadge status={alert.status} /></td>
                <td className="px-3 py-3 align-middle text-[10px] font-black text-[#31406B]">{alert.time}</td>
                <td className="relative px-3 py-3 text-right align-middle">
                  <button type="button" aria-label={`Open actions for ${alert.title}`} onClick={() => setOpenMenuId(openMenuId === alert.id ? null : alert.id)} className="rounded-md p-1 text-[#68739F] transition hover:bg-[#EEF2FF] hover:text-[#465FFF]"><MoreVertical size={16} /></button>
                  {openMenuId === alert.id ? (
                    <div ref={menuRef} className="absolute right-3 top-full z-50 mt-1 w-48 rounded-[10px] border border-[#E6EAF2] bg-white py-1 shadow-[0_12px_36px_rgba(16,24,40,0.12)]">
                      <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#8B95B8]">{ta("table.changeStatus")}</p>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "open"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><Bell size={13} className="text-[#465FFF]" /> {ta("table.statusNew")}</button>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "acknowledged"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><Check size={13} className="text-[#10B981]" /> {ta("table.statusInvestigating")}</button>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "resolved"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]"><ShieldCheck size={13} className="text-[#0C9B69]" /> {ta("table.statusResolved")}</button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row">
        <p className="text-[11px] font-bold text-[#68739F]">{footerText}</p>
        <MockPagination page={page} onPageChange={onPageChange} />
      </div>
    </Panel>
  );
}

export default function AlertsPage() {
  const ta = useTranslations("Alerts");
  const taCreate = useTranslations("Alerts.v2.createForm");
  const toastHook = useToast();
  const [rows, setRows] = useState<AlertRow[]>(mockRows);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["alerts-summary"],
    queryFn: () => getAlertsSummary(),
    staleTime: 60 * 1000,
  });
  const summary = summaryQuery.data ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  function handleStatusChange(id: string | number, status: "open" | "acknowledged" | "resolved") {
    const nextStatus: AlertStatus = status === "resolved" ? "Resolved" : status === "acknowledged" ? "Investigating" : "New";
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)));
    toastHook.success(ta("toast.statusUpdated"));
  }

  const primaryAlert = rows[0] ?? mockRows[0];
  const metrics = buildMetricCards(ta, summary);
  const td = useTranslations("DashboardStates");
  const footerText = td("pagination.summary", { start: 1, end: Math.min(5, rows.length), total: 24, label: "alert" });

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{ta("v2.header.title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#31406B]">{ta("v2.header.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] sm:w-auto"><Settings size={14} />{ta("v2.header.notificationRules")}</button>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] sm:w-auto"><Users size={14} />{ta("v2.header.escalationMatrix")}</button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#4B2BFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] sm:w-auto"><Plus size={15} />{ta("v2.header.createAlert")}</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.7fr)_minmax(250px,0.7fr)]">
          <CriticalIncident alert={primaryAlert} ta={ta} />
          <DeliveryStatus ta={ta} />
          <StakeholderEngagement ta={ta} />
        </div>
        <div className="min-w-0"><CriticalDeliveryStatus alert={primaryAlert} ta={ta} /></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0 space-y-4">
          <EscalationFlow ta={ta} />
          <AlertsTable ta={ta} rows={rows} page={page} footerText={footerText} onPageChange={setPage} onStatusChange={handleStatusChange} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} menuRef={menuRef} />
        </div>
        <aside className="space-y-4">
          <EscalationMatrix ta={ta} />
          <AlertJourney alert={primaryAlert} ta={ta} />
        </aside>
      </section>

      {/* Create Alert Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}>
          <div className="flex w-full max-w-lg flex-col max-h-[85vh] rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{ta("v2.header.createAlert")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">Create a new alert</p>
              </div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const { createAlert: createAlertFn } = require("@/lib/api-service");
                createAlertFn({
                  title: formData.get("title") as string,
                  type: formData.get("type") as "risk" | "opportunity" | "positioning",
                  severity: formData.get("severity") as "low" | "medium" | "high" | "critical",
                  whatHappened: formData.get("whatHappened") as string || undefined,
                  whyItMatters: formData.get("whyItMatters") as string || undefined,
                  whatToDo: formData.get("whatToDo") as string || undefined,
                  assignedTo: formData.get("assignedTo") as string || undefined,
                  assignedTeam: formData.get("assignedTeam") as string || undefined,
                  deadline: formData.get("deadline") as string || undefined,
                }).then(() => {
                  toastHook.success(ta("toast.statusUpdated"));
                  setIsCreateModalOpen(false);
                }).catch(() => {
                  toastHook.error(ta("toast.statusUpdateFailed"));
                });
              }} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("titleLabel")}</label>
                  <input name="title" required placeholder={taCreate("titlePlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("typeLabel")}</label>
                    <select name="type" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="risk">{taCreate("typeRisk")}</option>
                      <option value="opportunity">{taCreate("typeOpportunity")}</option>
                      <option value="positioning">{taCreate("typePositioning")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("severityLabel")}</label>
                    <select name="severity" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white">
                      <option value="low">{taCreate("severityLow")}</option>
                      <option value="medium">{taCreate("severityMedium")}</option>
                      <option value="high">{taCreate("severityHigh")}</option>
                      <option value="critical">{taCreate("severityCritical")}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("whatHappenedLabel")}</label>
                  <textarea name="whatHappened" rows={2} placeholder={taCreate("whatHappenedPlaceholder")} className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none" />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                    {taCreate("cancel")}
                  </button>
                  <button type="submit" className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90">
                    {taCreate("submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
