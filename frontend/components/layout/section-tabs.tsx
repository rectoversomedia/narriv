"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SECTION_TABS, STEPPED_SECTIONS, sectionForPath } from "@/lib/navigation";
import { prefetchRoute } from "@/lib/prefetch-route";
import { isPageHidden, useWorkspaceUseCase } from "@/lib/use-case";

/**
 * The tabs of the menu the current page belongs to; rendered once by the dashboard shell.
 * A row of pills with the current page in solid ink, so the pages inside a menu are obvious. The row scrolls sideways on narrow screens
 * but never vertically: overflow-y is hidden and nothing pokes out below the pills, otherwise a 1px vertical scroll
 * area appears and a trackpad gesture that starts over the bar latches onto it instead of scrolling the page.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const t = useTranslations("DemoApp");
  const group = sectionForPath(pathname);
  const navRef = useRef<HTMLElement>(null);
  const queryClient = useQueryClient();
  const { useCase } = useWorkspaceUseCase();

  // On a phone the row is wider than the screen; bring the active tab into view. scrollLeft, not scrollIntoView,
  // so the page itself never moves.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - 16;
  }, [pathname]);

  if (!group) return null;
  const stepped = STEPPED_SECTIONS.includes(group);
  return (
    <div className="mb-6 flex items-center">
      <nav
        ref={navRef}
        aria-label={t(`nav.${group}`)}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-1 overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTION_TABS[group].filter((tab) => !isPageHidden(tab.href, useCase)).map((tab, i) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onMouseEnter={() => prefetchRoute(queryClient, tab.href)}
              onTouchStart={() => prefetchRoute(queryClient, tab.href)}
              onFocus={() => prefetchRoute(queryClient, tab.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-bold transition-colors",
                active ? "bg-[#101334] text-white" : "text-[#5A6478] hover:bg-[#EEF1FF] hover:text-[#101334]",
              )}
            >
              {stepped ? (
                <span className={cn("mr-2 grid h-5 w-5 place-items-center rounded-full text-[11px] font-black", active ? "bg-white text-[#101334]" : "bg-[#E3E7F1] text-[#5A6478]")}>{i + 1}</span>
              ) : null}
              {t(`nav.${tab.key}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
