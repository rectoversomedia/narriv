"use client";

import { useId, useRef, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X, Database, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { keyword: string; tiers: number[] }) => void;
  isPending: boolean;
}

export function AddSourceModal({ open, onOpenChange, onSubmit, isPending }: AddSourceModalProps) {
  const t = useTranslations("Sources.modal");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [keyword, setKeyword] = useState("Narriv");
  const [tiers, setTiers] = useState<number[]>([1, 2]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  const toggleTier = (tier: number) => {
    setTiers((prev) => (prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || tiers.length === 0) return;
    onSubmit({ keyword: keyword.trim(), tiers });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#060A23]/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[480px] rounded-[16px] border border-[#E5E9F3] bg-white p-6 shadow-[0_24px_48px_rgba(6,10,35,0.12)] animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#465FFF]/10 text-[#465FFF]">
              <Database size={20} strokeWidth={2.5} />
            </span>
            <div>
              <h3 id={titleId} className="text-[16px] font-black text-[#101334]">
                {t("title")}
              </h3>
              <p id={descriptionId} className="mt-0.5 text-[11px] font-semibold text-[#68739F]">
                {t("desc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("cancel")}
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-[#8A94B8] transition hover:bg-[#F5F7FC] hover:text-[#53608C]"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor="keywordInput" className="mb-2 block text-[12px] font-black text-[#101334]">
              {t("keyword")}
            </label>
            <input
              id="keywordInput"
              type="text"
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("keywordPlaceholder")}
              className="w-full rounded-[10px] border border-[#DDE3EF] bg-[#FBFCFF] px-4 py-2.5 text-[13px] font-bold text-[#101334] outline-none transition placeholder:font-semibold placeholder:text-[#A0ABC0] focus:border-[#465FFF] focus:bg-white focus:ring-4 focus:ring-[#465FFF]/10"
            />
            <p className="mt-1.5 text-[10px] font-bold text-[#8B95B8]">
              {t("keywordHint")}
            </p>
          </div>

          <div className="rounded-[12px] border border-[#EEF1F7] bg-[#F8FAFF] p-4">
            <h4 className="text-[12px] font-black text-[#101334]">{t("categoryTitle")}</h4>
            <p className="mt-1 text-[10px] font-semibold text-[#8B95B8]">{t("categoryDesc")}</p>
            
            <div className="mt-4 flex flex-col gap-3">
              {/* Tier 1 */}
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-[10px] border bg-white p-3 transition hover:border-[#CBD5E1]", tiers.includes(1) ? "border-[#465FFF] shadow-sm hover:border-[#465FFF]" : "border-[#E5E9F3]")}>
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={tiers.includes(1)}
                    onChange={() => toggleTier(1)}
                  />
                  <div className="h-5 w-5 rounded-[6px] border-[1.5px] border-[#CBD5E1] bg-white transition peer-checked:border-[#465FFF] peer-checked:bg-[#465FFF]" />
                  <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 transition peer-checked:opacity-100" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-[#101334]">{t("socialTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#68739F]">{t("socialDesc")}</p>
                </div>
              </label>

              {/* Tier 2 */}
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-[10px] border bg-white p-3 transition hover:border-[#CBD5E1]", tiers.includes(2) ? "border-[#465FFF] shadow-sm hover:border-[#465FFF]" : "border-[#E5E9F3]")}>
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={tiers.includes(2)}
                    onChange={() => toggleTier(2)}
                  />
                  <div className="h-5 w-5 rounded-[6px] border-[1.5px] border-[#CBD5E1] bg-white transition peer-checked:border-[#465FFF] peer-checked:bg-[#465FFF]" />
                  <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 transition peer-checked:opacity-100" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-[#101334]">{t("videoTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#68739F]">{t("videoDesc")}</p>
                </div>
              </label>

              {/* Tier 3 */}
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-[10px] border bg-white p-3 transition hover:border-[#CBD5E1]", tiers.includes(3) ? "border-[#465FFF] shadow-sm hover:border-[#465FFF]" : "border-[#E5E9F3]")}>
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={tiers.includes(3)}
                    onChange={() => toggleTier(3)}
                  />
                  <div className="h-5 w-5 rounded-[6px] border-[1.5px] border-[#CBD5E1] bg-white transition peer-checked:border-[#465FFF] peer-checked:bg-[#465FFF]" />
                  <Check size={12} strokeWidth={4} className="absolute text-white opacity-0 transition peer-checked:opacity-100" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-[#101334]">{t("ecommerceTitle")}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#68739F]">{t("ecommerceDesc")}</p>
                </div>
              </label>

              {/* Web Scrapers */}
            </div>
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-[10px] border border-[#DDE3EF] bg-white text-[12px] font-black text-[#53608C] transition hover:bg-[#F5F7FC]"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending || !keyword.trim() || tiers.length === 0}
              className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-gradient-to-r from-[#465FFF] to-[#8B5CFF] text-[12px] font-black text-white shadow-[0_12px_24px_rgba(70,95,255,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t("deploying") : t("deploy")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
