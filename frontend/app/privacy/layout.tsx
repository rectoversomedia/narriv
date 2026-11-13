import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";

export const metadata = sitePageMetadata("/privacy", "en");

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <SiteLanguage lang="en">{children}</SiteLanguage>;
}
