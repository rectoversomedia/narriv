"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Languages, LogOut, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { alerts, intelligenceClusters, text } from "@/lib/mock-data";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { logoutSession } from "@/lib/api-service";

const notificationToneClass = {
  red: "bg-[#EF4444] text-white",
  amber: "bg-[#F59E0B] text-white",
  purple: "bg-[#8B5CFF] text-white",
  green: "bg-[#10B981] text-white",
  blue: "bg-[#465FFF] text-white",
  slate: "bg-slate-500 text-white",
};

type SearchResult = {
  type: "alert" | "narrative" | "nav";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone?: string;
};

const navLinks = [
  { title: "Dashboard", href: "/", subtitle: "Command Center" },
  { title: "Signals", href: "/signals", subtitle: "Sinyal digital" },
  { title: "Alerts", href: "/alerts", subtitle: "Alert prioritas" },
  { title: "Visibility", href: "/visibility", subtitle: "AI Visibility" },
  { title: "Intelligence", href: "/intelligence", subtitle: "Peta narasi" },
  { title: "Reports", href: "/reports", subtitle: "Laporan" },
  { title: "Action Plans", href: "/action-plans", subtitle: "Pusat tindakan" },
  { title: "Sources", href: "/workspace/sources", subtitle: "Sumber data" },
  { title: "Settings", href: "/workspace/settings", subtitle: "Pengaturan" },
];

function searchItems(query: string, language: string): SearchResult[] {
  const q = query.toLowerCase();
  if (q.length < 2) return [];

  const results: SearchResult[] = [];

  alerts.forEach((alert) => {
    const title = text(alert.title, language);
    const issue = text(alert.issue, language);
    if (title.toLowerCase().includes(q) || issue.toLowerCase().includes(q) || alert.source.toLowerCase().includes(q)) {
      results.push({
        type: "alert",
        id: alert.id,
        title,
        subtitle: `${alert.source} · ${issue}`,
        href: `/alerts/${alert.id}`,
        tone: alert.tone,
      });
    }
  });

  intelligenceClusters.forEach((cluster) => {
    const topic = text(cluster.topic, language);
    const desc = text(cluster.description, language);
    if (topic.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
      results.push({
        type: "narrative",
        id: cluster.id,
        title: topic,
        subtitle: `${cluster.signals} signals · ${cluster.growth}`,
        href: "/intelligence",
        tone: cluster.tone,
      });
    }
  });

  navLinks.forEach((nav) => {
    if (nav.title.toLowerCase().includes(q) || nav.subtitle.toLowerCase().includes(q)) {
      results.push({
        type: "nav",
        id: nav.href,
        title: nav.title,
        subtitle: nav.subtitle,
        href: nav.href,
      });
    }
  });

  return results.slice(0, 8);
}

const typeLabel: Record<string, string> = {
  alert: "Alert",
  narrative: "Narasi",
  nav: "Halaman",
};

const typeColor: Record<string, string> = {
  alert: "bg-[#EF4444]/10 text-[#EF4444]",
  narrative: "bg-[#8B5CFF]/10 text-[#8B5CFF]",
  nav: "bg-[#465FFF]/10 text-[#465FFF]",
};

export function Topbar() {
  const router = useRouter();
  const t = useTranslations("DemoApp.topbar");
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const logout = useAuthStore((state) => state.logout);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = alerts.slice(0, 3);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearchResults(searchItems(searchQuery, language));
        setSearchOpen(true);
      } else {
        setSearchResults([]);
        setSearchOpen(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, language]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      await logoutSession(refreshToken).catch(() => {});
    }
    logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur-xl sm:px-8 lg:px-10 xl:px-12">
      <div ref={searchRef} className="relative hidden w-full max-w-[530px] lg:block">
        <label className="flex h-[48px] items-center gap-4 rounded-[8px] border border-border bg-slate-50 px-5 text-(--text-soft) focus-within:border-[#465FFF]/50 focus-within:shadow-[0_0_10px_rgba(70,95,255,0.15)] transition-all">
          <Search size={20} className="text-(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim() && searchResults.length > 0) setSearchOpen(true); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); inputRef.current?.blur(); } }}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-(--text-muted) text-(--text)"
            placeholder={t("search")}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </label>

        {searchOpen && searchResults.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="max-h-[400px] overflow-y-auto p-2">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => handleResultClick(result.href)}
                  className="group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${typeColor[result.type]}`}>
                    {typeLabel[result.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-slate-900 group-hover:text-[#465FFF]">{result.title}</span>
                    <span className="block truncate text-[11px] font-semibold text-slate-400">{result.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-center text-[11px] font-bold text-slate-400">
                {searchResults.length} hasil ditemukan
              </p>
            </div>
          </div>
        )}

        {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[14px] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <Search size={24} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-bold text-slate-500">Tidak ada hasil untuk &quot;{searchQuery}&quot;</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">Coba kata kunci lain</p>
          </div>
        )}
      </div>

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
