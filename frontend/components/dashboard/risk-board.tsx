"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import type { NarrativeRecord } from "@/lib/api-service";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/**
 * Overview: the most dangerous stories right now (narrative risk, not volume), as a list with the chosen story's
 * detail beside it: its score, four danger bars, the signs, who it touches and where to go next.
 */
const BADGE: Record<string, [string, string]> = { bot_like: ["Bot-like", "Indikasi bot"], toxic: ["Toxic", "Toksik"], anomalous: ["Anomalous spike", "Lonjakan anomali"], hoax: ["Hoax", "Hoaks"], polarized: ["Polarized", "Terpolarisasi"] };
const LEVEL: Record<string, [string, string, string]> = { critical: ["Critical", "Kritis", "#E5484D"], high: ["High", "Tinggi", "#F97316"], medium: ["Medium", "Sedang", "#F59E0B"], low: ["Low", "Rendah", "#12A66A"] };
const pts = (n: NarrativeRecord, key: string) => n.risk?.factors.find((f) => f.key === key)?.points ?? 0;

export function RiskBoard({ issues, loading, onPlan }: { issues: NarrativeRecord[]; loading?: boolean; onPlan?: (clusterId: string) => void }) {
  const L = useL();
  const list = issues.filter((n) => n.risk).sort((a, b) => (b.risk?.score ?? 0) - (a.risk?.score ?? 0)).slice(0, 4);
  const [sel, setSel] = useState(0);
  const it = list[Math.min(sel, list.length - 1)];
  if (loading) return <div className="h-[280px] animate-pulse rounded-[20px] bg-[#101334]/90" />;
  if (!it) return null;
  const lv = LEVEL[it.risk?.level ?? "low"];
  const bars: Array<[string, string, number, string]> = [
    ["Risk", "Risiko", it.risk?.score ?? 0, "#E5484D"],
    ["Bot-like", "Indikasi bot", Math.round((pts(it, "network") / 15) * 100), "#8B5CF6"],
    ["Toxicity", "Toksisitas", Math.round((pts(it, "toxicity") / 10) * 100), "#F59E0B"],
    ["Anomalous", "Anomali", Math.round((pts(it, "speed") / 25) * 100), "#465FFF"],
  ];
  return (
    <section aria-label={L("Most dangerous narratives", "Narasi paling berbahaya")} className="overflow-hidden rounded-[20px] border-[1.5px] border-[#101334] bg-[#0B0F2A] text-white shadow-[0_4px_0_#101334]">
      <style>{`@keyframes rb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.rb-in{animation:rb-in .4s ease-out both}@keyframes rb-bar{from{width:0}}.rb-bar{animation:rb-bar .8s cubic-bezier(.4,0,.2,1) both}@media (prefers-reduced-motion: reduce){.rb-in,.rb-bar{animation:none}}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3.5 sm:px-6">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#A5B4FF]">{L("Narrative risk", "Risiko narasi")}</p>
          <h2 className="text-[19px] font-black leading-tight">{L("Most dangerous right now", "Paling berbahaya saat ini")}</h2>
        </div>
        <Link href="/feed" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-black text-white hover:bg-white/15">{L("Open Narrative Feed", "Buka Feed Narasi")} <ArrowRight size={13} /></Link>
      </div>
      <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ul className="border-b border-white/10 md:border-b-0 md:border-r">
          {list.map((n, k) => {
            const l = LEVEL[n.risk?.level ?? "low"];
            return (
              <li key={n.id}>
                <button type="button" onClick={() => setSel(k)} aria-pressed={k === sel} className={cn("flex w-full items-center gap-3 border-l-[3px] px-5 py-3.5 text-left transition", k === sel ? "border-[#A5B4FF] bg-white/[0.07]" : "border-transparent hover:bg-white/[0.04]")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] text-[15px] font-black" style={{ background: l[2] }}>{n.risk?.score}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("line-clamp-2 text-[14px] font-bold leading-snug", k === sel ? "text-white" : "text-white/75")}>{n.title}</span>
                    <span className="mt-0.5 block text-[11.5px] font-semibold text-white/45">{L(`${n.signalCount} records`, `${n.signalCount} catatan`)}{n.badges?.length ? ` · ${n.badges.map((b) => L(BADGE[b]?.[0] ?? b, BADGE[b]?.[1] ?? b)).join(", ")}` : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div key={it.id} className="rb-in grid content-start gap-4 p-5 sm:p-6">
          <div>
            <p className="flex items-center gap-2 text-[11.5px] font-black uppercase tracking-[0.12em]" style={{ color: lv[2] }}><span className="size-2 rounded-full bg-current" />{L(lv[0], lv[1])} · {it.risk?.score}/100</p>
            <p className="mt-1.5 text-[21px] font-black leading-tight">{it.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            {bars.map(([en, id, v, c], k) => (
              <div key={en}>
                <p className="flex justify-between text-[11px] font-bold text-white/55"><span>{L(en, id)}</span><span className="tabular-nums text-white/80">{v}</span></p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="rb-bar h-full rounded-full" style={{ width: `${Math.max(v, 2)}%`, background: c, animationDelay: `${k * 80}ms` }} /></div>
              </div>
            ))}
          </div>
          {it.risk?.factors?.length ? (
            <ul className="grid gap-1.5">
              {it.risk.factors.slice(0, 3).map((f) => <li key={f.key} className="flex gap-2 text-[13.5px] leading-snug text-white/80"><span className="w-8 shrink-0 font-black tabular-nums text-[#FF8A8D]">+{f.points}</span>{f.label}</li>)}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] font-semibold text-white/60">
            <span className="flex items-center gap-1.5">{(it.platforms ?? []).slice(0, 6).map((p) => <PlatformIcon key={p} platform={p} className="size-4" />)}</span>
            {it.audiences?.length ? <span className="flex items-center gap-1.5"><Users size={13} />{it.audiences.join(", ")}</span> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/intelligence/${it.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-[#465FFF] px-4 text-[13.5px] font-black text-white hover:bg-[#3B52F5]">{L("Investigate", "Selidiki isu")} <ArrowRight size={14} /></Link>
            {onPlan ? <button type="button" onClick={() => onPlan(it.id)} className="inline-flex h-10 items-center rounded-[12px] border border-white/25 px-4 text-[13.5px] font-black text-white hover:bg-white/10">{L("Plan a response", "Susun respons")}</button> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
