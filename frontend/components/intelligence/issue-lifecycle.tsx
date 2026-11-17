"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Layers, Minus, Radio } from "lucide-react";
import type { NarrativeRecord } from "@/lib/api-service";
import { issueHref } from "@/lib/evidence-links";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

/**
 * Where each issue is in its life: a single ink rail with the five stages (appears, rises, peaks, falls, goes
 * quiet) and their counts, then the chosen stage explained (what it means and what to do now) with every issue in
 * it, each with its numbers and a way into its own page. Stages come from the page's own classification so the
 * counts match the figures above.
 */

export type StageKey = "emerging" | "accelerating" | "peaking" | "declining" | "dormant";

const STAGES: Array<{ key: StageKey; en: string; id: string; mean: [string, string]; todo: [string, string] }> = [
  {
    key: "emerging", en: "Emerging", id: "Muncul",
    mean: ["New conversations that only started in the last day.", "Percakapan baru yang mulai muncul dalam sehari terakhir."],
    todo: ["Check the facts, pick an owner, and if it is negative prepare a short holding statement before it spreads.", "Cek faktanya, tunjuk penanggung jawab, dan kalau negatif siapkan pernyataan sementara sebelum menyebar."],
  },
  {
    key: "accelerating", en: "Rising", id: "Naik",
    mean: ["Growing fast: clearly more mentions than the day before.", "Tumbuh cepat: percakapannya jelas lebih banyak dari sehari sebelumnya."],
    todo: ["This is the best moment to respond. Publish the clarification now, answer on the busiest channel, and check every hour.", "Ini saat terbaik untuk merespons. Terbitkan klarifikasi sekarang, jawab di kanal yang paling ramai, dan pantau tiap jam."],
  },
  {
    key: "peaking", en: "Peaking", id: "Puncak",
    mean: ["At the height of public attention, with high impact or the most mentions.", "Di puncak perhatian publik, dengan dampak tinggi atau percakapan terbanyak."],
    todo: ["Communicate actively: one spokesperson, one message, answers to the questions people repeat most.", "Komunikasi aktif: satu juru bicara, satu pesan, jawab pertanyaan yang paling sering diulang orang."],
  },
  {
    key: "declining", en: "Declining", id: "Mereda",
    mean: ["Fewer mentions than the day before: the conversation is cooling down.", "Percakapan lebih sedikit dari sehari sebelumnya: mulai mendingin."],
    todo: ["Close it out with a final update, measure what it cost, and avoid statements that restart the discussion.", "Tutup dengan pembaruan terakhir, ukur dampaknya, dan hindari pernyataan yang memancing pembahasan baru."],
  },
  {
    key: "dormant", en: "Quiet", id: "Sepi",
    mean: ["No new activity: the issue has gone quiet for now.", "Tidak ada aktivitas baru: isunya sedang sepi."],
    todo: ["Record what you learned. Keep it on watch: old issues come back when something new touches them.", "Catat pelajarannya. Tetap pantau: isu lama bisa muncul lagi saat ada pemicu baru."],
  },
];

const URGENCY: StageKey[] = ["accelerating", "peaking", "emerging", "declining", "dormant"];

const SENT: Record<string, { en: string; id: string; tone: string; dot: string }> = {
  negative: { en: "Negative", id: "Negatif", tone: "bg-[#FDECEC] text-[#B42318]", dot: "#E5484D" },
  positive: { en: "Positive", id: "Positif", tone: "bg-[#E5F6EE] text-[#047857]", dot: "#12A66A" },
  mixed: { en: "Mixed", id: "Campuran", tone: "bg-[#FFF3DC] text-[#A04606]", dot: "#F59E0B" },
  neutral: { en: "Neutral", id: "Netral", tone: "bg-[#EEF1F6] text-[#5A6478]", dot: "#94A3B8" },
};
const IMPACT: Record<string, [string, string]> = { HIGH: ["High impact", "Dampak tinggi"], MEDIUM: ["Medium impact", "Dampak sedang"], LOW: ["Low impact", "Dampak rendah"] };

function ago(iso: string | null | undefined) {
  if (!iso) return "—";
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (!Number.isFinite(h)) return "—";
  if (h < 1) return pickL("under an hour ago", "kurang dari 1 jam lalu");
  if (h < 48) return pickL(`${Math.round(h)} h ago`, `${Math.round(h)} jam lalu`);
  return new Date(iso).toLocaleDateString(intlLocale(), { day: "numeric", month: "short" });
}

function Change({ m }: { m: NarrativeRecord["momentum"] }) {
  if (!m) return <span className="font-mono text-[12px] font-bold text-[#6B7591]">—</span>;
  const up = m.last24h > m.prior24h, down = m.last24h < m.prior24h;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const label = m.prior24h === 0 ? (m.last24h > 0 ? pickL("new", "baru") : "0") : `${m.changePct !== null && m.changePct > 0 ? "+" : ""}${m.changePct ?? 0}%`;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-mono text-[12px] font-bold", up ? "text-[#B42318]" : down ? "text-[#047857]" : "text-[#5A6478]")}>
      <Icon size={13} aria-hidden="true" /> {label}
    </span>
  );
}

export function IssueLifecycle({ records, stageOf, days }: { records: NarrativeRecord[]; stageOf: (id: string) => StageKey | null; days: number }) {
  const groups = useMemo(() => {
    const g = Object.fromEntries(STAGES.map((s) => [s.key, [] as NarrativeRecord[]])) as Record<StageKey, NarrativeRecord[]>;
    for (const r of records) { const k = stageOf(r.id); if (k) g[k].push(r); }
    for (const k of Object.keys(g) as StageKey[]) g[k].sort((a, b) => b.signalCount - a.signalCount);
    return g;
  }, [records, stageOf]);
  const total = Math.max(1, records.reduce((n, r) => n + r.signalCount, 0));
  const firstBusy = URGENCY.find((k) => groups[k].length) ?? "emerging";
  const [picked, setPicked] = useState<StageKey | null>(null);
  const active = picked ?? firstBusy;
  const stage = STAGES.find((s) => s.key === active)!;
  const list = groups[active];
  const idx = STAGES.findIndex((s) => s.key === active);

  return (
    <section aria-label={pickL("Where each issue is", "Posisi tiap isu")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border-[1.5px] border-[#101334] bg-[#EEF1FF] text-[#3B52F5] shadow-[0_2px_0_#101334]"><Layers size={18} aria-hidden="true" /></span>
          <div>
            <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#3B52F5]">{pickL("Where Each Issue Is", "Posisi Tiap Isu")}</p>
            <h3 className="text-[21px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{pickL("Issue Lifecycle", "Siklus Hidup Isu")}</h3>
            <p className="mt-0.5 text-[13px] font-medium text-[#5A6478]">{pickL("Every issue moves through five stages. Pick a stage to see its issues and what to do.", "Setiap isu melewati lima tahap. Pilih tahap untuk melihat isunya dan langkah yang perlu diambil.")}</p>
          </div>
        </div>
      </div>

      {/* The rail: one ink line through five stops. */}
      <div className="relative mt-6">
        <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[27px] hidden h-[3px] rounded-full bg-[#101334] sm:block" />
        <ol className="relative grid grid-cols-5 gap-1.5 sm:gap-3">
          {STAGES.map((s, i) => {
            const n = groups[s.key].length;
            const on = s.key === active;
            const hot = (s.key === "accelerating" || s.key === "peaking") && n > 0;
            return (
              <li key={s.key} className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => setPicked(s.key)}
                  aria-pressed={on}
                  className={cn(
                    "relative inline-flex size-[56px] items-center justify-center rounded-full border-[1.5px] border-[#101334] text-[20px] font-black tabular-nums transition",
                    on ? "bg-[#101334] text-white shadow-[0_3px_0_#465FFF]" : n ? "bg-white text-[#101334] shadow-[0_3px_0_#101334] hover:-translate-y-0.5" : "bg-[#F4F6FB] text-[#B4BCD0] shadow-[0_3px_0_#C9D1E6]",
                  )}
                >
                  {n}
                  {hot ? <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-white bg-[#E5484D]" /> : null}
                </button>
                <span className={cn("mt-2.5 font-mono text-[11px] font-bold tracking-[0.08em]", on ? "text-[#3B52F5]" : "text-[#6B7591]")}>{String(i + 1).padStart(2, "0")}</span>
                <span className={cn("text-[12.5px] font-black leading-tight sm:text-[13.5px]", on ? "text-[#101334]" : n ? "text-[#31406B]" : "text-[#9AA3BC]")}>{pickL(s.en, s.id)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The chosen stage: what it means, what to do, and its issues. */}
      {/* Stacked, full width: the panel sits in a narrow column, so the stage and its issues read top-down. */}
      <div className="mt-6 grid gap-4">
        <div className="rounded-[18px] border-[1.5px] border-[#101334] bg-[#101334] p-5 text-white shadow-[0_3px_0_#101334] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-5">
          <div>
            <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#A5B4FF]">{pickL("Stage", "Tahap")} {String(idx + 1).padStart(2, "0")} · {pickL(stage.en, stage.id)}</p>
            <p className="mt-2 text-[15px] font-semibold leading-relaxed text-white/80">{pickL(...stage.mean)}</p>
            <p className="mt-3 text-[12.5px] font-medium text-white/60">
              {list.length
                ? pickL(`${list.length} issue${list.length === 1 ? "" : "s"} here, ${list.reduce((n, r) => n + r.signalCount, 0)} mentions in total.`, `${list.length} isu di tahap ini, total ${list.reduce((n, r) => n + r.signalCount, 0)} percakapan.`)
                : pickL("No issue is at this stage right now.", "Belum ada isu di tahap ini.")}
            </p>
          </div>
          <div className="mt-4 rounded-[14px] bg-white/[0.08] p-4 ring-1 ring-white/10 md:mt-0">
            <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#A5B4FF]">{pickL("What To Do Now", "Yang Perlu Dilakukan")}</p>
            <p className="mt-1.5 text-[15.5px] font-bold leading-snug">{pickL(...stage.todo)}</p>
          </div>
        </div>

        <div className="min-w-0">
          {list.length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-[18px] border border-dashed border-[#C9D1E6] p-6 text-center">
              <p className="max-w-sm text-[13.5px] font-medium leading-relaxed text-[#5A6478]">{pickL("Nothing here at the moment. Stages with issues have a filled number on the rail above.", "Belum ada isu di sini. Tahap yang berisi isu ditandai dengan angka di jalur atas.")}</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {list.map((r) => {
                const s = SENT[String(r.sentiment).toLowerCase()] ?? SENT.neutral;
                const share = Math.round((r.signalCount / total) * 100);
                const impact = IMPACT[String(r.impact).toUpperCase()];
                return (
                  <li key={r.id}>
                    <Link href={issueHref(r.id, days * 24)} className="group block rounded-[18px] border-[1.5px] border-[#101334] bg-white p-4 shadow-[0_3px_0_#101334] transition hover:-translate-y-0.5 hover:shadow-[0_5px_0_#101334] sm:p-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("rounded-[7px] px-2 py-0.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.06em]", s.tone)}>{pickL(s.en, s.id)}</span>
                        {impact ? <span className="rounded-[7px] bg-[#F1F3F8] px-2 py-0.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#31406B]">{pickL(...impact)}</span> : null}
                      </div>
                      <p className="mt-2 text-[16.5px] font-black leading-snug tracking-[-0.01em] text-[#101334] group-hover:text-[#3B52F5]">{r.title}</p>
                      {r.description ? <p className="mt-1 line-clamp-2 text-[13.5px] font-medium leading-relaxed text-[#31406B]">{r.description}</p> : null}

                      <dl className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-[12px] bg-[#F6F7FC] px-3 py-2">
                          <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6B7591]">{pickL("Mentions", "Percakapan")}</dt>
                          <dd className="mt-0.5 text-[15px] font-black tabular-nums text-[#101334]">{r.signalCount} <span className="font-mono text-[12px] font-bold text-[#6B7591]">· {share}%</span></dd>
                        </div>
                        <div className="rounded-[12px] bg-[#F6F7FC] px-3 py-2">
                          <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6B7591]">{pickL("Last 24h", "24 jam")}</dt>
                          <dd className="mt-0.5 flex items-baseline gap-1.5 text-[15px] font-black tabular-nums text-[#101334]">{r.momentum ? r.momentum.last24h : "—"} <Change m={r.momentum} /></dd>
                        </div>
                        <div className="rounded-[12px] bg-[#F6F7FC] px-3 py-2">
                          <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6B7591]">{pickL("Last Seen", "Terakhir")}</dt>
                          <dd className="mt-0.5 inline-flex items-center gap-1 text-[13.5px] font-black text-[#101334]"><Clock size={12} className="text-[#6B7591]" aria-hidden="true" />{ago(r.lastSeen)}</dd>
                        </div>
                        <div className="rounded-[12px] bg-[#F6F7FC] px-3 py-2">
                          <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#6B7591]">{pickL("Sources", "Sumber")}</dt>
                          <dd className="mt-0.5 inline-flex items-center gap-1 text-[13.5px] font-black text-[#101334]"><Radio size={12} className="text-[#6B7591]" aria-hidden="true" />{r.sourceCount} {pickL(r.sourceCount === 1 ? "platform" : "platforms", "platform")}</dd>
                        </div>
                      </dl>

                      <div className="mt-3.5 flex items-center gap-3">
                        <span className="flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEF1F7]" title={pickL(`${share}% of all mentions in this period`, `${share}% dari semua percakapan periode ini`)}>
                          <span className="h-full rounded-full" style={{ width: `${Math.max(3, share)}%`, background: s.dot }} />
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-black text-[#3B52F5]">{pickL("Open Issue", "Buka Isu")} <ArrowRight size={14} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
