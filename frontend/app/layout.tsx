import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { IntlProvider } from "@/components/providers/intl-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Narriv | Narrative Intelligence",
  description: "Narrative intelligence command center preview.",
  icons: {
    icon: "/narriv-logo.svg",
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
      className={cn("h-full", "antialiased", outfit.variable, "font-sans", geist.variable)}
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
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--text)]">
        <IntlProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
