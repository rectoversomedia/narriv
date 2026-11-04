import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Reports",
  "Kelola laporan narasi, insight mingguan, dan ringkasan performa yang siap dibagikan."
);

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return children;
}
