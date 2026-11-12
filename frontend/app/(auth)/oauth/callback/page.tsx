"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { exchangeOAuthCode } from "@/lib/api-service";
import { beginLaunch, cancelLaunch } from "@/lib/launch";

// Google sends people here after they sign in. There is no "authenticating" page: the welcome screen is already up
// (the boot script covers this route before first paint) while the code is exchanged, then the dashboard loads beneath it.
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const fail = (reason: string) => {
      cancelLaunch();
      router.replace(`/login?error=${reason}`);
    };
    if (errorParam) return fail(errorParam);
    if (!code) return fail("oauth_failed");

    beginLaunch();
    let cancelled = false;
    exchangeOAuthCode(code)
      .then(({ token, user, refreshToken }) => {
        if (cancelled) return;
        setSession(token, user, refreshToken);
        // Always to /: the dashboard shell sends people who have not finished onboarding there.
        router.replace("/");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[OAuth] Exchange failed:", err);
        fail("oauth_failed");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, setSession]);

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <main className="min-h-dvh bg-[#0b0f2e]">
      <Suspense fallback={null}>
        <OAuthCallbackContent />
      </Suspense>
    </main>
  );
}
