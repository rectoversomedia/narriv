"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

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
      <div className="flex min-h-screen items-center justify-center bg-[#101828]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#465FFF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="theme-shell min-h-screen selection:bg-[#465FFF]/30">
      <Sidebar />
      <div className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ${sidebarCollapsed ? "md:pl-[92px]" : "md:pl-[292px]"}`}>
        <Topbar />
        <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 md:px-6 md:pb-8">
          <div className="mx-auto w-full max-w-[1148px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
