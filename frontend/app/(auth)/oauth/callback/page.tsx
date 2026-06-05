"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthShell, CenterIcon } from "@/components/auth/auth-shell";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const userBase64 = searchParams.get("user");

    if (token && refreshToken && userBase64) {
      try {
        const user = JSON.parse(atob(userBase64));
        setSession(token, user, refreshToken);
        
        const nextPath = new URLSearchParams(window.location.search).get("next");
        router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
      } catch (e) {
        console.error("Failed to parse OAuth user payload", e);
        router.push("/login?error=oauth_failed");
      }
    } else {
      router.push("/login?error=oauth_failed");
    }
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
