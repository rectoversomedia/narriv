import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";
import { SectionTabs } from "@/components/layout/section-tabs";

export const metadata = createPageMetadata(
  "Recommendations",
  "Rekomendasi tindakan berbasis bukti dari data workspace."
);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs group="actions" />
      {children}
    </>
  );
}
