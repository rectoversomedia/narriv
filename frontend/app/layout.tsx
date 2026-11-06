import type { Metadata } from "next";
import { Instrument_Serif, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { IntlProvider } from "@/components/providers/intl-provider";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// An editorial serif for accent lines on the public pages; the product itself stays on Poppins.
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  // New file names so browsers that cached the old round icon fetch the square "N." mark.
  icons: {
    icon: [
      { url: "/brand/favicon-n-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-n-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/brand/favicon-n-48.png",
    apple: "/brand/apple-icon-n-180.png",
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn("h-full", "antialiased", poppins.variable, serif.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
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
          </ReactQueryProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
