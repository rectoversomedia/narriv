import { BlogIndex } from "@/components/marketing/blog";
import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";

export const metadata = sitePageMetadata("/blog", "en");

export default function BlogPage() {
  return (
    <SiteLanguage lang="en">
      <BlogIndex lang="en" />
    </SiteLanguage>
  );
}
