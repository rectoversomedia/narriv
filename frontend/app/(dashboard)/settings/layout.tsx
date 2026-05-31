import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Settings",
  "Atur preferensi akun, workspace, notifikasi, dan keamanan di Narriv."
);

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
