import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The website's public pages only: sign-in and the product live on app.narriv.digital and are not indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, changeFrequency: "weekly" | "monthly" | "yearly", priority: number) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", "weekly", 1),
    page("/pricing", "monthly", 0.9),
    page("/help", "monthly", 0.7),
    page("/privacy", "yearly", 0.3),
    page("/terms", "yearly", 0.3),
  ];
}
