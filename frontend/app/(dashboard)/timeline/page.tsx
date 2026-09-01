"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo-mock-data";
import { getAlerts, getActivityLogs } from "@/lib/api-service";

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
  severity: Severity;
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
// Demo data
// ---------------------------------------------------------------------------

// Adapter: build TimelineEvent from an activity log entry
function buildEventFromActivity(entry: {
  id: string;
  event: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}): TimelineEvent {
  const date = new Date(entry.createdAt);
  const severityMap: Record<string, Severity> = {
    created: "Medium",
    updated: "Low",
    deleted: "High",
    completed: "Low",
    escalated: "Critical",
  };
  return {
    id: entry.id,
    date: entry.createdAt.split("T")[0],
    dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    title: (entry.metadata?.title as string) ?? entry.event,
    category: (entry.metadata?.category as string) ?? "Activity",
    severity: severityMap[entry.event] ?? "Medium",
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
  const sev = SEVERITY_STYLES[event.severity];

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
      <div className="mb-4 flex-1 rounded-[14px] border border-slate-200 bg-white p-4 shadow-xs">
        {/* Date + chips */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#68739F]">{event.dateLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {event.category}
          </span>
          <Badge variant={sev.chipVariant} className="normal-case tracking-normal font-bold uppercase">
            {event.severity}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="mb-1.5 text-[16px] font-bold leading-snug text-[#101334]">
          {event.title}
        </h3>

        {/* Description */}
        <p className="mb-3 text-[13px] leading-relaxed text-[#68739F]">{event.description}</p>

        {/* Metrics row */}
        <div className="mb-3 flex flex-wrap gap-2">
          {event.metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1"
            >
              <span className="text-[11px] text-[#68739F]">{m.label}</span>
              <span className="text-[11px] font-bold text-[#101334]">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Source */}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="text-[11px] text-[#68739F]">Source: {event.source}</span>
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
  const [demoMode, setDemoMode] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // Load data based on demo mode
  useEffect(() => {
    const demo = isDemoMode();
    setDemoMode(demo);

    if (demo) {
      // Use demo EVENTS constant (hardcoded mock data for demo mode)
      const DEMO_EVENTS: TimelineEvent[] = [
        { id: "1", date: "2026-08-26", dateLabel: "Aug 26", title: "Viral complaint post on Twitter/X", category: "Competitor", severity: "Critical", description: "A viral complaint post on Twitter/X gained significant traction, amplified by 3 influencers in the financial space.", metrics: [{ label: "Impressions", value: "2,847 in 4h" }, { label: "Amplified by", value: "3 influencers" }], source: "Narriv AI" },
        { id: "2", date: "2026-08-25", dateLabel: "Aug 25", title: "New competitor campaign launched", category: "Competitor", severity: "High", description: "Bank Jago community banking push detected with elevated narrative momentum across fintech channels.", metrics: [{ label: "Narrative momentum", value: "+18%" }], source: "Signal detected" },
        { id: "3", date: "2026-08-24", dateLabel: "Aug 24", title: "AI visibility decline detected", category: "AI Visibility", severity: "Medium", description: "AI visibility score dropped from 78 to 72, with Gemini coverage declining by 8 percentage points.", metrics: [{ label: "Score drop", value: "78 → 72" }], source: "Narriv AI" },
        { id: "4", date: "2026-08-23", dateLabel: "Aug 23", title: "Positive sustainability narrative emerged", category: "Opportunity", severity: "Low", description: "Consumer discussion increasing around green finance and sustainable banking practices.", metrics: [{ label: "Trend direction", value: "Growing" }], source: "Narriv AI" },
        { id: "5", date: "2026-08-22", dateLabel: "Aug 22", title: "Pricing sensitivity narrative growing", category: "Reputation", severity: "High", description: "Discussions around pricing sensitivity growing rapidly in financial forums.", metrics: [{ label: "Mentions", value: "+34%" }], source: "Signal detected" },
        { id: "6", date: "2026-08-21", dateLabel: "Aug 21", title: "Media pickup: tech news feature", category: "Media", severity: "Medium", description: "3 articles published with positive framing around product features.", metrics: [{ label: "Articles", value: "3" }], source: "Narriv AI" },
        { id: "7", date: "2026-08-20", dateLabel: "Aug 20", title: "App update generates discussion spike", category: "Product", severity: "Medium", description: "Recent app update generated spike in social media mentions.", metrics: [{ label: "Mentions", value: "842" }], source: "Signal detected" },
        { id: "8", date: "2026-08-19", dateLabel: "Aug 19", title: "Competitor AI visibility surge", category: "AI Visibility", severity: "High", description: "Bank Jago appeared in 42% of relevant AI-generated responses.", metrics: [{ label: "AI share of voice", value: "42%" }], source: "Narriv AI" },
        { id: "9", date: "2026-08-18", dateLabel: "Aug 18", title: "Customer complaint cluster detected", category: "Crisis", severity: "High", description: "Service disruption narrative detected through clustering of critical signals.", metrics: [{ label: "Critical signals", value: "128" }], source: "Signal detected" },
        { id: "10", date: "2026-08-17", dateLabel: "Aug 17", title: "Influencer criticism amplifies", category: "Reputation", severity: "High", description: "3 fintech influencers shared negative posts targeting customer experience.", metrics: [{ label: "Influencers", value: "3" }], source: "Narriv AI" },
        { id: "11", date: "2026-08-15", dateLabel: "Aug 15", title: "New regulatory discussion detected", category: "Regulatory", severity: "Medium", description: "Government considering new fintech guidelines.", metrics: [{ label: "Status", value: "Under discussion" }], source: "Signal detected" },
        { id: "12", date: "2026-08-12", dateLabel: "Aug 12", title: "Campaign message penetration assessment", category: "Campaign", severity: "Low", description: "Campaign message penetration at 28% against 62% target.", metrics: [{ label: "Penetration", value: "28%" }], source: "Narriv AI" },
      ];
      setEvents(DEMO_EVENTS);
    } else {
      // Load real API data: activity logs + alerts
      Promise.all([
        getActivityLogs({ limit: 50 }),
        getAlerts({ limit: 20 }),
      ]).then(([activityResult, alertsResult]) => {
        const activityEvents = (activityResult?.data ?? []).map(buildEventFromActivity);
        const alertEvents: TimelineEvent[] = (alertsResult?.data ?? []).map(alert => ({
          id: alert.id,
          date: alert.createdAt.split("T")[0],
          dateLabel: new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          title: alert.title,
          category: alert.type ?? "Alert",
          severity: (alert.severity ?? "Medium") as Severity,
          description: alert.whatHappened ?? alert.whyItMatters ?? "",
          metrics: alert.severity ? [{ label: "Severity", value: alert.severity }] : [],
          source: "Narriv",
        }));
        // Merge and sort by date descending
        const merged = [...activityEvents, ...alertEvents].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEvents(merged);
      }).catch(() => {
        setEvents([]);
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold text-[#101334]">
            {t("timeline.title")}
          </h1>
          {demoMode && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              DEMO
            </span>
          )}
        </div>

        {/* Date range selector */}
        <div className="flex rounded-[10px] border border-slate-200 bg-white p-1 shadow-xs">
          {DATE_RANGES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                range === key
                  ? "bg-[#465FFF] text-white shadow-sm"
                  : "text-[#68739F] hover:bg-slate-50 hover:text-[#101334]",
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl">
        {events.map((event) => (
          <TimelineEntry key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 py-16">
            <p className="text-[14px] text-[#68739F]">No timeline events found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
