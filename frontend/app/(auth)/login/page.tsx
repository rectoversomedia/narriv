// Force dynamic rendering so useSearchParams() in LoginForm works without SSR prerender issues.
// This file is a SERVER COMPONENT — it can export 'dynamic' because it has no 'use client' directive.
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2F20FF] border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
