import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { IntlProvider } from "@/components/providers/intl-provider";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Narriv | Narrative Intelligence",
    template: "%s | Narriv",
  },
  description: "Narriv membantu tim memantau sinyal publik, memahami narasi, dan menentukan aksi yang tepat.",
  applicationName: "Narriv",
  icons: {
    icon: "/narriv-logo.svg",
  },
  openGraph: {
    title: "Narriv | Narrative Intelligence",
    description: "Pantau sinyal publik, alert, laporan, dan rencana aksi dari satu command center.",
    siteName: "Narriv",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Narriv | Narrative Intelligence",
    description: "Pantau sinyal publik, alert, laporan, dan rencana aksi dari satu command center.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", poppins.variable, "font-sans")}
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
