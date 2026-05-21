"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Bell, ChevronDown, Languages, LogOut, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { alerts, text } from "@/lib/mock-data";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

const notificationToneClass = {
  red: "bg-[#EF4444] text-white",
  amber: "bg-[#F59E0B] text-white",
  purple: "bg-[#8B5CFF] text-white",
  green: "bg-[#10B981] text-white",
  blue: "bg-[#465FFF] text-white",
  slate: "bg-slate-500 text-white",
};

export function Topbar() {
  const router = useRouter();
  const t = useTranslations("DemoApp.topbar");
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const logout = useAuthStore((state) => state.logout);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = alerts.slice(0, 3);

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
        <button type="button" onClick={() => startTransition(toggleLanguage)} className="hidden items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-xs font-bold text-(--text-soft) transition-all duration-200 hover:border-[#465FFF] hover:text-(--text) hover:shadow-[0_0_8px_rgba(70,95,255,0.1)] active:scale-[0.98] sm:flex" aria-label="Switch language">
          <Languages size={15} />
          <span key={language} className="inline-block min-w-5 animate-in fade-in slide-in-from-bottom-1 duration-200">
            {language.toUpperCase()}
          </span>
        </button>
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-(--text) transition hover:bg-slate-100 hover:text-[#465FFF]"
            aria-label={t("notifications")}
          >
            <Bell size={24} />
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#465FFF] px-1 text-[11px] font-bold text-white shadow-[0_0_8px_rgba(70,95,255,0.4)]">{notifications.length}</span>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={12} className="w-[min(390px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-0">
            <PopoverHeader className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <PopoverTitle className="text-[15px] font-black text-slate-950">Notifikasi</PopoverTitle>
                  <PopoverDescription className="mt-1 text-xs font-semibold text-slate-500">
                    {notifications.length} alert terbaru membutuhkan perhatian.
                  </PopoverDescription>
                </div>
                <Badge variant="purple" className="rounded-full px-2.5 py-1 text-[11px] font-black">Live</Badge>
              </div>
            </PopoverHeader>

            <div className="max-h-[330px] overflow-y-auto p-2">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/alerts/${notification.id}`}
                  onClick={() => setNotificationsOpen(false)}
                  className="group grid grid-cols-[10px_1fr_auto] gap-3 rounded-[14px] p-3 transition hover:bg-slate-50"
                >
                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${notificationToneClass[notification.tone]}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950 group-hover:text-[#465FFF]">{text(notification.title, language)}</span>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{notification.source} - {text(notification.issue, language)}</span>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">{notification.id}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <Badge variant={notification.tone === "red" ? "red" : notification.tone === "amber" ? "amber" : "purple"} className="rounded-full text-[10px] font-black">
                      {notification.tone === "red" ? "Kritis" : notification.tone === "amber" ? "Warning" : "Info"}
                    </Badge>
                    <span className="mt-2 block text-[11px] font-bold text-slate-400">{notification.time}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 p-3">
              <Link
                href="/alerts"
                onClick={() => setNotificationsOpen(false)}
                className="flex h-10 w-full items-center justify-center rounded-[10px] border border-slate-200 bg-white text-xs font-black text-[#465FFF] transition hover:bg-[#465FFF]/5"
              >
                Lihat semua notifikasi
              </Link>
            </div>
          </PopoverContent>
        </Popover>
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
