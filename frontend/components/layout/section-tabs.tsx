"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SECTION_TABS, sectionForPath } from "@/lib/navigation";

/** The tabs of the menu the current page belongs to; rendered once by the dashboard shell. */
export function SectionTabs() {
  const pathname = usePathname();
  const t = useTranslations("DemoApp");
  const group = sectionForPath(pathname);
  if (!group) return null;
  return (
    <nav aria-label={t(`nav.${group}`)} className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E8ECF5]">
      {SECTION_TABS[group].map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-bold transition", active ? "border-[#465FFF] text-[#3B52F5]" : "border-transparent text-[#5A6478] hover:text-[#101334]")}
          >
            {t(`nav.${tab.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
