import Link from "next/link";
import type { ReactNode } from "react";

/** Layout for legal pages that are drafts awaiting owner and legal review. */
export function LegalDraft({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl">
        <Link href="/help" className="text-sm font-semibold text-indigo-600 hover:underline">← Help center</Link>
        <div role="note" className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          DRAFT — not in effect. This document has not been reviewed or approved by Narriv&apos;s owner or legal counsel.
          Bracketed items such as [COMPANY LEGAL NAME] must be completed before publication. Nothing on this page is a binding commitment.
        </div>
        <h1 className="mt-8 text-3xl font-black text-slate-900">{title}</h1>
        <div className="mt-6 space-y-6 text-[15px] leading-7 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </div>
    </main>
  );
}
