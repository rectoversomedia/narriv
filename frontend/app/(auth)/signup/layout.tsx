import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Sign Up",
  "Buat akun Narriv untuk mulai memantau narasi, sumber data, dan rekomendasi aksi."
);

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
