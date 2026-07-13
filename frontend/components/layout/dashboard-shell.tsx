"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Particles } from "@/components/ui/particles";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  if (!mounted || !token) {
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
      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-[92px]" : "lg:pl-[292px]"}`}>
        <Topbar />
        <main className="flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="relative z-10 w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
