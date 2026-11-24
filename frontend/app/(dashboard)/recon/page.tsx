"use client";

import { TermHint } from "@/components/ui/term-hint";
import { RichText } from "@/components/ui/rich-text";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileDown, Loader2, Search, UserSearch } from "lucide-react";
import { getReconHistory, runRecon, type ReconResult } from "@/lib/api-service";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

// Cek Influencer / Akun: a risk check on a KOL, ambassador, spokesperson or executive before working with them.
// Public coverage over a period is read against Indonesian risk lenses; the result prints as a PDF briefing.
const LEVEL: Record<string, { id: string; en: string; bg: string; chip: string }> = {
  critical: { id: "Kritis", en: "Critical", bg: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]" },
  high: { id: "Tinggi", en: "High", bg: "#F97316", chip: "bg-[#FFF1E6] text-[#C2410C]" },
  medium: { id: "Sedang", en: "Medium", bg: "#F59E0B", chip: "bg-[#FFF4E5] text-[#A04606]" },
  low: { id: "Rendah", en: "Low", bg: "#12A66A", chip: "bg-[#E5F6EE] text-[#047857]" },
  none: { id: "Aman", en: "Clear", bg: "#CBD2E1", chip: "bg-[#F1F4FA] text-[#5A6478]" },
};
const PERIODS = [[90, "3 bulan", "3 months"], [365, "1 tahun", "1 year"], [730, "2 tahun", "2 years"]] as const;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "");

function Report({ r }: { r: ReconResult }) {
  const L = useL();
  const lv = LEVEL[r.level];
  const flagged = r.lenses.filter((l) => l.hits);
  return (
    <section id="recon-report" className={cn(BOX, "grid gap-5")}>
      <div className="flex flex-wrap items-start gap-5">
        <div className="grid size-24 shrink-0 place-items-center rounded-[20px] border-[2px] border-[#101334] text-white" style={{ background: lv.bg }}>
          <div className="text-center leading-none"><p className="text-[34px] font-black">{r.score}</p><p className="mt-1 text-[11px] font-black uppercase">{L(lv.en, lv.id)}</p></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#465FFF]">{L("Profile risk check", "Cek risiko profil")}</p>
          <h2 className="mt-1 text-[24px] font-black leading-tight text-[#101334]">{r.subject}</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#5A6478]">{L(`${r.sources} public items · last ${Math.round(r.days / 30)} months · checked ${fmt(r.at)}`, `${r.sources} pemberitaan publik · ${Math.round(r.days / 30)} bulan terakhir · dicek ${fmt(r.at)}`)}</p>
          <div className="mt-2 flex gap-1.5">{r.platforms.map((p) => <PlatformIcon key={p} platform={p} className="size-5" />)}</div>
        </div>
        <button type="button" onClick={() => window.print()} className="no-print inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-4 text-[13px] font-black text-[#101334] shadow-[0_2px_0_#101334]"><FileDown size={15} /> {L("Save PDF", "Simpan PDF")}</button>
      </div>

      <div className="rounded-[16px] bg-[#F7F8FC] p-4">
        <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{L("Executive summary", "Ringkasan eksekutif")}</p>
        <RichText text={r.summary} className="mt-1.5 text-[14.5px] leading-relaxed text-[#101334]" />
        {r.recommendation ? <p className="mt-2 text-[14px] font-bold text-[#465FFF]">{r.recommendation}</p> : null}
      </div>

      <div>
        <p className="text-[13px] font-black text-[#101334]">{L("Risk matrix", "Matriks risiko")}</p>
        <div className="mt-2 overflow-hidden rounded-[14px] border border-[#E2E6F0]">
          {r.lenses.map((l, i) => {
            const c = LEVEL[l.level];
            return (
              <div key={l.key} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[220px_90px_1fr]", i && "border-t border-[#E2E6F0]", !l.hits && "opacity-60")}>
                <p className="text-[13.5px] font-bold text-[#101334]">{L(l.label.en, l.label.id)}</p>
                <span className={cn("justify-self-end rounded-full px-2.5 py-0.5 text-center text-[11.5px] font-black sm:justify-self-start", c.chip)}>{l.hits ? `${l.hits} · ${L(c.en, c.id)}` : L("Clear", "Aman")}</span>
                <div className="col-span-2 grid gap-0.5 sm:col-span-1">
                  {l.examples.slice(0, 2).map((e) => <a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="truncate text-[12.5px] text-[#3B52F5] hover:underline">{e.title}</a>)}
                </div>
              </div>
            );
          })}
        </div>
        {!flagged.length ? <p className="mt-2 text-[13px] text-[#047857]">{L("No risk lens was triggered by the public coverage found.", "Tidak ada kategori risiko yang tertandai dari pemberitaan publik yang ditemukan.")}</p> : null}
      </div>

      {r.recent.length ? (
        <div>
          <p className="text-[13px] font-black text-[#101334]">{L("Latest coverage", "Pemberitaan terbaru")}</p>
          <ul className="mt-2 grid gap-1.5">
            {r.recent.map((x) => (
              <li key={x.url} className="flex items-center gap-2 text-[13px]"><PlatformIcon platform={x.platform} className="size-4 shrink-0" /><a href={x.url} target="_blank" rel="noreferrer" className="truncate text-[#31406B] hover:underline">{x.title}</a><span className="shrink-0 text-[11.5px] text-[#8B93B0]">{x.source} {fmt(x.publishedAt)}</span></li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-[11.5px] text-[#8B93B0]">{L("Based on public coverage only; a flag is an indication to look closer, not a finding of wrongdoing.", "Berdasarkan pemberitaan publik saja; tanda risiko adalah indikasi untuk dicek lebih dalam, bukan kesimpulan kesalahan.")}</p>
    </section>
  );
}

export default function ReconPage() {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState(365);
  const [result, setResult] = useState<ReconResult | null>(null);
  const history = useQuery({ queryKey: ["recon-history"], queryFn: getReconHistory });
  const run = useMutation({
    meta: { silent: true },
    mutationFn: () => runRecon(subject.trim(), days),
    onSuccess: (r) => { setResult(r); void qc.invalidateQueries({ queryKey: ["recon-history"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Check failed.", "Pengecekan gagal.")),
  });
  return (
    <div className="mx-auto grid max-w-[1100px] gap-5">
      <style>{`@media print { body * { visibility: hidden } #recon-report, #recon-report * { visibility: visible } #recon-report { position: absolute; inset: 0; box-shadow: none; border: 0 } .no-print { display: none !important } }`}</style>
      <header className="no-print">
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[#101334] sm:text-[28px]">{L("Profile Check", "Cek Influencer & Akun")}<TermHint id="recon" className="ml-2" /></h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94]">{L("Before you sign a KOL, ambassador or spokesperson: their public record read for legal trouble, gambling and illegal lending promos, hate speech, hoaxes and controversy.", "Sebelum menggandeng KOL, brand ambassador, atau juru bicara: rekam jejak publiknya dibaca untuk masalah hukum, promosi judi online dan pinjol, ujaran kebencian, hoaks, dan kontroversi.")}</p>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); if (subject.trim().length >= 3) run.mutate(); }} className={cn(BOX, "no-print grid gap-3 sm:grid-cols-[1fr_auto_auto]")}>
        <label className="flex h-12 items-center gap-2 rounded-[12px] border-[1.5px] border-[#D8DDEB] bg-white px-3 focus-within:border-[#465FFF]">
          <UserSearch size={18} className="text-[#8B93B0]" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={L("Name or account, e.g. a creator or executive", "Nama atau akun, mis. kreator atau eksekutif")} className="h-full w-full bg-transparent text-[15px] font-semibold text-[#101334] outline-none" />
        </label>
        <div className="flex gap-1.5">{PERIODS.map(([d, id, en]) => <button key={d} type="button" onClick={() => setDays(d)} className={cn("h-12 rounded-[12px] px-3 text-[13px] font-black", days === d ? "bg-[#101334] text-white" : "bg-white text-[#101334] ring-1 ring-[#D8DDEB]")}>{L(en, id)}</button>)}</div>
        <button type="submit" disabled={run.isPending || subject.trim().length < 3} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white shadow-[0_3px_0_#101334] disabled:opacity-60">
          {run.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {L("Check", "Cek sekarang")}
        </button>
      </form>
      {run.isPending ? <p className={cn(BOX, "text-[14px] text-[#5A6478]")}>{L("Reading public coverage… this takes up to a minute.", "Membaca pemberitaan publik… paling lama satu menit.")}</p> : null}
      {result ? <Report r={result} /> : null}
      {(history.data?.data ?? []).length ? (
        <section className={cn(BOX, "no-print")}>
          <p className="text-[13px] font-black text-[#101334]">{L("Earlier checks", "Pengecekan sebelumnya")}</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {(history.data?.data ?? []).map((h) => (
              <li key={h.id}><button type="button" onClick={() => { setResult(h); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-[#F7F8FC] px-4 py-2.5 text-left hover:bg-[#EEF1FA]">
                <span className="truncate text-[13.5px] font-bold text-[#101334]">{h.subject}</span>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-black", LEVEL[h.level]?.chip)}>{h.score} · {L(LEVEL[h.level]?.en ?? "", LEVEL[h.level]?.id ?? "")}</span>
              </button></li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="no-print flex items-center gap-1 text-[12px] text-[#8B93B0]"><ExternalLink size={12} /> {L("Sources: Google News, Indonesian publisher feeds, YouTube and your stored records.", "Sumber: Google News, RSS media Indonesia, YouTube, dan catatan yang sudah tersimpan.")}</p>
    </div>
  );
}
