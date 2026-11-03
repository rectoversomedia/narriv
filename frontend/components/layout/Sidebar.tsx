"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, MoreHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { navGroups } from "@/lib/navigation";
import { useUiStore } from "@/store/useUiStore";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaceSettings } from "@/lib/api-service";

function resolveBackendAssetUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return `${baseUrl}${url}`;
  }
  return url;
}

function activeRoute(pathname: string, href: string, match: string[] = []) {
  if (href === "/") return pathname === "/";
  return [href, ...match].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("DemoApp");
  const [open, setOpen] = useState(false);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const mobileItems = navGroups.flatMap((group) => group.items).slice(0, 4);


  const workspaceSettingsQuery = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: getWorkspaceSettings,
    staleTime: 30 * 1000,
  });

  const customLogoUrl = workspaceSettingsQuery.data?.logoUrl ? resolveBackendAssetUrl(workspaceSettingsQuery.data.logoUrl) : null;
  const activeLogo = customLogoUrl || "/logo-p-narriv-2026.png";
  const brandName = workspaceSettingsQuery.data?.brandName || "Narriv";

  return (
    <>
      <aside
        className={`sidebar-gradient fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden px-3 py-6 text-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex ${sidebarCollapsed ? "w-[72px]" : "w-[240px]"}`}
      >
        {/* Logo: the round mark when collapsed, the wordmark when open; they cross-fade instead of jumping. */}
        <div className="relative h-10 shrink-0 px-1">
          <span className={`absolute left-1 top-0 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-opacity duration-200 ${sidebarCollapsed ? "opacity-100" : "opacity-0"}`}>
            <Image src={customLogoUrl || "/logo-bulat-narriv-2026.png"} alt={brandName} width={40} height={40} priority unoptimized={Boolean(customLogoUrl)} className="h-10 w-10 object-contain" />
          </span>
          <span className={`absolute left-1 top-0 flex h-10 items-center gap-2 whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}>
            {customLogoUrl ? (
              <>
                <Image src={customLogoUrl} alt={brandName} width={40} height={40} priority unoptimized className="h-10 w-10 scale-[1.28] rounded-full object-contain" />
                <span className="text-[24px] font-bold tracking-[-0.05em] text-white">{brandName}</span>
              </>
            ) : (
              <Image src={activeLogo} alt={brandName} width={140} height={40} priority className="h-10 w-auto max-w-[140px] object-contain" />
            )}
          </span>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group) => (
            <div key={group.key}>
              <p className={`h-4 whitespace-nowrap px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 transition-opacity duration-200 ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}>{t(`navGroups.${group.key}`)}</p>
              <div className="mt-2 grid gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeRoute(pathname, item.href, item.match);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={sidebarCollapsed ? t(`nav.${item.key}`) : undefined}
                      aria-label={t(`nav.${item.key}`)}
                      className={`flex h-[40px] items-center gap-3 rounded-[8px] px-[15px] text-[13px] font-semibold transition-colors ${active ? "bg-[#465FFF] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"}`}
                    >
                      <Icon size={18} strokeWidth={2} className="shrink-0" />
                      <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}>{t(`nav.${item.key}`)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse control at the bottom, where it does not compete with the logo. */}
        <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={sidebarCollapsed ? t("sidebar.expand") : undefined}
            className="flex h-[40px] w-full items-center gap-3 rounded-[8px] px-[15px] text-[13px] font-semibold text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronsLeft size={18} strokeWidth={2} className={`shrink-0 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
            <span className={`whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}>{t("sidebar.collapse")}</span>
          </button>
          <p className={`mt-3 whitespace-nowrap px-3 text-[11px] text-white/40 transition-opacity duration-200 ${sidebarCollapsed ? "opacity-0" : "opacity-100"}`}>© {new Date().getFullYear()} Narriv</p>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-border bg-[#090D16]/90 p-1.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] lg:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = activeRoute(pathname, item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center justify-center rounded-xl transition ${active ? "bg-[#465FFF] text-white" : "text-white/60 hover:text-white"}`}
            >
              <Icon size={20} />
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex h-10 items-center justify-center rounded-xl text-white/60 hover:text-white" aria-label="Open menu"><MoreHorizontal size={22} /></button>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-x-3 bottom-3 max-h-[82dvh] overflow-y-auto rounded-[24px] bg-[#090D16] border border-border p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Image src="/logo-p-narriv-2026.png" alt="Narriv" width={110} height={28} priority className="h-7 w-auto object-contain" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border p-2 text-white/60 hover:text-white hover:bg-white/5"><X size={18} /></button>
            </div>
            <div className="grid gap-2">
              {navGroups.flatMap((group) => group.items).map((item) => {
                const Icon = item.icon;
                const active = activeRoute(pathname, item.href, item.match);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active ? "bg-[#465FFF] text-white" : "text-white/70 hover:bg-white/5"}`}
                  >
                    <Icon size={18} />
                    {t(`nav.${item.key}`)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
