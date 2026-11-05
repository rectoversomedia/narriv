import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

/** Layout for legal pages that are drafts awaiting owner and legal review, inside the public site's header and footer. */
export function LegalDraft({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F5F7FC] text-[#101334]">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0B0E2A] via-[#151B5E] to-[#2B2F9E] pb-14 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-120px] h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[#6D7CFF] opacity-25 blur-[120px]" />
        <SiteHeader />
        <h1 className="relative mx-auto mt-8 max-w-3xl px-4 text-center text-[34px] font-black leading-tight tracking-[-0.03em] sm:px-6 sm:text-[44px]">{title}</h1>
      </header>
      <main className="mx-auto -mt-8 max-w-3xl px-4 pb-16 sm:px-6">
        <div className="rounded-[22px] bg-white p-6 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_12px_32px_rgba(16,19,52,0.08)] sm:p-10">
          <div role="note" className="rounded-2xl bg-[#FEF6E4] p-4 text-sm font-semibold text-[#8A4B08]">
            DRAFT — not in effect. This document has not been reviewed or approved by Narriv&apos;s owner or legal counsel.
            Bracketed items such as [COMPANY LEGAL NAME] must be completed before publication. Nothing on this page is a binding commitment.
          </div>
          <div className="mt-6 space-y-5 text-[15px] leading-7 text-[#31406B] [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-black [&_h2]:text-[#101334] [&_li]:ml-5 [&_li]:list-disc">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
