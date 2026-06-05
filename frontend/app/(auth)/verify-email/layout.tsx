import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifikasi Email",
  description: "Verifikasi alamat email Anda untuk mengakses Narriv.",
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
