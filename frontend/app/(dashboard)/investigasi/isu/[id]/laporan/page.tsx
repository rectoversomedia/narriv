"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { getInvestigationStory, type InvStoryDetail } from "@/lib/api/investigations";
import { PLATFORM, fmtDate, fmtDelay, fmtWhen } from "@/components/investigation/ui";
import { cveCategory } from "@/lib/cve";
import { Skeleton } from "@/components/ui/Skeleton";
import { useL } from "@/lib/use-l";

// One-story brief for an agency (BNPT, Komdigi, the police or a ministry): origin, spread, coordination signs,
// key accounts, recommendation and the evidence log, printable as PDF from the browser. Indonesian only: it is
// written for Indonesian agencies.
const RECIPIENTS = ["BNPT", "Kementerian Komunikasi dan Digital (Komdigi)", "Kepolisian Negara Republik Indonesia", "Kementerian/Lembaga terkait"];

const ADVICE: Record<string, string[]> = {
  incitement: ["Teruskan segera ke Kepolisian setempat: ada seruan kekerasan dengan lokasi yang disebut.", "Ajukan penurunan konten ke platform melalui Komdigi.", "Pantau 24 jam ke depan apakah seruan menyebar ke wilayah lain."],
  recruitment: ["Teruskan pola ajakan dan penggalangan dana ke BNPT dan PPATK.", "Ajukan penurunan konten dan pemblokiran rekening yang dicantumkan.", "Siapkan kontra-narasi dari mantan napiter untuk audiens muda."],
  propaganda: ["Teruskan ke BNPT untuk telaah lanjutan.", "Ajukan penurunan konten glorifikasi kekerasan ke platform.", "Perkuat cerita korban dan kesaksian mantan pelaku."],
  delegitimization: ["Pisahkan dengan tegas dari kritik kebijakan yang sah.", "Laporkan akun dengan indikasi kuat otomatis ke platform sebagai perilaku tidak autentik terkoordinasi.", "Perkuat suara tokoh agama dan masyarakat di wilayah sebaran utama."],
  dehumanization: ["Teruskan ke Kepolisian bila ada ancaman terhadap kelompok tertentu.", "Libatkan tokoh lintas agama dan pemerintah daerah di wilayah sebaran.", "Ajukan penurunan konten yang menyerukan kekerasan."],
  misinformation: ["Minta klarifikasi resmi dari instansi berwenang dan sebarkan secepatnya.", "Laporkan hoaks ke Komdigi dan platform.", "Laporkan klaster akun baru yang menyebar serentak sebagai operasi tidak autentik."],
  none: ["Bukan ancaman: jangan eskalasi warga yang menyampaikan kritik.", "Pantau hanya apakah tagar dibajak akun terkoordinasi atau dipakai menyebar hoaks."],
  counter_narrative: ["Kontra-narasi: perkuat jangkauannya, bukan untuk dieskalasi."],
};

function summary(d: InvStoryDetail) {
  const o = d.origin;
  const firstAmp = d.amplifiers[0];
  const main = d.groups.find((g) => g.id);
  const parts = [
    `Isu "${d.story.title}" pertama tercatat pada ${fmtWhen(o.at)} dari akun ${o.handle} (${PLATFORM[o.platform] ?? o.platform}) di ${o.city ?? o.province ?? "lokasi tidak diketahui"}.`,
    firstAmp ? `Dalam ${fmtDelay(firstAmp.delayMinutes, (_en: string, id: string) => id).replace("+", "")} isu ini mulai dikuatkan oleh ${d.amplifiers.length} akun penguat.` : "",
    `Hingga ${fmtDate(d.lastAt)} tercatat ${d.posts} unggahan dari ${d.accounts} akun di ${d.cities.length} kota.`,
    d.story.legitimate ? "" : `${d.automatedShare}% unggahan berasal dari akun dengan indikasi kuat otomatis, dan ditemukan ${d.bursts.length} lonjakan unggahan serentak (teks sama dari banyak akun dalam hitungan menit).`,
    main ? `Kelompok yang paling dominan: ${main.label} (${main.share}% unggahan).` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export default function AgencyReportPage() {
  const L = useL();
  const { id } = useParams<{ id: string }>();
  const [to, setTo] = useState(RECIPIENTS[0]);
  const { data, isLoading } = useQuery({ queryKey: ["investigation-story", id], queryFn: () => getInvestigationStory(id), staleTime: 60_000 });
  if (isLoading || !data) return <Skeleton className="h-[600px] w-full" />;

  const cat = cveCategory(data.story.category);
  const advice = ADVICE[data.story.category ?? "none"] ?? ADVICE.none;
  const no = `NRV/INV/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${id.slice(0, 4).toUpperCase()}`;
  const th = "border border-[#C9D0E4] bg-[#F4F6FB] px-2 py-1.5 text-left font-bold";
  const td = "border border-[#C9D0E4] px-2 py-1.5 align-top";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/investigasi/isu/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#5F6B94] hover:text-[#101334]"><ArrowLeft className="h-4 w-4" />{L("Back to the story", "Kembali ke isu")}</Link>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[13px] font-bold text-[#4A5578]">{L("Addressed to", "Ditujukan ke")}</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[10px] border-[1.5px] border-[#DCE2EF] bg-white px-3 py-2 text-[13px] font-bold text-[#101334]">
            {RECIPIENTS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-[#101334] px-4 py-2 text-[13.5px] font-bold text-white"><Printer className="h-4 w-4" />{L("Print / save PDF", "Cetak / simpan PDF")}</button>
        </div>
      </div>

      <article className="print-area mx-auto max-w-[860px] bg-white p-8 text-[12.5px] leading-relaxed text-[#101334] shadow-[0_0_0_1.5px_#101334,0_4px_0_#101334] print:max-w-none print:p-0 print:shadow-none sm:p-12">
        <div className="flex items-start justify-between border-b-2 border-[#101334] pb-3">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] text-[#B42318]">TERBATAS</p>
            <h1 className="mt-1 text-[22px] font-black">Laporan Telaah Isu</h1>
            <p className="text-[12px] text-[#4A5578]">Nomor {no} · {fmtDate(new Date().toISOString())}</p>
          </div>
          <div className="text-right text-[12px]">
            <p className="font-bold">Kepada: {to}</p>
            <p className="text-[#4A5578]">Disusun dengan Narriv</p>
          </div>
        </div>

        <h2 className="mt-5 text-[14px] font-black">1. Ringkasan</h2>
        <p className="mt-1 font-bold">{data.story.title}</p>
        <p className="mt-0.5 text-[#4A5578]">Kategori: {data.story.category === "none" ? "Bukan ancaman (kritik/pemberitaan)" : cat?.label[1] ?? "–"} · Periode: {fmtDate(data.firstAt)} – {fmtDate(data.lastAt)}</p>
        <p className="mt-2">{summary(data)}</p>

        <h2 className="mt-5 text-[14px] font-black">2. Asal isu dan penguat awal</h2>
        <table className="mt-2 w-full border-collapse text-[11.5px]">
          <thead><tr><th className={th}>Urutan</th><th className={th}>Akun</th><th className={th}>Platform</th><th className={th}>Lokasi</th><th className={th}>Waktu</th><th className={th}>Indikasi otomatis</th></tr></thead>
          <tbody>
            <tr><td className={td}>Awal</td><td className={td}>{data.origin.handle}</td><td className={td}>{PLATFORM[data.origin.platform] ?? data.origin.platform}</td><td className={td}>{data.origin.city ?? data.origin.province ?? "–"}</td><td className={td}>{fmtWhen(data.origin.at)}</td><td className={td}>{data.origin.account ? `${data.origin.account.automation.score}/100` : "–"}</td></tr>
            {data.amplifiers.map((a, i) => <tr key={a.id}><td className={td}>Penguat {i + 1} ({fmtDelay(a.delayMinutes, (_en: string, idn: string) => idn)})</td><td className={td}>{a.handle}</td><td className={td}>{PLATFORM[a.platform] ?? a.platform}</td><td className={td}>{a.city ?? "–"}</td><td className={td}>{fmtWhen(new Date(Date.parse(data.origin.at) + a.delayMinutes * 60000).toISOString())}</td><td className={td}>{a.automation.score}/100</td></tr>)}
          </tbody>
        </table>
        <p className="mt-1.5 text-[11px] text-[#4A5578]">Isi unggahan awal: “{data.origin.title}”{data.origin.archiveId ? ` (arsip ${data.origin.archiveId})` : ""}</p>

        <h2 className="mt-5 text-[14px] font-black">3. Sebaran wilayah</h2>
        <table className="mt-2 w-full border-collapse text-[11.5px]">
          <thead><tr><th className={th}>No</th><th className={th}>Kota/Kabupaten</th><th className={th}>Provinsi</th><th className={th}>Pertama muncul</th><th className={th}>Unggahan</th></tr></thead>
          <tbody>{data.cities.slice(0, 12).map((c, i) => <tr key={c.city}><td className={td}>{i + 1}</td><td className={td}>{c.city}{c.claimed ? " (lokasi klaim)" : ""}</td><td className={td}>{c.province ?? "–"}</td><td className={td}>{fmtWhen(c.firstAt)}</td><td className={td}>{c.posts}</td></tr>)}</tbody>
        </table>
        <p className="mt-1.5 text-[11px] text-[#4A5578]">Jalur platform: {data.platforms.map((p, i) => `${PLATFORM[p.platform] ?? p.platform}${i ? ` (${fmtDelay(p.delayMinutes, (_en: string, idn: string) => idn)})` : ""}`).join(" → ")}</p>

        <h2 className="mt-5 text-[14px] font-black">4. Indikasi koordinasi dan akun otomatis</h2>
        {data.bursts.length ? (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {data.bursts.map((b, i) => <li key={i}>{fmtWhen(b.firstAt)}: {b.accounts.length} akun memposting teks yang sama dalam {b.spanMinutes} menit. Akun: {b.accounts.slice(0, 10).join(", ")}{b.accounts.length > 10 ? `, +${b.accounts.length - 10}` : ""}.</li>)}
          </ul>
        ) : <p className="mt-1">Tidak ditemukan lonjakan serentak.</p>}
        <p className="mt-1">Porsi unggahan dari akun dengan indikasi kuat otomatis: <b>{data.automatedShare}%</b>.</p>
        {data.groups.some((g) => g.id) ? <p className="mt-1">Kelompok yang terlibat: {data.groups.filter((g) => g.id).map((g) => `${g.label} (${g.share}%)`).join(", ")}; akun tidak terafiliasi {data.groups.find((g) => !g.id)?.share ?? 0}%.</p> : null}

        <h2 className="mt-5 text-[14px] font-black">5. Akun kunci</h2>
        <table className="mt-2 w-full border-collapse text-[11.5px]">
          <thead><tr><th className={th}>Akun</th><th className={th}>Kelompok</th><th className={th}>Lokasi</th><th className={th}>Unggahan</th><th className={th}>Indikasi otomatis</th><th className={th}>Pernah dieskalasi</th></tr></thead>
          <tbody>{data.keyAccounts.slice(0, 10).map((a) => <tr key={a.id}><td className={td}>{a.handle} ({PLATFORM[a.platform] ?? a.platform})</td><td className={td}>{data.groups.find((g) => g.id === a.group)?.label ?? (a.group ? a.group : "Tidak terafiliasi")}</td><td className={td}>{a.city ?? "–"}</td><td className={td}>{a.posts}</td><td className={td}>{a.automation.score}/100</td><td className={td}>{a.escalations || "–"}</td></tr>)}</tbody>
        </table>

        <h2 className="mt-5 text-[14px] font-black">6. Rekomendasi</h2>
        <ol className="mt-1 list-decimal space-y-1 pl-5">{advice.map((a) => <li key={a}>{a}</li>)}</ol>

        <h2 className="mt-5 text-[14px] font-black">7. Lampiran: catatan bukti</h2>
        <table className="mt-2 w-full border-collapse text-[10.5px]">
          <thead><tr><th className={th}>Waktu</th><th className={th}>Akun</th><th className={th}>Lokasi</th><th className={th}>Isi</th><th className={th}>Arsip</th></tr></thead>
          <tbody>{data.evidence.slice(0, 25).map((e) => <tr key={e.id}><td className={td}>{fmtWhen(e.at)}</td><td className={td}>{e.account}</td><td className={td}>{e.city ?? e.province ?? "–"}</td><td className={td}>{e.title}</td><td className={td}>{e.archiveId ?? "–"}</td></tr>)}</tbody>
        </table>

        <div className="mt-6 border-t border-[#C9D0E4] pt-3 text-[10.5px] text-[#4A5578]">
          <p className="font-bold text-[#101334]">Metodologi dan batasan</p>
          <p>Data berasal dari unggahan publik yang dikumpulkan Narriv. “Asal isu” adalah catatan paling awal yang dimiliki Narriv, bukan bukti siapa yang pertama memposting. Skor indikasi otomatis (0–100) menjumlahkan tanda yang dapat diamati (umur akun, rasio pengikut, foto profil bawaan, teks sama dengan akun lain dalam hitungan menit, laju dan jam unggahan); akun asli dapat menunjukkan sebagian tanda. Afiliasi menunjukkan akun yang saling me-repost atau memposting teks sama bersamaan, bukan keanggotaan organisasi. Lokasi bertanda “klaim” berasal dari profil akun dan belum terverifikasi. Seluruh temuan adalah indikasi yang perlu diverifikasi sebelum tindakan hukum.</p>
        </div>
      </article>
    </div>
  );
}
