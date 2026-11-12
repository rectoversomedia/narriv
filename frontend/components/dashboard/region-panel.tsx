"use client";

import type { RegionBreakdown } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * Where the records are about, per province: a bar for the count, the negative share beside it, and the cities
 * named most. Picking a province filters Monitoring to it; picking it again clears the filter. Records about no
 * Indonesian place are counted at the foot, so the bars never pretend to cover everything.
 */
export function RegionPanel({ data, days, selected, onSelect, loading }: { data?: RegionBreakdown; days: number; selected?: string; onSelect: (code: string | undefined) => void; loading?: boolean }) {
  const L = useL();
  const provinces = data?.provinces ?? [];
  const top = provinces.slice(0, 8);
  const max = Math.max(1, ...top.map((p) => p.total));
  const periodLabel = days === 1 ? L("last 24 hours", "24 jam terakhir") : L(`last ${days} days`, `${days} hari terakhir`);

  return (
    <section className={BOX}>
      <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("By Region", "Sebaran Wilayah")}</h2>
      <p className="mt-0.5 text-[12px] font-medium text-[#5A6478]">{L(`Provinces discussed, ${periodLabel}`, `Provinsi yang dibicarakan, ${periodLabel}`)}</p>

      {loading ? (
        <div className="mt-4 space-y-2.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-[#F1F4FA]" />)}
        </div>
      ) : top.length === 0 ? (
        <p className="mt-4 text-[12px] font-medium leading-relaxed text-[#5A6478]">
          {L(
            "No mention in this period names a province or city yet. Regions are read from each article's or post's own text.",
            "Belum ada percakapan pada periode ini yang menyebut provinsi atau kota. Wilayah dibaca dari isi setiap artikel atau postingan.",
          )}
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {top.map((p) => {
            const on = selected === p.code;
            const neg = p.total ? Math.round((p.negative / p.total) * 100) : 0;
            return (
              <li key={p.code}>
                <button
                  type="button"
                  onClick={() => onSelect(on ? undefined : p.code)}
                  aria-pressed={on}
                  className={cn("-mx-2.5 w-[calc(100%+1.25rem)] rounded-[10px] px-2.5 py-2 text-left transition", on ? "bg-[#EEF1FF]" : "hover:bg-[#F7F8FC]")}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-[13px] font-bold", on ? "text-[#3B52F5]" : "text-[#101334]")}>{p.name}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {p.negative > 0 ? <span className={cn("text-[11px] font-bold", neg >= 40 ? "text-[#C81E1E]" : "text-[#A04606]")}>{L(`${neg}% Negative`, `${neg}% Negatif`)}</span> : null}
                      <span className="text-[13px] font-black tabular-nums text-[#101334]">{p.total}</span>
                    </span>
                  </span>
                  <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#E8ECF6]">
                    <span className="h-full bg-[#EF4444]" style={{ width: `${(p.negative / max) * 100}%` }} />
                    <span className="h-full bg-[#465FFF]" style={{ width: `${((p.total - p.negative) / max) * 100}%` }} />
                  </span>
                  {p.cities.length ? (
                    <span className="mt-1 block truncate text-[11px] font-medium text-[#5A6478]">{p.cities.map((c) => c.name).join(", ")}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.total > 0 ? (
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-[#5A6478]">
          {L(
            `${data.located} of ${data.total} mentions name a place in Indonesia${provinces.length > top.length ? `; ${provinces.length - top.length} more provinces in the filter` : ""}.`,
            `${data.located} dari ${data.total} percakapan menyebut tempat di Indonesia${provinces.length > top.length ? `; ${provinces.length - top.length} provinsi lain ada di filter` : ""}.`,
          )}
        </p>
      ) : null}
    </section>
  );
}
