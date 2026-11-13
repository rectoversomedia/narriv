// What search engines and AI assistants read about Narriv: one description of the product, used by the page
// metadata, the structured data (JSON-LD) and llms.txt, so every source says the same thing.

export const SITE_URL = "https://www.narriv.digital";
export const SITE_NAME = "Narriv";

export const SITE_TITLE = "Narriv | Media Monitoring and Narrative Intelligence for Brands in Indonesia";
export const SITE_DESCRIPTION =
  "Narriv monitors online news, YouTube, social media and AI answers about your brand every hour, scores the reputational risk, alerts the right owner and writes board-ready reports. Built for brands, agencies and public institutions in Indonesia.";

// Not used for ranking by Google, but read by other engines and a useful record of what the pages target.
export const SITE_KEYWORDS = [
  "media monitoring",
  "media monitoring Indonesia",
  "social listening",
  "social listening Indonesia",
  "brand monitoring",
  "reputation monitoring",
  "reputation management",
  "crisis monitoring",
  "narrative intelligence",
  "news monitoring",
  "sentiment analysis",
  "AI visibility",
  "monitoring media",
  "pemantauan media",
  "pantau reputasi brand",
  "monitoring berita",
  "manajemen krisis",
  "analisis sentimen",
];

export const SUPPORT_LANGUAGES = ["en", "id"];

/** Structured data for the whole site: who publishes it and what the product is. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo-bulat-narriv-2026.png`,
        description: SITE_DESCRIPTION,
        areaServed: "ID",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: SUPPORT_LANGUAGES,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Media Monitoring and Reputation Management",
        operatingSystem: "Web, iOS, Android",
        description: SITE_DESCRIPTION,
        inLanguage: SUPPORT_LANGUAGES,
        publisher: { "@id": `${SITE_URL}/#organization` },
        featureList: [
          "Hourly monitoring of online news, YouTube and social media",
          "Reputational risk scoring and sentiment analysis",
          "Alerts with an owner and a deadline, sent by email",
          "Narrative and issue mapping",
          "AI visibility: how AI assistants describe your brand",
          "Board-ready PDF, Excel and email reports",
          "Ask Narriv: questions answered from your own data",
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "IDR",
          lowPrice: 5000000,
          offerCount: 4,
          url: `${SITE_URL}/pricing`,
        },
      },
    ],
  };
}

/** FAQPage structured data from question/answer pairs. */
export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

/** A JSON-LD script body that cannot close the script tag early. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
