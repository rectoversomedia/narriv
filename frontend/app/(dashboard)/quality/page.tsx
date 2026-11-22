"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { getCveAccuracy, getQualitySample, getToneAccuracy, reviewTone, type ToneKey } from "@/lib/api-service";
import { useWorkspaceUseCase } from "@/lib/use-case";
import { cveCategory } from "@/lib/cve";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

// Uji Akurasi: people check the AI's tone on a balanced sample of records. The accuracy shown here (and in reports and
// pitches) comes only from these checks, with its sample size and 95% interval.
const TONES: Array<{ key: ToneKey; en: string; id: string; chip: string; solid: string }> = [
  { key: "positive", en: "Positive", id: "Positif", chip: "bg-[#E5F6EE] text-[#047857]", solid: "bg-[#12A66A]" },
  { key: "neutral", en: "Neutral", id: "Netral", chip: "bg-[#F1F4FA] text-[#4A5578]", solid: "bg-[#8B93B0]" },
  { key: "negative", en: "Negative", id: "Negatif", chip: "bg-[#FDECEC] text-[#B42318]", solid: "bg-[#E5484D]" },
  { key: "mixed", en: "Mixed", id: "Campuran", chip: "bg-[#FFF4E5] text-[#A04606]", solid: "bg-[#F59E0B]" },
];
const toneOf = (k: ToneKey) => TONES.find((t) => t.key === k)!;

export default function QualityPage() {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const acc = useQuery({ queryKey: ["tone-accuracy"], queryFn: getToneAccuracy });
  const { useCase } = useWorkspaceUseCase();
  const cveAcc = useQuery({ queryKey: ["cve-accuracy"], queryFn: getCveAccuracy, enabled: useCase === "cve" });
  const sample = useQuery({ queryKey: ["quality-sample"], queryFn: () => getQualitySample(20) });
  const [done, setDone] = useState<string[]>([]);
  const review = useMutation({
    meta: { silent: true },
    mutationFn: ({ id, tone }: { id: string; tone: ToneKey }) => reviewTone(id, tone),
    onSuccess: (_r, v) => {
      setDone((d) => [...d, v.id]);
      void qc.invalidateQueries({ queryKey: ["tone-accuracy"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Could not save.", "Gagal menyimpan.")),
  });
  const queue = (sample.data?.data ?? []).filter((s) => !done.includes(s.id));
  const current = queue[0];
  const a = acc.data;
  const toGo = Math.max(0, 50 - (a?.n ?? 0));

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[#101334] sm:text-[28px]">{L("Accuracy Check", "Uji Akurasi")}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94]">{L("Check the AI's tone on real records. The accuracy is computed only from these checks, so the number you show a client is measured, not claimed.", "Periksa nada AI pada catatan asli. Akurasi dihitung hanya dari pemeriksaan ini, jadi angka yang ditunjukkan ke klien benar-benar terukur, bukan klaim.")}</p>
      </header>

      {useCase === "cve" && cveAcc.data ? (
        <section className={cn(BOX, "grid gap-5 md:grid-cols-[260px_1fr]")}>
          <div className="grid place-items-center rounded-[16px] bg-[#070A1F] p-5 text-center text-white">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#A5B4FF]">{L("PCVE category accuracy", "Akurasi kategori PCVE")}</p>
              <p className="mt-2 text-[56px] font-black leading-none">{cveAcc.data.accuracy != null ? `${cveAcc.data.accuracy}%` : "—"}</p>
              <p className="mt-2 text-[12.5px] text-white/70">{cveAcc.data.n ? L(`from ${cveAcc.data.n} reviewed records`, `dari ${cveAcc.data.n} catatan yang ditinjau`) : L("No records reviewed yet", "Belum ada catatan yang ditinjau")}</p>
              {cveAcc.data.interval ? <p className="mt-1 text-[11.5px] text-white/55">{L(`95% range ${cveAcc.data.interval.low}–${cveAcc.data.interval.high}%`, `Rentang 95%: ${cveAcc.data.interval.low}–${cveAcc.data.interval.high}%`)}</p> : null}
              <span className={cn("mt-3 inline-block rounded-full px-3 py-1 text-[11.5px] font-black", cveAcc.data.enough ? "bg-[#12A66A]" : "bg-white/15")}>{cveAcc.data.enough ? L("Valid sample", "Sampel sah") : L(`${Math.max(0, 50 - cveAcc.data.n)} more to a valid sample`, `${Math.max(0, 50 - cveAcc.data.n)} lagi untuk sampel sah`)}</span>
            </div>
          </div>
          <div className="grid content-start gap-3">
            <p className="text-[13px] font-bold text-[#5F6B94]">{L("Per category the AI suggested · correct = confirmed as suggested", "Per kategori yang disarankan AI · benar = dikonfirmasi tanpa diubah")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {cveAcc.data.byCategory.filter((c) => c.n > 0).map((c) => {
                const cat = cveCategory(c.id);
                return (
                  <div key={c.id} className="rounded-[12px] bg-[#F7F8FC] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-black", cat?.tone)}>{cat ? L(cat.label[0], cat.label[1]) : c.id}</span>
                      <span className="text-[14px] font-black tabular-nums text-[#101334]">{c.accuracy != null ? `${c.accuracy}%` : "—"} <span className="text-[12px] font-semibold text-[#5A6478]">· n={c.n}</span></span>
                    </div>
                    {c.dismissed || c.corrected ? <p className="mt-1 text-[11.5px] font-semibold text-[#5A6478]">{L(`${c.dismissed} dismissed · ${c.corrected} corrected`, `${c.dismissed} ditolak · ${c.corrected} dikoreksi`)}</p> : null}
                  </div>
                );
              })}
            </div>
            <p className="rounded-[12px] bg-[#EEF1FF] px-4 py-3 text-[13px] font-semibold text-[#31406B]">{L("Measured from the team's own reviews in Monitoring: confirm, dismiss, or correct the category. Every review improves this number's reliability.", "Diukur dari tinjauan tim sendiri di Percakapan: konfirmasi, tolak, atau koreksi kategorinya. Setiap tinjauan membuat angka ini makin bisa dipercaya.")}</p>
          </div>
        </section>
      ) : null}

      <section className={cn(BOX, "grid gap-5 md:grid-cols-[260px_1fr]")}>
        <div className="grid place-items-center rounded-[16px] bg-[#070A1F] p-5 text-center text-white">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#A5B4FF]">{L("Tone accuracy", "Akurasi nada")}</p>
            <p className="mt-2 text-[56px] font-black leading-none">{a?.accuracy != null ? `${a.accuracy}%` : "—"}</p>
            <p className="mt-2 text-[12.5px] text-white/70">{a?.n ? L(`from ${a.n} checked records`, `dari ${a.n} catatan yang dicek`) : L("No records checked yet", "Belum ada catatan yang dicek")}</p>
            {a?.interval ? <p className="mt-1 text-[11.5px] text-white/55">{L(`95% range ${a.interval.low}–${a.interval.high}%`, `Rentang 95%: ${a.interval.low}–${a.interval.high}%`)}</p> : null}
            <span className={cn("mt-3 inline-block rounded-full px-3 py-1 text-[11.5px] font-black", a?.enough ? "bg-[#12A66A]" : "bg-white/15")}>{a?.enough ? L("Valid sample", "Sampel sah") : L(`${toGo} more to a valid sample`, `${toGo} lagi untuk sampel sah`)}</span>
          </div>
        </div>
        <div className="grid gap-3">
          <p className="text-[13px] font-bold text-[#5F6B94]">{L("Per tone the AI gave", "Per nada yang diberikan AI")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TONES.map((t) => {
              const row = a?.byTone?.[t.key];
              return (
                <div key={t.key} className="flex items-center justify-between rounded-[12px] bg-[#F7F8FC] px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-black", t.chip)}>{L(t.en, t.id)}</span>
                  <span className="text-[14px] font-black tabular-nums text-[#101334]">{row?.accuracy != null ? `${row.accuracy}%` : "—"} <span className="text-[12px] font-semibold text-[#5A6478]">· n={row?.n ?? 0}</span></span>
                </div>
              );
            })}
          </div>
          <p className="rounded-[12px] bg-[#FFF7ED] px-4 py-3 text-[13px] font-semibold text-[#A04606]">{L(`Missed negatives: ${a?.missedNegative ?? 0}. A negative record the AI called something else is the costliest mistake, so it is counted on its own.`, `Negatif yang terlewat: ${a?.missedNegative ?? 0}. Catatan negatif yang dibaca AI sebagai nada lain adalah kesalahan paling mahal, jadi dihitung terpisah.`)}</p>
        </div>
      </section>

      <section className={cn(BOX, "grid gap-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-black text-[#101334]">{L("Check the next record", "Cek catatan berikutnya")}</h2>
          <span className="text-[12.5px] font-bold text-[#5A6478]">{L(`${queue.length} in this round`, `${queue.length} di putaran ini`)}</span>
        </div>
        {sample.isPending ? <p className="text-[13px] text-[#5A6478]">{L("Loading…", "Memuat…")}</p> : current ? (
          <div className="grid gap-4">
            <div className="rounded-[16px] bg-[#F7F8FC] p-5">
              <p className="text-[12px] font-bold text-[#5A6478]">{current.publisher ?? current.platform ?? ""}</p>
              <p className="mt-1 text-[18px] font-black leading-snug text-[#101334]">{current.title}</p>
              {current.excerpt && current.excerpt !== current.title ? <p className="mt-2 text-[14px] leading-relaxed text-[#31406B]">{current.excerpt}</p> : null}
              {current.url ? <a href={current.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-[#3B52F5] hover:underline">{L("Open source", "Buka sumber")} <ExternalLink size={12} /></a> : null}
              <p className="mt-3 text-[13px] font-semibold text-[#101334]">{L("AI says", "Kata AI")}: <span className={cn("ml-1 rounded-full px-2.5 py-0.5 text-[12px] font-black", toneOf(current.aiTone).chip)}>{L(toneOf(current.aiTone).en, toneOf(current.aiTone).id)}</span></p>
            </div>
            <div className="grid gap-2">
              <button type="button" disabled={review.isPending} onClick={() => review.mutate({ id: current.id, tone: current.aiTone })} className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#12A66A] text-[15px] font-black text-white shadow-[0_3px_0_#101334] disabled:opacity-60">
                <BadgeCheck size={18} /> {L("Correct", "Benar")}
              </button>
              <p className="text-center text-[12.5px] font-semibold text-[#5A6478]">{L("Wrong? Pick the right tone:", "Salah? Pilih nada yang benar:")}</p>
              <div className="grid grid-cols-3 gap-2">
                {TONES.filter((t) => t.key !== current.aiTone).map((t) => (
                  <button key={t.key} type="button" disabled={review.isPending} onClick={() => review.mutate({ id: current.id, tone: t.key })} className={cn("h-11 rounded-[12px] border-[1.5px] border-[#101334] bg-white text-[13.5px] font-black text-[#101334] shadow-[0_2px_0_#101334] disabled:opacity-60")}>
                    <span className={cn("mr-2 inline-block size-2.5 rounded-full", t.solid)} />{L(t.en, t.id)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 text-center">
            <p className="text-[14px] font-bold text-[#101334]">{L("This round is done. Thank you.", "Putaran ini selesai. Terima kasih.")}</p>
            <button type="button" onClick={() => { setDone([]); void qc.invalidateQueries({ queryKey: ["quality-sample"] }); }} className="mx-auto inline-flex h-11 items-center rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white shadow-[0_3px_0_#101334]">{L("Next 20 records", "20 catatan berikutnya")}</button>
          </div>
        )}
      </section>
    </div>
  );
}
