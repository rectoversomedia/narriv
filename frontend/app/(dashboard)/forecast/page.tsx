"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, ClipboardList, GraduationCap, MessageCircleQuestion, RefreshCw, Telescope, TriangleAlert, Eye, Route, History } from "lucide-react";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { getFutureIssues, saveFutureProgress, type FutureIssue, type FutureIssues } from "@/lib/api-service";
import { issueHref } from "@/lib/evidence-links";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatStrip } from "@/components/ui/stamp";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { RichText } from "@/components/ui/rich-text";
import { ForecastLoading } from "@/components/intelligence/forecast-loading";

/**
 * Prediksi Isu: the forecast as a workspace of its own. Left, the ranked forecasts; right, one forecast to learn
 * from (why, how it would unfold, the cost of doing nothing, the lesson for the team, the early signs) and to act on
 * (a checklist of what to prepare, saved for the team; an action plan from the issue it grows out of; Ask Narriv).
 */
const IMPACT = {
  high: { en: "High impact", id: "Dampak tinggi", cls: "bg-[#FDECEC] text-[#B42318]" },
  medium: { en: "Medium impact", id: "Dampak sedang", cls: "bg-[#FFF4E5] text-[#A04606]" },
  low: { en: "Low impact", id: "Dampak rendah", cls: "bg-[#EEF1FF] text-[#3B52F5]" },
} as const;
const barTone = (p: number) => (p >= 60 ? "bg-[#E5484D]" : p >= 40 ? "bg-[#F59E0B]" : "bg-[#465FFF]");

function Likelihood({ p, label }: { p: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-[#EEF0F6]">
        <div className={cn("h-full rounded-full", barTone(p))} style={{ width: `${p}%` }} />
      </div>
      <span className="shrink-0 text-[12.5px] font-black tabular-nums text-[#101334]">{p}% <span className="font-semibold text-[#5F6B94]">{label}</span></span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Eye; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-[#EEF0F6] pt-5">
      <h3 className="flex items-center gap-2 text-[14px] font-black text-[#101334]"><Icon size={16} className="text-[#465FFF]" aria-hidden="true" />{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[#31406B]">
          <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#465FFF]" aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ f, done, onToggle, onPlan }: { f: FutureIssue; done: number[]; onToggle: (i: number) => void; onPlan: () => void }) {
  const L = useL();
  const impact = IMPACT[f.impact] ?? IMPACT.medium;
  const ask = `${L("Explain this forecast and what we should do", "Jelaskan prediksi ini dan apa yang sebaiknya kami lakukan")}: "${f.title}"`;
  const pct = f.prepare.length ? Math.round((done.length / f.prepare.length) * 100) : 0;
  return (
    <article className={cn(BOX, "grid gap-5")}>
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", impact.cls)}>{L(impact.en, impact.id)}</span>
          {f.horizon ? <span className="rounded-full bg-[#F1F4FA] px-2.5 py-0.5 text-[11.5px] font-bold text-[#4A5578]">{f.horizon}</span> : null}
          {f.audiences.map((a) => <span key={a} className="rounded-full bg-[#F7F8FC] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#4A5578]">{a}</span>)}
        </div>
        <h2 className="text-[21px] font-black leading-snug text-[#101334]">{f.title}</h2>
        <Likelihood p={f.likelihood} label={L("likely", "kemungkinan")} />
        <RichText text={f.why} className="text-[14.5px] leading-relaxed text-[#31406B]" />
        <div className="flex flex-wrap gap-2 pt-1">
          {f.related.length ? (
            <button type="button" onClick={onPlan} className="inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-[#465FFF] px-3.5 text-[12.5px] font-bold text-white shadow-[0_2px_0_#101334] hover:bg-[#3B52F5]">
              <ClipboardList size={15} aria-hidden="true" /> {L("Create action plan", "Buat Rencana Aksi")}
            </button>
          ) : null}
          <Link href={`/ask?q=${encodeURIComponent(ask)}`} className="inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-3.5 text-[12.5px] font-bold text-[#101334] shadow-[0_2px_0_#101334] hover:bg-[#F7F8FC]">
            <MessageCircleQuestion size={15} aria-hidden="true" /> {L("Ask Narriv about this", "Tanya Narriv soal ini")}
          </Link>
        </div>
      </header>

      {f.scenario?.length ? (
        <Section icon={Route} title={L("How it could unfold", "Bagaimana isu ini bisa berkembang")}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {f.scenario.map((s, i) => (
              <li key={s.stage} className="relative rounded-[14px] border border-[#E4E8F2] bg-[#FAFBFE] p-3.5">
                <p className="flex items-center gap-2 text-[12px] font-black text-[#465FFF]"><span className="grid size-5 place-items-center rounded-full bg-[#465FFF] text-[11px] text-white">{i + 1}</span>{s.stage}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#31406B]">{s.what}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section icon={Eye} title={L("Based on the data", "Berdasarkan data")}>
        <Bullets items={f.evidence} />
      </Section>

      {f.ifIgnored ? (
        <Section icon={TriangleAlert} title={L("If nothing is done", "Kalau dibiarkan")}>
          <RichText text={f.ifIgnored} className="rounded-[12px] bg-[#FDF3F2] px-4 py-3 text-[13.5px] leading-relaxed text-[#7A271A]" />
        </Section>
      ) : null}

      <Section icon={Telescope} title={L("Early signs to watch", "Tanda awal yang perlu dipantau")}>
        <Bullets items={f.earlySignals} />
      </Section>

      <Section icon={ClipboardList} title={L("Prepare now", "Siapkan sekarang")}>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F6]"><div className="h-full rounded-full bg-[#12A66A] transition-all" style={{ width: `${pct}%` }} /></div>
          <span className="text-[12px] font-bold tabular-nums text-[#4A5578]">{done.length}/{f.prepare.length} {L("done", "selesai")}</span>
        </div>
        <ul className="grid gap-2">
          {f.prepare.map((t, i) => {
            const on = done.includes(i);
            return (
              <li key={t}>
                <button type="button" onClick={() => onToggle(i)} aria-pressed={on} className={cn("flex w-full items-start gap-3 rounded-[12px] border px-3.5 py-3 text-left text-[13.5px] leading-relaxed transition", on ? "border-[#BFE8D3] bg-[#F0FAF5] text-[#5F6B94] line-through" : "border-[#E4E8F2] bg-white text-[#31406B] hover:border-[#465FFF]")}>
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px]", on ? "border-[#12A66A] bg-[#12A66A] text-white" : "border-[#B8C0D6]")}>{on ? <Check size={13} strokeWidth={3} /> : null}</span>
                  <span>{t}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {f.fromPast ? (
        <Section icon={History} title={L("From what the team handled before", "Belajar dari penanganan sebelumnya")}>
          <RichText text={f.fromPast} className="rounded-[12px] bg-[#F0FAF5] px-4 py-3 text-[13.5px] leading-relaxed text-[#14532D]" />
        </Section>
      ) : null}

      {f.lesson ? (
        <Section icon={GraduationCap} title={L("Lesson for the team", "Pelajaran untuk tim")}>
          <RichText text={f.lesson} className="rounded-[12px] bg-[#EEF1FF] px-4 py-3 text-[13.5px] leading-relaxed text-[#26357F]" />
        </Section>
      ) : null}

      {f.related.length ? (
        <Section icon={ArrowUpRight} title={L("Grows out of these issues", "Berasal dari isu ini")}>
          <div className="flex flex-wrap gap-2">
            {f.related.map((r) => (
              <Link key={r.id} href={issueHref(r.id)} className="inline-flex items-center gap-1 rounded-full bg-[#EEF1FF] px-3 py-1.5 text-[12.5px] font-bold text-[#3B52F5] hover:underline">
                {r.title} <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
    </article>
  );
}

export default function ForecastPage() {
  const L = useL();
  const qc = useQueryClient();
  const [sel, setSel] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["future-issues"], queryFn: () => getFutureIssues(), staleTime: 30 * 60 * 1000, retry: 1 });
  const d = q.data;
  const [progress, setProgress] = useState<Record<string, number[]>>({});
  useEffect(() => { setProgress(d?.progress ?? {}); }, [d]);

  const refresh = async () => {
    setRefreshing(true);
    try { qc.setQueryData(["future-issues"], await getFutureIssues(true)); setSel(0); } catch { /* keep the last forecast */ } finally { setRefreshing(false); }
  };
  const toggle = (title: string, i: number) => {
    const cur = progress[title] ?? [];
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
    setProgress((p) => ({ ...p, [title]: next }));
    saveFutureProgress(title, next).then((r) => qc.setQueryData<FutureIssues>(["future-issues"], (old) => (old ? { ...old, progress: r.progress } : old))).catch(() => {});
  };

  const list = d?.forecasts ?? [];
  const f = list[Math.min(sel, list.length - 1)];
  const at = d?.at ? new Date(d.at).toLocaleString(L("en-GB", "id-ID"), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const totalSteps = list.reduce((n, x) => n + x.prepare.length, 0);
  const doneSteps = list.reduce((n, x) => n + (progress[x.title]?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Issue Forecast", "Prediksi Isu")}</h1>
          <p className="mt-1 text-[14px] leading-relaxed text-[#5F6B94]">{L("The issues most likely to come next and how to handle them, read from the last 30 days and from what your team handled before.", "Isu yang berpeluang muncul berikutnya dan cara mengatasinya, dibaca dari data 30 hari terakhir dan dari isu yang pernah ditangani tim.")}</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing || q.isLoading} className="inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-3.5 text-[12.5px] font-bold text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC] disabled:opacity-60">
          <RefreshCw size={14} className={cn(refreshing && "animate-spin")} aria-hidden="true" /> {refreshing ? L("Reading the data…", "Membaca data…") : L("Update Forecast", "Perbarui Prediksi")}
        </button>
      </div>

      {q.isLoading || refreshing ? (
        <ForecastLoading />
      ) : q.isError ? (
        <p className="rounded-[12px] bg-[#F7F8FC] px-4 py-3 text-[13.5px] font-semibold text-[#5F6B94]">{L("The forecast could not be made right now. Try again in a moment.", "Prediksi belum bisa dibuat saat ini. Coba lagi sebentar.")}</p>
      ) : !f ? (
        <p className="rounded-[12px] bg-[#F7F8FC] px-4 py-3 text-[13.5px] font-semibold text-[#5F6B94]">{L("Not enough data yet. Forecasts appear once records and issues come in.", "Data belum cukup. Prediksi muncul setelah catatan dan isu mulai masuk.")}</p>
      ) : (
        <>
          <StatStrip stats={[
            { key: "n", value: list.length, label: L("Forecast issues", "Isu diprediksi") },
            { key: "high", value: list.filter((x) => x.impact === "high").length, label: L("High impact", "Dampak tinggi"), tone: "text-[#B42318]" },
            { key: "top", value: `${list[0].likelihood}%`, label: L("Most likely", "Paling mungkin") },
            { key: "prep", value: `${doneSteps}/${totalSteps}`, label: L("Steps prepared", "Langkah disiapkan"), tone: "text-[#047857]" },
          ]} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
            <ol className="grid gap-2.5 lg:sticky lg:top-4">
              {list.map((x, i) => {
                const active = x === f;
                const impact = IMPACT[x.impact] ?? IMPACT.medium;
                const dn = progress[x.title]?.length ?? 0;
                return (
                  <li key={x.title}>
                    <button type="button" onClick={() => setSel(i)} aria-current={active ? "true" : undefined} className={cn("flex w-full items-start gap-3 rounded-[16px] border-[1.5px] bg-white p-3.5 text-left transition", active ? "border-[#101334] shadow-[0_3px_0_#101334]" : "border-[#E4E8F2] hover:border-[#465FFF]")}>
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-[9px] text-[13px] font-black", active ? "bg-[#465FFF] text-white" : "bg-[#101334] text-white")}>{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-black leading-snug text-[#101334]">{x.title}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", impact.cls)}>{L(impact.en, impact.id)}</span>
                          <span className="text-[11.5px] font-black tabular-nums text-[#101334]">{x.likelihood}%</span>
                          {x.horizon ? <span className="text-[11.5px] font-semibold text-[#5F6B94]">· {x.horizon}</span> : null}
                          {dn ? <span className="text-[11.5px] font-bold text-[#047857]">· {dn}/{x.prepare.length} {L("ready", "siap")}</span> : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <Detail f={f} done={progress[f.title] ?? []} onToggle={(i) => toggle(f.title, i)} onPlan={() => setPlan(f.related[0]?.id ?? null)} />
          </div>
          <p className="text-[12px] font-medium text-[#6B7591]">
            {L(`Based on ${d!.basis.records} records, ${d!.basis.issues} issues and ${d!.basis.alerts} alerts · updated ${at}. A forecast is an estimate from the data, not a certainty.`, `Berdasarkan ${d!.basis.records} catatan, ${d!.basis.issues} isu, dan ${d!.basis.alerts} peringatan · diperbarui ${at}. Prediksi adalah perkiraan dari data, bukan kepastian.`)}
          </p>
        </>
      )}
      {plan ? <CreateActionPlanModal open onOpenChange={(o) => { if (!o) setPlan(null); }} initialClusterId={plan} /> : null}
    </div>
  );
}
