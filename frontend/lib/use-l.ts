import { useUiStore } from "@/store/useUiStore";

/** Inline bilingual copy for small, component-local strings: `L("English", "Indonesia")` follows the UI language. */
export function useL() {
  const language = useUiStore((state) => state.language);
  return <T = string>(en: T, id: T): T => (language === "id" ? id : en);
}

/** Non-hook variant for helpers that run during render (reads the current language). */
export function pickL(en: string, id: string) {
  return useUiStore.getState().language === "id" ? id : en;
}
