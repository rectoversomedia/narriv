"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Lock, Plus, Search, Send, Sparkles, Trash2, Users } from "lucide-react";
import {
  draftInfluencerBrief, editInfluencerBrief, getCreators, getInfluencerCampaign, requestCreatorAccess, requestInfluencerQuote, reviewInfluencerBrief,
  saveCampaignCreators, saveCampaignSchedule,
  type CampaignFormat, type CampaignWave, type Creator, type CreatorFilters, type InfluencerCampaign, type InfluencerCampaignResponse,
} from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ApprovalDocPanel, fmtWhen } from "./approval-doc";
import { FulfilmentPanel } from "./fulfilment";

const QK = "influencer-campaign";
const FORMAT_LABEL: Record<CampaignFormat, string> = { reels: "Reels", feed: "Feed", story: "Story", tiktok: "TikTok video", youtube: "YouTube video", live: "Live" };
const TIER_CLS: Record<string, string> = { Mega: "bg-[#101334] text-white", Macro: "bg-[#EEF1FF] text-[#3247D9]", Micro: "bg-[#E8F7EF] text-[#047857]", Nano: "bg-[#FFF4E5] text-[#A04606]", Unknown: "bg-[#F1F3F8] text-[#5A6478]" };
const CATEGORY_ID: Record<string, string> = {
  General: "Umum", Fashion: "Fashion", Lifestyle: "Gaya hidup", Beauty: "Kecantikan", "Parenting & Family": "Parenting & keluarga", Pets: "Hewan peliharaan",
  "Food & Drink": "Makanan & minuman", Entertainment: "Hiburan", "Media page": "Akun media", "Health & Fitness": "Kesehatan & kebugaran", Automotive: "Otomotif",
  Travel: "Travel", "Tech & Gaming": "Teknologi & gaming", "Home & Living": "Rumah & dekorasi", Finance: "Keuangan", Education: "Pendidikan",
};
const FOLLOWER_RANGES: Array<{ key: string; en: string; id: string; min?: number; max?: number }> = [
  { key: "", en: "Any followers", id: "Semua followers" },
  { key: "lt10", en: "Under 10K", id: "< 10 rb", max: 10_000 },
  { key: "10-100", en: "10K–100K", id: "10–100 rb", min: 10_000, max: 100_000 },
  { key: "100-1m", en: "100K–1M", id: "100 rb–1 jt", min: 100_000, max: 1_000_000 },
  { key: "gt1m", en: "Over 1M", id: "> 1 jt", min: 1_000_000 },
];

const compact = (n: number | null | undefined) => (n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : n >= 1e3 ? `${(n / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb` : String(n));
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
const addDays = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString("en-CA"); };
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
const defaultFormat = (c: Creator): CampaignFormat => (c.platform === "TikTok" ? "tiktok" : c.platform === "YouTube" ? "youtube" : "reels");

/** Split the campaign dates into n waves of near-equal length. */
function splitWaves(start: string, end: string, names: string[]): CampaignWave[] {
  const total = daysBetween(start, end) + 1;
  const n = Math.max(1, Math.min(names.length, total));
  let cursor = start;
  return names.slice(0, n).map((name, i) => {
    const len = Math.floor(total / n) + (i < total % n ? 1 : 0);
    const w = { id: `w${i + 1}`, name, start: cursor, end: addDays(cursor, len - 1) };
    cursor = addDays(w.end, 1);
    return w;
  });
}

function ScheduleEditor({ planId, doc, canEdit, onSaved }: { planId: string; doc: InfluencerCampaign; canEdit: boolean; onSaved: () => void }) {
  const L = useL();
  const toast = useToast();
  const today = new Date().toLocaleDateString("en-CA");
  const initial = doc.schedule ?? (() => { const s = addDays(today, 3); const e = addDays(s, 13); return { start: s, end: e, waves: splitWaves(s, e, [L("Teaser", "Teaser"), L("Main", "Utama"), L("Follow-up", "Lanjutan")]) }; })();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [waves, setWaves] = useState<CampaignWave[]>(initial.waves);
  const locked = !canEdit || (Boolean(doc.quote) && doc.quote?.status !== "declined");
  const save = useMutation({
    meta: { silent: true },
    mutationFn: () => saveCampaignSchedule(planId, { start, end, waves }),
    onSuccess: () => { toast.success(L("Schedule saved.", "Jadwal disimpan.")); onSaved(); },
    onError: (e: Error) => toast.error(e.message || L("The schedule was not saved.", "Jadwal gagal disimpan.")),
  });
  const valid = start <= end && waves.length > 0 && waves.every((w) => w.name.trim() && w.start <= w.end && w.start >= start && w.end <= end);
  const dirty = JSON.stringify({ start, end, waves }) !== JSON.stringify(doc.schedule ?? {});
  const setWave = (i: number, patch: Partial<CampaignWave>) => setWaves(waves.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const input = "h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[13.5px] font-semibold text-[#101334] outline-none focus:border-[#465FFF] disabled:bg-[#F7F8FC]";
  const span = daysBetween(start, end) + 1;

  return (
    <div className="mt-6 border-t border-[#EEF0F6] pt-6">
      <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><CalendarDays size={17} /> {L("Schedule", "Jadwal")}</p>
      <p className="mt-0.5 text-[13px] text-[#5F6B94]">{L("Campaign dates, broken down into waves. Each influencer then gets a posting date inside a wave.", "Tanggal kampanye, dipecah per gelombang. Setiap influencer nanti dapat tanggal posting di dalam gelombangnya.")}</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-[12px] font-bold text-[#5F6B94]">{L("Starts", "Mulai")}<input type="date" value={start} disabled={locked} onChange={(e) => setStart(e.target.value)} className={input} /></label>
        <label className="grid gap-1 text-[12px] font-bold text-[#5F6B94]">{L("Ends", "Selesai")}<input type="date" value={end} min={start} disabled={locked} onChange={(e) => setEnd(e.target.value)} className={input} /></label>
        <span className="pb-2.5 text-[13px] font-bold text-[#3A4270]">{span > 0 ? L(`${span} days`, `${span} hari`) : ""}</span>
        {!locked ? (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" onClick={() => setWaves(splitWaves(start, end, n === 1 ? [L("Main", "Utama")] : [L("Teaser", "Teaser"), L("Main", "Utama"), L("Follow-up", "Lanjutan")].slice(0, n)))} className="rounded-full bg-[#F4F6FC] px-3 py-1.5 text-[12px] font-bold text-[#3A4270] hover:bg-[#EAEFFF]">
                {L(`Split into ${n}`, `Bagi ${n} gelombang`)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ol className="mt-4 grid gap-2">
        {waves.map((w, i) => (
          <li key={w.id} className="grid items-end gap-2 rounded-[14px] bg-[#F7F8FC] p-3 sm:grid-cols-[28px_minmax(0,1fr)_150px_150px_36px]">
            <span className="grid size-7 place-items-center rounded-full bg-[#101334] text-[12px] font-black text-white">{i + 1}</span>
            <label className="grid gap-1 text-[11.5px] font-bold text-[#5F6B94]">{L("Wave name", "Nama gelombang")}<input value={w.name} maxLength={60} disabled={locked} onChange={(e) => setWave(i, { name: e.target.value })} className={input} /></label>
            <label className="grid gap-1 text-[11.5px] font-bold text-[#5F6B94]">{L("From", "Dari")}<input type="date" value={w.start} min={start} max={end} disabled={locked} onChange={(e) => setWave(i, { start: e.target.value })} className={input} /></label>
            <label className="grid gap-1 text-[11.5px] font-bold text-[#5F6B94]">{L("To", "Sampai")}<input type="date" value={w.end} min={w.start} max={end} disabled={locked} onChange={(e) => setWave(i, { end: e.target.value })} className={input} /></label>
            {!locked && waves.length > 1 ? (
              <button type="button" onClick={() => setWaves(waves.filter((_, j) => j !== i))} aria-label={L(`Remove ${w.name}`, `Hapus ${w.name}`)} className="grid size-9 place-items-center rounded-[10px] text-[#8A93B8] hover:bg-white hover:text-[#B42318]"><Trash2 size={15} /></button>
            ) : <span />}
          </li>
        ))}
      </ol>
      {!locked ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" disabled={waves.length >= 8} onClick={() => { const last = waves[waves.length - 1]; const s = last && last.end < end ? addDays(last.end, 1) : start; setWaves([...waves, { id: `w${Date.now().toString(36)}`, name: `${L("Wave", "Gelombang")} ${waves.length + 1}`, start: s, end }]); }} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#3247D9] disabled:opacity-40"><Plus size={14} /> {L("Add a wave", "Tambah gelombang")}</button>
          <div className="flex items-center gap-3">
            {!valid ? <span className="text-[12px] font-semibold text-[#B42318]">{L("Every wave must sit inside the campaign dates.", "Setiap gelombang harus di dalam tanggal kampanye.")}</span> : null}
            <button type="button" onClick={() => save.mutate()} disabled={!valid || save.isPending || (!dirty && Boolean(doc.schedule))} className="h-10 rounded-[10px] bg-[#101334] px-4 text-[13px] font-black text-white disabled:opacity-40">{save.isPending ? L("Saving…", "Menyimpan…") : doc.schedule ? L("Save schedule", "Simpan jadwal") : L("Save and choose influencers", "Simpan dan pilih influencer")}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FitTag({ c }: { c: Creator }) {
  const L = useL();
  if (!c.fit) return null;
  return "mentioned" in c.fit
    ? <span className="block truncate text-[11.5px] font-bold text-[#A04606]">{L(`Posted about your brand (${c.fit.mentioned}×)`, `Pernah bahas brand Anda (${c.fit.mentioned}×)`)}</span>
    : <span className="block truncate text-[11.5px] font-bold text-[#A04606]">{L("Fits your industry", "Cocok untuk industri Anda")}</span>;
}

type Item = { id: string; wave: string; date: string; format: CampaignFormat; creator: Creator };

function CreatorPlanner({ planId, res, doc }: { planId: string; res: InfluencerCampaignResponse; doc: InfluencerCampaign }) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const schedule = doc.schedule!;
  const locked = !res.canEdit || (Boolean(doc.quote) && doc.quote?.status !== "declined");
  const [items, setItems] = useState<Item[]>(doc.creators);
  const [targetWave, setTargetWave] = useState(schedule.waves[0]?.id ?? "");
  const [f, setF] = useState<CreatorFilters & { range?: string }>({ rec: true, page: 1 });
  const [qText, setQText] = useState("");
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q: qText || undefined, page: 1 })), 300); return () => clearTimeout(t); }, [qText]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const range = FOLLOWER_RANGES.find((r) => r.key === (f.range ?? "")) ?? FOLLOWER_RANGES[0];
  const filters: CreatorFilters = { q: f.q, platform: f.platform, category: f.category, city: f.city, tier: f.tier, minEr: f.minEr, rec: f.rec, page: f.page, minFollowers: range.min, maxFollowers: range.max };
  const list = useQuery({ queryKey: ["creators", filters], queryFn: () => getCreators(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
  const save = useMutation({
    meta: { silent: true },
    mutationFn: (next: Item[]) => saveCampaignCreators(planId, next.map(({ id, wave, date, format }) => ({ id, wave, date, format }))),
    onError: (e: Error) => toast.error(e.message || L("Not saved.", "Gagal disimpan.")),
  });
  const quote = useMutation({
    meta: { silent: true },
    mutationFn: async () => { await saveCampaignCreators(planId, items.map(({ id, wave, date, format }) => ({ id, wave, date, format }))); return requestInfluencerQuote(planId, note); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: [QK, planId] }); toast.success(L("Quote request sent. We reply within one working day.", "Permintaan penawaran terkirim. Kami balas dalam 1 hari kerja.")); },
    onError: (e: Error) => toast.error(e.message || L("The request was not sent.", "Permintaan gagal dikirim.")),
  });
  const access = useMutation({
    meta: { silent: true },
    mutationFn: requestCreatorAccess,
    onSuccess: () => toast.success(L("Request sent. The Narriv team will open it for you.", "Permintaan terkirim. Tim Narriv akan membukanya untuk Anda.")),
    onError: (e: Error) => toast.error(e.message || L("The request was not sent.", "Permintaan gagal dikirim.")),
  });

  const commit = (next: Item[]) => {
    setItems(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), 700);
  };
  const toggle = (c: Creator) => {
    if (locked) return;
    if (items.some((i) => i.id === c.id)) return commit(items.filter((i) => i.id !== c.id));
    const w = schedule.waves.find((x) => x.id === targetWave) ?? schedule.waves[0];
    commit([...items, { id: c.id, wave: w.id, date: w.start, format: defaultFormat(c), creator: c }]);
  };
  const update = (id: string, patch: Partial<Item>) => commit(items.map((i) => {
    if (i.id !== id) return i;
    const next = { ...i, ...patch };
    if (patch.wave) { const w = schedule.waves.find((x) => x.id === patch.wave)!; if (next.date < w.start || next.date > w.end) next.date = w.start; }
    return next;
  }));

  const data = list.data;
  const facets = data?.facets;
  const reach = items.reduce((s, i) => s + (i.creator.followers || 0), 0);
  const count = (key: (i: Item) => string | null) => Object.entries(items.reduce<Record<string, number>>((m, i) => { const k = key(i); return k ? { ...m, [k]: (m[k] || 0) + 1 } : m; }, {})).sort((a, b) => b[1] - a[1]);
  const byTier = count((i) => i.creator.tier);
  const byPlatform = count((i) => i.creator.platform);
  const byCity = count((i) => i.creator.city ?? L("City unknown", "Kota belum diketahui"));
  const sel = "h-9 rounded-[10px] border border-[#DDE3EF] bg-white px-2.5 text-[12.5px] font-bold text-[#3A4270] outline-none focus:border-[#465FFF]";
  const catLabel = (v: string) => L(v, CATEGORY_ID[v] ?? v);

  if (data && !data.access) {
    return (
      <div className="mt-6 border-t border-[#EEF0F6] pt-6">
        <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><Users size={17} /> {L("Choose influencers", "Pilih influencer")}</p>
        <div className="relative mt-4 overflow-hidden rounded-[16px] border border-[#E3E7F1]">
          <ul className="pointer-events-none select-none blur-[3px]" aria-hidden="true">
            {data.data.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-b border-[#EEF0F6] px-4 py-3 last:border-0">
                <span className="grid size-9 place-items-center rounded-full bg-[#EEF1FF] text-[12px] font-black text-[#3247D9]">{c.name.slice(0, 1)}</span>
                <span className="flex-1"><b className="block text-[14px]">{c.name}</b><small className="text-[12px] text-[#647099]">{c.platform} · {c.city} · {compact(c.followers)}</small></span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TIER_CLS[c.tier])}>{c.tier}</span>
              </li>
            ))}
          </ul>
          <div className="absolute inset-0 grid place-items-center bg-white/70 p-6 text-center">
            <div className="max-w-md">
              <Lock size={24} className="mx-auto text-[#101334]" />
              <p className="mt-2 text-[16px] font-black text-[#101334]">{L(`${data.total.toLocaleString("en-US")} influencers, locked for this workspace`, `${data.total.toLocaleString("id-ID")} influencer, masih terkunci untuk workspace ini`)}</p>
              <p className="mt-1 text-[13px] text-[#5F6B94]">{L("Filter by city, category, tier, followers and engagement, then schedule each one. The Narriv team opens it per client.", "Filter per kota, kategori, tier, followers, dan engagement, lalu jadwalkan masing-masing. Tim Narriv membukanya per klien.")}</p>
              {res.canApprove ? (
                <button type="button" onClick={() => access.mutate()} disabled={access.isPending || access.isSuccess} className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white disabled:opacity-60">
                  {access.isSuccess ? <><CheckCircle2 size={16} /> {L("Request sent", "Permintaan terkirim")}</> : <><Send size={15} /> {L("Request access", "Minta akses")}</>}
                </button>
              ) : <p className="mt-3 text-[12.5px] font-semibold text-[#5F6B94]">{L("Ask an owner or admin to request access.", "Minta owner atau admin untuk meminta akses.")}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-[#EEF0F6] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><Users size={17} /> {L("Choose influencers", "Pilih influencer")}</p>
          <p className="mt-0.5 text-[13px] text-[#5F6B94]">{L("Tick creators to add them to the selected wave, then set each posting date and format.", "Centang influencer untuk menambahkannya ke gelombang yang dipilih, lalu atur tanggal posting dan formatnya.")}</p>
        </div>
        {save.isPending ? <span className="text-[12px] font-semibold text-[#8A93B8]">{L("Saving…", "Menyimpan…")}</span> : null}
      </div>

      {!locked ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-bold text-[#5F6B94]">{L("Add to:", "Tambahkan ke:")}</span>
          {schedule.waves.map((w) => (
            <button key={w.id} type="button" onClick={() => setTargetWave(w.id)} className={cn("rounded-full px-3 py-1.5 text-[12px] font-bold", targetWave === w.id ? "bg-[#101334] text-white" : "bg-[#F4F6FC] text-[#53608C] hover:bg-[#EAEFFF]")}>
              {w.name} <span className="font-semibold opacity-70">{dayLabel(w.start)}–{dayLabel(w.end)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <div className="min-w-0">
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[#647099]">
            <Search size={15} />
            <input value={qText} onChange={(e) => setQText(e.target.value)} placeholder={L("Search name or @handle", "Cari nama atau @handle")} className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#101334] outline-none placeholder:text-[#8A93B8]" />
          </label>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setF({ ...f, rec: !f.rec, page: 1 })} className={cn("inline-flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-bold", f.rec ? "bg-[#FFF1DB] text-[#A04606] ring-1 ring-[#F5C97A]" : "bg-[#F4F6FC] text-[#53608C]")}>
              <Sparkles size={12} /> {L("Recommended", "Rekomendasi")}
            </button>
            <select aria-label="Platform" value={f.platform ?? ""} onChange={(e) => setF({ ...f, platform: e.target.value || undefined, page: 1 })} className={sel}>
              <option value="">{L("All platforms", "Semua platform")}</option>
              {facets?.platforms.map((p) => <option key={p.value} value={p.value}>{p.value} ({p.count.toLocaleString("id-ID")})</option>)}
            </select>
            <select aria-label={L("Category", "Kategori")} value={f.category ?? ""} onChange={(e) => setF({ ...f, category: e.target.value || undefined, page: 1 })} className={sel}>
              <option value="">{L("All categories", "Semua kategori")}</option>
              {facets?.categories.map((p) => <option key={p.value} value={p.value}>{catLabel(p.value)} ({p.count.toLocaleString("id-ID")})</option>)}
            </select>
            <select aria-label={L("City", "Kota")} value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value || undefined, page: 1 })} className={sel}>
              <option value="">{L("All cities", "Semua kota")}</option>
              {facets?.cities.map((p) => <option key={p.value} value={p.value}>{p.value} ({p.count.toLocaleString("id-ID")})</option>)}
              <option value="__none">{L("City unknown", "Kota belum diketahui")}</option>
            </select>
            <select aria-label="Tier" value={f.tier ?? ""} onChange={(e) => setF({ ...f, tier: e.target.value || undefined, page: 1 })} className={sel}>
              <option value="">{L("All tiers", "Semua tier")}</option>
              {["Nano", "Micro", "Macro", "Mega", "Unknown"].map((t) => <option key={t} value={t}>{t === "Unknown" ? L("Tier unknown", "Tier belum diketahui") : t}</option>)}
            </select>
            <select aria-label="Followers" value={f.range ?? ""} onChange={(e) => setF({ ...f, range: e.target.value, page: 1 })} className={sel}>
              {FOLLOWER_RANGES.map((r) => <option key={r.key} value={r.key}>{L(r.en, r.id)}</option>)}
            </select>
            <select aria-label="Engagement" value={f.minEr ?? ""} onChange={(e) => setF({ ...f, minEr: e.target.value ? Number(e.target.value) : undefined, page: 1 })} className={sel}>
              <option value="">{L("Any ER", "Semua ER")}</option>
              {[1, 2, 3, 5].map((n) => <option key={n} value={n}>ER ≥ {n}%</option>)}
            </select>
          </div>
          {facets && f.city ? <p className="mt-2 text-[11.5px] text-[#8A93B8]">{L(`City is known for ${facets.withCity.toLocaleString("en-US")} of ${data?.total ?? ""} creators.`, `Kota baru diketahui untuk ${facets.withCity.toLocaleString("id-ID")} influencer. Sisanya ada di "Kota belum diketahui".`)}</p> : null}

          <div className="mt-3 overflow-hidden rounded-[14px] border border-[#E3E7F1]">
            <div className="flex items-center justify-between bg-[#F7F8FC] px-3.5 py-2 text-[12px] font-bold text-[#5F6B94]">
              <span>{data ? L(`${data.total.toLocaleString("en-US")} creators`, `${data.total.toLocaleString("id-ID")} influencer`) : L("Loading…", "Memuat…")}</span>
              {data && data.pages > 1 ? (
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={L("Previous page", "Halaman sebelumnya")} disabled={data.page <= 1} onClick={() => setF({ ...f, page: data.page - 1 })} className="grid size-7 place-items-center rounded-[8px] hover:bg-white disabled:opacity-30"><ChevronLeft size={15} /></button>
                  {data.page}/{data.pages}
                  <button type="button" aria-label={L("Next page", "Halaman berikutnya")} disabled={data.page >= data.pages} onClick={() => setF({ ...f, page: data.page + 1 })} className="grid size-7 place-items-center rounded-[8px] hover:bg-white disabled:opacity-30"><ChevronRight size={15} /></button>
                </span>
              ) : null}
            </div>
            <ul className={cn("max-h-[460px] overflow-auto", list.isFetching && "opacity-70")}>
              {data && !data.data.length ? <li className="p-4 text-[13px] text-[#8A93B8]">{L("No creator matches these filters.", "Tidak ada influencer yang cocok dengan filter ini.")}</li> : null}
              {data?.data.map((c) => {
                const on = items.some((i) => i.id === c.id);
                return (
                  <li key={c.id} className="border-t border-[#EEF0F6] first:border-0">
                    <div className={cn("flex items-center gap-3 px-3.5 py-2.5", on ? "bg-[#F3F5FF]" : "hover:bg-[#FAFBFE]")}>
                      <button type="button" onClick={() => toggle(c)} disabled={locked} aria-pressed={on} aria-label={on ? L(`Remove ${c.name}`, `Hapus ${c.name}`) : L(`Add ${c.name}`, `Tambah ${c.name}`)} className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px]", on ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-[#C9D0E0] bg-white")}>{on ? <Check size={13} strokeWidth={3} /> : null}</button>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EEF1FF] text-[13px] font-black text-[#3247D9]">{c.name.slice(0, 1).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <b className="truncate text-[14px] text-[#101334]">{c.name}</b>
                          <a href={c.link} target="_blank" rel="noreferrer" className="truncate text-[12px] font-semibold text-[#3247D9] hover:underline">@{c.handle}</a>
                        </span>
                        <span className="block truncate text-[12px] text-[#647099]">{c.platform} · {catLabel(c.category)}{c.city ? ` · ${c.city}` : ""}{c.campaigns ? ` · ${L(`${c.campaigns} campaigns`, `${c.campaigns} kampanye`)}` : ""}</span>
                        <FitTag c={c} />
                      </span>
                      <span className="hidden shrink-0 text-right sm:block">
                        <b className="block text-[13.5px] text-[#101334]">{compact(c.followers)}</b>
                        <small className="text-[11px] text-[#8A93B8]">{c.er != null ? `ER ${c.er}%` : "ER —"}</small>
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", TIER_CLS[c.tier])}>{c.tier === "Unknown" ? "?" : c.tier}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside className="rounded-[16px] bg-[#101334] p-4 text-white">
          <p className="text-[12px] font-bold text-[#A5B4FF]">{L("Your influencer plan", "Rencana influencer Anda")}</p>
          <div className="mt-1 flex items-end gap-4">
            <p className="text-[28px] font-black leading-none">{items.length} <span className="text-[14px] font-bold text-white/70">{L("creators", "influencer")}</span></p>
            <p className="pb-0.5 text-[13px] font-bold text-white/80">{compact(reach)} <span className="font-semibold text-white/55">followers</span></p>
          </div>
          {[[L("Tier", "Tier"), byTier], [L("Platform", "Platform"), byPlatform], [L("City", "Kota"), byCity.slice(0, 4)]].map(([label, rows]) => (rows as Array<[string, number]>).length ? (
            <div key={String(label)} className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50">{label as string}</p>
              <div className="mt-1 flex flex-wrap gap-1">{(rows as Array<[string, number]>).map(([k, n]) => <span key={k} className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold">{k} · {n}</span>)}</div>
            </div>
          ) : null)}
          <div className="mt-3 grid gap-1">
            {schedule.waves.map((w) => <p key={w.id} className="flex justify-between text-[12.5px]"><span className="text-white/75">{w.name}</span><b>{items.filter((i) => i.wave === w.id).length}</b></p>)}
          </div>
          {doc.quote && doc.quote.status !== "declined" ? (
            <div className="mt-4 rounded-[12px] bg-[#12A66A]/20 p-3 text-[13px]">
              <p className="flex items-center gap-1.5 font-black text-[#7BE0B3]"><CheckCircle2 size={15} /> {doc.quote.status === "accepted" ? L("Offer accepted", "Penawaran disetujui") : doc.quote.status === "quoted" ? L("Offer ready below", "Penawaran siap, lihat di bawah") : L("Quote requested", "Penawaran diminta")}</p>
              <p className="mt-1 text-white/80">{L(`${doc.quote.creators ?? items.length} creators, ${fmtWhen(doc.quote.requestedAt)}.`, `${doc.quote.creators ?? items.length} influencer, ${fmtWhen(doc.quote.requestedAt)}.`)}</p>
            </div>
          ) : res.canApprove ? (
            <>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} placeholder={L("Note: budget, exclusivity, usage rights (optional)", "Catatan: budget, eksklusivitas, hak pakai konten (opsional)")} className="mt-4 w-full resize-none rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/45 focus:border-[#A5B4FF]" />
              <button type="button" disabled={!items.length || quote.isPending} onClick={() => quote.mutate()} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] text-[14px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-50">
                <Send size={15} /> {quote.isPending ? L("Sending…", "Mengirim…") : L("Request a quote", "Minta penawaran")}
              </button>
              <p className="mt-2 text-[11.5px] text-white/55">{L("No charge until you agree to the price.", "Tidak ada biaya sampai Anda setuju dengan harganya.")}</p>
            </>
          ) : <p className="mt-4 text-[12.5px] text-white/70">{L("An owner or admin sends the quote request.", "Owner atau admin yang mengirim permintaan penawaran.")}</p>}
        </aside>
      </div>

      {items.length ? (
        <div className="mt-6">
          <p className="text-[15px] font-black text-[#101334]">{L("Posting calendar", "Kalender posting")}</p>
          <div className="mt-3 grid gap-3">
            {schedule.waves.map((w) => {
              const rows = items.filter((i) => i.wave === w.id).sort((a, b) => a.date.localeCompare(b.date));
              return (
                <div key={w.id} className="rounded-[14px] border border-[#E3E7F1]">
                  <p className="flex flex-wrap items-baseline justify-between gap-2 rounded-t-[14px] bg-[#F7F8FC] px-4 py-2.5">
                    <b className="text-[14px] text-[#101334]">{w.name}</b>
                    <span className="text-[12px] font-semibold text-[#5F6B94]">{dayLabel(w.start)} – {dayLabel(w.end)} · {L(`${rows.length} creators`, `${rows.length} influencer`)}</span>
                  </p>
                  {rows.length ? (
                    <ul>
                      {rows.map((i) => (
                        <li key={i.id} className="grid items-center gap-2 border-t border-[#EEF0F6] px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_150px_140px_150px_32px]">
                          <span className="min-w-0"><b className="block truncate text-[13.5px] text-[#101334]">{i.creator.name}</b><small className="block truncate text-[12px] text-[#647099]">@{i.creator.handle} · {i.creator.platform}{i.creator.city ? ` · ${i.creator.city}` : ""}</small></span>
                          <input type="date" aria-label={L("Posting date", "Tanggal posting")} value={i.date} min={w.start} max={w.end} disabled={locked} onChange={(e) => e.target.value && update(i.id, { date: e.target.value })} className={sel} />
                          <select aria-label={L("Format", "Format")} value={i.format} disabled={locked} onChange={(e) => update(i.id, { format: e.target.value as CampaignFormat })} className={sel}>
                            {res.formats.map((fm) => <option key={fm} value={fm}>{FORMAT_LABEL[fm]}</option>)}
                          </select>
                          <select aria-label={L("Wave", "Gelombang")} value={i.wave} disabled={locked} onChange={(e) => update(i.id, { wave: e.target.value })} className={sel}>
                            {schedule.waves.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                          </select>
                          {!locked ? <button type="button" onClick={() => commit(items.filter((x) => x.id !== i.id))} aria-label={L(`Remove ${i.creator.name}`, `Hapus ${i.creator.name}`)} className="grid size-8 place-items-center rounded-[8px] text-[#8A93B8] hover:bg-[#FDECEC] hover:text-[#B42318]"><Trash2 size={14} /></button> : <span />}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="border-t border-[#EEF0F6] px-4 py-3 text-[12.5px] text-[#8A93B8]">{L("No creator in this wave yet.", "Belum ada influencer di gelombang ini.")}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The influencer stage of an approved plan: the brief needs approval (approval-doc.tsx), then the schedule in waves,
 * the creators with a posting date and format each, and a quote request.
 */
export function InfluencerCampaignPanel({ planId, planApproved }: { planId: string; planApproved: boolean }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: [QK, planId] });
  const stage = useMemo(() => (r: InfluencerCampaign) => (r.quote && r.quote.status !== "declined" ? 4 : r.schedule ? 3 : 2), []);
  return (
    <ApprovalDocPanel
      id="influencer-campaign"
      planId={planId}
      planApproved={planApproved}
      icon={Users}
      queryKey={QK}
      load={getInfluencerCampaign}
      draft={draftInfluencerBrief}
      edit={editInfluencerBrief}
      review={reviewInfluencerBrief}
      stage={stage}
      editable={(r: InfluencerCampaign) => !r.quote || r.quote.status === "declined"}
      copy={{
        title: { en: "Influencer campaign", id: "Kampanye influencer" },
        subtitle: { en: "The brief needs an owner or admin's approval before influencers are chosen.", id: "Brief wajib disetujui owner atau admin sebelum memilih influencer." },
        locked: { en: "Approve the plan to brief influencers and schedule them.", id: "Setujui rencana ini untuk membuat brief dan menjadwalkan influencer." },
        emptyTitle: { en: "No brief yet", id: "Belum ada brief" },
        emptyDesc: { en: "Narriv writes the brief creators follow: objective, key messages, do's and don'ts, formats and hashtags.", id: "Narriv menulis brief untuk influencer: tujuan, pesan kunci, yang wajib dan dilarang, format, dan hashtag." },
        write: { en: "Write the brief with AI", id: "Tulis brief dengan AI" },
        approve: { en: "Approve brief", id: "Setujui brief" },
        draftDone: { en: "Brief ready. It now waits for approval.", id: "Brief siap dan menunggu persetujuan." },
        approvedDone: { en: "Brief approved. Set the schedule next.", id: "Brief disetujui. Lanjut atur jadwal." },
        notePlaceholder: { en: "e.g. More casual tone, no comparisons with competitors, add a story format", id: "mis. Nada lebih santai, jangan bandingkan dengan kompetitor, tambah format story" },
        steps: [{ en: "Brief", id: "Brief" }, { en: "Approval", id: "Persetujuan" }, { en: "Schedule", id: "Jadwal" }, { en: "Influencers", id: "Influencer" }, { en: "Quote", id: "Penawaran" }],
      }}
    >
      {(res: InfluencerCampaignResponse, r: InfluencerCampaign) => (
        <>
          <ScheduleEditor key={`s-${r.version}-${r.schedule ? JSON.stringify(r.schedule) : ""}`} planId={planId} doc={r} canEdit={res.canEdit} onSaved={refresh} />
          {r.schedule ? <CreatorPlanner key={`c-${r.version}-${JSON.stringify(r.schedule)}-${r.quote?.status ?? ""}`} planId={planId} res={res} doc={r} /> : null}
          {r.quote ? <FulfilmentPanel kind="influencer" planId={planId} title={r.title} quote={r.quote} delivery={res.delivery} impact={res.impact} canEdit={res.canEdit} canApprove={res.canApprove} queryKey={QK} /> : null}
        </>
      )}
    </ApprovalDocPanel>
  );
}
