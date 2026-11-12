"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Repeat } from "lucide-react";
import { DemoPicker } from "@/components/auth/demo-picker";
import { pickL } from "@/lib/use-l";

// One banner for every page in a demo session. Signals and narratives in the
// demo workspace come from live monitoring; sample panels carry their own
// "Illustrative" or "Demo" label. "Switch demo" opens the case picker, so a
// visitor can move between the brand, government and CVE demos.
export function DemoBanner() {
  const t = useTranslations("DemoApp.sidebar");
  const [open, setOpen] = useState(false);
  return (
    <div role="note" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-[10px] border border-transparent bg-[#8B5CFF]/10 px-4 py-3 text-center">
      <p className="text-[13px] font-bold text-[#6E44E8]">
        {t("demoBanner")}
      </p>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#6E44E8] shadow-sm hover:bg-[#F4F0FF]">
        <Repeat size={13} aria-hidden="true" />
        {pickL("Switch Demo Case", "Ganti Kasus Demo")}
      </button>
      <DemoPicker open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
