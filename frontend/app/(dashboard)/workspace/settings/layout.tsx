import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Workspace Settings",
  "Atur workspace, anggota tim, preferensi notifikasi, dan konfigurasi akun Narriv."
);

export default function WorkspaceSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
