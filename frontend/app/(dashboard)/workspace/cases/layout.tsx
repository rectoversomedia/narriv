import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";
import { SectionTabs } from "@/components/layout/section-tabs";

export const metadata = createPageMetadata(
  "Cases",
  "Kasus yang sedang ditindaklanjuti tim."
);

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs group="actions" />
      {children}
    </>
  );
}
