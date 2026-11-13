import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Help Center: How Narriv Monitoring, Alerts and Reports Work",
  "Answers about Narriv: getting started, monitoring keywords and sources, risk scores, alerts, reports, team access and billing. Contact the Narriv team by email or WhatsApp.",
  "/help"
);

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
