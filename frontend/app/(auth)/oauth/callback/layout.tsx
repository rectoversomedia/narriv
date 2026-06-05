import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authenticating...",
  description: "OAuth callback page for Narriv.",
};

export default function OAuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
