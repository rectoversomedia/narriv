import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "New Password",
  "Buat password baru yang aman untuk akun Narriv Anda."
);

export default function NewPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
