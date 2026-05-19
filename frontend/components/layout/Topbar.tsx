"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Bell, ChevronDown, Languages, LogOut, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

export function Topbar() {
  const router = useRouter();
  const t = useTranslations("DemoApp.topbar");
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur-xl sm:px-8 lg:px-10 xl:px-12">
      <label className="hidden h-[48px] w-full max-w-[530px] items-center gap-4 rounded-[8px] border border-border bg-slate-50 px-5 text-(--text-soft) lg:flex focus-within:border-[#465FFF]/50 focus-within:shadow-[0_0_10px_rgba(70,95,255,0.15)] transition-all">
        <Search size={20} className="text-(--text-muted)" />
        <input className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-(--text-muted) text-(--text)" placeholder={t("search")} />
      </label>
      <div className="flex flex-1 items-center justify-end gap-5">
        <button type="button" onClick={() => startTransition(toggleLanguage)} className="hidden items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-xs font-bold text-(--text-soft) transition hover:border-[#465FFF] hover:text-(--text) hover:shadow-[0_0_8px_rgba(70,95,255,0.1)] sm:flex">
          <Languages size={15} /> {language.toUpperCase()}
        </button>
        <button type="button" className="relative text-(--text) transition hover:text-[#465FFF]" aria-label={t("notifications")}>
          <Bell size={25} />
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#465FFF] text-[11px] font-bold text-white shadow-[0_0_8px_rgba(70,95,255,0.4)]">3</span>
        </button>
        <div className="hidden h-8 w-px bg-border sm:block" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-tr from-[#465FFF] to-[#8B5CFF] text-[16px] font-bold text-white shadow-[0_0_12px_rgba(70,95,255,0.3)]">TU</div>
          <div className="hidden sm:block">
            <p className="text-[15px] font-bold text-(--text)">Testing User</p>
            <p className="mt-1 text-[13px] font-semibold text-(--text-muted)">User Workspace</p>
          </div>
          <ChevronDown size={18} className="hidden sm:block text-(--text-muted)" />
        </div>
        <button type="button" onClick={handleLogout} className="rounded-xl p-2 text-(--text-muted) hover:bg-slate-100 hover:text-[#EF4444] transition-colors" aria-label={t("logout")} title={t("logout")}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
