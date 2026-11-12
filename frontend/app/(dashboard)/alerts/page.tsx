"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Bell, Check, ChevronDown, ChevronRight, CircleCheck, HelpCircle, Loader2, Mail, MoreVertical, Search, Shield, Users, X, CheckCircle2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Slack, WhatsApp } from "@ridemountainpig/svgl-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { assigneeName, memberName } from "@/lib/member-name";
import { teamOptions } from "@/lib/teams";
import { ModalShell } from "@/components/ui/modal-shell";
import { createAlert, getAlerts, getAlertsSummary, getEscalationMatrix, getIntegrations, getNotificationSettings, getSources, getWorkspaceMembers, updateAlertStatus, updateAlertAssignment, updateEscalationMatrix, updateNotificationSettings, bulkUpdateAlerts, type Alert, type EscalationMatrixRecord, type IntegrationRecord, type NotificationRuleRecord, type NotificationRuleTrigger, type WorkspaceMemberRecord } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { intlLocale } from "@/store/useUiStore";
import { DemoBanner } from "@/components/ui/demo-banner";
import { pickL } from "@/lib/use-l";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";

type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate";
type AlertStatus = "New" | "Investigating" | "Escalated" | "Resolved";
type SourceKey = "x" | "instagram" | "tiktok" | "facebook" | "appstore" | "googleplay" | "support" | "discourse";

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
  deadlineMs: number | null;
  overdue: boolean;
  assigneeId: string | null;
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
  blue: { color: "#465FFF", rgb: "70,95,255", soft: "bg-[#465FFF]/10", text: "text-[#3B52F5]", border: "border-[#E6EAF2]" },
  purple: { color: "#8B5CFF", rgb: "139,92,255", soft: "bg-[#8B5CFF]/10", text: "text-[#6E44E8]", border: "border-[#E6EAF2]" },
  green: { color: "#10B981", rgb: "16,185,129", soft: "bg-[#10B981]/10", text: "text-[#047857]", border: "border-[#E6EAF2]" },
  red: { color: "#EF4444", rgb: "239,68,68", soft: "bg-[#EF4444]/10", text: "text-[#C81E1E]", border: "border-[#E6EAF2]" },
  amber: { color: "#F59E0B", rgb: "245,158,11", soft: "bg-[#F59E0B]/10", text: "text-[#A04606]", border: "border-[#E6EAF2]" },
  slate: { color: "#64748B", rgb: "100,116,139", soft: "bg-slate-100", text: "text-[#5A6478]", border: "border-slate-200" },
};


// 87186 -> "60d 13h"; 200 -> "3h 20m"; 45 -> "45m".
function formatMinutes(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}


function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn(BOX, className)}>{children}</section>;
}


function buildMetricCards(ta: ReturnType<typeof useTranslations<"Alerts">>, summary: Awaited<ReturnType<typeof getAlertsSummary>>, openCritical: number): Metric[] {
  const total = summary?.total ?? 0;
  const critical = openCritical;
  const inProgress = summary?.by_status?.in_progress ?? 0;
  const resolved = summary?.by_status?.resolved ?? 0;
  const acknowledgedCount = summary?.acknowledged_count ?? inProgress + resolved;
  const overdueCount = summary?.overdue_count ?? 0;
  const last7 = summary?.last_7_days ?? 0;
  const prev7 = summary?.previous_7_days ?? 0;
  const trendDelta = summary?.trend_delta ?? 0;
  const spark = summary?.timeline?.slice(-12) ?? [];
  const avgResponseMinutes = summary?.avg_response_time_minutes ?? null;
  const slaTargetMinutes = summary?.sla_target_minutes ?? null;

  const delta = prev7 > 0 ? `${((last7 - prev7) / prev7 * 100).toFixed(1)}%` : "0%";
  const deltaSign = trendDelta >= 0 ? "+" : "";
  // No alerts in the previous week means there is nothing to compare against.
  const hasBaseline = prev7 > 0;
  const deltaLabel = !hasBaseline ? ta("v2.metrics.noBaseline") : trendDelta >= 0 ? ta("v2.metrics.vsPrevious7Days", { val: `${deltaSign}${delta}` }) : ta("v2.metrics.vsPrevious7Days", { val: delta });

  const openCount = summary?.by_status?.open ?? Math.max(0, total - acknowledgedCount);
  const active = Math.max(0, total - resolved);
  const slow = avgResponseMinutes !== null && slaTargetMinutes !== null && slaTargetMinutes > 0 && avgResponseMinutes > slaTargetMinutes;
  const slowBy = slow ? Math.round(avgResponseMinutes! / slaTargetMinutes!) : 0;
  void deltaLabel; void spark;

  // The five tiles add up: active + done = total, and the list below shows exactly the active ones.
  return [
    { label: pickL("Active", "Aktif"), value: String(active), helper: pickL(`${openCount} not picked up · of ${total} total`, `${openCount} belum disentuh · dari ${total} total`), helperTone: openCount > 0 ? "amber" : "green", icon: Bell, tone: "purple", spark: [] },
    { label: ta("v2.metrics.criticalAlerts"), value: String(critical), helper: critical > 0 ? pickL("respond now", "respons sekarang") : pickL("none open", "tidak ada"), helperTone: critical > 0 ? "red" : "green", icon: AlertTriangle, tone: "red", spark: [] },
    { label: pickL("Overdue", "Lewat tenggat"), value: String(overdueCount), helper: overdueCount > 0 ? pickL("assign an owner today", "tunjuk penanggung jawab hari ini") : pickL("all on schedule", "semua sesuai jadwal"), helperTone: overdueCount > 0 ? "red" : "green", icon: Users, tone: overdueCount > 0 ? "red" : "amber", spark: [] },
    { label: ta("v2.metrics.resolved"), value: String(resolved), helper: ta("v2.metrics.of", { val1: String(resolved), val2: String(total) }), helperTone: "green", icon: CircleCheck, tone: "green", spark: [] },
    { label: ta("v2.metrics.avgResponseTime"), value: avgResponseMinutes !== null ? formatMinutes(avgResponseMinutes) : "-", helper: slow ? pickL(`${slowBy}× slower than the ${formatMinutes(slaTargetMinutes!)} target`, `${slowBy}× lebih lambat dari target ${formatMinutes(slaTargetMinutes!)}`) : ta("v2.metrics.target", { val: slaTargetMinutes !== null ? formatMinutes(slaTargetMinutes) : "-" }), helperTone: slow ? "red" : "green", icon: HelpCircle, tone: slow ? "red" : "blue", spark: [] },
  ];
}

function MetricCard({ metric }: { metric: Metric }) {
  const style = toneStyles[metric.tone];
  const helperStyle = toneStyles[metric.helperTone];

  return (
    <div className="min-h-[120px] flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
      <p className="text-[11px] font-black" style={{ color: style.color }}>{metric.label}</p>
      <p className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-navy">{metric.value}</p>
      <p className={cn("mt-2 text-[11px] font-bold leading-tight", helperStyle.text)}>{metric.helper}</p>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <Panel className="relative min-h-[96px] overflow-hidden p-3.5">
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



function StatusBadge({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, string> = {
    New: "bg-[#8B5CFF]/10 text-[#3B52F5]",
    Investigating: "bg-[#465FFF]/10 text-[#3B52F5]",
    Escalated: "bg-[#F97316]/12 text-[#F97316]",
    Resolved: "bg-[#10B981]/10 text-[#047857]",
  };

  const labels: Record<AlertStatus, [string, string]> = { New: ["New", "Baru"], Investigating: ["In progress", "Ditangani"], Escalated: ["Escalated", "Dieskalasi"], Resolved: ["Resolved", "Selesai"] };
  return <span className={cn("whitespace-nowrap rounded-[8px] px-2.5 py-1 text-[11px] font-black", styles[status])}>{pickL(...labels[status])}</span>;
}

/** Logo for a social/app source; null for news and anything without a logo (it used to fall back to X). */
function sourceNameToIconKey(source: string): SourceKey | null {
  const normalized = source.toLowerCase();
  if (normalized.includes("instagram")) return "instagram";
  if (normalized.includes("tiktok")) return "tiktok";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("app store") || normalized.includes("appstore")) return "appstore";
  if (normalized.includes("google play") || normalized.includes("googleplay")) return "googleplay";
  if (normalized.includes("support")) return "support";
  if (normalized.includes("discourse") || normalized.includes("forum")) return "discourse";
  if (normalized === "x" || normalized.includes("twitter")) return "x";
  return null;
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

function severityText(severity: string | null | undefined) {
  const v = String(severity || "").toLowerCase();
  return v === "critical" ? pickL("Critical", "Kritis") : v === "high" ? pickL("High", "Tinggi") : v === "medium" ? pickL("Medium", "Sedang") : pickL("Low", "Rendah");
}

function mapAlertRecordToRow(alert: Alert, ta: ReturnType<typeof useTranslations<"Alerts">>, optimisticStatuses: Record<string | number, AlertStatus>, members: WorkspaceMemberRecord[]): AlertRow {
  const normalizedStatus = String(alert.status || "").toLowerCase();
  const mappedStatus = normalizedStatus === "open"
    ? "New"
    : normalizedStatus === "acknowledged" || normalizedStatus === "in_progress" || normalizedStatus === "in-progress"
      ? "Investigating"
      : normalizedStatus === "resolved"
        ? "Resolved"
        : "Escalated";
  const alertSources = alert.sources?.filter(Boolean) ?? [];
  const shownSources = alertSources.slice(0, 3).map(sourceNameToIconKey).filter((key): key is SourceKey => key !== null);
  const createdAt = new Date(alert.createdAt);
  const deadline = alert.deadline ? new Date(alert.deadline) : null;

  return {
    id: alert.id,
    title: alert.title,
    description: alert.whatHappened || alert.whyItMatters || alert.whatToDo || "",
    tags: [severityText(alert.severity)],
    // The owner: the assigned member, else the assigned team (the alert type is not an owner).
    sourceLabel: assigneeName(alert.assignedTo, members) || alert.assignedTeam || ta("table.unassigned"),
    sources: shownSources,
    extraSources: Math.max(0, alertSources.length - shownSources.length),
    escalationLevel: alert.escalationLevel ? severityText(alert.escalationLevel) : pickL("Not escalated", "Belum dieskalasi"),
    deadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline.toLocaleString(intlLocale(), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : pickL("No deadline", "Tanpa tenggat"),
    deadlineMs: deadline && !Number.isNaN(deadline.getTime()) ? deadline.getTime() : null,
    overdue: Boolean(deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now() && normalizedStatus !== "resolved"),
    assigneeId: alert.assignedTo ? String(alert.assignedTo) : null,
    ack: normalizedStatus === "open" ? ta("table.notAcknowledged") : ta("table.acknowledged"),
    impact: alert.severity === "critical" || alert.severity === "high" ? "High" : "Medium",
    status: optimisticStatuses[alert.id] ?? mappedStatus,
    time: Number.isNaN(createdAt.getTime()) ? "" : createdAt.toLocaleString(intlLocale(), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    tone: alert.severity === "critical" ? "red" : alert.severity === "high" ? "amber" : "green",
  };
}

function ChannelIcon({ children, tone = "blue" }: { children: ReactNode; tone?: Tone }) {
  const style = toneStyles[tone];
  return <span className={cn("flex size-8 items-center justify-center rounded-[8px]", style.soft, style.text)}>{children}</span>;
}

function timeLeft(ms: number | null) {
  if (ms === null) return null;
  const diff = ms - Date.now();
  const hours = Math.round(Math.abs(diff) / 3600000);
  const span = hours >= 24 ? pickL(`${Math.round(hours / 24)}d`, `${Math.round(hours / 24)} hari`) : hours >= 1 ? pickL(`${hours}h`, `${hours} jam`) : pickL("<1h", "<1 jam");
  return diff < 0 ? pickL(`${span} overdue`, `lewat ${span}`) : pickL(`${span} left`, `sisa ${span}`);
}

// The one incident that needs a decision now: three facts (deadline, owner, status) and the buttons that act on them.
function CriticalIncident({
  alert,
  totalCritical,
  isLoading,
  ta,
  members,
  onAssign,
  onStatusChange,
  onPlan,
}: {
  alert: AlertRow | null;
  totalCritical: number;
  isLoading: boolean;
  ta: ReturnType<typeof useTranslations<"Alerts">>;
  members: WorkspaceMemberRecord[];
  onAssign: (id: string | number, userId: string) => void;
  onStatusChange: (id: string | number, status: "open" | "acknowledged" | "resolved") => void;
  onPlan: (alert: AlertRow) => void;
}) {
  if (!isLoading && !alert) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] bg-[#ECFDF5] px-5 py-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#12A66A] text-white"><Check size={16} /></span>
        <p className="text-[14px] font-black text-[#065F46]">{ta("v2.incident.noCriticalTitle")}</p>
      </div>
    );
  }
  const left = alert ? timeLeft(alert.deadlineMs) : null;
  const unassigned = alert ? !alert.assigneeId : false;
  const facts: Array<{ label: string; value: string; sub: string; bad: boolean }> = alert
    ? [
      { label: ta("v2.incident.deadline"), value: left ?? alert.deadline, sub: alert.deadline, bad: alert.overdue },
      { label: ta("v2.incident.owner"), value: alert.sourceLabel, sub: unassigned ? pickL("nobody is on it yet", "belum ada yang pegang") : pickL("on it", "sedang menangani"), bad: unassigned },
      { label: ta("v2.incident.status"), value: alert.status === "New" ? pickL("Not picked up", "Belum disentuh") : alert.status === "Investigating" ? pickL("Being handled", "Sedang ditangani") : alert.status === "Resolved" ? ta("v2.incident.resolved") : pickL("Escalated", "Dieskalasi"), sub: ta("v2.incident.since", { time: alert.time }), bad: alert.status === "New" },
    ]
    : [];

  return (
    <Panel className="min-h-0 h-auto border-transparent bg-[#FFF5F5] p-5">
      {isLoading || !alert ? (
        <div className="space-y-3">
          <div className="h-6 w-2/3 animate-pulse rounded bg-[#F8DADA]" />
          <div className="grid gap-2 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-[12px] bg-white/80" />)}</div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="inline-flex rounded-full bg-[#C81E1E] px-2.5 py-0.5 text-[11px] font-black text-white">
                {pickL("Critical Incident", "Insiden Kritis")}{totalCritical > 1 ? ` · ${pickL(`${totalCritical} open`, `${totalCritical} aktif`)}` : ""}
              </p>
              <h2 className="mt-2 line-clamp-2 text-[26px] font-black leading-tight tracking-[-0.03em] text-[#070B28]">{alert.title}</h2>
              {alert.description ? <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#31406B]" title={alert.description}>{alert.description}</p> : null}
            </div>
            <Link href={`/alerts/${alert.id}`} className="inline-flex h-9 items-center rounded-full bg-[#101334] px-4 text-[12.5px] font-bold text-white transition hover:bg-[#2B2F9E]">
              {ta("v2.incident.viewDetails")}
            </Link>
          </div>
          <div className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <p className="text-[12px] font-bold text-[#647099]">{f.label}</p>
                <p className={cn("mt-1 truncate text-[22px] font-black leading-tight", f.bad ? "text-[#C81E1E]" : "text-[#101334]")} title={f.value}>{f.value}</p>
                <p className={cn("mt-0.5 truncate text-[12px] font-bold", f.bad ? "text-[#C81E1E]" : "text-[#5F6B94]")}>{f.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="incident-owner">{ta("v2.incident.owner")}</label>
            <select
              id="incident-owner"
              value={alert.assigneeId ?? ""}
              onChange={(e) => e.target.value && onAssign(alert.id, e.target.value)}
              className={cn("h-10 w-full max-w-full rounded-full px-4 text-[13px] font-bold outline-none sm:w-auto", unassigned ? "bg-[#C81E1E] text-white" : "bg-white text-[#101334] border-[1.5px] border-[#101334] shadow-[0_2px_0_#101334]")}
            >
              <option value="">{pickL("Assign an Owner…", "Tunjuk Penanggung Jawab…")}</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{memberName(m)}</option>)}
            </select>
            {alert.status === "New" ? (
              <button type="button" onClick={() => onStatusChange(alert.id, "acknowledged")} className="h-10 rounded-full bg-white px-5 text-[13px] font-bold text-[#101334] border-[1.5px] border-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F8FAFF]">{pickL("Mark as Being Handled", "Tandai Sedang Ditangani")}</button>
            ) : null}
            <button type="button" onClick={() => onPlan(alert)} className="h-10 rounded-full bg-[#465FFF] px-5 text-[13px] font-bold text-white transition hover:bg-[#3B52F5]">{pickL("Create Action Plan", "Buat Rencana Aksi")}</button>
          </div>
        </>
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
      <h3 className="text-[16px] font-black text-[#101334]">{ta("v2.delivery.title")} <span className="text-[11px] font-bold text-[#53608C]">{ta("v2.delivery.thisAlert")}</span></h3>
      <div className="mt-4 flex-1 space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, index) => <div key={index} className="h-8 animate-pulse rounded-[8px] bg-[#F1F4FB]" />)
        ) : shownChannels.length > 0 ? (
          shownChannels.map((channel) => (
            <div key={channel.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3">
              <ChannelIcon tone={channel.visual.tone}>{channel.visual.icon}</ChannelIcon>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-black text-[#101334]">{channel.name}</p>
                <p className="mt-0.5 text-[9px] font-bold text-[#647099]">{channel.platform}</p>
              </div>
              <div className="text-right"><p className="inline-flex items-center gap-1 text-[10px] font-black text-[#047857]">{ta("v2.delivery.active")}</p><p className="text-[9px] font-bold text-[#31406B]">{channel.lastSyncAt ? new Date(channel.lastSyncAt).toLocaleDateString(intlLocale(), { day: "2-digit", month: "short" }) : ta("v2.delivery.ready")}</p></div>
            </div>
          ))
        ) : (
          <div className="py-4">
            <p className="text-[12px] font-black text-[#101334]">{ta("v2.delivery.noChannels")}</p>
            <p className="mt-1 text-[10px] font-bold text-[#647099]">{ta("v2.delivery.noChannelsDesc")}</p>
          </div>
        )}
        {extraCount > 0 ? <p className="text-[10px] font-black text-[#53608C]">+{extraCount} {ta("v2.delivery.moreChannels")}</p> : null}
      </div>
      <Link href="/workspace/integrations" className="mt-5 inline-flex items-center gap-1 self-start text-[11px] font-black text-[#3B52F5] hover:underline">{ta("v2.delivery.viewAllChannels")} <ArrowRight size={13} /></Link>
    </Panel>
  );
}

function EscalationMatrix({ ta, levels, isLoading }: { ta: ReturnType<typeof useTranslations<"Alerts">>; levels: EscalationMatrixRecord[]; isLoading: boolean }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-black text-[#101334]">{ta("v2.escalationMatrix.panelTitle")}</h3>
        </div>
        {isLoading ? <span className="size-3.5 rounded-full border-2 border-[#465FFF] border-r-transparent" /> : null}
      </div>
      {/* A stepper: who is called at each level, and how fast they must respond; the colour warms as it climbs. */}
      <ol className="mt-4">
        {levels.map((item, index) => {
          const heat = ["#465FFF", "#F59E0B", "#F97316", "#C81E1E", "#7F1D1D"][Math.min(index, 4)];
          return (
            <li key={`${item.id}-${item.level}`} className="relative flex gap-3 pb-4 last:pb-0">
              {index < levels.length - 1 ? <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-28px)] w-0.5 bg-[#E6EAF2]" /> : null}
              <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white" style={{ background: item.isActive ? heat : "#B8C0D4" }}>{index + 1}</span>
              <div className="min-w-0 flex-1 rounded-[10px] bg-[#F7F8FC] px-3 py-2">
                <p className="text-[13px] font-black leading-snug text-[#101334]">{item.roleName}</p>
                <p className="mt-0.5 text-[11px] font-bold text-[#5A6478]">
                  {ta("v2.escalationMatrix.sla", { time: formatSlaMinutes(item.slaMinutes, ta) })}
                  {item.isActive ? null : <span className="ml-1.5 text-[#8A93AD]">· {ta("v2.escalationMatrix.standbyLabel")}</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
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
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="flex size-9 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#647099] transition hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-40" aria-label={ta("pagination.previous")}>
        <ChevronDown size={14} className="rotate-90" />
      </button>
      {pages.map((item, index) => (
        <div key={item} className="contents">
          {index > 0 && item - pages[index - 1] > 1 ? <span className="px-1 text-[11px] font-black text-[#647099]">...</span> : null}
        <button key={item} type="button" onClick={() => onPageChange(item)} className={cn("flex size-9 items-center justify-center rounded-[8px] border text-[12px] font-black transition", page === item ? "border-[#465FFF] bg-white text-[#3B52F5] shadow-sm" : "border-[#E6EAF2] bg-white text-[#31406B] hover:border-[#C9D4F6]")}>{item}</button>
        </div>
      ))}
      <button type="button" disabled={page >= safeTotal} onClick={() => onPageChange(Math.min(safeTotal, page + 1))} className="flex size-9 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#31406B] transition hover:text-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-40" aria-label={ta("pagination.next")}>
        <ChevronDown size={14} className="-rotate-90" />
      </button>
    </div>
  );
}

function AlertsTable({ ta, rows, page, totalPages, footerText, isLoading, isError, onPageChange, onStatusChange, openMenuId, setOpenMenuId, menuRef, searchQuery, onSearchChange, severityFilter, statusFilter, onOpenFilterModal, selectedAlerts, onSelectionChange, onBulkStatusChange, isBulkUpdating }: { ta: ReturnType<typeof useTranslations<"Alerts">>; rows: AlertRow[]; page: number; totalPages: number; footerText: string; isLoading: boolean; isError: boolean; onPageChange: (page: number) => void; onStatusChange: (id: string | number, status: "open" | "acknowledged" | "resolved") => void; openMenuId: string | number | null; setOpenMenuId: (id: string | number | null) => void; menuRef: React.RefObject<HTMLDivElement | null>; searchQuery: string; onSearchChange: (value: string) => void; severityFilter: string; statusFilter: string; onOpenFilterModal: () => void; selectedAlerts: Set<string | number>; onSelectionChange: (ids: Set<string | number>) => void; onBulkStatusChange: (status: "open" | "acknowledged" | "resolved") => void; isBulkUpdating: boolean }) {
  // Five columns that fit the panel; source, escalation and time live on the alert's own page.
  const headers = [ta("table.alert"), ta("table.severity"), ta("table.owner"), ta("table.deadline"), ta("table.status"), ""];
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
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-transparent bg-[#EEF2FF] px-4 py-2.5">
          <span className="text-[12px] font-black text-[#3B52F5]">{selectedAlerts.size} selected</span>
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
            className="flex items-center gap-1.5 rounded-[6px] bg-[#B45309] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#92400E] disabled:opacity-50"
          >
            {isBulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Acknowledge
          </button>
          <button
            onClick={() => onBulkStatusChange("resolved")}
            disabled={isBulkUpdating}
            className="flex items-center gap-1.5 rounded-[6px] bg-[#047857] px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-[#065F46] disabled:opacity-50"
          >
            {isBulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Resolve
          </button>
          <button
            onClick={() => onSelectionChange(new Set())}
            className="ml-auto flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[11px] font-bold text-[#5F6B94] transition hover:bg-[#465FFF]/10 hover:text-[#3B52F5]"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#101334]">{ta("table.title")}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5F6B94]" />
            <input type="search" value={searchQuery ?? ""} onChange={(e) => onSearchChange(e.target.value)} placeholder={ta("filter.search")} className="h-10 w-full min-w-[220px] rounded-[8px] border border-[#DDE3EF] bg-[#F8FAFF] px-10 text-[13px] font-bold text-[#101334] outline-none transition placeholder:text-[#647099] focus:border-[#465FFF] focus:bg-white" />
          </label>
          <button type="button" onClick={onOpenFilterModal} className={cn("inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-[11px] font-black transition", activeFilterCount > 0 ? "border-transparent bg-[#EEF2FF] text-[#3B52F5]" : "border-[#DDE3EF] bg-[#F8FAFF] text-[#31406B] hover:border-[#C9D4F6]")}>
            {ta("filter.title")}
            {activeFilterCount > 0 ? <span className="rounded-full bg-[#465FFF] px-1.5 py-0.5 text-[9px] leading-none text-white">{activeFilterCount}</span> : null}
          </button>
        </div>
      </div>
      {/* Phones: one card per alert (title, severity, owner, deadline, status, one tap to open). */}
      <ul className="mt-4 space-y-2.5 md:hidden">
        {isLoading ? Array.from({ length: 3 }, (_, i) => <li key={i} className="h-24 animate-pulse rounded-[12px] bg-[#F1F4FB]" />)
          : isError ? <li className="rounded-[12px] bg-[#FDECEC] p-4 text-[13px] font-bold text-[#B42318]">{ta("table.errorTitle")}</li>
          : rows.length === 0 ? <li className="py-4 text-[13px] font-bold text-[#5F6B94]">{ta("empty.noAlerts")}</li>
          : rows.map((alert) => (
            <li key={`m-${alert.id}`}>
              <Link href={`/alerts/${alert.id}`} className="block border-b border-[#E6EAF2] py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("rounded-[6px] px-2 py-0.5 text-[11px] font-black", alert.tone === "red" ? "bg-[#C81E1E] text-white" : alert.tone === "amber" ? "bg-[#F59E0B] text-white" : "bg-[#E5F6EE] text-[#047857]")}>{alert.tags[0]}</span>
                  <StatusBadge status={alert.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-[14px] font-black leading-snug text-[#101334]">{alert.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className={alert.sourceLabel === ta("table.unassigned") ? "rounded-full bg-[#C81E1E] px-2 py-0.5 text-white" : "rounded-full bg-white px-2 py-0.5 text-[#31406B]"}>{alert.sourceLabel}</span>
                  <span className={alert.overdue ? "rounded-full bg-[#C81E1E] px-2 py-0.5 text-white" : "rounded-full bg-white px-2 py-0.5 text-[#31406B]"}>{alert.overdue ? pickL("Overdue · ", "Lewat tenggat · ") : ""}{alert.deadline}</span>
                </div>
              </Link>
            </li>
          ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <colgroup><col className="w-10" /><col /><col className="w-[96px]" /><col className="w-[150px]" /><col className="w-[120px]" /><col className="w-[130px]" /><col className="w-10" /></colgroup>
          <thead>
            <tr className="border-b border-[#E6EAF2] text-[10px] font-black text-[#5F6B94]">
              <th className="w-10 px-3 py-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  aria-label={pickL("Select all alerts", "Pilih semua peringatan")}
                  aria-pressed={allSelected}
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
                  <td colSpan={7} className="px-3 py-3">
                    <div className="h-10 animate-pulse rounded-[8px] bg-[#F1F4FB]" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="mt-3 text-[13px] font-bold text-[#B42318]">{ta("table.errorTitle")}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#647099]">{ta("table.errorDesc")}</p>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="mt-3 text-[13px] font-bold text-[#5F6B94]">{ta("empty.noAlerts")}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#647099]">{ta("empty.noAlertsDesc")}</p>
                  </div>
                </td>
              </tr>
            ) : rows.map((alert) => (
              <tr key={alert.id} className={cn("transition hover:bg-[#F8FAFF]", alert.tone === "red" && "bg-[#FDECEC]", alert.tone === "amber" && "bg-[#FFF6E0]", selectedAlerts.has(alert.id) && "bg-[#EEF2FF]")}>
                <td className="px-3 py-3 align-middle">
                  <button
                    type="button"
                    onClick={() => handleSelectRow(alert.id)}
                    aria-label={pickL(`Select alert: ${alert.title}`, `Pilih peringatan: ${alert.title}`)}
                    aria-pressed={selectedAlerts.has(alert.id)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition",
                      selectedAlerts.has(alert.id) ? "border-[#465FFF] bg-[#465FFF] text-white" :
                      "border-[#DDE3EF] bg-white hover:border-[#465FFF]"
                    )}
                  >
                    {selectedAlerts.has(alert.id) ? <Check size={12} /> : null}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/alerts/${alert.id}`} className="text-[13px] font-black leading-snug text-[#101334] hover:text-[#3B52F5]">{alert.title}</Link>
                    {alert.description ? <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-[#3A4566]">{alert.description}</p> : null}
                    {alert.time ? <p className="mt-1 text-[10px] font-bold text-[#8A93AD]">{alert.time}</p> : null}
                  </div>
                </td>
                <td className="px-3 py-3 align-middle"><span className={cn("rounded-[6px] px-2 py-1 text-[11px] font-black", alert.tone === "red" ? "bg-[#C81E1E] text-white" : alert.tone === "amber" ? "bg-[#F59E0B] text-white" : "bg-[#10B981]/12 text-[#047857]")}>{alert.tags[0]}</span></td>
                <td className="px-3 py-3 align-middle">{alert.sourceLabel === ta("table.unassigned") ? <span className="text-[12px] font-black text-[#C81E1E]">{alert.sourceLabel}</span> : <span className="line-clamp-2 text-[12px] font-black text-[#31406B]">{alert.sourceLabel}</span>}</td>
                <td className="px-3 py-3 align-middle">{alert.overdue ? <span className="inline-block rounded-[6px] bg-[#C81E1E] px-2 py-1 text-[11px] font-black leading-tight text-white"><span className="block text-[10px] text-white/80">{pickL("Overdue", "Lewat tenggat")}</span>{alert.deadline}</span> : <span className="text-[12px] font-black text-[#31406B]">{alert.deadline}</span>}</td>
                <td className="px-3 py-3 align-middle"><StatusBadge status={alert.status} /><p className="mt-1 text-[10px] font-bold text-[#5A6478]">{alert.ack}</p></td>
                <td className="relative px-3 py-3 text-right align-middle">
                  <button type="button" aria-label={pickL(`Open actions for ${alert.title}`, `Buka aksi untuk ${alert.title}`)} onClick={() => setOpenMenuId(openMenuId === alert.id ? null : alert.id)} className="rounded-md p-1 text-[#5F6B94] transition hover:bg-[#EEF2FF] hover:text-[#3B52F5]"><MoreVertical size={16} /></button>
                  {openMenuId === alert.id ? (
                    <div ref={menuRef} className="absolute right-3 top-full z-50 mt-1 w-48 rounded-[10px] border border-[#E6EAF2] bg-white py-1 shadow-[0_12px_36px_rgba(16,24,40,0.12)]">
                      <p className="px-3 py-1.5 text-[9px] font-black text-[#647099]">{ta("table.changeStatus")}</p>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "open"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]">{ta("table.statusNew")}</button>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "acknowledged"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]">{ta("table.statusInvestigating")}</button>
                      <button type="button" onClick={() => { onStatusChange(alert.id, "resolved"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-bold text-[#31406B] hover:bg-[#F8FAFF]">{ta("table.statusResolved")}</button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-col items-center justify-between gap-3 border-t border-[#EDF1F7] pt-3 sm:flex-row">
        <p className="text-[11px] font-bold text-[#5F6B94]">{footerText}</p>
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
  // Open by default on what still needs work; resolved alerts are one click away.
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const [planAlert, setPlanAlert] = useState<{ id: string; title: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isNotificationRulesModalOpen, setIsNotificationRulesModalOpen] = useState(false);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCreateModalOpen) closeCreateModal();
        if (isFilterModalOpen) setIsFilterModalOpen(false);
        if (isNotificationRulesModalOpen) setIsNotificationRulesModalOpen(false);
        if (isEscalationModalOpen) setIsEscalationModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCreateModalOpen,
    isFilterModalOpen,
    isNotificationRulesModalOpen,
    isEscalationModalOpen,
  ]);

  // Members and escalation data feed live alert panels plus create/edit dropdowns.
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

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
    queryFn: async () => {
      const res = await getAlertsSummary();
      return res ?? null;
    },
    staleTime: 60 * 1000,
  });
  const summary = summaryQuery.data ?? null;

  const alertsQuery = useQuery({
    queryKey: ["alerts", { page, severity: severityFilter, status: statusFilter, search: searchQuery.trim() }],
    queryFn: async () => {
      const res = await getAlerts({
        page,
        limit: 10,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery.trim() || undefined,
      });
      return res ?? { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
    staleTime: 30 * 1000,
  });
  const criticalAlertsQuery = useQuery({
    queryKey: ["alerts", "critical-delivery"],
    queryFn: async () => {
      const res = await getAlerts({ page: 1, limit: 100, severity: "critical" });
      return res ?? { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } };
    },
    staleTime: 30 * 1000,
  });
  const alertsData = alertsQuery.data;
  const escalationLevels = getDisplayEscalationRecords(escalationQuery.data, ta);
  const ownerOptions = (membersQuery.data ?? [])
    .map((member) => {
      // member may be from real API (with .user) or mock (just workspaceId/userId)
      const userObj = (member as any).user;
      const displayName = userObj?.name || userObj?.email || (member as any).userId;
      const roleLabel = (member as any).role ? ` (${(member as any).role})` : "";
      return {
        id: (member as any).id,
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
    ? alertsData.data.map((alert) => mapAlertRecordToRow(alert, ta, optimisticStatuses, membersQuery.data ?? []))
    : [];
  // Only critical alerts that are still open count as an incident.
  const criticalRows = (criticalAlertsQuery.data?.data ?? []).filter((alert) => String(alert.status || "").toLowerCase() !== "resolved").map((alert) => mapAlertRecordToRow(alert, ta, optimisticStatuses, membersQuery.data ?? []));

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

  function handleAssign(id: string | number, userId: string) {
    updateAlertAssignment(id.toString(), { assignedTo: userId })
      .then((updated) => {
        if (!updated) { toastHook.error(pickL("Could not assign the owner.", "Gagal menunjuk penanggung jawab.")); return; }
        toastHook.success(pickL("Owner assigned.", "Penanggung jawab ditunjuk."));
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts-summary"] });
      })
      .catch(() => toastHook.error(pickL("Could not assign the owner.", "Gagal menunjuk penanggung jawab.")));
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

  const highlightedCriticalAlert = criticalRows[0] ?? null;
  const totalCriticalAlerts = criticalAlertsQuery.data ? criticalRows.length : summary?.by_severity?.critical ?? 0;
  const metrics = buildMetricCards(ta, summary, totalCriticalAlerts);
  const td = useTranslations("DashboardStates");
  const totalPages = alertsData?.pagination?.totalPages ?? 1;
  const footerText = td("pagination.summary", { start: alertsData?.pagination && alertsData.pagination.total > 0 ? (alertsData.pagination.page - 1) * alertsData.pagination.limit + 1 : 0, end: alertsData?.pagination ? Math.min(alertsData.pagination.page * alertsData.pagination.limit, alertsData.pagination.total) : 0, total: alertsData?.pagination?.total ?? 0, label: statusFilter === "unresolved" ? pickL("active alerts (resolved ones hidden)", "peringatan aktif (yang selesai disembunyikan)") : ta("table.alertsLabel") });

  const members: WorkspaceMemberRecord[] = membersQuery.data ?? [];
  const selectedMember = members.find(
    (m: WorkspaceMemberRecord) => m.userId === createAssignedTo
  );
  const assignedToHoverTitle = selectedMember
    ? `${memberName(selectedMember)}${
        selectedMember.role ? ` (${selectedMember.role})` : ""
      }`
    : taCreate("assignedToPlaceholder");

  const selectedTeam = teamOptions().find((o) => o.value === createAssignedTeam);
  const assignedTeamHoverTitle = selectedTeam
    ? selectedTeam.label
    : taCreate("assignedTeamPlaceholder");

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      {isDemoSession && (
        <DemoBanner />
      )}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{ta("v2.header.title")}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={openNotificationRulesModal} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF]">{ta("v2.header.notificationRules")}</button>
          <button type="button" onClick={openEscalationModal} className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#101334] shadow-[0_2px_8px_rgba(16,24,40,0.03)] transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF]">{ta("v2.header.escalationMatrix")}</button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm">{ta("v2.header.createAlert")}</button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {summaryQuery.isLoading ? (
          Array.from({ length: 5 }, (_, index) => <MetricCardSkeleton key={index} />)
        ) : (
          metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)
        )}
      </section>
      {summaryQuery.isError || (!summaryQuery.isLoading && !summaryQuery.data) ? (
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[13px] font-bold text-slate-900">{pickL("Alert metrics unavailable", "Metrik peringatan belum bisa dimuat")}</p>
              <p className="text-[11px] font-medium text-[#5A6478]">{pickL("The data could not be loaded. Try again in a moment.", "Data gagal dimuat. Coba lagi sebentar lagi.")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void summaryQuery.refetch()}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
            >
              {pickL("Retry", "Coba lagi")}
            </button>
          </div>
        </div>
      ) : null}

      {/* What needs attention now, then the full list with the routing context beside it. */}
      <CriticalIncident alert={highlightedCriticalAlert} totalCritical={totalCriticalAlerts} isLoading={criticalAlertsQuery.isLoading} ta={ta} members={members} onAssign={handleAssign} onStatusChange={handleStatusChange} onPlan={(a) => setPlanAlert({ id: String(a.id), title: a.title })} />
      <CreateActionPlanModal open={planAlert !== null} onOpenChange={(open) => { if (!open) setPlanAlert(null); }} initialAlertId={planAlert?.id} initialAlertTitle={planAlert?.title} initialStrategyType="crisis_response" />

      {/* The list takes the full width below 1600px so alert titles stay on one or two lines; routing sits under it. */}
      <section className="grid gap-4 min-[1600px]:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0">
          <AlertsTable ta={ta} rows={rows} page={page} totalPages={totalPages} footerText={footerText} isLoading={alertsQuery.isLoading} isError={alertsQuery.isError || (!alertsQuery.isLoading && !alertsData)} onPageChange={setPage} onStatusChange={handleStatusChange} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} menuRef={menuRef} searchQuery={searchQuery} onSearchChange={(value) => { setSearchQuery(value); setPage(1); }} severityFilter={severityFilter} statusFilter={statusFilter} onOpenFilterModal={() => setIsFilterModalOpen(true)} selectedAlerts={selectedAlerts} onSelectionChange={setSelectedAlerts} onBulkStatusChange={handleBulkStatusChange} isBulkUpdating={isBulkUpdating} />
        </div>
        <aside className="grid gap-4 md:grid-cols-2 min-[1600px]:grid-cols-1 min-[1600px]:content-start">
          <EscalationMatrix ta={ta} levels={escalationLevels} isLoading={escalationQuery.isLoading} />
          <DeliveryStatus ta={ta} integrations={integrationsQuery.data?.data ?? []} isLoading={integrationsQuery.isLoading} />
        </aside>
      </section>



      <ModalShell open={isNotificationRulesModalOpen} onClose={closeNotificationRulesModal} size="lg" title={ta("v2.notificationRulesModal.title")} description={ta("v2.notificationRulesModal.desc")} footer={<><p className="text-[10px] font-bold text-[#647099]">{ta("v2.notificationRulesModal.limitHint")}</p>
              <div className="flex gap-2">
                <button type="button" onClick={closeNotificationRulesModal} disabled={isSavingNotificationRules} className="h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-60">
                  {ta("v2.notificationRulesModal.cancel")}
                </button>
                <button type="button" onClick={handleSaveNotificationRules} disabled={isSavingNotificationRules || isLoadingNotificationRules} className="h-10 rounded-[10px] bg-[#465FFF] hover:bg-[#3B52F5] px-5 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSavingNotificationRules ? ta("v2.notificationRulesModal.saving") : ta("v2.notificationRulesModal.save")}
                </button>
              </div></>}>
{isLoadingNotificationRules ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-[12px] bg-[#F1F4FB]" />)}
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-1">
                  <aside className="space-y-3">
                    <div className="rounded-[14px] border border-[#E6EAF2] bg-[#FBFCFF] p-4">
                      <p className="text-[12px] font-black text-[#101334]">{ta("v2.notificationRulesModal.deliveryTitle")}</p>
                      <p className="mt-1 text-[10px] font-bold leading-snug text-[#647099]">{ta("v2.notificationRulesModal.deliveryDesc")}</p>
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
                              <span className="mt-0.5 block text-[9px] font-bold text-[#647099]">{ta(`v2.notificationRulesModal.toggleDesc.${labelKey}`)}</span>
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
                            <span className="mt-1 block text-[9px] font-bold leading-snug text-[#647099]">{ta(`v2.notificationRulesModal.${descKey}`)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>

                  <section className="min-w-0 rounded-[14px] border border-[#E6EAF2] bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F7] p-4">
                      <div>
                        <p className="text-[13px] font-black text-[#101334]">{ta("v2.notificationRulesModal.rulesTitle")}</p>
                        <p className="mt-0.5 text-[10px] font-bold text-[#647099]">{ta("v2.notificationRulesModal.rulesDesc")}</p>
                      </div>
                      <button type="button" onClick={addNotificationRule} disabled={notificationRuleDraft.length >= 20} className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#3B52F5] transition hover:border-[#C9D4F6] hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-50">
                        {ta("v2.notificationRulesModal.addRule")}
                      </button>
                    </div>

                    {notificationRulesLoadFailed ? (
                      <div className="m-4 rounded-[10px] border border-transparent bg-[#FFF6F6] px-4 py-3 text-[11px] font-bold text-[#B42318]">
                        {ta("v2.notificationRulesModal.loadWarning")}
                      </div>
                    ) : null}

                    <div className="space-y-3 p-4">
                      {notificationRuleDraft.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-[13px] font-black text-[#101334]">{ta("v2.notificationRulesModal.noRules")}</p>
                          <p className="mt-1 text-[10px] font-bold text-[#647099]">{ta("v2.notificationRulesModal.noRulesDesc")}</p>
                        </div>
                      ) : notificationRuleDraft.map((rule, index) => (
                        <div key={rule.id} className="rounded-[12px] border border-[#E6EAF2] bg-[#FBFCFF] p-3">
                          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_76px_36px] md:items-end">
                            <label className="block">
                              <span className="mb-1.5 block text-[10px] font-black text-[#5F6B94]">{ta("v2.notificationRulesModal.triggerLabel")}</span>
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
                              <span className="mb-1.5 block text-[10px] font-black text-[#5F6B94]">{ta("v2.notificationRulesModal.conditionLabel")}</span>
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
                              <span className="mb-1.5 block text-[10px] font-black text-[#5F6B94]">{ta("v2.notificationRulesModal.actionLabel")}</span>
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
                              className="flex h-10 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#C81E1E] transition hover:bg-[#FFF5F5]"
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
</ModalShell>

      <ModalShell open={isEscalationModalOpen} onClose={closeEscalationModal} size="lg" title={ta("v2.escalationMatrix.modalTitle")} description={ta("v2.escalationMatrix.modalDesc")} footer={<><button type="button" onClick={closeEscalationModal} disabled={isSavingEscalation} className="flex h-9 items-center justify-center rounded-[8px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-60">
                {ta("v2.escalationMatrix.cancel")}
              </button>
              <button type="button" onClick={handleSaveEscalationMatrix} disabled={isSavingEscalation} className="flex h-9 items-center justify-center rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {isSavingEscalation ? ta("v2.escalationMatrix.saving") : ta("v2.escalationMatrix.save")}
              </button></>}>
<div className="mb-3 grid grid-cols-[78px_minmax(0,1fr)_120px_86px_36px] gap-2 px-2 text-[9px] font-black text-[#5F6B94] max-md:hidden">
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
                      <span className="mb-1 block text-[10px] font-black text-[#5F6B94] md:hidden">{ta("v2.escalationMatrix.levelLabel")}</span>
                      <input
                        value={item.level}
                        maxLength={10}
                        onChange={(event) => updateEscalationDraft(index, { level: event.target.value })}
                        className="h-10 w-full rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[16px] font-black text-[#101334] outline-none transition focus:border-[#465FFF] md:text-[12px]"
                        placeholder="L1"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black text-[#5F6B94] md:hidden">{ta("v2.escalationMatrix.ownerLabel")}</span>
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
                        <p className="mt-1 text-[9px] font-bold text-[#C81E1E]">{ta("v2.escalationMatrix.noOwners")}</p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black text-[#5F6B94] md:hidden">{ta("v2.escalationMatrix.timeLabel")}</span>
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
                      className="flex h-10 items-center justify-center rounded-[8px] border border-[#E6EAF2] bg-white text-[#C81E1E] transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={ta("v2.escalationMatrix.removeLevel")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3">
                <p className="text-[11px] font-bold text-[#5F6B94]">{ta("v2.escalationMatrix.limitHint")}</p>
                <button type="button" onClick={addEscalationLevel} disabled={escalationDraft.length >= 5} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-[#3B52F5] transition hover:border-[#C9D4F6] disabled:cursor-not-allowed disabled:opacity-50">
                  {ta("v2.escalationMatrix.addLevel")}
                </button>
              </div>
</ModalShell>

      {/* Create Alert Modal */}
      <ModalShell open={isCreateModalOpen} onClose={closeCreateModal} size="md" title={ta("v2.header.createAlert")} description={taCreate("desc")}>
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
                    <span className="flex items-center gap-2">{taCreate("advancedSection")}</span>
                    <ChevronRight size={14} className={cn("text-[#647099] transition-transform", isCreateAdvancedOpen && "rotate-90")} />
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
                            {(membersQuery.data ?? []).map((m: WorkspaceMemberRecord) => {
                              const label = `${memberName(m)}${m.role ? ` (${m.role})` : ""}`;
                              return (
                                <option key={m.id} value={m.userId} title={label}>
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
                            {teamOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                                  className="size-3.5 rounded border-[#DDE3EF] text-[#3B52F5] accent-[#465FFF]"
                                />
                                <span className="truncate">{src.name}</span>
                                <span className="ml-auto shrink-0 rounded-full bg-[#F1F4FB] px-1.5 py-0.5 text-[9px] font-black text-[#5F6B94]">{src.type}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="px-3 py-2.5 text-[11px] font-semibold text-[#647099]">
                            No sources configured yet. Add sources in the Sources page.
                          </p>
                        )}
                        {selectedSources.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {selectedSources.map((s) => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-[#465FFF]/10 px-2 py-0.5 text-[10px] font-black text-[#3B52F5]">
                                {s}
                                <button type="button" onClick={() => setSelectedSources((prev) => prev.filter((x) => x !== s))} className="ml-0.5 text-[#3B52F5]/60 hover:text-[#3B52F5]">
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
                  <button type="submit" disabled={isCreatingAlert} className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] hover:bg-[#3B52F5] px-4 text-[12px] font-black text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    {isCreatingAlert ? `${taCreate("submit")}...` : taCreate("submit")}
                  </button>
                </div>
              </form>
</ModalShell>

      {/* Filter Modal */}
      <ModalShell open={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} size="md" title={ta("filter.title")} description={ta("filter.desc")} footer={<><button type="button" onClick={() => { setSearchQuery(""); setSeverityFilter(""); setStatusFilter("unresolved"); setPage(1); }} className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#E6EAF2] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:border-[#F3B4B4] hover:bg-[#FFF7F7] hover:text-[#C81E1E]">
                {ta("filter.clearFilter")}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsFilterModalOpen(false)} className="h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-4 text-[12px] font-black text-[#53608C] transition hover:bg-[#F8FAFF]">
                  {ta("filter.cancel")}
                </button>
                <button type="button" onClick={() => setIsFilterModalOpen(false)} className="h-10 rounded-[10px] bg-[#465FFF] hover:bg-[#3B52F5] px-5 text-[12px] font-black text-white shadow-sm transition hover:opacity-90">
                  {ta("filter.apply")}
                </button>
              </div></>}>
<div className="space-y-4 p-5">
              <div className="rounded-[14px] border border-[#E6EAF2] bg-[#FBFCFF] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black text-[#101334]">{ta("table.severity")}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-[#647099]">{ta("filter.severityDesc")}</p>
                  </div>
                  {severityFilter ? <span className="rounded-full bg-[#465FFF]/10 px-2 py-1 text-[9px] font-black text-[#3B52F5]">{severityFilter}</span> : null}
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
                      className={cn("rounded-[10px] px-3 py-2 text-[11px] font-black transition", severityFilter === option.value ? "bg-[#465FFF] text-white shadow-sm" : "border border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6] hover:bg-[#F8FAFF]")}
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
                    <p className="mt-0.5 text-[10px] font-bold text-[#647099]">{ta("filter.statusDesc")}</p>
                  </div>
                  {statusFilter && statusFilter !== "unresolved" ? <span className="rounded-full bg-[#465FFF]/10 px-2 py-1 text-[9px] font-black text-[#3B52F5]">{statusFilter}</span> : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "unresolved", label: pickL("Needs work", "Belum selesai") },
                    { value: "", label: ta("filter.allStatus") },
                    { value: "open", label: ta("table.statusNew") },
                    { value: "acknowledged", label: ta("table.statusInvestigating") },
                    { value: "resolved", label: ta("table.statusResolved") },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setStatusFilter(option.value); setPage(1); }}
                      className={cn("rounded-[10px] px-3 py-2 text-[11px] font-black transition", statusFilter === option.value ? "bg-[#465FFF] text-white shadow-sm" : "border border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6] hover:bg-[#F8FAFF]")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
</ModalShell>
    </div>
  );
}
