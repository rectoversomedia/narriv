import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Pasang aplikasi",
  "Pasang Narriv di layar utama HP dan buka layar penuh seperti aplikasi, tanpa Play Store."
);

export default function InstallLayout({ children }: { children: ReactNode }) {
  return children;
}
