import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Alerts",
  "Lihat alert prioritas, tingkat risiko, dan isu yang perlu segera ditindaklanjuti."
);

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return children;
}
