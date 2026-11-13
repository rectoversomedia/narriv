import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";
import Page from "../../pricing/page";

// /pricing in Indonesian, at its own address so search engines index it.
export const metadata = sitePageMetadata("/pricing", "id");

export default function PricingId() {
  return (
    <SiteLanguage lang="id">
      <Page />
    </SiteLanguage>
  );
}
