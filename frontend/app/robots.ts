import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Search engines and AI assistants may read the website. The product (app.narriv.digital) is kept out of the index
// by an X-Robots-Tag header instead (next.config.ts), so crawlers can still see that it should not be listed.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/oauth/", "/onboarding"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: AI_CRAWLERS, allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
