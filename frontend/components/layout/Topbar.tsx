"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox, Languages, LogOut, RotateCw, Search, WifiOff, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { logoutSession, getNotifications, getAlerts, getNarratives, markNotificationAsRead, markAllNotificationsAsRead, type AppNotification, type Alert as ApiAlert, type NarrativeRecord, type NotificationsResponse } from "@/lib/api-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSSEContext } from "@/components/providers/SSEProvider";


const notificationToneClass = {
  red: "bg-[#EF4444] text-white",
  amber: "bg-[#F59E0B] text-white",
  purple: "bg-[#8B5CFF] text-white",
  green: "bg-[#10B981] text-white",
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

function NotificationState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-400">
        <Icon size={20} />
      </span>
      <p className="mt-3 text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 max-w-[260px] text-xs font-semibold leading-relaxed text-slate-400">{description}</p>
      {action}
    </div>
  );
}

export function Topbar() {
  const router = useRouter();
  const t = useTranslations("DemoApp.topbar");
  const language = useUiStore((state) => state.language);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationNow, setNotificationNow] = useState(0);
  const [notificationStreamStatus, setNotificationStreamStatus] = useState<"idle" | "connected" | "degraded">("idle");

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

  useEffect(() => {
    if (!token) {
      setNotificationStreamStatus("idle");
      return;
    }

    // SECURITY FIX: Tokens must NEVER be passed in URL query parameters
    // SSE connections should use HTTP headers or WebSocket with proper authentication
    // For now, we authenticate via the regular API and use a session cookie for SSE
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Use a dedicated SSE endpoint that reads from an HttpOnly session cookie
    // The backend should validate the session cookie instead of URL token
    const sseUrl = `${baseUrl.replace(/\/$/, "")}/api/notifications/stream`;

    const sse = new EventSource(sseUrl, { withCredentials: true });

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          setNotificationStreamStatus("connected");
          return;
        }
        if (data.type === "new_notification") {
          queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
        } else if (data.type === "dashboard_update") {
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }
      } catch {}
    };

    sse.onerror = () => {
      setNotificationStreamStatus("degraded");
    };

    return () => {
      sse.close();
    };
  }, [token, queryClient]);

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
          if (nav.title.toLowerCase().includes(q) || nav.subtitle.toLowerCase().includes(q)) {
            results.push({ type: "nav", id: nav.href, title: nav.title, subtitle: nav.subtitle, href: nav.href });
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
  }, [searchQuery, language, searchAlertsQuery.data, searchNarrativesQuery.data]);

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
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-[100] flex h-[88px] items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur-xl sm:px-8 lg:px-10 xl:px-12">
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
        {/* Live connection status indicator */}
        <LiveIndicator status={sseStatus} />
        <button type="button" onClick={() => startTransition(toggleLanguage)} className="hidden items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-xs font-bold text-(--text-soft) transition-all duration-200 hover:border-[#465FFF] hover:text-(--text) hover:shadow-[0_0_8px_rgba(70,95,255,0.1)] active:scale-[0.98] sm:flex" aria-label="Switch language">
          <Languages size={15} />
          <span key={language} className="inline-block min-w-5 animate-in fade-in slide-in-from-bottom-1 duration-200">
            {language.toUpperCase()}
          </span>
        </button>
        <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
          <PopoverTrigger
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-(--text) transition hover:bg-slate-100 hover:text-[#465FFF]"
            aria-label={t("notifications")}
          >
            <Bell size={24} />
            {unreadCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-black text-white shadow-[0_0_8px_rgba(239,68,68,0.35)] ring-2 ring-white">
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
                    {notificationStreamStatus === "degraded" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                        <WifiOff size={11} />
                        {t("notificationsPolling")}
                      </span>
                    ) : null}
                  </div>
                  <PopoverDescription className="mt-1 text-xs font-semibold text-slate-500">
                    {unreadCount > 0 ? t("notificationsUnread", { count: unreadCount }) : t("notificationsAllCaughtUp")}
                  </PopoverDescription>
                </div>
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={unreadCount === 0 || markAllRead.isPending}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-[#465FFF] transition hover:bg-[#465FFF]/5 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  <CheckCheck size={13} />
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
                      className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-[12px] font-black text-[#465FFF] transition hover:bg-[#465FFF]/5"
                    >
                      <RotateCw size={13} />
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
                      <span className="block truncate text-sm font-black text-slate-950 group-hover:text-[#465FFF]">{notification.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500 line-clamp-2">{notification.message}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Badge variant={meta.badgeVariant} className="rounded-full text-[10px] font-black">
                        {meta.label}
                      </Badge>
                      <span className="mt-2 block text-[11px] font-bold text-slate-400">
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
                className="flex h-10 w-full items-center justify-center rounded-[10px] border border-slate-200 bg-white text-xs font-black text-[#465FFF] transition hover:bg-[#465FFF]/5"
              >
                {t("notificationsViewAll")}
              </Link>
            </div>
          </PopoverContent>
        </Popover>
        <div className="hidden h-8 w-px bg-border sm:block" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-[#465FFF] to-[#8B5CFF] text-[16px] font-bold text-white shadow-[0_0_12px_rgba(70,95,255,0.3)]">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "TU"}
          </div>
          <div className="hidden sm:block">
            <p className="text-[15px] font-bold text-(--text)">{user?.name || "User"}</p>
            <p className="mt-1 text-[13px] font-semibold text-(--text-muted)">{user?.workspace || "Workspace"}</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="rounded-xl p-2 text-(--text-muted) hover:bg-slate-100 hover:text-[#EF4444] transition-colors" aria-label={t("logout")} title={t("logout")}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
