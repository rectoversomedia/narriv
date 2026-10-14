"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SECTION_TABS } from "@/lib/navigation";

export function SectionTabs({ group }: { group: keyof typeof SECTION_TABS }) {
  const pathname = usePathname();
  const t = useTranslations("DemoApp");
  const tabs = SECTION_TABS[group];
  // Only on the section's top-level pages, not on detail pages beneath them.
  if (!tabs.some((tab) => tab.href === pathname)) return null;
  return (
    <nav aria-label={t(`navSections.${group}`)} className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E8ECF5]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition", active ? "border-[#465FFF] text-[#3B52F5]" : "border-transparent text-[#5A6478] hover:text-[#101334]")}
          >
            {t(`nav.${tab.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
