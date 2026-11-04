"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SECTION_TABS, sectionForPath } from "@/lib/navigation";

/**
 * The tabs of the menu the current page belongs to; rendered once by the dashboard shell.
 * A white bar with solid pills, so the pages inside a menu are obvious. The row scrolls sideways on narrow screens
 * but never vertically: overflow-y is hidden and nothing pokes out below the pills, otherwise a 1px vertical scroll
 * area appears and a trackpad gesture that starts over the bar latches onto it instead of scrolling the page.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const t = useTranslations("DemoApp");
  const group = sectionForPath(pathname);
  const navRef = useRef<HTMLElement>(null);

  // On a phone the row is wider than the screen; bring the active tab into view. scrollLeft, not scrollIntoView,
  // so the page itself never moves.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - 16;
  }, [pathname]);

  if (!group) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white px-0.5 shadow-[0_1px_2px_rgba(16,19,52,0.06),0_8px_24px_rgba(16,19,52,0.06)]">
      <span className="hidden shrink-0 pl-3 pr-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#5F6B94] md:block">{t(`nav.${group}`)}</span>
      <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-[#E6EAF2] md:block" />
      <nav
        ref={navRef}
        aria-label={t(`nav.${group}`)}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-1.5 overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTION_TABS[group].map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[14px] font-bold transition-colors",
                active ? "bg-[#465FFF] text-white shadow-[0_3px_8px_rgba(70,95,255,0.3)]" : "text-[#31406B] hover:bg-[#EEF1FF] hover:text-[#3B52F5]",
              )}
            >
              <Icon size={16} strokeWidth={2.4} aria-hidden="true" />
              {t(`nav.${tab.key}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
