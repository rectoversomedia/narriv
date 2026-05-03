"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Languages, LogOut, Menu, Moon, Search, Sun } from "lucide-react";
import { getCopy } from "@/lib/i18n";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useUiStore((state) => state.theme);
  const language = useUiStore((state) => state.language);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const t = getCopy(language);

  const handleLogout = () => {
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
          <Image src="/narriv-logo-dark.png" alt="Narriv" width={92} height={28} priority />
        </div>
        <button onClick={toggleSidebar} className="theme-border theme-muted hidden h-11 w-11 items-center justify-center rounded-lg border transition-colors hover:text-[#465FFF] md:flex" type="button" aria-label="Toggle sidebar">
          <Menu size={18} />
        </button>
        <div className="theme-card theme-muted hidden w-[430px] items-center rounded-[10px] border px-[18px] py-3 text-[13px] lg:flex">
          <Search size={16} className="mr-2" />
          {t.common.search}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="theme-border theme-muted inline-flex h-10 w-[92px] items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors hover:text-[#465FFF]" type="button">
          {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
          <span className="hidden sm:inline">{theme === "dark" ? t.common.dark : t.common.light}</span>
        </button>
        <button onClick={handleLanguageToggle} className="theme-border theme-muted inline-flex h-10 w-[74px] items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors hover:text-[#465FFF]" type="button" aria-label="Toggle language">
          <Languages size={15} />
          <span className="min-w-5 text-center">{t.common.language}</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#465FFF] text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? "D"}
          </div>
          <div className="hidden text-sm xl:block">
            <p className="theme-text font-semibold leading-none">{user?.name ?? "Demo User"}</p>
            <p className="theme-muted mt-1 text-xs">{user?.workspace ?? "Narriv Demo"}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="theme-muted rounded-xl p-2 transition-colors hover:bg-white/10 hover:text-[#465FFF]" title={t.common.logout} type="button">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
