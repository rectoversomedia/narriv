// What search engines and AI assistants read about Narriv: one description of the product, used by the page
// metadata, the structured data (JSON-LD) and llms.txt, so every source says the same thing.

export const SITE_URL = "https://www.narriv.digital";
export const SITE_NAME = "Narriv";

export const SITE_TITLE = "Narriv | Media Monitoring and Narrative Intelligence for Brands in Indonesia";
export const SITE_DESCRIPTION =
  "Narriv monitors online news, YouTube, social media and AI answers about your brand every hour, scores the reputational risk, alerts the right owner and writes board-ready reports. Built for brands, agencies and public institutions in Indonesia.";

export const SITE_DESCRIPTION_ID =
  "Narriv memantau berita online, YouTube, media sosial, dan jawaban AI tentang brand Anda setiap jam, menilai risiko reputasi, memberi tahu penanggung jawab yang tepat, dan menyusun laporan siap direksi. Untuk brand, agensi, dan instansi di Indonesia.";

type Copy = { title: string; description: string };

/** Search titles and descriptions for each public page, by English path, in both languages. */
export const PAGE_SEO: Record<string, { en: Copy; id: Copy }> = {
  "/": {
    en: { title: SITE_TITLE, description: SITE_DESCRIPTION },
    id: { title: "Narriv | Media Monitoring dan Narrative Intelligence untuk Brand di Indonesia", description: SITE_DESCRIPTION_ID },
  },
  "/pricing": {
    en: {
      title: "Pricing: Media Monitoring Plans From Rp 5 Million a Month",
      description: "Narriv plans for brands, agencies and institutions in Indonesia: Pilot, Intelligence, Decision and Command. Hourly news, YouTube and social media monitoring, alerts and board-ready reports. Start a free 14-day trial, no card needed.",
    },
    id: {
      title: "Harga Media Monitoring: Paket Mulai Rp 5 Juta per Bulan",
      description: "Paket Narriv untuk brand, agensi, dan instansi di Indonesia: Pilot, Intelligence, Decision, dan Command. Pemantauan berita, YouTube, dan media sosial setiap jam, peringatan, dan laporan siap direksi. Coba gratis 14 hari tanpa kartu kredit.",
    },
  },
  "/help": {
    en: {
      title: "Help Center: How Narriv Monitoring, Alerts and Reports Work",
      description: "Answers about Narriv: getting started, monitoring keywords and sources, risk scores, alerts, reports, team access and billing. Contact the Narriv team by email or WhatsApp.",
    },
    id: {
      title: "Pusat Bantuan: Cara Kerja Pemantauan, Peringatan, dan Laporan Narriv",
      description: "Jawaban seputar Narriv: memulai, kata kunci dan sumber pemantauan, skor risiko, peringatan, laporan, akses tim, dan pembayaran. Hubungi tim Narriv lewat email atau WhatsApp.",
    },
  },
  "/privacy": {
    en: { title: "Privacy Policy", description: "How Narriv collects, uses and protects personal data, in line with Indonesia's Personal Data Protection Law (UU PDP)." },
    id: { title: "Kebijakan Privasi", description: "Cara Narriv mengumpulkan, menggunakan, dan melindungi data pribadi sesuai Undang-Undang Pelindungan Data Pribadi (UU PDP)." },
  },
  "/terms": {
    en: { title: "Terms of Service", description: "The terms for using Narriv: plans, the free trial, AI-generated output and public data sources." },
    id: { title: "Ketentuan Layanan", description: "Ketentuan penggunaan Narriv: paket, uji coba gratis, hasil yang dibuat AI, dan sumber data publik." },
  },
  "/blog": {
    en: {
      title: "Blog: Media Monitoring, Reputation and Crisis Management in Indonesia",
      description: "Practical guides on media monitoring, social listening, reputation risk, crisis response and AI visibility for brands and public institutions in Indonesia.",
    },
    id: {
      title: "Blog: Media Monitoring, Reputasi, dan Manajemen Krisis di Indonesia",
      description: "Panduan praktis tentang media monitoring, social listening, risiko reputasi, penanganan krisis, dan visibilitas di AI untuk brand dan instansi di Indonesia.",
    },
  },
};

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
export function organizationJsonLd(lang: "en" | "id" = "en") {
  const description = lang === "id" ? SITE_DESCRIPTION_ID : SITE_DESCRIPTION;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        legalName: "PT Primer Rectoverso Media",
        logo: `${SITE_URL}/logo-bulat-narriv-2026.png`,
        description,
        areaServed: "ID",
        // As published in the privacy policy.
        address: {
          "@type": "PostalAddress",
          streetAddress: "Cibis Nine Building, 11th floor, Jl. TB Simatupang No. 2, Cilandak Timur, Pasar Minggu",
          addressLocality: "Jakarta Selatan",
          addressRegion: "DKI Jakarta",
          postalCode: "12560",
          addressCountry: "ID",
        },
        contactPoint: { "@type": "ContactPoint", contactType: "sales", telephone: "+62-811-190-692", availableLanguage: ["en", "id"] },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description,
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
        description,
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
