"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share, SquarePlus, Trash2 } from "lucide-react";
import { APP_ORIGIN, onMarketingHost } from "@/lib/hosts";
import { useL } from "@/lib/use-l";

/**
 * The app is installed from app.narriv.digital. On iPhone a home-screen icon belongs to the site it was added from,
 * and any other site (here: the app, after Sign In) opens with Safari's bars. An icon added from the website
 * therefore opens on this screen, which explains how to add the real app.
 */
export function WebsiteInstallGuard() {
  const L = useL();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!onMarketingHost()) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setShow(standalone);
  }, []);

  if (!show) return null;

  const url = `${APP_ORIGIN}/pasang`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(APP_ORIGIN.replace("https://", ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address is on screen to type.
    }
  };
  const steps: Array<[typeof Trash2, string]> = [
    [Trash2, L("Remove this icon from your home screen.", "Hapus ikon ini dari layar utama.")],
    [Share, L("Open Safari, go to app.narriv.digital and tap Share.", "Buka Safari, masuk ke app.narriv.digital, lalu ketuk Bagikan.")],
    [SquarePlus, L("Choose Add to Home Screen. Narriv then opens full screen, without browser bars.", "Pilih Tambahkan ke Layar Utama. Narriv akan terbuka penuh, tanpa bar browser.")],
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="install-guard-title" className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto bg-[#101334] px-6 py-10 text-white" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))", paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(70,95,255,0.4),transparent_70%)]" />
      <div className="relative w-full max-w-sm text-center">
        <p className="text-[30px] font-black tracking-[-0.03em]">Narriv<span className="text-[#EC4899]">.</span></p>
        <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#A5B4FF]">{L("One Quick Step", "Satu Langkah Lagi")}</p>
        <h1 id="install-guard-title" className="mt-2 text-[24px] font-black leading-tight tracking-[-0.02em]">{L("This icon opens the website, not the Narriv app", "Ikon ini membuka situs, bukan aplikasi Narriv")}</h1>
        <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-white/70">{L("Add Narriv from app.narriv.digital so it opens full screen and stays signed in.", "Pasang Narriv dari app.narriv.digital supaya terbuka penuh dan tetap masuk.")}</p>
        <ol className="mt-6 grid gap-2.5 text-left">
          {steps.map(([Icon, text], i) => (
            <li key={i} className="flex items-center gap-3 rounded-[14px] bg-white/[0.07] p-3.5 ring-1 ring-white/10">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#465FFF]"><Icon size={17} aria-hidden="true" /></span>
              <span className="text-[14px] font-semibold leading-snug">{text}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => void copy()} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-white bg-[#465FFF] text-[15px] font-black shadow-[0_3px_0_#fff]">
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />} {copied ? L("Address Copied", "Alamat Tersalin") : L("Copy app.narriv.digital", "Salin app.narriv.digital")}
        </button>
        <a href={url} className="mt-3 inline-block text-[13px] font-bold text-[#A5B4FF] underline-offset-2 hover:underline">{L("Open the install guide", "Buka panduan pemasangan")}</a>
      </div>
      <span aria-hidden="true" className="fixed inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#465FFF] via-[#8B5CF6] to-[#EC4899]" />
    </div>
  );
}
