"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowRight, Loader2, X } from "lucide-react";
import { startDemoLogin, type DemoScenario } from "@/components/auth/auth-shell";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/**
 * Before a demo opens, the visitor picks the case closest to their own: a brand, a city government or preventing
 * violent extremism. Each is a full, read-only workspace of fictional data (backend modules/demo).
 */
/** Each case has an illustration (public/brand/demo-*-v2.webp) with the Narriv orb at its centre. */
const SCENARIOS: Array<{ key: DemoScenario; image: string; title: [string, string]; who: [string, string]; body: [string, string]; tone: string; accent: string }> = [
  {
    key: "brand",
    image: "/brand/demo-brand-v2.webp",
    title: ["Brand & Company", "Brand & Perusahaan"],
    who: ["Bank Arunika · Fictional", "Bank Arunika · Fiktif"],
    body: ["An app outage, a data-leak rumour and a positive SME programme: crisis, sentiment and competitors.", "Gangguan aplikasi, isu kebocoran data, dan program UMKM positif: krisis, sentimen, dan kompetitor."],
    tone: "from-[#465FFF] to-[#7B4FE0] shadow-[0_12px_28px_rgba(70,95,255,0.35)]",
    accent: "#465FFF",
  },
  {
    key: "gov",
    image: "/brand/demo-gov-v2.webp",
    title: ["Government", "Pemerintahan"],
    who: ["Lestari City Government · Fictional", "Pemkot Lestari · Fiktif"],
    body: ["A social-aid hoax, tidal flooding and a well-received scholarship: public services and citizen sentiment.", "Hoaks bansos, banjir rob, dan beasiswa yang diapresiasi: layanan publik dan suara warga."],
    tone: "from-[#0284C7] to-[#465FFF] shadow-[0_12px_28px_rgba(2,132,199,0.35)]",
    accent: "#0284C7",
  },
  {
    key: "cve",
    image: "/brand/demo-cve-v2.webp",
    title: ["Countering Extremism", "Pencegahan Ekstremisme"],
    who: ["Simpul Damai · Fictional", "Simpul Damai · Fiktif"],
    body: ["'Thogut government' narratives, praise for bombers, recruitment and counter-narratives by province, with accounts hidden.", "Narasi 'pemerintah thogut', glorifikasi pelaku teror, perekrutan, dan kontra-narasi per provinsi, dengan identitas akun disamarkan."],
    tone: "from-[#C026D3] to-[#7B4FE0] shadow-[0_12px_28px_rgba(192,38,211,0.35)]",
    accent: "#C026D3",
  },
];

export function DemoPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const L = useL();
  const [loading, setLoading] = useState<DemoScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onClose]);

  if (!open || typeof document === "undefined") return null;

  async function choose(key: DemoScenario) {
    setLoading(key);
    setError(null);
    try {
      await startDemoLogin(key);
    } catch {
      setError(L("The demo could not open. Try again.", "Demo gagal dibuka. Coba lagi."));
      setLoading(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[330] flex items-end justify-center bg-[#070A1F]/75 p-0 backdrop-blur-md sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="demo-picker-title" className="nv-paper mk-pop relative max-h-[94dvh] w-full max-w-[1060px] overflow-y-auto rounded-t-[28px] border-[1.5px] border-[#101334] px-5 pb-6 pt-8 text-center text-[#101334] shadow-[0_8px_0_#465FFF,0_40px_120px_rgba(0,0,0,0.5)] sm:rounded-[28px] sm:px-8 sm:pb-8 sm:pt-10">
        <button type="button" onClick={onClose} disabled={Boolean(loading)} aria-label={L("Close", "Tutup")} className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border-[1.5px] border-[#101334] bg-white text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#EEF1FF] disabled:opacity-50 sm:right-5 sm:top-5">
          <X size={18} aria-hidden="true" />
        </button>

        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#5F6B94]">{L("Live Demo · No Sign-Up", "Demo Langsung · Tanpa Daftar")}</p>
        <h2 id="demo-picker-title" className="mx-auto mt-3 max-w-2xl text-balance text-[28px] font-black leading-[1.15] tracking-[-0.03em] sm:text-[38px]">{L("Which Case Is ", "Kasus Mana yang ")}<span className="mk-brush">{L("Closest to Yours?", "Paling Mirip?")}</span></h2>
        <p className="mx-auto mt-2 max-w-lg text-balance text-[14px] font-medium leading-relaxed text-[#5B6070] sm:text-[15px]">{L("Each opens the full Narriv app with fictional data. No sign-up needed.", "Masing-masing membuka aplikasi Narriv lengkap dengan data fiktif. Tanpa perlu mendaftar.")}</p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              type="button"
              disabled={Boolean(loading)}
              onClick={() => choose(s.key)}
              className={cn(
                "group flex flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#101334] bg-white text-center shadow-[0_5px_0_#101334] transition duration-200 hover:-translate-y-1 hover:shadow-[0_9px_0_#465FFF] disabled:hover:translate-y-0",
                loading && loading !== s.key && "opacity-50",
              )}
            >
              <span className="relative block aspect-[600/340] w-full overflow-hidden border-b-[1.5px] border-[#101334]">
                <Image src={s.image} alt="" fill sizes="(min-width: 768px) 340px, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                <span aria-hidden="true" className="absolute bottom-3 left-3 rounded-[8px] border-[1.5px] border-[#101334] bg-white px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#101334]">0{SCENARIOS.indexOf(s) + 1}</span>
              </span>
              <span className="flex flex-1 flex-col items-center px-5 pb-5 pt-5">
                <span className="max-w-full truncate whitespace-nowrap text-[18px] font-black leading-tight md:text-[15.5px] lg:text-[18px] xl:text-[19px]">{L(s.title[0], s.title[1])}</span>
                <span className="mt-1.5 rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold" style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 12%, white)`, color: s.accent }}>{L(s.who[0], s.who[1])}</span>
                <span className="mt-3 flex-1 text-balance text-[14px] font-medium leading-relaxed text-[#31406B]">{L(s.body[0], s.body[1])}</span>
                <span className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] text-[14px] font-black text-white shadow-[0_3px_0_#101334] transition group-hover:brightness-110" style={{ backgroundColor: s.accent }}>
                  {loading === s.key ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                  {loading === s.key ? L("Opening…", "Membuka…") : L("Open This Demo", "Buka Demo Ini")}
                  {loading === s.key ? null : <ArrowRight size={16} aria-hidden="true" className="transition group-hover:translate-x-0.5" />}
                </span>
              </span>
            </button>
          ))}
        </div>
        {error ? <p role="alert" className="mt-4 text-[13px] font-semibold text-[#B42318]">{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
