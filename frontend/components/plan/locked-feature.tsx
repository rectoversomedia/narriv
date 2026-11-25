"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Lock, Send } from "lucide-react";
import { requestUpgrade, type FeatureKey } from "@/lib/api-service";
import { FEATURE_COPY, PLAN_META, PlanBadge, useEntitlements } from "@/lib/plans";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * What a client sees instead of a feature their plan does not include: what it does, the plan that has it, and a
 * one-click request to the Narriv team (the team changes the plan in the admin panel).
 */
export function LockedFeature({ feature, compact = false }: { feature: FeatureKey; compact?: boolean }) {
  const L = useL();
  const toast = useToast();
  const { ent } = useEntitlements();
  const need = ent?.requiredPlan[feature] ?? "intelligence";
  const m = PLAN_META[need];
  const copy = FEATURE_COPY[feature];
  const ask = useMutation({
    meta: { silent: true },
    mutationFn: () => requestUpgrade({ feature }),
    onSuccess: () => toast.success(L("Request sent. The Narriv team will contact you.", "Permintaan terkirim. Tim Narriv akan menghubungi Anda.")),
    onError: (e: Error) => toast.error(e.message || L("Not sent.", "Gagal dikirim.")),
  });
  return (
    <section className={cn("relative overflow-hidden rounded-[22px] border-[1.5px] border-[#101334] bg-white shadow-[0_5px_0_#101334]", compact ? "mt-5 p-5" : "mx-auto mt-6 max-w-2xl p-8 text-center")}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: m.color }} />
      <div className={cn("flex gap-4", compact ? "items-start" : "flex-col items-center")}>
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border-[1.5px] border-[#101334] shadow-[0_3px_0_#101334]" style={{ background: m.soft, color: m.color }}><Lock size={20} strokeWidth={2.4} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className={cn("font-black text-[#101334]", compact ? "text-[16px]" : "text-[24px] tracking-[-0.02em]")}>{L(copy.en, copy.id)}</p>
          <p className={cn("mt-1 text-[#5F6B94]", compact ? "text-[13.5px]" : "text-[15px]")}>{L(copy.descEn, copy.descId)}</p>
          <p className={cn("mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#31406B]", !compact && "justify-center")}>
            {L("Included from", "Tersedia mulai paket")} <PlanBadge plan={need} />
          </p>
          <div className={cn("mt-4 flex flex-wrap gap-2", !compact && "justify-center")}>
            <button type="button" onClick={() => ask.mutate()} disabled={ask.isPending || ask.isSuccess} className="inline-flex h-11 items-center gap-2 rounded-[12px] px-5 text-[14px] font-black text-white disabled:opacity-60" style={{ background: m.color }}>
              {ask.isSuccess ? <><CheckCircle2 size={16} /> {L("Request sent", "Permintaan terkirim")}</> : <><Send size={15} /> {L(`Upgrade to ${m.name}`, `Upgrade ke ${m.name}`)}</>}
            </button>
            <a href="/pricing" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-[12px] border-[1.5px] border-[#101334] px-5 text-[14px] font-bold text-[#101334] hover:bg-[#F4F6FD]">{L("Compare plans", "Bandingkan paket")}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
