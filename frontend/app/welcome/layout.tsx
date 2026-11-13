import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";
import { SITE_DESCRIPTION, jsonLd, organizationJsonLd } from "@/lib/seo";

// The landing page is served at "/" on the website, so that is its canonical address.
export const metadata = {
  ...createPageMetadata("Media Monitoring and Narrative Intelligence for Brands in Indonesia", SITE_DESCRIPTION, "/"),
  title: { absolute: "Narriv | Media Monitoring and Narrative Intelligence for Brands in Indonesia" },
};

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd()) }} />
      {children}
    </>
  );
}
