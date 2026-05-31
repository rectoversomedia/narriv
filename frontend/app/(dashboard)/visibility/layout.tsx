import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "AI Visibility",
  "Ukur visibilitas brand dan narasi Anda di jawaban AI serta kanal pencarian modern."
);

export default function VisibilityLayout({ children }: { children: ReactNode }) {
  return children;
}
