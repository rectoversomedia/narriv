"use client";

import { useId, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface RejectActionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function RejectActionPlanModal({
  open,
  onOpenChange,
  planTitle,
  onConfirm,
  isSubmitting = false,
}: RejectActionPlanModalProps) {
  const t = useTranslations("ActionPlans.rejectModal");
  const titleId = useId();
  const descriptionId = useId();
  const textareaId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onOpenChange, open, isSubmitting]);

  if (!open || typeof document === "undefined") return null;

  const trimmedReason = reason.trim();
  const isValid = trimmedReason.length > 0;
  const showError = touched && !isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || isSubmitting) return;
    await onConfirm(trimmedReason);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={() => {
        if (!isSubmitting) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EF4444]/10 text-[#EF4444]">
              <AlertCircle size={20} />
            </span>
            <div>
              <h3 id={titleId} className="text-base font-black text-slate-900">
                {t("title")}
              </h3>
              <p id={descriptionId} className="text-xs font-semibold text-slate-500">
                {t("desc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {planTitle && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {t("planTitleLabel")}
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-700 line-clamp-1">
              {planTitle}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor={textareaId}
              className="text-[12px] font-black text-slate-700 flex items-center justify-between"
            >
              <span>{t("reasonLabel")} <span className="text-[#EF4444]">*</span></span>
              <span className="text-[10px] font-medium text-slate-400">{reason.length}/1000</span>
            </label>
            <textarea
              id={textareaId}
              rows={4}
              maxLength={1000}
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder={t("reasonPlaceholder")}
              disabled={isSubmitting}
              className={`w-full rounded-xl border p-3 text-xs text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-60 ${
                showError
                  ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
                  : "border-slate-200 focus:border-[#465FFF] focus:ring-[#465FFF]/15"
              }`}
            />
            {showError && (
              <p className="text-[11px] font-semibold text-[#EF4444] flex items-center gap-1 mt-1">
                <AlertCircle size={12} />
                {t("reasonRequired")}
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-[#EF4444] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              {isSubmitting ? t("submitting") : t("confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
