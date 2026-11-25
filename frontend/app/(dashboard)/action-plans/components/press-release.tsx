"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronDown, FileText, Lock, Megaphone, Newspaper, PenLine, RotateCcw, Search, Send, Sparkles } from "lucide-react";
import {
  draftPressRelease, editPressRelease, getMediaOutlets, getPressRelease, requestPressQuote, reviewPressRelease, savePressMedia,
  type PressOutlet, type PressRelease,
} from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const NICHES: Record<string, [string, string]> = {
  national: ["National news", "Berita nasional"], business: ["Business & finance", "Bisnis & keuangan"], regional: ["Regional", "Daerah"],
  general: ["General", "Umum"], lifestyle: ["Lifestyle", "Gaya hidup"], broadcast: ["TV & radio", "TV & radio"], women: ["Women & family", "Perempuan & keluarga"],
  automotive: ["Automotive", "Otomotif"], tech: ["Technology", "Teknologi"], entertainment: ["Entertainment", "Hiburan"], english: ["English-language", "Berbahasa Inggris"],
  health: ["Health", "Kesehatan"], education: ["Education", "Pendidikan"], sports: ["Sports", "Olahraga"],
};
const TIERS: Record<number, { en: string; id: string; cls: string }> = {
  1: { en: "Flagship", id: "Utama", cls: "bg-[#101334] text-white" },
  2: { en: "Premium", id: "Premium", cls: "bg-[#EEF1FF] text-[#3247D9]" },
  3: { en: "Regional", id: "Regional", cls: "bg-[#E8F7EF] text-[#047857]" },
  4: { en: "Standard", id: "Standar", cls: "bg-[#F1F3F8] text-[#5A6478]" },
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function Steps({ release }: { release: PressRelease | null }) {
  const L = useL();
  const stage = !release ? 0 : release.status !== "approved" ? 1 : release.quote ? 3 : 2;
  const steps = [L("Draft", "Draf"), L("Approval", "Persetujuan"), L("Choose media", "Pilih media"), L("Quote", "Penawaran")];
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1.5">
      {steps.map((s, i) => {
        const done = i < stage || (i === 3 && stage === 3);
        const now = i === stage && stage !== 3;
        return (
          <li key={s} className="min-w-0">
            <span className={cn("block h-1.5 rounded-full", done ? "bg-[#12A66A]" : now ? "bg-[#465FFF]" : "bg-[#E6E9F2]")} />
            <span className={cn("mt-1.5 flex items-center gap-1 truncate text-[11.5px] font-bold", done ? "text-[#047857]" : now ? "text-[#3247D9]" : "text-[#8A93B8]")}>
              {done ? <Check size={12} className="shrink-0" /> : null}{i + 1}. {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid gap-3">
      {text.split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line text-[14.5px] leading-relaxed text-[#26305A]">{p.trim()}</p>)}
    </div>
  );
}

function Logo({ o }: { o: PressOutlet }) {
  return o.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/media-logos/${o.logo}.png`} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-[8px] border border-[#E8EBF5] bg-white object-contain p-0.5" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-[#EEF1FF] text-[11px] font-black text-[#3247D9]">{o.name.slice(0, 2).toUpperCase()}</span>
  );
}

/** Step 3: choose outlets (search, tier, niche, recommended for this issue), then ask Narriv for the price. */
function MediaPicker({ planId, release, canEdit, canApprove, recommended }: { planId: string; release: PressRelease; canEdit: boolean; canApprove: boolean; recommended: Record<string, { issue: number; brand: number }> }) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const outletsQ = useQuery({ queryKey: ["media-outlets"], queryFn: getMediaOutlets, staleTime: 3_600_000 });
  const outlets = useMemo(() => outletsQ.data?.data ?? [], [outletsQ.data]);
  const [picked, setPicked] = useState<string[]>(release.media ?? []);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [niche, setNiche] = useState<string | null>(null);
  const [onlyRec, setOnlyRec] = useState(Object.keys(recommended).length > 0);
  const [note, setNote] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (ids: string[]) => savePressMedia(planId, ids),
    onError: (e: Error) => toast.error(e.message || L("The selection was not saved.", "Pilihan gagal disimpan.")),
  });
  const quote = useMutation({
    meta: { silent: true },
    mutationFn: async () => { await savePressMedia(planId, picked); return requestPressQuote(planId, note); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["press-release", planId] }); toast.success(L("Quote request sent. We reply within one working day.", "Permintaan penawaran terkirim. Kami balas dalam 1 hari kerja.")); },
    onError: (e: Error) => toast.error(e.message || L("The request was not sent.", "Permintaan gagal dikirim.")),
  });
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const toggle = (id: string) => {
    if (!canEdit || release.quote) return;
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(next), 700);
  };

  const hasRec = Object.keys(recommended).length > 0;
  const recScore = (id: string) => (recommended[id] ? recommended[id].issue * 100 + recommended[id].brand : -1);
  const shown = outlets
    .filter((o) => !onlyRec || recommended[o.id])
    .filter((o) => !tier || o.tier === tier)
    .filter((o) => !niche || o.niche === niche)
    .filter((o) => !q.trim() || `${o.name} ${o.domain} ${o.area ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => recScore(b.id) - recScore(a.id) || a.tier - b.tier || a.name.localeCompare(b.name));
  const pickedOutlets = picked.map((id) => outlets.find((o) => o.id === id)).filter((o): o is PressOutlet => Boolean(o));
  const perTier = [1, 2, 3, 4].map((t) => pickedOutlets.filter((o) => o.tier === t).length);
  const nicheKeys = Object.keys(NICHES).filter((k) => outlets.some((o) => o.niche === k));
  const locked = Boolean(release.quote);

  return (
    <div className="mt-6 border-t border-[#EEF0F6] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><Newspaper size={17} /> {L("Choose the media", "Pilih media")}</p>
          <p className="mt-0.5 text-[13px] text-[#5F6B94]">{L(`${outlets.length} outlets by tier and niche. Prices depend on the outlet, format and date, so we quote after you choose.`, `${outlets.length} media per tier dan niche. Harga tergantung media, format, dan tanggal tayang, jadi kami kirim penawaran setelah Anda memilih.`)}</p>
        </div>
        {save.isPending ? <span className="text-[12px] font-semibold text-[#8A93B8]">{L("Saving…", "Menyimpan…")}</span> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[#647099]">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Search outlet or region", "Cari media atau daerah")} className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#101334] outline-none placeholder:text-[#8A93B8]" />
          </label>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {hasRec ? (
              <button type="button" onClick={() => setOnlyRec(!onlyRec)} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold", onlyRec ? "bg-[#FFF1DB] text-[#A04606] ring-1 ring-[#F5C97A]" : "bg-[#F4F6FC] text-[#53608C]")}>
                <Sparkles size={12} /> {L("Recommended for this issue", "Rekomendasi untuk isu ini")}
              </button>
            ) : null}
            {[null, 1, 2, 3, 4].map((t) => (
              <button key={String(t)} type="button" onClick={() => setTier(t)} className={cn("rounded-full px-3 py-1.5 text-[12px] font-bold", tier === t ? "bg-[#101334] text-white" : "bg-[#F4F6FC] text-[#53608C] hover:bg-[#EAEFFF]")}>
                {t ? `Tier ${t} · ${L(TIERS[t].en, TIERS[t].id)}` : L("All tiers", "Semua tier")}
              </button>
            ))}
          </div>
          <select value={niche ?? ""} onChange={(e) => setNiche(e.target.value || null)} aria-label={L("Niche", "Niche")} className="mt-2 h-9 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[12.5px] font-bold text-[#3A4270] outline-none focus:border-[#465FFF]">
            <option value="">{L("All niches", "Semua niche")}</option>
            {nicheKeys.map((k) => <option key={k} value={k}>{L(NICHES[k][0], NICHES[k][1])} ({outlets.filter((o) => o.niche === k).length})</option>)}
          </select>

          <ul className="mt-3 max-h-[460px] overflow-auto rounded-[14px] border border-[#E3E7F1]">
            {outletsQ.isPending ? <li className="p-4 text-[13px] text-[#8A93B8]">{L("Loading…", "Memuat…")}</li> : null}
            {!outletsQ.isPending && !shown.length ? <li className="p-4 text-[13px] text-[#8A93B8]">{L("No outlet matches.", "Tidak ada media yang cocok.")}</li> : null}
            {shown.map((o) => {
              const on = picked.includes(o.id);
              const rec = recommended[o.id];
              return (
                <li key={o.id} className="border-b border-[#EEF0F6] last:border-0">
                  <button type="button" onClick={() => toggle(o.id)} disabled={!canEdit || locked} aria-pressed={on} className={cn("flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition", on ? "bg-[#F3F5FF]" : "hover:bg-[#FAFBFE]", (!canEdit || locked) && "cursor-default")}>
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px]", on ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-[#C9D0E0] bg-white")}>{on ? <Check size={13} strokeWidth={3} /> : null}</span>
                    <Logo o={o} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-[#101334]">{o.name}</span>
                      <span className="block truncate text-[12px] text-[#647099]">{L(NICHES[o.niche]?.[0] ?? o.niche, NICHES[o.niche]?.[1] ?? o.niche)}{o.area ? ` · ${o.area}` : ""}</span>
                      {rec ? (
                        <span className="mt-0.5 block truncate text-[11.5px] font-bold text-[#A04606]">
                          {rec.issue ? L(`${rec.issue} stories on this issue`, `${rec.issue} berita soal isu ini`) : L(`${rec.brand} stories on your brand in 30 days`, `${rec.brand} berita soal brand Anda (30 hari)`)}
                        </span>
                      ) : null}
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", TIERS[o.tier].cls)}>T{o.tier}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="h-fit rounded-[16px] bg-[#101334] p-4 text-white lg:sticky lg:top-6">
          <p className="text-[12px] font-bold text-[#A5B4FF]">{L("Your media plan", "Media plan Anda")}</p>
          <p className="mt-1 text-[28px] font-black leading-none">{picked.length} <span className="text-[14px] font-bold text-white/70">{L("outlets", "media")}</span></p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {perTier.map((n, i) => (
              <div key={i} className="rounded-[10px] bg-white/10 px-1 py-2">
                <b className="block text-[16px]">{n}</b>
                <small className="text-[10.5px] text-white/60">Tier {i + 1}</small>
              </div>
            ))}
          </div>
          {pickedOutlets.length ? (
            <ul className="mt-3 flex max-h-[150px] flex-wrap gap-1.5 overflow-auto">
              {pickedOutlets.map((o) => (
                <li key={o.id} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[12px] font-semibold">
                  {o.name}
                  {canEdit && !locked ? <button type="button" onClick={() => toggle(o.id)} aria-label={L(`Remove ${o.name}`, `Hapus ${o.name}`)} className="text-white/60 hover:text-white">×</button> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-[12.5px] text-white/60">{L("Tick the outlets on the left.", "Centang media di sebelah kiri.")}</p>}

          {locked ? (
            <div className="mt-4 rounded-[12px] bg-[#12A66A]/20 p-3 text-[13px]">
              <p className="flex items-center gap-1.5 font-black text-[#7BE0B3]"><CheckCircle2 size={15} /> {L("Quote requested", "Penawaran diminta")}</p>
              <p className="mt-1 text-white/80">{L(`${release.quote!.outlets} outlets, ${fmt(release.quote!.requestedAt)}${release.quote!.byName ? ` by ${release.quote!.byName}` : ""}. We reply within one working day.`, `${release.quote!.outlets} media, ${fmt(release.quote!.requestedAt)}${release.quote!.byName ? ` oleh ${release.quote!.byName}` : ""}. Kami balas dalam 1 hari kerja.`)}</p>
            </div>
          ) : canApprove ? (
            <>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} placeholder={L("Note: target date, budget, format (optional)", "Catatan: tanggal tayang, budget, format (opsional)")} className="mt-4 w-full resize-none rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/45 focus:border-[#A5B4FF]" />
              <button type="button" disabled={!picked.length || quote.isPending} onClick={() => quote.mutate()} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] text-[14px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-50">
                <Send size={15} /> {quote.isPending ? L("Sending…", "Mengirim…") : L("Request a quote", "Minta penawaran")}
              </button>
              <p className="mt-2 text-[11.5px] text-white/55">{L("No charge until you agree to the price.", "Tidak ada biaya sampai Anda setuju dengan harganya.")}</p>
            </>
          ) : (
            <p className="mt-4 text-[12.5px] text-white/70">{L("An owner or admin sends the quote request.", "Owner atau admin yang mengirim permintaan penawaran.")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * The press release stage of an approved plan: AI drafts it, an owner/admin approves it or asks for a revision (the AI
 * rewrites it with the note), and only then can media be chosen and a quote requested. Any edit needs approval again.
 */
export function PressReleasePanel({ planId, planApproved }: { planId: string; planApproved: boolean }) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["press-release", planId], queryFn: () => getPressRelease(planId), enabled: planApproved, staleTime: 30_000 });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const [showPrev, setShowPrev] = useState(false);

  const done = async (msg: string) => { await qc.invalidateQueries({ queryKey: ["press-release", planId] }); toast.success(msg); };
  const fail = (e: Error) => toast.error(e.message || L("Something went wrong. Try again.", "Terjadi kesalahan. Coba lagi."));
  const draft = useMutation({ meta: { silent: true }, mutationFn: () => draftPressRelease(planId), onSuccess: () => done(L("Draft ready. It now waits for approval.", "Draf siap dan menunggu persetujuan.")), onError: fail });
  const save = useMutation({ meta: { silent: true }, mutationFn: () => editPressRelease(planId, { title, body }), onSuccess: () => { setEditing(false); return done(L("Saved. The new version waits for approval.", "Tersimpan. Versi baru menunggu persetujuan.")); }, onError: fail });
  const approve = useMutation({ meta: { silent: true }, mutationFn: () => reviewPressRelease(planId, { decision: "approve" }), onSuccess: () => done(L("Press release approved. Choose the media next.", "Siaran pers disetujui. Lanjut pilih media.")), onError: fail });
  const revise = useMutation({ meta: { silent: true }, mutationFn: () => reviewPressRelease(planId, { decision: "revise", note }), onSuccess: () => { setRevising(false); setNote(""); return done(L("Revised with your note. Review the new version.", "Sudah direvisi sesuai catatan Anda. Tinjau versi barunya.")); }, onError: fail });

  if (!planApproved) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-dashed border-[#D5DAE8] p-4 text-[13.5px] text-[#5F6B94]">
        <Lock size={16} className="shrink-0" /> {L("Approve the plan to write its press release and choose the media.", "Setujui rencana ini untuk menulis siaran pers dan memilih media.")}
      </div>
    );
  }

  const data = q.data;
  const r = data?.data ?? null;
  const busy = draft.isPending || revise.isPending;
  const sourceLabel = (s?: string) => (s === "ai" ? L("written by AI", "ditulis AI") : s === "revision" ? L("revised by AI from a note", "direvisi AI dari catatan") : s === "edit" ? L("edited", "diedit") : "");
  const last = r?.history?.find((h) => h.source !== "approved");

  return (
    <section id="press-release" className="mt-5 scroll-mt-6 rounded-[18px] border-[1.5px] border-[#101334] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[18px] font-black text-[#101334]"><Megaphone size={18} /> {L("Press release", "Siaran pers")}</p>
          <p className="mt-0.5 text-[13px] text-[#5F6B94]">{L("Every version needs an owner or admin's approval before it goes to media.", "Setiap versi wajib disetujui owner atau admin sebelum dikirim ke media.")}</p>
        </div>
        {r ? (
          <span className={cn("rounded-full px-3 py-1 text-[12px] font-black", r.status === "approved" ? "bg-[#E5F6EE] text-[#047857]" : "bg-[#FFF4E5] text-[#A04606]")}>
            {r.status === "approved" ? L("Approved", "Disetujui") : L("Awaiting approval", "Menunggu persetujuan")}
          </span>
        ) : null}
      </div>
      <Steps release={r} />

      {q.isPending ? <div className="mt-5 h-40 animate-pulse rounded-[14px] bg-[#F4F6FC]" /> : q.isError ? (
        <p className="mt-5 text-[13.5px] font-semibold text-[#B42318]">{L("The press release could not be loaded.", "Siaran pers gagal dimuat.")}</p>
      ) : !r ? (
        <div className="mt-5 grid place-items-center rounded-[14px] bg-[#F7F8FC] px-5 py-8 text-center">
          <FileText size={26} className="text-[#8A93B8]" />
          <p className="mt-2 text-[15px] font-black text-[#101334]">{L("No press release yet", "Belum ada siaran pers")}</p>
          <p className="mt-1 max-w-md text-[13px] text-[#5F6B94]">{L("Narriv writes it from this issue and the plan's key messages. You review it before anything goes out.", "Narriv menulisnya dari isu ini dan pesan kunci rencana. Anda meninjaunya dulu sebelum ada yang dikirim.")}</p>
          {data?.canEdit ? (
            <button type="button" onClick={() => draft.mutate()} disabled={busy} className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-60">
              <Sparkles size={16} /> {draft.isPending ? L("Writing…", "Menulis…") : L("Write the draft with AI", "Tulis draf dengan AI")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {r.revisionNote && r.status === "pending_approval" ? (
            <div className="mt-5 rounded-[12px] bg-[#FFF8EC] px-4 py-3 text-[13px] text-[#7A4A06]">
              <b>{L("Revision requested:", "Revisi diminta:")}</b> {r.revisionNote}
            </div>
          ) : null}

          <article className="mt-5 rounded-[16px] border border-[#E3E7F1] bg-[#FCFCFE] p-5">
            <p className="text-[11.5px] font-bold text-[#8A93B8]">
              {L(`Version ${r.version}`, `Versi ${r.version}`)}{last ? ` · ${sourceLabel(last.source)}${last.byName ? ` · ${last.byName}` : ""} · ${fmt(last.at)}` : ""}
              {r.status === "approved" && r.approvedByName ? ` · ${L("approved by", "disetujui")} ${r.approvedByName}` : ""}
            </p>
            {editing ? (
              <div className="mt-3 grid gap-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="h-11 rounded-[10px] border border-[#DDE3EF] px-3 text-[16px] font-black text-[#101334] outline-none focus:border-[#465FFF]" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} maxLength={8000} className="rounded-[10px] border border-[#DDE3EF] p-3 text-[14px] leading-relaxed text-[#26305A] outline-none focus:border-[#465FFF]" />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-[10px] border border-[#DDE3EF] px-4 text-[13px] font-bold text-[#3A4270]">{L("Cancel", "Batal")}</button>
                  <button type="button" onClick={() => save.mutate()} disabled={save.isPending || title.trim().length < 5 || body.trim().length < 50} className="h-10 rounded-[10px] bg-[#101334] px-4 text-[13px] font-black text-white disabled:opacity-50">{save.isPending ? L("Saving…", "Menyimpan…") : L("Save as new version", "Simpan sebagai versi baru")}</button>
                </div>
                {r.status === "approved" ? <p className="text-right text-[12px] text-[#A04606]">{L("Saving a change sends it back for approval.", "Menyimpan perubahan membuatnya perlu disetujui lagi.")}</p> : null}
              </div>
            ) : (
              <>
                <h3 className="mt-2 text-[20px] font-black leading-snug text-[#101334]">{r.title}</h3>
                <div className="mt-3"><Paragraphs text={r.body} /></div>
              </>
            )}
          </article>

          {r.previous && !editing ? (
            <div className="mt-2">
              <button type="button" onClick={() => setShowPrev(!showPrev)} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#3247D9]">
                <ChevronDown size={14} className={cn("transition", showPrev && "rotate-180")} /> {L(`See version ${r.previous.version}`, `Lihat versi ${r.previous.version}`)}
              </button>
              {showPrev ? (
                <div className="mt-2 rounded-[14px] bg-[#F4F6FC] p-4 opacity-90">
                  <p className="text-[15px] font-black text-[#3A4270]">{r.previous.title}</p>
                  <div className="mt-2"><Paragraphs text={r.previous.body} /></div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!editing ? (
            <div className="mt-4 flex flex-col gap-3">
              {r.status === "pending_approval" ? (
                data?.canApprove ? (
                  revising ? (
                    <div className="rounded-[14px] bg-[#101334] p-4">
                      <label className="text-[12.5px] font-bold text-[#A5B4FF]" htmlFor="press-note">{L("What should change?", "Apa yang perlu diubah?")}</label>
                      <textarea id="press-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1500} autoFocus placeholder={L("e.g. Shorter, mention the customer education program, softer headline", "mis. Lebih singkat, sebut program edukasi nasabah, judul lebih lunak")} className="mt-2 w-full resize-none rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-[13.5px] text-white outline-none placeholder:text-white/45 focus:border-[#A5B4FF]" />
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => setRevising(false)} className="h-10 rounded-[10px] px-4 text-[13px] font-bold text-white/80 hover:text-white">{L("Cancel", "Batal")}</button>
                        <button type="button" onClick={() => revise.mutate()} disabled={note.trim().length < 5 || revise.isPending} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#465FFF] px-4 text-[13px] font-black text-white disabled:opacity-50">
                          <RotateCcw size={14} /> {revise.isPending ? L("Revising…", "Merevisi…") : L("Revise with this note", "Revisi dengan catatan ini")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <button type="button" onClick={() => approve.mutate()} disabled={approve.isPending || busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#12A66A] px-6 text-[14px] font-black text-white hover:bg-[#0E9660] disabled:opacity-50">
                        <CheckCircle2 size={16} /> {L("Approve press release", "Setujui siaran pers")}
                      </button>
                      <button type="button" onClick={() => setRevising(true)} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] px-6 text-[14px] font-black text-[#101334] hover:bg-[#F4F6FC] disabled:opacity-50">
                        <RotateCcw size={16} /> {L("Request revision", "Minta revisi")}
                      </button>
                      {data.canEdit ? (
                        <button type="button" onClick={() => { setTitle(r.title); setBody(r.body); setEditing(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-bold text-[#3247D9] hover:bg-[#F4F6FF]">
                          <PenLine size={15} /> {L("Edit myself", "Edit sendiri")}
                        </button>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="rounded-[12px] bg-[#FFF4E5] px-4 py-2.5 text-[13px] font-bold text-[#A04606]">{L("Waiting for an owner or admin to approve or request a revision.", "Menunggu owner atau admin menyetujui atau meminta revisi.")}</p>
                    {data?.canEdit ? <button type="button" onClick={() => { setTitle(r.title); setBody(r.body); setEditing(true); }} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#3247D9]"><PenLine size={14} /> {L("Edit", "Edit")}</button> : null}
                  </div>
                )
              ) : data?.canEdit && !r.quote ? (
                <button type="button" onClick={() => { setTitle(r.title); setBody(r.body); setEditing(true); }} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-[#3247D9]"><PenLine size={14} /> {L("Edit (needs approval again)", "Edit (perlu disetujui lagi)")}</button>
              ) : null}
            </div>
          ) : null}

          {r.status === "approved" && !editing ? <MediaPicker key={r.version} planId={planId} release={r} canEdit={Boolean(data?.canEdit)} canApprove={Boolean(data?.canApprove)} recommended={data?.recommended ?? {}} /> : null}
        </>
      )}
    </section>
  );
}
