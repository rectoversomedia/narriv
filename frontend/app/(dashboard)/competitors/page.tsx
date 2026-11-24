"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Lightbulb, Loader2, Plus, RefreshCcw, Sparkles, Swords, X } from "lucide-react";
import { getCompetitorInsight, saveCompetitors, type CompetitorInsightRow } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

const BRAND = "#465FFF";
const PALETTE = ["#F59E0B", "#EC4899", "#12A66A"];
const color = (r: CompetitorInsightRow, i: number) => (r.isBrand ? BRAND : PALETTE[(i - 1) % PALETTE.length]);
const ago = (v: string | null) => {
  if (!v) return "";
  const h = Math.max(0, Math.round((Date.now() - Date.parse(v)) / 3600000));
  return h < 24 ? `${h}j` : `${Math.round(h / 24)}h`;
};

/**
 * Cek Kompetitor: the brand next to up to three competitors — news share, bad-news headlines, how often AI assistants
 * name each one, the latest headlines, and a short read of where the brand stands and what it can use.
 */
export default function CompetitorsPage() {
  const L = useL();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["competitor-insight"], queryFn: () => getCompetitorInsight(false), staleTime: 5 * 60_000 });
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (q.data) setDraft(q.data.competitors); }, [q.data]);

  const refresh = useMutation({ mutationFn: () => getCompetitorInsight(true), onSuccess: (d) => qc.setQueryData(["competitor-insight"], d) });
  const save = useMutation({
    mutationFn: () => saveCompetitors(draft),
    onSuccess: async () => { setEditing(false); await qc.invalidateQueries({ queryKey: ["competitor-insight"] }); qc.invalidateQueries({ queryKey: ["competitors"] }); },
  });

  const d = q.data;
  const ins = d?.insight ?? null;
  const rows = ins?.rows ?? [];
  const brand = d?.brand ?? "";
  const max = d?.maxCompetitors ?? 3;
  const busy = q.isFetching || refresh.isPending;
  const add = () => { const v = input.trim(); if (v.length >= 2 && draft.length < max && !draft.some((x) => x.toLowerCase() === v.toLowerCase())) setDraft([...draft, v]); setInput(""); };

  const editor = (
    <section className={cn(BOX, "grid gap-3")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-black text-[var(--narriv-ink,#101334)]">{L("Competitors to compare", "Kompetitor yang dibandingkan")}</p>
          <p className="text-[13px] text-[#5F6B94]">{L(`Up to ${max}. Use the name people write in the news.`, `Maksimal ${max}. Pakai nama yang biasa ditulis di berita.`)}</p>
        </div>
        {d?.competitors.length ? <button type="button" onClick={() => { setDraft(d.competitors); setEditing(false); }} className="rounded-full p-1.5 text-[#8A93B8] hover:bg-black/5" aria-label={L("Close", "Tutup")}><X size={16} /></button> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {draft.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F4FA] py-1 pl-3 pr-1.5 text-[13px] font-bold text-[#31406B]">
            {c}
            <button type="button" onClick={() => setDraft(draft.filter((x) => x !== c))} className="rounded-full p-0.5 hover:bg-black/10" aria-label={L(`Remove ${c}`, `Hapus ${c}`)}><X size={13} /></button>
          </span>
        ))}
        {draft.length < max ? (
          <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-1.5">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={60} placeholder={L("e.g. Adira Finance", "mis. Adira Finance")} className="h-9 w-[200px] rounded-[10px] border-[1.5px] border-[#D9DEF0] bg-white px-3 text-[13px] font-semibold outline-none focus:border-[#3247D9] dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-white" />
            <button type="submit" className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#EEF1FF] text-[#3247D9]" aria-label={L("Add", "Tambah")}><Plus size={16} /></button>
          </form>
        ) : null}
      </div>
      {save.isError ? <p className="text-[13px] font-semibold text-[#B42318]">{L("Could not save. Only an owner or admin can change this.", "Gagal menyimpan. Hanya pemilik atau admin yang bisa mengubah ini.")}</p> : null}
      <div className="flex justify-end">
        <button type="button" disabled={save.isPending || !draft.length} onClick={() => save.mutate()} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[13px] font-black text-white disabled:opacity-50">
          {save.isPending ? <Loader2 size={15} className="animate-spin" /> : null}{L("Save and compare", "Simpan & bandingkan")}
        </button>
      </div>
    </section>
  );

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[var(--narriv-ink,#101334)] sm:text-[28px]">{L("Competitors", "Cek Kompetitor")}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94] dark:text-[#A9B1DA]">
            {L(`${brand || "Your brand"} next to its competitors: news coverage, bad news, and who AI assistants recommend.`, `${brand || "Brand Anda"} dibanding kompetitornya: porsi pemberitaan, berita buruk, dan siapa yang direkomendasikan asisten AI.`)}
          </p>
        </div>
        {rows.length ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#D9DEF0] bg-white px-4 text-[13px] font-bold text-[#3A4270] hover:border-[#3247D9] dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-[#C9CEEA]">
              <Swords size={15} /> {L("Edit competitors", "Ubah kompetitor")}
            </button>
            <button type="button" onClick={() => refresh.mutate()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#101334] px-4 text-[13px] font-bold text-white disabled:opacity-60">
              <RefreshCcw size={15} className={busy ? "animate-spin" : ""} /> {L("Recount", "Hitung ulang")}
            </button>
          </div>
        ) : null}
      </header>

      {q.isLoading ? (
        <div className={cn(BOX, "grid place-items-center py-16 text-[14px] font-semibold text-[#5F6B94]")}><Loader2 className="mb-2 animate-spin" />{L("Reading the news for each name…", "Membaca berita untuk tiap nama…")}</div>
      ) : q.isError ? (
        <p className={cn(BOX, "text-[14px] font-semibold text-[#B42318]")}>{L("The competitor check could not be loaded.", "Cek kompetitor gagal dimuat.")}</p>
      ) : !d?.competitors.length || editing ? (
        editor
      ) : !ins ? (
        <p className={cn(BOX, "text-[14px] text-[#5F6B94]")}>{L("Set a brand name in Settings first.", "Isi nama brand di Pengaturan dulu.")}</p>
      ) : (
        <>
          {/* The read: where the brand stands, what to use, what to watch. */}
          {ins.read ? (
            <section className="grid gap-4 rounded-[20px] bg-gradient-to-br from-[#101334] to-[#1E2563] p-6 text-white lg:grid-cols-[1.2fr_1fr_1fr]">
              <div>
                <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#A9B4FF]"><Sparkles size={13} /> {L("Where you stand", "Posisi Anda")}</p>
                <p className="mt-2 text-[16px] font-bold leading-relaxed">{ins.read.summary}</p>
              </div>
              <div className="rounded-[14px] bg-white/[0.07] p-4">
                <p className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#7EE2B8]"><Lightbulb size={14} /> {L("Opportunities", "Peluang")}</p>
                <ul className="mt-2 grid gap-2 text-[13.5px] leading-snug text-white/90">{ins.read.opportunities.map((o) => <li key={o}>• {o}</li>)}</ul>
              </div>
              <div className="rounded-[14px] bg-white/[0.07] p-4">
                <p className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#FFC48A]"><AlertTriangle size={14} /> {L("Watch", "Waspadai")}</p>
                <ul className="mt-2 grid gap-2 text-[13.5px] leading-snug text-white/90">{ins.read.watch.map((o) => <li key={o}>• {o}</li>)}</ul>
              </div>
            </section>
          ) : null}

          {/* The scoreboard. */}
          <section className={cn(BOX, "overflow-x-auto")}>
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-[12px] font-bold text-[#8A93B8]">
                  <th className="pb-3">{L("Name", "Nama")}</th>
                  <th className="pb-3">{L(`News share (${ins.days} days)`, `Porsi berita (${ins.days} hari)`)}</th>
                  <th className="pb-3 text-right">{L("Bad news", "Berita buruk")}</th>
                  <th className="pb-3 text-right">{L("Named by AI", "Disebut AI")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EBF5] dark:divide-[#262D5C]">
                {rows.map((r, i) => (
                  <tr key={r.name} className={r.isBrand ? "bg-[#F5F7FF] dark:bg-[#141938]" : ""}>
                    <td className="py-3.5 pl-2">
                      <span className="inline-flex items-center gap-2 text-[15px] font-black text-[var(--narriv-ink,#101334)]">
                        <span className="h-3 w-3 rounded-full" style={{ background: color(r, i) }} />{r.name}
                        {r.isBrand ? <span className="rounded-full bg-[#E8ECFF] px-2 py-0.5 text-[11px] font-bold text-[#3247D9]">{L("You", "Anda")}</span> : null}
                      </span>
                    </td>
                    <td className="py-3.5 pr-6">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EEF1F8] dark:bg-[#1C2350]"><div className="h-full rounded-full" style={{ width: `${r.share}%`, background: color(r, i) }} /></div>
                        <span className="w-[92px] text-right text-[13px] font-bold tabular-nums text-[#2A3160] dark:text-[#DDE1F7]">{r.share}% · {r.articles >= ins.cap ? `${ins.cap}+` : r.articles}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={cn("rounded-full px-2.5 py-1 text-[12.5px] font-black tabular-nums", r.negative ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#E5F6EE] text-[#047857]")}>{r.negative} · {r.negativeShare}%</span>
                    </td>
                    <td className="py-3.5 pr-2 text-right text-[14px] font-black tabular-nums text-[var(--narriv-ink,#101334)]">
                      {ins.aiAnswers ? `${r.aiNamed}/${ins.aiAnswers}` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px] text-[#8A93B8]">
              {L("News: Google News Indonesia, the name as an exact phrase. Bad news: headlines with words such as lawsuit, complaint, fraud, loss. AI: the latest AI-answers test (ChatGPT and Claude).", "Berita: Google News Indonesia, nama sebagai frasa persis. Berita buruk: judul yang memuat kata seperti gugat, keluhan, penipuan, rugi. AI: uji Jawaban AI terakhir (ChatGPT dan Claude).")}
              {!ins.aiAnswers ? <> {" "}<Link href="/visibility" className="font-bold text-[#3247D9] hover:underline">{L("Run the AI test", "Jalankan uji AI")}</Link></> : null}
            </p>
          </section>

          {/* Latest headlines per name. */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rows.map((r, i) => (
              <div key={r.name} className={cn(BOX, "grid content-start gap-2 p-4")}>
                <p className="flex items-center gap-2 text-[14px] font-black text-[var(--narriv-ink,#101334)]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color(r, i) }} />{r.name}</p>
                {r.headlines.length ? r.headlines.slice(0, 6).map((h) => (
                  <a key={h.url} href={h.url} target="_blank" rel="noreferrer" className="group rounded-[10px] px-2 py-1.5 hover:bg-[#F5F7FC] dark:hover:bg-[#12173A]">
                    <p className={cn("line-clamp-2 text-[13px] font-semibold leading-snug", h.negative ? "text-[#B42318]" : "text-[#2A3160] dark:text-[#DDE1F7]")}>{h.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#8A93B8]">{h.publisher || ""}{h.at ? ` · ${ago(h.at)}` : ""}<ExternalLink size={11} className="opacity-0 group-hover:opacity-100" /></p>
                  </a>
                )) : <p className="text-[13px] text-[#8A93B8]">{L("No news in this period.", "Tidak ada berita pada periode ini.")}</p>}
              </div>
            ))}
          </section>
          <p className="text-[12px] text-[#8A93B8]">{L(`Counted ${new Date(ins.at).toLocaleString("en-GB")}. Recounted every 6 hours.`, `Dihitung ${new Date(ins.at).toLocaleString("id-ID")}. Dihitung ulang tiap 6 jam.`)}</p>
        </>
      )}
    </div>
  );
}
