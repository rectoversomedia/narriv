import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Daily Brief",
  "Ringkasan harian perkembangan isu dan risiko dari data workspace."
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
