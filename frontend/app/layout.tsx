import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { IntlProvider } from "@/components/providers/intl-provider";
import { ToastProvider } from "@/components/ui/toast";
import { LaunchOverlay } from "@/components/launch/launch-overlay";
import { LAUNCH_BOOT_SCRIPT } from "@/lib/launch";
import { cn } from "@/lib/utils";

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
const OG_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Narriv: tahu isu brand Anda sebelum jadi viral" };

export const metadata: Metadata = {
  metadataBase: new URL("https://www.narriv.digital"),
  title: {
    default: "Narriv | Narrative Intelligence",
    template: "%s | Narriv",
  },
  description: "Narriv membantu tim memantau percakapan publik, memahami narasi, dan menentukan aksi yang tepat.",
  applicationName: "Narriv",
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
    title: "Narriv | Narrative Intelligence",
    description: "Pantau percakapan publik, alert, laporan, dan rencana aksi dari satu command center.",
    siteName: "Narriv",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Narriv | Narrative Intelligence",
    description: "Pantau percakapan publik, alert, laporan, dan rencana aksi dari satu command center.",
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
      lang="id"
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
          </ReactQueryProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
