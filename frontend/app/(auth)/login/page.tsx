// No 'dynamic' export here — Suspense boundary in LoginPage handles useSearchParams() correctly.
// Next.js 15 App Router automatically treats pages with Suspense + useSearchParams as dynamic.
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
