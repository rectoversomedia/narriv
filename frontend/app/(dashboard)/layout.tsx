"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Prevent flash of content before redirect
  if (!mounted || !isAuthenticated) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
           <div className="max-w-7xl mx-auto w-full">
            {children}
           </div>
        </main>
      </div>
    </div>
  );
}
