import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";

export const metadata = sitePageMetadata("/terms", "en");

export default function TermsLayout({ children }: { children: ReactNode }) {
  return <SiteLanguage lang="en">{children}</SiteLanguage>;
}
