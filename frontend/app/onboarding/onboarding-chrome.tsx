"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

// The frame around the onboarding form: a dark "narrative field" panel on the left (the steps, with what each one is
// for) and a soft light canvas on the right. Phones get the logo and a five-segment progress bar instead of the panel.

// A small graph of conversations: nodes are sources, lines are a narrative spreading between them, and light
// pulses travel along a few of the lines. Coordinates are in a 400×800 box that stretches with the panel.
const NODES: Array<[number, number, number]> = [
  [62, 120, 3], [180, 70, 2.5], [320, 140, 4], [250, 250, 6], [96, 300, 2.5], [352, 330, 3],
  [170, 410, 3.5], [300, 480, 2.5], [60, 520, 4], [220, 600, 5], [350, 650, 2.5], [110, 700, 3], [270, 760, 2.5],
];
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [3, 6], [4, 6], [5, 7], [6, 7], [6, 8], [7, 9], [8, 9], [9, 10], [9, 11], [10, 12], [11, 12],
];
const PULSES = [2, 5, 8, 11, 14];

export function NarrativeField({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true">
      <defs>
        <linearGradient id="nf-line" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6B7FFF" />
          <stop offset="1" stopColor="#C084FC" />
        </linearGradient>
        <radialGradient id="nf-node">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor="#A5B4FF" />
          <stop offset="1" stopColor="#6B7FFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {EDGES.map(([a, b], i) => {
        const [x1, y1] = NODES[a];
        const [x2, y2] = NODES[b];
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#nf-line)" strokeOpacity="0.22" strokeWidth="1" />
            {PULSES.includes(i) ? (
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E9D5FF" strokeWidth="1.6" strokeLinecap="round" pathLength={100} className="onb-pulse" style={{ animationDelay: `${(i % 5) * 0.9}s` }} />
            ) : null}
          </g>
        );
      })}
      {NODES.map(([x, y, r], i) => (
        <g key={i} className="onb-node" style={{ animationDelay: `${(i * 0.37) % 3}s`, transformOrigin: `${x}px ${y}px` }}>
          <circle cx={x} cy={y} r={r * 4} fill="url(#nf-node)" opacity="0.35" />
          <circle cx={x} cy={y} r={r} fill="#C7D0FF" />
        </g>
      ))}
    </svg>
  );
}

const STEP_HINTS: Array<[string, string]> = [
  ["Who you are and what matters most", "Siapa Anda dan apa yang paling penting"],
  ["The brand, people and issues to watch", "Brand, tokoh, dan isu yang dipantau"],
  ["Where Narriv listens", "Dari mana Narriv mendengarkan"],
  ["How you hear about a risk", "Cara Anda menerima peringatan risiko"],
  ["A first look at your dashboard", "Gambaran awal dashboard Anda"],
];

/** The left panel on wide screens. `current` is 6 while the workspace is being set up, so every step shows done. */
export function OnboardingAside({ current }: { current: number }) {
  const t = useTranslations("OnboardingDesign.steps");
  const labels = [t("profile"), t("keywords"), t("sources"), t("notifications"), t("preview")];
  return (
    <aside className="relative hidden h-dvh flex-col overflow-hidden bg-[#020733] px-10 py-9 text-white lg:sticky lg:top-0 lg:flex xl:px-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(110,80,255,0.35),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(236,72,153,0.16),transparent_40%),linear-gradient(180deg,#040a3d_0%,#020733_100%)]" />
      <NarrativeField className="opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,51,0.92)_0%,rgba(2,7,51,0.55)_60%,rgba(2,7,51,0.2)_100%)]" />

      <div className="relative z-10 flex h-full flex-col">
        <img src="/brand/logo-p.webp" alt="Narriv" width={128} height={48} className="h-8 w-auto self-start" />

        <div className="mt-[7dvh]">
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#A5B4FF]">
            {current > 5 ? pickL("Almost Ready", "Hampir Siap") : pickL(`Step ${current} of 5`, `Langkah ${current} dari 5`)}
          </p>
          <h2 className="mt-3 text-[30px] font-bold leading-[1.12] tracking-[-0.035em]">
            {pickL("Set Up Your", "Siapkan Sistem")}
            <br />
            <span className="bg-gradient-to-r from-[#8EA0FF] via-[#C084FC] to-[#F472B6] bg-clip-text text-transparent">
              Narrative Intelligence
            </span>
          </h2>
          <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-white/60">
            {pickL("Five short steps. Narriv starts listening the moment you finish.", "Lima langkah singkat. Narriv mulai memantau begitu Anda selesai.")}
          </p>
        </div>

        <ol className="mt-[5dvh] space-y-1">
          {labels.map((label, i) => {
            const num = i + 1;
            const done = num < current;
            const active = num === current;
            return (
              <li key={label} className={cn("relative flex gap-4 rounded-2xl px-3 py-3 transition-colors duration-300", active && "bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(165,180,255,0.18)]")}>
                {i < labels.length - 1 ? (
                  <span className={cn("absolute left-[27px] top-[44px] h-[calc(100%-28px)] w-px", done ? "bg-[#8EA0FF]" : "bg-white/12")} />
                ) : null}
                <span
                  className={cn(
                    "relative grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-black transition-all duration-300",
                    done && "bg-[#465FFF] text-white",
                    active && "bg-white text-[#020733] shadow-[0_0_0_5px_rgba(107,127,255,0.25),0_0_24px_rgba(139,92,255,0.7)]",
                    !done && !active && "border border-white/20 text-white/50",
                  )}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : num}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn("block text-[14px] font-bold", active ? "text-white" : done ? "text-white/80" : "text-white/50")}>{label}</span>
                  <span className={cn("mt-0.5 block text-[12.5px] leading-snug", active ? "text-white/65" : "text-white/35")}>{pickL(...STEP_HINTS[i])}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-auto flex items-center gap-2 pt-8 text-[12.5px] text-white/40">
          <span className="size-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
          {pickL("Your data is encrypted and private to your workspace.", "Data Anda terenkripsi dan hanya untuk workspace Anda.")}
        </p>
      </div>
    </aside>
  );
}

/** Phones and tablets: five segments that fill as the steps are done. */
export function OnboardingProgress({ current }: { current: number }) {
  return (
    <div className="lg:hidden">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#465FFF]">
        {current > 5 ? pickL("Almost Ready", "Hampir Siap") : pickL(`Step ${current} of 5`, `Langkah ${current} dari 5`)}
      </p>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-1.5 rounded-full transition-colors duration-300", n < current ? "bg-[#465FFF]" : n === current ? "bg-gradient-to-r from-[#465FFF] to-[#C084FC]" : "bg-[#DDE2F2]")} />
        ))}
      </div>
    </div>
  );
}
