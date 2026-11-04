"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Field, ModalShell, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { keyword: string; tiers: number[] }) => void;
  isPending: boolean;
}

export function AddSourceModal({ open, onOpenChange, onSubmit, isPending }: AddSourceModalProps) {
  const t = useTranslations("Sources.modal");
  const L = useL();
  const [keyword, setKeyword] = useState("");
  const [tiers, setTiers] = useState<number[]>([1, 2]);

  useEffect(() => {
    if (open) { setKeyword(""); setTiers([1, 2]); }
  }, [open]);

  const toggleTier = (tier: number) => setTiers((prev) => (prev.includes(tier) ? prev.filter((x) => x !== tier) : [...prev, tier]));
  const canSubmit = keyword.trim().length > 0 && tiers.length > 0 && !isPending;
  const submit = () => { if (canSubmit) onSubmit({ keyword: keyword.trim(), tiers }); };
  const close = () => onOpenChange(false);

  // Each group lists the platforms it adds, so the reader sees exactly what will be watched.
  const options = [
    { tier: 1, title: L("Social media & search", "Media sosial & pencarian"), platforms: [["twitter", "X"], ["tiktok", "TikTok"], ["instagram", "Instagram"], [null, "Threads"], [null, "Google"]] as Array<[string | null, string]>, rgb: "70,95,255" },
    { tier: 2, title: L("Video & communities", "Video & komunitas"), platforms: [["youtube", "YouTube"], ["facebook", "Facebook"]] as Array<[string | null, string]>, rgb: "229,72,77" },
    { tier: 3, title: L("Marketplaces, forums & podcasts", "Marketplace, forum & podcast"), platforms: [[null, "Tokopedia"], [null, "Shopee"], [null, "Kaskus"], [null, "Spotify"], [null, "YT Music"]] as Array<[string | null, string]>, rgb: "18,166,106" },
  ];
  const count = options.filter((o) => tiers.includes(o.tier)).reduce((n, o) => n + o.platforms.length, 0);

  return (
    <ModalShell
      open={open}
      onClose={close}
      size="sm"
      title={L("Add sources", "Tambah sumber")}
      description={L("Type what to watch, pick where. Narriv checks it every hour.", "Ketik apa yang dipantau, pilih di mana. Narriv mengeceknya setiap jam.")}
      closeLabel={L("Close", "Tutup")}
      footer={
        <>
          <button type="button" onClick={close} className={secondaryButtonClass}>{t("cancel")}</button>
          <button type="button" onClick={submit} disabled={!canSubmit} className={primaryButtonClass}>
            {isPending ? t("deploying") : count ? L(`Add ${count} sources`, `Tambah ${count} sumber`) : L("Add sources", "Tambah sumber")}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label={L("What to watch", "Yang dipantau")} hint={L("A brand, product or person, e.g. Bank Arunika.", "Nama brand, produk, atau tokoh, mis. Bank Arunika.")} htmlFor="source-keyword">
          <input id="source-keyword" type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={L("e.g. Bank Arunika", "mis. Bank Arunika")} className={inputClass} autoFocus />
        </Field>
        <div>
          <p className="text-[12px] font-black text-[#101334]">{L("Where", "Di mana")}</p>
          <div className="mt-2 grid gap-2.5">
            {options.map((option) => {
              const active = tiers.includes(option.tier);
              return (
                <button
                  key={option.tier}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => toggleTier(option.tier)}
                  className={cn("flex items-start gap-3 rounded-[12px] p-3.5 text-left transition", active ? "bg-[#EEF1FF] ring-2 ring-[#465FFF]" : "bg-[#F7F8FC] hover:bg-[#EEF1F7]")}
                >
                  <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white", active ? "bg-[#465FFF]" : "bg-[#CBD2E1]")}>
                    {active ? <Check size={13} strokeWidth={3.5} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-black text-[#101334]">{option.title}</span>
                      <span className="text-[11px] font-black text-[#5A6478]">{L(`${option.platforms.length} sources`, `${option.platforms.length} sumber`)}</span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {option.platforms.map(([key, name]) => (
                        <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#31406B] shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
                          {key ? <PlatformIcon platform={key} className="size-3.5" /> : null}{name}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {keyword.trim() && count ? (
          <div className="rounded-[12px] bg-[#101334] px-4 py-3 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#A9B4FF]">{L("Summary", "Ringkasan")}</p>
            <p className="mt-0.5 text-[13px] font-bold">{L(`${count} sources will watch «${keyword.trim()}», checked every hour.`, `${count} sumber akan memantau «${keyword.trim()}», dicek setiap jam.`)}</p>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
