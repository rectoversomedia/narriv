"use client";

import { useEffect, useState } from "react";

/**
 * App theme (light, dark, or follow the device), chosen in Settings and kept per browser. Dark mode is the class
 * html.dark (app/dark.css), applied only inside the app: the public site stays light.
 */
export type ThemeChoice = "light" | "dark" | "system";
const KEY = "narriv-theme";
const EVENT = "narriv-theme-change";

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

export function setTheme(choice: ThemeChoice) {
  try { localStorage.setItem(KEY, choice); } catch { /* private window: this page only */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: choice }));
}

const isDark = (c: ThemeChoice) => c === "dark" || (c === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

/** Keeps html.dark in sync with the choice while the app is open; removes it when leaving the app. */
export function useApplyTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { const dark = isDark(readTheme()); root.classList.toggle("dark", dark); root.style.colorScheme = dark ? "dark" : "light"; };
    apply();
    window.addEventListener(EVENT, apply);
    window.addEventListener("storage", apply);
    media.addEventListener("change", apply);
    return () => {
      window.removeEventListener(EVENT, apply);
      window.removeEventListener("storage", apply);
      media.removeEventListener("change", apply);
      root.classList.remove("dark");
      root.style.colorScheme = "";
    };
  }, []);
}

export function useThemeChoice(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>("light");
  useEffect(() => {
    setChoice(readTheme());
    const on = () => setChoice(readTheme());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [choice, setTheme];
}
