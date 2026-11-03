"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ModalShell, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

interface RejectActionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function RejectActionPlanModal({ open, onOpenChange, planTitle, onConfirm, isSubmitting = false }: RejectActionPlanModalProps) {
  const t = useTranslations("ActionPlans.rejectModal");
  const L = useL();
  const textareaId = useId();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  // The usual reasons, one tap each; the text stays editable. They teach Narriv what to change next time.
  const quickReasons = [
    L("Not relevant to this issue", "Tidak relevan dengan isu ini"),
    L("Tone does not fit the brand", "Nada tidak sesuai brand"),
    L("Facts are wrong or missing", "Fakta salah atau kurang"),
    L("Already handled another way", "Sudah ditangani dengan cara lain"),
  ];

  const trimmed = reason.trim();
  const isValid = trimmed.length > 0;
  const close = () => { if (!isSubmitting) onOpenChange(false); };
  const submit = async () => {
    setTouched(true);
    if (!isValid || isSubmitting) return;
    await onConfirm(trimmed);
  };

  return (
    <ModalShell
      open={open}
      onClose={close}
      size="sm"
      title={t("title")}
      description={L("Tell Narriv why, so the next draft is better.", "Beri tahu Narriv alasannya, supaya draf berikutnya lebih tepat.")}
      closeLabel={L("Close", "Tutup")}
      footer={
        <>
          <button type="button" onClick={close} disabled={isSubmitting} className={secondaryButtonClass}>{t("cancel")}</button>
          <button type="button" onClick={() => void submit()} disabled={!isValid || isSubmitting} className={dangerButtonClass}>{isSubmitting ? t("submitting") : t("confirm")}</button>
        </>
      }
    >
      <div className="space-y-4">
        {planTitle ? (
          <div className="rounded-[12px] border border-[#EEF1F7] bg-[#FBFCFF] px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{t("planTitleLabel")}</p>
            <p className="mt-1 truncate text-[14px] font-black text-[#101334]" title={planTitle}>{planTitle}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {quickReasons.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => { setReason(text); setTouched(true); }}
              className={cn("rounded-full border px-3 py-1.5 text-[12px] font-bold transition", reason === text ? "border-[#465FFF] bg-[#F5F7FF] text-[#3B52F5]" : "border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6]")}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={textareaId} className="flex items-center justify-between text-[12px] font-black text-[#101334]">
            <span>{t("reasonLabel")}</span>
            <span className="text-[11px] font-semibold text-[#8A93AD]">{reason.length}/1000</span>
          </label>
          <textarea
            id={textareaId}
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setTouched(true); }}
            placeholder={t("reasonPlaceholder")}
            disabled={isSubmitting}
            className={cn(inputClass, "h-auto py-2.5", touched && !isValid && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20")}
          />
          {touched && !isValid ? <p className="text-[12px] font-bold text-[#C81E1E]">{t("reasonRequired")}</p> : null}
        </div>
      </div>
    </ModalShell>
  );
}
