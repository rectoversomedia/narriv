"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { FeatureKey, PaidPlan } from "@/lib/api-service";
import { FEATURE_COPY, PLAN_META, useEntitlements } from "@/lib/plans";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useL } from "@/lib/use-l";

const FEATURE_HREF: Record<FeatureKey, string> = {
  whatsapp_alerts: "/workspace/settings", ai_visibility: "/visibility", forecast: "/forecast", claim_check: "/cek-klaim", ask: "/ask",
  action_plans: "/action-plans", competitors: "/competitors", network: "/network", account_check: "/recon", press_release: "/action-plans",
  scheduled_reports: "/reports", social_media: "/workspace/sources", influencer: "/action-plans", service_stages: "/action-plans",
  white_label: "/workspace/white-label", escalation: "/alerts", integrations: "/workspace/integrations",
};

/**
 * Shown once when a workspace's paid plan starts or changes (not on every visit): the plan, and what it opened, each
 * a link straight to the feature. Remembered per workspace in this browser.
 */
export function PlanWelcome() {
  const L = useL();
  const ws = useWorkspaceStore((s) => s.selectedWorkspaceId);
  const { ent } = useEntitlements();
  const [open, setOpen] = useState(false);
  const plan = ent && !ent.unrestricted && ent.plan && ent.plan !== "trial" ? (ent.plan as PaidPlan) : null;
  const key = ws ? `narriv-plan-seen:${ws}` : null;

  useEffect(() => {
    if (!plan || !key) return;
    let seen: string | null = null;
    try { seen = localStorage.getItem(key); } catch { /* storage off: show nothing rather than every time */ return; }
    if (seen !== plan) setOpen(true);
  }, [plan, key]);

  if (!open || !plan || !ent) return null;
  const close = () => { try { if (key) localStorage.setItem(key, plan); } catch { /* ignore */ } setOpen(false); };
  const m = PLAN_META[plan];
  const Icon = m.icon;
  const opened = (Object.keys(ent.requiredPlan) as FeatureKey[]).filter((f) => ent.requiredPlan[f] === plan && ent.features[f]).slice(0, 4);
  const items = opened.length ? opened : (Object.keys(ent.features) as FeatureKey[]).filter((f) => ent.features[f]).slice(0, 4);
  // Starter opens no paid feature: show what every plan runs on.
  const base: Array<[string, string, string, string, string]> = [
    ["Hourly monitoring", "Pemantauan tiap jam", "News, YouTube and Telegram about your brand.", "Berita, YouTube, dan Telegram tentang brand Anda.", "/feed"],
    ["Issues found by AI", "Isu ditemukan AI", "Sentiment and issues, grouped as they happen.", "Sentimen dan isu, dikelompokkan saat terjadi.", "/intelligence"],
    ["Daily briefing", "Briefing harian", "What changed today, in one screen.", "Apa yang berubah hari ini, dalam satu layar.", "/brief"],
    ["Weekly PDF report", "Laporan mingguan PDF", "A board-ready summary every week.", "Ringkasan siap rapat direksi setiap minggu.", "/reports"],
  ];

  return (
    <div className="fixed inset-0 z-[400] grid place-items-center bg-[#0B0E2A]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="plan-welcome-title" onClick={close}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-[26px] border-[1.5px] border-[#101334] bg-white shadow-[0_6px_0_#101334]" onClick={(e) => e.stopPropagation()}>
        <div className="relative px-7 pb-6 pt-7 text-white" style={{ background: `linear-gradient(135deg, #101334 0%, #101334 55%, ${m.color} 160%)` }}>
          <button type="button" onClick={close} aria-label={L("Close", "Tutup")} className="absolute right-4 top-4 grid size-9 place-items-center rounded-[10px] bg-white/10 hover:bg-white/20"><X size={17} /></button>
          <span className="grid size-14 place-items-center rounded-[16px] border-[1.5px] border-white/25 shadow-[0_3px_0_rgba(255,255,255,0.18)]" style={{ background: m.color }}><Icon size={26} strokeWidth={2.4} aria-hidden="true" /></span>
          <p className="mt-4 text-[13px] font-bold text-white/65">{L("Your plan is active", "Paket Anda sudah aktif")}</p>
          <h2 id="plan-welcome-title" className="mt-1 text-[28px] font-black leading-tight tracking-[-0.02em]">{L(`Welcome to ${m.name}`, `Selamat datang di ${m.name}`)}</h2>
        </div>
        <div className="p-6">
          <p className="text-[13px] font-bold text-[#5F6B94]">{L("Now open for you", "Sekarang terbuka untuk Anda")}</p>
          <ul className="mt-3 grid gap-2">
            {(items.length ? [] : base).map(([en, id, dEn, dId, href]) => (
              <li key={href}>
                <Link href={href} onClick={close} className="group flex items-center gap-3 rounded-[14px] bg-[#F6F7FC] px-4 py-3 hover:bg-[#EEF1FF]">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                  <span className="min-w-0 flex-1"><b className="block text-[14px] text-[#101334]">{L(en, id)}</b><small className="block truncate text-[12.5px] text-[#5F6B94]">{L(dEn, dId)}</small></span>
                  <ArrowRight size={15} className="shrink-0 text-[#8A93B8] transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
            {items.map((f) => (
              <li key={f}>
                <Link href={FEATURE_HREF[f]} onClick={close} className="group flex items-center gap-3 rounded-[14px] bg-[#F6F7FC] px-4 py-3 hover:bg-[#EEF1FF]">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                  <span className="min-w-0 flex-1">
                    <b className="block text-[14px] text-[#101334]">{L(FEATURE_COPY[f].en, FEATURE_COPY[f].id)}</b>
                    <small className="block truncate text-[12.5px] text-[#5F6B94]">{L(FEATURE_COPY[f].descEn, FEATURE_COPY[f].descId)}</small>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-[#8A93B8] transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" onClick={close} className="mt-5 h-11 w-full rounded-[12px] text-[14px] font-black text-white" style={{ background: m.color }}>{L("Get started", "Mulai")}</button>
        </div>
      </div>
    </div>
  );
}
