import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Onboarding",
  "Siapkan workspace, sumber data, dan preferensi pemantauan awal di Narriv."
);

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
