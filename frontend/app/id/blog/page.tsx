import { BlogIndex } from "@/components/marketing/blog";
import { sitePageMetadata } from "@/lib/metadata";
import { SiteLanguage } from "@/lib/site-lang";

export const metadata = sitePageMetadata("/blog", "id");

export default function BlogPage() {
  return (
    <SiteLanguage lang="id">
      <BlogIndex lang="id" />
    </SiteLanguage>
  );
}
