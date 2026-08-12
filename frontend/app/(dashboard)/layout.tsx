import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SSERealtimeProvider } from "@/components/providers/SSEProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SSERealtimeProvider>
      <DashboardShell>{children}</DashboardShell>
    </SSERealtimeProvider>
  );
}
