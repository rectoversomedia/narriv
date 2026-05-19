"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, MoreHorizontal, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { navGroups } from "@/lib/mock-data";
import { useUiStore } from "@/store/useUiStore";

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

  return (
    <>
      <aside className={`sidebar-gradient fixed inset-y-0 left-0 z-30 hidden overflow-y-auto px-5 py-8 text-white transition-[width,padding] duration-300 lg:block ${sidebarCollapsed ? "w-[92px] px-4" : "w-[292px]"}`}>
        <div className={`flex items-center gap-3 px-1 ${sidebarCollapsed ? "justify-center" : ""}`}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <Image src="/narriv-logo.svg" alt="Narriv" width={64} height={64} priority className="h-16 w-16 scale-[1.28] object-cover" />
          </span>
          {sidebarCollapsed ? null : <span className="text-[33px] font-bold tracking-[-0.05em] bg-clip-text text-transparent bg-linear-to-r from-white via-white to-white/70">Narriv</span>}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute right-4 top-8 flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/10 bg-white/4 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <nav className={`space-y-8 ${sidebarCollapsed ? "mt-10" : "mt-9"}`}>
          {navGroups.map((group) => (
            <div key={group.key}>
              {sidebarCollapsed ? null : <p className="px-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/40">{t(`navGroups.${group.key}`)}</p>}
              <div className="mt-3 grid gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeRoute(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={t(`nav.${item.key}`)}
                      aria-label={t(`nav.${item.key}`)}
                      className={`flex h-[52px] items-center gap-4 rounded-[8px] text-[16px] font-bold transition ${sidebarCollapsed ? "justify-center px-0" : "px-4"} ${active ? "bg-[#465FFF] text-white shadow-[0_0_15px_rgba(70,95,255,0.4)]" : "text-white/70 hover:bg-white/5"}`}
                    >
                      <Icon size={24} strokeWidth={2} className="shrink-0" />
                      {sidebarCollapsed ? null : t(`nav.${item.key}`)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {sidebarCollapsed ? null : <div className="mt-10 rounded-[10px] border border-white/10 bg-white/2 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[13px] font-semibold text-white/90">
            <span>{t("sidebar.scoreTitle")}</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[10px]">i</span>
          </div>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-[42px] font-bold leading-none text-[#8B5CFF] drop-shadow-[0_0_10px_rgba(139,92,255,0.3)]">86</span>
            <span className="pb-1 text-sm text-white/50">/100</span>
          </div>
          <p className="mt-3 text-[15px] font-bold text-[#10B981]">{t("sidebar.good")}</p>
          <p className="mt-2 text-[13px] text-white/60">{t("sidebar.scoreText")}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-[78%] rounded-full bg-linear-to-r from-[#465FFF] to-[#8B5CFF] shadow-[0_0_10px_rgba(70,95,255,0.5)]" />
          </div>
        </div>}

        {sidebarCollapsed ? null : <div className="mt-8 flex items-center gap-4 rounded-[10px] border border-white/10 bg-white/2 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-tr from-[#465FFF] to-[#8B5CFF] text-sm font-bold text-white shadow-[0_0_10px_rgba(70,95,255,0.3)]">TU</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-white">Testing User</p>
            <p className="mt-1 truncate text-[13px] text-white/50">User Workspace</p>
          </div>
          <ChevronDown size={18} className="text-white/60" />
        </div>}

        {sidebarCollapsed ? null : <p className="mt-8 px-2 text-[13px] text-white/40">© 2025 Narriv</p>}
        {sidebarCollapsed ? null : <p className="mt-3 px-2 text-[13px] text-white/40">All rights reserved.</p>}
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
