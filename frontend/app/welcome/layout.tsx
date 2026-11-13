import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/metadata";
import { jsonLd, organizationJsonLd } from "@/lib/seo";
import { SiteLanguage } from "@/lib/site-lang";

// The landing page is served at "/" on the website (Indonesian at /id), so that is its canonical address.
export const metadata = sitePageMetadata("/", "en");

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <SiteLanguage lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd("en")) }} />
      {children}
    </SiteLanguage>
  );
}
