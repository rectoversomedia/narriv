import type { Metadata } from "next";
import { localizedPath } from "@/lib/site-paths";
import { PAGE_SEO } from "@/lib/seo";

const siteName = "Narriv";
// A page's openGraph replaces the root one, so the share picture is repeated here.
const image = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Narriv: media monitoring and narrative intelligence" };

/** Page metadata; `path` (e.g. "/pricing") marks a public page and sets its canonical URL. */
export function createPageMetadata(title: string, description: string, path?: string): Metadata {
  const fullTitle = `${title} | ${siteName}`;

  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      title: fullTitle,
      ...(path ? { url: path } : {}),
      description,
      siteName,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.url],
    },
  };
}

/**
 * Metadata for a public website page that exists in both languages: canonical address, hreflang links to the
 * other language (x-default is English) and the share card in the page's language.
 */
export function publicPageMetadata({ lang, path, title, description, absoluteTitle }: { lang: "en" | "id"; path: string; title: string; description: string; absoluteTitle?: boolean }): Metadata {
  const en = localizedPath(path, "en");
  const id = localizedPath(path, "id");
  const own = lang === "id" ? id : en;
  const base = createPageMetadata(title, description, own);
  return {
    ...base,
    ...(absoluteTitle ? { title: { absolute: title } } : {}),
    alternates: { canonical: own, languages: { en, id, "x-default": en } },
    openGraph: { ...base.openGraph, ...(absoluteTitle ? { title } : {}), locale: lang === "id" ? "id_ID" : "en_US", alternateLocale: [lang === "id" ? "en_US" : "id_ID"] },
    ...(absoluteTitle ? { twitter: { ...base.twitter, title } } : {}),
  };
}

/** Metadata for one of the public pages listed in PAGE_SEO (by its English path), in the given language. */
export function sitePageMetadata(enPath: string, lang: "en" | "id"): Metadata {
  const copy = PAGE_SEO[enPath][lang];
  return publicPageMetadata({ lang, path: enPath, title: copy.title, description: copy.description, absoluteTitle: enPath === "/" });
}
