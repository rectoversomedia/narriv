"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import { onDemoBlocked } from "@/lib/demo-blocked";
import { useL } from "@/lib/use-l";

/**
 * Shown when a visitor tries to change something in the read-only demo: says plainly that nothing is saved here
 * and offers the trial, where the same button works. Opens once per attempt; Escape or the backdrop closes it.
 */
export function DemoBlockedNotice() {
  const L = useL();
  const [open, setOpen] = useState(false);

  useEffect(() => onDemoBlocked(() => setOpen(true)), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[320] flex items-end justify-center bg-[#0B0F2A]/45 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="demo-blocked-title" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[420px] rounded-[22px] bg-white p-6 text-center shadow-[0_30px_80px_rgba(11,15,42,0.35)]">
        <button type="button" onClick={() => setOpen(false)} aria-label={L("Close", "Tutup")} className="absolute right-3 top-3 rounded-full p-1.5 text-[#5F6B94] hover:bg-[#F1F3F8]">
          <X size={16} aria-hidden="true" />
        </button>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#EEF1FF] text-[#465FFF]">
          <Eye size={22} aria-hidden="true" />
        </span>
        <h2 id="demo-blocked-title" className="mt-4 text-[19px] font-black text-[#101334]">{L("This is the demo", "Ini mode demo")}</h2>
        <p className="mt-2 text-[14px] font-medium leading-6 text-[#5F6B94]">
          {L(
            "Everything here can be explored, but changes are not saved, so the sample data stays the same for every visitor. In your own workspace this button works.",
            "Semua bisa dilihat dan dicoba, tapi perubahan tidak disimpan supaya data contohnya tetap sama untuk semua pengunjung. Di workspace Anda sendiri, tombol ini berfungsi.",
          )}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Link href="/signup" className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#465FFF] px-4 text-[14px] font-bold text-white hover:bg-[#3B52F5]">
            {L("Start a 14-day trial", "Mulai uji coba 14 hari")}
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#F1F3F8] px-4 text-[14px] font-bold text-[#31406B] hover:bg-[#E6EAF2]">
            {L("Keep exploring", "Lanjut lihat-lihat")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
