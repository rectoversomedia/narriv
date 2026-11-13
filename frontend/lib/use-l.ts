import { useSiteLanguage } from "@/lib/site-lang";
import { useUiStore } from "@/store/useUiStore";

/**
 * Inline bilingual copy for small, component-local strings: `L("English", "Indonesia")` follows the UI language,
 * or on the public website the language of the address.
 */
export function useL() {
  const saved = useUiStore((state) => state.language);
  const language = useSiteLanguage() ?? saved;
  return <T = string>(en: T, id: T): T => (language === "id" ? id : en);
}

/** Non-hook variant for helpers that run during render (reads the current language). */
export function pickL(en: string, id: string) {
  return useUiStore.getState().language === "id" ? id : en;
}
