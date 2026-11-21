"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ChevronDown, RefreshCw } from "lucide-react";
import { getFutureIssues, type FutureIssue } from "@/lib/api-service";
import { issueHref } from "@/lib/evidence-links";
import { Skeleton } from "@/components/ui/Skeleton";
import { MonoLabel } from "@/components/ui/stamp";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * Future Issues: the stories most likely to become the brand's next issue, forecast from all of the workspace's data
 * (backend lib/future-issues.js). Each forecast shows its likelihood, horizon and impact, why it is expected (with the
 * data behind it), the early signs that would confirm it, and what to prepare now.
 */
const IMPACT = {
  high: { en: "High impact", id: "Dampak tinggi", cls: "bg-[#FDECEC] text-[#B42318]" },
  medium: { en: "Medium impact", id: "Dampak sedang", cls: "bg-[#FFF4E5] text-[#A04606]" },
  low: { en: "Low impact", id: "Dampak rendah", cls: "bg-[#EEF1FF] text-[#3B52F5]" },
} as const;

const barTone = (p: number) => (p >= 60 ? "bg-[#E5484D]" : p >= 40 ? "bg-[#F59E0B]" : "bg-[#465FFF]");

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11.5px] font-black uppercase tracking-[0.08em] text-[#5F6B94]">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[#31406B]">
            <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#465FFF]" aria-hidden="true" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Forecast({ f, rank, open, onToggle }: { f: FutureIssue; rank: number; open: boolean; onToggle: () => void }) {
  const L = useL();
  const impact = IMPACT[f.impact] ?? IMPACT.medium;
  return (
    <li className="rounded-[16px] border border-[#E4E8F2] bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-4 p-4 text-left sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#101334] text-[14px] font-black text-white">{rank}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15.5px] font-black leading-snug text-[#101334]">{f.title}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", impact.cls)}>{L(impact.en, impact.id)}</span>
            {f.horizon ? <span className="rounded-full bg-[#F1F4FA] px-2.5 py-0.5 text-[11.5px] font-bold text-[#4A5578]">{f.horizon}</span> : null}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 max-w-[260px] flex-1 overflow-hidden rounded-full bg-[#EEF0F6]">
              <div className={cn("h-full rounded-full", barTone(f.likelihood))} style={{ width: `${f.likelihood}%` }} />
            </div>
            <span className="shrink-0 text-[12.5px] font-black tabular-nums text-[#101334]">{f.likelihood}% <span className="font-semibold text-[#5F6B94]">{L("likely", "kemungkinan")}</span></span>
          </div>
        </div>
        <ChevronDown size={18} className={cn("mt-1 shrink-0 text-[#5F6B94] transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div className="grid gap-5 border-t border-[#EEF0F6] p-4 sm:p-5">
          <p className="text-[14px] leading-relaxed text-[#31406B]">{f.why}</p>
          <div className="grid gap-5 md:grid-cols-3">
            <List title={L("Based on", "Berdasarkan data")} items={f.evidence} />
            <List title={L("Early signs to watch", "Tanda awal yang perlu dipantau")} items={f.earlySignals} />
            <List title={L("Prepare now", "Siapkan sekarang")} items={f.prepare} />
          </div>
          {f.audiences.length || f.related.length ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF0F6] pt-4">
              {f.audiences.map((a) => <span key={a} className="rounded-full bg-[#F7F8FC] px-2.5 py-1 text-[12px] font-semibold text-[#4A5578]">{a}</span>)}
              {f.related.map((r) => (
                <Link key={r.id} href={issueHref(r.id)} className="inline-flex items-center gap-1 rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[12px] font-bold text-[#3B52F5] hover:underline">
                  {r.title} <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function FutureIssuesPanel() {
  const L = useL();
  const qc = useQueryClient();
  const [open, setOpen] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const q = useQuery({ queryKey: ["future-issues"], queryFn: () => getFutureIssues(), staleTime: 30 * 60 * 1000, retry: 1 });
  const refresh = async () => {
    setRefreshing(true);
    try { qc.setQueryData(["future-issues"], await getFutureIssues(true)); } catch { /* keep the last forecast */ } finally { setRefreshing(false); }
  };
  const d = q.data;
  const at = d?.at ? new Date(d.at).toLocaleString(L("en-GB", "id-ID"), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <section className={cn(BOX, "grid gap-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <MonoLabel>{L("Forecast · all data, last 30 days", "Prediksi · semua data, 30 hari terakhir")}</MonoLabel>
          <h2 className="mt-1.5 text-[20px] font-black leading-tight text-[#101334]">{L("Future Issues", "Isu yang Akan Datang")}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5F6B94]">{L("The stories most likely to become your next issue, read from every issue, alert and record, with the signs to watch and what to prepare now.", "Cerita yang paling mungkin menjadi isu berikutnya, dibaca dari semua isu, peringatan, dan catatan, lengkap dengan tanda yang perlu dipantau dan apa yang perlu disiapkan sekarang.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link href="/forecast" className="inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-[#465FFF] px-3.5 text-[12.5px] font-bold text-white shadow-[0_2px_0_#101334] hover:bg-[#3B52F5]">
          {L("Open Issue Forecast", "Buka Prediksi Isu")} <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <button type="button" onClick={refresh} disabled={refreshing || q.isLoading} className="inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-3.5 text-[12.5px] font-bold text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC] disabled:opacity-60">
          <RefreshCw size={14} className={cn(refreshing && "animate-spin")} aria-hidden="true" /> {refreshing ? L("Reading the data…", "Membaca data…") : L("Update Forecast", "Perbarui Prediksi")}
        </button>
        </div>
      </div>

      {q.isLoading || refreshing ? (
        <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px] w-full rounded-[16px]" />)}</div>
      ) : q.isError ? (
        <p className="rounded-[12px] bg-[#F7F8FC] px-4 py-3 text-[13.5px] font-semibold text-[#5F6B94]">{L("The forecast could not be made right now. Try again in a moment.", "Prediksi belum bisa dibuat saat ini. Coba lagi sebentar.")}</p>
      ) : !d?.forecasts.length ? (
        <p className="rounded-[12px] bg-[#F7F8FC] px-4 py-3 text-[13.5px] font-semibold text-[#5F6B94]">{L("Not enough data yet. Forecasts appear once records and issues come in.", "Data belum cukup. Prediksi muncul setelah catatan dan isu mulai masuk.")}</p>
      ) : (
        <>
          <ol className="grid gap-3">
            {d.forecasts.map((f, i) => <Forecast key={f.title} f={f} rank={i + 1} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
          </ol>
          <p className="text-[12px] font-medium text-[#6B7591]">
            {L(`Based on ${d.basis.records} records, ${d.basis.issues} issues and ${d.basis.alerts} alerts · updated ${at}. A forecast is an estimate from the data, not a certainty.`, `Berdasarkan ${d.basis.records} catatan, ${d.basis.issues} isu, dan ${d.basis.alerts} peringatan · diperbarui ${at}. Prediksi adalah perkiraan dari data, bukan kepastian.`)}
          </p>
        </>
      )}
    </section>
  );
}
