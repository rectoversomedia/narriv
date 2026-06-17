"use client";

import { useId, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X, Sparkles, Loader2, Megaphone, FileText, Users, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { createActionPlan, type ActionStrategyType } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface CreateActionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const strategyTypes: Array<{ value: ActionStrategyType; icon: React.ElementType; descriptionKey: string }> = [
  { value: "pr_response", icon: Megaphone, descriptionKey: "prDesc" },
  { value: "content_strategy", icon: FileText, descriptionKey: "csDesc" },
  { value: "influencer_strategy", icon: Users, descriptionKey: "isDesc" },
  { value: "crisis_response", icon: ShieldAlert, descriptionKey: "crDesc" },
];

export function CreateActionPlanModal({ open, onOpenChange }: CreateActionPlanModalProps) {
  const t = useTranslations("ActionPlans.modal");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const [strategyType, setStrategyType] = useState<ActionStrategyType>("pr_response");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStrategyType("pr_response");
    }
  }, [open]);

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
    setIsSubmitting(true);
    try {
      const result = await createActionPlan({ strategyType });
      if (result) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["action-queue"] }),
          queryClient.invalidateQueries({ queryKey: ["action-plans-metrics"] }),
          queryClient.invalidateQueries({ queryKey: ["action-plans-latest"] }),
        ]);
        toast.success(t("toast.successDesc"), t("toast.successTitle"));
        onOpenChange(false);
      } else {
        toast.error(t("toast.errorDesc"), t("toast.errorTitle"));
      }
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
        className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
              <Sparkles size={20} />
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
            <label className="text-[12px] font-black text-slate-700">{t("strategyLabel")}</label>
            <div className="grid grid-cols-1 gap-2">
              {strategyTypes.map((st) => {
                const Icon = st.icon;
                const isActive = strategyType === st.value;
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setStrategyType(st.value)}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                      isActive
                        ? "border-[#465FFF] bg-[#465FFF]/5 shadow-[0_4px_12px_rgba(70,95,255,0.08)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", isActive ? "bg-[#465FFF] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-[#465FFF]/10 group-hover:text-[#465FFF]")}>
                      <Icon size={14} strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className={cn("text-[13px] font-black transition-colors", isActive ? "text-[#465FFF]" : "text-slate-700")}>{t(`strategy.${st.value}`)}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{t(st.descriptionKey)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-400">{t("hint")}</p>

          <div className="mt-2 flex gap-3">
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
              disabled={isSubmitting}
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
