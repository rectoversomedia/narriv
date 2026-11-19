"use client";

import { useL } from "@/lib/use-l";

/**
 * The four layers of Narriv's intelligence, each with its own small live visual instead of a numbered icon:
 * mentions merging into issues, a network around a hub, a risk gauge, and an action plan getting done.
 * Dark surface (sits on the navy section). Animations are CSS only and stop for reduced motion.
 */

function NarrativeArt() {
  const dots = Array.from({ length: 18 }, (_, i) => i);
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      {dots.map((i) => {
        const x = 14 + (i % 6) * 14, y = 22 + Math.floor(i / 6) * 30;
        const c = ["#E5484D", "#12A66A", "#F59E0B"][i % 3];
        return <circle key={i} cx={x} cy={y} r={4.5} fill={c} className="nv4-drift" style={{ animationDelay: `${i * 90}ms` }} />;
      })}
      <path d="M100 60 H124" stroke="#A5B4FF" strokeWidth={2.5} strokeLinecap="round" markerEnd="url(#nv4a)" />
      <defs><marker id="nv4a" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#A5B4FF" /></marker></defs>
      {[["#E5484D", "Gangguan app", 26], ["#12A66A", "Program UMKM", 56], ["#F59E0B", "Cashback", 86]].map(([c, t, y]) => (
        <g key={t as string} className="nv4-pop">
          <rect x={130} y={(y as number) - 11} width={86} height={22} rx={11} fill="#fff" />
          <circle cx={141} cy={y as number} r={4} fill={c as string} />
          <text x={149} y={(y as number) + 3.5} fontSize={8.5} fontWeight={800} fill="#101334">{t as string}</text>
        </g>
      ))}
    </svg>
  );
}

function ActorArt() {
  const ring = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return [110 + Math.cos(a) * 44, 60 + Math.sin(a) * 38, i % 4 === 0] as const;
  });
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      {ring.map(([x, y], i) => <line key={`l${i}`} x1={110} y1={60} x2={x} y2={y} stroke="#8B5CF6" strokeOpacity={0.5} strokeWidth={1.4} className="nv4-pulse-line" style={{ animationDelay: `${i * 120}ms` }} />)}
      {ring.map(([x, y, bot], i) => <circle key={i} cx={x} cy={y} r={bot ? 6 : 4.5} fill="#8B5CF6" stroke={bot ? "#E5484D" : "#fff"} strokeWidth={bot ? 2.5 : 1.5} />)}
      <circle cx={110} cy={60} r={13} fill="#fff" className="nv4-throb" />
      <text x={110} y={64} textAnchor="middle" fontSize={11} fontWeight={900} fill="#101334">@</text>
      <text x={196} y={22} textAnchor="end" fontSize={8} fontWeight={800} fill="#FFB4B6">● indikasi bot</text>
    </svg>
  );
}

function ThreatArt() {
  const r = 40, c = Math.PI * r;
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <path d={`M${110 - r} 92 A${r} ${r} 0 0 1 ${110 + r} 92`} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={12} strokeLinecap="round" />
      <path d={`M${110 - r} 92 A${r} ${r} 0 0 1 ${110 + r} 92`} fill="none" stroke="url(#nv4g)" strokeWidth={12} strokeLinecap="round" strokeDasharray={`${0.94 * c} ${c}`} className="nv4-gauge" style={{ ["--len" as string]: `${0.94 * c}` }} />
      <defs><linearGradient id="nv4g" x1="0" x2="1"><stop offset="0" stopColor="#F59E0B" /><stop offset="1" stopColor="#E5484D" /></linearGradient></defs>
      <text x={110} y={86} textAnchor="middle" fontSize={26} fontWeight={900} fill="#fff">94</text>
      <rect x={86} y={98} width={48} height={15} rx={7.5} fill="#E5484D" />
      <text x={110} y={108.5} textAnchor="middle" fontSize={8.5} fontWeight={900} fill="#fff">KRITIS</text>
      <g className="nv4-pop"><rect x={150} y={14} width={64} height={18} rx={9} fill="#FDECEC" /><text x={182} y={26} textAnchor="middle" fontSize={8} fontWeight={900} fill="#B42318">HOAKS ✕</text></g>
    </svg>
  );
}

function ImpactArt() {
  const rows = ["Pernyataan sementara", "Verifikasi klaim", "Brief juru bicara"];
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" aria-hidden>
      <rect x={20} y={10} width={180} height={100} rx={12} fill="#fff" />
      <text x={34} y={30} fontSize={9} fontWeight={900} fill="#101334">Rencana aksi · siap</text>
      {rows.map((t, i) => (
        <g key={t} className="nv4-check" style={{ animationDelay: `${300 + i * 380}ms` }}>
          <rect x={34} y={42 + i * 20} width={12} height={12} rx={3} fill="#12A66A" />
          <path d={`M37 ${48 + i * 20} l3 3 l5 -6`} stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
          <text x={54} y={51.5 + i * 20} fontSize={9} fontWeight={700} fill="#31406B">{t}</text>
        </g>
      ))}
      <rect x={150} y={20} width={40} height={16} rx={8} fill="#E5F6EE" />
      <text x={170} y={31} textAnchor="middle" fontSize={8} fontWeight={900} fill="#047857">AI ✓</text>
    </svg>
  );
}

export function FourLayers() {
  const L = useL();
  const layers = [
    { c: "#A5B4FF", t: L("Narrative", "Narrative"), big: L("Hundreds of stories, a few issues.", "Ratusan berita jadi beberapa isu."), d: L("Grouped by meaning, with framing, journey and escalation.", "Dikelompokkan per makna, lengkap dengan sudut pandang, perjalanan, dan eskalasi."), Art: NarrativeArt },
    { c: "#C4B5FD", t: L("Actor", "Actor"), big: L("See who is driving it.", "Lihat siapa yang menggerakkan."), d: L("Camps, influential accounts and where the story started.", "Kubu, akun paling berpengaruh, dan asal cerita."), Art: ActorArt },
    { c: "#FFB4B6", t: L("Threat", "Threat"), big: L("Know how dangerous, in one number.", "Tahu seberapa bahaya, dalam satu angka."), d: L("Risk score 0–100, bot signs, hoax claim check, attack alerts.", "Skor risiko 0–100, indikasi bot, cek klaim hoaks, peringatan serangan."), Art: ThreatArt },
    { c: "#86EFAC", t: L("Impact", "Impact"), big: L("Act before it spreads.", "Bertindak sebelum menyebar."), d: L("Action plans, opportunities, AI answers and board reports.", "Rencana aksi, peluang, Jawaban AI, dan laporan direksi."), Art: ImpactArt },
  ];
  return (
    <>
      <style>{`
        @keyframes nv4-drift { 0%,100% { transform: translateX(0) } 50% { transform: translateX(3px) } }
        @keyframes nv4-pop { 0% { opacity: 0; transform: translateY(4px) } 100% { opacity: 1; transform: none } }
        @keyframes nv4-pulse { 0%,100% { stroke-opacity: .25 } 50% { stroke-opacity: .8 } }
        @keyframes nv4-throb { 0%,100% { r: 13px } 50% { r: 15px } }
        @keyframes nv4-gauge { from { stroke-dasharray: 0 999 } }
        @keyframes nv4-check { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: none } }
        .nv4-drift { animation: nv4-drift 3s ease-in-out infinite; }
        .nv4-pop { animation: nv4-pop .8s ease-out .4s both; }
        .nv4-pulse-line { animation: nv4-pulse 2.4s ease-in-out infinite; }
        .nv4-throb { animation: nv4-throb 2s ease-in-out infinite; }
        .nv4-gauge { animation: nv4-gauge 1.6s cubic-bezier(.4,0,.2,1) both; }
        .nv4-check { animation: nv4-check .6s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .nv4-drift,.nv4-pop,.nv4-pulse-line,.nv4-throb,.nv4-gauge,.nv4-check { animation: none } }
      `}</style>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {layers.map(({ c, t, big, d, Art }) => (
          <li key={t} className="group flex flex-col overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.05] transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]">
            <div className="h-[132px] border-b border-white/10 bg-[#070A1F]/60 px-3 py-2"><Art /></div>
            <div className="flex flex-1 flex-col p-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: c }}>{t} Intelligence</p>
              <p className="mt-2 text-[19px] font-black leading-snug text-white">{big}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">{d}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
