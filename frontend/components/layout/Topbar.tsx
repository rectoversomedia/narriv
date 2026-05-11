"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Languages, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { logoutSession } from "@/lib/api-service";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const theme = useUiStore((state) => state.theme);
  const logoSrc = theme === "light" ? "/narriv-logo-light.png" : "/narriv-logo-dark.png";
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const t = useTranslations("Topbar");

  const handleLogout = () => {
    if (refreshToken) void logoutSession(refreshToken);
    logout();
    router.replace("/login");
  };

  const handleLanguageToggle = () => {
    startTransition(() => {
      toggleLanguage();
    });
  };

  return (
    <header className="theme-shell theme-border sticky top-0 z-20 flex h-[76px] items-center justify-between border-b px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="md:hidden">
          <Image src={logoSrc} alt="Narriv" width={92} height={28} priority />
        </div>
        <button onClick={toggleSidebar} className="theme-border theme-hover theme-muted hidden h-11 w-11 items-center justify-center rounded-lg border hover:text-[#465FFF] md:flex" type="button" aria-label={t("toggleSidebar")}>
          <Menu size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="theme-border theme-hover theme-muted inline-flex h-10 w-[92px] items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold hover:text-[#465FFF]" type="button" aria-label={t("toggleTheme")}>
          {theme === "dark" ? <Moon size={15} className="shrink-0" /> : <Sun size={15} className="shrink-0" />}
          <span className="hidden min-w-10 text-center sm:inline">{theme === "dark" ? t("dark") : t("light")}</span>
        </button>
        <button onClick={handleLanguageToggle} className="theme-border theme-hover theme-muted inline-flex h-10 w-[74px] items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold hover:text-[#465FFF]" type="button" aria-label={t("toggleLanguage")}>
          <Languages size={15} />
          <span className="min-w-5 text-center">{t("language")}</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#465FFF] text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? "D"}
          </div>
          <div className="hidden text-sm xl:block">
            <p className="theme-text font-semibold leading-none">{user?.name ?? t("notSignedIn")}</p>
            <p className="theme-muted mt-1 text-xs">{user?.workspace ?? t("noWorkspace")}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="theme-hover theme-muted rounded-xl p-2 hover:text-[#465FFF]" title={t("logout")} type="button" aria-label={t("logout")}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
