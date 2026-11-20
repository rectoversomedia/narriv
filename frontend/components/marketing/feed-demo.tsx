"use client";

import { useEffect, useState } from "react";
import { useL } from "@/lib/use-l";

/**
 * A clickable Feed Narasi on the landing page (sample data, Bank Arunika is fictional): issues on the left, the chosen
 * one on the right with its four danger bars, its signs and the next step. Cycles on its own until someone clicks.
 */
type Item = { t: [string, string]; tag: [string, string]; score: number; bars: [number, number, number, number]; signs: Array<[string, string]>; text: [string, string]; step: [string, string] };
const ITEMS: Item[] = [
  { t: ["Customer data-leak claim", "Isu kebocoran data nasabah"], tag: ["Banking", "Perbankan"], score: 94, bars: [92, 78, 34, 88], signs: [["Bot-like", "Indikasi bot"], ["Hoax", "Hoaks"], ["Spike", "Lonjakan"]], text: ["A screenshot of “leaked customer data” spread from one forum post to X and TikTok in 36 hours. Two clusters of new accounts posted the same text.", "Tangkapan layar “data nasabah bocor” menyebar dari satu unggahan forum ke X dan TikTok dalam 36 jam. Dua kelompok akun baru mengunggah teks yang sama."], step: ["Holding statement on owned channels today; report the coordinated accounts.", "Pernyataan sementara di kanal resmi hari ini; laporkan akun terkoordinasi."] },
  { t: ["Mobile app outage at peak hours", "Gangguan aplikasi di jam sibuk"], tag: ["Service", "Layanan"], score: 63, bars: [58, 40, 52, 46], signs: [["Toxic", "Toksik"], ["Hoax", "Hoaks"]], text: ["Payday login failures; complaints are real and organic. One claim that balances are “lost for good” is false.", "Gagal login saat gajian; keluhannya nyata dan organik. Klaim saldo “hilang permanen” keliru."], step: ["Post an outage status on X and Instagram every 2 hours.", "Unggah status gangguan di X dan Instagram setiap 2 jam."] },
  { t: ["Higher transfer fees", "Kenaikan biaya transfer"], tag: ["Pricing", "Harga"], score: 42, bars: [38, 8, 20, 30], signs: [["Polarized", "Terpolarisasi"]], text: ["Customers are split: some accept the new fee, others call for moving banks.", "Nasabah terbelah: sebagian menerima biaya baru, sebagian mengajak pindah bank."], step: ["Publish a simple fee FAQ with the free options.", "Terbitkan FAQ biaya sederhana beserta opsi gratisnya."] },
];
const BARS: Array<[string, string, string]> = [["Risk", "Risiko", "#E5484D"], ["Bot-like", "Indikasi bot", "#8B5CF6"], ["Toxicity", "Toksisitas", "#F59E0B"], ["Anomalous", "Anomali", "#465FFF"]];

export function FeedDemo() {
  const L = useL();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setI((x) => (x + 1) % ITEMS.length), 4500);
    return () => clearInterval(t);
  }, [auto]);
  const it = ITEMS[i];
  return (
    <div className="mt-10 overflow-hidden rounded-[24px] border border-white/15 bg-[#070A1F]/70 text-left">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-white">Feed <span className="text-[#A5B4FF]">Narasi</span></p>
        <span className="text-[11px] font-semibold text-white/45">{L("Sample data · Bank Arunika (fictional)", "Data contoh · Bank Arunika (fiktif)")}</span>
      </div>
      <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ul className="border-b border-white/10 md:border-b-0 md:border-r">
          {ITEMS.map((x, k) => (
            <li key={x.t[0]}>
              <button type="button" onClick={() => { setI(k); setAuto(false); }} className={`flex w-full items-center gap-3 border-l-[3px] px-5 py-4 text-left transition ${k === i ? "border-[#A5B4FF] bg-white/[0.07]" : "border-transparent hover:bg-white/[0.04]"}`}>
                <span className="size-2 shrink-0 rounded-full" style={{ background: x.score >= 70 ? "#E5484D" : x.score >= 50 ? "#F97316" : "#F59E0B" }} />
                <span className={`min-w-0 flex-1 text-[14.5px] font-bold leading-snug ${k === i ? "text-white" : "text-white/70"}`}>{L(x.t[0], x.t[1])}</span>
                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/70">{L(x.tag[0], x.tag[1])}</span>
              </button>
            </li>
          ))}
        </ul>
        <div key={i} className="nvf-in p-5 sm:p-6">
          <style>{`@keyframes nvf-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.nvf-in{animation:nvf-in .45s ease-out both}@keyframes nvf-bar{from{width:0}}.nvf-bar{animation:nvf-bar .9s cubic-bezier(.4,0,.2,1) both}@media (prefers-reduced-motion: reduce){.nvf-in,.nvf-bar{animation:none}}`}</style>
          <p className="flex items-center gap-2 text-[11.5px] font-black uppercase tracking-[0.12em]" style={{ color: it.score >= 70 ? "#FF8A8D" : "#FDBA74" }}><span className="size-2 rounded-full bg-current" />{it.score >= 70 ? L("High-priority narrative", "Narasi prioritas tinggi") : L("Watch", "Pantau")} · {it.score}/100</p>
          <p className="mt-2 text-[22px] font-black leading-tight text-white">{L(it.t[0], it.t[1])}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            {BARS.map(([en, id, c], k) => (
              <div key={en}>
                <p className="text-[11px] font-bold text-white/55">{L(en, id)}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="nvf-bar h-full rounded-full" style={{ width: `${it.bars[k]}%`, background: c, animationDelay: `${k * 90}ms` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">{it.signs.map(([en, id]) => <span key={en} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11.5px] font-black text-white">{L(en, id)}</span>)}</div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/75">{L(it.text[0], it.text[1])}</p>
          <p className="mt-3 rounded-[12px] bg-[#12A66A]/15 px-3 py-2 text-[13.5px] font-semibold text-[#86EFAC]"><b>{L("Next step", "Langkah")}:</b> {L(it.step[0], it.step[1])}</p>
        </div>
      </div>
    </div>
  );
}
