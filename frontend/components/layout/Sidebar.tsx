"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/dashboard/brand-hero";
import { ROLE_LABEL, WorkspaceSwitcher, useMyWorkspaces } from "@/components/layout/workspace-switcher";
import { getMonitoringKeywords, getWorkspaceSettings } from "@/lib/api-service";
import { SECTION_TABS, navGroups, type SectionKey } from "@/lib/navigation";
import { timeAgo } from "@/lib/intelligence-api";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";

function activeRoute(pathname: string, href: string, match: string[] = []) {
  if (href === "/") return pathname === "/" || match.some((h) => pathname === h || pathname.startsWith(`${h}/`));
  return [href, ...match].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

const fade = (hidden: boolean) => cn("whitespace-nowrap transition-opacity duration-200", hidden ? "pointer-events-none opacity-0" : "opacity-100");

/**
 * Desktop: the Narriv wordmark lined up with the top bar, the client's workspace, the five menus (the open one
 * lists its pages, the same ones as the tabs on the page), then whether monitoring is running. Settings and Help
 * are in the account menu at the top right. Phones get the bottom bar instead.
 */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("DemoApp");
  const L = useL();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const mobileItems = navGroups.flatMap((group) => group.items);

  const workspace = useQuery({ queryKey: ["workspace-settings"], queryFn: getWorkspaceSettings, staleTime: 30 * 1000 }).data;
  const keywords = useQuery({ queryKey: ["monitoring-keywords"], queryFn: getMonitoringKeywords, staleTime: 30 * 1000 }).data;

  const { isDemo, current } = useMyWorkspaces();
  const brandName = workspace?.brandName || current?.name || L("Your workspace", "Workspace Anda");
  const workspaceSubtitle = isDemo ? L("Demo workspace", "Workspace demo") : current?.role && ROLE_LABEL[current.role] ? L(...ROLE_LABEL[current.role]) : L("Workspace", "Workspace");
  const activeKeywords = (keywords?.data ?? []).filter((k) => k.isActive);
  const lastRunAt = activeKeywords.map((k) => k.lastRun?.at).filter((v): v is string => Boolean(v)).sort().pop() ?? null;
  const paused = workspace?.monitoringPaused === true;
  const status = paused
    ? { dot: "bg-[#F59E0B]", title: L("Monitoring paused", "Pemantauan dijeda"), sub: L("Resume it in Settings", "Lanjutkan di Pengaturan") }
    : activeKeywords.length
      ? { dot: "bg-[#22C55E]", title: L("Monitoring is on", "Pemantauan aktif"), sub: L(`${activeKeywords.length} keywords · checked ${lastRunAt ? timeAgo(lastRunAt) : "hourly"}`, `${activeKeywords.length} kata kunci · dicek ${lastRunAt ? timeAgo(lastRunAt) : "tiap jam"}`) }
      : { dot: "bg-white/40", title: L("No keywords yet", "Belum ada kata kunci"), sub: L("Add one in Settings", "Tambah di Pengaturan") };

  return (
    <>
      <aside className={cn("sidebar-gradient fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden text-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex", collapsed ? "w-[72px]" : "w-[240px]")}>
        {/* Same height and divider as the top bar, so the logo sits on the same line as the search box. */}
        <div className="relative flex h-[88px] shrink-0 items-center border-b border-white/10 px-4">
          <Link href="/" aria-label="Narriv" className="relative block h-10 w-full">
            <Image src="/brand/mark.svg" alt="" width={40} height={40} priority unoptimized className={cn("absolute left-0 top-0 size-10 transition-opacity duration-200", collapsed ? "opacity-100" : "opacity-0")} />
            <Image src="/brand/logo-p.webp" alt="Narriv" width={128} height={48} priority className={cn("absolute left-1 top-1 h-8 w-auto transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100")} />
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-4 pt-4">
          {/* The client's workspace: their logo (or initials), name and the user's role; opens the workspace picker. */}
          <WorkspaceSwitcher
            title={collapsed ? brandName : undefined}
            className={cn("flex w-full shrink-0 items-center gap-3 rounded-[14px] transition-colors hover:bg-white/[0.08]", collapsed ? "justify-center p-1" : "bg-white/[0.05] p-2.5")}
          >
            <BrandMark small name={brandName} logoUrl={workspace?.logoUrl} />
            <span className={cn("min-w-0 flex-1", fade(collapsed))}>
              <span className="block truncate text-[14px] font-bold leading-tight">{brandName}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/50">{workspaceSubtitle}</span>
            </span>
            {!isDemo && !collapsed ? <ChevronsUpDown size={15} aria-hidden="true" className="shrink-0 text-white/40" /> : null}
          </WorkspaceSwitcher>

          <nav aria-label={L("Main menu", "Menu utama")} className="mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <p className={cn("mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/35", fade(collapsed))}>{L("Menu", "Menu")}</p>
            <div className="grid gap-1">
              {navGroups.flatMap((group) => group.items).map((item) => {
                const Icon = item.icon;
                const active = activeRoute(pathname, item.href, item.match);
                const pages = SECTION_TABS[item.key as SectionKey] ?? [];
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? t(`nav.${item.key}`) : undefined}
                      aria-label={t(`nav.${item.key}`)}
                      aria-current={active ? "true" : undefined}
                      className={cn("flex h-10 items-center gap-3 rounded-[10px] px-[15px] text-[13px] font-semibold transition-colors", active ? "bg-[#465FFF] text-white shadow-[0_6px_18px_rgba(70,95,255,0.35)]" : "text-white/70 hover:bg-white/[0.06] hover:text-white")}
                    >
                      <Icon size={18} strokeWidth={2} className="shrink-0" />
                      <span className={fade(collapsed)}>{t(`nav.${item.key}`)}</span>
                    </Link>
                    {/* The open menu shows its pages, so the structure is visible without reading the tab bar. */}
                    {active && !collapsed && pages.length > 1 ? (
                      <div className="mb-1 ml-[24px] mt-1 border-l border-white/10 pl-3">
                        {pages.map((page) => {
                          const current = pathname === page.href;
                          return (
                            <Link
                              key={page.href}
                              href={page.href}
                              aria-current={current ? "page" : undefined}
                              className={cn("relative flex h-8 items-center whitespace-nowrap rounded-[8px] px-2.5 text-[12.5px] font-semibold transition-colors", current ? "bg-white/[0.10] text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white")}
                            >
                              {current ? <span aria-hidden="true" className="absolute -left-[13px] top-1.5 h-5 w-[2px] rounded-full bg-[#8EA0FF]" /> : null}
                              {t(`nav.${page.key}`)}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="mt-4 shrink-0 space-y-1">
            {/* Whether Narriv is actually watching right now. */}
            <Link
              href="/workspace/settings#keywords"
              title={collapsed ? `${status.title} · ${status.sub}` : undefined}
              className={cn("mb-2 flex items-center gap-3 rounded-[12px] transition-colors hover:bg-white/[0.08]", collapsed ? "justify-center py-3" : "bg-white/[0.05] px-3 py-2.5")}
            >
              <span className="relative flex size-2.5 shrink-0">
                {!paused && activeKeywords.length ? <span aria-hidden="true" className={cn("absolute inset-0 animate-ping rounded-full opacity-60", status.dot)} /> : null}
                <span className={cn("relative size-2.5 rounded-full", status.dot)} />
              </span>
              <span className={cn("min-w-0", fade(collapsed))}>
                <span className="block text-[12px] font-bold leading-tight">{status.title}</span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-white/50">{status.sub}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
              title={collapsed ? t("sidebar.expand") : undefined}
              className="flex h-10 w-full items-center gap-3 rounded-[10px] px-[15px] text-[13px] font-semibold text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ChevronsLeft size={18} strokeWidth={2} className={cn("shrink-0 transition-transform duration-300", collapsed && "rotate-180")} />
              <span className={fade(collapsed)}>{t("sidebar.collapse")}</span>
            </button>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-border bg-[#090D16]/90 p-1.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] lg:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = activeRoute(pathname, item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 transition ${active ? "bg-[#465FFF] text-white" : "text-white/60 hover:text-white"}`}
            >
              <Icon size={19} />
              <span className="w-full truncate text-center text-[10px] font-bold leading-none">{t(`navShort.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
