"use client";

import { useState } from "react";
import type { RegionBreakdown } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * Where the records are about, per province: a bar for the count, the negative share beside it, and the cities
 * named most. Picking a province filters Monitoring to it; picking it again clears the filter. Records about no
 * Indonesian place are counted at the foot, so the bars never pretend to cover everything.
 *
 * A second tab shows where accounts SAY they are (the platform's location label), kept apart from what records are
 * about. Neither is an IP address: platforms do not share those.
 */
export function RegionPanel({ data, days, selected, onSelect, loading }: { data?: RegionBreakdown; days: number; selected?: string; onSelect: (code: string | undefined) => void; loading?: boolean }) {
  const L = useL();
  const [view, setView] = useState<"about" | "accounts">("about");
  const accounts = data?.accountProvinces ?? [];
  const accountMax = Math.max(1, ...accounts.map((a) => a.total));
  const provinces = data?.provinces ?? [];
  const top = provinces.slice(0, 8);
  const max = Math.max(1, ...top.map((p) => p.total));
  const periodLabel = days === 1 ? L("last 24 hours", "24 jam terakhir") : L(`last ${days} days`, `${days} hari terakhir`);

  return (
    <section className={BOX}>
      <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("By Region", "Sebaran Wilayah")}</h2>
      <p className="mt-0.5 text-[12px] font-medium text-[#5A6478]">
        {view === "about" ? L(`Provinces discussed, ${periodLabel}`, `Provinsi yang dibicarakan, ${periodLabel}`) : L(`Where accounts say they are, ${periodLabel}`, `Lokasi yang dicantumkan akun, ${periodLabel}`)}
      </p>
      <div role="tablist" aria-label={L("Region view", "Tampilan wilayah")} className="mt-3 inline-flex rounded-[10px] bg-[#F1F4FA] p-0.5">
        {([["about", L("Discussed", "Dibahas")], ["accounts", L("Account Location", "Lokasi Akun")]] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)} className={cn("h-8 rounded-[8px] px-3 text-[12px] font-bold transition", view === key ? "bg-white text-[#101334] shadow-sm" : "text-[#5A6478] hover:text-[#101334]")}>
            {label}
          </button>
        ))}
      </div>

      {view === "accounts" ? (
        loading ? null : accounts.length === 0 ? (
          <p className="mt-4 text-[12px] font-medium leading-relaxed text-[#5A6478]">
            {L(
              "No account in this period shares a location in Indonesia yet. This comes from location labels that TikTok, YouTube and some marketplaces show. Most social accounts do not share one.",
              "Belum ada akun pada periode ini yang mencantumkan lokasi di Indonesia. Data ini berasal dari label lokasi yang ditampilkan TikTok, YouTube, dan sebagian marketplace. Kebanyakan akun media sosial tidak mencantumkannya.",
            )}
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {accounts.slice(0, 8).map((a) => (
              <li key={a.name}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-bold text-[#101334]">{a.name}</span>
                  <span className="text-[13px] font-black tabular-nums text-[#101334]">{a.total}</span>
                </span>
                <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#E8ECF6]">
                  <span className="h-full bg-[#8B5CF6]" style={{ width: `${(a.total / accountMax) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )
      ) : loading ? (
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
                      {p.negative > 0 ? <span className={cn("text-[12px] font-bold", neg >= 40 ? "text-[#C81E1E]" : "text-[#A04606]")}>{L(`${neg}% Negative`, `${neg}% Negatif`)}</span> : null}
                      <span className="text-[13px] font-black tabular-nums text-[#101334]">{p.total}</span>
                    </span>
                  </span>
                  <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#E8ECF6]">
                    <span className="h-full bg-[#EF4444]" style={{ width: `${(p.negative / max) * 100}%` }} />
                    <span className="h-full bg-[#465FFF]" style={{ width: `${((p.total - p.negative) / max) * 100}%` }} />
                  </span>
                  {p.cities.length ? (
                    <span className="mt-1 block truncate text-[12px] font-medium text-[#5A6478]">{p.cities.map((c) => c.name).join(", ")}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {data && data.total > 0 && view === "about" ? (
        <p className="mt-3 text-[12px] font-medium leading-relaxed text-[#5A6478]">
          {L(
            `${data.located} of ${data.total} mentions name a place in Indonesia${provinces.length > top.length ? `; ${provinces.length - top.length} more provinces in the filter` : ""}.`,
            `${data.located} dari ${data.total} percakapan menyebut tempat di Indonesia${provinces.length > top.length ? `; ${provinces.length - top.length} provinsi lain ada di filter` : ""}.`,
          )}
        </p>
      ) : null}
      <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#6B7591]">
        {L(
          "Read from each mention's text and from platform location labels, never from IP addresses.",
          "Dibaca dari isi percakapan dan label lokasi platform, bukan dari alamat IP.",
        )}
      </p>
    </section>
  );
}
