"use client";

import { useId, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createCase } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";

interface CreateInvestigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signalId?: string;
  signalTitle?: string;
  workspaceId?: string;
}

export function CreateInvestigationModal({
  open,
  onOpenChange,
  signalId,
  signalTitle,
  workspaceId,
}: CreateInvestigationModalProps) {
  const t = useTranslations("Signals.modal");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const [title, setTitle] = useState(signalTitle ? t("defaultTitle", { title: signalTitle }) : "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(signalTitle ? t("defaultTitle", { title: signalTitle }) : "");
      setDescription("");
      setPriority("medium");
    }
  }, [open, signalTitle, t]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const createdCase = await createCase({
        title,
        description,
        priority,
        sourceType: "signal",
        sourceId: signalId,
        workspaceId,
      });
      if (!createdCase) {
        toast.error(t("toast.errorDesc"), t("toast.errorTitle"));
        return;
      }
      toast.success(t("toast.successDesc"), t("toast.successTitle"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.errorDesc"), t("toast.errorTitle"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Flag size={20} />
            </span>
            <div>
              <h3 id={titleId} className="text-lg font-black text-slate-900">{t("title")}</h3>
              <p id={descriptionId} className="text-xs font-semibold text-slate-500">{t("desc")}</p>
            </div>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-[12px] font-black text-slate-700">{t("titleLabel")}</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="priority" className="text-[12px] font-black text-slate-700">{t("priorityLabel")}</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high" | "critical")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="low">{t("priority.low")}</option>
              <option value="medium">{t("priority.medium")}</option>
              <option value="high">{t("priority.high")}</option>
              <option value="critical">{t("priority.critical")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-[12px] font-black text-slate-700">{t("descriptionLabel")}</label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#465FFF] to-[#5C4DFF] text-[12px] font-black text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
