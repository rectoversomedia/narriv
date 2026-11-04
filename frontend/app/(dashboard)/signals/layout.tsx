import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Signals",
  "Pantau percakapan publik terbaru, trennya, dan perubahan sentimen dari berbagai sumber."
);

export default function SignalsLayout({ children }: { children: ReactNode }) {
  return children;
}
