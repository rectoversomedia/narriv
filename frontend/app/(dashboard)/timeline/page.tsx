"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";
import { getAlerts, getActivityLogs } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "Critical" | "High" | "Medium" | "Low";

type TimelineEvent = {
  id: string;
  date: string;
  dateLabel: string;
  title: string;
  category: string;
  // Only a severity that was actually recorded (alerts); activity has none.
  severity: Severity | null;
  description: string;
  metrics: { label: string; value: string }[];
  source: string;
};

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<Severity, { dot: string; chipVariant: "red" | "amber" | "default" | "slate" }> = {
  Critical: { dot: "#EF4444", chipVariant: "red" },
  High: { dot: "#F59E0B", chipVariant: "amber" },
  Medium: { dot: "#465FFF", chipVariant: "default" },
  Low: { dot: "#94A3B8", chipVariant: "slate" },
};

// ---------------------------------------------------------------------------
// Event adapters
// ---------------------------------------------------------------------------

// Adapter: build TimelineEvent from an activity log entry
function buildEventFromActivity(entry: {
  id: string;
  event: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}): TimelineEvent {
  const date = new Date(entry.createdAt);
  return {
    id: entry.id,
    date: entry.createdAt.split("T")[0],
    dateLabel: date.toLocaleDateString(intlLocale(), { month: "short", day: "numeric" }),
    title: (entry.metadata?.title as string) ?? entry.event,
    category: (entry.metadata?.category as string) ?? "Activity",
    severity: null,
    description: (entry.metadata?.description as string) ?? `Event: ${entry.event}`,
    metrics: entry.metadata && Object.keys(entry.metadata).length > 2
      ? Object.entries(entry.metadata)
          .filter(([k]) => !["title", "category", "description"].includes(k))
          .slice(0, 3)
          .map(([k, v]) => ({ label: k, value: String(v) }))
      : [],
    source: entry.metadata?.source as string ?? "Narriv",
  };
}

// ---------------------------------------------------------------------------
// Date range filter config
// ---------------------------------------------------------------------------

type DateRange = "today" | "7d" | "30d" | "90d";

const DATE_RANGES: { key: DateRange; labelKey: string }[] = [
  { key: "today", labelKey: "timeline.filterToday" },
  { key: "7d", labelKey: "timeline.filter7d" },
  { key: "30d", labelKey: "timeline.filter30d" },
  { key: "90d", labelKey: "timeline.filter90d" },
];

// ---------------------------------------------------------------------------
// TimelineEntry
// ---------------------------------------------------------------------------

function TimelineEntry({ event }: { event: TimelineEvent }) {
  const t = useTranslations("timeline");
  const sev = event.severity ? SEVERITY_STYLES[event.severity] : { dot: "#94A3B8", chipVariant: "slate" as const };

  return (
    <div className="relative flex gap-4">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className="mt-[6px] h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: sev.dot }}
        />
        <div className="mt-1 w-px flex-1 bg-slate-200 last:hidden" />
      </div>

      {/* Card */}
      <div className="mb-4 flex-1 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        {/* Date + chips */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#5F6B94]">{event.dateLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {event.category}
          </span>
          {event.severity ? (
            <Badge variant={sev.chipVariant} className="normal-case tracking-normal font-bold uppercase">
              {event.severity}
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="mb-1.5 text-[16px] font-bold leading-snug text-[#101334]">
          {event.title}
        </h3>

        {/* Description */}
        <p className="mb-3 text-[13px] leading-relaxed text-[#5F6B94]">{event.description}</p>

        {/* Metrics row */}
        <div className="mb-3 flex flex-wrap gap-2">
          {event.metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1"
            >
              <span className="text-[11px] text-[#5F6B94]">{m.label}</span>
              <span className="text-[11px] font-bold text-[#101334]">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Source */}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="text-[11px] text-[#5F6B94]">{t("source", { source: event.source })}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TimelinePage() {
  const t = useTranslations();
  const [range, setRange] = useState<DateRange>("30d");
  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  // Load real API data: activity logs + alerts
  useEffect(() => {
    Promise.all([
      getActivityLogs({ limit: 50 }),
      getAlerts({ limit: 20 }),
    ]).then(([activityResult, alertsResult]) => {
      const activityEvents = (activityResult?.data ?? []).map(buildEventFromActivity);
      const alertEvents: TimelineEvent[] = (alertsResult?.data ?? []).map(alert => ({
        id: alert.id,
        date: alert.createdAt.split("T")[0],
        dateLabel: new Date(alert.createdAt).toLocaleDateString(intlLocale(), { month: "short", day: "numeric" }),
        title: alert.title,
        category: alert.type ?? "Alert",
        severity: alert.severity ? ((alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1).toLowerCase()) as Severity) : null,
        description: alert.whatHappened ?? alert.whyItMatters ?? "",
        metrics: [],
        source: "Narriv",
      }));
      // Merge and sort by date descending
      const merged = [...activityEvents, ...alertEvents].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      // Recorded events only; demo sessions see the demo workspace's own records.
      setEvents(merged);
      setLoadFailed(false);
    }).catch(() => {
      setEvents([]);
      setLoadFailed(true);
    });
  }, []);

  // The period buttons filter the recorded events by date.
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().split("T")[0];
  const visible = events.filter((e) => e.date >= cutoff);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">
            {t("timeline.title")}
          </h1>
          {isDemoSession && (
            <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-600">
              DEMO
            </span>
          )}
        </div>

        {/* Date range selector */}
        <div className="flex rounded-[10px] border border-slate-200 bg-white p-1 shadow-sm">
          {DATE_RANGES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                range === key
                  ? "bg-[#465FFF] text-white shadow-sm"
                  : "text-[#5F6B94] hover:bg-slate-50 hover:text-[#101334]",
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl">
        {visible.map((event) => (
          <TimelineEntry key={event.id} event={event} />
        ))}
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 px-4 py-16 text-center">
            <p className="text-[14px] text-[#5F6B94]">{loadFailed ? t("timeline.loadFailed") : t("timeline.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
