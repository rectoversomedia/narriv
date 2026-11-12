"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { useCodeLabels } from "@/components/intelligence/intelligence-panels";
import { useUiStore } from "@/store/useUiStore";
import type { ExecutiveBriefPayload } from "@/lib/intelligence-api";
import { getAlertsSummary, type ActionStrategyType } from "@/lib/api-service";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { CreateInvestigationModal } from "@/app/(dashboard)/signals/components/create-investigation-modal";

// Which plan a suggested step starts; "investigate" opens a case and "monitor" needs no button.
const STEP_STRATEGY: Record<string, ActionStrategyType> = {
  escalate_internal: "crisis_response",
  prepare_clarification: "pr_response",
  prepare_statement: "pr_response",
  brief_spokesperson: "stakeholder_update",
};

/**
 * Daily brief: the workspace's grounded executive brief in numbers first (new signals, new alerts, risk
 * index, reputation), then what drives the risk, the suggested steps and what to watch. Nothing here is
 * invented: every figure comes from the brief the backend computes from stored records.
 */

type DateRange = "today" | "last7days" | "last30days";
const WINDOW_HOURS: Record<DateRange, number> = { today: 24, last7days: 168, last30days: 720 };

function useL() {
  const language = useUiStore((state) => state.language);
  return (en: string, id: string) => (language === "id" ? id : en);
}

function DateRangeSelector({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const L = useL();
  const options: { value: DateRange; label: string }[] = [
    { value: "today", label: L("Last 24 hours", "24 jam terakhir") },
    { value: "last7days", label: L("Last 7 days", "7 hari terakhir") },
    { value: "last30days", label: L("Last 30 days", "30 hari terakhir") },
  ];
  return (
    <div className="relative inline-block">
      <select
        aria-label={L("Date range", "Rentang waktu")}
        value={value}
        onChange={(e) => onChange(e.target.value as DateRange)}
        className="h-10 cursor-pointer appearance-none rounded-full bg-white pl-4 pr-8 border-[1.5px] border-[#101334] shadow-[0_2px_0_#101334] text-[13px] font-bold text-[#101334] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30"
      >
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6478]" strokeWidth={2} />
    </div>
  );
}

type BriefDriver = { key: string; contribution: number; reason: string; evidenceIds?: string[] };
type EvidenceCount = { type?: string; count?: number };

const DRIVER_LABELS: Record<string, [string, string]> = {
  negative_share: ["Share of negative mentions", "Porsi percakapan negatif"],
  severity: ["Mentions rated high / critical", "Percakapan berbobot tinggi / kritis"],
  active_alerts: ["Alerts raised in this window", "Peringatan baru di periode ini"],
  volume_change: ["Volume spike", "Lonjakan volume"],
  narrative_momentum: ["Issue momentum", "Momentum isu"],
};

function riskLook(score: number) {
  if (score >= 70) return { color: "#9B1C1C", bar: "#C81E1E", word: ["Critical", "Kritis"] as [string, string] };
  if (score >= 50) return { color: "#C81E1E", bar: "#E5484D", word: ["High", "Tinggi"] as [string, string] };
  if (score >= 30) return { color: "#A04606", bar: "#F59E0B", word: ["Moderate", "Sedang"] as [string, string] };
  return { color: "#047857", bar: "#12A66A", word: ["Low", "Rendah"] as [string, string] };
}

function reputationLook(score: number) {
  if (score >= 70) return { color: "#047857", bar: "#12A66A", word: ["Healthy", "Sehat"] as [string, string] };
  if (score >= 45) return { color: "#A04606", bar: "#F59E0B", word: ["Watch", "Waspada"] as [string, string] };
  return { color: "#C81E1E", bar: "#E5484D", word: ["At risk", "Berisiko"] as [string, string] };
}

function Tile({ label, value, sub, rgb: _rgb, color, bar, barColor }: { label: string; value: string; sub: string; rgb: string; color: string; bar?: number; barColor?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
      <p className="text-[40px] font-black leading-none tracking-[-0.04em]" style={{ color: typeof bar === "number" ? color : "#101334" }}>{value}</p>
      <p className="mt-2 text-[13px] font-bold text-[#101334]">{label}</p>
      {typeof bar === "number" ? <div className="mt-3 h-2 w-full rounded-full bg-[#E8ECF6]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, bar))}%`, background: barColor }} /></div> : null}
      <p className="mt-2 text-[12px] font-bold" style={{ color: typeof bar === "number" ? color : "#5A6478" }}>{sub}</p>
    </div>
  );
}

function LiveBrief({ data }: { data: ExecutiveBriefPayload }) {
  const L = useL();
  const code = useCodeLabels();
  const sections = data.sections;
  const evidence = (sections.whatChanged as unknown as { evidence?: EvidenceCount[] }).evidence ?? [];
  const newSignals = evidence.find((e) => e.type === "signals_table_query")?.count ?? null;
  // New alerts are listed one by one in the evidence.
  const newAlerts = evidence.filter((e) => e.type === "alert").length;
  const riskScore = Number(/(\d+)\s*\/\s*100/.exec(sections.biggestRisk?.summary ?? "")?.[1] ?? NaN);
  const rep = sections.reputation as unknown as { score?: number | string };
  const repScore = Number(rep?.score ?? NaN);
  const risk = Number.isFinite(riskScore) ? riskLook(riskScore) : null;
  const repLook = Number.isFinite(repScore) ? reputationLook(repScore) : null;
  const drivers = ((sections.biggestRisk as unknown as { drivers?: BriefDriver[] }).drivers ?? []).filter((d) => d.contribution > 0).sort((a, b) => b.contribution - a.contribution);
  const maxDriver = Math.max(1, ...drivers.map((d) => d.contribution));
  const emerging = ((sections.emergingIssue as unknown as { items?: Array<{ title?: string }> }).items ?? []).filter((i) => i.title);
  const actions = sections.recommendedActions ?? [];
  const watch = sections.whatToWatchNext ?? [];
  const [plan, setPlan] = useState<ActionStrategyType | null>(null);
  const [investigate, setInvestigate] = useState<string | null>(null);
  // Same numbers as Early Warnings: active = not resolved, across all time.
  const alertsSummary = useQuery({ queryKey: ["brief-alerts-summary"], queryFn: () => getAlertsSummary(), staleTime: 30 * 1000 }).data;
  const activeAlerts = alertsSummary ? Math.max(0, (alertsSummary.total ?? 0) - (alertsSummary.by_status?.resolved ?? 0)) : null;
  const levelTone = (p: string) => (p === "critical" || p === "high" ? "bg-[#C81E1E] text-white" : p === "medium" ? "bg-[#F59E0B] text-white" : "bg-[#E5F6EE] text-[#047857]");

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <Tile label={L("New Mentions", "Percakapan Baru")} value={newSignals === null ? "—" : String(newSignals)} sub={L("in this period", "di periode ini")} rgb="70,95,255" color="#3B52F5" />
        <Tile label={L("Active Alerts", "Peringatan Aktif")} value={activeAlerts === null ? String(newAlerts) : String(activeAlerts)} sub={L(`${newAlerts} new in this window`, `${newAlerts} baru di periode ini`)} rgb={(activeAlerts ?? newAlerts) ? "245,158,11" : "100,116,139"} color={(activeAlerts ?? newAlerts) ? "#A04606" : "#5A6478"} />
        <Tile label={L("Risk Index", "Indeks Risiko")} value={risk ? `${riskScore}/100` : "—"} sub={risk ? L(...risk.word) : L("not enough data", "data belum cukup")} rgb="229,72,77" color={risk?.color ?? "#5A6478"} bar={risk ? riskScore : undefined} barColor={risk?.bar} />
        <Tile label={L("Reputation", "Reputasi")} value={repLook ? `${repScore}/100` : "—"} sub={repLook ? L(...repLook.word) : L("not enough data", "data belum cukup")} rgb={repLook && repScore >= 70 ? "18,166,106" : "229,72,77"} color={repLook?.color ?? "#5A6478"} bar={repLook ? repScore : undefined} barColor={repLook?.bar} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={BOX}>
          <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("What Drives the Risk", "Yang Mendorong Risiko")}</h2>
          <p className="mt-1 text-[11px] font-bold text-[#5A6478]">{L("Points added to the risk index", "Poin yang menambah indeks risiko")}</p>
          {drivers.length === 0 ? (
            <p className="mt-4 text-[13px] font-semibold text-[#047857]">{L("No risk component is elevated.", "Tidak ada komponen risiko yang meningkat.")}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {drivers.map((d) => (
                <div key={d.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px] font-black text-[#101334]">
                    <span>{L(...(DRIVER_LABELS[d.key] ?? [d.key.replace(/_/g, " "), d.key.replace(/_/g, " ")]))}</span>
                    <span className="text-[#C81E1E]">+{Math.round(d.contribution * 10) / 10}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-[#E8ECF6]"><div className="h-full rounded-full bg-[#E5484D]" style={{ width: `${(d.contribution / maxDriver) * 100}%` }} /></div>
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#5A6478]" title={d.reason}>{d.reason}</p>
                </div>
              ))}
            </div>
          )}
          {emerging.length ? (
            <div className="mt-6">
              <p className="inline-flex rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-black text-[#A04606]">{L("Gaining Momentum", "Sedang Naik")}</p>
              {emerging.slice(0, 3).map((i) => <p key={i.title} className="mt-2 text-[15px] font-black text-[#101334]">{i.title}</p>)}
            </div>
          ) : null}
        </section>

        <section className={BOX}>
          <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("Suggested Next Steps", "Langkah yang Disarankan")}</h2>
          {actions.length === 0 ? (
            <p className="mt-4 text-[13px] font-semibold text-[#5A6478]">{L("No step suggested.", "Tidak ada langkah yang disarankan.")}</p>
          ) : (
            <ol className="mt-4 divide-y divide-[#E6EAF2]">
              {actions.slice(0, 5).map((a, i) => (
                <li key={`${a.action}-${i}`} className="flex gap-3 py-3.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#101334] text-[12px] font-black text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[14px] font-black text-[#101334] first-letter:">{code.action(a.action)}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black", levelTone(a.priority))}>{code.level(a.priority)}</span>
                      <span className="rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[11px] font-black text-[#31406B]">{code.urgency(a.urgency)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-[#3A4566]">{a.reason}</p>
                  </div>
                  {STEP_STRATEGY[a.action] ? (
                    <button type="button" onClick={() => setPlan(STEP_STRATEGY[a.action])} className="h-9 shrink-0 self-center rounded-full bg-[#465FFF] px-4 text-[12.5px] font-bold text-white transition hover:bg-[#3B52F5]">{L("Create Action Plan", "Buat Rencana Aksi")}</button>
                  ) : a.action === "investigate" ? (
                    <button type="button" onClick={() => setInvestigate(a.reason)} className="h-9 shrink-0 self-center rounded-full bg-[#101334] px-4 text-[12.5px] font-bold text-white transition hover:bg-[#1F2452]">{L("Open Case", "Buka Kasus")}</button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {watch.length ? (
        <section className="rounded-[24px] bg-[#0B0F2E] px-6 py-7 text-white">
          <h2 className="text-[20px] font-black tracking-[-0.02em]">{L("What to Watch Next", "Yang Perlu Dipantau Berikutnya")}</h2>
          <ul className="mt-4 grid gap-x-10 gap-y-3 md:grid-cols-2">
            {watch.map((w, i) => (
              <li key={i} className="border-l-0 text-[14px] font-bold leading-snug text-white/85 before:mr-2 before:text-[#A5B4FF] before:content-['→']">
                {w.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <CreateActionPlanModal open={plan !== null} onOpenChange={(open) => { if (!open) setPlan(null); }} initialStrategyType={plan ?? undefined} />
      <CreateInvestigationModal open={investigate !== null} onOpenChange={(open) => { if (!open) setInvestigate(null); }} initialDescription={investigate ?? undefined} initialPriority="high" />
    </div>
  );
}

export default function DailyIntelligenceBriefPage() {
  const t = useTranslations("brief");
  const L = useL();
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const windowHours = WINDOW_HOURS[dateRange];
  const { data, isLoading, isError } = useQuery({
    queryKey: ["brief", "live", windowHours],
    queryFn: async () => (await import("@/lib/intelligence-api")).getExecutiveBrief(windowHours),
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <div className="flex flex-col gap-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em] text-[#101334]">{t("title")}</h1>
          <p className="mt-1 text-[13px] font-semibold text-[#5A6478]">{L("This period on one page.", "Periode ini dalam satu halaman.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          {/* The browser's print dialog (Save as PDF); nothing is sent anywhere. */}
          <button type="button" onClick={() => window.print()} className="h-10 rounded-full bg-[#101334] px-5 text-[13px] font-bold text-white transition hover:bg-[#2B2F9E]">
            {L("Print / Save as PDF", "Cetak / Simpan PDF")}
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[120px] animate-pulse rounded-[14px] bg-[#EEF1F7]" />)}</div>
      ) : isError || !data ? (
        <p className="rounded-[14px] bg-[#FDECEC] p-4 text-[13px] font-bold text-[#C81E1E]">{L("The brief could not be loaded. Try again in a moment.", "Ringkasan gagal dimuat. Coba lagi sebentar lagi.")}</p>
      ) : !data.grounded ? (
        <p className="py-8 text-[14px] font-semibold text-[#5A6478]">
          {L("There is not enough recent data in this workspace for a brief yet. It appears once sources and keywords have collected records.", "Data terbaru di workspace ini belum cukup untuk ringkasan. Ringkasan muncul setelah sumber dan kata kunci mengumpulkan data.")}
        </p>
      ) : (
        <LiveBrief data={data} />
      )}
    </div>
  );
}
