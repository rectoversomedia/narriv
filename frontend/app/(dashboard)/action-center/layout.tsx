import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Recommendations",
  "Rekomendasi tindakan berbasis bukti dari data workspace."
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
