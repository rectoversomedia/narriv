"use client";

import Image from "next/image";
import { isPageHidden, useWorkspaceUseCase } from "@/lib/use-case";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, CircleHelp, Inbox, LogOut, Search, Settings, ShieldCheck, WifiOff, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { getAdminMe, logoutSession, getNotifications, getAlerts, getNarratives, markNotificationAsRead, markAllNotificationsAsRead, type AppNotification, type Alert as ApiAlert, type NarrativeRecord, type NotificationsResponse } from "@/lib/api-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSSEContext } from "@/components/providers/SSEProvider";
import { ROLE_LABEL, WorkspaceOptions, useMyWorkspaces } from "@/components/layout/workspace-switcher";
import { useL } from "@/lib/use-l";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";


const notificationToneClass = {
  red: "bg-[#C81E1E] text-white",
  amber: "bg-[#B45309] text-white",
  purple: "bg-[#8B5CFF] text-white",
  green: "bg-[#047857] text-white",
  blue: "bg-[#465FFF] text-white",
  slate: "bg-slate-500 text-white",
};

type NotificationTone = keyof typeof notificationToneClass;

type SearchResult = {
  type: "alert" | "narrative" | "nav";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone?: string;
};

// Pages the search box can jump to: title and subtitle in both languages, matched against either.
const navLinks = [
  { href: "/", title: { en: "Today", id: "Hari Ini" }, subtitle: { en: "Summary and today's decisions", id: "Ringkasan dan keputusan hari ini" } },
  { href: "/brief", title: { en: "Daily brief", id: "Briefing harian" }, subtitle: { en: "Today", id: "Hari Ini" } },
  { href: "/insights", title: { en: "Analysis", id: "Analisis" }, subtitle: { en: "Today", id: "Hari Ini" } },
  { href: "/signals", title: { en: "Conversations", id: "Percakapan" }, subtitle: { en: "Issues", id: "Isu" } },
  { href: "/intelligence", title: { en: "Issue map", id: "Peta isu" }, subtitle: { en: "Issues", id: "Isu" } },
  { href: "/opportunities", title: { en: "Opportunities", id: "Peluang" }, subtitle: { en: "Issues", id: "Isu" } },
  { href: "/timeline", title: { en: "Timeline", id: "Kronologi" }, subtitle: { en: "Issues", id: "Isu" } },
  { href: "/alerts", title: { en: "Alerts", id: "Peringatan" }, subtitle: { en: "Follow-up", id: "Tindak Lanjut" } },
  { href: "/action-center", title: { en: "Recommendations", id: "Rekomendasi" }, subtitle: { en: "Today", id: "Hari Ini" } },
  { href: "/action-plans", title: { en: "Action plans", id: "Rencana aksi" }, subtitle: { en: "Follow-up", id: "Tindak Lanjut" } },
  { href: "/workspace/cases", title: { en: "Cases", id: "Kasus" }, subtitle: { en: "Follow-up", id: "Tindak Lanjut" } },
  { href: "/reports", title: { en: "Reports", id: "Laporan" }, subtitle: { en: "Reports", id: "Laporan" } },
  { href: "/visibility", title: { en: "AI answers", id: "Jawaban AI" }, subtitle: { en: "Issues", id: "Isu" } },
  { href: "/workspace/settings", title: { en: "Settings", id: "Pengaturan" }, subtitle: { en: "Keywords, team, notifications", id: "Kata kunci, tim, notifikasi" } },
  { href: "/workspace/sources", title: { en: "Data sources", id: "Sumber data" }, subtitle: { en: "Settings", id: "Pengaturan" } },
  { href: "/workspace/integrations", title: { en: "Notification channels", id: "Saluran notifikasi" }, subtitle: { en: "Settings", id: "Pengaturan" } },
  { href: "/workspace/activity", title: { en: "Activity history", id: "Riwayat aktivitas" }, subtitle: { en: "Settings", id: "Pengaturan" } },
];

const typeLabel: Record<string, string> = {
  alert: "Alert",
  narrative: "Narasi",
  nav: "Halaman",
};

const typeColor: Record<string, string> = {
  alert: "bg-[#EF4444]/10 text-[#C81E1E]",
  narrative: "bg-[#8B5CFF]/10 text-[#6E44E8]",
  nav: "bg-[#465FFF]/10 text-[#3B52F5]",
};

const notificationsQueryKey = ["notifications"] as const;

function formatNotificationTime(createdAt: string, nowMs: number, locale: string) {
  if (!nowMs) return "";
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMs = timestamp - nowMs;
  const absMs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absMs < 60 * 1000) return formatter.format(Math.round(diffMs / 1000), "second");
  if (absMs < 60 * 60 * 1000) return formatter.format(Math.round(diffMs / (60 * 1000)), "minute");
  if (absMs < 24 * 60 * 60 * 1000) return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  if (absMs < 7 * 24 * 60 * 60 * 1000) return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");

  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(timestamp);
}

function getNotificationMeta(type: string) {
  if (type.includes("alert")) return { dotTone: "red" as NotificationTone, badgeVariant: "red" as const, label: "Alert" };
  if (type.includes("report")) return { dotTone: "green" as NotificationTone, badgeVariant: "green" as const, label: "Report" };
  if (type.includes("action")) return { dotTone: "purple" as NotificationTone, badgeVariant: "purple" as const, label: "Action" };
  if (type.includes("system")) return { dotTone: "amber" as NotificationTone, badgeVariant: "amber" as const, label: "System" };
  return { dotTone: "blue" as NotificationTone, badgeVariant: "default" as const, label: "Info" };
}

function NotificationState({ icon: _Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="mt-3 text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 max-w-[260px] text-xs font-semibold leading-relaxed text-[#5A6478]">{description}</p>
      {action}
    </div>
  );
}

const initials = (name?: string | null) => {
  const parts = (name || "User").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "U") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/**
 * The signed-in person: initials and name, opening their role, account links and sign-out. Sign-out sits inside
 * the menu so it is never one stray click away. Phones, which have no sidebar, also switch workspace here.
 */
function AccountMenu({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  const L = useL();
  const [open, setOpen] = useState(false);
  const { isDemo, current } = useMyWorkspaces();
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  // The admin panel link shows only for the Narriv team (the backend decides).
  const isAdmin = useQuery({ queryKey: ["admin", "me"], queryFn: getAdminMe, enabled: !isDemo, staleTime: 5 * 60 * 1000 }).data === true;
  const role = isDemo ? L("Demo visitor", "Pengunjung demo") : current?.role && ROLE_LABEL[current.role] ? L(...ROLE_LABEL[current.role]) : L("Member", "Anggota");
  const item = "flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] font-semibold text-[#31406B] transition hover:bg-slate-50 hover:text-[#101334]";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger type="button" aria-label={L("Account", "Akun")} className="flex h-10 items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-2 transition hover:bg-[#EEF1F7]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#465FFF] to-[#8B5CFF] text-[12px] font-black text-white">{initials(name)}</span>
        <span className="hidden min-w-0 max-w-[160px] text-left sm:block">
          <span className="block truncate text-[13px] font-black leading-tight text-[#101334]">{name}</span>
          <span className="block truncate text-[11px] font-semibold leading-tight text-[#5A6478]">{role}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" className="hidden shrink-0 text-[#8A93AD] sm:block" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(300px,calc(100vw-2rem))] gap-0 rounded-[14px] border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)] ring-0">
        <div className="px-2.5 pb-2.5 pt-1.5">
          <p className="truncate text-[14px] font-black text-[#101334]">{name}</p>
          {email ? <p className="truncate text-[12px] text-[#5A6478]">{email}</p> : null}
          <span className="mt-1.5 inline-block rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[11px] font-bold text-[#3B52F5]">{role}</span>
        </div>
        {!isDemo ? <div className="border-t border-slate-100 pt-1 lg:hidden"><WorkspaceOptions onDone={() => setOpen(false)} /></div> : null}
        {/* The language toggle is hidden in the bar on phones; it lives here instead. */}
        <div className="flex items-center justify-between border-t border-slate-100 px-2.5 py-2 sm:hidden">
          <span className="text-[13px] font-semibold text-[#31406B]">{L("Language", "Bahasa")}</span>
          <div role="group" aria-label={L("Language", "Bahasa")} className="flex rounded-[9px] bg-[#EEF1F7] p-0.5">
            {(["id", "en"] as const).map((code) => (
              <button key={code} type="button" aria-pressed={language === code} onClick={() => { if (language !== code) startTransition(toggleLanguage); }} className={`h-7 min-w-[36px] rounded-[7px] px-2 text-[12px] font-black ${language === code ? "bg-white text-[#101334] shadow-sm" : "text-[#5A6478]"}`}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 py-1">
          <Link href="/workspace/settings" onClick={() => setOpen(false)} className={item}><Settings size={16} aria-hidden="true" />{L("Settings", "Pengaturan")}</Link>
          <Link href="/help" onClick={() => setOpen(false)} className={item}><CircleHelp size={16} aria-hidden="true" />{L("Help", "Bantuan")}</Link>
          {isAdmin ? <Link href="/admin" onClick={() => setOpen(false)} className={`${item} text-[#3B52F5]`}><ShieldCheck size={16} aria-hidden="true" />{L("Admin panel", "Admin panel")}</Link> : null}
        </div>
        <div className="border-t border-slate-100 pt-1">
          <button type="button" onClick={() => { setOpen(false); onLogout(); }} className={`${item} text-[#C81E1E] hover:bg-[#FDECEC] hover:text-[#B42318]`}>
            <LogOut size={16} aria-hidden="true" />
            {L("Sign out", "Keluar")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Topbar() {
  const { useCase } = useWorkspaceUseCase();
  const L = useL();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("DemoApp.topbar");
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationNow, setNotificationNow] = useState(0);

  // SSE connection status for Live indicator
  const { status: sseStatus } = useSSEContext();
  
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  
  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => getNotifications(1, 50),
    enabled: !!token,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueryData<NotificationsResponse | null>(notificationsQueryKey);
      queryClient.setQueryData<NotificationsResponse | null>(notificationsQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((notification) => ({ ...notification, isRead: true })),
          meta: { ...current.meta, unreadCount: 0 },
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(notificationsQueryKey, context?.previous ?? null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueryData<NotificationsResponse | null>(notificationsQueryKey);
      queryClient.setQueryData<NotificationsResponse | null>(notificationsQueryKey, (current) => {
        if (!current) return current;
        const target = current.data.find((notification) => notification.id === id);
        const unreadCount = target && !target.isRead ? Math.max(0, current.meta.unreadCount - 1) : current.meta.unreadCount;
        return {
          ...current,
          data: current.data.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification),
          meta: { ...current.meta, unreadCount },
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(notificationsQueryKey, context?.previous ?? null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
  });

  // Notifications refresh by polling (refetchInterval above). A live stream kept a backend function open for
  // every tab, which is billed continuously on Vercel.

  const notifData = notificationsQuery.data?.data || [];
  const unreadCount = notificationsQuery.data?.meta?.unreadCount || 0;
  const unreadBadge = unreadCount > 99 ? "99+" : String(unreadCount);
  const notificationsUnavailable = !!token && notificationsQuery.isFetched && notificationsQuery.data === null;
  const isNotificationsLoading = !!token && notificationsQuery.isPending;


  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Phones have no room for the search box in the bar: the search button opens it below the bar.
  const [mobileSearch, setMobileSearch] = useState(false);

  const searchAlertsQuery = useQuery({
    queryKey: ["search-alerts", { q: searchQuery }],
    queryFn: () => (searchQuery.trim().length >= 2 ? getAlerts({ limit: 20 }) : Promise.resolve(null)),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30 * 1000,
  });
  const searchNarrativesQuery = useQuery({
    queryKey: ["search-narratives", { q: searchQuery }],
    queryFn: () => (searchQuery.trim().length >= 2 ? getNarratives({ limit: 20 }) : Promise.resolve(null)),
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchQuery.trim().toLowerCase();
      if (q.length >= 2) {
        const results: SearchResult[] = [];
        const liveAlerts = (searchAlertsQuery.data?.data || []) as ApiAlert[];
        liveAlerts.forEach((alert) => {
          if (alert.title?.toLowerCase().includes(q)) {
            results.push({
              type: "alert",
              id: alert.id,
              title: alert.title,
              subtitle: `${alert.severity} · ${alert.status}`,
              href: `/alerts/${alert.id}`,
              tone: alert.severity === "critical" ? "red" : "amber",
            });
          }
        });
        const liveNarratives = (searchNarrativesQuery.data?.data || []) as NarrativeRecord[];
        liveNarratives.forEach((n) => {
          if (n.title?.toLowerCase().includes(q)) {
            results.push({
              type: "narrative",
              id: n.id,
              title: n.title,
              subtitle: `${n.signalCount} signals`,
              href: "/intelligence",
              tone: n.sentiment === "negative" ? "red" : "purple",
            });
          }
        });
        navLinks.forEach((nav) => {
          if (isPageHidden(nav.href, useCase)) return; // pages that do not apply to this workspace
          const lang = language === "id" ? "id" : "en";
          const words = [nav.title.en, nav.title.id, nav.subtitle.en, nav.subtitle.id].join(" ").toLowerCase();
          if (words.includes(q)) {
            results.push({ type: "nav", id: nav.href, title: nav.title[lang], subtitle: nav.subtitle[lang], href: nav.href });
          }
        });
        setSearchResults(results.slice(0, 8));
        setSearchOpen(true);
      } else {
        setSearchResults([]);
        setSearchOpen(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, language, searchAlertsQuery.data, searchNarrativesQuery.data, useCase]);

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
    setMobileSearch(false);
    router.push(href);
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setNotificationsOpen(open);
    if (open) setNotificationNow(Date.now());
  };

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      await logoutSession(refreshToken).catch(() => {});
    }
    logout();
    useWorkspaceStore.getState().setSelectedWorkspaceId(null);
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-[100] grid h-[88px] grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background/60 px-5 backdrop-blur-xl sm:px-8 lg:flex lg:justify-between lg:px-10 xl:px-12">
      {/* Phones: search on the left, the brand centred, alerts and account on the right. */}
      <button
        type="button"
        onClick={() => { setMobileSearch((v) => !v); setTimeout(() => inputRef.current?.focus(), 0); }}
        aria-label={L("Search", "Cari")}
        aria-expanded={mobileSearch}
        className="flex size-10 items-center justify-center justify-self-start rounded-[10px] bg-[#EEF1F7] text-[#31406B] lg:hidden"
      >
        {mobileSearch ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
      </button>
      <Link href="/" className="flex shrink-0 items-center justify-self-center lg:hidden" aria-label="Narriv dashboard">
        <Image src="/brand/logo-h.webp" alt="Narriv" width={96} height={36} priority unoptimized className="h-8 w-auto object-contain" />
      </Link>
      <div ref={searchRef} className={`lg:relative lg:block lg:w-full lg:max-w-[530px] ${mobileSearch ? "fixed inset-x-4 top-[96px] z-[110] block rounded-[12px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]" : "hidden"}`}>
        <label className="flex h-[48px] items-center gap-4 rounded-[8px] border border-border bg-slate-50 px-5 text-[var(--text-soft)] focus-within:border-[#465FFF]/50 focus-within: transition-all">
          <Search size={20} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim() && searchResults.length > 0) setSearchOpen(true); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); inputRef.current?.blur(); } }}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[var(--text-muted)] text-[var(--text)]"
            placeholder={t("search")}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="text-[#5A6478] hover:text-slate-600">
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
                    <span className="block truncate text-[13px] font-bold text-slate-900 group-hover:text-[#3B52F5]">{result.title}</span>
                    <span className="block truncate text-[11px] font-semibold text-[#5A6478]">{result.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-center text-[11px] font-bold text-[#5A6478]">
                {L(`${searchResults.length} results`, `${searchResults.length} hasil ditemukan`)}
              </p>
            </div>
          </div>
        )}

        {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[14px] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <p className="mt-2 text-[13px] font-bold text-[#5A6478]">{L(`No results for "${searchQuery}"`, `Tidak ada hasil untuk "${searchQuery}"`)}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#5A6478]">{L("Try another word", "Coba kata kunci lain")}</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        {/* Live connection status indicator */}
        {/* Only claim live updates while the event stream is actually connected. */}
        {sseStatus === "connected" ? <LiveIndicator status={sseStatus} /> : null}
        {/* Ask Narriv sits here rather than floating over the page, so it never covers a table or a button. */}
        <Link
          href="/ask"
          aria-label="Ask Narriv"
          aria-current={pathname?.startsWith("/ask") ? "page" : undefined}
          className="hidden h-10 shrink-0 items-center gap-2 rounded-[10px] bg-[#101334] pl-1.5 pr-3.5 text-[12.5px] font-black text-white transition hover:bg-[#2B2F9E] lg:inline-flex"
        >
          <Image src="/brand/logo-bulat.webp" alt="" width={28} height={28} unoptimized className="size-7 rounded-full object-cover" />
          <span>Ask Narriv</span>
        </Link>
        {/* Both languages visible; the active one is filled, a click switches. */}
        <div role="group" aria-label="Language" className="hidden h-10 items-center rounded-[10px] bg-[#EEF1F7] p-1 sm:flex">
          {(["id", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={language === code}
              onClick={() => { if (language !== code) startTransition(toggleLanguage); }}
              className={`h-8 min-w-[38px] rounded-[8px] px-2.5 text-[12px] font-black transition ${language === code ? "bg-white text-[#101334] shadow-sm" : "text-[#5A6478] hover:text-[#101334]"}`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
          <PopoverTrigger
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EEF1F7] text-[#101334] transition hover:bg-[#E3E7F1] hover:text-[#3B52F5]"
            aria-label={t("notifications")}
          >
            <Bell size={18} strokeWidth={2.2} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C81E1E] px-1 text-[10px] font-black text-white ring-2 ring-white">
                {unreadBadge}
              </span>
            ) : null}
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={12} className="w-[min(390px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-0">
            <PopoverHeader className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PopoverTitle className="text-[15px] font-black text-slate-950">{t("notificationsTitle")}</PopoverTitle>
                  </div>
                  <PopoverDescription className="mt-1 text-xs font-semibold text-[#5A6478]">
                    {unreadCount > 0 ? t("notificationsUnread", { count: unreadCount }) : t("notificationsAllCaughtUp")}
                  </PopoverDescription>
                </div>
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={unreadCount === 0 || markAllRead.isPending}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-[#3B52F5] transition hover:bg-[#465FFF]/5 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {markAllRead.isPending ? t("notificationsMarking") : t("notificationsMarkAll")}
                </button>
              </div>
            </PopoverHeader>

            <div className="max-h-[330px] overflow-y-auto p-2">
              {!token ? (
                <NotificationState icon={Bell} title={t("notificationsAuthTitle")} description={t("notificationsAuthDesc")} />
              ) : isNotificationsLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-[10px_1fr_56px] gap-3 rounded-[14px] p-3">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <span className="space-y-2">
                        <span className="block h-3 w-3/4 rounded-full bg-slate-100" />
                        <span className="block h-3 w-full rounded-full bg-slate-100" />
                      </span>
                      <span className="h-5 rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : notificationsUnavailable ? (
                <NotificationState
                  icon={WifiOff}
                  title={t("notificationsErrorTitle")}
                  description={t("notificationsErrorDesc")}
                  action={
                    <button
                      type="button"
                      onClick={() => notificationsQuery.refetch()}
                      className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-[12px] font-black text-[#3B52F5] transition hover:bg-[#465FFF]/5"
                    >
                      {t("notificationsRetry")}
                    </button>
                  }
                />
              ) : notifData.length === 0 ? (
                <NotificationState icon={Inbox} title={t("notificationsEmptyTitle")} description={t("notificationsEmptyDesc")} />
              ) : notifData.map((notification: AppNotification) => {
                const meta = getNotificationMeta(notification.type);
                const href = notification.link && notification.link.startsWith("/") ? notification.link : "/alerts";
                return (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => {
                      if (!notification.isRead) markRead.mutate(notification.id);
                      setNotificationsOpen(false);
                    }}
                    className={`group grid grid-cols-[10px_1fr_auto] gap-3 rounded-[14px] p-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#465FFF]/30 ${notification.isRead ? "opacity-65" : "bg-[#F8FAFF]"}`}
                  >
                    <span className={`mt-2 h-2.5 w-2.5 rounded-full ${notification.isRead ? "bg-slate-300" : notificationToneClass[meta.dotTone]}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950 group-hover:text-[#3B52F5]">{notification.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#5A6478] line-clamp-2">{notification.message}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Badge variant={meta.badgeVariant} className="rounded-full text-[10px] font-black">
                        {meta.label}
                      </Badge>
                      <span className="mt-2 block text-[11px] font-bold text-[#5A6478]">
                        {formatNotificationTime(notification.createdAt, notificationNow || Date.now(), language === "id" ? "id" : "en")}
                      </span>
                    </span>
                  </Link>
                )})}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 p-3">
              <Link
                href="/workspace/activity"
                onClick={() => setNotificationsOpen(false)}
                className="flex h-10 w-full items-center justify-center rounded-[10px] border border-slate-200 bg-white text-xs font-black text-[#3B52F5] transition hover:bg-[#465FFF]/5"
              >
                {t("notificationsViewAll")}
              </Link>
            </div>
          </PopoverContent>
        </Popover>
        <AccountMenu name={user?.name || "User"} email={user?.email ?? ""} onLogout={handleLogout} />
      </div>
    </header>
  );
}
