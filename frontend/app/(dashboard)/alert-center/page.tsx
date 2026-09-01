"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Activity, AlertTriangle, ArrowUpRight, Clock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isDemoMode, getMockAlerts, getMockAlertsSummary } from "@/lib/demo-mock-data";
import { getAlerts, getAlertsSummary } from "@/lib/api-service";
import type { Alert, AlertsSummaryResponse } from "@/lib/api-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "Critical" | "High" | "Medium" | "Low";
type Status = "Open" | "Investigating" | "Acknowledged" | "Resolved";
type AlertType = "Risk" | "Opportunity" | "Positioning";

type AlertEntry = {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  type: AlertType;
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string;
  assignedTo: string;
  createdAt: string;
  signalCount: number;
  signalUnit: string;
};

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<Severity, { dot: string; badgeVariant: "red" | "amber" | "default" | "slate" }> = {
  Critical: { dot: "#EF4444", badgeVariant: "red" },
  High: { dot: "#F59E0B", badgeVariant: "amber" },
  Medium: { dot: "#465FFF", badgeVariant: "default" },
  Low: { dot: "#94A3B8", badgeVariant: "slate" },
};

const STATUS_STYLES: Record<Status, { badgeVariant: "red" | "amber" | "green" | "slate" | "default" }> = {
  Open: { badgeVariant: "red" },
  Investigating: { badgeVariant: "amber" },
  Acknowledged: { badgeVariant: "default" },
  Resolved: { badgeVariant: "green" },
};

const TYPE_STYLES: Record<AlertType, { bg: string; text: string }> = {
  Risk: { bg: "bg-red-50", text: "text-red-600" },
  Opportunity: { bg: "bg-green-50", text: "text-green-600" },
  Positioning: { bg: "bg-blue-50", text: "text-blue-600" },
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

// Adapter: map API Alert → local AlertEntry
function mapApiAlertToEntry(alert: Alert): AlertEntry {
  const sev = (alert.severity ?? "Medium") as Severity;
  const statusRaw = alert.status ?? "open";
  const statusMap: Record<string, Status> = {
    open: "Open",
    in_progress: "Investigating",
    acknowledged: "Acknowledged",
    resolved: "Resolved",
  };
  return {
    id: alert.id,
    title: alert.title,
    severity: sev,
    status: statusMap[statusRaw] ?? "Open",
    type: (alert.type ?? "Risk") as AlertType,
    whatHappened: alert.whatHappened ?? "",
    whyItMatters: alert.whyItMatters ?? "",
    whatToDo: alert.whatToDo ?? "",
    assignedTo: alert.assignedTo ?? "Unassigned",
    createdAt: alert.createdAt
      ? new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Unknown",
    signalCount: alert.sources?.length ?? 0,
    signalUnit: "signals",
  };
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

type SeverityFilter = Severity | "All";
type StatusFilter = Status | "All";

const SEVERITY_FILTERS: SeverityFilter[] = ["All", "Critical", "High", "Medium", "Low"];
const STATUS_FILTERS: (Status | "All")[] = ["All", "Open", "Investigating", "Acknowledged", "Resolved"];

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone: "red" | "amber" | "blue" | "purple";
}) {
  const toneClasses = {
    red: { icon: "text-red-500", bg: "bg-red-50" },
    amber: { icon: "text-amber-500", bg: "bg-amber-50" },
    blue: { icon: "text-blue-500", bg: "bg-blue-50" },
    purple: { icon: "text-purple-500", bg: "bg-purple-50" },
  };
  const tc = toneClasses[tone];

  return (
    <Card className="flex-1 min-w-[160px]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-[10px]", tc.bg)}>
          <Icon className={cn("h-5 w-5", tc.icon)} />
        </div>
        <div>
          <p className="text-[20px] font-bold text-[#101334]">{value}</p>
          <p className="text-[12px] text-[#68739F]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AlertCard
// ---------------------------------------------------------------------------

function AlertCard({ alert }: { alert: AlertEntry }) {
  const sev = SEVERITY_STYLES[alert.severity];
  const status = STATUS_STYLES[alert.status];
  const typeStyle = TYPE_STYLES[alert.type];

  const actionLabel =
    alert.status === "Open"
      ? alert.severity === "Critical" || alert.severity === "High"
        ? "Escalate"
        : "Investigate"
      : alert.status === "Investigating"
        ? "Escalate"
        : alert.status === "Acknowledged"
          ? "Resolve"
          : null;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Top row: title + badges */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug text-[#101334] pr-2 flex-1">
            {alert.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Badge variant={sev.badgeVariant} className="normal-case tracking-normal font-bold uppercase">
              {alert.severity}
            </Badge>
            <Badge variant={status.badgeVariant} className="normal-case tracking-normal font-bold uppercase">
              {alert.status}
            </Badge>
          </div>
        </div>

        {/* Type chip */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", typeStyle.bg, typeStyle.text)}>
            {alert.type}
          </span>
        </div>

        {/* What happened */}
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#68739F]">
            {("alertCenter.whatHappened")}
          </p>
          <p className="text-[13px] leading-relaxed text-[#101334]">{alert.whatHappened}</p>
        </div>

        {/* Why it matters */}
        <div className="mb-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#68739F]">
            {("alertCenter.whyItMatters")}
          </p>
          <p className="text-[13px] leading-relaxed text-[#68739F]">{alert.whyItMatters}</p>
        </div>

        {/* What to do */}
        <div className={cn("mb-3 rounded-[10px] border border-slate-200 bg-slate-50 p-3")}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#68739F]">
            {("alertCenter.whatToDo")}
          </p>
          <p className="text-[13px] leading-relaxed text-[#101334]">{alert.whatToDo}</p>
        </div>

        {/* Footer: meta + action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#68739F]">
            <span>
              <span className="font-medium text-[#101334]">{alert.assignedTo}</span>
            </span>
            <span>{alert.createdAt}</span>
            <span>
              <span className="font-semibold text-[#101334]">{alert.signalCount}</span>{" "}
              {alert.signalUnit}
            </span>
          </div>

          {actionLabel && (
            <button
              className={cn(
                "flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-[12px] font-bold transition-colors duration-150",
                alert.severity === "Critical"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : alert.severity === "High"
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-[#465FFF] text-white hover:bg-[#3a52e0]",
              )}
            >
              {actionLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AlertCenterPage() {
  const t = useTranslations();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [demoMode, setDemoMode] = useState(false);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [summary, setSummary] = useState<AlertsSummaryResponse | null>(null);

  // Load data based on demo mode
  useEffect(() => {
    const demo = isDemoMode();
    setDemoMode(demo);

    if (demo) {
      const mockAlerts = getMockAlerts();
      setAlerts(mockAlerts.map(mapApiAlertToEntry));
      const mockSummary = getMockAlertsSummary();
      setSummary(mockSummary);
    } else {
      Promise.all([
        getAlerts({ limit: 50 }),
        getAlertsSummary(),
      ]).then(([alertsResult, summaryResult]) => {
        if (alertsResult?.data) {
          setAlerts(alertsResult.data.map(mapApiAlertToEntry));
        }
        if (summaryResult) setSummary(summaryResult);
      }).catch(() => {
        // Fallback to mock on API failure
        setAlerts(getMockAlerts().map(mapApiAlertToEntry));
        setSummary(getMockAlertsSummary());
      });
    }
  }, []);

  const filtered = alerts.filter((a) => {
    const sevOk = severityFilter === "All" || a.severity === severityFilter;
    const statOk = statusFilter === "All" || a.status === statusFilter;
    return sevOk && statOk;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold text-[#101334]">
            {t("alertCenter.title")}
          </h1>
          {demoMode && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              DEMO
            </span>
          )}
        </div>

        {/* Severity filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#68739F]">
            {t("alertCenter.filterSeverity")}:
          </span>
          <div className="flex flex-wrap rounded-[10px] border border-slate-200 bg-white p-1 shadow-xs">
            {SEVERITY_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={cn(
                  "rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-all duration-150",
                  severityFilter === s
                    ? "bg-[#465FFF] text-white shadow-sm"
                    : "text-[#68739F] hover:bg-slate-50 hover:text-[#101334]",
                )}
              >
                {s === "All" ? t("alertCenter.all") : t(`alertCenter.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap rounded-[10px] border border-slate-200 bg-white p-1 shadow-xs">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-all duration-150",
                  statusFilter === s
                    ? "bg-[#465FFF] text-white shadow-sm"
                    : "text-[#68739F] hover:bg-slate-50 hover:text-[#101334]",
                )}
              >
                {s === "All" ? t("alertCenter.all") : t(`alertCenter.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          value={summary ? String(summary.by_status.open + summary.by_status.in_progress) : "—"}
          label={t("alertCenter.active")}
          tone="red"
        />
        <MetricCard
          icon={AlertTriangle}
          value={summary ? String(summary.by_severity.critical + summary.by_severity.high) : "—"}
          label={t("alertCenter.criticalThisWeek")}
          tone="amber"
        />
        <MetricCard
          icon={Clock}
          value={summary?.avg_response_time_minutes
            ? `${Math.round(summary.avg_response_time_minutes)}m`
            : "—"}
          label={t("alertCenter.avgResponse")}
          tone="blue"
        />
        <MetricCard
          icon={ShieldAlert}
          value={summary ? String(summary.escalated_count ?? 0) : "—"}
          label={t("alertCenter.escalated")}
          tone="purple"
        />
      </div>

      {/* Alert list */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 py-16">
          <p className="text-[14px] text-[#68739F]">No alerts match the current filters.</p>
        </div>
      )}
    </div>
  );
}
