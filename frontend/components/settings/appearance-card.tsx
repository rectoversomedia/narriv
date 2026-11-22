"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeChoice, type ThemeChoice } from "@/lib/theme";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/** Settings → Tampilan: light, dark, or follow the device. Saved in this browser. */
export function AppearanceCard() {
  const L = useL();
  const [choice, setChoice] = useThemeChoice();
  const options: Array<{ id: ThemeChoice; icon: typeof Sun; label: string; hint: string }> = [
    { id: "light", icon: Sun, label: L("Light", "Terang"), hint: L("Bright background", "Latar terang") },
    { id: "dark", icon: Moon, label: L("Dark", "Gelap"), hint: L("Easier on the eyes at night", "Lebih nyaman di malam hari") },
    { id: "system", icon: Monitor, label: L("Follow device", "Ikuti perangkat"), hint: L("Matches your device setting", "Sesuai pengaturan perangkat") },
  ];
  return (
    <section className={cn(BOX, "grid gap-4")}>
      <div>
        <h2 className="text-base font-black text-[#101334]">{L("Appearance", "Tampilan")}</h2>
        <p className="mt-1 text-[13px] font-medium text-[#5F6B94]">{L("Choose how Narriv looks on this device.", "Pilih tampilan Narriv di perangkat ini.")}</p>
      </div>
      <div role="radiogroup" aria-label={L("Theme", "Tema")} className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const on = choice === o.id;
          const Icon = o.icon;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => setChoice(o.id)} className={cn("flex items-center gap-3 rounded-[14px] border-[1.5px] p-3.5 text-left transition", on ? "border-[#465FFF] bg-[#EEF1FF]" : "border-[#E4E8F2] bg-white hover:border-[#465FFF]")}>
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-[10px]", on ? "bg-[#465FFF] text-white" : "bg-[#F1F4FA] text-[#31406B]")}><Icon size={18} aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-black text-[#101334]">{o.label}</span>
                <span className="block text-[12px] font-medium text-[#5F6B94]">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
