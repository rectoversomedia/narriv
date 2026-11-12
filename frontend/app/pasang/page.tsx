"use client";

// "Pasang aplikasi": installs Narriv from the browser so the home-screen icon opens full screen like an app.
// Android and desktop Chrome/Edge offer one tap through the browser's install prompt; on iPhone only Safari can
// add it (Share, Add to Home Screen), which Apple allows no button for, so the page shows those steps instead.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Download, Maximize2, MonitorSmartphone, MoreVertical, Share, SquarePlus, Zap, type LucideIcon } from "lucide-react";
import { GRID, INK, PAPER, SERIF, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Env = "standalone" | "ios" | "ios-other" | "android" | "desktop";

function detect(): Env {
  const ua = navigator.userAgent;
  if (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone) return "standalone";
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV|Line|WhatsApp/.test(ua) ? "ios-other" : "ios";
  return /Android/.test(ua) ? "android" : "desktop";
}

function Step({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.08)]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#465FFF] text-white">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="flex-1 text-[15px] font-medium leading-snug text-[#31406B] [&_b]:font-black [&_b]:text-[#101334]">{children}</span>
    </li>
  );
}

export default function InstallPage() {
  const L = useL();
  const [env, setEnv] = useState<Env | null>(null);
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The user agent and display mode are only known in the browser, after hydration.
    setEnv(detect());
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDone(true);
    setPrompt(null);
  }

  const perks: { icon: LucideIcon; label: string }[] = [
    { icon: Maximize2, label: L("Full screen, no browser bars", "Layar penuh, tanpa kolom browser") },
    { icon: MonitorSmartphone, label: L("Icon on your home screen", "Ikon di layar utama HP") },
    { icon: Zap, label: L("No app store, a few seconds", "Tanpa Play Store, beberapa detik") },
  ];

  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <header className={cn("relative overflow-hidden pb-20 text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <SiteHeader />
        <div className="relative mx-auto mt-8 flex max-w-xl flex-col items-center px-4 text-center sm:px-6">
          <Image src="/brand/app-orb-192.png" alt="" width={88} height={88} priority className="size-[88px] rounded-[24px] shadow-[0_20px_50px_rgba(70,95,255,0.45)]" />
          <h1 className={cn("mt-6 text-[34px] leading-tight sm:text-[44px]", SERIF)}>{L("Install Narriv on your phone", "Pasang Narriv di HP")}</h1>
          <p className="mt-3 max-w-md text-[16px] font-medium leading-7 text-white/65">
            {L("Open it straight from your home screen, full screen like an app.", "Buka langsung dari layar utama HP, tampil penuh seperti aplikasi.")}
          </p>
          <ul className="mt-7 flex flex-wrap justify-center gap-2">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                <Icon size={14} aria-hidden="true" className="text-[#9AA8FF]" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="relative mx-auto -mt-10 w-full max-w-md space-y-4 px-4 pb-16 sm:px-6">
        {done || env === "standalone" ? (
          <div className="flex flex-col items-center rounded-[22px] bg-white p-7 text-center shadow-[0_12px_32px_rgba(16,19,52,0.1)]">
            <CheckCircle2 size={44} className="text-[#047857]" aria-hidden="true" />
            <p className="mt-3 text-[20px] font-black">{L("Narriv is installed", "Narriv sudah terpasang")}</p>
            <p className="mt-1 text-[14px] font-medium text-[#5F6B94]">{L("Open it from the Narriv icon on your home screen.", "Buka dari ikon Narriv di layar utama HP Anda.")}</p>
            <Link href="/" className="mt-5 inline-flex h-12 items-center rounded-full bg-[#465FFF] px-6 text-[15px] font-bold text-white hover:bg-[#3B52F5]">
              {L("Open Narriv", "Buka Narriv")}
            </Link>
          </div>
        ) : env === "ios" ? (
          <>
            <p className="mx-auto w-fit rounded-full bg-white px-4 py-2 text-center text-[14px] font-black shadow-[0_8px_24px_rgba(16,19,52,0.18)]">{L("On iPhone, in Safari:", "Di iPhone, lewat Safari:")}</p>
            <ol className="space-y-3">
              <Step icon={Share}>{L(<>Tap <b>Share</b> at the bottom of Safari</>, <>Ketuk tombol <b>Bagikan</b> di bawah layar Safari</>)}</Step>
              <Step icon={SquarePlus}>{L(<>Scroll and choose <b>Add to Home Screen</b></>, <>Gulir lalu pilih <b>Tambahkan ke Layar Utama</b></>)}</Step>
              <Step icon={CheckCircle2}>{L(<>Tap <b>Add</b>, then open Narriv from its icon</>, <>Ketuk <b>Tambah</b>, lalu buka Narriv dari ikonnya</>)}</Step>
            </ol>
          </>
        ) : env === "ios-other" ? (
          <div className="rounded-[22px] bg-white p-7 text-center shadow-[0_12px_32px_rgba(16,19,52,0.1)]">
            <p className="text-[17px] font-black">{L("Open this page in Safari first", "Buka halaman ini di Safari dulu")}</p>
            <p className="mt-2 text-[14px] font-medium leading-6 text-[#5F6B94]">
              {L("On iPhone, web apps can only be installed from Safari. Copy the address below and open it in Safari.", "Di iPhone, aplikasi web hanya bisa dipasang lewat Safari. Salin alamat di bawah lalu buka di Safari.")}
            </p>
            <p className="mt-4 rounded-xl bg-[#F1F0EC] px-3 py-2.5 font-mono text-[14px] font-semibold">narriv.digital/pasang</p>
          </div>
        ) : env ? (
          prompt ? (
            <button type="button" onClick={install} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#465FFF] text-[17px] font-bold text-white shadow-[0_16px_40px_rgba(70,95,255,0.4)] hover:bg-[#3B52F5]">
              <Download size={20} aria-hidden="true" /> {L("Install now", "Pasang sekarang")}
            </button>
          ) : (
            <>
              <p className="mx-auto w-fit rounded-full bg-white px-4 py-2 text-center text-[14px] font-black shadow-[0_8px_24px_rgba(16,19,52,0.18)]">{env === "desktop" ? L("In Chrome or Edge:", "Di Chrome atau Edge:") : L("In Chrome:", "Di Chrome:")}</p>
              <ol className="space-y-3">
                {env === "desktop" ? (
                  <Step icon={Download}>{L(<>Click the <b>Install</b> icon at the right end of the address bar</>, <>Klik ikon <b>Pasang</b> di ujung kanan kolom alamat</>)}</Step>
                ) : (
                  <Step icon={MoreVertical}>{L(<>Tap the <b>three dots</b> at the top right of Chrome</>, <>Ketuk <b>titik tiga</b> di kanan atas Chrome</>)}</Step>
                )}
                <Step icon={SquarePlus}>{L(<>Choose <b>Install app</b> or <b>Add to Home screen</b></>, <>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b></>)}</Step>
                <Step icon={CheckCircle2}>{L(<>Open Narriv from its new icon</>, <>Buka Narriv dari ikon barunya</>)}</Step>
              </ol>
              {env === "desktop" ? (
                <p className="text-center text-[13px] font-medium text-[#5F6B94]">
                  {L("For your phone, open narriv.digital/pasang there.", "Untuk HP, buka narriv.digital/pasang di HP Anda.")}
                </p>
              ) : null}
            </>
          )
        ) : (
          <div className="h-40" aria-hidden="true" />
        )}

        <div className="flex flex-col items-center pt-4 text-center">
          <p className="max-w-xs text-[13px] font-medium leading-5 text-[#5F6B94]">
            {L(
              "Added it before and still see the address bar? Remove the old icon, then install again from this page.",
              "Pernah menambahkan dari browser dan masih muncul kolom alamat? Hapus ikon lamanya, lalu pasang lagi dari halaman ini.",
            )}
          </p>
          <Link href="/" className="mt-4 text-[14px] font-bold text-[#3B52F5] hover:underline">{L("Continue in the browser", "Lanjut di browser saja")}</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
