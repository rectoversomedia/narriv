import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Data Sources",
  "Kelola sumber data, konektor, status sinkronisasi, dan cakupan pemantauan Narriv."
);

export default function SourcesLayout({ children }: { children: ReactNode }) {
  return children;
}
