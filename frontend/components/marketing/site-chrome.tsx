"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { useL } from "@/lib/use-l";
import { useSiteHref, useSiteLanguage } from "@/lib/site-lang";
import { localizedPath } from "@/lib/site-paths";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";

// The header, footer and look shared by the public pages (landing, pricing, help, legal), so they read as one site.

export { GRID, INK, PAPER, RULE, SERIF } from "@/components/marketing/tokens";

export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const saved = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const siteLang = useSiteLanguage();
  const language = siteLang ?? saved;
  const router = useRouter();
  const pathname = usePathname();
  // On the public website each language has its own address, so switching opens the other page.
  const choose = (code: "en" | "id") => {
    setLanguage(code);
    if (siteLang && code !== siteLang) router.push(localizedPath(pathname, code));
  };
  return (
    <div role="group" aria-label="Bahasa / Language" className={cn("flex rounded-[9px] p-0.5", dark ? "bg-white/10" : "bg-[#EEF1F7]")}>
      {(["id", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={language === code}
          onClick={() => choose(code)}
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
  const href = useSiteHref();
  return (
    // Phones: language on the left, the brand centred, sign-in on the right. Wider screens: brand left, menu right.
    <header className="relative mx-auto grid h-[72px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:flex sm:justify-between sm:px-6">
      <div className="justify-self-start sm:hidden"><LanguageSwitch dark /></div>
      <Link href={href("/")} aria-label="Narriv" className="justify-self-center">
        <Image src="/brand/logo-p.webp" alt="Narriv" width={128} height={48} priority className="h-8 w-auto" />
      </Link>
      <nav className="flex items-center justify-self-end gap-2 sm:gap-4">
        <Link href={href("/pricing")} className="hidden text-[14px] font-semibold text-white/75 hover:text-white sm:block">{L("Pricing", "Harga")}</Link>
        <Link href={href("/#faq")} className="hidden text-[14px] font-semibold text-white/75 hover:text-white sm:block">FAQ</Link>
        <Link href={href("/blog")} className="hidden text-[14px] font-semibold text-white/75 hover:text-white md:block">Blog</Link>
        <Link href={href("/help")} className="hidden text-[14px] font-semibold text-white/75 hover:text-white md:block">{L("Help", "Bantuan")}</Link>
        <span className="hidden sm:block"><LanguageSwitch dark /></span>
        <Link href="/login" className="flex h-9 items-center rounded-[10px] bg-white px-3.5 text-[14px] font-bold text-[#101334] hover:bg-white/90">{L("Sign In", "Masuk")}</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const L = useL();
  const href = useSiteHref();
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      {/* Install Narriv on a phone: the page explains how for each device */}
      <div className="flex justify-center pb-8">
        <Link href="/pasang" className="inline-flex h-12 items-center gap-2.5 rounded-full bg-[#101334] px-6 text-[14px] font-bold text-white shadow-[0_12px_30px_rgba(16,19,52,0.25)] transition hover:bg-[#1A1F4A]">
          <Smartphone size={18} aria-hidden="true" />
          {L("Install the App on Your Phone", "Pasang Aplikasi di HP")}
        </Link>
      </div>
      <div className="flex flex-col items-center justify-between gap-4 text-[13px] font-semibold text-[#5F6B94] sm:flex-row">
        <Image src="/brand/logo-h.webp" alt="Narriv" width={96} height={36} loading="eager" className="h-6 w-auto" />
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href={href("/pricing")} className="hover:text-[#101334]">{L("Pricing", "Harga")}</Link>
          <Link href={href("/#faq")} className="hover:text-[#101334]">FAQ</Link>
          <Link href={href("/blog")} className="hover:text-[#101334]">Blog</Link>
          <Link href={href("/help")} className="hover:text-[#101334]">{L("Help", "Bantuan")}</Link>
          <Link href={href("/privacy")} className="hover:text-[#101334]">{L("Privacy", "Privasi")}</Link>
          <Link href={href("/terms")} className="hover:text-[#101334]">{L("Terms", "Ketentuan")}</Link>
          <Link href={href("/help#contact")} className="hover:text-[#101334]">{L("Contact", "Kontak")}</Link>
        </nav>
        <LanguageSwitch />
      </div>
    </footer>
  );
}
