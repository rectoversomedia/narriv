"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ConfirmationTone = "danger" | "warning";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const toneStyles: Record<ConfirmationTone, { border: string; icon: string; title: string; button: string }> = {
  danger: {
    border: "border-[#F8CACA]",
    icon: "bg-rose-50 text-rose-600",
    title: "text-rose-600",
    button: "bg-rose-600 hover:bg-rose-700",
  },
  warning: {
    border: "border-amber-200",
    icon: "bg-amber-50 text-amber-600",
    title: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700",
  },
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  onConfirm,
  onOpenChange,
}: ConfirmationDialogProps) {
  const t = useTranslations("Sources.common.dialog");
  const styles = toneStyles[tone];
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

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
  }, [onOpenChange, open]);

  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn("w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150", styles.border)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 id={titleId} className={cn("text-base font-black", styles.title)}>{title}</h3>
              <p className="text-[10px] font-semibold text-slate-400">{t("notice")}</p>
            </div>
          </div>
          <button type="button" aria-label={t("close")} onClick={() => onOpenChange(false)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={15} />
          </button>
        </div>

        <div id={descriptionId} className="mt-4 text-xs font-semibold leading-relaxed text-[#101334]">
          {description}
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={() => onOpenChange(false)}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-black text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn("flex h-10 flex-1 items-center justify-center rounded-lg text-[12px] font-black text-white", styles.button)}
          >
            {confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
