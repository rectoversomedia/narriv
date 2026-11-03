"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Field, ModalShell, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

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

  const options = [
    { tier: 1, title: t("socialTitle"), desc: t("socialDesc") },
    { tier: 2, title: t("videoTitle"), desc: t("videoDesc") },
    { tier: 3, title: t("ecommerceTitle"), desc: t("ecommerceDesc") },
  ];

  return (
    <ModalShell
      open={open}
      onClose={close}
      size="sm"
      title={t("title")}
      description={t("desc")}
      closeLabel={L("Close", "Tutup")}
      footer={
        <>
          <button type="button" onClick={close} className={secondaryButtonClass}>{t("cancel")}</button>
          <button type="button" onClick={submit} disabled={!canSubmit} className={primaryButtonClass}>{isPending ? t("deploying") : t("deploy")}</button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label={t("keyword")} hint={t("keywordHint")} htmlFor="source-keyword">
          <input id="source-keyword" type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t("keywordPlaceholder")} className={inputClass} autoFocus />
        </Field>
        <div>
          <p className="text-[12px] font-black text-[#101334]">{t("categoryTitle")}</p>
          <p className="mt-0.5 text-[11px] font-medium text-[#5A6478]">{t("categoryDesc")}</p>
          <div className="mt-3 grid gap-2.5">
            {options.map((option) => {
              const active = tiers.includes(option.tier);
              return (
                <button
                  key={option.tier}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => toggleTier(option.tier)}
                  className={cn("flex items-start gap-3 rounded-[12px] border p-3.5 text-left transition", active ? "border-[#465FFF] bg-[#F5F7FF] ring-2 ring-[#465FFF]/15" : "border-[#E6EAF2] bg-white hover:border-[#C9D4F6]")}
                >
                  <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px]", active ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-[#CBD5E1] bg-white")}>
                    {active ? <Check size={12} strokeWidth={4} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-[13px] font-black", active ? "text-[#3B52F5]" : "text-[#101334]")}>{option.title}</span>
                    <span className="mt-0.5 block text-[12px] font-medium leading-snug text-[#5A6478]">{option.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
