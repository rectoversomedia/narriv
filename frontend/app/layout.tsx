import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { IntlProvider } from "@/components/providers/intl-provider";

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
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#101828] text-white">
        <IntlProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
