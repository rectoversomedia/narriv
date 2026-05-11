"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useEffect } from "react";
import en from "@/messages/en.json";
import id from "@/messages/id.json";
import { useUiStore, type AppLanguage } from "@/store/useUiStore";

const messages: Record<AppLanguage, typeof en> = { en, id };

export function IntlProvider({ children }: { children: ReactNode }) {
  const language = useUiStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <NextIntlClientProvider locale={language} messages={messages[language]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
