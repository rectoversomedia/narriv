"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one dialog frame: title and a one-line description, a scrolling body, and a footer that stays in view
 * with the actions. Escape and a click outside close it; focus returns to what opened it.
 */
export function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  closeLabel?: string;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#101334]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[18px] bg-white shadow-[0_24px_70px_rgba(16,19,52,0.25)] animate-in fade-in zoom-in-95 duration-150 sm:rounded-[18px]",
          size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-2xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#EEF1F7] px-6 py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-black leading-tight text-[#101334]">{title}</h2>
            {description ? <p id={descId} className="mt-1 text-[13px] font-medium text-[#5A6478]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="rounded-full p-1.5 text-[#5A6478] transition hover:bg-[#F1F4FB] hover:text-[#101334]">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#EEF1F7] bg-[#FBFCFF] px-6 py-4">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Field label + control, one line of help at most. */
export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12px] font-black text-[#101334]">{label}</label>
      {children}
      {hint ? <p className="text-[11px] font-medium text-[#5A6478]">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[13px] font-semibold text-[#101334] outline-none transition placeholder:text-[#9AA3BC] focus:border-[#465FFF] focus:ring-2 focus:ring-[#465FFF]/15 disabled:bg-[#F8FAFF] disabled:text-[#8A93AD]";

export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] bg-[#465FFF] px-5 text-[13px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] border border-[#DDE3EF] bg-white px-5 text-[13px] font-black text-[#31406B] transition hover:bg-[#F8FAFF] disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-[10px] bg-[#C81E1E] px-5 text-[13px] font-black text-white transition hover:bg-[#A51818] disabled:cursor-not-allowed disabled:opacity-50";

/** A row of choices that behave like radio buttons (status, priority, period, …). */
export function ChoiceGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-10 rounded-[10px] border px-4 text-[12px] font-black transition",
            value === option.value ? "border-[#465FFF] bg-[#465FFF] text-white" : "border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
