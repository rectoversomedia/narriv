"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Megaphone, Newspaper, Search, Send, Sparkles } from "lucide-react";
import {
  draftPressRelease, editPressRelease, getMediaOutlets, getPressRelease, requestPressQuote, reviewPressRelease, savePressMedia,
  type PressOutlet, type PressRelease,
} from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { ApprovalDocPanel, fmtWhen } from "./approval-doc";
import { FulfilmentPanel } from "./fulfilment";
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

function Logo({ o }: { o: PressOutlet }) {
  return o.logo ? (
    <img src={`/media-logos/${o.logo}.png`} alt="" width={32} height={32} loading="lazy" className="size-8 shrink-0 rounded-[8px] border border-[#E8EBF5] bg-white object-contain p-0.5" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-[#EEF1FF] text-[11px] font-black text-[#3247D9]">{o.name.slice(0, 2).toUpperCase()}</span>
  );
}

/** Step 3: choose outlets (search, tier, niche, recommended for this issue), then ask Narriv for the price. */
function MediaPicker({ planId, release, canEdit, canApprove, recommended, ownedFit }: { planId: string; release: PressRelease; canEdit: boolean; canApprove: boolean; recommended: Record<string, { issue: number; brand: number }>; ownedFit: string[] }) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const outletsQ = useQuery({ queryKey: ["media-outlets"], queryFn: getMediaOutlets, staleTime: 3_600_000 });
  // Owned local outlets show only when the issue is about their area.
  const outlets = useMemo(() => (outletsQ.data?.data ?? []).filter((o) => !o.owned || ownedFit.includes(o.id)), [outletsQ.data, ownedFit]);
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
    if (!canEdit || locked) return;
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save.mutate(next), 700);
  };

  const locked = Boolean(release.quote) && release.quote?.status !== "declined";
  const hasRec = Object.keys(recommended).length > 0 || ownedFit.length > 0;
  const recScore = (id: string) => (ownedFit.includes(id) ? 1e6 : recommended[id] ? recommended[id].issue * 100 + recommended[id].brand : -1);
  const shown = outlets
    .filter((o) => !onlyRec || recommended[o.id] || o.owned)
    .filter((o) => !tier || o.tier === tier)
    .filter((o) => !niche || o.niche === niche)
    .filter((o) => !q.trim() || `${o.name} ${o.domain} ${o.area ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => recScore(b.id) - recScore(a.id) || a.tier - b.tier || a.name.localeCompare(b.name));
  const pickedOutlets = picked.map((id) => outlets.find((o) => o.id === id)).filter((o): o is PressOutlet => Boolean(o));
  const perTier = [1, 2, 3, 4].map((t) => pickedOutlets.filter((o) => o.tier === t).length);
  const nicheKeys = Object.keys(NICHES).filter((k) => outlets.some((o) => o.niche === k));

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
                      {o.owned ? <span className="mt-0.5 block truncate text-[11.5px] font-bold text-[#047857]">{L("Our network · guaranteed placement · local to this issue", "Jaringan kami · pasti tayang · lokal sesuai isu")}</span> : null}
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
              <p className="flex items-center gap-1.5 font-black text-[#7BE0B3]"><CheckCircle2 size={15} /> {release.quote?.status === "accepted" ? L("Offer accepted", "Penawaran disetujui") : release.quote?.status === "quoted" ? L("Offer ready below", "Penawaran siap, lihat di bawah") : L("Quote requested", "Penawaran diminta")}</p>
              <p className="mt-1 text-white/80">{L(`${release.quote!.outlets ?? picked.length} outlets, ${fmtWhen(release.quote!.requestedAt)}.`, `${release.quote!.outlets ?? picked.length} media, ${fmtWhen(release.quote!.requestedAt)}.`)}</p>
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
 * The press release stage of an approved plan: approval required (approval-doc.tsx), then the media and a quote.
 */
export function PressReleasePanel({ planId, planApproved }: { planId: string; planApproved: boolean }) {
  return (
    <ApprovalDocPanel
      id="press-release"
      planId={planId}
      planApproved={planApproved}
      icon={Megaphone}
      queryKey="press-release"
      load={getPressRelease}
      draft={draftPressRelease}
      edit={editPressRelease}
      review={reviewPressRelease}
      stage={(r: PressRelease) => (r.quote && r.quote.status !== "declined" ? 3 : 2)}
      editable={(r: PressRelease) => !r.quote || r.quote.status === "declined"}
      copy={{
        title: { en: "Press release", id: "Siaran pers" },
        subtitle: { en: "Every version needs an owner or admin's approval before it goes to media.", id: "Setiap versi wajib disetujui owner atau admin sebelum dikirim ke media." },
        locked: { en: "Approve the plan to write its press release and choose the media.", id: "Setujui rencana ini untuk menulis siaran pers dan memilih media." },
        emptyTitle: { en: "No press release yet", id: "Belum ada siaran pers" },
        emptyDesc: { en: "Narriv writes it from this issue and the plan's key messages. You review it before anything goes out.", id: "Narriv menulisnya dari isu ini dan pesan kunci rencana. Anda meninjaunya dulu sebelum ada yang dikirim." },
        write: { en: "Write the draft with AI", id: "Tulis draf dengan AI" },
        approve: { en: "Approve press release", id: "Setujui siaran pers" },
        draftDone: { en: "Draft ready. It now waits for approval.", id: "Draf siap dan menunggu persetujuan." },
        approvedDone: { en: "Press release approved. Choose the media next.", id: "Siaran pers disetujui. Lanjut pilih media." },
        notePlaceholder: { en: "e.g. Shorter, mention the customer education program, softer headline", id: "mis. Lebih singkat, sebut program edukasi nasabah, judul lebih lunak" },
        steps: [{ en: "Draft", id: "Draf" }, { en: "Approval", id: "Persetujuan" }, { en: "Choose media", id: "Pilih media" }, { en: "Quote", id: "Penawaran" }],
      }}
    >
      {(res, r) => (
        <>
          <MediaPicker key={`${r.version}-${r.quote?.status ?? ""}`} planId={planId} release={r} canEdit={res.canEdit} canApprove={res.canApprove} recommended={res.recommended ?? {}} ownedFit={res.ownedFit ?? []} />
          {r.quote ? <FulfilmentPanel kind="press" planId={planId} title={r.title} quote={r.quote} delivery={res.delivery} impact={res.impact} canEdit={res.canEdit} canApprove={res.canApprove} queryKey="press-release" /> : null}
        </>
      )}
    </ApprovalDocPanel>
  );
}
