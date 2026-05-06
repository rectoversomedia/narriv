"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || "Something interrupted this dashboard view.";

  return (
    <div className="flex min-h-[520px] items-center justify-center px-6 py-10">
      <section className="theme-card max-w-xl rounded-2xl border p-8 text-center shadow-[var(--shadow)]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-[#F97066]/30 bg-[#F97066]/10 text-[#FDA29B]">
          <AlertTriangle size={22} />
        </div>
        <h1 className="theme-text mt-5 text-2xl font-semibold tracking-tight">
          Dashboard view could not load
        </h1>
        <p className="theme-muted mt-3 text-sm leading-6">
          {message}
        </p>
        {error.digest ? (
          <p className="theme-muted-2 mt-2 text-xs">Error reference: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </section>
    </div>
  );
}
