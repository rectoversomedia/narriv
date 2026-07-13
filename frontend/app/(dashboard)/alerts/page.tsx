"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
  Mail,
  MoreVertical,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AppStore,
  Discourse,
  Facebook,
  GooglePlay,
  Instagram,
  Slack,
  TikTokDark,
  WhatsApp,
  XLight,
} from "@ridemountainpig/svgl-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  createAlert,
  getAlerts,
  getAlertsSummary,
  getEscalationMatrix,
  getIntegrations,
  getNotificationSettings,
  getSources,
  getWorkspaceMembers,
  updateAlertStatus,
  updateEscalationMatrix,
  updateNotificationSettings,
  bulkUpdateAlerts,
  bulkAssignAlerts,
  type Alert,
  type EscalationMatrixRecord,
  type IntegrationRecord,
  type NotificationRuleRecord,
  type NotificationRuleTrigger,
} from "@/lib/api-service";
import { isDemoMode, getMockAlerts } from "@/lib/demo-mock-data";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
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
  escalationLevel: string;
  deadline: string;
  ack: string;
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

type EscalationDraft = {
  level: string;
  roleName: string;
  slaMinutes: string;
  isActive: boolean;
  order: number;
};

type NotificationRuleDraft = {
  id: string;
  trigger: NotificationRuleTrigger;
  condition: string;
  channels: string[];
  enabled: boolean;
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
  const acknowledgedCount = summary?.acknowledged_count ?? inProgress + resolved;
  const escalatedCount = summary?.escalated_count ?? critical;
  const overdueCount = summary?.overdue_count ?? 0;
  const last7 = summary?.last_7_days ?? 0;
  const prev7 = summary?.previous_7_days ?? 0;
  const trendDelta = summary?.trend_delta ?? 0;
  const spark = summary?.timeline?.slice(-12) ?? [];
  const avgResponseMinutes = summary?.avg_response_time_minutes ?? null;
  const deliverySuccessRate = summary?.delivery_success_rate ?? 0;
  const acknowledgmentRate = summary?.acknowledgment_rate ?? (total > 0 ? Math.round((acknowledgedCount / total) * 100) : 0);
  const slaTargetMinutes = summary?.sla_target_minutes ?? null;

  const delta = prev7 > 0 ? `${((last7 - prev7) / prev7 * 100).toFixed(1)}%` : "0%";
  const deltaSign = trendDelta >= 0 ? "+" : "";
  const deltaLabel = trendDelta >= 0 ? ta("v2.metrics.vsPrevious7Days", { val: `${deltaSign}${delta}` }) : ta("v2.metrics.vsPrevious7Days", { val: delta });

  return [
    { label: ta("v2.metrics.totalAlerts"), value: String(total), helper: deltaLabel, helperTone: trendDelta >= 0 ? "green" : "red", icon: Bell, tone: "purple", spark },
    { label: ta("v2.metrics.criticalAlerts"), value: String(critical), helper: ta("v2.metrics.severityBreakdown", { val: `${critical}/${total}` }), helperTone: critical > 0 ? "red" : "green", icon: AlertTriangle, tone: "red", spark: spark.slice().reverse() },
    { label: ta("v2.metrics.warningAlerts"), value: String(high + medium), helper: ta("v2.metrics.severityBreakdown", { val: `${high + medium}/${total}` }), helperTone: high + medium > 0 ? "amber" : "green", icon: AlertTriangle, tone: "amber", spark },
    { label: ta("v2.metrics.infoAlerts"), value: String(info + low), helper: ta("v2.metrics.severityBreakdown", { val: `${info + low}/${total}` }), helperTone: "blue", icon: HelpCircle, tone: "blue", spark },
    { label: ta("v2.metrics.deliveredAlerts"), value: `${deliverySuccessRate}%`, helper: ta("v2.metrics.lifecycleCoverage"), helperTone: deliverySuccessRate >= 80 ? "green" : deliverySuccessRate >= 50 ? "amber" : "red", icon: Shield, tone: "green", spark },
    { label: ta("v2.metrics.acknowledgedAlerts"), value: String(acknowledgedCount), helper: ta("v2.metrics.ackRate", { val: String(acknowledgmentRate) }), helperTone: acknowledgmentRate >= 80 ? "green" : "blue", icon: Users, tone: "purple", spark },
    { label: ta("v2.metrics.escalated"), value: String(escalatedCount), helper: ta("v2.metrics.overdue", { val: String(overdueCount) }), helperTone: overdueCount > 0 ? "red" : "green", icon: AlertTriangle, tone: "red", spark: spark.slice().reverse() },
    { label: ta("v2.metrics.resolved"), value: String(resolved), helper: ta("v2.metrics.of", { val1: String(resolved), val2: String(total) }), helperTone: "green", icon: CircleCheck, tone: "green", spark },
    { label: ta("v2.metrics.avgResponseTime"), value: avgResponseMinutes !== null ? `${avgResponseMinutes}m` : "-", helper: ta("v2.metrics.target", { val: slaTargetMinutes !== null ? `${slaTargetMinutes}m` : "-" }), helperTone: avgResponseMinutes !== null && slaTargetMinutes !== null && avgResponseMinutes > slaTargetMinutes ? "red" : "blue", icon: HelpCircle, tone: "blue", spark },
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

function MetricCardSkeleton() {
  return (
    <Panel className="relative min-h-[104px] overflow-hidden p-3.5">
      <div className="flex items-center gap-3">
        <span className="size-10 shrink-0 animate-pulse rounded-full bg-[#EEF2FF]" />
        <div className="min-w-0 flex-1">
          <p className="h-3 w-24 animate-pulse rounded bg-[#EEF2FF]" />
          <p className="mt-2 h-7 w-14 animate-pulse rounded bg-[#E6EAF8]" />
          <p className="mt-2 h-3 w-28 animate-pulse rounded bg-[#EEF2FF]" />
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 h-5 animate-pulse rounded bg-[#F1F4FB]" />
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

function StatusBadge({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, string> = {
    New: "bg-[#8B5CFF]/10 text-[#465FFF]",
    Investigating: "bg-[#465FFF]/10 text-[#465FFF]",
    Escalated: "bg-[#F97316]/12 text-[#F97316]",
    Resolved: "bg-[#10B981]/10 text-[#0C9B69]",
  };

  return <span className={cn("rounded-[8px] px-2.5 py-1 text-[10px] font-black", styles[status])}>{status}</span>;
}

function sourceNameToIconKey(source: string): SourceKey {
  const normalized = source.toLowerCase();
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("tiktok")) return "tiktok";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("app store") || normalized.includes("appstore")) return "appstore";
  if (normalized.includes("google play") || normalized.includes("googleplay")) return "googleplay";
  if (normalized.includes("support")) return "support";
  if (normalized.includes("discourse") || normalized.includes("forum")) return "discourse";
  return "x";
}

function defaultEscalationRecords(ta: ReturnType<typeof useTranslations<"Alerts">>): EscalationMatrixRecord[] {
  const now = new Date(0).toISOString();
  return [
    { id: "default-l1", workspaceId: "default", level: "L1", roleName: ta("v2.escalationMatrix.teamLead"), slaMinutes: 5, isActive: true, order: 0, createdAt: now, updatedAt: now },
    { id: "default-l2", workspaceId: "default", level: "L2", roleName: ta("v2.escalationMatrix.deptHead"), slaMinutes: 15, isActive: true, order: 1, createdAt: now, updatedAt: now },
    { id: "default-l3", workspaceId: "default", level: "L3", roleName: ta("v2.escalationMatrix.execTeam"), slaMinutes: 30, isActive: false, order: 2, createdAt: now, updatedAt: now },
  ];
}

function getDisplayEscalationRecords(records: EscalationMatrixRecord[] | null | undefined, ta: ReturnType<typeof useTranslations<"Alerts">>) {
  const source = records?.length ? records : defaultEscalationRecords(ta);
  return [...source].sort((a, b) => a.order - b.order || a.level.localeCompare(b.level));
}

function formatSlaMinutes(minutes: number, ta: ReturnType<typeof useTranslations<"Alerts">>) {
  if (minutes >= 60 && minutes % 60 === 0) {
    return ta("v2.escalationMatrix.hoursShort", { count: minutes / 60 });
  }
  return ta("v2.escalationMatrix.minutesShort", { count: minutes });
}

function matrixRecordsToDraft(records: EscalationMatrixRecord[] | null | undefined, ta: ReturnType<typeof useTranslations<"Alerts">>): EscalationDraft[] {
  return getDisplayEscalationRecords(records, ta).slice(0, 5).map((record, index) => ({
    level: record.level,
    roleName: record.roleName,
    slaMinutes: String(record.slaMinutes),
    isActive: record.isActive,
    order: index,
  }));
}

function createNotificationRuleDraft(trigger: NotificationRuleTrigger = "severity"): NotificationRuleDraft {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `rule-${Date.now()}`;
  return {
    id,
    trigger,
    condition: trigger === "severity" ? "critical" : trigger === "sla" ? "15 min" : "",
    channels: ["standard"],
    enabled: true,
  };
}

function notificationRulesToDraft(rules: NotificationRuleRecord[] | undefined | null): NotificationRuleDraft[] {
  return (rules?.length ? rules : [createNotificationRuleDraft("severity")]).slice(0, 20).map((rule) => ({
    id: rule.id,
    trigger: rule.trigger,
    condition: rule.condition,
    channels: rule.channels.length > 0 ? rule.channels : ["standard"],
    enabled: rule.enabled,
  }));
}

function getNotificationPreset(preset: "critical" | "all" | "quiet"): NotificationRuleDraft[] {
  if (preset === "quiet") {
    return [
      { ...createNotificationRuleDraft("severity"), condition: "critical", channels: ["standard"], enabled: false },
    ];
  }
  if (preset === "all") {
    return [
      { ...createNotificationRuleDraft("severity"), condition: "medium", channels: ["all"], enabled: true },
      { ...createNotificationRuleDraft("sla"), condition: "30 min", channels: ["standard"], enabled: true },
    ];
  }
  return [
    { ...createNotificationRuleDraft("severity"), condition: "critical", channels: ["instant"], enabled: true },
    { ...createNotificationRuleDraft("sla"), condition: "15 min", channels: ["standard"], enabled: true },
  ];
}

function getRuleConditionOptions(trigger: NotificationRuleTrigger, ta: ReturnType<typeof useTranslations<"Alerts">>) {
  if (trigger === "severity") {
    return ["low", "medium", "high", "critical"].map((value) => ({ value, label: ta(`v2.notificationRulesModal.severityValues.${value}`) }));
  }
  if (trigger === "sla") {
    return ["1 min", "5 min", "15 min", "30 min", "1 hour"].map((value) => ({ value, label: ta(`v2.notificationRulesModal.slaValues.${value}`) }));
  }
  if (trigger === "sentiment") {
    return ["10%", "20%", "30%", "50%"].map((value) => ({ value, label: value }));
  }
  return ["brand", "complaint", "legal", "outage", "payment"].map((value) => ({ value, label: value }));
}

function channelLabel(channel: string, ta: ReturnType<typeof useTranslations<"Alerts">>) {
  if (channel === "instant" || channel === "standard" || channel === "all" || channel === "none") {
    return ta(`v2.notificationRulesModal.channels.${channel}`);
  }
  return channel;
}

function mapAlertRecordToRow(alert: Alert, ta: ReturnType<typeof useTranslations<"Alerts">>, optimisticStatuses: Record<string | number, AlertStatus>): AlertRow {
  const normalizedStatus = String(alert.status || "").toLowerCase();
  const mappedStatus = normalizedStatus === "open"
    ? "New"
    : normalizedStatus === "acknowledged" || normalizedStatus === "in_progress" || normalizedStatus === "in-progress"
      ? "Investigating"
      : normalizedStatus === "resolved"
        ? "Resolved"
        : "Escalated";
  const alertSources = alert.sources?.filter(Boolean) ?? [];
  const shownSources = alertSources.slice(0, 3).map(sourceNameToIconKey);
  const createdAt = new Date(alert.createdAt);
  const deadline = alert.deadline ? new Date(alert.deadline) : null;

  return {
    id: alert.id,
    title: alert.title,
    description: alert.whatHappened || alert.whyItMatters || alert.whatToDo || "-",
    tags: [alert.severity || "info"],
    sourceLabel: alert.assignedTeam || alert.assignedTo || alert.type || ta("table.unassigned"),
    sources: shownSources.length > 0 ? shownSources : ["x"],
    extraSources: Math.max(0, alertSources.length - shownSources.length),
    escalationLevel: alert.escalationLevel || "-",
    deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-",
    ack: normalizedStatus === "open" ? ta("table.notAcknowledged") : ta("table.acknowledged"),
    impact: alert.severity === "critical" || alert.severity === "high" ? "High" : "Medium",
    status: optimisticStatuses[alert.id] ?? mappedStatus,
    time: Number.isNaN(createdAt.getTime()) ? "-" : createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    tone: alert.severity === "critical" ? "red" : alert.severity === "high" ? "amber" : "green",
  };
}

function ChannelIcon({ children, tone = "blue" }: { children: ReactNode; tone?: Tone }) {
  const style = toneStyles[tone];
  return <span className={cn("flex size-8 items-center justify-center rounded-[8px]", style.soft, style.text)}>{children}</span>;
}

function CriticalIncident({
  alert,
  totalCritical,
  isLoading,
  ta,
}: {
  alert: AlertRow | null;
  totalCritical: number;
  isLoading: boolean;
  ta: ReturnType<typeof useTranslations<"Alerts">>;
}) {
  const stats: Array<[string, string, string, Tone]> = alert
    ? [
      [ta("v2.incident.severity"), alert.tags[0] ?? "-", ta("v2.incident.liveSignal"), "red" as Tone],
      [ta("v2.incident.owner"), alert.sourceLabel || ta("table.unassigned"), ta("v2.incident.currentOwner"), "blue" as Tone],
      [ta("v2.incident.escalation"), alert.escalationLevel, ta("v2.incident.currentLevel"), "amber" as Tone],
      [ta("v2.incident.deadline"), alert.deadline, ta("v2.incident.responseWindow"), "red" as Tone],
      [ta("v2.incident.ack"), alert.ack, ta("v2.incident.lifecycleState"), "green" as Tone],
    ]
    : [];

  return (
    <Panel className="overflow-hidden border-[#FAD7D7] bg-linear-to-br from-[#FFF4F4] via-white to-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444] ring-4 ring-[#EF4444]/5"><AlertTriangle size={17} fill="#EF4444" /></span>
          <div>
            <h2 className="text-[17px] font-black tracking-[-0.03em] text-[#101334]">{ta("v2.incident.title")}</h2>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#EF4444]">{ta("v2.incident.totalCritical", { count: totalCritical })}</p>
          </div>
        </div>
        {alert ? (
          <Link href={`/alerts/${alert.id}`} className="inline-flex items-center gap-1 rounded-full border border-[#F4D8D8] bg-white px-3 py-1.5 text-[11px] font-black text-[#465FFF] shadow-sm transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF]">
            {ta("v2.incident.viewDetails")} <ArrowRight size={13} />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#F4D8D8] bg-white/70 px-3 py-1.5 text-[11px] font-black text-[#A8B0C7]">
            {ta("v2.incident.viewDetails")} <ArrowRight size={13} />
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="mt-5 space-y-4">
          <div className="h-7 w-2/3 animate-pulse rounded bg-[#F8DADA]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#FCEAEA]" />
          <div className="grid gap-2 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-[12px] bg-white/80" />)}
          </div>
        </div>
      ) : alert ? (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[22px] font-black leading-tight tracking-[-0.04em] text-[#070B28]">{alert.title}</h3>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-[#31406B]">{alert.description}</p>
            </div>
            <span className="rounded-[7px] bg-[#EF4444]/10 px-3 py-1 text-[10px] font-black tracking-[0.12em] text-[#EF4444]">{ta("v2.incident.critical")}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {stats.map(([label, value, helper, tone]) => (
              <div key={label} className="rounded-[12px] border border-[#F4D8D8] bg-white/75 p-3 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">{label}</p>
                <p className={cn("mt-2 truncate text-[15px] font-black leading-none tracking-[-0.02em]", toneStyles[tone].text)} title={value}>{value}</p>
                <p className="mt-2 truncate text-[9px] font-bold text-[#68739F]" title={helper}>{helper}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 border-t border-[#F2DCDC] pt-4 sm:grid-cols-3">
            <SourceIconList label={ta("v2.incident.source")} sources={alert.sources} extraSources={alert.extraSources} />
            <div>
              <p className="mb-2 text-[9px] font-black text-[#68739F]">{ta("v2.incident.owner")}</p>
              <div className="inline-flex min-h-[30px] max-w-full items-center gap-1.5 rounded-[7px] border border-[#E6EAF2] bg-white px-2 text-[9px] font-black leading-none text-[#101334]">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">O</span>
                <span className="truncate">{alert.sourceLabel || ta("table.unassigned")}</span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[9px] font-black text-[#68739F]">{ta("v2.incident.status")}</p>
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={alert.status} /><span className="text-[9px] font-black text-[#31406B]">{ta("v2.incident.since", { time: alert.time })}</span></div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-[14px] border border-dashed border-[#F4D8D8] bg-white/70 p-6">
          <p className="text-[15px] font-black text-[#101334]">{ta("v2.incident.noCriticalTitle")}</p>
          <p className="mt-2 max-w-xl text-[12px] font-semibold leading-5 text-[#68739F]">{ta("v2.incident.noCriticalDesc")}</p>
        </div>
      )}
    </Panel>
  );
}

function getIntegrationVisual(integration: IntegrationRecord): { icon: ReactNode; tone: Tone } {
  const value = `${integration.platform} ${integration.name}`.toLowerCase();
  if (value.includes("whatsapp")) return { icon: <WhatsApp className="size-4" />, tone: "green" };
  if (value.includes("slack")) return { icon: <Slack className="size-4" />, tone: "amber" };
  if (value.includes("team")) return { icon: <Users size={16} />, tone: "purple" };
  if (value.includes("email") || value.includes("mail")) return { icon: <Mail size={16} />, tone: "blue" };
  return { icon: <Shield size={16} />, tone: "slate" };
}

function DeliveryStatus({ ta, integrations, isLoading }: { ta: ReturnType<typeof useTranslations<"Alerts">>; integrations: IntegrationRecord[]; isLoading: boolean }) {
  const activeChannels = integrations.filter((item) => item.status === "active");
  const shownChannels = activeChannels.slice(0, 4).map((integration) => ({
    ...integration,
    visual: getIntegrationVisual(integration),
  }));
  const extraCount = Math.max(0, activeChannels.length - shownChannels.length);

  return (
    <Panel className="flex min-h-[252px] flex-col p-4">
      <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.delivery.title")} <span className="text-[11px] font-bold text-[#53608C]">{ta("v2.delivery.thisAlert")}</span></h3>
      <div className="mt-4 flex-1 space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => <div key={index} className="h-8 animate-pulse rounded-[8px] bg-[#F1F4FB]" />)
        ) : shownChannels.length > 0 ? (
          shownChannels.map((channel) => (
            <div key={channel.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3">
              <ChannelIcon tone={channel.visual.tone}>{channel.visual.icon}</ChannelIcon>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-black text-[#101334]">{channel.name}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8A94B8]">{channel.platform}</p>
              </div>
              <div className="text-right"><p className="text-[10px] font-black text-[#0C9B69]">✓ {ta("v2.delivery.active")}</p><p className="text-[9px] font-bold text-[#31406B]">{channel.lastSyncAt ? new Date(channel.lastSyncAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : ta("v2.delivery.ready")}</p></div>
            </div>
          ))
        ) : (
          <div className="rounded-[10px] border border-dashed border-[#DDE3EF] bg-[#FBFCFF] p-4">
            <p className="text-[12px] font-black text-[#101334]">{ta("v2.delivery.noChannels")}</p>
            <p className="mt-1 text-[10px] font-bold text-[#8A94B8]">{ta("v2.delivery.noChannelsDesc")}</p>
          </div>
        )}
        {extraCount > 0 ? <p className="text-[10px] font-black text-[#53608C]">+{extraCount} {ta("v2.delivery.moreChannels")}</p> : null}
      </div>
      <Link href="/workspace/integrations" className="mt-5 inline-flex items-center gap-1 self-start text-[11px] font-black text-[#465FFF] hover:underline">{ta("v2.delivery.viewAllChannels")} <ArrowRight size={13} /></Link>
    </Panel>
  );
}

function StakeholderEngagement({ ta, summary, memberCount, isLoading }: { ta: ReturnType<typeof useTranslations<"Alerts">>; summary: Awaited<ReturnType<typeof getAlertsSummary>> | null; memberCount: number | null; isLoading: boolean }) {
  const total = summary?.total ?? 0;
  const pct = (value: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "-");
  const acknowledged = summary?.acknowledged_count ?? 0;
  const resolved = summary?.resolved_count ?? 0;
  const escalated = summary?.escalated_count ?? 0;
  const items = [
    { label: ta("v2.stakeholder.recipients"), value: memberCount === null ? "-" : String(memberCount), pct: ta("v2.stakeholder.registered"), icon: Users, tone: "purple" as Tone, progress: memberCount === null ? 0 : 100 },
    { label: ta("v2.stakeholder.acknowledged"), value: String(acknowledged), pct: pct(acknowledged), icon: Eye, tone: "blue" as Tone, progress: total > 0 ? acknowledged / total * 100 : 0 },
    { label: ta("v2.stakeholder.resolved"), value: String(resolved), pct: pct(resolved), icon: CircleCheck, tone: "green" as Tone, progress: total > 0 ? resolved / total * 100 : 0 },
    { label: ta("v2.stakeholder.escalated"), value: String(escalated), pct: pct(escalated), icon: Play, tone: "amber" as Tone, progress: total > 0 ? escalated / total * 100 : 0 },
  ];

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.stakeholder.title")}</h3>
          <p className="mt-1 text-[10px] font-bold text-[#68739F]">{ta("v2.stakeholder.desc")}</p>
        </div>
        {isLoading ? <span className="size-3.5 rounded-full border-2 border-[#465FFF] border-r-transparent" /> : null}
      </div>
      <div className="mt-4 divide-y divide-[#EDF1F7]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
              <ChannelIcon tone={item.tone}><Icon size={15} /></ChannelIcon>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-[#101334]">{item.label}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEF2F7]">
                  <div className="h-full rounded-full bg-[#465FFF]" style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }} />
                </div>
              </div>
              <p className="text-right text-[12px] font-black text-[#101334]">{item.value} <span className="ml-3 text-[10px] font-bold text-[#53608C]">{item.pct}</span></p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function CriticalDeliveryStatus({ alerts, total, ta, onViewAll, isLoading }: { alerts: AlertRow[]; total: number; ta: ReturnType<typeof useTranslations<"Alerts">>; onViewAll: () => void; isLoading: boolean }) {
  const alert = alerts[0] ?? null;
  const acknowledged = alerts.filter((item) => item.ack === ta("table.acknowledged")).length;
  const active = alerts.filter((item) => item.status !== "Resolved").length;
  const resolved = alerts.filter((item) => item.status === "Resolved").length;
  const rows = [
    [ta("v2.criticalStatus.criticalAlerts"), String(total), AlertTriangle, "red"],
    [ta("v2.criticalStatus.inProgress"), String(active), Play, "amber"],
    [ta("v2.criticalStatus.acknowledged"), String(acknowledged), Eye, "blue"],
    [ta("v2.criticalStatus.resolved"), String(resolved), CircleCheck, "green"],
  ] as const;

  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.criticalStatus.title")}</h3>
        <button type="button" onClick={onViewAll} className="inline-flex items-center gap-1 text-[8.5px] font-black leading-none text-[#465FFF] whitespace-nowrap hover:underline">{ta("v2.criticalStatus.viewAll")} <ArrowRight size={11} /></button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-[#F4D8D8]">
        <div className="flex items-center justify-between gap-3 bg-[#FFF2F2] px-3 py-2">
          <p className="truncate text-[12px] font-black text-[#101334]">{isLoading ? ta("v2.criticalStatus.loading") : alert?.title ?? ta("v2.criticalStatus.noCritical")}</p>
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
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-black text-[#31406B]"><span>{ta("v2.criticalStatus.firstSent", { time: alert?.time ?? "-" })}</span><span>{ta("v2.criticalStatus.lastUpdate", { time: alert?.deadline ?? "-" })}</span></div>
    </Panel>
  );
}

function EscalationMatrix({ ta, levels, isLoading }: { ta: ReturnType<typeof useTranslations<"Alerts">>; levels: EscalationMatrixRecord[]; isLoading: boolean }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.escalationMatrix.panelTitle")}</h3>
          <p className="mt-1 text-[10px] font-bold text-[#68739F]">{ta("v2.escalationMatrix.desc")}</p>
        </div>
        {isLoading ? <span className="size-3.5 rounded-full border-2 border-[#465FFF] border-r-transparent" /> : null}
      </div>
      <div className="mt-4 space-y-2">
        {levels.map((item, index) => (
          <div key={`${item.id}-${item.level}`}>
            <div className={cn("grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-3 py-2", item.isActive ? "bg-[#F8FAFF]" : "bg-[#F8FAFF]/55 opacity-70")}>
              <span className={cn("rounded-[6px] px-2 py-1 text-center text-[10px] font-black", item.isActive ? "bg-[#EEEAFE] text-[#6B4DE6]" : "bg-slate-100 text-slate-500")}>{item.level}</span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black text-[#101334]">{item.roleName}</p>
                <p className="mt-0.5 text-[9px] font-bold text-[#68739F]">{item.isActive ? ta("v2.escalationMatrix.activeLabel") : ta("v2.escalationMatrix.standbyLabel")}</p>
              </div>
              <p className="flex items-center gap-2 text-[10px] font-bold text-[#31406B]">
                {ta("v2.escalationMatrix.sla", { time: formatSlaMinutes(item.slaMinutes, ta) })}
                {item.isActive ? <CircleCheck size={14} className="text-[#10B981]" /> : <span className="size-3.5 rounded-full border-2 border-[#C7D0E5]" />}
              </p>
            </div>
            {index < levels.length - 1 ? <ArrowDown size={14} className="mx-14 my-1 text-[#465FFF]" /> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function buildAlertJourneySteps(alert: AlertRow, ta: ReturnType<typeof useTranslations<"Alerts">>) {
  const steps = [
    [alert.time, ta("v2.journey.createdTitle"), ta("v2.journey.createdDesc", { severity: alert.tags[0] }), AlertTriangle, alert.tone],
    [alert.time, ta("v2.journey.ownerTitle"), ta("v2.journey.ownerDesc", { owner: alert.sourceLabel }), Users, "purple"],
    [alert.time, ta("v2.journey.escalationTitle"), ta("v2.journey.escalationDesc", { level: alert.escalationLevel }), Shield, "blue"],
  ] as Array<[string, string, string, LucideIcon, Tone]>;

  if (alert.status !== "New") {
    steps.push([alert.time, ta("v2.journey.ackTitle"), ta("v2.journey.ackDesc"), CircleCheck, "green"]);
  }
  if (alert.status === "Resolved") {
    steps.push([alert.time, ta("v2.journey.resolvedTitle"), ta("v2.journey.resolvedDesc"), ShieldCheck, "green"]);
  }
  if (alert.deadline !== "-") {
    steps.push([alert.deadline, ta("v2.journey.deadlineTitle"), ta("v2.journey.deadlineDesc"), Play, "amber"]);
  }
  return steps;
}

function AlertJourney({ alert, ta, onViewTimeline }: { alert: AlertRow; ta: ReturnType<typeof useTranslations<"Alerts">>; onViewTimeline: () => void }) {
  const steps = buildAlertJourneySteps(alert, ta).slice(0, 4);

  return (
    <Panel className="p-4">
      <div className="mb-4 flex items-start justify-between gap-5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-black text-[#101334]">{ta("v2.journey.title")}</h3>
          <p className="mt-1 truncate text-[10px] font-bold text-[#53608C]">{alert.title}</p>
        </div>
        <button type="button" onClick={onViewTimeline} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DDE3EF] bg-[#F8FAFF] px-3 py-1.5 text-[9px] font-black leading-none text-[#465FFF] transition hover:border-[#C9D4F6] hover:bg-white">{ta("v2.journey.viewFull")} <ArrowRight size={11} /></button>
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

function EscalationFlow({ ta, levels }: { ta: ReturnType<typeof useTranslations<"Alerts">>; levels: EscalationMatrixRecord[] }) {
  const activeLevels = levels.filter((item) => item.isActive);
  const assignmentLabel = activeLevels.length > 0
    ? activeLevels.map((item) => `${item.level}: ${item.roleName}`).join(" -> ")
    : ta("v2.escalationMatrix.noActiveLevels");
  const steps = [
    [Bell, ta("v2.flow.step1Title"), ta("v2.flow.step1Desc"), "purple"],
    [AlertTriangle, ta("v2.flow.step2Title"), ta("v2.flow.step2Desc"), "blue"],
    [Mail, ta("v2.flow.step3Title"), ta("v2.flow.step3Desc"), "green"],
    [Shield, ta("v2.flow.step4Title"), assignmentLabel, "purple"],
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

function AlertPagination({ page, totalPages, onPageChange, ta }: { page: number; totalPages: number; onPageChange: (page: number) => void; ta: ReturnType<typeof useTranslations<"Alerts">> }) {
  const safeTotal = Math.max(1, totalPages);
  const pages = Array.from({ length: safeTotal }, (_, index) => index + 1).filter((item) => {
    if (safeTotal <= 5) return true;
    return item === 1 || item === safeTotal || Math.abs(item - page) <= 1;
  });
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="flex size-9 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#8B95B8] transition hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-40" aria-label={ta("pagination.previous")}>
        <ChevronDown size={14} className="rotate-90" />
      </button>
      {pages.map((item, index) => (
        <div key={item} className="contents">
          {index > 0 && item - pages[index - 1] > 1 ? <span className="px-1 text-[11px] font-black text-[#8B95B8]">...</span> : null}
        <button key={item} type="button" onClick={() => onPageChange(item)} className={cn("flex size-9 items-center justify-center rounded-[8px] border text-[12px] font-black transition", page === item ? "border-[#465FFF] bg-white text-[#465FFF] shadow-[0_8px_18px_rgba(70,95,255,0.12)]" : "border-[#E6EAF2] bg-white text-[#31406B] hover:border-[#C9D4F6]")}>{item}</button>
        </div>
      ))}
      <button type="button" disabled={page >= safeTotal} onClick={() => onPageChange(Math.min(safeTotal, page + 1))} className="flex size-9 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#31406B] transition hover:text-[#465FFF] disabled:cursor-not-allowed disabled:opacity-40" aria-label={ta("pagination.next")}>
        <ChevronDown size={14} className="-rotate-90" />
      </button>
    </div>
  );
}

function AlertsTable({ ta, rows, page, totalPages, footerText, isLoading, isError, onPageChange, onStatusChange, openMenuId, setOpenMenuId, menuRef, searchQuery, onSearchChange, severityFilter, statusFilter, onOpenFilterModal, selectedAlerts, onSelectionChange, onBulkStatusChange, isBulkUpdating }: { ta: ReturnType<typeof useTranslations<"Alerts">>; rows: AlertRow[]; page: number; totalPages: number; footerText: string; isLoading: boolean; isError: boolean; onPageChange: (page: number) => void; onStatusChange: (id: string | number, status: "open" | "acknowledged" | "resolved") => void; openMenuId: string | number | null; setOpenMenuId: (id: string | number | null) => void; menuRef: React.RefObject<HTMLDivElement | null>; searchQuery: string; onSearchChange: (value: string) => void; severityFilter: string; statusFilter: string; onOpenFilterModal: () => void; selectedAlerts: Set<string | number>; onSelectionChange: (ids: Set<string | number>) => void; onBulkStatusChange: (status: "open" | "acknowledged" | "resolved") => void; isBulkUpdating: boolean }) {
  const headers = [ta("table.alert"), ta("table.severity"), ta("table.owner"), ta("table.source"), ta("table.escalation"), ta("table.deadline"), ta("table.ack"), ta("table.status"), ta("table.time"), ""];
  const activeFilterCount = [searchQuery, severityFilter, statusFilter].filter(Boolean).length;

  const allSelected = rows.length > 0 && rows.every(row => selectedAlerts.has(row.id));
  const someSelected = rows.some(row => selectedAlerts.has(row.id));

  const handleSelectAll = () => {
    if (allSelected) {
      const newIds = new Set(selectedAlerts);
      rows.forEach(row => newIds.delete(row.id));
      onSelectionChange(newIds);
    } else {
      const newIds = new Set(selectedAlerts);
      rows.forEach(row => newIds.add(row.id));
      onSelectionChange(newIds);
    }
  };

  const handleSelectRow = (id: string | number) => {
    const newIds = new Set(selectedAlerts);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    onSelectionChange(newIds);
  };

  return (
    <Panel className="p-4">
      {/* Bulk Actions Toolbar */}
      {selectedAlerts.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#465FFF]/20 bg-[#EEF2FF] px-4 py-2.5">
          <span className="text-[12px] font-black text-[#465FFF]">{selectedAlerts.size} selected</span>
          <div className="h-4 w-px bg-[#465FFF]/20" />
          <button
            onClick={() => onBulkStatusChange("open")}
            disabled={isBulkUpdating}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#465FFF] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#3147E8] disabled:opacity-50"
          >
            {isBulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
            Mark as New
          </button>
          <button
            onClick={() => onBulkStatusChange("acknowledged")}
            disabled={isBulkUpdating}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#F59E0B] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#D97706] disabled:opacity-50"
          >
            {isBulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Acknowledge
          </button>
          <button
            onClick={() => onBulkStatusChange("resolved")}
            disabled={isBulkUpdating}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#10B981] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#0C9B69] disabled:opacity-50"
          >
            {isBulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Resolve
          </button>
          <button
            onClick={() => onSelectionChange(new Set())}
            className="ml-auto flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[11px] font-bold text-[#68739F] transition hover:bg-[#465FFF]/10 hover:text-[#465FFF]"
          >
            <X size={12} />
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#101334]">{ta("table.title")}</h2>
          <p className="mt-1 text-[11px] font-bold text-[#68739F]">{ta("table.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#68739F]" />
            <input type="search" value={searchQuery ?? ""} onChange={(e) => onSearchChange(e.target.value)} placeholder={ta("filter.search")} className="h-10 w-full min-w-[220px] rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-10 text-[13px] font-bold text-[#101334] outline-none transition placeholder:text-[#8B95B8] focus:border-[#465FFF] focus:bg-white" />
          </label>
          <button type="button" onClick={onOpenFilterModal} className={cn("inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-[11px] font-black transition", activeFilterCount > 0 ? "border-[#465FFF]/30 bg-[#EEF2FF] text-[#465FFF]" : "border-[#DDE3EF] bg-[#F8FAFF] text-[#31406B] hover:border-[#C9D4F6]")}>
            <SlidersHorizontal size={14} />
            {ta("filter.title")}
            {activeFilterCount > 0 ? <span className="rounded-full bg-[#465FFF] px-1.5 py-0.5 text-[9px] leading-none text-white">{activeFilterCount}</span> : null}
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[9px] font-black uppercase tracking-[0.18em] text-[#68739F]">
              <th className="w-10 px-3 py-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border transition",
                    allSelected ? "border-[#465FFF] bg-[#465FFF] text-white" :
                    someSelected ? "border-[#465FFF] bg-[#465FFF]/20" :
                    "border-[#DDE3EF] bg-white hover:border-[#465FFF]"
                  )}
                >
                  {allSelected || someSelected ? <Check size={12} /> : null}
                </button>
              </th>
              {headers.map((header) => (
                <th key={header || "actions"} className="px-3 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F7]">
            {isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={10} className="px-3 py-3">
                    <div className="h-10 animate-pulse rounded-[8px] bg-[#F1F4FB]" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#FFF2F2]">
                      <AlertTriangle size={24} className="text-[#EF4444]" />
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-[#B42318]">{ta("table.errorTitle")}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#8A94B8]">{ta("table.errorDesc")}</p>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#F5F7FC]">
                      <AlertTriangle size={24} className="text-[#DDE3EF]" />
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-[#68739F]">{ta("empty.noAlerts")}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#8A94B8]">{ta("empty.noAlertsDesc")}</p>
                  </div>
                </td>
              </tr>
            ) : rows.map((alert) => (
              <tr key={alert.id} className={cn("transition hover:bg-[#F8FAFF]", selectedAlerts.has(alert.id) && "bg-[#EEF2FF]")}>
                <td className="px-3 py-3 align-middle">
                  <button
                    type="button"
                    onClick={() => handleSelectRow(alert.id)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition",
                      selectedAlerts.has(alert.id) ? "border-[#465FFF] bg-[#465FFF] text-white" :
                      "border-[#DDE3EF] bg-white hover:border-[#465FFF]"
                    )}
                  >
                    {selectedAlerts.has(alert.id) ? <Check size={12} /> : null}
                  </button>
                </td>
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
                <td className="px-3 py-3 align-middle text-[11px] font-black text-[#31406B]">{alert.escalationLevel}</td>
                <td className="px-3 py-3 align-middle text-[10px] font-black text-[#31406B]">{alert.deadline}</td>
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
        <AlertPagination page={page} totalPages={totalPages} onPageChange={onPageChange} ta={ta} />
      </div>
    </Panel>
  );
}

export default function AlertsPage() {
  const ta = useTranslations("Alerts");
  const taCreate = useTranslations("Alerts.v2.createForm");
  const toastHook = useToast();
  const queryClient = useQueryClient();
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string | number, AlertStatus>>({});
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isNotificationRulesModalOpen, setIsNotificationRulesModalOpen] = useState(false);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [isCriticalStatusModalOpen, setIsCriticalStatusModalOpen] = useState(false);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [isCreateAdvancedOpen, setIsCreateAdvancedOpen] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [isLoadingNotificationRules, setIsLoadingNotificationRules] = useState(false);
  const [isSavingNotificationRules, setIsSavingNotificationRules] = useState(false);
  const [notificationRulesLoadFailed, setNotificationRulesLoadFailed] = useState(false);
  const [isSavingEscalation, setIsSavingEscalation] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string | number>>(new Set());
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [notificationToggles, setNotificationToggles] = useState({
    emailEnabled: true,
    whatsappEnabled: false,
    escalationNotifications: true,
    reminderNotifications: true,
  });
  const [notificationRuleDraft, setNotificationRuleDraft] = useState<NotificationRuleDraft[]>([]);
  const [escalationDraft, setEscalationDraft] = useState<EscalationDraft[]>([]);
  const [createType, setCreateType] = useState("risk");
  const [createSeverity, setCreateSeverity] = useState("low");
  const [createAssignedTo, setCreateAssignedTo] = useState("");
  const [createAssignedTeam, setCreateAssignedTeam] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setIsCreateAdvancedOpen(false);
    setSelectedSources([]);
    setCreateType("risk");
    setCreateSeverity("low");
    setCreateAssignedTo("");
    setCreateAssignedTeam("");
  }

  // Members and escalation data feed live alert panels plus create/edit dropdowns.
  const [demoMode, setDemoMode] = useState(false);
  const [hasCheckedDemoMode, setHasCheckedDemoMode] = useState(false);

  // Check demo mode on mount
  useEffect(() => {
    setDemoMode(isDemoMode());
    setHasCheckedDemoMode(true);
  }, []);

  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: () => getWorkspaceMembers(),
    staleTime: 5 * 60 * 1000,
  });
  const escalationQuery = useQuery({
    queryKey: ["escalation-matrix"],
    queryFn: () => getEscalationMatrix(),
    staleTime: 5 * 60 * 1000,
  });
  const sourcesQuery = useQuery({
    queryKey: ["platform-sources"],
    queryFn: () => getSources({ limit: 100, isActive: true }),
    enabled: isCreateModalOpen,
    staleTime: 5 * 60 * 1000,
  });
  const integrationsQuery = useQuery({
    queryKey: ["workspace-integrations"],
    queryFn: () => getIntegrations(),
    staleTime: 5 * 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ["alerts-summary"],
    queryFn: () => getAlertsSummary(),
    staleTime: 60 * 1000,
    enabled: !demoMode,
  });
  const summary = summaryQuery.data ?? null;

  const alertsQuery = useQuery({
    queryKey: ["alerts", { page, severity: severityFilter, status: statusFilter, search: searchQuery.trim(), demoMode }],
    queryFn: () => demoMode
      ? Promise.resolve({ data: getMockAlerts(), pagination: { page: 1, limit: 10, total: 5, totalPages: 1 } })
      : getAlerts({ page, limit: 10, severity: severityFilter || undefined, status: statusFilter || undefined, search: searchQuery.trim() || undefined }),
    staleTime: 30 * 1000,
    enabled: hasCheckedDemoMode,
  });
  const criticalAlertsQuery = useQuery({
    queryKey: ["alerts", "critical-delivery"],
    queryFn: () => getAlerts({ page: 1, limit: 100, severity: "critical" }),
    staleTime: 30 * 1000,
    enabled: !demoMode,
  });
  const alertsData = alertsQuery.data;
  const escalationLevels = getDisplayEscalationRecords(escalationQuery.data, ta);
  const ownerOptions = (membersQuery.data ?? [])
    .map((member) => {
      const displayName = member.user?.name || member.user?.email || member.userId;
      const roleLabel = member.role ? ` (${member.role})` : "";
      return {
        id: member.id,
        value: `${displayName}${roleLabel}`,
        label: `${displayName}${roleLabel}`,
      };
    })
    .filter((option) => option.value.trim().length > 0);

  function openEscalationModal() {
    setEscalationDraft(matrixRecordsToDraft(escalationQuery.data, ta));
    setIsEscalationModalOpen(true);
  }

  function openNotificationRulesModal() {
    const settings = queryClient.getQueryData<Awaited<ReturnType<typeof getNotificationSettings>>>(["notification-settings"]);
    setNotificationToggles({
      emailEnabled: settings?.emailEnabled ?? true,
      whatsappEnabled: settings?.whatsappEnabled ?? false,
      escalationNotifications: settings?.escalationNotifications ?? true,
      reminderNotifications: settings?.reminderNotifications ?? true,
    });
    setNotificationRuleDraft(notificationRulesToDraft(settings?.customRules));
    setIsNotificationRulesModalOpen(true);
    setNotificationRulesLoadFailed(false);
    setIsLoadingNotificationRules(!settings);
    queryClient.fetchQuery({
      queryKey: ["notification-settings"],
      queryFn: () => getNotificationSettings(),
      staleTime: 5 * 60 * 1000,
    }).then((freshSettings) => {
      if (!freshSettings) {
        setNotificationRulesLoadFailed(true);
        return;
      }
      setNotificationToggles({
        emailEnabled: freshSettings.emailEnabled,
        whatsappEnabled: freshSettings.whatsappEnabled,
        escalationNotifications: freshSettings.escalationNotifications,
        reminderNotifications: freshSettings.reminderNotifications,
      });
      setNotificationRuleDraft(notificationRulesToDraft(freshSettings.customRules));
    }).catch(() => {
      setNotificationRulesLoadFailed(true);
    }).finally(() => {
      setIsLoadingNotificationRules(false);
    });
  }

  function updateNotificationRuleDraft(index: number, patch: Partial<NotificationRuleDraft>) {
    setNotificationRuleDraft((prev) => prev.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      if (patch.trigger && patch.trigger !== item.trigger) {
        next.condition = patch.trigger === "severity" ? "critical" : patch.trigger === "sla" ? "15 min" : "";
      }
      return next;
    }));
  }

  function addNotificationRule() {
    setNotificationRuleDraft((prev) => prev.length >= 20 ? prev : [...prev, createNotificationRuleDraft("severity")]);
  }

  function removeNotificationRule(index: number) {
    setNotificationRuleDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function applyNotificationPreset(preset: "critical" | "all" | "quiet") {
    setNotificationRuleDraft(getNotificationPreset(preset));
    setNotificationToggles({
      emailEnabled: true,
      whatsappEnabled: preset !== "quiet",
      escalationNotifications: preset !== "quiet",
      reminderNotifications: preset === "quiet" || preset === "critical",
    });
  }

  function closeNotificationRulesModal() {
    if (isSavingNotificationRules) return;
    setIsNotificationRulesModalOpen(false);
  }

  function handleSaveNotificationRules() {
    if (isSavingNotificationRules) return;
    const customRules: NotificationRuleRecord[] = notificationRuleDraft.map((rule) => ({
      id: rule.id.trim(),
      trigger: rule.trigger,
      condition: rule.condition.trim(),
      channels: rule.channels.filter((channel) => channel.trim().length > 0),
      enabled: rule.enabled,
    }));
    const hasInvalid = customRules.some((rule) => !rule.id || !rule.condition || rule.channels.length === 0);
    if (customRules.length > 20 || hasInvalid) {
      toastHook.error(ta("v2.notificationRulesModal.validationError"));
      return;
    }

    setIsSavingNotificationRules(true);
    updateNotificationSettings({ ...notificationToggles, customRules })
      .then((updated) => {
        if (updated) {
          toastHook.success(ta("v2.notificationRulesModal.success"));
          queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
          setIsNotificationRulesModalOpen(false);
        } else {
          toastHook.error(ta("v2.notificationRulesModal.error"));
        }
      })
      .catch(() => {
        toastHook.error(ta("v2.notificationRulesModal.error"));
      })
      .finally(() => {
        setIsSavingNotificationRules(false);
      });
  }

  function updateEscalationDraft(index: number, patch: Partial<EscalationDraft>) {
    setEscalationDraft((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addEscalationLevel() {
    setEscalationDraft((prev) => {
      if (prev.length >= 5) return prev;
      const nextIndex = prev.length;
      return [
        ...prev,
        { level: `L${nextIndex + 1}`, roleName: "", slaMinutes: "15", isActive: true, order: nextIndex },
      ];
    });
  }

  function removeEscalationLevel(index: number) {
    setEscalationDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex })));
  }

  function closeEscalationModal() {
    if (isSavingEscalation) return;
    setIsEscalationModalOpen(false);
  }

  function handleSaveEscalationMatrix() {
    if (isSavingEscalation) return;
    const levels = escalationDraft.map((item, index) => ({
      level: item.level.trim(),
      roleName: item.roleName.trim(),
      slaMinutes: Number(item.slaMinutes),
      isActive: item.isActive,
      order: index,
    }));
    const hasInvalid = levels.some((item) => !item.level || !item.roleName || !Number.isInteger(item.slaMinutes) || item.slaMinutes < 1);
    if (levels.length === 0 || levels.length > 5 || hasInvalid) {
      toastHook.error(ta("v2.escalationMatrix.validationError"));
      return;
    }

    setIsSavingEscalation(true);
    updateEscalationMatrix(levels)
      .then((updated) => {
        if (updated) {
          toastHook.success(ta("v2.escalationMatrix.success"));
          queryClient.invalidateQueries({ queryKey: ["escalation-matrix"] });
          setIsEscalationModalOpen(false);
        } else {
          toastHook.error(ta("v2.escalationMatrix.error"));
        }
      })
      .catch(() => {
        toastHook.error(ta("v2.escalationMatrix.error"));
      })
      .finally(() => {
        setIsSavingEscalation(false);
      });
  }

  const rows: AlertRow[] = alertsData?.data
    ? alertsData.data.map((alert) => mapAlertRecordToRow(alert, ta, optimisticStatuses))
    : [];
  const criticalRows = (criticalAlertsQuery.data?.data ?? []).map((alert) => mapAlertRecordToRow(alert, ta, optimisticStatuses));

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
    setOptimisticStatuses((prev) => ({ ...prev, [id]: nextStatus }));

    updateAlertStatus(id.toString(), status)
      .then((updated) => {
        if (updated) {
          toastHook.success(ta("toast.statusUpdated"));
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
          queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
        } else {
          toastHook.error(ta("toast.statusUpdateFailed"));
          setOptimisticStatuses((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      })
      .catch(() => {
        toastHook.error(ta("toast.statusUpdateFailed"));
        setOptimisticStatuses((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      });
  }

  async function handleBulkStatusChange(status: "open" | "acknowledged" | "resolved") {
    if (selectedAlerts.size === 0) return;

    setIsBulkUpdating(true);
    const alertIds = Array.from(selectedAlerts).map(id => id.toString());

    try {
      const result = await bulkUpdateAlerts(alertIds, { status });
      if (result) {
        toastHook.success(ta("bulk.toast.success", { count: result.updated }));
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
        setSelectedAlerts(new Set());
      } else {
        toastHook.error(ta("bulk.toast.failed"));
      }
    } catch {
      toastHook.error(ta("bulk.toast.failed"));
    } finally {
      setIsBulkUpdating(false);
    }
  }

  const primaryAlert = rows[0] ?? {
    id: "empty",
    title: ta("empty.noIncident"),
    description: ta("empty.noIncidentDesc"),
    tags: [ta("table.statusNew")],
    sourceLabel: ta("table.unassigned"),
    sources: ["x"],
    extraSources: 0,
    escalationLevel: "-",
    deadline: "-",
    ack: ta("table.notAcknowledged"),
    impact: "Medium" as const,
    status: "New" as const,
    time: "-",
    tone: "green" as const,
  };
  const highlightedCriticalAlert = criticalRows[0] ?? null;
  const totalCriticalAlerts = criticalAlertsQuery.data?.pagination?.total ?? summary?.by_severity?.critical ?? 0;
  const metrics = buildMetricCards(ta, summary);
  const td = useTranslations("DashboardStates");
  const totalPages = alertsData?.pagination?.totalPages ?? 1;
  const footerText = td("pagination.summary", { start: alertsData?.pagination && alertsData.pagination.total > 0 ? (alertsData.pagination.page - 1) * alertsData.pagination.limit + 1 : 0, end: alertsData?.pagination ? Math.min(alertsData.pagination.page * alertsData.pagination.limit, alertsData.pagination.total) : 0, total: alertsData?.pagination?.total ?? 0, label: ta("table.alertsLabel") });

  const selectedMember = (membersQuery.data ?? []).find(
    (m) => (m.user?.name || m.user?.email || m.userId) === createAssignedTo
  );
  const assignedToHoverTitle = selectedMember
    ? `${selectedMember.user?.name || selectedMember.user?.email || selectedMember.userId}${
        selectedMember.role ? ` (${selectedMember.role})` : ""
      }`
    : taCreate("assignedToPlaceholder");

  const selectedTeam = escalationLevels.find((e) => e.roleName === createAssignedTeam);
  const assignedTeamHoverTitle = selectedTeam
    ? `${selectedTeam.roleName} (${selectedTeam.level})`
    : taCreate("assignedTeamPlaceholder");

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {demoMode && (
        <div className="flex items-center justify-center gap-2 rounded-[10px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-4 py-3">
          <Sparkles size={16} className="text-[#8B5CFF]" />
          <p className="text-[13px] font-bold text-[#8B5CFF]">
            Demo Mode — Showing sample data for demonstration purposes
          </p>
        </div>
      )}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">{ta("v2.header.title")}</h1>
          <p className="mt-2 text-[14px] font-semibold text-[#31406B]">{ta("v2.header.desc")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={openNotificationRulesModal} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF] sm:w-auto"><Settings size={14} />{ta("v2.header.notificationRules")}</button>
          <button type="button" onClick={openEscalationModal} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF] sm:w-auto"><Users size={14} />{ta("v2.header.escalationMatrix")}</button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#4B2BFF] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] sm:w-auto"><Plus size={15} />{ta("v2.header.createAlert")}</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
        {summaryQuery.isLoading ? (
          Array.from({ length: 9 }, (_, index) => <MetricCardSkeleton key={index} />)
        ) : (
          metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)
        )}
      </section>
      {summaryQuery.isError || (!summaryQuery.isLoading && !summaryQuery.data) ? (
        <div className="rounded-[10px] border border-[#FAD7D7] bg-[#FFF6F6] px-4 py-3 text-[12px] font-bold text-[#B42318]">
          {ta("v2.metrics.summaryUnavailable")}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.7fr)_minmax(250px,0.7fr)]">
          <CriticalIncident alert={highlightedCriticalAlert} totalCritical={totalCriticalAlerts} isLoading={criticalAlertsQuery.isLoading} ta={ta} />
          <DeliveryStatus ta={ta} integrations={integrationsQuery.data?.data ?? []} isLoading={integrationsQuery.isLoading} />
          <StakeholderEngagement ta={ta} summary={summary} memberCount={membersQuery.data ? membersQuery.data.length : null} isLoading={summaryQuery.isLoading || membersQuery.isLoading} />
        </div>
        <div className="min-w-0"><CriticalDeliveryStatus alerts={criticalRows} total={totalCriticalAlerts} ta={ta} onViewAll={() => setIsCriticalStatusModalOpen(true)} isLoading={criticalAlertsQuery.isLoading} /></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0 space-y-4">
          <EscalationFlow ta={ta} levels={escalationLevels} />
          <AlertsTable ta={ta} rows={rows} page={page} totalPages={totalPages} footerText={footerText} isLoading={alertsQuery.isLoading} isError={alertsQuery.isError || (!alertsQuery.isLoading && !alertsData)} onPageChange={setPage} onStatusChange={handleStatusChange} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} menuRef={menuRef} searchQuery={searchQuery} onSearchChange={(value) => { setSearchQuery(value); setPage(1); }} severityFilter={severityFilter} statusFilter={statusFilter} onOpenFilterModal={() => setIsFilterModalOpen(true)} selectedAlerts={selectedAlerts} onSelectionChange={setSelectedAlerts} onBulkStatusChange={handleBulkStatusChange} isBulkUpdating={isBulkUpdating} />
        </div>
        <aside className="space-y-4">
          <EscalationMatrix ta={ta} levels={escalationLevels} isLoading={escalationQuery.isLoading} />
          <AlertJourney alert={primaryAlert} ta={ta} onViewTimeline={() => setIsJourneyModalOpen(true)} />
        </aside>
      </section>

      {isCriticalStatusModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#101334]/35 p-4 backdrop-blur-md" onClick={() => setIsCriticalStatusModalOpen(false)}>
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] border border-[#F4D8D8] bg-white text-[#101334] shadow-[0_24px_70px_rgba(16,24,40,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#F4D8D8] bg-[#FFF6F6] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{ta("v2.criticalStatus.modalTitle")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#8A4B4B]">{ta("v2.criticalStatus.modalDesc")}</p>
              </div>
              <button type="button" onClick={() => setIsCriticalStatusModalOpen(false)} className="rounded-full bg-white p-2 text-[#98A2B3] shadow-sm transition hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {criticalAlertsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-[10px] bg-[#F8EDED]" />)}
                </div>
              ) : criticalRows.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[#F4D8D8] bg-[#FFFDFD] p-8 text-center">
                  <p className="text-[13px] font-black text-[#101334]">{ta("v2.criticalStatus.noCritical")}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#8A94B8]">{ta("v2.criticalStatus.noCriticalDesc")}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {criticalRows.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-[12px] border border-[#F4D8D8] bg-[#FFFDFD] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <Link href={`/alerts/${item.id}`} className="text-[12px] font-black text-[#101334] hover:text-[#465FFF]">{item.title}</Link>
                        <p className="mt-1 line-clamp-2 text-[10px] font-bold text-[#68739F]">{item.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <StatusBadge status={item.status} />
                        <span className="rounded-[8px] bg-[#EEF2FF] px-2 py-1 text-[9px] font-black text-[#465FFF]">{item.sourceLabel}</span>
                        <span className="text-[10px] font-black text-[#31406B]">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isJourneyModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#101334]/35 p-4 backdrop-blur-md" onClick={() => setIsJourneyModalOpen(false)}>
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] border border-[#DDE5F4] bg-white text-[#101334] shadow-[0_24px_70px_rgba(16,24,40,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F7] bg-[#F8FAFF] p-5">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-[#101334]">{ta("v2.journey.modalTitle")}</h2>
                <p className="mt-1 truncate text-[11px] font-bold text-[#68739F]">{primaryAlert.title}</p>
              </div>
              <button type="button" onClick={() => setIsJourneyModalOpen(false)} className="rounded-full bg-white p-2 text-[#98A2B3] shadow-sm transition hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="relative space-y-5 pl-1 before:absolute before:left-[78px] before:top-2 before:h-[calc(100%-16px)] before:border-l before:border-[#DDE5F4]">
                {buildAlertJourneySteps(primaryAlert, ta).map(([time, title, desc, Icon, tone]) => (
                  <div key={`${time}-${title}`} className="relative grid grid-cols-[64px_32px_minmax(0,1fr)] items-start gap-3">
                    <p className="pt-2 text-[9px] font-black text-[#31406B]">{time}</p>
                    <ChannelIcon tone={tone}><Icon className="size-4" /></ChannelIcon>
                    <div className="rounded-[10px] border border-[#E6EAF2] bg-[#FBFCFF] p-3">
                      <p className="text-[12px] font-black text-[#101334]">{title}</p>
                      <p className="mt-1 text-[10px] font-bold leading-snug text-[#53608C]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isNotificationRulesModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#101334]/35 p-4 backdrop-blur-md" onClick={closeNotificationRulesModal}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[18px] border border-[#DDE5F4] bg-white text-[#101334] shadow-[0_24px_70px_rgba(16,24,40,0.22)]" onClick={(event) => event.stopPropagation()}>
            <div className="relative overflow-hidden border-b border-[#E7ECF6] bg-linear-to-br from-[#F8FAFF] via-white to-[#EEF2FF] p-5">
              <div className="absolute right-8 top-3 size-28 rounded-full bg-[#465FFF]/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#DDE3EF] bg-white/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
                    <Bell size={12} /> {ta("v2.notificationRulesModal.badge")}
                  </div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-[#101334]">{ta("v2.notificationRulesModal.title")}</h2>
                  <p className="mt-1 text-[11px] font-bold text-[#68739F]">{ta("v2.notificationRulesModal.desc")}</p>
                </div>
                <button type="button" onClick={closeNotificationRulesModal} disabled={isSavingNotificationRules} className="rounded-full bg-white/80 p-2 text-[#98A2B3] shadow-sm transition hover:bg-white hover:text-[#53608C] disabled:cursor-not-allowed disabled:opacity-60">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingNotificationRules ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-[12px] bg-[#F1F4FB]" />)}
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
                  <aside className="space-y-3">
                    <div className="rounded-[14px] border border-[#E6EAF2] bg-[#FBFCFF] p-4">
                      <p className="text-[12px] font-black text-[#101334]">{ta("v2.notificationRulesModal.deliveryTitle")}</p>
                      <p className="mt-1 text-[10px] font-bold leading-snug text-[#8A94B8]">{ta("v2.notificationRulesModal.deliveryDesc")}</p>
                      <div className="mt-4 space-y-2">
                        {([
                          ["emailEnabled", "emailEnabled"],
                          ["whatsappEnabled", "whatsappEnabled"],
                          ["escalationNotifications", "escalationNotifications"],
                          ["reminderNotifications", "reminderNotifications"],
                        ] as const).map(([key, labelKey]) => (
                          <label key={key} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E6EAF2] bg-white px-3 py-2.5">
                            <span>
                              <span className="block text-[11px] font-black text-[#101334]">{ta(`v2.notificationRulesModal.toggles.${labelKey}`)}</span>
                              <span className="mt-0.5 block text-[9px] font-bold text-[#8A94B8]">{ta(`v2.notificationRulesModal.toggleDesc.${labelKey}`)}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={notificationToggles[key]}
                              onChange={(event) => setNotificationToggles((prev) => ({ ...prev, [key]: event.target.checked }))}
                              className="size-4 shrink-0 accent-[#465FFF]"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-[#E6EAF2] bg-white p-4">
                      <p className="text-[12px] font-black text-[#101334]">{ta("v2.notificationRulesModal.presets")}</p>
                      <div className="mt-3 space-y-2">
                        {([
                          ["critical", "presetCritical", "presetCriticalDesc"],
                          ["all", "presetAll", "presetAllDesc"],
                          ["quiet", "presetQuiet", "presetQuietDesc"],
                        ] as const).map(([preset, titleKey, descKey]) => (
                          <button key={preset} type="button" onClick={() => applyNotificationPreset(preset)} className="w-full rounded-[11px] border border-[#DDE3EF] bg-[#FBFCFF] p-3 text-left transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF]">
                            <span className="block text-[11px] font-black text-[#101334]">{ta(`v2.notificationRulesModal.${titleKey}`)}</span>
                            <span className="mt-1 block text-[9px] font-bold leading-snug text-[#8A94B8]">{ta(`v2.notificationRulesModal.${descKey}`)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>

                  <section className="min-w-0 rounded-[14px] border border-[#E6EAF2] bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F7] p-4">
                      <div>
                        <p className="text-[13px] font-black text-[#101334]">{ta("v2.notificationRulesModal.rulesTitle")}</p>
                        <p className="mt-0.5 text-[10px] font-bold text-[#8A94B8]">{ta("v2.notificationRulesModal.rulesDesc")}</p>
                      </div>
                      <button type="button" onClick={addNotificationRule} disabled={notificationRuleDraft.length >= 20} className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#465FFF] transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-50">
                        <Plus size={14} /> {ta("v2.notificationRulesModal.addRule")}
                      </button>
                    </div>

                    {notificationRulesLoadFailed ? (
                      <div className="m-4 rounded-[10px] border border-[#FAD7D7] bg-[#FFF6F6] px-4 py-3 text-[11px] font-bold text-[#B42318]">
                        {ta("v2.notificationRulesModal.loadWarning")}
                      </div>
                    ) : null}

                    <div className="space-y-3 p-4">
                      {notificationRuleDraft.length === 0 ? (
                        <div className="rounded-[12px] border border-dashed border-[#DDE3EF] bg-[#FBFCFF] p-8 text-center">
                          <p className="text-[13px] font-black text-[#101334]">{ta("v2.notificationRulesModal.noRules")}</p>
                          <p className="mt-1 text-[10px] font-bold text-[#8A94B8]">{ta("v2.notificationRulesModal.noRulesDesc")}</p>
                        </div>
                      ) : notificationRuleDraft.map((rule, index) => (
                        <div key={rule.id} className="rounded-[12px] border border-[#E6EAF2] bg-[#FBFCFF] p-3">
                          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_76px_36px] md:items-end">
                            <label className="block">
                              <span className="mb-1.5 block text-[10px] font-black text-[#68739F]">{ta("v2.notificationRulesModal.triggerLabel")}</span>
                              <select
                                value={rule.trigger}
                                onChange={(event) => updateNotificationRuleDraft(index, { trigger: event.target.value as NotificationRuleTrigger })}
                                className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                                title={ta(`v2.notificationRulesModal.triggers.${rule.trigger}`)}
                              >
                                {(["severity", "sentiment", "sla", "keyword"] as NotificationRuleTrigger[]).map((trigger) => {
                                  const text = ta(`v2.notificationRulesModal.triggers.${trigger}`);
                                  return (
                                    <option key={trigger} value={trigger} title={text}>
                                      {text}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-1.5 block text-[10px] font-black text-[#68739F]">{ta("v2.notificationRulesModal.conditionLabel")}</span>
                              <select
                                value={rule.condition}
                                onChange={(event) => updateNotificationRuleDraft(index, { condition: event.target.value })}
                                className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                                title={getRuleConditionOptions(rule.trigger, ta).find((opt) => opt.value === rule.condition)?.label || rule.condition}
                              >
                                {getRuleConditionOptions(rule.trigger, ta).map((option) => (
                                  <option key={option.value} value={option.value} title={option.label}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-1.5 block text-[10px] font-black text-[#68739F]">{ta("v2.notificationRulesModal.actionLabel")}</span>
                              <select
                                value={rule.channels[0] ?? "standard"}
                                onChange={(event) => updateNotificationRuleDraft(index, { channels: [event.target.value] })}
                                className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                                title={channelLabel(rule.channels[0] ?? "standard", ta)}
                              >
                                {["instant", "standard", "all"].map((channel) => {
                                  const text = channelLabel(channel, ta);
                                  return (
                                    <option key={channel} value={channel} title={text}>
                                      {text}
                                    </option>
                                  );
                                })}
                              </select>
                            </label>
                            <label className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B]">
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={(event) => updateNotificationRuleDraft(index, { enabled: event.target.checked })}
                                className="size-3.5 accent-[#465FFF]"
                              />
                              {rule.enabled ? ta("v2.notificationRulesModal.enabled") : ta("v2.notificationRulesModal.disabled")}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeNotificationRule(index)}
                              className="flex h-10 items-center justify-center rounded-[8px] border border-[#F3D4D4] bg-white text-[#EF4444] transition hover:bg-[#FFF5F5]"
                              aria-label={ta("v2.notificationRulesModal.removeRule")}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#EEF1F7] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-bold text-[#8A94B8]">{ta("v2.notificationRulesModal.limitHint")}</p>
              <div className="flex gap-2">
                <button type="button" onClick={closeNotificationRulesModal} disabled={isSavingNotificationRules} className="h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-60">
                  {ta("v2.notificationRulesModal.cancel")}
                </button>
                <button type="button" onClick={handleSaveNotificationRules} disabled={isSavingNotificationRules || isLoadingNotificationRules} className="h-10 rounded-[10px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-5 text-[12px] font-black text-white shadow-[0_12px_22px_rgba(70,95,255,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSavingNotificationRules ? ta("v2.notificationRulesModal.saving") : ta("v2.notificationRulesModal.save")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isEscalationModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={closeEscalationModal}>
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{ta("v2.escalationMatrix.modalTitle")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{ta("v2.escalationMatrix.modalDesc")}</p>
              </div>
              <button type="button" onClick={closeEscalationModal} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]" aria-label={ta("v2.escalationMatrix.cancel")}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-3 grid grid-cols-[78px_minmax(0,1fr)_120px_86px_36px] gap-2 px-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#68739F] max-md:hidden">
                <span>{ta("v2.escalationMatrix.levelLabel")}</span>
                <span>{ta("v2.escalationMatrix.ownerLabel")}</span>
                <span>{ta("v2.escalationMatrix.timeLabel")}</span>
                <span>{ta("v2.escalationMatrix.activeLabel")}</span>
                <span />
              </div>
              <div className="space-y-2.5">
                {escalationDraft.map((item, index) => (
                  <div key={`${item.order}-${index}`} className="grid gap-2 rounded-[10px] border border-[#E6EAF2] bg-[#FBFCFF] p-2.5 md:grid-cols-[78px_minmax(0,1fr)_120px_86px_36px] md:items-center">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black text-[#68739F] md:hidden">{ta("v2.escalationMatrix.levelLabel")}</span>
                      <input
                        value={item.level}
                        maxLength={10}
                        onChange={(event) => updateEscalationDraft(index, { level: event.target.value })}
                        className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-black text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                        placeholder="L1"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black text-[#68739F] md:hidden">{ta("v2.escalationMatrix.ownerLabel")}</span>
                      <select
                        value={item.roleName}
                        onChange={(event) => updateEscalationDraft(index, { roleName: event.target.value })}
                        className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                        title={ownerOptions.find((opt) => opt.value === item.roleName)?.label || item.roleName || (membersQuery.isLoading ? ta("v2.escalationMatrix.loadingOwners") : ta("v2.escalationMatrix.ownerPlaceholder"))}
                      >
                        <option value="" title={membersQuery.isLoading ? ta("v2.escalationMatrix.loadingOwners") : ta("v2.escalationMatrix.ownerPlaceholder")}>
                          {membersQuery.isLoading ? ta("v2.escalationMatrix.loadingOwners") : ta("v2.escalationMatrix.ownerPlaceholder")}
                        </option>
                        {item.roleName && !ownerOptions.some((option) => option.value === item.roleName) ? (
                          <option value={item.roleName} title={item.roleName}>{item.roleName}</option>
                        ) : null}
                        {ownerOptions.map((option) => (
                          <option key={option.id} value={option.value} title={option.label}>{option.label}</option>
                        ))}
                      </select>
                      {!membersQuery.isLoading && ownerOptions.length === 0 ? (
                        <p className="mt-1 text-[9px] font-bold text-[#EF4444]">{ta("v2.escalationMatrix.noOwners")}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black text-[#68739F] md:hidden">{ta("v2.escalationMatrix.timeLabel")}</span>
                      <input
                        value={item.slaMinutes}
                        min={1}
                        type="number"
                        inputMode="numeric"
                        onChange={(event) => updateEscalationDraft(index, { slaMinutes: event.target.value })}
                        className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                        placeholder="15"
                      />
                    </label>
                    <label className="flex h-10 items-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#31406B]">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(event) => updateEscalationDraft(index, { isActive: event.target.checked })}
                        className="size-3.5 accent-[#465FFF]"
                      />
                      {item.isActive ? ta("v2.escalationMatrix.activeLabel") : ta("v2.escalationMatrix.standbyLabel")}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeEscalationLevel(index)}
                      disabled={escalationDraft.length <= 1}
                      className="flex h-10 items-center justify-center rounded-[8px] border border-[#F3D4D4] bg-white text-[#EF4444] transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={ta("v2.escalationMatrix.removeLevel")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-dashed border-[#DDE3EF] bg-[#F8FAFF] p-3">
                <p className="text-[11px] font-bold text-[#68739F]">{ta("v2.escalationMatrix.limitHint")}</p>
                <button type="button" onClick={addEscalationLevel} disabled={escalationDraft.length >= 5} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#465FFF] transition hover:border-[#C9D4F6] disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus size={14} /> {ta("v2.escalationMatrix.addLevel")}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#EEF1F7] p-5">
              <button type="button" onClick={closeEscalationModal} disabled={isSavingEscalation} className="flex h-9 items-center justify-center rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-60">
                {ta("v2.escalationMatrix.cancel")}
              </button>
              <button type="button" onClick={handleSaveEscalationMatrix} disabled={isSavingEscalation} className="flex h-9 items-center justify-center rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {isSavingEscalation ? ta("v2.escalationMatrix.saving") : ta("v2.escalationMatrix.save")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Alert Modal */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md" onClick={closeCreateModal}>
          <div className="flex w-full max-w-lg flex-col max-h-[85vh] rounded-[14px] border border-[#E8ECF5] bg-white text-[#101334] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF1F7] p-5">
              <div>
                <h2 className="text-lg font-black text-[#101334]">{ta("v2.header.createAlert")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#68739F]">{taCreate("desc")}</p>
              </div>
              <button type="button" onClick={closeCreateModal} className="rounded-full p-2 text-[#98A2B3] transition hover:bg-[#F5F7FC] hover:text-[#53608C]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (isCreatingAlert) return;
                const formData = new FormData(e.currentTarget);
                const deadlineRaw = formData.get("deadline") as string || "";
                setIsCreatingAlert(true);
                createAlert({
                  title: formData.get("title") as string,
                  type: formData.get("type") as "risk" | "opportunity" | "positioning",
                  severity: formData.get("severity") as "low" | "medium" | "high" | "critical",
                  whatHappened: formData.get("whatHappened") as string || undefined,
                  whyItMatters: formData.get("whyItMatters") as string || undefined,
                  whatToDo: formData.get("whatToDo") as string || undefined,
                  assignedTo: formData.get("assignedTo") as string || undefined,
                  assignedTeam: formData.get("assignedTeam") as string || undefined,
                  deadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : undefined,
                  sources: selectedSources.length > 0 ? selectedSources : undefined,
                }).then((newAlert) => {
                  if (newAlert) {
                    toastHook.success(ta("toast.statusUpdated"));
                    queryClient.invalidateQueries({ queryKey: ["alerts"] });
                    queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
                    closeCreateModal();
                  } else {
                    toastHook.error(ta("toast.statusUpdateFailed"));
                  }
                }).catch(() => {
                  toastHook.error(ta("toast.statusUpdateFailed"));
                }).finally(() => {
                  setIsCreatingAlert(false);
                });
              }} className="space-y-4">
                {/* ── Core Info ── */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("titleLabel")}</label>
                  <input name="title" required placeholder={taCreate("titlePlaceholder")} className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("typeLabel")}</label>
                    <select
                      name="type"
                      value={createType}
                      onChange={(e) => setCreateType(e.target.value)}
                      title={
                        createType === "risk"
                          ? taCreate("typeRisk")
                          : createType === "opportunity"
                          ? taCreate("typeOpportunity")
                          : createType === "positioning"
                          ? taCreate("typePositioning")
                          : ""
                      }
                      className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
                    >
                      <option value="risk" title={taCreate("typeRisk")}>{taCreate("typeRisk")}</option>
                      <option value="opportunity" title={taCreate("typeOpportunity")}>{taCreate("typeOpportunity")}</option>
                      <option value="positioning" title={taCreate("typePositioning")}>{taCreate("typePositioning")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("severityLabel")}</label>
                    <select
                      name="severity"
                      value={createSeverity}
                      onChange={(e) => setCreateSeverity(e.target.value)}
                      title={
                        createSeverity === "low"
                          ? taCreate("severityLow")
                          : createSeverity === "medium"
                          ? taCreate("severityMedium")
                          : createSeverity === "high"
                          ? taCreate("severityHigh")
                          : createSeverity === "critical"
                          ? taCreate("severityCritical")
                          : ""
                      }
                      className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
                    >
                      <option value="low" title={taCreate("severityLow")}>{taCreate("severityLow")}</option>
                      <option value="medium" title={taCreate("severityMedium")}>{taCreate("severityMedium")}</option>
                      <option value="high" title={taCreate("severityHigh")}>{taCreate("severityHigh")}</option>
                      <option value="critical" title={taCreate("severityCritical")}>{taCreate("severityCritical")}</option>
                    </select>
                  </div>
                </div>

                {/* ── Context ── */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("whatHappenedLabel")}</label>
                  <textarea name="whatHappened" rows={2} placeholder={taCreate("whatHappenedPlaceholder")} className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("whyItMattersLabel")}</label>
                  <textarea name="whyItMatters" rows={2} placeholder={taCreate("whyItMattersPlaceholder")} className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("whatToDoLabel")}</label>
                  <textarea name="whatToDo" rows={2} placeholder={taCreate("whatToDoPlaceholder")} className="w-full rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] p-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white resize-none" />
                </div>

                {/* ── Assignment & Sources ── */}
                <div className="rounded-[10px] border border-[#E6EAF2] bg-[#FBFCFF]">
                  <button type="button" onClick={() => setIsCreateAdvancedOpen((open) => !open)} className="flex w-full items-center justify-between px-3.5 py-2.5 text-[11px] font-black text-[#31406B]">
                    <span className="flex items-center gap-2"><Settings size={13} className="text-[#465FFF]" />{ta("v2.header.escalationMatrix").replace("Escalation Matrix", "Assignment & Sources").replace("Matriks Eskalasi", "Penugasan & Sumber")}</span>
                    <ChevronRight size={14} className={cn("text-[#8B95B8] transition-transform", isCreateAdvancedOpen && "rotate-90")} />
                  </button>
                  {isCreateAdvancedOpen && (
                    <div className="space-y-3 border-t border-[#E6EAF2] px-3.5 pb-3.5 pt-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("assignedToLabel")}</label>
                          <select
                            name="assignedTo"
                            value={createAssignedTo}
                            onChange={(e) => setCreateAssignedTo(e.target.value)}
                            title={assignedToHoverTitle}
                            className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]"
                          >
                            <option value="" title={taCreate("assignedToPlaceholder")}>{taCreate("assignedToPlaceholder")}</option>
                            {(membersQuery.data ?? []).map((m) => {
                              const val = m.user?.name || m.user?.email || m.userId;
                              const label = `${val}${m.role ? ` (${m.role})` : ""}`;
                              return (
                                <option key={m.id} value={val} title={label}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("assignedTeamLabel")}</label>
                          <select
                            name="assignedTeam"
                            value={createAssignedTeam}
                            onChange={(e) => setCreateAssignedTeam(e.target.value)}
                            title={assignedTeamHoverTitle}
                            className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]"
                          >
                            <option value="" title={taCreate("assignedTeamPlaceholder")}>{taCreate("assignedTeamPlaceholder")}</option>
                            {escalationLevels.filter((e) => e.isActive).map((e) => {
                              const label = `${e.roleName} (${e.level})`;
                              return (
                                <option key={e.id} value={e.roleName} title={label}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{taCreate("deadlineLabel")}</label>
                        <input name="deadline" type="datetime-local" className="h-9 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold text-[#31406B]">{ta("v2.incident.source")}</label>
                        {(sourcesQuery.data?.data ?? []).length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white p-2.5 max-h-[140px] overflow-y-auto">
                            {(sourcesQuery.data?.data ?? []).map((src) => (
                              <label key={src.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] font-bold text-[#31406B] transition hover:bg-[#F5F7FC] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedSources.includes(src.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSources((prev) => [...prev, src.name]);
                                    } else {
                                      setSelectedSources((prev) => prev.filter((s) => s !== src.name));
                                    }
                                  }}
                                  className="size-3.5 rounded border-[#DDE3EF] text-[#465FFF] accent-[#465FFF]"
                                />
                                <span className="truncate">{src.name}</span>
                                <span className="ml-auto shrink-0 rounded-full bg-[#F1F4FB] px-1.5 py-0.5 text-[9px] font-black text-[#68739F]">{src.type}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-[8px] border border-dashed border-[#DDE3EF] bg-[#FBFCFF] px-3 py-2.5 text-[11px] font-semibold text-[#8B95B8]">
                            No sources configured yet. Add sources in the Sources page.
                          </p>
                        )}
                        {selectedSources.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {selectedSources.map((s) => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-[#465FFF]/10 px-2 py-0.5 text-[10px] font-black text-[#465FFF]">
                                {s}
                                <button type="button" onClick={() => setSelectedSources((prev) => prev.filter((x) => x !== s))} className="ml-0.5 text-[#465FFF]/60 hover:text-[#465FFF]">
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF1F7]">
                  <button type="button" onClick={closeCreateModal} className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF]">
                    {taCreate("cancel")}
                  </button>
                  <button type="submit" disabled={isCreatingAlert} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-4 text-[12px] font-black text-white shadow-[0_8px_16px_rgba(70,95,255,0.2)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    {isCreatingAlert ? `${taCreate("submit")}...` : taCreate("submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#101334]/35 p-4 backdrop-blur-md" onClick={() => setIsFilterModalOpen(false)}>
          <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[18px] border border-[#DDE5F4] bg-white text-[#101334] shadow-[0_24px_70px_rgba(16,24,40,0.22)]" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden border-b border-[#E7ECF6] bg-linear-to-br from-[#F8FAFF] via-white to-[#EEF2FF] p-5">
              <div className="absolute right-6 top-4 size-24 rounded-full bg-[#465FFF]/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#DDE3EF] bg-white/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
                    <SlidersHorizontal size={12} /> {ta("filter.badge")}
                  </div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-[#101334]">{ta("filter.title")}</h2>
                  <p className="mt-1 text-[11px] font-bold text-[#68739F]">{ta("filter.desc")}</p>
                </div>
                <button type="button" onClick={() => setIsFilterModalOpen(false)} className="rounded-full bg-white/80 p-2 text-[#98A2B3] shadow-sm transition hover:bg-white hover:text-[#53608C]">
                <X size={20} />
              </button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-[14px] border border-[#E6EAF2] bg-[#FBFCFF] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black text-[#101334]">{ta("table.severity")}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-[#8A94B8]">{ta("filter.severityDesc")}</p>
                  </div>
                  {severityFilter ? <span className="rounded-full bg-[#465FFF]/10 px-2 py-1 text-[9px] font-black text-[#465FFF]">{severityFilter}</span> : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    { value: "", label: ta("v2.list.allSeverity") },
                    { value: "critical", label: ta("v2.incident.critical") },
                    { value: "high", label: ta("v2.createForm.severityHigh") },
                    { value: "medium", label: ta("v2.createForm.severityMedium") },
                    { value: "low", label: ta("v2.createForm.severityLow") },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setSeverityFilter(option.value); setPage(1); }}
                      className={cn("rounded-[10px] px-3 py-2 text-[11px] font-black transition", severityFilter === option.value ? "bg-[#465FFF] text-white shadow-[0_10px_20px_rgba(70,95,255,0.18)]" : "border border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6] hover:bg-[#F8FAFF]")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#E6EAF2] bg-[#FBFCFF] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black text-[#101334]">{ta("table.status")}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-[#8A94B8]">{ta("filter.statusDesc")}</p>
                  </div>
                  {statusFilter ? <span className="rounded-full bg-[#465FFF]/10 px-2 py-1 text-[9px] font-black text-[#465FFF]">{statusFilter}</span> : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "", label: ta("filter.allStatus") },
                    { value: "open", label: ta("table.statusNew") },
                    { value: "acknowledged", label: ta("table.statusInvestigating") },
                    { value: "resolved", label: ta("table.statusResolved") },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setStatusFilter(option.value); setPage(1); }}
                      className={cn("rounded-[10px] px-3 py-2 text-[11px] font-black transition", statusFilter === option.value ? "bg-[#465FFF] text-white shadow-[0_10px_20px_rgba(70,95,255,0.18)]" : "border border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6] hover:bg-[#F8FAFF]")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-[#EEF1F7] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => { setSearchQuery(""); setSeverityFilter(""); setStatusFilter(""); setPage(1); }} className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#E6EAF2] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:border-[#F3B4B4] hover:bg-[#FFF7F7] hover:text-[#EF4444]">
                {ta("filter.clearFilter")}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsFilterModalOpen(false)} className="h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF]">
                  {ta("filter.cancel")}
                </button>
                <button type="button" onClick={() => setIsFilterModalOpen(false)} className="h-10 rounded-[10px] bg-linear-to-r from-[#465FFF] to-[#5C4DFF] px-5 text-[12px] font-black text-white shadow-[0_12px_22px_rgba(70,95,255,0.22)] transition hover:opacity-90">
                  {ta("filter.apply")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
