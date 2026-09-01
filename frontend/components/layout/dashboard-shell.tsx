"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Bot, ChevronUp } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Particles } from "@/components/ui/particles";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

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
    if (!token) {
      router.replace("/login");
      setChecked(false);
    } else {
      setChecked(true);
    }
  }, [mounted, token, pathname, router]);

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
      <Particles particleCount={150} particleBaseSize={6} speed={0.08} particleColors={["#465FFF", "#8B5CFF", "#00F0FF"]} />
      <Sidebar />
      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"}`}>
        <Topbar />
        <main className="flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-6 2xl:px-8">
          <div className="relative z-10 w-full max-w-[1600px] mx-auto">{children}</div>
        </main>

        {/* Floating Ask AI button */}
        <Link
          href="/ask"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#465FFF] px-4 py-3 text-white shadow-[0_4px_20px_rgba(70,95,255,0.5)] transition-all hover:bg-[#3b50d8] hover:shadow-[0_6px_28px_rgba(70,95,255,0.65)] active:scale-95"
          aria-label="Open Ask AI"
        >
          <Bot size={18} />
          <span className="text-[13px] font-bold">Ask AI</span>
        </Link>
      </div>
    </div>
  );
}
