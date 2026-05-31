import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Login",
  "Masuk ke Narriv untuk memantau sinyal publik, alert, laporan, dan rencana aksi."
);

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
