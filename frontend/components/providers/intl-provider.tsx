"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect, useState } from "react";
import en from "@/messages/en.json";
import id from "@/messages/id.json";
import { useUiStore, type AppLanguage } from "@/store/useUiStore";

// Type for messages - using any to bypass strict typing issues between v3 and v4
const messages: Record<AppLanguage, Record<string, unknown>> = { en, id };

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
    <NextIntlClientProvider locale={activeLang} messages={messages[activeLang] as Parameters<typeof NextIntlClientProvider>[0]["messages"]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
