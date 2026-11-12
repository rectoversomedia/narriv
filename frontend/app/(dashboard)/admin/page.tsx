"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, ChevronRight, Loader2, Mail, MapPin, Pause, Play, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useToast } from "@/components/ui/toast";
import { backfillAdminRegions, getAdminMe, seedAdminDemo, getAdminWorkspaces, sendAdminTestEmail, updateAdminWorkspace, type AdminWorkspace, type AdminWorkspacePatch, type BillingStatus, type WorkspacePlanKey } from "@/lib/api-service";
import { timeAgo } from "@/lib/intelligence-api";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

// The Narriv team's admin panel: every client, their plan and trial, what they use and cost, and the switches the
// team controls. The backend refuses everyone who is not in PLATFORM_ADMIN_EMAILS.

const PLANS: Array<{ key: WorkspacePlanKey; en: string; id: string }> = [
  { key: "trial", en: "Trial", id: "Uji coba" },
  { key: "pilot", en: "Pilot", id: "Pilot" },
  { key: "intelligence", en: "Intelligence", id: "Intelligence" },
  { key: "decision", en: "Decision", id: "Decision" },
  { key: "command", en: "Command", id: "Command" },
];
const SOCIAL = ["instagram", "tiktok", "x", "facebook"] as const;
const PLAN_KEYWORDS: Record<WorkspacePlanKey, number> = { trial: 3, pilot: 3, intelligence: 10, decision: 25, command: 50 };
const BILLING: Array<{ key: BillingStatus; en: string; id: string }> = [
  { key: "none", en: "Not set", id: "Belum diatur" },
  { key: "paid", en: "Paid", id: "Lunas" },
  { key: "due", en: "Due", id: "Jatuh tempo" },
  { key: "overdue", en: "Overdue", id: "Terlambat" },
];
const SOCIAL_NAME: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", x: "X", facebook: "Facebook" };

type Filter = "all" | "trial" | "soon" | "expired" | "paid" | "social" | "paused";

// Costs are stored in US dollars (what the providers bill) and shown in rupiah at the server's rate.
let RATE = 18500;
const rp = (usdAmount: number) => {
  const idr = usdAmount * RATE;
  if (idr > 0 && idr < 1) return "<Rp1";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(idr);
};
const usd = rp;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(intlLocale(), { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Plan pill: trial shows days left, a lapsed trial is red, a paid plan is green; no plan set is grey. */
function PlanPill({ w }: { w: AdminWorkspace }) {
  const L = useL();
  if (w.isDemo) return <span className="whitespace-nowrap rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[11px] font-black text-[#3B52F5]">Demo</span>;
  if (w.plan === "trial") {
    if (w.trialExpired) return <span className="whitespace-nowrap rounded-full bg-[#FDECEC] px-2.5 py-1 text-[11px] font-black text-[#B42318]">{L("Trial ended", "Uji coba habis")}</span>;
    const soon = (w.trialDaysLeft ?? 99) <= 3;
    return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black", soon ? "bg-[#FEF6E4] text-[#B45309]" : "bg-[#EEF1FF] text-[#3B52F5]")}>{L(`Trial · ${w.trialDaysLeft} days left`, `Uji coba · ${w.trialDaysLeft} hari lagi`)}</span>;
  }
  if (w.plan) {
    const p = PLANS.find((x) => x.key === w.plan);
    return <span className="whitespace-nowrap rounded-full bg-[#E8F7F0] px-2.5 py-1 text-[11px] font-black text-[#047857]">{p ? L(p.en, p.id) : w.plan}</span>;
  }
  return <span className="whitespace-nowrap rounded-full bg-[#F1F3F8] px-2.5 py-1 text-[11px] font-black text-[#5F6B94]">{L("No plan", "Belum ada paket")}</span>;
}

function MonitoringState({ w }: { w: AdminWorkspace }) {
  const L = useL();
  const [dot, text] = w.monitoringPaused
    ? ["bg-[#F59E0B]", L("Paused", "Dijeda")]
    : w.trialExpired
      ? ["bg-[#E5484D]", L("Stopped", "Berhenti")]
      : w.keywords
        ? ["bg-[#22C55E]", L("Running", "Berjalan")]
        : ["bg-[#B8BED6]", L("No keywords", "Tanpa kata kunci")];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#31406B]">
      <span className={cn("size-2 rounded-full", dot)} aria-hidden="true" />
      {text}
    </span>
  );
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", on ? "bg-[#465FFF]" : "bg-[#D6DDEC]")}
    >
      <span className={cn("inline-block size-4 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

/** The side panel (a bottom sheet on phones) for one workspace's plan, trial, monitoring and social collection. */
function WorkspacePanel({ w, socialCapUsd, onClose }: { w: AdminWorkspace; socialCapUsd: number; onClose: () => void }) {
  const L = useL();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState<WorkspacePlanKey | null>(w.plan);
  const [trialEnd, setTrialEnd] = useState(w.trialEndsAt ? w.trialEndsAt.slice(0, 10) : "");
  const [paused, setPaused] = useState(w.monitoringPaused);
  const [socialOn, setSocialOn] = useState(w.social.enabled);
  const [platforms, setPlatforms] = useState<string[]>(w.social.platforms.filter((p) => (SOCIAL as readonly string[]).includes(p)));
  const [cap, setCap] = useState(String(Math.round(w.social.monthlyCapUsd * RATE)));
  const [crisis, setCrisis] = useState(w.social.crisisMode);
  const [kwOverride, setKwOverride] = useState(w.keywordLimitOverride === null ? "" : String(w.keywordLimitOverride));
  const [billStatus, setBillStatus] = useState<BillingStatus>(w.billing?.status ?? "none");
  const [billDate, setBillDate] = useState(w.billing?.nextInvoiceAt ? w.billing.nextInvoiceAt.slice(0, 10) : "");
  const [billNote, setBillNote] = useState(w.billing?.note ?? "");

  const addDays = (days: number) => {
    const base = trialEnd ? new Date(`${trialEnd}T00:00:00`) : new Date();
    const from = base.getTime() < Date.now() ? new Date() : base;
    setTrialEnd(new Date(from.getTime() + days * 86400000).toISOString().slice(0, 10));
    setPlan("trial");
  };

  const patch = useMemo<AdminWorkspacePatch>(() => {
    const p: AdminWorkspacePatch = {};
    if (plan && plan !== w.plan) p.plan = plan;
    if (plan === "trial") {
      const iso = trialEnd ? new Date(`${trialEnd}T23:59:00+07:00`).toISOString() : null;
      if (iso && iso.slice(0, 10) !== (w.trialEndsAt ?? "").slice(0, 10)) p.trialEndsAt = iso;
    }
    if (paused !== w.monitoringPaused) p.monitoringPaused = paused;
    const capNum = Number((Number(cap) / RATE).toFixed(2));
    const social: NonNullable<AdminWorkspacePatch["social"]> = {};
    if (socialOn !== w.social.enabled) social.enabled = socialOn;
    if (platforms.length && platforms.slice().sort().join() !== w.social.platforms.filter((x) => (SOCIAL as readonly string[]).includes(x)).sort().join()) social.platforms = platforms;
    if (Number.isFinite(capNum) && capNum !== w.social.monthlyCapUsd) social.monthlyCapUsd = capNum;
    if (crisis !== w.social.crisisMode) social.crisisMode = crisis;
    if (Object.keys(social).length) p.social = social;
    const kw = kwOverride.trim() === "" ? null : Number(kwOverride);
    if (kw !== w.keywordLimitOverride && (kw === null || (Number.isInteger(kw) && kw >= 1 && kw <= 50))) p.keywordLimit = kw;
    const billing: NonNullable<AdminWorkspacePatch["billing"]> = {};
    if (billStatus !== (w.billing?.status ?? "none")) billing.status = billStatus;
    const billIso = billDate ? new Date(`${billDate}T09:00:00+07:00`).toISOString() : null;
    if ((billIso ?? "").slice(0, 10) !== (w.billing?.nextInvoiceAt ?? "").slice(0, 10)) billing.nextInvoiceAt = billIso;
    if (billNote.trim() !== (w.billing?.note ?? "")) billing.note = billNote.trim();
    if (Object.keys(billing).length) p.billing = billing;
    return p;
  }, [plan, trialEnd, paused, socialOn, platforms, cap, crisis, kwOverride, billStatus, billDate, billNote, w]);
  const dirty = Object.keys(patch).length > 0;
  const capInvalid = !Number.isFinite(Number(cap)) || Number(cap) < 0 || Number(cap) / RATE > socialCapUsd + 0.005;
  const kwInvalid = kwOverride.trim() !== "" && !(Number.isInteger(Number(kwOverride)) && Number(kwOverride) >= 1 && Number(kwOverride) <= 50);
  const planKeywords = plan ? PLAN_KEYWORDS[plan] : 3;

  const save = useMutation({
    mutationFn: () => updateAdminWorkspace(w.id, patch),
    onSuccess: () => {
      toast.success(L("Saved.", "Tersimpan."));
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Could not save.", "Gagal menyimpan.")),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const section = "rounded-2xl bg-[#F5F7FF] p-4";
  // Portalled to <body> so it sits above the top bar, the phone menu and the Ask Narriv button.
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-end bg-[#0B0E2A]/40 sm:items-stretch" role="dialog" aria-modal="true" aria-labelledby="ws-panel-title" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-20px_60px_rgba(8,10,40,0.3)] sm:max-h-none sm:max-w-[460px] sm:rounded-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] px-5 pb-5 pt-5 text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-[#A5B4FF]">{L("Client workspace", "Workspace klien")}</p>
            <h2 id="ws-panel-title" className="mt-1 truncate text-[22px] font-black">{w.name}</h2>
            <p className="mt-0.5 truncate text-[13px] font-medium text-white/65">{w.owner?.email || L("No owner", "Tanpa pemilik")} · {L("since", "sejak")} {fmtDate(w.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={L("Close", "Tutup")} className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/10 hover:bg-white/20"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-4 gap-2 px-5 pt-4">
          {[
            { v: w.keywords, l: L("keywords", "kata kunci") },
            { v: w.signals30d, l: L("data, 30d", "data, 30h") },
            { v: w.openAlerts, l: L("open alerts", "peringatan") },
            { v: usd(w.aiCostMonth), l: L("AI this month", "AI bulan ini") },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-[#F5F7FF] px-2 py-2.5 text-center">
              <p className="text-[17px] font-black leading-none">{s.v}</p>
              <p className="mt-1 text-[11px] font-semibold leading-tight text-[#5F6B94]">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <section className={section} aria-labelledby="plan-h">
            <h3 id="plan-h" className="text-[13px] font-black text-[#101334]">{L("Plan", "Paket")}</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={plan === p.key}
                  onClick={() => { setPlan(p.key); if (p.key === "trial" && !trialEnd) addDays(14); }}
                  className={cn("rounded-full px-3 py-1.5 text-[13px] font-bold transition", plan === p.key ? "bg-[#465FFF] text-white shadow-[0_3px_8px_rgba(70,95,255,0.3)]" : "bg-white text-[#31406B] shadow-sm hover:text-[#101334]")}
                >
                  {L(p.en, p.id)}
                </button>
              ))}
            </div>
            {plan === "trial" ? (
              <div className="mt-3.5">
                <label htmlFor="trial-end" className="flex items-center gap-1.5 text-[12px] font-bold text-[#5F6B94]"><CalendarClock size={14} aria-hidden="true" /> {L("Trial ends", "Uji coba berakhir")}</label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input id="trial-end" type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} className="h-10 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#101334] shadow-sm outline-none focus:ring-2 focus:ring-[#465FFF]/30" />
                  <button type="button" onClick={() => addDays(7)} className="h-10 rounded-[10px] bg-white px-3 text-[13px] font-bold text-[#31406B] shadow-sm hover:text-[#101334]">+7 {L("days", "hari")}</button>
                  <button type="button" onClick={() => addDays(14)} className="h-10 rounded-[10px] bg-white px-3 text-[13px] font-bold text-[#31406B] shadow-sm hover:text-[#101334]">+14 {L("days", "hari")}</button>
                </div>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#5F6B94]">{L("When the trial ends, hourly monitoring and social collection stop for this client until you choose a paid plan or extend.", "Saat uji coba berakhir, pemantauan tiap jam dan media sosial berhenti untuk klien ini sampai Anda memilih paket berbayar atau memperpanjang.")}</p>
              </div>
            ) : null}
          </section>

          <section className={cn(section, "flex items-center justify-between gap-4")}>
            <div>
              <h3 className="text-[13px] font-black text-[#101334]">{L("Monitoring", "Pemantauan")}</h3>
              <p className="mt-0.5 text-[12px] font-medium text-[#5F6B94]">{paused ? L("Paused: no news, YouTube or social collection.", "Dijeda: berita, YouTube, dan media sosial tidak diambil.") : L("Running every hour.", "Berjalan tiap jam.")}</p>
            </div>
            <Toggle on={!paused} onChange={(v) => setPaused(!v)} label={L("Monitoring on", "Pemantauan aktif")} />
          </section>

          <section className={section} aria-labelledby="kw-h">
            <h3 id="kw-h" className="text-[13px] font-black text-[#101334]">{L("Keywords checked hourly", "Kata kunci dicek tiap jam")}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                aria-label={L("Custom limit", "Batas khusus")}
                inputMode="numeric"
                value={kwOverride}
                onChange={(e) => setKwOverride(e.target.value)}
                placeholder={String(planKeywords)}
                className={cn("h-10 w-20 rounded-[10px] bg-white px-3 text-[14px] font-bold text-[#101334] shadow-sm outline-none focus:ring-2", kwInvalid ? "ring-2 ring-[#E5484D]/40" : "focus:ring-[#465FFF]/30")}
              />
              <span className="text-[12px] font-medium text-[#5F6B94]">{L(`Plan default ${planKeywords}. Leave empty to follow the plan (max 50).`, `Bawaan paket ${planKeywords}. Kosongkan untuk mengikuti paket (maks 50).`)}</span>
            </div>
          </section>

          <section className={section} aria-labelledby="bill-h">
            <h3 id="bill-h" className="text-[13px] font-black text-[#101334]">{L("Billing", "Tagihan")}</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {BILLING.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  aria-pressed={billStatus === b.key}
                  onClick={() => setBillStatus(b.key)}
                  className={cn("rounded-full px-3 py-1.5 text-[13px] font-bold transition", billStatus === b.key ? (b.key === "overdue" ? "bg-[#B42318] text-white" : b.key === "due" ? "bg-[#B45309] text-white" : b.key === "paid" ? "bg-[#047857] text-white" : "bg-[#465FFF] text-white") : "bg-white text-[#31406B] shadow-sm")}
                >
                  {L(b.en, b.id)}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
              <label className="flex flex-col gap-1 text-[12px] font-bold text-[#5F6B94]">
                {L("Next invoice", "Invoice berikutnya")}
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="h-10 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#101334] shadow-sm outline-none focus:ring-2 focus:ring-[#465FFF]/30" />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-bold text-[#5F6B94]">
                {L("Note", "Catatan")}
                <input value={billNote} maxLength={300} onChange={(e) => setBillNote(e.target.value)} placeholder={L("e.g. INV-2026-011, Rp25.000.000", "mis. INV-2026-011, Rp25.000.000")} className="h-10 rounded-[10px] bg-white px-3 text-[14px] font-semibold text-[#101334] shadow-sm outline-none focus:ring-2 focus:ring-[#465FFF]/30" />
              </label>
            </div>
          </section>

          <section className={section} aria-labelledby="social-h">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 id="social-h" className="text-[13px] font-black text-[#101334]">{L("Social media", "Media sosial")}</h3>
                <p className="mt-0.5 text-[12px] font-medium text-[#5F6B94]">{L(`This month ${usd(w.social.spendUsd)} of ${usd(w.social.monthlyCapUsd)}`, `Bulan ini ${usd(w.social.spendUsd)} dari ${usd(w.social.monthlyCapUsd)}`)}</p>
              </div>
              <Toggle on={socialOn} onChange={setSocialOn} label={L("Social media on", "Media sosial aktif")} />
            </div>
            <div className={cn("mt-3 space-y-3", !socialOn && "opacity-50")}>
              <div className="flex flex-wrap gap-1.5">
                {SOCIAL.map((p) => {
                  const on = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={!socialOn}
                      aria-pressed={on}
                      onClick={() => setPlatforms((cur) => (on ? (cur.length > 1 ? cur.filter((x) => x !== p) : cur) : [...cur, p]))}
                      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold transition", on ? "bg-white text-[#101334] shadow-[0_0_0_2px_#465FFF]" : "bg-white/70 text-[#5F6B94]")}
                    >
                      <PlatformIcon platform={p} className="size-4" />
                      {SOCIAL_NAME[p]}
                      {on ? <Check size={13} strokeWidth={3} className="text-[#465FFF]" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="cap" className="text-[12px] font-bold text-[#5F6B94]">{L("Monthly cap (Rp)", "Batas per bulan (Rp)")}</label>
                <input id="cap" inputMode="decimal" value={cap} disabled={!socialOn} onChange={(e) => setCap(e.target.value)} className={cn("h-10 w-32 rounded-[10px] bg-white px-3 text-[14px] font-bold text-[#101334] shadow-sm outline-none focus:ring-2", capInvalid ? "ring-2 ring-[#E5484D]/40" : "focus:ring-[#465FFF]/30")} />
                <span className="text-[12px] font-medium text-[#5F6B94]">{L(`max ${usd(socialCapUsd)} across all clients`, `maks ${usd(socialCapUsd)} untuk semua klien`)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[12px] font-medium leading-relaxed text-[#5F6B94]">{L("Crisis mode: 3 rounds a day while a critical alert is open.", "Mode krisis: 3 kali sehari selama ada peringatan kritis.")}</p>
                <Toggle on={crisis} onChange={setCrisis} disabled={!socialOn} label={L("Crisis mode", "Mode krisis")} />
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 bg-white px-5 py-4 shadow-[0_-1px_0_#EEF1F6]">
          <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-[14px] font-bold text-[#31406B] hover:bg-[#F5F7FF]">{L("Cancel", "Batal")}</button>
          <button
            type="button"
            disabled={!dirty || capInvalid || kwInvalid || save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#465FFF] px-5 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(70,95,255,0.35)] transition hover:bg-[#3B52F5] disabled:opacity-50 disabled:shadow-none"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {L("Save changes", "Simpan perubahan")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Sends the two client emails (weekly report with PDF, critical alert) to one inbox, to check delivery works. */
/**
 * Fills a demo case's workspace now (brand, government, CVE); the nightly refresh keeps them current afterwards.
 * Only the demo workspaces are written.
 */
function DemoSeedCard() {
  const L = useL();
  const toast = useToast();
  const seed = useMutation({
    mutationFn: (scenario: "brand" | "gov" | "cve") => seedAdminDemo(scenario),
    onSuccess: (r) => toast.showToast({ title: L("Demo ready", "Demo siap"), description: L(`${r.scenario}: ${r.signals} mentions, ${r.alerts} alerts, ${r.reports} reports.`, `${r.scenario}: ${r.signals} percakapan, ${r.alerts} peringatan, ${r.reports} laporan.`), tone: "success" }),
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Seeding failed.", "Pengisian gagal."), L("Demo not filled", "Demo belum terisi")),
  });
  const cases: Array<["brand" | "gov" | "cve", string]> = [["brand", L("Brand", "Brand")], ["gov", L("Government", "Pemerintahan")], ["cve", "CVE"]];
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-white p-4 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.07)] sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EEF1FF] text-[#465FFF]"><RefreshCw size={18} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-black">{L("Fill demo cases", "Isi demo per kasus")}</p>
          <p className="text-[12px] font-medium text-[#5F6B94]">{L("Resets a demo workspace with fresh fictional data. Refreshed nightly anyway.", "Mengisi ulang workspace demo dengan data fiktif terbaru. Tetap diperbarui otomatis tiap malam.")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cases.map(([key, label]) => (
          <button key={key} type="button" disabled={seed.isPending} onClick={() => seed.mutate(key)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#465FFF] px-4 text-[14px] font-bold text-white disabled:opacity-50">
            {seed.isPending && seed.variables === key ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Fills in the province of records stored before region detection, batch by batch, showing the count as it goes.
 * The demo workspace is skipped by the API; running it again only touches records whose province is still missing.
 */
function RegionBackfillCard() {
  const L = useL();
  const toast = useToast();
  const [state, setState] = useState<{ running: boolean; processed: number; updated: number }>({ running: false, processed: 0, updated: 0 });
  async function run() {
    setState({ running: true, processed: 0, updated: 0 });
    let offset = 0;
    let processed = 0;
    let updated = 0;
    try {
      for (;;) {
        const r = await backfillAdminRegions(offset);
        processed += r.processed;
        updated += r.updated;
        offset = r.nextOffset;
        setState({ running: !r.done, processed, updated });
        if (r.done) break;
      }
      toast.showToast({ title: L("Regions filled in", "Wilayah terisi"), description: L(`${updated} of ${processed} records now carry their province.`, `${updated} dari ${processed} percakapan kini punya provinsi.`), tone: "success" });
    } catch (e) {
      setState((s) => ({ ...s, running: false }));
      toast.error(e instanceof Error ? e.message : L("The server stopped the run.", "Server menghentikan proses."), L("Region fill stopped", "Pengisian wilayah berhenti"));
    }
  }
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-white p-4 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.07)] sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EEF1FF] text-[#465FFF]"><MapPin size={18} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-black">{L("Fill in regions for older records", "Isi wilayah untuk data lama")}</p>
          <p className="text-[12px] font-medium text-[#5F6B94]">
            {state.processed > 0
              ? L(`${state.processed} records read, ${state.updated} given a province${state.running ? "…" : "."}`, `${state.processed} percakapan dibaca, ${state.updated} diberi provinsi${state.running ? "…" : "."}`)
              : L("Reads each stored mention and records the province it is about. New mentions get this automatically. The demo is not touched.", "Membaca setiap percakapan yang tersimpan dan mencatat provinsi yang dibicarakan. Percakapan baru otomatis terisi. Data demo tidak diubah.")}
          </p>
        </div>
      </div>
      <button type="button" onClick={run} disabled={state.running} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#465FFF] px-4 text-[14px] font-bold text-white disabled:opacity-50">
        {state.running ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
        {state.running ? L("Filling in…", "Mengisi…") : L("Fill in", "Isi sekarang")}
      </button>
    </section>
  );
}

function TestEmailCard() {
  const L = useL();
  const toast = useToast();
  const [to, setTo] = useState("");
  const send = useMutation({
    mutationFn: () => sendAdminTestEmail(to.trim()),
    onSuccess: (r) => {
      const ok = r.report === "sent" && r.alert === "sent";
      toast.showToast({
        title: ok ? L("Test emails sent", "Email tes terkirim") : L("Not everything was sent", "Tidak semua terkirim"),
        description: L(`Report: ${r.report} · alert: ${r.alert}. Check ${to.trim()}, including spam.`, `Laporan: ${r.report} · peringatan: ${r.alert}. Cek ${to.trim()}, termasuk folder spam.`),
        tone: ok ? "success" : "error",
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("The email provider rejected the request.", "Penyedia email menolak permintaan."), L("Sending failed", "Gagal mengirim")),
  });
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim());
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-white p-4 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.07)] sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EEF1FF] text-[#465FFF]"><Mail size={18} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-black">{L("Check email delivery", "Cek pengiriman email")}</p>
          <p className="text-[12px] font-medium text-[#5F6B94]">{L("Sends a sample weekly report (PDF) and a critical alert, the way clients get them.", "Mengirim contoh laporan mingguan (PDF) dan peringatan kritis, persis seperti yang diterima klien.")}</p>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (valid && !send.isPending) send.mutate(); }}
      >
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={L("name@company.com", "nama@perusahaan.com")}
          aria-label={L("Send to", "Kirim ke")}
          className="h-11 min-w-0 flex-1 rounded-xl bg-[#F5F7FF] px-3.5 text-[14px] font-semibold outline-none placeholder:text-[#8A93B5] focus:shadow-[0_0_0_2px_#8EA0FF] sm:w-[260px]"
        />
        <button type="submit" disabled={!valid || send.isPending} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#465FFF] px-4 text-[14px] font-bold text-white disabled:opacity-50">
          {send.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {L("Send", "Kirim")}
        </button>
      </form>
    </section>
  );
}

export default function AdminPage() {
  const L = useL();
  const toast = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["admin", "me"], queryFn: getAdminMe, staleTime: 5 * 60 * 1000 });
  const list = useQuery({ queryKey: ["admin", "workspaces"], queryFn: getAdminWorkspaces, enabled: me.data === true, staleTime: 30 * 1000 });
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // Test accounts and empty sign-up workspaces are hidden by default so the counts are real clients.
  const [hideNoise, setHideNoise] = useState(true);

  const quickPause = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => updateAdminWorkspace(id, { monitoringPaused: paused }),
    onSuccess: (_d, v) => { toast.success(v.paused ? L("Monitoring paused.", "Pemantauan dijeda.") : L("Monitoring resumed.", "Pemantauan dilanjutkan.")); queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] }); },
    onError: () => toast.error(L("Could not save.", "Gagal menyimpan.")),
  });

  const isNoise = (w: AdminWorkspace) => w.isTest || (!w.isDemo && !w.plan && w.keywords === 0 && w.signals30d === 0);
  const base = useMemo(() => (list.data?.data ?? []).filter((w) => !hideNoise || !isNoise(w)), [list.data, hideNoise]);
  const hiddenCount = (list.data?.data.length ?? 0) - base.length;
  const rows = useMemo(() => {
    const all = base;
    const needle = q.trim().toLowerCase();
    return all
      .filter((w) => !needle || `${w.name} ${w.owner?.email ?? ""} ${w.owner?.name ?? ""}`.toLowerCase().includes(needle))
      .filter((w) => {
        if (filter === "all") return true;
        if (filter === "trial") return w.plan === "trial" && !w.trialExpired;
        if (filter === "soon") return w.plan === "trial" && !w.trialExpired && (w.trialDaysLeft ?? 99) <= 3;
        if (filter === "expired") return w.trialExpired;
        if (filter === "paid") return ["pilot", "intelligence", "decision", "command"].includes(w.plan ?? "");
        if (filter === "social") return w.social.enabled;
        return w.monitoringPaused;
      })
      // Demo last; the rest by what needs attention: lapsed trials, then trials ending soonest, then newest.
      .sort((a, b) => Number(a.isDemo) - Number(b.isDemo) || Number(b.trialExpired) - Number(a.trialExpired) || (a.trialDaysLeft ?? 999) - (b.trialDaysLeft ?? 999) || b.createdAt.localeCompare(a.createdAt));
  }, [base, q, filter]);
  if (list.data?.usdToIdr) RATE = list.data.usdToIdr;
  const open = list.data?.data.find((w) => w.id === openId) ?? null;

  if (me.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64 rounded-xl" /><Skeleton className="h-28 rounded-2xl" /></div>;
  if (!me.data) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-[22px] bg-white p-8 text-center shadow-[0_12px_32px_rgba(16,19,52,0.08)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#EEF1FF] text-[#465FFF]"><ShieldCheck size={22} aria-hidden="true" /></span>
        <h1 className="mt-4 text-[22px] font-black">{L("For the Narriv team only", "Khusus tim Narriv")}</h1>
        <p className="mt-2 text-[14px] font-medium text-[#5F6B94]">{L("This page manages every client. Your account does not have access.", "Halaman ini mengatur semua klien. Akun Anda tidak punya akses.")}</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#465FFF] px-5 text-[14px] font-bold text-white">{L("Back to the dashboard", "Kembali ke dashboard")}</Link>
      </div>
    );
  }

  // Counts follow what is shown (with or without test accounts); the demo never counts.
  const t = list.data ? (() => {
    const real = base.filter((w) => !w.isDemo);
    return {
      workspaces: real.length,
      trials: real.filter((w) => w.plan === "trial" && !w.trialExpired).length,
      endingSoon: real.filter((w) => w.plan === "trial" && !w.trialExpired && (w.trialDaysLeft ?? 99) <= 3).length,
      expired: real.filter((w) => w.trialExpired).length,
      paid: real.filter((w) => ["pilot", "intelligence", "decision", "command"].includes(w.plan ?? "")).length,
      socialOn: real.filter((w) => w.social.enabled).length,
      aiCostMonth: real.reduce((n, w) => n + w.aiCostMonth, 0),
      socialSpendMonth: real.reduce((n, w) => n + w.social.spendUsd, 0),
    };
  })() : undefined;
  const tiles: Array<{ key: Filter | null; v: string | number; l: string; tone: string }> = [
    { key: "all", v: t?.workspaces ?? "…", l: L("clients", "klien"), tone: "text-[#101334]" },
    { key: "trial", v: t?.trials ?? "…", l: L("on trial", "uji coba aktif"), tone: "text-[#3B52F5]" },
    { key: "soon", v: t?.endingSoon ?? "…", l: L("ending in 3 days", "berakhir ≤3 hari"), tone: "text-[#B45309]" },
    { key: "expired", v: t?.expired ?? "…", l: L("trial ended", "uji coba habis"), tone: "text-[#B42318]" },
    { key: "paid", v: t?.paid ?? "…", l: L("paying", "berbayar"), tone: "text-[#047857]" },
    { key: null, v: t ? usd(t.aiCostMonth + t.socialSpendMonth) : "…", l: L("cost this month", "biaya bulan ini"), tone: "text-[#101334]" },
  ];
  const filters: Array<{ key: Filter; en: string; id: string }> = [
    { key: "all", en: "All", id: "Semua" },
    { key: "trial", en: "On trial", id: "Uji coba" },
    { key: "soon", en: "Ending soon", id: "Segera berakhir" },
    { key: "expired", en: "Trial ended", id: "Uji coba habis" },
    { key: "paid", en: "Paying", id: "Berbayar" },
    { key: "social", en: "Social on", id: "Media sosial aktif" },
    { key: "paused", en: "Paused", id: "Dijeda" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] px-5 py-6 text-white shadow-[0_12px_32px_rgba(16,19,52,0.22)] sm:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-[260px] w-[420px] rounded-full bg-[#6D7CFF] opacity-30 blur-[90px]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black text-[#A5B4FF]"><ShieldCheck size={14} aria-hidden="true" /> {L("Narriv team", "Tim Narriv")}</p>
            <h1 className="mt-1.5 text-[28px] font-black leading-tight tracking-[-0.02em] sm:text-[32px]">{L("Admin panel", "Admin panel")}</h1>
            <p className="mt-1 text-[14px] font-medium text-white/70">{L("Every client: plan, trial, usage and cost.", "Semua klien: paket, uji coba, pemakaian, dan biaya.")}</p>
          </div>
          <button type="button" onClick={() => list.refetch()} className="inline-flex h-10 items-center gap-2 self-start rounded-[10px] bg-white/10 px-3.5 text-[13px] font-bold text-white hover:bg-white/15 sm:self-auto">
            <RefreshCw size={15} className={cn(list.isFetching && "animate-spin")} aria-hidden="true" /> {L("Refresh", "Muat ulang")}
          </button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <button
              key={tile.l}
              type="button"
              disabled={!tile.key}
              onClick={() => tile.key && setFilter(tile.key)}
              className={cn("rounded-2xl bg-white px-4 py-3.5 text-left transition", tile.key && "hover:-translate-y-0.5", filter === tile.key && tile.key !== "all" && "shadow-[0_0_0_3px_#8EA0FF]")}
            >
              <p className={cn("text-[26px] font-black leading-none tabular-nums", tile.tone)}>{tile.v}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-[#5F6B94]">{tile.l}</p>
            </button>
          ))}
        </div>
        {t ? <p className="relative mt-3 text-[12px] font-medium text-white/60">{L(`AI ${usd(t.aiCostMonth)} · social media ${usd(t.socialSpendMonth)} of ${usd(list.data?.socialCapUsd ?? 0)} · ${t.socialOn} client(s) with social on · rate Rp${RATE.toLocaleString("id-ID")}/USD`, `AI ${usd(t.aiCostMonth)} · media sosial ${usd(t.socialSpendMonth)} dari ${usd(list.data?.socialCapUsd ?? 0)} · ${t.socialOn} klien dengan media sosial aktif · kurs Rp${RATE.toLocaleString("id-ID")}/USD`)}</p> : null}
      </section>

      <TestEmailCard />
      <RegionBackfillCard />
      <DemoSeedCard />

      {/* Filters and search */}
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={L("Filter", "Saring")}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn("shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition", filter === f.key ? "bg-[#465FFF] text-white shadow-[0_3px_8px_rgba(70,95,255,0.3)]" : "bg-white text-[#31406B] shadow-sm hover:text-[#101334]")}
            >
              {L(f.en, f.id)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl bg-white px-3.5 text-[13px] font-bold text-[#31406B] shadow-sm">
          <Toggle on={hideNoise} onChange={setHideNoise} label={L("Hide test accounts and empty workspaces", "Sembunyikan akun tes dan workspace kosong")} />
          {L(`Hide tests & empty${hideNoise && hiddenCount ? ` (${hiddenCount})` : ""}`, `Sembunyikan tes & kosong${hideNoise && hiddenCount ? ` (${hiddenCount})` : ""}`)}
        </label>
        <label className="flex h-11 items-center gap-2.5 rounded-xl bg-white px-3.5 shadow-sm lg:w-[320px]">
          <Search size={17} className="text-[#465FFF]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Search client or owner email", "Cari klien atau email pemilik")} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:text-[#8A93B5]" />
        </label>
        </div>
      </div>

      {/* List */}
      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : list.isError ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-[15px] font-bold">{L("The client list could not be loaded.", "Daftar klien gagal dimuat.")}</p>
          <button type="button" onClick={() => list.refetch()} className="mt-3 text-[14px] font-bold text-[#465FFF]">{L("Try again", "Coba lagi")}</button>
        </div>
      ) : !rows.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="text-[15px] font-bold">{L("No client matches.", "Tidak ada klien yang cocok.")}</p>
          <p className="mt-1 text-[13px] text-[#5F6B94]">{L("Try another filter or search.", "Coba saringan atau pencarian lain.")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.07)] lg:block">
            <table className="w-full text-left">
              <thead>
                <tr className="whitespace-nowrap bg-[#F5F7FF] text-[11px] font-black text-[#5F6B94]">
                  <th className="px-5 py-3">{L("Client", "Klien")}</th>
                  <th className="px-3 py-3">{L("Plan", "Paket")}</th>
                  <th className="px-3 py-3">{L("Monitoring", "Pemantauan")}</th>
                  <th className="px-3 py-3 text-right">{L("Keywords", "Kata kunci")}</th>
                  <th className="px-3 py-3 text-right">{L("Data 30d", "Data 30h")}</th>
                  <th className="px-3 py-3 text-right">{L("Alerts", "Peringatan")}</th>
                  <th className="px-3 py-3">{L("Social", "Medsos")}</th>
                  <th className="px-3 py-3 text-right">{L("AI cost", "Biaya AI")}</th>
                  <th className="w-[92px] px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className={cn("text-[14px] transition even:bg-[#FAFBFF]", w.isDemo ? "opacity-70" : "cursor-pointer hover:bg-[#F5F7FF]")} onClick={() => !w.isDemo && setOpenId(w.id)}>
                    <td className="max-w-[280px] px-5 py-3.5">
                      <p className="flex items-center gap-2 truncate font-black text-[#101334]">{w.name}{w.isTest ? <span className="rounded-full bg-[#F1F3F8] px-2 py-0.5 text-[10px] font-black text-[#5F6B94]">{L("test", "tes")}</span> : null}</p>
                      <p className="truncate text-[12px] font-medium text-[#5F6B94]">{w.owner?.email || "—"} · {fmtDate(w.createdAt)}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <PlanPill w={w} />
                      {w.billing?.status === "overdue" || w.billing?.status === "due" ? (
                        <p className={cn("mt-1 text-[11px] font-black", w.billing.status === "overdue" ? "text-[#B42318]" : "text-[#B45309]")}>{w.billing.status === "overdue" ? L("Payment overdue", "Tagihan terlambat") : L("Payment due", "Tagihan jatuh tempo")}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5">
                      <MonitoringState w={w} />
                      <p className="whitespace-nowrap text-[11px] font-medium text-[#8A93B5]">{w.lastSignalAt ? L(`last data ${timeAgo(w.lastSignalAt)}`, `data terakhir ${timeAgo(w.lastSignalAt)}`) : L("no data yet", "belum ada data")}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-black tabular-nums">{w.keywords}</td>
                    <td className="px-3 py-3.5 text-right font-black tabular-nums">{w.signals30d}</td>
                    <td className="px-3 py-3.5 text-right font-black tabular-nums">{w.openAlerts}</td>
                    <td className="px-3 py-3.5">
                      {w.social.enabled ? (
                        <span className="text-[12px] font-bold text-[#31406B]">{usd(w.social.spendUsd)} / {usd(w.social.monthlyCapUsd)}</span>
                      ) : (
                        <span className="text-[12px] font-semibold text-[#8A93B5]">{L("Off", "Mati")}</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-black tabular-nums">{usd(w.aiCostMonth)}</td>
                    <td className="px-3 py-3.5">
                      {w.isDemo ? null : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title={w.monitoringPaused ? L("Resume monitoring", "Lanjutkan pemantauan") : L("Pause monitoring", "Jeda pemantauan")}
                            aria-label={w.monitoringPaused ? L("Resume monitoring", "Lanjutkan pemantauan") : L("Pause monitoring", "Jeda pemantauan")}
                            onClick={(e) => { e.stopPropagation(); quickPause.mutate({ id: w.id, paused: !w.monitoringPaused }); }}
                            className="flex size-8 items-center justify-center rounded-lg text-[#5F6B94] hover:bg-white hover:text-[#101334] hover:shadow-sm"
                          >
                            {w.monitoringPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                          </button>
                          <span className="flex size-8 items-center justify-center text-[#465FFF]"><ChevronRight size={17} aria-hidden="true" /></span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="space-y-2.5 lg:hidden">
            {rows.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  disabled={w.isDemo}
                  onClick={() => setOpenId(w.id)}
                  className={cn("w-full rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,19,52,0.06),0_8px_24px_rgba(16,19,52,0.06)]", w.isDemo && "opacity-70")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-black">{w.name}</p>
                      <p className="truncate text-[12px] font-medium text-[#5F6B94]">{w.owner?.email || "—"}</p>
                    </div>
                    <PlanPill w={w} />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {[
                      { v: w.keywords, l: L("keywords", "kata kunci") },
                      { v: w.signals30d, l: L("data", "data") },
                      { v: w.openAlerts, l: L("alerts", "peringatan") },
                      { v: usd(w.aiCostMonth), l: "AI" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl bg-[#F5F7FF] px-1.5 py-2 text-center">
                        <p className="text-[15px] font-black leading-none tabular-nums">{s.v}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#5F6B94]">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <MonitoringState w={w} />
                    <span className="text-[12px] font-semibold text-[#5F6B94]">{w.social.enabled ? `${L("Social", "Medsos")} ${usd(w.social.spendUsd)}` : L("Social off", "Medsos mati")}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open ? <WorkspacePanel key={open.id} w={open} socialCapUsd={list.data?.socialCapUsd ?? 75} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
