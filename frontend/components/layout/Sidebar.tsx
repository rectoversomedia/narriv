"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { navGroups } from "@/lib/mock-data";
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

function activeRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
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

  const activeLogo = workspaceSettingsQuery.data?.logoUrl ? resolveBackendAssetUrl(workspaceSettingsQuery.data.logoUrl) : "/narriv-logo.svg";
  const brandName = workspaceSettingsQuery.data?.brandName || "Narriv";

  return (
    <>
      <aside className={`sidebar-gradient fixed inset-y-0 left-0 z-30 hidden overflow-y-auto px-4 py-6 text-white transition-[width,padding] duration-300 lg:block ${sidebarCollapsed ? "w-[72px] px-2" : "w-[240px]"}`}>
        <div className={`flex items-center gap-2 px-1 ${sidebarCollapsed ? "justify-center" : ""}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <Image src={activeLogo} alt={brandName} width={48} height={48} priority unoptimized={activeLogo.startsWith("http")} className="h-12 w-12 scale-[1.28] object-contain" />
          </span>
          {sidebarCollapsed ? null : <span className="text-[24px] font-bold tracking-[-0.05em] bg-clip-text text-transparent bg-linear-to-r from-white via-white to-white/70">{brandName}</span>}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute right-3 top-6 flex h-7 w-7 items-center justify-center rounded-[6px] border border-white/10 bg-white/4 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>

        <nav className={`space-y-5 ${sidebarCollapsed ? "mt-8" : "mt-6"}`}>
          {navGroups.map((group) => (
            <div key={group.key}>
              {sidebarCollapsed ? null : <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">{t(`navGroups.${group.key}`)}</p>}
              <div className="mt-2 grid gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeRoute(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={t(`nav.${item.key}`)}
                      aria-label={t(`nav.${item.key}`)}
                      className={`flex h-[40px] items-center gap-3 rounded-[6px] text-[13px] font-semibold transition ${sidebarCollapsed ? "justify-center px-0" : "px-3"} ${active ? "bg-[#465FFF] text-white shadow-[0_0_12px_rgba(70,95,255,0.4)]" : "text-white/70 hover:bg-white/5"}`}
                    >
                      <Icon size={18} strokeWidth={2} className="shrink-0" />
                      {sidebarCollapsed ? null : t(`nav.${item.key}`)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {sidebarCollapsed ? null : <div className="mt-8 rounded-[8px] border border-white/10 bg-white/2 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/90">
            <span>{t("sidebar.scoreTitle")}</span>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/40 text-[9px]">i</span>
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-[32px] font-bold leading-none text-[#8B5CFF] drop-shadow-[0_0_8px_rgba(139,92,255,0.3)]">86</span>
            <span className="pb-0.5 text-xs text-white/50">/100</span>
          </div>
          <p className="mt-2 text-[12px] font-bold text-[#10B981]">{t("sidebar.good")}</p>
          <p className="mt-1.5 text-[11px] text-white/60">{t("sidebar.scoreText")}</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-[78%] rounded-full bg-linear-to-r from-[#465FFF] to-[#8B5CFF] shadow-[0_0_8px_rgba(70,95,255,0.5)]" />
          </div>
        </div>}

        {sidebarCollapsed ? null : <p className="mt-6 px-2 text-[11px] text-white/40">© {new Date().getFullYear()} Narriv</p>}
        {sidebarCollapsed ? null : <p className="mt-2 px-2 text-[11px] text-white/40">All rights reserved.</p>}
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-border bg-[#090D16]/90 p-1.5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] lg:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = activeRoute(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center justify-center rounded-xl transition ${active ? "bg-[#465FFF] text-white shadow-[0_0_10px_rgba(70,95,255,0.3)]" : "text-white/60 hover:text-white"}`}
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
              <p className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-white/70">Narriv</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border p-2 text-white/60 hover:text-white hover:bg-white/5"><X size={18} /></button>
            </div>
            <div className="grid gap-2">
              {navGroups.flatMap((group) => group.items).map((item) => {
                const Icon = item.icon;
                const active = activeRoute(pathname, item.href);
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
