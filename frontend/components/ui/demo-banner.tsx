"use client";

import { useTranslations } from "next-intl";

// One banner for every page in a demo session. Signals and narratives in the
// demo workspace come from live monitoring; sample panels carry their own
// "Illustrative" or "Demo" label.
export function DemoBanner() {
  const t = useTranslations("DemoApp.sidebar");
  return (
    <div role="note" className="flex items-center justify-center gap-2 rounded-[10px] border border-transparent bg-[#8B5CFF]/10 px-4 py-3 text-center">
      <p className="text-[13px] font-bold text-[#6E44E8]">
        {t("demoBanner")}
      </p>
    </div>
  );
}
