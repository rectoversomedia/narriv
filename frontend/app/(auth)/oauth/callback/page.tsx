"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthShell, CenterIcon } from "@/components/auth/auth-shell";
import { exchangeOAuthCode } from "@/lib/api-service";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    if (errorParam) {
      router.replace(`/login?error=${errorParam}`);
      return;
    }
    if (!code) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    let cancelled = false;
    exchangeOAuthCode(code)
      .then(({ token, user, refreshToken, workspace }) => {
        if (cancelled) return;
        console.log("[OAuth] Exchange success", { email: user?.email, workspace });
        setSession(token, user, refreshToken);
        // Always redirect to / — dashboard-shell middleware handles auth + onboarding check
        router.replace("/");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[OAuth] Exchange failed:", err);
        router.replace("/login?error=oauth_failed");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, setSession]);

  return (
    <div className="mx-auto mb-12 max-w-[620px] text-center">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">Authenticating...</h1>
      <p className="mt-4 text-[19px] font-medium leading-8 text-[#3E4975]">
        Please wait while we log you in.
      </p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <AuthShell visual="security">
      <CenterIcon variant="shield" />
      <Suspense fallback={
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em] text-[#111536]">Authenticating...</h1>
        </div>
      }>
        <OAuthCallbackContent />
      </Suspense>
    </AuthShell>
  );
}
