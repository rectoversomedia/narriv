import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SSERealtimeProvider } from "@/components/providers/SSEProvider";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Command Center",
  "Pantau sinyal, alert, sumber data, dan rekomendasi aksi dalam satu dashboard Narriv."
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SSERealtimeProvider>
      <DashboardShell>{children}</DashboardShell>
    </SSERealtimeProvider>
  );
}
