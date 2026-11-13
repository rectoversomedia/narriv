import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";
import Page from "../../privacy/page";

// /privacy in Indonesian, at its own address so search engines index it.
export const metadata = sitePageMetadata("/privacy", "id");

export default function PrivacyId() {
  return (
    <SiteLanguage lang="id">
      <Page />
    </SiteLanguage>
  );
}
