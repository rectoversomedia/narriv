"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { MonoLabel } from "@/components/ui/stamp";
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
  const levelTone = (p: string) => (p === "critical" || p === "high" ? "bg-[#B42318] text-white" : p === "medium" ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#E5F6EE] text-[#047857]");

  // What a step's button does: start a plan, open a case, or nothing to start ("monitor").
  const runStep = (a: (typeof actions)[number]) => {
    if (STEP_STRATEGY[a.action]) setPlan(STEP_STRATEGY[a.action]);
    else if (a.action === "investigate") setInvestigate(a.reason);
  };
  const stepButton = (a: (typeof actions)[number]) => (STEP_STRATEGY[a.action] ? L("Create Action Plan", "Buat Rencana Aksi") : a.action === "investigate" ? L("Open Case", "Buka Kasus") : null);
  const first = actions.find((a) => stepButton(a));
  const band = risk ? risk.bar : "#C9D0E3";
  const today = new Date(data.generatedAt || Date.now()).toLocaleDateString(L("en-GB", "id-ID"), { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      {/* The verdict of the period: how risky, how the brand is seen, the numbers, and where to start. */}
      <section className={cn(BOX, "overflow-hidden !p-0")}>
        <div className="h-2" style={{ backgroundColor: band }} />
        <div className="p-5 sm:p-7">
          <MonoLabel>{L(`Brief · ${today} · last ${data.windowHours} hours`, `Briefing · ${today} · ${data.windowHours} jam terakhir`)}</MonoLabel>
          <h2 className="mt-3 max-w-4xl text-balance text-[26px] font-black leading-[1.18] tracking-[-0.03em] text-[#101334] sm:text-[32px]">
            {risk ? <>{L("Risk is ", "Risiko ")}<span style={{ color: risk.color }}>{L(...risk.word)}</span></> : L("Risk not scored yet", "Risiko belum dinilai")}
            {drivers[0] ? <>{L(", driven by ", ", didorong oleh ")}{L(...(DRIVER_LABELS[drivers[0].key] ?? [drivers[0].key, drivers[0].key])).toLowerCase()}</> : null}
            {repLook ? <>{L(". Reputation: ", ". Reputasi: ")}<span style={{ color: repLook.color }}>{L(...repLook.word)}</span>.</> : "."}
          </h2>

          <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: L("New Mentions", "Percakapan Baru"), value: newSignals === null ? "—" : String(newSignals), sub: L("in this period", "di periode ini"), color: "#101334" },
              { label: L("Active Alerts", "Peringatan Aktif"), value: activeAlerts === null ? String(newAlerts) : String(activeAlerts), sub: L(`${newAlerts} new in this window`, `${newAlerts} baru di periode ini`), color: (activeAlerts ?? newAlerts) ? "#B45309" : "#101334" },
              { label: L("Risk Index", "Indeks Risiko"), value: risk ? `${riskScore}` : "—", sub: risk ? `/100 · ${L(...risk.word)}` : L("not enough data", "data belum cukup"), color: risk?.color ?? "#5A6478", bar: risk ? riskScore : undefined, barColor: risk?.bar },
              { label: L("Reputation", "Reputasi"), value: repLook ? `${repScore}` : "—", sub: repLook ? `/100 · ${L(...repLook.word)}` : L("not enough data", "data belum cukup"), color: repLook?.color ?? "#5A6478", bar: repLook ? repScore : undefined, barColor: repLook?.bar },
            ].map((m) => (
              <div key={m.label} className="rounded-[14px] bg-[#F6F7FC] px-4 py-3.5">
                <dt className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]">{m.label}</dt>
                <dd className="mt-1 text-[30px] font-black leading-none tracking-[-0.03em]" style={{ color: m.color }}>{m.value}</dd>
                {typeof m.bar === "number" ? <div className="mt-2 h-1.5 w-full rounded-full bg-[#E3E7F1]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, m.bar))}%`, background: m.barColor }} /></div> : null}
                <dd className="mt-1.5 font-mono text-[11px] font-bold text-[#5F6B94]">{m.sub}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-col gap-2.5 rounded-[18px] bg-[#101334] p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="px-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF] sm:mr-2">{L("Start Here", "Mulai dari Sini")}</p>
            {first ? (
              <button type="button" onClick={() => runStep(first)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5] sm:w-auto">
                {code.action(first.action)}: {stepButton(first)}
              </button>
            ) : null}
            <Link href="/alerts" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-white/80 px-5 text-[14px] font-black text-white transition hover:bg-white/10 sm:w-auto">
              {(activeAlerts ?? 0) > 0 ? L(`Handle ${activeAlerts} Alerts`, `Tangani ${activeAlerts} Peringatan`) : L("Open Alerts", "Buka Peringatan")}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* The steps, numbered, each with the button that starts it. */}
        <section className={BOX}>
          <MonoLabel>{L("Do Today", "Kerjakan Hari Ini")}</MonoLabel>
          <h2 className="mt-1.5 text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("Suggested Next Steps", "Langkah yang Disarankan")}</h2>
          {actions.length === 0 ? (
            <p className="mt-4 text-[14px] font-semibold text-[#5A6478]">{L("No step suggested.", "Tidak ada langkah yang disarankan.")}</p>
          ) : (
            <ol className="mt-3 divide-y divide-[#EEF0F6]">
              {actions.slice(0, 6).map((a, i) => {
                const button = stepButton(a);
                const hot = a.priority === "critical" || a.priority === "high";
                return (
                  <li key={`${a.action}-${i}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-bold", hot ? "bg-[#101334] text-white" : "border-[1.5px] border-[#101334] text-[#101334]")}>{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[16px] font-black text-[#101334]">{code.action(a.action)}</span>
                          <span className={cn("rounded-[6px] px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em]", levelTone(a.priority))}>{code.level(a.priority)}</span>
                          <span className="rounded-[6px] bg-[#EEF1FF] px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#3B52F5]">{code.urgency(a.urgency)}</span>
                        </div>
                        <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#31406B]">{a.reason}</p>
                      </div>
                    </div>
                    {button ? (
                      <button type="button" onClick={() => runStep(a)} className={cn("h-10 w-full shrink-0 rounded-[12px] px-4 text-[13px] font-black text-white transition sm:w-auto", STEP_STRATEGY[a.action] ? "bg-[#465FFF] hover:bg-[#3B52F5]" : "bg-[#101334] hover:bg-[#1F2452]")}>{button}</button>
                    ) : (
                      <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#5F6B94] sm:pl-2">{L("Keep watching", "Pantau terus")}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="space-y-5">
          <section className={BOX}>
            <MonoLabel>{L("Why The Risk", "Kenapa Berisiko")}</MonoLabel>
            <h2 className="mt-1.5 text-[19px] font-black tracking-[-0.02em] text-[#101334]">{L("What Drives It", "Yang Mendorong Risiko")}</h2>
            {drivers.length === 0 ? (
              <p className="mt-3 text-[14px] font-semibold text-[#047857]">{L("No risk component is elevated.", "Tidak ada komponen risiko yang meningkat.")}</p>
            ) : (
              <ul className="mt-3 space-y-3.5">
                {drivers.map((d) => (
                  <li key={d.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-black text-[#101334]">{L(...(DRIVER_LABELS[d.key] ?? [d.key.replace(/_/g, " "), d.key.replace(/_/g, " ")]))}</span>
                      <span className="shrink-0 font-mono text-[13px] font-bold text-[#B42318]">+{Math.round(d.contribution * 10) / 10}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-[#EEF0F6]"><div className="h-full rounded-full bg-gradient-to-r from-[#465FFF] to-[#B42318]" style={{ width: `${(d.contribution / maxDriver) * 100}%` }} /></div>
                    <p className="mt-1 text-[12.5px] font-medium text-[#5F6B94]">{d.reason}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/insights" className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-[#3B52F5] hover:underline">{L("Full analysis", "Analisis lengkap")} <ArrowRight size={14} /></Link>
          </section>

          {emerging.length || watch.length ? (
            <section className="rounded-[18px] border-[1.5px] border-[#101334] bg-[#0B0F2E] p-5 text-white shadow-[0_4px_0_#465FFF] sm:p-6">
              {emerging.length ? (
                <>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#FBBF24]">{L("Gaining Momentum", "Sedang Naik")}</p>
                  <ul className="mt-2 space-y-1.5">
                    {emerging.slice(0, 3).map((i) => <li key={i.title} className="text-[15px] font-black leading-snug">{i.title}</li>)}
                  </ul>
                </>
              ) : null}
              {watch.length ? (
                <div className={cn(emerging.length && "mt-5 border-t border-white/10 pt-4")}>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF]">{L("Watch Next", "Pantau Berikutnya")}</p>
                  <ul className="mt-2 space-y-2">
                    {watch.map((w, i) => (
                      <li key={i} className="flex gap-2 text-[14px] font-semibold leading-snug text-white/85"><span className="text-[#A5B4FF]">→</span>{w.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
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
          <p className="mt-1 text-[14px] text-[#5F6B94]">{L("This period on one page: the verdict, what to do, and why.", "Periode ini dalam satu halaman: kesimpulan, yang perlu dikerjakan, dan alasannya.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          {/* The browser's print dialog (Save as PDF); nothing is sent anywhere. */}
          <button type="button" onClick={() => window.print()} className="h-10 rounded-[12px] bg-[#101334] px-5 text-[13px] font-bold text-white transition hover:bg-[#2B2F9E]">
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
