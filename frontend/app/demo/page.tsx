"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { startDemoLogin, type DemoScenario } from "@/components/auth/auth-shell";
import { useL } from "@/lib/use-l";

// The website's demo buttons land here on the app: the chosen case signs in and opens. One screen while it loads,
// and a way back if it fails.

const CASES: DemoScenario[] = ["brand", "gov", "cve"];

function DemoStart() {
  const L = useL();
  const params = useSearchParams();
  const requested = params.get("case") as DemoScenario | null;
  const scenario: DemoScenario = requested && CASES.includes(requested) ? requested : "brand";
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startDemoLogin(scenario).catch((e: unknown) => setError(e instanceof Error ? e.message : "Demo login failed"));
  }, [scenario]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#070A1F] px-6 text-center text-white">
      <Image src="/brand/logo-bulat.webp" alt="Narriv" width={96} height={96} unoptimized className="size-24 rounded-full" />
      {error ? (
        <>
          <p className="mt-6 text-[18px] font-black">{L("The demo could not open.", "Demo gagal dibuka.")}</p>
          <p className="mt-1 text-[14px] text-white/60">{error}</p>
          <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-black text-[#070A1F]">{L("Try Again", "Coba Lagi")}</Link>
        </>
      ) : (
        <>
          <p className="mt-6 text-[18px] font-black">{L("Opening the demo…", "Membuka demo…")}</p>
          <span className="mt-5 size-7 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden="true" />
        </>
      )}
    </main>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoStart />
    </Suspense>
  );
}
