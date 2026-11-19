"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Repeat } from "lucide-react";
import { DemoPicker } from "@/components/auth/demo-picker";
import { pickL } from "@/lib/use-l";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";

// One banner for every page in a demo session. Signals and narratives in the
// demo workspace come from live monitoring; sample panels carry their own
// "Illustrative" or "Demo" label. "Switch demo" opens the case picker, so a
// visitor can move between the brand, government and CVE demos.
export function DemoBanner() {
  const t = useTranslations("DemoApp.sidebar");
  const [open, setOpen] = useState(false);
  // Guard here, not at each call site: AI Answers rendered it unconditionally, so real workspaces saw "Demo Workspace".
  const isDemo = isDemoSession(useAuthStore((state) => state.user));
  if (!isDemo) return null;
  return (
    <div role="note" className="flex items-center justify-between gap-3 rounded-[12px] border border-transparent bg-[#8B5CFF]/10 px-3.5 py-2 text-left sm:justify-center sm:px-4 sm:py-3 sm:text-center">
      <p className="min-w-0 text-[12px] font-bold leading-snug text-[#6E44E8] sm:text-[13px]">
        {t("demoBanner")}
      </p>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#6E44E8] shadow-sm hover:bg-[#F4F0FF]">
        <Repeat size={13} aria-hidden="true" />
        {pickL("Switch Demo Case", "Ganti Kasus Demo")}
      </button>
      <DemoPicker open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
