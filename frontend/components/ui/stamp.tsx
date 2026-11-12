import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small pieces of the Narriv signature used on the decision pages (alert detail, alerts, opportunities, timeline).

/** A mono, uppercase label above a block: the machine's voice naming what follows. */
export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]", className)}>{children}</p>;
}

export type Stat = { key: string; value: ReactNode; label: string; helper?: string; tone?: string; onClick?: () => void; active?: boolean };

/**
 * One ink strip of numbers instead of a row of separate boxes, so the figures read as one summary. A stat with
 * `onClick` is a filter button (`active` marks the chosen one).
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  const cols = stats.length >= 5 ? "lg:grid-cols-5" : stats.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-2 overflow-hidden rounded-[18px] border-[1.5px] border-[#101334] bg-white shadow-[0_4px_0_#101334]", cols, className)}>
      {stats.map((s, i) => {
        const inner = (
          <>
            <span className={cn("block text-[30px] font-black leading-none tracking-[-0.03em] sm:text-[34px]", s.tone ?? "text-[#101334]")}>{s.value}</span>
            <span className="mt-2 block text-[13px] font-bold text-[#101334]">{s.label}</span>
            {s.helper ? <span className="mt-0.5 block font-mono text-[11px] font-medium text-[#5F6B94]">{s.helper}</span> : null}
          </>
        );
        const cell = cn(
          "px-4 py-4 text-left sm:px-5 sm:py-5",
          // Hairlines between cells on every layout (2 columns on phones, one row on desktop).
          i % 2 === 1 && "border-l border-[#EEF0F6]",
          i >= 2 && "border-t border-[#EEF0F6] lg:border-t-0",
          i > 0 && "lg:border-l",
          // An odd last cell spans the phone row instead of leaving a hole beside it.
          stats.length % 2 === 1 && i === stats.length - 1 && "col-span-2 border-l-0 lg:col-span-1 lg:border-l",
        );
        return s.onClick ? (
          <button key={s.key} type="button" onClick={s.onClick} aria-pressed={s.active} className={cn(cell, "transition", s.active ? "bg-[#EEF1FF] shadow-[inset_0_-3px_0_#465FFF]" : "hover:bg-[#F7F8FC]")}>{inner}</button>
        ) : (
          <div key={s.key} className={cell}>{inner}</div>
        );
      })}
    </div>
  );
}
