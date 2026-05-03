import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "dark" | "light";
export type AppLanguage = "en" | "id";

type UiState = {
  theme: AppTheme;
  language: AppLanguage;
  sidebarCollapsed: boolean;
  setTheme: (theme: AppTheme) => void;
  setLanguage: (language: AppLanguage) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      language: "en",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleLanguage: () => set((state) => ({ language: state.language === "en" ? "id" : "en" })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "narriv-ui-settings" }
  )
);
