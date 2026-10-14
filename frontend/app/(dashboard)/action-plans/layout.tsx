import type { ReactNode } from "react";
import { SectionTabs } from "@/components/layout/section-tabs";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Action Plans",
  "Susun rencana aksi, pantau progres, dan tindak lanjuti rekomendasi dari Narriv."
);

export default function ActionPlansLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs group="actions" />
      {children}
    </>
  );
}
