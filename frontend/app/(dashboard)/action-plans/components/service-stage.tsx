"use client";

import { useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clapperboard, Megaphone, Send, Settings2, Share2, type LucideIcon } from "lucide-react";
import {
  draftServiceDoc, editServiceDoc, getServiceStage, requestServiceQuote, reviewServiceDoc, saveServiceDetails,
  type AdsDetails, type ServiceDetails, type ServiceDoc, type ServiceKind, type ServiceStageResponse, type SocialDetails, type VideoDetails,
} from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ApprovalDocPanel } from "./approval-doc";
import { FulfilmentPanel } from "./fulfilment";

type Copy = { en: string; id: string };
const today = () => new Date().toLocaleDateString("en-CA");
const plus = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString("en-CA"); };
const input = "h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[13.5px] font-semibold text-[#101334] outline-none focus:border-[#465FFF] disabled:bg-[#F7F8FC]";
const label = "grid gap-1 text-[12px] font-bold text-[#5F6B94]";

function Chips<T extends string>({ options, value, onChange, disabled }: { options: T[]; value: T[]; onChange: (v: T[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" disabled={disabled} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-bold", on ? "bg-[#101334] text-white" : "bg-[#F4F6FC] text-[#53608C] hover:bg-[#EAEFFF]", disabled && "opacity-70")}>{o}</button>
        );
      })}
    </div>
  );
}

function DetailsForm({ kind, planId, doc, res }: { kind: ServiceKind; planId: string; doc: ServiceDoc; res: ServiceStageResponse }) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const locked = !res.canEdit || (Boolean(doc.quote) && doc.quote?.status !== "declined");
  const d = doc.details as Partial<VideoDetails & AdsDetails & SocialDetails> | null;
  const start0 = d?.start ?? plus(today(), 3);
  const [v, setV] = useState({
    count: d?.count ?? 3, duration: d?.duration ?? "30", aspect: d?.aspect ?? "9:16", due: d?.due ?? plus(today(), 7),
    platforms: (d?.platforms as string[] | undefined) ?? (kind === "ads" ? ["Meta", "TikTok"] : ["Instagram", "TikTok"]),
    objective: d?.objective ?? "awareness", cities: (d?.cities ?? []).join(", "), start: start0, end: d?.end ?? plus(start0, 13),
    budget: d?.budget ? String(d.budget) : "", perWeek: d?.perWeek ?? 3, note: d?.note ?? "",
  });
  const [note, setNote] = useState("");
  const set = (patch: Partial<typeof v>) => setV({ ...v, ...patch });
  const payload = (): ServiceDetails => {
    const noteOut = v.note.trim() || undefined;
    if (kind === "video") return { count: Number(v.count), duration: v.duration as VideoDetails["duration"], aspect: v.aspect as VideoDetails["aspect"], due: v.due, note: noteOut };
    if (kind === "ads") return { platforms: v.platforms as AdsDetails["platforms"], objective: v.objective as AdsDetails["objective"], cities: v.cities.split(",").map((c) => c.trim()).filter((c) => c.length >= 2).slice(0, 20), start: v.start, end: v.end, budget: Number(String(v.budget).replace(/\D/g, "")) || 0, note: noteOut };
    return { platforms: v.platforms as SocialDetails["platforms"], start: v.start, end: v.end, perWeek: Number(v.perWeek), note: noteOut };
  };
  const refresh = () => qc.invalidateQueries({ queryKey: [`stage-${kind}`, planId] });
  const save = useMutation({ meta: { silent: true }, mutationFn: () => saveServiceDetails(kind, planId, payload()), onSuccess: () => { toast.success(L("Details saved.", "Detail disimpan.")); refresh(); }, onError: (e: Error) => toast.error(e.message || L("Not saved.", "Gagal disimpan.")) });
  const quote = useMutation({
    meta: { silent: true },
    mutationFn: async () => { await saveServiceDetails(kind, planId, payload()); return requestServiceQuote(kind, planId, note); },
    onSuccess: () => { toast.success(L("Quote request sent. We reply within one working day.", "Permintaan penawaran terkirim. Kami balas dalam 1 hari kerja.")); refresh(); },
    onError: (e: Error) => toast.error(e.message || L("The request was not sent.", "Permintaan gagal dikirim.")),
  });
  const valid = kind === "video" ? Boolean(v.due) : v.platforms.length > 0 && v.start <= v.end && (kind !== "ads" || Number(String(v.budget).replace(/\D/g, "")) > 0);

  return (
    <div className="mt-6 border-t border-[#EEF0F6] pt-6">
      <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><Settings2 size={17} /> {L("Details", "Detail")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kind === "video" ? (<>
          <label className={label}>{L("Number of videos", "Jumlah video")}<input type="number" min={1} max={10} value={v.count} disabled={locked} onChange={(e) => set({ count: Number(e.target.value) })} className={input} /></label>
          <label className={label}>{L("Length", "Durasi")}<select value={v.duration} disabled={locked} onChange={(e) => set({ duration: e.target.value as VideoDetails["duration"] })} className={input}>{["15", "30", "60"].map((x) => <option key={x} value={x}>{x} {L("seconds", "detik")}</option>)}</select></label>
          <label className={label}>{L("Format", "Format")}<select value={v.aspect} disabled={locked} onChange={(e) => set({ aspect: e.target.value as VideoDetails["aspect"] })} className={input}><option value="9:16">9:16 · TikTok/Reels</option><option value="1:1">1:1 · Feed</option><option value="16:9">16:9 · YouTube</option></select></label>
          <label className={label}>{L("Ready by", "Selesai tanggal")}<input type="date" value={v.due} min={today()} disabled={locked} onChange={(e) => set({ due: e.target.value })} className={input} /></label>
        </>) : (<>
          <div className={cn(label, "sm:col-span-2 lg:col-span-4")}>{L("Platforms", "Platform")}<Chips options={kind === "ads" ? ["Meta", "TikTok", "Google", "YouTube"] : ["Instagram", "TikTok", "X", "Facebook", "LinkedIn", "YouTube"]} value={v.platforms} onChange={(p) => set({ platforms: p })} disabled={locked} /></div>
          <label className={label}>{L("Starts", "Mulai")}<input type="date" value={v.start} disabled={locked} onChange={(e) => set({ start: e.target.value })} className={input} /></label>
          <label className={label}>{L("Ends", "Selesai")}<input type="date" value={v.end} min={v.start} disabled={locked} onChange={(e) => set({ end: e.target.value })} className={input} /></label>
          {kind === "ads" ? (<>
            <label className={label}>{L("Objective", "Tujuan")}<select value={v.objective} disabled={locked} onChange={(e) => set({ objective: e.target.value as AdsDetails["objective"] })} className={input}><option value="awareness">{L("Reach and awareness", "Jangkauan")}</option><option value="traffic">{L("Visits", "Kunjungan")}</option><option value="leads">{L("Leads", "Prospek (leads)")}</option></select></label>
            <label className={label}>{L("Ad budget (Rp)", "Budget iklan (Rp)")}<input inputMode="numeric" value={v.budget ? Number(String(v.budget).replace(/\D/g, "") || 0).toLocaleString("id-ID") : ""} disabled={locked} onChange={(e) => set({ budget: e.target.value })} placeholder="20.000.000" className={input} /></label>
            <label className={cn(label, "sm:col-span-2 lg:col-span-4")}>{L("Cities (comma-separated, empty = all Indonesia)", "Kota (pisahkan dengan koma, kosong = seluruh Indonesia)")}<input value={v.cities} disabled={locked} onChange={(e) => set({ cities: e.target.value })} placeholder="Jakarta, Bandung, Surabaya" className={input} /></label>
          </>) : (
            <label className={label}>{L("Posts per week", "Posting per minggu")}<input type="number" min={1} max={21} value={v.perWeek} disabled={locked} onChange={(e) => set({ perWeek: Number(e.target.value) })} className={input} /></label>
          )}
        </>)}
        <label className={cn(label, "sm:col-span-2 lg:col-span-4")}>{L("Note for the team (optional)", "Catatan untuk tim (opsional)")}<input value={v.note} maxLength={500} disabled={locked} onChange={(e) => set({ note: e.target.value })} className={input} /></label>
      </div>

      {doc.deliverables.length ? (
        <div className="mt-4 rounded-[14px] bg-[#F7F8FC] p-3">
          <p className="text-[12px] font-bold text-[#5F6B94]">{L(`${doc.deliverables.length} deliverables`, `${doc.deliverables.length} keluaran`)}</p>
          <ul className="mt-1.5 flex max-h-[120px] flex-wrap gap-1.5 overflow-auto">{doc.deliverables.map((x) => <li key={x.id} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#31406B] shadow-sm">{x.name}{x.due ? ` · ${new Date(`${x.due}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}</li>)}</ul>
        </div>
      ) : null}

      {!locked ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <button type="button" onClick={() => save.mutate()} disabled={!valid || save.isPending} className="h-11 rounded-[12px] border-[1.5px] border-[#101334] px-5 text-[13.5px] font-black text-[#101334] disabled:opacity-40">{save.isPending ? L("Saving…", "Menyimpan…") : L("Save details", "Simpan detail")}</button>
          {res.canApprove ? (<>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={L("Note with the quote request (optional)", "Catatan untuk permintaan penawaran (opsional)")} aria-label={L("Note", "Catatan")} className={cn(input, "h-11 flex-1")} />
            <button type="button" onClick={() => quote.mutate()} disabled={!valid || quote.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-50"><Send size={15} /> {quote.isPending ? L("Sending…", "Mengirim…") : L("Request a quote", "Minta penawaran")}</button>
          </>) : null}
        </div>
      ) : doc.quote && doc.quote.status !== "declined" ? (
        <p className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-[#047857]"><CheckCircle2 size={15} /> {L("Quote requested. Details are locked; see the offer below.", "Penawaran diminta. Detail dikunci, lihat penawaran di bawah.")}</p>
      ) : null}
    </div>
  );
}

const META: Record<ServiceKind, { icon: LucideIcon; copy: Record<string, Copy | Copy[]> }> = {
  video: {
    icon: Clapperboard,
    copy: {
      title: { en: "Short videos", id: "Video pendek" },
      subtitle: { en: "Scripts need an owner or admin's approval before production.", id: "Naskah wajib disetujui owner atau admin sebelum diproduksi." },
      locked: { en: "Approve the plan to script short videos.", id: "Setujui rencana ini untuk menulis naskah video pendek." },
      emptyTitle: { en: "No scripts yet", id: "Belum ada naskah" },
      emptyDesc: { en: "Narriv writes two or three vertical-video scripts from this issue: hook, scenes, voice-over, on-screen text, call to action.", id: "Narriv menulis dua sampai tiga naskah video vertikal dari isu ini: pembuka, adegan, suara, teks layar, ajakan." },
      write: { en: "Write the scripts with AI", id: "Tulis naskah dengan AI" },
      approve: { en: "Approve scripts", id: "Setujui naskah" },
      draftDone: { en: "Scripts ready. They now wait for approval.", id: "Naskah siap dan menunggu persetujuan." },
      approvedDone: { en: "Scripts approved. Set the details next.", id: "Naskah disetujui. Lanjut isi detail." },
      notePlaceholder: { en: "e.g. Warmer tone, show the help line number, 30 seconds max", id: "mis. Nada lebih hangat, tampilkan nomor layanan, maksimal 30 detik" },
      steps: [{ en: "Scripts", id: "Naskah" }, { en: "Approval", id: "Persetujuan" }, { en: "Details", id: "Detail" }, { en: "Quote", id: "Penawaran" }],
    },
  },
  ads: {
    icon: Megaphone,
    copy: {
      title: { en: "Paid ads", id: "Iklan berbayar" },
      subtitle: { en: "The ad plan and copy need an owner or admin's approval before anything runs.", id: "Rencana dan teks iklan wajib disetujui owner atau admin sebelum tayang." },
      locked: { en: "Approve the plan to prepare paid ads.", id: "Setujui rencana ini untuk menyiapkan iklan berbayar." },
      emptyTitle: { en: "No ad plan yet", id: "Belum ada rencana iklan" },
      emptyDesc: { en: "Narriv writes the objective, audience, key messages and three copy variants per platform.", id: "Narriv menulis tujuan, audiens, pesan kunci, dan tiga variasi teks iklan per platform." },
      write: { en: "Write the ad plan with AI", id: "Tulis rencana iklan dengan AI" },
      approve: { en: "Approve ad plan", id: "Setujui rencana iklan" },
      draftDone: { en: "Ad plan ready. It now waits for approval.", id: "Rencana iklan siap dan menunggu persetujuan." },
      approvedDone: { en: "Ad plan approved. Set platforms, cities and budget next.", id: "Rencana iklan disetujui. Lanjut isi platform, kota, dan budget." },
      notePlaceholder: { en: "e.g. Focus on Jabodetabek, no comparisons, add a leads variant", id: "mis. Fokus Jabodetabek, tanpa perbandingan, tambah variasi leads" },
      steps: [{ en: "Plan", id: "Rencana" }, { en: "Approval", id: "Persetujuan" }, { en: "Details", id: "Detail" }, { en: "Quote", id: "Penawaran" }],
    },
  },
  social: {
    icon: Share2,
    copy: {
      title: { en: "Social media management", id: "Kelola media sosial" },
      subtitle: { en: "The content calendar needs an owner or admin's approval before posting.", id: "Kalender konten wajib disetujui owner atau admin sebelum diposting." },
      locked: { en: "Approve the plan to prepare the brand's posts.", id: "Setujui rencana ini untuk menyiapkan posting akun brand." },
      emptyTitle: { en: "No content calendar yet", id: "Belum ada kalender konten" },
      emptyDesc: { en: "Narriv writes the content pillars and a post-by-post calendar with ready captions for the official accounts.", id: "Narriv menulis pilar konten dan kalender per posting lengkap dengan caption untuk akun resmi." },
      write: { en: "Write the calendar with AI", id: "Tulis kalender dengan AI" },
      approve: { en: "Approve calendar", id: "Setujui kalender" },
      draftDone: { en: "Calendar ready. It now waits for approval.", id: "Kalender siap dan menunggu persetujuan." },
      approvedDone: { en: "Calendar approved. Set platforms and dates next.", id: "Kalender disetujui. Lanjut isi platform dan tanggal." },
      notePlaceholder: { en: "e.g. Fewer promotional posts, add a weekly Q&A", id: "mis. Kurangi posting promosi, tambah sesi tanya jawab mingguan" },
      steps: [{ en: "Calendar", id: "Kalender" }, { en: "Approval", id: "Persetujuan" }, { en: "Details", id: "Detail" }, { en: "Quote", id: "Penawaran" }],
    },
  },
};

/** One of the extra stages of an approved plan (video, ads, social): approval, details, quote, delivery, impact. */
export function ServiceStagePanel({ kind, planId, planApproved }: { kind: ServiceKind; planId: string; planApproved: boolean }) {
  const meta = META[kind];
  const c = meta.copy as Record<string, Copy> & { steps: Copy[] };
  return (
    <ApprovalDocPanel<ServiceDoc, ServiceStageResponse>
      id={`stage-${kind}`}
      planId={planId}
      planApproved={planApproved}
      icon={meta.icon}
      queryKey={`stage-${kind}`}
      load={(id) => getServiceStage(kind, id)}
      draft={(id) => draftServiceDoc(kind, id)}
      edit={(id, input) => editServiceDoc(kind, id, input)}
      review={(id, input) => reviewServiceDoc(kind, id, input)}
      stage={(r) => (r.quote && r.quote.status !== "declined" ? 3 : 2)}
      editable={(r) => !r.quote || r.quote.status === "declined"}
      copy={{ title: c.title, subtitle: c.subtitle, locked: c.locked, emptyTitle: c.emptyTitle, emptyDesc: c.emptyDesc, write: c.write, approve: c.approve, draftDone: c.draftDone, approvedDone: c.approvedDone, notePlaceholder: c.notePlaceholder, steps: c.steps }}
    >
      {(res, r) => (
        <>
          <DetailsForm key={`${r.version}-${r.quote?.status ?? ""}-${JSON.stringify(r.details)}`} kind={kind} planId={planId} doc={r} res={res} />
          {r.quote ? <FulfilmentPanel kind={kind} planId={planId} title={r.title} quote={r.quote} delivery={res.delivery} impact={res.impact} canEdit={res.canEdit} canApprove={res.canApprove} queryKey={`stage-${kind}`} /> : null}
        </>
      )}
    </ApprovalDocPanel>
  );
}

/** Which stages to show: press release and influencers always; videos, ads and social when the team adds them. */
export function StagePicker({ shown, onAdd }: { shown: ServiceKind[]; onAdd: (k: ServiceKind) => void }) {
  const L = useL();
  const all: Array<[ServiceKind, LucideIcon, Copy, Copy]> = [
    ["video", Clapperboard, { en: "Short videos", id: "Video pendek" }, { en: "Scripts, then production", id: "Naskah, lalu produksi" }],
    ["ads", Megaphone, { en: "Paid ads", id: "Iklan berbayar" }, { en: "Platforms, cities, budget", id: "Platform, kota, budget" }],
    ["social", Share2, { en: "Social media", id: "Media sosial" }, { en: "Content calendar, posting", id: "Kalender konten, posting" }],
  ];
  const rest = all.filter(([k]) => !shown.includes(k));
  if (!rest.length) return null;
  return (
    <div className="mt-5 rounded-[18px] border-[1.5px] border-dashed border-[#C9D0E3] p-4">
      <p className="text-[13px] font-black text-[#101334]">{L("Add another step to this plan", "Tambah langkah lain ke rencana ini")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {rest.map(([k, Icon, t, d]) => (
          <button key={k} type="button" onClick={() => onAdd(k)} className="flex items-center gap-3 rounded-[14px] bg-[#F7F8FC] p-3 text-left hover:bg-[#EEF1FF]">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white text-[#3247D9] shadow-sm"><Icon size={17} /></span>
            <span><b className="block text-[13.5px] text-[#101334]">{L(t.en, t.id)}</b><small className="text-[12px] text-[#5F6B94]">{L(d.en, d.id)}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}


const SERVICE_KINDS: ServiceKind[] = ["video", "ads", "social"];

/** The extra stages of a plan: the ones already started, the ones added now, and a picker for the rest. */
export function ServiceStages({ planId, planApproved }: { planId: string; planApproved: boolean }) {
  const [added, setAdded] = useState<ServiceKind[]>([]);
  const results = useQueries({ queries: SERVICE_KINDS.map((k) => ({ queryKey: [`stage-${k}`, planId], queryFn: () => getServiceStage(k, planId), enabled: planApproved, staleTime: 30_000 })) });
  if (!planApproved) return null;
  const started = SERVICE_KINDS.filter((k, i) => Boolean(results[i].data?.data));
  const shown = SERVICE_KINDS.filter((k) => started.includes(k) || added.includes(k));
  const loading = results.some((r) => r.isPending);
  return (
    <>
      {shown.map((k) => <ServiceStagePanel key={k} kind={k} planId={planId} planApproved={planApproved} />)}
      {!loading ? <StagePicker shown={shown} onAdd={(k) => { setAdded([...added, k]); requestAnimationFrame(() => document.getElementById(`stage-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" })); }} /> : null}
    </>
  );
}
