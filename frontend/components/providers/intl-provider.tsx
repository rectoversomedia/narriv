"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState } from "react";
// @ts-ignore - next-intl v3 type mismatch with JSON imports
import en from "@/messages/en.json";
// @ts-ignore - next-intl v3 type mismatch with JSON imports
import id from "@/messages/id.json";
import { useUiStore, type AppLanguage } from "@/store/useUiStore";

const messages: Record<AppLanguage, typeof en> = { en, id };

export function IntlProvider({ children }: { children: ReactNode }) {
  const language = useUiStore((state) => state.language);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const activeLang = mounted ? language : "en";

  return (
    // @ts-ignore - next-intl v3 type compatibility
    <NextIntlClientProvider locale={activeLang} messages={messages[activeLang]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
