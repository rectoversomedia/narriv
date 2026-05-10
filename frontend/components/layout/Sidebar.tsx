"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { coreRoutes, workspaceRoutes } from "@/lib/routes";
import { useUiStore } from "@/store/useUiStore";

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = useUiStore((state) => state.theme);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const t = useTranslations("Sidebar");
  const nav = useTranslations("Sidebar.nav");
  const mobileRoutes = [coreRoutes[0], coreRoutes[1], coreRoutes[3], coreRoutes[6]];
  const moreActive = [...coreRoutes, ...workspaceRoutes]
    .filter((route) => !mobileRoutes.some((mobileRoute) => mobileRoute.href === route.href))
    .some((route) => isRouteActive(pathname, route.href));

  return (
    <>
      <aside className={`theme-shell theme-border fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-300 md:flex ${sidebarCollapsed ? "w-[92px]" : "w-[292px]"}`}>
        <div className="px-5 pb-[35px] pt-7">
          <Image src={theme === "light" ? "/narriv-logo-light.png" : "/narriv-logo-dark.png"} alt="Narriv" width={184} height={45} priority style={{ height: "auto" }} className={sidebarCollapsed ? "w-12 object-contain object-left" : "w-[184px]"} />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          <p className="theme-muted-2 px-2 pb-5 text-[11px] font-semibold uppercase tracking-[0.18em]">{sidebarCollapsed ? "" : t("menu")}</p>
          <div className="space-y-1">
            {coreRoutes.map((route) => {
              const active = isRouteActive(pathname, route.href);
              const Icon = route.icon;
              const label = nav(route.key);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${sidebarCollapsed ? "justify-center" : ""} ${
                    active ? "bg-[#465FFF] text-white" : "theme-hover theme-soft hover:text-[#465FFF]"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarCollapsed ? null : label}
                </Link>
              );
            })}
          </div>

          <p className="theme-muted-2 mt-7 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.18em]">{sidebarCollapsed ? "" : t("support")}</p>
          <div className="space-y-1">
            {workspaceRoutes.map((route) => {
              const active = isRouteActive(pathname, route.href);
              const Icon = route.icon;
              const label = nav(route.key);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${sidebarCollapsed ? "justify-center" : ""} ${
                    active ? "bg-[#465FFF] text-white" : "theme-hover theme-soft hover:text-[#465FFF]"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarCollapsed ? null : label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={`p-4 ${sidebarCollapsed ? "hidden" : "block"}`}>
          <div className="theme-card rounded-2xl border p-4">
            <p className="theme-text text-sm font-semibold">{t("productionMode")}</p>
            <p className="theme-muted mt-1 text-xs leading-5">{t("productionDesc")}</p>
          </div>
        </div>
      </aside>

      <nav className="mobile-nav-surface fixed inset-x-4 bottom-3 z-40 grid grid-cols-5 rounded-2xl border p-1.5 md:hidden">
        {mobileRoutes.map((route) => {
          const active = isRouteActive(pathname, route.href);
          const Icon = route.icon;
          const label = nav(route.key);
          return (
            <Link
              key={route.href}
              href={route.href}
              title={label}
              aria-label={label}
              className={`flex h-10 items-center justify-center rounded-xl transition-colors ${active ? "bg-[#465FFF] text-white" : "theme-hover theme-muted hover:text-[#465FFF]"}`}
            >
              <Icon size={20} strokeWidth={2.1} />
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("more")}
          aria-expanded={mobileMenuOpen}
          className={`flex h-10 items-center justify-center rounded-xl transition-colors ${moreActive || mobileMenuOpen ? "bg-[#465FFF] text-white" : "theme-hover theme-muted hover:text-[#465FFF]"}`}
        >
          <MoreHorizontal size={22} strokeWidth={2.1} />
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("allMenu")}>
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t("closeMenu")}
          />
          <div className="mobile-nav-surface absolute inset-x-3 bottom-3 max-h-[82dvh] overflow-hidden rounded-[28px] border p-3">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <div>
                <p className="theme-muted text-[11px] font-bold uppercase tracking-[0.18em]">{t("allMenu")}</p>
                <p className="theme-text mt-1 text-base font-semibold">Narriv</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="theme-border theme-hover theme-text flex h-10 w-10 items-center justify-center rounded-xl border"
                aria-label={t("closeMenu")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(82dvh-86px)] overflow-y-auto pb-2">
              <p className="theme-muted-2 px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t("menu")}</p>
              <div className="grid gap-2">
                {coreRoutes.map((route) => {
                  const active = isRouteActive(pathname, route.href);
                  const Icon = route.icon;
                  const label = nav(route.key);
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors ${active ? "bg-[#465FFF] text-white" : "theme-hover theme-text"}`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>

              <p className="theme-muted-2 mt-5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">{t("support")}</p>
              <div className="grid gap-2">
                {workspaceRoutes.map((route) => {
                  const active = isRouteActive(pathname, route.href);
                  const Icon = route.icon;
                  const label = nav(route.key);
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors ${active ? "bg-[#465FFF] text-white" : "theme-hover theme-text"}`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
