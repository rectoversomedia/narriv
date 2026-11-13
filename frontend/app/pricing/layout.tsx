import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Pricing: Media Monitoring Plans From Rp 5 Million a Month",
  "Narriv plans for brands, agencies and institutions in Indonesia: Pilot, Intelligence, Decision and Command. Hourly news, YouTube and social media monitoring, alerts and board-ready reports. Start a free 14-day trial, no card needed.",
  "/pricing"
);

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
