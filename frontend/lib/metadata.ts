import type { Metadata } from "next";

const siteName = "Narriv";

export function createPageMetadata(title: string, description: string): Metadata {
  const fullTitle = `${title} | ${siteName}`;

  return {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
