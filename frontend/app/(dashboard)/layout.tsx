"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { Particles } from "@/components/ui/particles";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const theme = useUiStore((state) => state.theme);
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
    <div data-theme={theme} className="min-h-screen bg-background text-foreground selection:bg-[#465FFF]/30 relative overflow-hidden">
      <Particles particleCount={150} particleBaseSize={6} speed={0.08} particleColors={['#465FFF', '#8B5CFF', '#00F0FF']} />
      <Sidebar />
      <div className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-[92px]" : "lg:pl-[292px]"}`}>
        <Topbar />
        <main className="flex-1 overflow-x-hidden px-5 pb-24 pt-6 sm:px-8 lg:px-10 xl:px-12 lg:pb-10">
          <div className="mx-auto w-full max-w-[1510px] relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
