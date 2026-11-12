"use client";

import type { ReactNode } from "react";
import { GRID, INK, PAPER, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { cn } from "@/lib/utils";
import { useL } from "@/lib/use-l";

/**
 * Layout for the legal pages, in the public site's header and footer. Each page passes both languages and the
 * reader's language picks one.
 */
export function LegalPage({ title, updated, id, en }: { title: [string, string]; updated: [string, string]; id: ReactNode; en: ReactNode }) {
  const L = useL();
  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <header className={cn("relative overflow-hidden pb-14 text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <SiteHeader />
        <h1 className="relative mx-auto mt-8 max-w-3xl px-4 text-center text-[34px] font-black leading-tight tracking-[-0.03em] sm:px-6 sm:text-[44px]">{L(title[0], title[1])}</h1>
        <p className="relative mt-3 text-center text-[14px] font-semibold text-white/60">{L(updated[0], updated[1])}</p>
      </header>
      <main className="mx-auto -mt-8 max-w-3xl px-4 pb-16 sm:px-6">
        <div className="rounded-[22px] bg-white p-6 border-[1.5px] border-[#101334] shadow-[0_5px_0_#101334] sm:p-10">
          <div className="space-y-4 text-[15px] leading-7 text-[#31406B] [&_b]:text-[#101334] [&_h2]:pt-4 [&_h2]:text-[18px] [&_h2]:font-black [&_h2]:text-[#101334] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
            {L("en", "id") === "id" ? id : en}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
