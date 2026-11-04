import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Cases",
  "Kasus yang sedang ditindaklanjuti tim."
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
