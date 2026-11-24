"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ExternalLink, FileSearch, Loader2, Scissors, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { splitNarrative, type NarrativeDetailRecord } from "@/lib/api-service";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { NarrativeEscalationPanel } from "./narrative-escalation";
import { IssueAiTools } from "./issue-ai-tools";
import { NarrativeClaimsPanel, NarrativeFramingPanel, NarrativeJourneyPanel, NarrativeRiskPanel } from "./narrative-framing";
import { KICKER, NarrativePrecedents, NarrativeSpreadPanel, SectionHead, duration, platformName, when } from "./narrative-spread";

/**
 * The narrative detail, read top-down: the story in one sentence with its key numbers and tone, then (01) where
 * it started and how it spread, (02) whether it happened before, and (03) the records behind it. Everything is
 * drawn from the narrative's own records; the sentence is assembled from them, not written by a model.
 */

const SENTIMENT: Record<string, { en: string; id: string; color: string; chip: string }> = {
  negative: { en: "Negative", id: "Negatif", color: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]" },
  positive: { en: "Positive", id: "Positif", color: "#12A66A", chip: "bg-[#E5F6EE] text-[#047857]" },
  neutral: { en: "Neutral", id: "Netral", color: "#94A3B8", chip: "bg-[#EEF1F6] text-[#5A6478]" },
  mixed: { en: "Mixed", id: "Campuran", color: "#F59E0B", chip: "bg-[#FFF3DC] text-[#A04606]" },
  unanalyzed: { en: "Not analysed", id: "Belum dianalisis", color: "#D9DEEA", chip: "border border-dashed border-[#C9D1E6] bg-white text-[#5A6478]" },
};
const sentimentWord = (k: string) => (SENTIMENT[k] ? pickL(SENTIMENT[k].en, SENTIMENT[k].id) : k);

/** One sentence a manager can repeat: who started it, where it went, how long, the tone and whether it is growing. */
function story(d: NarrativeDetailRecord, total: number, top: [string, number] | undefined) {
  const s = d.spread;
  const parts: string[] = [];
  if (s) {
    const who = s.origin.hidden ? pickL("a public account", "akun publik") : s.origin.author || pickL("an unknown author", "penulis tak dikenal");
    const others = s.path.slice(1).map((p) => platformName(p.platform));
    parts.push(pickL(
      `Started by ${who} on ${platformName(s.origin.platform)} on ${when(s.origin.at, false)}${others.length ? `, then spread to ${others.join(", ")}` : ""}.`,
      `Dimulai oleh ${who} di ${platformName(s.origin.platform)} pada ${when(s.origin.at, false)}${others.length ? `, lalu menyebar ke ${others.join(", ")}` : ""}.`,
    ));
    parts.push(pickL(`${s.records} records over ${duration(s.spanHours)}.`, `${s.records} catatan dalam ${duration(s.spanHours)}.`));
  }
  if (top && total) parts.push(pickL(`Mostly ${sentimentWord(top[0]).toLowerCase()} (${Math.round((top[1] / total) * 100)}%).`, `Mayoritas ${sentimentWord(top[0]).toLowerCase()} (${Math.round((top[1] / total) * 100)}%).`));
  const m = d.momentum;
  if (m) {
    if (m.last24h > m.prior24h) parts.push(pickL(`Still growing. ${m.last24h} new in the last 24 hours.`, `Masih naik. ${m.last24h} catatan baru dalam 24 jam terakhir.`));
    else if (m.last24h === 0) parts.push(pickL("Quiet in the last 24 hours.", "Tenang dalam 24 jam terakhir."));
    else if (m.last24h === m.prior24h) parts.push(pickL(`Steady. ${m.last24h} in the last 24 hours, the same as the day before.`, `Stabil. ${m.last24h} dalam 24 jam terakhir, sama dengan sehari sebelumnya.`));
    else parts.push(pickL(`Slowing. ${m.last24h} in the last 24 hours against ${m.prior24h} the day before.`, `Melambat. ${m.last24h} dalam 24 jam terakhir dibanding ${m.prior24h} sehari sebelumnya.`));
  }
  return parts;
}

function Summary({ detail }: { detail: NarrativeDetailRecord }) {
  const breakdown = detail.sentimentBreakdown || {};
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  const total = entries.reduce((n, [, v]) => n + v, 0);
  const top = entries.filter(([k]) => k !== "unanalyzed").sort((a, b) => b[1] - a[1])[0];
  const m = detail.momentum;
  const up = m && m.last24h > m.prior24h;
  // Growth is an alarm only when the conversation is mostly negative; otherwise it is news, in brand blue.
  const alarming = up && top?.[0] === "negative";
  // The same clock as the sentence: the origin's publication time when known, else when it was first collected.
  const firstAt = detail.spread?.origin.at ?? detail.firstSeen;
  const tiles: Array<[string, string]> = [
    [String(detail.spread?.records ?? detail.relatedSignals?.length ?? 0), pickL("records", "catatan")],
    [m ? `${m.last24h} vs ${m.prior24h}` : "—", pickL("last 24h vs day before", "24 jam vs sehari sebelumnya")],
    [when(firstAt), detail.spread ? pickL("first posted", "pertama terbit") : pickL("first seen", "pertama muncul")],
    [when(detail.lastSeen), pickL("last seen", "terakhir muncul")],
  ];
  return (
    <section aria-label={pickL("Summary", "Ringkasan")} className="relative overflow-hidden rounded-[20px] border-[1.5px] border-[#101334] bg-[#101334] text-white shadow-[0_4px_0_#101334]">
      <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.4),transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(236,72,153,0.22),transparent)]" />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(KICKER, "text-[#A5B4FF]")}>{pickL("The Story So Far", "Ringkasan Cerita")}</span>
          {m ? (
            <span className={cn("inline-flex items-center gap-1 rounded-[7px] px-2 py-0.5 text-[11.5px] font-bold", alarming ? "bg-[#E5484D] text-white" : up ? "bg-[#465FFF] text-white" : "bg-white/10 text-white/75")}>
              {up ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {up ? pickL("Growing", "Naik") : m.last24h === 0 ? pickL("Quiet", "Tenang") : m.last24h === m.prior24h ? pickL("Steady", "Stabil") : pickL("Slowing", "Melambat")}
            </span>
          ) : null}
        </div>
        {/* One fact per line instead of one long paragraph: the first is the headline, the rest a short list. */}
        {(() => {
          const lines = story(detail, total, top);
          return (
            <>
              <p className="mt-3 max-w-3xl text-[19px] font-bold leading-snug sm:text-[21px]">{lines[0]}</p>
              {lines.length > 1 ? (
                <ul className="mt-2 max-w-3xl space-y-1 text-[15px] font-semibold leading-snug text-white/80">
                  {lines.slice(1).map((line) => <li key={line} className="flex gap-2"><span aria-hidden>•</span><span>{line}</span></li>)}
                </ul>
              ) : null}
            </>
          );
        })()}

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {tiles.map(([v, l]) => (
            <div key={l} className="rounded-[14px] bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
              <p className="text-[15px] font-black leading-tight tabular-nums">{v}</p>
              <p className="mt-1 text-[11px] font-bold text-white/55">{l}</p>
            </div>
          ))}
        </div>

        {total > 0 ? (
          <div className="mt-5">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
              {entries.map(([k, v]) => <span key={k} className="h-full" style={{ width: `${(v / total) * 100}%`, background: SENTIMENT[k]?.color ?? "#94A3B8" }} title={`${sentimentWord(k)} ${v}`} />)}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {entries.map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/80">
                  <span className="size-2 rounded-full" style={{ background: SENTIMENT[k]?.color ?? "#94A3B8" }} />
                  {sentimentWord(k)} <span className="text-white/55">{Math.round((v / total) * 100)}% · {v}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 flex items-center gap-1.5 text-[11.5px] font-medium text-white/50">
          <Sparkles size={12} aria-hidden="true" />
          {pickL("AI confidence", "Keyakinan AI")}: {detail.confidence === null || detail.confidence === undefined ? pickL("not available", "belum tersedia") : `${detail.confidence}%`}
          {detail.confidenceBasis ? ` · ${detail.confidenceBasis}` : ""}
        </p>
      </div>
      <span aria-hidden="true" className="relative block h-1 bg-gradient-to-r from-[#465FFF] via-[#8B5CF6] to-[#EC4899]" />
    </section>
  );
}

const FIRST_RECORDS = 6;

function Evidence({ detail, n }: { detail: NarrativeDetailRecord; n: string }) {
  const signals = detail.relatedSignals || [];
  const [all, setAll] = useState(false);
  const shown = signals.slice(0, all ? 20 : FIRST_RECORDS);
  const router = useRouter();
  const qc = useQueryClient();
  const demo = isDemoSession(useAuthStore((st) => st.user));
  // Split mode: pick the records that belong to another story and move them into a new issue.
  const [splitting, setSplitting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const split = useMutation({
    mutationFn: () => splitNarrative(String(detail.id), { signalIds: [...picked], title: title.trim() }),
    onSuccess: (r) => { qc.invalidateQueries(); router.push(`/intelligence/${r.id}`); },
  });
  const canSplit = !demo && signals.length >= 2;
  const toggle = (id: string) => setPicked((p) => { const next = new Set(p); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const startSplit = () => { setSplitting(true); setAll(true); setPicked(new Set()); setTitle(""); split.reset(); };
  const ready = picked.size > 0 && picked.size < signals.length && title.trim().length >= 3;
  return (
    <section aria-label={pickL("Evidence", "Bukti")} className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHead n={n} icon={FileSearch} title={pickL("The Records Behind It", "Catatan di Baliknya")} note={signals.length > 20 ? pickL(`The 20 most recent of ${signals.length}.`, `20 terbaru dari ${signals.length}.`) : pickL(`${signals.length} record${signals.length === 1 ? "" : "s"}.`, `${signals.length} catatan.`)} />
        {canSplit && !splitting ? (
          <button type="button" onClick={startSplit} title={pickL("Two different stories here? Move some records into their own issue.", "Ada dua cerita berbeda? Pindahkan sebagian catatan ke isu sendiri.")} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D9DEF0] bg-white px-3 text-[12.5px] font-bold text-[#3A4270] transition hover:border-[#101334] hover:text-[#101334]">
            <Scissors size={14} aria-hidden="true" /> {pickL("Split issue", "Pisahkan isu")}
          </button>
        ) : null}
      </div>
      {splitting ? (
        <div className="grid gap-3 rounded-[14px] border-[1.5px] border-[#101334] bg-[#F7F8FC] p-4 shadow-[0_2px_0_#101334]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13.5px] font-semibold leading-snug text-[#101334]">{pickL("Tick the records that belong to a different story, then name that story. They move into a new issue, and the two are never merged automatically again.", "Centang catatan yang sebenarnya cerita lain, lalu beri judul. Catatan itu pindah ke isu baru, dan kedua isu tidak akan digabung otomatis lagi.")}</p>
            <button type="button" onClick={() => setSplitting(false)} className="rounded-full p-1 text-[#5A6478] hover:bg-black/5" aria-label={pickL("Cancel", "Batal")}><X size={16} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={pickL("Title of the new issue", "Judul isu baru")} className="h-10 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-[#D9DEF0] bg-white px-3 text-[13.5px] font-semibold text-[#101334] outline-none focus:border-[#3247D9]" />
            <button type="button" disabled={!ready || split.isPending} onClick={() => split.mutate()} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#101334] px-4 text-[13px] font-black text-white disabled:opacity-40">
              {split.isPending ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />} {pickL(`Move ${picked.size}`, `Pindahkan ${picked.size}`)}
            </button>
          </div>
          {picked.size >= signals.length ? <p className="text-[12.5px] font-semibold text-[#B42318]">{pickL("Leave at least one record in this issue.", "Sisakan minimal satu catatan di isu ini.")}</p> : null}
          {split.isError ? <p className="text-[12.5px] font-semibold text-[#B42318]">{(split.error as Error)?.message || pickL("The issue could not be split.", "Isu gagal dipisahkan.")}</p> : null}
        </div>
      ) : null}
      {signals.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-[#C9D1E6] px-3.5 py-3 text-[12.5px] font-medium text-[#5A6478]">{detail.evidenceNote || pickL("No linked records yet.", "Belum ada catatan tertaut.")}</p>
      ) : (
        <ul className="grid gap-2">
          {shown.map((sig) => {
            const tone = SENTIMENT[sig.sentiment] ?? SENTIMENT.unanalyzed;
            const on = picked.has(String(sig.id));
            const body = (
              <>
                {splitting ? (
                  <span aria-hidden="true" className={cn("mt-1.5 grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px]", on ? "border-[#101334] bg-[#101334] text-white" : "border-[#B8C0D9] bg-white")}>{on ? <Check size={13} /> : null}</span>
                ) : (
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F1F4FA]"><PlatformIcon platform={sig.platform || "news"} className="size-4" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[14px] font-bold leading-snug text-[#101334]", sig.url && !splitting && "group-hover:text-[#3B52F5]")}>{sig.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-[#5A6478]">
                    <span className={cn("rounded-[6px] px-1.5 py-0.5 font-sans text-[11.5px] font-black", tone.chip)}>{sentimentWord(sig.sentiment)}{typeof sig.analysisConfidence === "number" ? ` · ${Math.round(sig.analysisConfidence * 100)}%` : ""}</span>
                    {platformName(sig.platform)} · {when(sig.publishedAt || sig.capturedAt)}
                  </span>
                </span>
                {sig.url && !splitting ? <ExternalLink size={14} className="mt-1 shrink-0 text-[#9AA3BC] group-hover:text-[#3B52F5]" aria-hidden="true" /> : null}
              </>
            );
            const cls = "flex items-start gap-3 rounded-[14px] border border-[#E1E6F2] bg-white px-3.5 py-3";
            return (
              <li key={sig.id}>
                {splitting ? (
                  <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(String(sig.id))} className={cn(cls, "w-full text-left transition", on ? "border-[#101334] bg-[#F7F8FC]" : "hover:border-[#9AA3BC]")}>{body}</button>
                ) : sig.url ? <a href={sig.url} target="_blank" rel="noopener noreferrer" className={cn(cls, "group transition hover:border-[#101334] hover:shadow-[0_2px_0_#101334]")}>{body}</a> : <div className={cls}>{body}</div>}
              </li>
            );
          })}
          {!all && signals.length > FIRST_RECORDS ? (
            <li>
              <button type="button" onClick={() => setAll(true)} className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-[#101334] bg-white text-[13px] font-black text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC]">
                {pickL(`Show ${Math.min(20, signals.length) - FIRST_RECORDS} More`, `Tampilkan ${Math.min(20, signals.length) - FIRST_RECORDS} Lagi`)} <ChevronDown size={15} aria-hidden="true" />
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

/**
 * The whole detail. As a page on wide screens it runs in two columns: the spread on the left, history and the
 * records beside it; on narrow screens (and in a modal) everything stacks in reading order.
 */
export function NarrativeDetailView({ detail, layout = "stack" }: { detail: NarrativeDetailRecord; layout?: "stack" | "page" }) {
  // Sections are numbered in reading order, skipping the ones this issue has no data for.
  let k = 0;
  const num = () => String(++k).padStart(2, "0");
  const risk = detail.risk ? <NarrativeRiskPanel risk={detail.risk} n={num()} /> : null;
  const escalation = (detail.relatedSignals?.length ?? 0) >= 3 ? <NarrativeEscalationPanel detail={detail} n={num()} /> : null;
  const tools = <IssueAiTools id={detail.id} n={num()} />;
  const claims = detail.claims?.length ? <NarrativeClaimsPanel claims={detail.claims} n={num()} /> : null;
  const framing = detail.framing?.frames?.length ? <NarrativeFramingPanel frames={detail.framing.frames} n={num()} /> : null;
  const journey = detail.journey ? <NarrativeJourneyPanel journey={detail.journey} n={num()} /> : null;
  const spread = detail.spread ? <NarrativeSpreadPanel spread={detail.spread} n={num()} /> : null;
  const history = <NarrativePrecedents precedents={detail.precedents ?? []} expectation={detail.expectation} n={num()} />;
  const records = <Evidence detail={detail} n={num()} />;
  if (layout === "page") {
    return (
      <div className="grid gap-8">
        <Summary detail={detail} />
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-8">{risk}{escalation}{tools}{claims}{framing}{journey}{spread ?? history}</div>
          <div className="grid gap-8">{spread ? history : null}{records}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-8">
      <Summary detail={detail} />
      {risk}
      {escalation}
      {tools}
      {claims}
      {framing}
      {journey}
      {spread}
      {history}
      {records}
    </div>
  );
}
