import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLanguage = "en" | "id";

type UiState = {
  language: AppLanguage;
  sidebarCollapsed: boolean;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      language: "en",
      sidebarCollapsed: false,
      setLanguage: (language) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({ language: state.language === "en" ? "id" : "en" })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "narriv-ui-settings" },
  ),
);
