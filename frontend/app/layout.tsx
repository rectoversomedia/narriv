import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { IntlProvider } from "@/components/providers/intl-provider";
import { ToastProvider } from "@/components/ui/toast";
import { LaunchOverlay } from "@/components/launch/launch-overlay";
import { Analytics } from "@/components/analytics/analytics";
import { LAUNCH_BOOT_SCRIPT } from "@/lib/launch";
import { cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo";

// Narriv's type: Plus Jakarta Sans for everything people read, JetBrains Mono for the machine's voice (timestamps,
// counts, status stamps), so data reads as data.
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

// The picture shown when a Narriv link is shared (WhatsApp, LinkedIn, X).
const OG_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Narriv: detect reputational risk before it escalates" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Narriv",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Business Software",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Search Console and Bing Webmaster Tools ownership, set as Vercel env vars once the sites are added there.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
  // The round Narriv orb (public/logo-bulat-narriv-2026.png, cropped square); new file names so browsers drop cached icons.
  icons: {
    icon: [
      { url: "/brand/favicon-orb-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-orb-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-orb-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/brand/favicon-orb-48.png",
    apple: "/brand/apple-orb-round-180.png",
  },
  // Opened from the home screen, iOS shows Narriv full screen without the browser bars.
  appleWebApp: { capable: true, title: "Narriv", statusBarStyle: "default" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    alternateLocale: ["id_ID"],
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", sans.variable, mono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        {/* Older iPhones read this tag, not the manifest, to open the home-screen shortcut without browser bars. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Before first paint: a reload that is part of the sign-in launch starts behind the launch screen. */}
        <script dangerouslySetInnerHTML={{ __html: LAUNCH_BOOT_SCRIPT }} />
        {process.env.NODE_ENV === "development" ? (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        ) : null}
      </head>
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--text)]" suppressHydrationWarning>
        <IntlProvider>
          <ReactQueryProvider>
            <ToastProvider>{children}</ToastProvider>
            <LaunchOverlay />
            <Analytics />
          </ReactQueryProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
