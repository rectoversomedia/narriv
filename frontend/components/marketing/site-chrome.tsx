"use client";

import Image from "next/image";
import Link from "next/link";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";

// The header, footer and look shared by the public pages (landing, pricing, help, legal), so they read as one site.

/** Editorial serif for accent lines (font loaded in app/layout.tsx). */
export const SERIF = "[font-family:var(--font-serif),Georgia,serif] font-normal tracking-[-0.01em]";
/** The ink background of dark sections. */
export const INK = "bg-[#070A1F]";
/** A faint grid that fades out, laid over dark sections. */
export const GRID = "bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]";
/** Warm paper for light sections, and the hairline colour on it. */
export const PAPER = "bg-[#F6F5F1]";
export const RULE = "border-[#DDDAD0]";

export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  return (
    <div role="group" aria-label="Bahasa / Language" className={cn("flex rounded-[9px] p-0.5", dark ? "bg-white/10" : "bg-[#EEF1F7]")}>
      {(["id", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={cn(
            "h-7 min-w-[34px] rounded-[7px] px-2 text-[12px] font-black uppercase",
            language === code ? (dark ? "bg-white text-[#101334]" : "bg-white text-[#101334] shadow-sm") : dark ? "text-white/60" : "text-[#5A6478]",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/** The top bar, drawn on the navy hero of each public page. */
export function SiteHeader() {
  const L = useL();
  return (
    // Phones: language on the left, the brand centred, sign-in on the right. Wider screens: brand left, menu right.
    <header className="relative mx-auto grid h-[72px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:flex sm:justify-between sm:px-6">
      <div className="justify-self-start sm:hidden"><LanguageSwitch dark /></div>
      <Link href="/" aria-label="Narriv" className="justify-self-center">
        <Image src="/brand/logo-p.webp" alt="Narriv" width={128} height={48} priority className="h-8 w-auto" />
      </Link>
      <nav className="flex items-center justify-self-end gap-2 sm:gap-4">
        <Link href="/pricing" className="hidden text-[14px] font-semibold text-white/75 hover:text-white sm:block">{L("Pricing", "Harga")}</Link>
        <Link href="/welcome#faq" className="hidden text-[14px] font-semibold text-white/75 hover:text-white sm:block">FAQ</Link>
        <Link href="/help" className="hidden text-[14px] font-semibold text-white/75 hover:text-white md:block">{L("Help", "Bantuan")}</Link>
        <span className="hidden sm:block"><LanguageSwitch dark /></span>
        <Link href="/login" className="flex h-9 items-center rounded-[10px] bg-white px-3.5 text-[14px] font-bold text-[#101334] hover:bg-white/90">{L("Sign in", "Masuk")}</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const L = useL();
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 pb-10 text-[13px] font-semibold text-[#5F6B94] sm:flex-row sm:px-6">
      <Image src="/brand/logo-h.webp" alt="Narriv" width={96} height={36} loading="eager" className="h-6 w-auto" />
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        <Link href="/pricing" className="hover:text-[#101334]">{L("Pricing", "Harga")}</Link>
        <Link href="/welcome#faq" className="hover:text-[#101334]">FAQ</Link>
        <Link href="/help" className="hover:text-[#101334]">{L("Help", "Bantuan")}</Link>
        <Link href="/privacy" className="hover:text-[#101334]">{L("Privacy", "Privasi")}</Link>
        <Link href="/terms" className="hover:text-[#101334]">{L("Terms", "Ketentuan")}</Link>
        <Link href="/help#contact" className="hover:text-[#101334]">{L("Contact", "Kontak")}</Link>
      </nav>
      <LanguageSwitch />
    </footer>
  );
}
