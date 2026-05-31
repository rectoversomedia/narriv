import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Signals",
  "Pantau sinyal publik terbaru, tren percakapan, dan perubahan sentimen dari berbagai sumber."
);

export default function SignalsLayout({ children }: { children: ReactNode }) {
  return children;
}
