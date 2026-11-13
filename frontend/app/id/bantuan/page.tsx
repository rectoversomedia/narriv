import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";
import Page from "../../help/page";

// /help in Indonesian, at its own address so search engines index it.
export const metadata = sitePageMetadata("/help", "id");

export default function HelpId() {
  return (
    <SiteLanguage lang="id">
      <Page />
    </SiteLanguage>
  );
}
