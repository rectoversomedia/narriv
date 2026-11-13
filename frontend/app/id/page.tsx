import { sitePageMetadata } from "@/lib/metadata";
import { jsonLd, organizationJsonLd } from "@/lib/seo";
import { SiteLanguage } from "@/lib/site-lang";
import WelcomePage from "../welcome/page";

// The landing page in Indonesian, at its own address so search engines index it (English at /).
export const metadata = sitePageMetadata("/", "id");

export default function LandingId() {
  return (
    <SiteLanguage lang="id">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd("id")) }} />
      <WelcomePage />
    </SiteLanguage>
  );
}
