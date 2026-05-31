import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Intelligence",
  "Analisis narasi, aktor, kanal, dan insight strategis untuk membantu pengambilan keputusan."
);

export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  return children;
}
