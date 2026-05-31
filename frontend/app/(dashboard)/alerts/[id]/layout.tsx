import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Alert Detail",
  "Buka detail alert, sumber percakapan, ringkasan risiko, dan langkah tindak lanjut."
);

export default function AlertDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
