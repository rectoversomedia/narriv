"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { coreRoutes, workspaceRoutes } from "@/lib/routes";
import { useUiStore } from "@/store/useUiStore";

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const theme = useUiStore((state) => state.theme);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const t = useTranslations("Sidebar");
  const nav = useTranslations("Sidebar.nav");
  const mobileRoutes = coreRoutes.slice(0, 5);

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
            <p className="theme-text text-sm font-semibold">{t("demo")}</p>
            <p className="theme-muted mt-1 text-xs leading-5">{t("demoDesc")}</p>
          </div>
        </div>
      </aside>

      <nav className="theme-card fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border p-2 shadow-2xl backdrop-blur md:hidden">
        {mobileRoutes.map((route) => {
          const active = isRouteActive(pathname, route.href);
          const Icon = route.icon;
          const label = nav(route.key);
          return (
            <Link key={route.href} href={route.href} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${active ? "bg-[#465FFF] text-white" : "theme-hover theme-muted hover:text-[#465FFF]"}`}>
              <Icon size={17} />
              <span className="truncate">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
