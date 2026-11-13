import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { SITE_URL } from "@/lib/seo";
import { localizedPath } from "@/lib/site-paths";

// The website's public pages in both languages, each listing its other-language version. Sign-in and the product
// live on app.narriv.digital and are not indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries = (path: string, changeFrequency: "weekly" | "monthly" | "yearly", priority: number, lastModified: Date = now) => {
    const languages = { en: SITE_URL + localizedPath(path, "en"), id: SITE_URL + localizedPath(path, "id") };
    return (["en", "id"] as const).map((lang) => ({
      url: languages[lang],
      lastModified,
      changeFrequency,
      priority: lang === "en" ? priority : Math.max(0.1, priority - 0.05),
      alternates: { languages },
    }));
  };
  return [
    ...entries("/", "weekly", 1),
    ...entries("/pricing", "monthly", 0.9),
    ...entries("/blog", "weekly", 0.8),
    ...ARTICLES.flatMap((a) => entries(`/blog/${a.slug}`, "monthly", 0.7, new Date(`${a.published}T00:00:00+07:00`))),
    ...entries("/help", "monthly", 0.7),
    ...entries("/privacy", "yearly", 0.3),
    ...entries("/terms", "yearly", 0.3),
  ];
}
