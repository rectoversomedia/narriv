"use client";

import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { useL } from "@/lib/use-l";

/**
 * Layout for the legal pages, in the public site's header and footer. Each page passes both languages and the
 * reader's language picks one. While `draft` is set, a note says the text awaits review and is not yet in effect.
 */
export function LegalDraft({ title, updated, id, en, draft = true }: { title: [string, string]; updated: [string, string]; id: ReactNode; en: ReactNode; draft?: boolean }) {
  const L = useL();
  return (
    <div className="min-h-dvh bg-[#F5F7FC] text-[#101334]">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0B0E2A] via-[#151B5E] to-[#2B2F9E] pb-14 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-120px] h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[#6D7CFF] opacity-25 blur-[120px]" />
        <SiteHeader />
        <h1 className="relative mx-auto mt-8 max-w-3xl px-4 text-center text-[34px] font-black leading-tight tracking-[-0.03em] sm:px-6 sm:text-[44px]">{L(title[0], title[1])}</h1>
        <p className="relative mt-3 text-center text-[14px] font-semibold text-white/60">{L(updated[0], updated[1])}</p>
      </header>
      <main className="mx-auto -mt-8 max-w-3xl px-4 pb-16 sm:px-6">
        <div className="rounded-[22px] bg-white p-6 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.08)] sm:p-10">
          {draft ? (
            <div role="note" className="mb-6 rounded-2xl bg-[#FEF6E4] p-4 text-sm font-semibold text-[#8A4B08]">
              {L(
                "Draft for review. Not in effect until approved by PT Primer Rectoverso Media and its legal counsel. Items in [brackets] are still to be completed.",
                "Draf untuk ditinjau. Belum berlaku sampai disetujui PT Primer Rectoverso Media dan penasihat hukumnya. Bagian dalam [kurung siku] masih perlu dilengkapi.",
              )}
            </div>
          ) : null}
          <div className="space-y-4 text-[15px] leading-7 text-[#31406B] [&_b]:text-[#101334] [&_h2]:pt-4 [&_h2]:text-[18px] [&_h2]:font-black [&_h2]:text-[#101334] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
            {L("en", "id") === "id" ? id : en}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
