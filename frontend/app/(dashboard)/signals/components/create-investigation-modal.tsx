"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createCase } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { Field, ModalShell, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";

interface CreateInvestigationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signalId?: string;
  signalTitle?: string;
  alertId?: string;
  alertTitle?: string;
  workspaceId?: string;
  initialPriority?: "low" | "medium" | "high" | "critical";
  initialDescription?: string;
}

export function CreateInvestigationModal({
  open,
  onOpenChange,
  signalId,
  signalTitle,
  alertId,
  alertTitle,
  workspaceId,
  initialPriority,
  initialDescription,
}: CreateInvestigationModalProps) {
  const t = useTranslations("Signals.modal");
  const L = useL();
  const toast = useToast();

  const getComputedTitle = () => {
    if (alertTitle) return L(`Investigation: ${alertTitle}`, `Investigasi: ${alertTitle}`);
    if (signalTitle) return t("defaultTitle", { title: signalTitle });
    return "";
  };

  const [title, setTitle] = useState(getComputedTitle());
  const [description, setDescription] = useState(initialDescription || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">(initialPriority || "medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(getComputedTitle());
      setDescription(initialDescription || "");
      setPriority(initialPriority || "medium");
    }
  }, [open, signalTitle, alertTitle, initialDescription, initialPriority, t]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const createdCase = await createCase({
        title,
        description,
        priority,
        sourceType: alertId ? "alert" : "signal",
        sourceId: alertId || signalId,
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

  const close = () => onOpenChange(false);
  const basis = alertTitle || signalTitle;

  return (
    <ModalShell
      open={open}
      onClose={close}
      title={t("title")}
      description={L("A case collects the evidence, an owner and a deadline for a deeper look.", "Kasus mengumpulkan bukti, penanggung jawab, dan tenggat untuk ditelusuri lebih dalam.")}
      closeLabel={L("Close", "Tutup")}
      size="sm"
      footer={
        <>
          <button type="button" onClick={close} disabled={isSubmitting} className={secondaryButtonClass}>{t("cancel")}</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !title.trim()} className={primaryButtonClass}>
            {isSubmitting ? L("Saving…", "Menyimpan…") : t("submit")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {basis ? (
          <div className="rounded-[12px] border border-[#465FFF]/20 bg-[#F5F7FF] px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#3B52F5]">{alertTitle ? L("Based on this alert", "Berdasarkan peringatan") : L("Based on this article", "Berdasarkan berita")}</p>
            <p className="mt-1 truncate text-[14px] font-black text-[#101334]" title={basis}>{basis}</p>
          </div>
        ) : null}
        <Field label={t("titleLabel")} htmlFor="case-title">
          <input id="case-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} className={inputClass} />
        </Field>
        <Field label={t("priorityLabel")}>
          <div role="radiogroup" aria-label={t("priorityLabel")} className="grid grid-cols-4 gap-2">
            {(["low", "medium", "high", "critical"] as const).map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={priority === level}
                onClick={() => setPriority(level)}
                className={`h-10 rounded-[10px] border text-[12px] font-black transition ${priority === level ? (level === "critical" ? "border-[#B42318] bg-[#B42318] text-white" : "border-[#465FFF] bg-[#465FFF] text-white") : "border-[#DDE3EF] bg-white text-[#31406B] hover:border-[#C9D4F6]"}`}
              >
                {t(`priority.${level}`)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("descriptionLabel")} htmlFor="case-description">
          <textarea id="case-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} className={`${inputClass} h-auto py-2.5`} />
        </Field>
      </div>
    </ModalShell>
  );
}
