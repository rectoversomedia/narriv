import type { ReactNode } from "react";
import { SectionTabs } from "@/components/layout/section-tabs";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Reports",
  "Kelola laporan narasi, insight mingguan, dan ringkasan performa yang siap dibagikan."
);

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs group="reports" />
      {children}
    </>
  );
}
