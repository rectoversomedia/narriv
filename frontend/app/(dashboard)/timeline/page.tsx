"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { getActivityLogs, getAlerts, type ActivityLogEntry, type Alert } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { StatStrip } from "@/components/ui/stamp";
import { intlLocale } from "@/store/useUiStore";

// Kronologi: how issues unfolded, day by day — alerts raised, cases opened, plans made, reports sent.
// Admin housekeeping (sign-ins, settings, keywords, members) stays in Riwayat aktivitas under Pengaturan.

type Kind = "alert" | "opportunity" | "case" | "plan" | "report";

const KIND: Record<Kind, { en: string; id: string; dot: string; chip: string }> = {
  alert: { en: "Alert", id: "Peringatan", dot: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]" },
  opportunity: { en: "Opportunity", id: "Peluang", dot: "#12A66A", chip: "bg-[#E8F7F0] text-[#047857]" },
  case: { en: "Case", id: "Kasus", dot: "#8B5CFF", chip: "bg-[#F3EEFF] text-[#5B33C9]" },
  plan: { en: "Plan", id: "Rencana", dot: "#F59E0B", chip: "bg-[#FEF6E4] text-[#B45309]" },
  report: { en: "Report", id: "Laporan", dot: "#465FFF", chip: "bg-[#EEF1FF] text-[#2B3FD6]" },
};

// The activity events that belong to an issue's story, with what happened in words a person would use.
// alert_created is left out: the alert itself is on the timeline with its full text.
const ISSUE_EVENTS: Record<string, { kind: Kind; en: string; id: string }> = {
  assignment_change: { kind: "alert", en: "Owner changed", id: "Penanggung jawab diganti" },
  escalation_change: { kind: "alert", en: "Escalation changed", id: "Eskalasi diubah" },
  alert_escalated_overdue: { kind: "alert", en: "Escalated: past its deadline", id: "Dieskalasi: lewat tenggat" },
  alert_escalated_unresolved_critical_risk: { kind: "alert", en: "Escalated: critical and unresolved", id: "Dieskalasi: kritis dan belum selesai" },
  case_created: { kind: "case", en: "Case opened", id: "Kasus dibuka" },
  case_updated: { kind: "case", en: "Case updated", id: "Kasus diperbarui" },
  action_plan_generated: { kind: "plan", en: "Response plan created", id: "Rencana respons dibuat" },
  multi_step_action_plan_generated: { kind: "plan", en: "Response plan created", id: "Rencana respons dibuat" },
  action_plan_status_change: { kind: "plan", en: "Plan moved forward", id: "Status rencana berubah" },
  report_created: { kind: "report", en: "Report created", id: "Laporan dibuat" },
  report_generated_from_template: { kind: "report", en: "Report created", id: "Laporan dibuat" },
  report_export_created: { kind: "report", en: "Report exported", id: "Laporan diekspor" },
  report_email_sent: { kind: "report", en: "Report emailed", id: "Laporan dikirim lewat email" },
};

const SEVERITY: Record<string, [string, string]> = { critical: ["Critical", "Kritis"], high: ["High", "Tinggi"], medium: ["Medium", "Sedang"], low: ["Low", "Rendah"] };

type Entry = { id: string; at: string; kind: Kind; label: string; title: string | null; detail: string | null; severity: string | null; href: string | null };

const RANGES = [
  { days: 1, label: ["Today", "Hari ini"] },
  { days: 7, label: ["7 days", "7 hari"] },
  { days: 30, label: ["30 days", "30 hari"] },
  { days: 90, label: ["90 days", "90 hari"] },
] as const;

function fromAlert(a: Alert, L: (en: string, id: string) => string): Entry {
  const opportunity = String(a.type).toLowerCase() === "opportunity";
  return {
    id: `alert-${a.id}`,
    at: a.createdAt,
    kind: opportunity ? "opportunity" : "alert",
    label: opportunity ? L("Opportunity flagged", "Peluang ditandai") : L("Alert raised", "Peringatan muncul"),
    title: a.title,
    detail: a.whatHappened ?? null,
    severity: a.severity ? String(a.severity).toLowerCase() : null,
    href: `/alerts/${a.id}`,
  };
}

function fromActivity(log: ActivityLogEntry, L: (en: string, id: string) => string): Entry | null {
  const known = ISSUE_EVENTS[log.event];
  if (!known) return null;
  const m = (log.metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof m[k] === "string" && m[k] ? String(m[k]) : null);
  const format = str("format");
  const alertId = str("alertId") ?? str("alert_id");
  return {
    id: log.id,
    at: log.createdAt,
    kind: known.kind,
    label: L(known.en, known.id),
    title: str("title") ?? str("name") ?? (format ? format.toUpperCase() : null),
    detail: log.user?.name ? L(`by ${log.user.name}`, `oleh ${log.user.name}`) : null,
    severity: null,
    href: known.kind === "case" ? "/workspace/cases" : known.kind === "plan" ? "/action-plans" : known.kind === "report" ? "/reports" : alertId ? `/alerts/${alertId}` : null,
  };
}

/** One event on the rail: mono time, a dot on the line, what happened and the thing it happened to. */
function Row({ entry, last }: { entry: Entry; last: boolean }) {
  const L = useL();
  const kind = KIND[entry.kind];
  const sev = entry.severity ? SEVERITY[entry.severity] : null;
  const hot = entry.kind === "alert" && (entry.severity === "critical" || entry.severity === "high");
  const time = new Date(entry.at).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" });
  const inner = (
    <>
      <span className="w-12 shrink-0 pt-1 font-mono text-[12px] font-bold tabular-nums text-[#5F6B94]">{time}</span>
      <span className="relative flex w-4 shrink-0 justify-center self-stretch" aria-hidden="true">
        {!last ? <span className="absolute bottom-[-14px] top-4 w-px bg-[#DDE2EE]" /> : null}
        <span className="relative mt-1.5 size-3 rounded-full border-2 border-white shadow-[0_0_0_1.5px_#101334]" style={{ backgroundColor: kind.dot }} />
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-[6px] px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em]", kind.chip)}>{L(kind.en, kind.id)}</span>
          <span className="text-[13px] font-bold text-[#31406B]">{entry.label}</span>
          {sev ? <span className={cn("rounded-[6px] px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em]", hot ? "bg-[#B42318] text-white" : "bg-[#F1F3F8] text-[#5F6B94]")}>{L(sev[0], sev[1])}</span> : null}
        </div>
        {entry.title ? <p className="mt-1.5 text-[16px] font-bold leading-snug text-[#101334] group-hover:text-[#3B52F5]">{entry.title}</p> : null}
        {entry.detail ? <p className="mt-0.5 line-clamp-2 text-[13.5px] text-[#5F6B94]">{entry.detail}</p> : null}
      </div>
      {entry.href ? (
        <span className="mt-1 hidden shrink-0 items-center gap-1 text-[12px] font-bold text-[#3B52F5] opacity-0 transition group-hover:opacity-100 sm:inline-flex">
          {L("Open", "Buka")} <ArrowRight size={14} aria-hidden="true" />
        </span>
      ) : null}
    </>
  );
  const cls = "group -mx-2 flex items-start gap-3 rounded-[12px] px-2 py-3 transition hover:bg-[#F7F8FC]";
  return entry.href ? <Link href={entry.href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

export default function TimelinePage() {
  const L = useL();
  const [days, setDays] = useState<number>(30);
  const [only, setOnly] = useState<Kind | null>(null);
  const activity = useQuery({ queryKey: ["timeline", "activity"], queryFn: () => getActivityLogs({ limit: 100 }) });
  const alerts = useQuery({ queryKey: ["timeline", "alerts"], queryFn: () => getAlerts({ limit: 100 }) });

  const entries = useMemo(() => {
    const list = [
      ...(alerts.data?.data ?? []).map((a) => fromAlert(a, L)),
      ...(activity.data?.data ?? []).map((log) => fromActivity(log, L)).filter((e): e is Entry => e !== null),
    ];
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [alerts.data, activity.data, L]);

  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  const visible = entries.filter((e) => new Date(e.at).getTime() >= cutoff);
  const count = (k: Kind) => visible.filter((e) => e.kind === k).length;
  const shown = only ? visible.filter((e) => e.kind === only) : visible;
  const byDay = shown.reduce<Array<{ day: string; items: Entry[] }>>((acc, e) => {
    const day = new Date(e.at).toLocaleDateString(intlLocale(), { weekday: "long", day: "numeric", month: "long" });
    const last = acc[acc.length - 1];
    if (last && last.day === day) last.items.push(e);
    else acc.push({ day, items: [e] });
    return acc;
  }, []);
  const loading = activity.isLoading || alerts.isLoading;
  const failed = !loading && !activity.data && !alerts.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Timeline", "Kronologi")}</h1>
          <p className="mt-1 text-[14px] text-[#5F6B94]">{L("When each issue appeared and what was done.", "Kapan isu muncul dan apa yang sudah dilakukan.")}</p>
        </div>
        <div className="flex self-start rounded-[12px] border-[1.5px] border-[#101334] bg-white p-1 shadow-[0_2px_0_#101334] sm:self-auto" role="group" aria-label={L("Period", "Periode")}>
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              aria-pressed={days === r.days}
              onClick={() => setDays(r.days)}
              className={cn("rounded-[7px] px-3 py-1.5 text-[12px] font-bold transition-colors", days === r.days ? "bg-[#101334] text-white" : "text-[#5F6B94] hover:bg-slate-50 hover:text-[#101334]")}
            >
              {L(r.label[0], r.label[1])}
            </button>
          ))}
        </div>
      </div>

      {/* The counts are the filters: click one to see only that kind, click it again for everything. */}
      <StatStrip
        stats={(["alert", "opportunity", "case", "plan", "report"] as Kind[]).map((k) => ({
          key: k,
          value: loading ? "…" : count(k),
          label: L(KIND[k].en, KIND[k].id),
          helper: only === k ? L("showing only these", "hanya ini yang tampil") : L("click to filter", "klik untuk menyaring"),
          tone: KIND[k].chip.replace(/\bbg-\S+/g, "").trim(),
          onClick: () => setOnly(only === k ? null : k),
          active: only === k,
        }))}
      />
      <div className={BOX}>
        {loading ? (
          <div className="space-y-2 p-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : byDay.length ? (
          byDay.map((group) => (
            <section key={group.day} className="mb-2 last:mb-0">
              <h2 className="sticky top-0 z-10 -mx-1 mb-1 mt-3 inline-flex rounded-[8px] border-[1.5px] border-[#101334] bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#101334] first:mt-0">{group.day}</h2>
              <div>{group.items.map((e, i) => <Row key={e.id} entry={e} last={i === group.items.length - 1} />)}</div>
            </section>
          ))
        ) : (
          <DashboardEmptyState
            icon="search"
            title={failed ? L("The timeline could not be loaded", "Kronologi gagal dimuat") : L("Nothing happened in this period", "Belum ada kejadian di periode ini")}
            description={failed ? L("Try again in a moment.", "Coba lagi sebentar lagi.") : L("Pick a longer period, or check back once alerts come in.", "Pilih periode yang lebih panjang, atau cek lagi setelah ada peringatan.")}
          />
        )}
      </div>
    </div>
  );
}
