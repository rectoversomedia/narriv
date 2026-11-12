"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SectionTabs } from "@/components/layout/section-tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { TrialBanner } from "@/components/layout/trial-banner";
import { DemoBlockedNotice } from "@/components/ui/demo-blocked-notice";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { signalDashboardReady } from "@/lib/launch";

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);
  const [checked, setChecked] = useState(false);

  // Mark as mounted after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth redirect — runs AFTER Zustand rehydrates from localStorage (mounted=true guard)
  // Skip redirect if we're already on the login page to prevent redirect loops
  useEffect(() => {
    if (!mounted) return;
    if (pathname === "/login") {
      setChecked(true);
      return;
    }
    const hasCookie = typeof document !== "undefined" && document.cookie.includes("narriv_auth=");
    const hasStorage = typeof window !== "undefined" && (Boolean(localStorage.getItem("narriv-auth")) || Boolean(localStorage.getItem("narriv_demo_token")));

    if (!token && !hasCookie && !hasStorage) {
      router.replace("/login");
      setChecked(false);
    } else {
      setChecked(true);
    }
  }, [mounted, token, pathname, router]);

  // The sign-in launch screen lifts once the dashboard can render.
  useEffect(() => {
    if (mounted && checked) signalDashboardReady();
  }, [mounted, checked]);

  // Show loading only if not checked yet (prevent flash)
  if (!mounted || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-slate-200 border-[#465FFF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-[#465FFF]/30">
      <Sidebar />
      <DemoBlockedNotice />
      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"}`}>
        <Topbar />
        {/* A soft colour wash behind every page: white cards read as cards, and pages are not flat grey. */}
        <main className="relative flex-1 bg-[linear-gradient(180deg,#F5F7FF_0%,#F8F6FF_40%,#FAFBFF_100%)] px-4 pb-32 pt-6 sm:px-6 lg:px-6 lg:pb-10 2xl:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
            <div className="absolute -left-24 -top-32 h-[360px] w-[520px] rounded-full bg-[#C7D2FE] opacity-40 blur-[110px]" />
            <div className="absolute -right-24 -top-24 h-[320px] w-[460px] rounded-full bg-[#FBCFE8] opacity-35 blur-[110px]" />
          </div>
          <div className="relative z-10 w-full max-w-[1600px] mx-auto">
            <TrialBanner />
            <SectionTabs />
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
