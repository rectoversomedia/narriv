import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";

export const metadata = sitePageMetadata("/help", "en");

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <SiteLanguage lang="en">{children}</SiteLanguage>;
}
