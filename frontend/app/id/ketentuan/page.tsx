import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";
import Page from "../../terms/page";

// /terms in Indonesian, at its own address so search engines index it.
export const metadata = sitePageMetadata("/terms", "id");

export default function TermsId() {
  return (
    <SiteLanguage lang="id">
      <Page />
    </SiteLanguage>
  );
}
