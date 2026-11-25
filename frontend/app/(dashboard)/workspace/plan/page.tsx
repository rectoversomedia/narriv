"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Lock, Send } from "lucide-react";
import { getWorkspaceMembers, requestUpgrade, type FeatureKey, type PaidPlan } from "@/lib/api-service";
import { FEATURE_COPY, PLAN_META, useEntitlements } from "@/lib/plans";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const ORDER: PaidPlan[] = ["starter", "pilot", "intelligence", "decision", "command"];

/** The workspace's plan: what it includes, its limits, and what the next plan would open. */
export default function PlanPage() {
  const L = useL();
  const toast = useToast();
  const { ent, loading } = useEntitlements();
  const members = useQuery({ queryKey: ["workspace-members"], queryFn: getWorkspaceMembers, staleTime: 60_000 });
  const ask = useMutation({
    meta: { silent: true },
    mutationFn: (plan: PaidPlan) => requestUpgrade({ plan }),
    onSuccess: () => toast.success(L("Request sent. The Narriv team will contact you.", "Permintaan terkirim. Tim Narriv akan menghubungi Anda.")),
    onError: (e: Error) => toast.error(e.message || L("Not sent.", "Gagal dikirim.")),
  });
  if (loading || !ent) return <div className="mt-6 h-64 animate-pulse rounded-[22px] bg-white/70" />;

  const plan = ent.effectivePlan;
  const m = PLAN_META[plan];
  const Icon = m.icon;
  const features = Object.keys(ent.features) as FeatureKey[];
  const included = features.filter((f) => ent.features[f]);
  const next = ORDER[ORDER.indexOf(plan) + 1] as PaidPlan | undefined;
  const nextOpens = next ? features.filter((f) => !ent.features[f] && ORDER.indexOf(ent.requiredPlan[f]) <= ORDER.indexOf(next)) : [];
  const trialDays = ent.trial?.endsAt ? Math.max(0, Math.ceil((new Date(ent.trial.endsAt).getTime() - Date.now()) / 86400000)) : null;
  const users = members.data?.length ?? null;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-5">
      <section className="relative overflow-hidden rounded-[24px] border-[1.5px] border-[#101334] p-6 text-white shadow-[0_5px_0_#101334] sm:p-8" style={{ background: `linear-gradient(135deg, #101334 0%, #101334 60%, ${m.color} 170%)` }}>
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid size-16 place-items-center rounded-[18px] border-[1.5px] border-white/25 shadow-[0_3px_0_rgba(255,255,255,0.18)]" style={{ background: m.color }}><Icon size={30} strokeWidth={2.4} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-white/65">{ent.unrestricted ? L("Narriv team account", "Akun tim Narriv") : ent.plan === "trial" ? L("Free trial", "Uji coba gratis") : ent.plan ? L("Your plan", "Paket Anda") : L("Full access", "Akses penuh")}</p>
            <h1 className="text-[32px] font-black leading-tight tracking-[-0.02em]">{ent.unrestricted ? L("Every feature", "Semua fitur") : m.name}</h1>
            <p className="mt-1 text-[14px] text-white/70">
              {ent.unrestricted ? L("No plan limits apply to the Narriv team.", "Tim Narriv tidak dibatasi paket.")
                : ent.plan === "trial" ? (ent.trial?.expired ? L("The trial has ended: monitoring is paused until a plan starts.", "Uji coba sudah berakhir: pemantauan dijeda sampai paket aktif.") : L(`${trialDays ?? "–"} days left. The trial includes everything in Intelligence.`, `Sisa ${trialDays ?? "–"} hari. Uji coba berisi semua fitur Intelligence.`))
                : L("Plans are set by the Narriv team. Ask for a change any time.", "Paket diatur oleh tim Narriv. Minta perubahan kapan saja.")}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [L("Users", "Pengguna"), ent.limits.users ? `${users ?? "–"} / ${ent.limits.users}` : `${users ?? "–"} · ${L("no limit", "tanpa batas")}`],
            [L("Data kept", "Masa simpan data"), ent.limits.retentionDays ? L(`${ent.limits.retentionDays} days`, `${ent.limits.retentionDays} hari`) : L("By contract", "Sesuai kontrak")],
            [L("Add-ons", "Add-on"), [ent.addons.social ? L("Social media", "Media sosial") : "", ent.addons.influencer ? L("Influencers", "Influencer") : ""].filter(Boolean).join(" · ") || "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[14px] bg-white/10 px-4 py-3"><dt className="text-[12px] font-bold text-white/60">{k}</dt><dd className="mt-0.5 text-[18px] font-black">{v}</dd></div>
          ))}
        </dl>
        {ent.limits.retentionDays && !ent.unrestricted && ent.plan ? (
          <p className="mt-4 text-[12.5px] text-white/65">{L(
            `Mentions older than ${ent.limits.retentionDays} days are removed 30 days after they pass the window. Issues, alerts, reports and plans are kept. Upgrading within that time keeps your history.`,
            `Percakapan yang lebih lama dari ${ent.limits.retentionDays} hari dihapus otomatis 30 hari setelah lewat masa simpan. Isu, peringatan, laporan, dan rencana tetap tersimpan. Naik paket sebelum itu membuat riwayat Anda tetap utuh.`,
          )}</p>
        ) : null}
      </section>

      {ent.usage ? (
        <section className="grid gap-4 rounded-[22px] border-[1.5px] border-[#101334] bg-white p-6 shadow-[0_5px_0_#101334] sm:grid-cols-2">
          {[
            ent.usage.ai ? { label: L("AI analysis this month", "Analisis AI bulan ini"), used: ent.usage.ai.used, limit: ent.usage.ai.limit, unit: L("calls", "analisis"), note: L("Past the quota, new mentions are still collected; their analysis waits for next month.", "Lewat kuota, percakapan baru tetap dikumpulkan, analisisnya menunggu bulan depan.") } : null,
            ent.usage.social?.enabled ? { label: L("Social media this month", "Media sosial bulan ini"), used: ent.usage.social.runsUsed, limit: ent.usage.social.monthlyRuns, unit: L("collections", "pengambilan"), note: `${ent.usage.social.platforms.join(", ")} · ${ent.usage.social.crisis ? L("crisis mode: hourly", "mode krisis: tiap jam") : L("daily, more when issues rise", "harian, bertambah saat isu naik")}` } : { label: L("Social media", "Media sosial"), used: 0, limit: 0, unit: "", note: L("Not active. Included from Intelligence, or as the Social Media Lite add-on.", "Belum aktif. Termasuk mulai Intelligence, atau lewat add-on Media Sosial Lite.") },
          ].filter((x): x is NonNullable<typeof x> => Boolean(x)).map((u) => {
            const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
            return (
              <div key={u.label}>
                <p className="text-[13px] font-bold text-[#5F6B94]">{u.label}</p>
                {u.limit ? <p className="mt-1 text-[22px] font-black text-[#101334]">{u.used.toLocaleString("id-ID")} <span className="text-[14px] font-semibold text-[#8A93B8]">/ {u.limit.toLocaleString("id-ID")} {u.unit}</span></p> : null}
                {u.limit ? <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF0F6]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 90 ? "#E5484D" : pct >= 70 ? "#F59E0B" : m.color }} /></div> : null}
                <p className="mt-2 text-[12.5px] text-[#5F6B94]">{u.note}</p>
              </div>
            );
          })}
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[22px] border-[1.5px] border-[#101334] bg-white p-6 shadow-[0_5px_0_#101334]">
          <h2 className="text-[17px] font-black text-[#101334]">{L("Included", "Termasuk")}</h2>
          <ul className="mt-4 grid gap-2.5">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#E5F6EE] text-[#047857]"><Check size={12} strokeWidth={3} /></span>
                <span><b className="block text-[14px] text-[#101334]">{L(FEATURE_COPY[f].en, FEATURE_COPY[f].id)}</b><small className="text-[12.5px] text-[#5F6B94]">{L(FEATURE_COPY[f].descEn, FEATURE_COPY[f].descId)}</small></span>
              </li>
            ))}
            <li className="flex items-start gap-2.5"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#E5F6EE] text-[#047857]"><Check size={12} strokeWidth={3} /></span><span><b className="block text-[14px] text-[#101334]">{L("News, YouTube and Telegram monitoring", "Pemantauan berita, YouTube, dan Telegram")}</b><small className="text-[12.5px] text-[#5F6B94]">{L("Every plan, checked every hour.", "Semua paket, dicek tiap jam.")}</small></span></li>
          </ul>
        </section>

        <section className="rounded-[22px] border-[1.5px] border-[#101334] bg-white p-6 shadow-[0_5px_0_#101334]">
          {next && nextOpens.length && !ent.unrestricted ? (
            <>
              <h2 className="flex items-center gap-2 text-[17px] font-black text-[#101334]">{L("Next:", "Berikutnya:")} <span style={{ color: PLAN_META[next].color }}>{PLAN_META[next].name}</span></h2>
              <ul className="mt-4 grid gap-2.5">
                {nextOpens.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#F1F3F8] text-[#8A93B8]"><Lock size={11} strokeWidth={2.6} /></span>
                    <span><b className="block text-[14px] text-[#101334]">{L(FEATURE_COPY[f].en, FEATURE_COPY[f].id)}</b><small className="text-[12.5px] text-[#5F6B94]">{L(FEATURE_COPY[f].descEn, FEATURE_COPY[f].descId)}</small></span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => ask.mutate(next)} disabled={ask.isPending || ask.isSuccess} className={cn("mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] px-5 text-[14px] font-black text-white disabled:opacity-60")} style={{ background: PLAN_META[next].color }}>
                {ask.isSuccess ? <><CheckCircle2 size={16} /> {L("Request sent", "Permintaan terkirim")}</> : <><Send size={15} /> {L(`Upgrade to ${PLAN_META[next].name}`, `Upgrade ke ${PLAN_META[next].name}`)}</>}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-[17px] font-black text-[#101334]">{L("Everything is open", "Semua sudah terbuka")}</h2>
              <p className="mt-2 text-[14px] text-[#5F6B94]">{L("Need more keywords, social media quota or another brand? The Narriv team adds it to your plan.", "Butuh kata kunci, kuota media sosial, atau brand tambahan? Tim Narriv menambahkannya ke paket Anda.")}</p>
            </>
          )}
          <a href="/pricing" target="_blank" rel="noreferrer" className="mt-4 block text-[13px] font-bold text-[#3247D9] hover:underline">{L("Compare all plans →", "Bandingkan semua paket →")}</a>
        </section>
      </div>
    </div>
  );
}
