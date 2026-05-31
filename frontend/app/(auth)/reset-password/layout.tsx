import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Reset Password",
  "Minta tautan reset password untuk membuka kembali akun Narriv Anda."
);

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
