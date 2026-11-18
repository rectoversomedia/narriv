"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, FileText, Lightbulb, Loader2, RefreshCcw, ShieldAlert, TrendingUp, Waves } from "lucide-react";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { getContentIdeas, getContentWaves, type ContentIdeas, type ContentWave } from "@/lib/api-service";
import { MonoLabel } from "@/components/ui/stamp";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { duration } from "@/components/intelligence/narrative-spread";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * Waves worth riding: conversations growing right now, for marketing teams that want to join while it lasts. Each
 * card shows the growth, a risk check before joining (with its reasons), and how long similar conversations in this
 * workspace usually peaked (join before the peak). Content ideas are made on request, one model call per click, and
 * kept for the session so leaving the page does not lose them.
 */

const RISK = {
  go: { en: "Safe to Join", id: "Aman Diikuti", tone: "bg-[#E5F6EE] text-[#047857]", icon: CheckCircle2 },
  careful: { en: "Join With Care", id: "Hati-hati", tone: "bg-[#FFF3DC] text-[#A04606]", icon: AlertTriangle },
  avoid: { en: "Better to Skip", id: "Sebaiknya Hindari", tone: "bg-[#FDECEC] text-[#B42318]", icon: ShieldAlert },
} as const;

const SENSITIVE: Record<string, [string, string]> = {
  grief: ["grief or loss", "duka atau korban"],
  disaster: ["a disaster", "bencana"],
  religion: ["religion", "agama"],
  ethnicity: ["ethnicity or race", "SARA"],
  politics: ["politics", "politik"],
  violence: ["violence", "kekerasan"],
};

function Reasons({ wave }: { wave: ContentWave }) {
  const L = useL();
  if (!wave.risk.reasons.length) return <p className="text-[12px] font-medium text-[#047857]">{L("Mostly positive or neutral, no sensitive subject found.", "Mayoritas positif atau netral, tidak ada topik sensitif.")}</p>;
  return (
    <ul className="space-y-1">
      {wave.risk.reasons.map((r, i) => (
        <li key={i} className="flex items-start gap-1.5 text-[12px] font-medium text-[#5A3A06]">
          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-current" />
          {r.code === "negative"
            ? L(`${r.value}% of the conversation is negative.`, `${r.value}% percakapannya negatif.`)
            : r.code === "sensitive"
              ? L(`Touches on ${SENSITIVE[String(r.value)]?.[0] ?? r.value}.`, `Menyentuh topik ${SENSITIVE[String(r.value)]?.[1] ?? r.value}.`)
              : L("Several accounts posted near-identical text; it may be coordinated.", "Beberapa akun memposting teks hampir sama; bisa jadi terkoordinasi.")}
        </li>
      ))}
    </ul>
  );
}

function Ideas({ ideas }: { ideas: ContentIdeas }) {
  const L = useL();
  return (
    <div className="mt-4 rounded-[14px] bg-[#0B1430] p-4 text-white">
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#A5B4FF]"><Lightbulb size={13} aria-hidden="true" /> {L("Content Ideas", "Ide Konten")}</p>
      <ol className="mt-3 grid gap-2.5 md:grid-cols-3">
        {ideas.angles.map((a, i) => (
          <li key={i} className="rounded-[12px] bg-white/[0.07] p-3">
            <p className="font-mono text-[11.5px] font-bold text-[#A5B4FF]">0{i + 1} · {a.format}{a.platform ? ` · ${a.platform}` : ""}</p>
            <p className="mt-1.5 text-[14px] font-black leading-snug">{a.title}</p>
            <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-white/75">{a.hook}</p>
          </li>
        ))}
      </ol>
      {ideas.caution ? <p className="mt-3 flex items-start gap-1.5 text-[12px] font-semibold text-[#FCD34D]"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> {ideas.caution}</p> : null}
      <p className="mt-2 text-[12px] font-medium text-white/45">{L("Suggestions from AI. Check them against your brand guidelines before posting.", "Saran dari AI. Cocokkan dengan pedoman brand sebelum diunggah.")}</p>
    </div>
  );
}

/** The time window in words: how long ago the burst began and how long until similar narratives usually peak. */
function windowText(w: ContentWave["window"], L: ReturnType<typeof useL>) {
  const since = w.burstAgeHours === null ? null : w.burstAgeHours < 1 ? L("Started within the hour", "Mulai naik kurang dari 1 jam lalu") : L(`Rising for ${duration(w.burstAgeHours)}`, `Naik sejak ${duration(w.burstAgeHours)} lalu`);
  if (w.hoursToTypicalPeak === null) return { head: L("Move fast", "Bergerak cepat"), note: since ? `${since}. ${L("Not enough history yet to tell when it peaks.", "Riwayat belum cukup untuk memperkirakan kapan memuncak.")}` : L("Not enough history yet to tell when it peaks.", "Riwayat belum cukup untuk memperkirakan kapan memuncak.") };
  if (w.hoursToTypicalPeak > 0) return { head: L(`Best to join within ${duration(w.hoursToTypicalPeak)}`, `Idealnya ikut dalam ${duration(w.hoursToTypicalPeak)}`), note: `${since ? `${since}. ` : ""}${L(`Narratives here usually peak ${duration(w.typicalPeakHours ?? 0)} after they start.`, `Narasi di sini biasanya memuncak ${duration(w.typicalPeakHours ?? 0)} setelah mulai.`)}` };
  return { head: L("Likely near or past its peak", "Kemungkinan sudah dekat atau lewat puncak"), note: `${since ? `${since}. ` : ""}${L("Join only with something quick and relevant.", "Ikut hanya dengan konten yang cepat dan relevan.")}` };
}

const ideasKey = (id: string) => ["opportunities", "content-ideas", id] as const;

function WaveCard({ wave }: { wave: ContentWave }) {
  const L = useL();
  const queryClient = useQueryClient();
  const [planOpen, setPlanOpen] = useState(false);
  // Ideas are kept in the query cache for the session: leaving and coming back does not cost another model call.
  const cached = useQuery({ queryKey: ideasKey(wave.id), queryFn: () => null as ContentIdeas | null, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const ideas = cached.data ?? null;
  const make = useMutation({ mutationFn: () => getContentIdeas(wave.id), onSuccess: (data) => queryClient.setQueryData(ideasKey(wave.id), data) });
  const risk = RISK[wave.risk.level];
  const RiskIcon = risk.icon;
  const m = wave.momentum;
  const growth = m.prior24h > 0 && m.changePct !== null ? `${m.changePct >= 0 ? "+" : ""}${m.changePct}%` : L("New", "Baru");
  const win = windowText(wave.window, L);
  return (
    <li className="rounded-[18px] border-[1.5px] border-[#101334] bg-white p-4 shadow-[0_4px_0_#101334] sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[12px] font-bold", risk.tone)}><RiskIcon size={13} aria-hidden="true" /> {L(risk.en, risk.id)}</span>
        <span className="inline-flex items-center gap-1 rounded-[8px] bg-[#EEF1FF] px-2.5 py-1 font-mono text-[12px] font-bold text-[#3B52F5]"><TrendingUp size={13} aria-hidden="true" /> {growth} · {m.last24h} {L("in 24h", "dalam 24 jam")}</span>
        <span className="flex items-center gap-1">{wave.platforms.slice(0, 5).map((p) => <PlatformIcon key={p} platform={p} className="size-4" />)}</span>
      </div>
      <h3 className="mt-3 text-[19px] font-black leading-snug tracking-[-0.015em] text-[#101334]">{wave.title}</h3>
      {wave.description ? <p className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-relaxed text-[#31406B]">{wave.description}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] bg-[#FBFCFF] p-3 ring-1 ring-[#EEF1F7]">
          <p className="text-[11.5px] font-bold text-[#5A6478]">{L("Risk Check", "Cek Risiko")}</p>
          <div className="mt-2"><Reasons wave={wave} /></div>
        </div>
        <div className="rounded-[12px] bg-[#FBFCFF] p-3 ring-1 ring-[#EEF1F7]">
          <p className="flex items-center gap-1 text-[11.5px] font-bold text-[#5A6478]"><Clock size={12} aria-hidden="true" /> {L("Time Window", "Jendela Waktu")}</p>
          <p className="mt-2 text-[13px] font-bold leading-snug text-[#101334]">{win.head}</p>
          <p className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-[#5A6478]">{win.note}</p>
        </div>
      </div>

      {wave.samples.length ? (
        <ul className="mt-3 space-y-1">
          {wave.samples.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] font-medium text-[#31406B]">
              <PlatformIcon platform={s.platform || "news"} className="mt-0.5 size-3.5" />
              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="line-clamp-1 hover:text-[#3B52F5] hover:underline">{s.title}</a> : <span className="line-clamp-1">{s.title}</span>}
            </li>
          ))}
        </ul>
      ) : null}

      {ideas ? (
        <>
          <Ideas ideas={ideas} />
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => setPlanOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-[#465FFF] px-4 text-[13px] font-black text-white transition hover:bg-[#3B52F5]">
              <FileText size={15} aria-hidden="true" /> {L("Turn Into an Action Plan", "Jadikan Rencana Aksi")}
            </button>
            <button type="button" onClick={() => make.mutate()} disabled={make.isPending} className="inline-flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-[#101334] bg-white px-4 text-[13px] font-black text-[#101334] transition hover:bg-[#F7F8FC] disabled:opacity-50">
              {make.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCcw size={15} aria-hidden="true" />} {L("Other Ideas", "Ide Lain")}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => make.mutate()} disabled={make.isPending || wave.risk.level === "avoid"} className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-[#465FFF] px-4 text-[13px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50">
            {make.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Lightbulb size={15} aria-hidden="true" />}
            {make.isPending ? L("Writing Ideas…", "Menyusun Ide…") : L("Get Content Ideas", "Buat Ide Konten")}
          </button>
          {wave.risk.level === "avoid" ? <span className="text-[12px] font-medium text-[#B42318]">{L("Joining a largely negative conversation is not recommended.", "Ikut dalam percakapan yang mayoritas negatif tidak disarankan.")}</span> : null}
          {make.isError ? <span className="text-[12px] font-semibold text-[#B42318]">{make.error instanceof Error && make.error.message ? make.error.message : L("Could not make ideas. Try again.", "Ide belum bisa dibuat. Coba lagi.")}</span> : null}
        </div>
      )}
      {planOpen ? (
        <CreateActionPlanModal open onOpenChange={(o) => { if (!o) setPlanOpen(false); }} initialClusterId={wave.id} initialStrategyType="content_strategy" />
      ) : null}
    </li>
  );
}

export function ContentWavesSection() {
  const L = useL();
  const waves = useQuery({ queryKey: ["opportunities", "waves"], queryFn: getContentWaves, staleTime: 5 * 60 * 1000 });
  const list = waves.data ?? [];
  return (
    <section className={BOX}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <MonoLabel>{L("For Marketing", "Untuk Tim Marketing")}</MonoLabel>
          <h2 className="mt-1.5 flex items-center gap-2 text-[20px] font-black tracking-[-0.02em] text-[#101334]"><Waves size={20} className="text-[#465FFF]" aria-hidden="true" /> {L("Waves to Ride", "Tren yang Bisa Ditunggangi")}</h2>
          <p className="mt-1 max-w-2xl text-[13px] font-medium text-[#5A6478]">{L("Conversations growing in the last 24 hours, checked for risk before your brand joins.", "Percakapan yang naik dalam 24 jam terakhir, sudah dicek risikonya sebelum brand ikut masuk.")}</p>
        </div>
      </div>
      {waves.isLoading ? (
        <div className="mt-4 grid gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-[18px]" />)}</div>
      ) : list.length ? (
        <ul className="mt-4 grid gap-4">{list.map((w) => <WaveCard key={w.id} wave={w} />)}</ul>
      ) : (
        <p className="mt-4 rounded-[12px] bg-[#F7F8FC] p-4 text-[13px] font-medium leading-relaxed text-[#5A6478]">
          {L(
            "No conversation is growing right now. To catch trends beyond your brand, add category keywords (for example \"skincare\" or \"kopi susu\") in Keywords.",
            "Belum ada percakapan yang sedang naik. Untuk menangkap tren di luar nama brand, tambahkan kata kunci kategori (misalnya \"skincare\" atau \"kopi susu\") di menu Kata Kunci.",
          )}
        </p>
      )}
    </section>
  );
}
