"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || "Ada bagian dashboard yang belum bisa ditampilkan.";

  return (
    <div className="flex min-h-[520px] items-center justify-center px-4 py-10">
      <section className="max-w-xl rounded-[18px] border border-[#FDE2E2] bg-white p-6 text-center shadow-[0_18px_52px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]">
          <AlertTriangle size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#101334]">
          Halaman ini belum bisa dibuka
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#68739F]">
          {message}
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs font-semibold text-[#8A94B8]">Kode masalah: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#465FFF] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.22)] transition hover:bg-[#3B20EA] sm:w-auto"
        >
          <RefreshCcw size={16} />
          Coba muat ulang
        </button>
      </section>
    </div>
  );
}
