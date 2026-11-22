"use client";

import { useEffect, useState } from "react";
import { Telescope } from "lucide-react";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/**
 * While a forecast is being made (about a minute): what Narriv is reading now, step by step, with a bar that fills
 * over ~60 seconds, so the wait never looks like an empty page.
 */
export function ForecastLoading({ className }: { className?: string }) {
  const L = useL();
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT((x) => x + 1), 1000); return () => clearInterval(id); }, []);
  const steps = [
    L("Reading issues, alerts and records from the last 30 days", "Membaca isu, peringatan, dan catatan 30 hari terakhir"),
    L("Comparing this week with last week, per platform", "Membandingkan minggu ini dengan minggu lalu, per platform"),
    L("Learning from what the team handled before", "Belajar dari isu yang pernah ditangani tim"),
    L("Writing the forecasts and what to prepare", "Menyusun prediksi dan langkah persiapan"),
  ];
  const step = Math.min(steps.length - 1, Math.floor(t / 12));
  const pct = Math.min(95, Math.round((t / 60) * 100));
  return (
    <div role="status" aria-live="polite" className={cn("grid gap-4 rounded-[16px] border-[1.5px] border-dashed border-[#B8C2E6] bg-[#F8F9FF] p-5", className)}>
      <div className="flex items-center gap-3">
        <span className="relative grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#465FFF] text-white">
          <span className="absolute inset-0 animate-ping rounded-[12px] bg-[#465FFF] opacity-25" />
          <Telescope size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[15px] font-black text-[#101334]">{L("Narriv is reading your data…", "Narriv sedang membaca data…")}</p>
          <p className="text-[12.5px] font-medium text-[#5F6B94]">{L("A new forecast takes about a minute. It is saved, so the next visit opens at once.", "Prediksi baru butuh sekitar 1 menit. Hasilnya disimpan, jadi kunjungan berikutnya langsung tampil.")}</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E4E8F5]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#465FFF] via-[#8B5CF6] to-[#EC4899] transition-[width] duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <ol className="grid gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2 text-[13px] font-semibold", i < step ? "text-[#047857]" : i === step ? "text-[#101334]" : "text-[#9AA3C0]")}>
            <span className={cn("grid size-5 place-items-center rounded-full text-[10px] font-black", i < step ? "bg-[#12A66A] text-white" : i === step ? "bg-[#465FFF] text-white" : "bg-[#E4E8F5] text-[#8A94B8]")}>{i < step ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
