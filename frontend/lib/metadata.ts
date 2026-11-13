import type { Metadata } from "next";

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
