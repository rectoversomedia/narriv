"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUiStore, type AppLanguage } from "@/store/useUiStore";
import { localizedPath } from "@/lib/site-paths";

// On the public website the address decides the language (see site-paths.ts); everywhere else the reader's saved
// choice does.

const SiteLangContext = createContext<AppLanguage | null>(null);

/** The language the address sets, or null outside the public website. */
export function useSiteLanguage() {
  return useContext(SiteLangContext);
}

/** A link target in the page's own language: `href("/pricing")` is "/id/harga" on an Indonesian page. */
export function useSiteHref() {
  const lang = useSiteLanguage();
  return (path: string) => (lang ? localizedPath(path, lang) : path);
}

/**
 * Renders a public page in the language of its address and keeps the saved choice in step with it, so the app
 * opens in the same language. A reader who chose Indonesian before and lands on an English address is sent to the
 * Indonesian one (crawlers have no saved choice and always get the page they asked for).
 */
export function SiteLanguage({ lang, children }: { lang: AppLanguage; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // English is the default, so a saved "id" is always the reader's own choice.
    if (lang === "en" && useUiStore.getState().language === "id") {
      const target = localizedPath(pathname + window.location.hash, "id");
      if (target.split("#")[0] !== pathname) {
        router.replace(target);
        return;
      }
    }
    useUiStore.getState().setLanguage(lang);
  }, [lang, pathname, router]);
  return <SiteLangContext.Provider value={lang}>{children}</SiteLangContext.Provider>;
}
