import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Verify Code",
  "Verifikasi kode keamanan untuk melanjutkan proses pemulihan akun Narriv."
);

export default function VerifyCodeLayout({ children }: { children: ReactNode }) {
  return children;
}
