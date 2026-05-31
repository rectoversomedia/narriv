"use client";

import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || "Ada masalah saat membuka halaman ini.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10 text-[#101334]">
      <section className="w-full max-w-xl rounded-[20px] border border-[#E6EAF2] bg-white p-6 text-center shadow-[0_22px_70px_rgba(15,23,42,0.10)] sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]">
          <AlertTriangle size={26} />
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-[-0.03em] text-[#101334]">
          Halaman sedang bermasalah
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#68739F]">
          {message} Coba muat ulang halaman. Jika masih gagal, kembali ke halaman utama.
        </p>
        {error.digest ? <p className="mt-2 text-xs font-semibold text-[#8A94B8]">Kode masalah: {error.digest}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#465FFF] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.22)] transition hover:bg-[#3B20EA]"
          >
            <RefreshCcw size={16} />
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#DDE3EF] bg-white px-5 text-sm font-black text-[#101334] transition hover:bg-[#F8FAFF]"
          >
            <Home size={16} />
            Ke halaman utama
          </Link>
        </div>
      </section>
    </main>
  );
}
