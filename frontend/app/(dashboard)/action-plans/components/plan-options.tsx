"use client";

import { RichText } from "@/components/ui/rich-text";
import { useState } from "react";
import { Copy } from "lucide-react";
import type { ActionPlanOption } from "@/lib/api-service";
import { pickL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * The plan's alternatives side by side: careful, balanced (recommended) and firm. Each shows its steps with owner and
 * timing, the key messages, a ready-to-use draft, the channels, how success is measured and what to watch out for.
 */
const META: Record<ActionPlanOption["key"], { en: string; id: string; hintEn: string; hintId: string; color: string }> = {
  conservative: { en: "Careful", id: "Hati-hati", hintEn: "Lowest exposure", hintId: "Paling minim risiko", color: "#12A66A" },
  balanced: { en: "Balanced", id: "Seimbang", hintEn: "Recommended", hintId: "Direkomendasikan", color: "#465FFF" },
  bold: { en: "Firm", id: "Tegas", hintEn: "Fastest impact", hintId: "Dampak paling cepat", color: "#E5484D" },
};

function List({ title, items, tone = "text-[#101334]" }: { title: string; items?: string[]; tone?: string }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-[14px] bg-[#F7F8FC] p-4">
      <p className="text-[11.5px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{title}</p>
      <ul className="mt-2 grid gap-1.5">
        {items.map((x) => <li key={x} className={cn("flex gap-2 text-[13.5px] font-semibold leading-snug", tone)}><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current opacity-60" />{x}</li>)}
      </ul>
    </div>
  );
}

export function PlanOptions({ options }: { options: ActionPlanOption[] }) {
  const toast = useToast();
  const initial = options.find((o) => o.key === "balanced")?.key ?? options[0]?.key;
  const [key, setKey] = useState(initial);
  const o = options.find((x) => x.key === key) ?? options[0];
  if (!o) return null;
  return (
    <div className="mt-6 grid gap-4">
      {options.length > 1 ? (
        <div role="tablist" aria-label={pickL("Plan alternatives", "Alternatif rencana")} className="grid gap-2 sm:grid-cols-3">
          {options.map((x) => {
            const m = META[x.key];
            const on = x.key === o.key;
            return (
              <button key={x.key} type="button" role="tab" aria-selected={on} onClick={() => setKey(x.key)} className={cn("rounded-[14px] border-[1.5px] px-4 py-3 text-left transition", on ? "border-[#101334] bg-white shadow-[0_3px_0_#101334]" : "border-[#E2E6F0] bg-[#F7F8FC] hover:border-[#C9D0E0]")}>
                <span className="flex items-center gap-2 text-[14.5px] font-black text-[#101334]"><span className="size-2.5 rounded-full" style={{ background: m.color }} />{pickL(m.en, m.id)}</span>
                <span className="mt-0.5 block text-[12px] font-semibold text-[#5A6478]">{pickL(m.hintEn, m.hintId)} · {x.steps?.length ?? 0} {pickL("steps", "langkah")}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {o.summary ? <RichText text={o.summary} className="text-[15px] font-medium leading-relaxed text-[#31406B]" /> : null}

      {o.steps?.length ? (
        <div>
          <p className="text-[12px] font-bold text-[#5F6B94]">{pickL("Steps", "Langkah")}</p>
          <ol className="mt-2 grid gap-2">
            {o.steps.map((st, i) => (
              <li key={`${i}:${st.action}`} className="grid grid-cols-[auto_1fr] gap-3 rounded-[14px] border border-[#E7EAF3] bg-white p-3.5 sm:grid-cols-[auto_1fr_auto]">
                <span className="grid size-7 place-items-center rounded-full bg-[#101334] text-[12px] font-black text-white">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-bold leading-snug text-[#101334]">{st.action}</span>
                  {st.owner ? <span className="mt-0.5 block text-[12px] font-semibold text-[#5A6478]">{pickL("Owner", "Penanggung jawab")}: {st.owner}</span> : null}
                </span>
                {st.when ? <span className="col-start-2 justify-self-start rounded-[8px] bg-[#EEF1FF] px-2.5 py-1 text-[11.5px] font-black text-[#3B52F5] sm:col-start-3 sm:self-start">{st.when}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {o.draft ? (
        <div className="rounded-[14px] border-[1.5px] border-[#101334] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{pickL("Ready-to-use draft", "Draf siap pakai")}</p>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(o.draft ?? ""); toast.success(pickL("Draft copied.", "Draf disalin.")); }} className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-black text-[#3B52F5] hover:bg-[#EEF1FF]"><Copy size={13} /> {pickL("Copy", "Salin")}</button>
          </div>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-[#101334]">{o.draft}</p>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <List title={pickL("Key messages", "Pesan kunci")} items={o.keyMessages} />
        <List title={pickL("Channels", "Kanal")} items={o.channels} />
        <List title={pickL("Measure success by", "Ukuran keberhasilan")} items={o.metrics} tone="text-[#047857]" />
        <List title={pickL("Watch out for", "Yang perlu diwaspadai")} items={o.risks} tone="text-[#B42318]" />
      </div>
    </div>
  );
}
