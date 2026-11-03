"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createActionPlan, getAlerts, getNarratives, type ActionStrategyType } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { Field, ModalShell, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

interface CreateActionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAlertId?: string;
  initialAlertTitle?: string;
  initialClusterId?: string;
  initialSignalId?: string;
  initialSignalTitle?: string;
  initialStrategyType?: ActionStrategyType;
}

const strategyTypes: Array<{ value: ActionStrategyType; descriptionKey: string }> = [
  { value: "crisis_response", descriptionKey: "crDesc" },
  { value: "pr_response", descriptionKey: "prDesc" },
  { value: "stakeholder_update", descriptionKey: "suDesc" },
  { value: "social_response", descriptionKey: "srDesc" },
  { value: "content_strategy", descriptionKey: "csDesc" },
  { value: "influencer_strategy", descriptionKey: "isDesc" },
  { value: "data_driven", descriptionKey: "ddDesc" },
];

export function CreateActionPlanModal({
  open,
  onOpenChange,
  initialAlertId,
  initialAlertTitle,
  initialClusterId,
  initialSignalId,
  initialSignalTitle,
  initialStrategyType,
}: CreateActionPlanModalProps) {
  const t = useTranslations("ActionPlans.modal");
  const L = useL();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [strategyType, setStrategyType] = useState<ActionStrategyType>(initialStrategyType || "crisis_response");
  const [selectedAlertId, setSelectedAlertId] = useState<string>(initialAlertId || "");
  const [selectedClusterId, setSelectedClusterId] = useState<string>(initialClusterId || "");
  const [selectedSignalId, setSelectedSignalId] = useState<string>(initialSignalId || "");
  const [showLinks, setShowLinks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: alertsData } = useQuery({ queryKey: ["alerts-modal-select"], queryFn: () => getAlerts({ limit: 50, status: "unresolved" }), enabled: open });
  const { data: narrativesData } = useQuery({ queryKey: ["narratives-modal-select"], queryFn: () => getNarratives({ limit: 50 }), enabled: open });

  useEffect(() => {
    if (open) {
      setStrategyType(initialStrategyType || "crisis_response");
      setSelectedAlertId(initialAlertId || "");
      setSelectedClusterId(initialClusterId || "");
      setSelectedSignalId(initialSignalId || "");
      setShowLinks(false);
    }
  }, [open, initialAlertId, initialClusterId, initialSignalId, initialStrategyType]);

  const close = () => onOpenChange(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createActionPlan({
        strategyType,
        alertId: selectedAlertId || undefined,
        clusterId: selectedClusterId || undefined,
        signalId: selectedSignalId || undefined,
      });
      if (result) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["action-queue"] }),
          queryClient.invalidateQueries({ queryKey: ["action-plans-metrics"] }),
          queryClient.invalidateQueries({ queryKey: ["action-plans-latest"] }),
        ]);
        toast.success(t("toast.successDesc"), t("toast.successTitle"));
        close();
      } else {
        toast.error(t("toast.errorDesc"), t("toast.errorTitle"));
      }
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("toast.errorDesc"), t("toast.errorTitle"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // What the plan starts from, in one line: the article or the alert.
  const alertTitle = alertsData?.data?.find((a) => a.id === selectedAlertId)?.title || initialAlertTitle;
  const basis = initialSignalTitle
    ? { label: L("article", "berita"), title: initialSignalTitle }
    : alertTitle && selectedAlertId
      ? { label: L("alert", "peringatan"), title: alertTitle }
      : null;
  const linkedCount = (selectedAlertId && !(basis && !initialSignalTitle) ? 1 : 0) + (selectedClusterId ? 1 : 0);
  const suggested = initialStrategyType || "crisis_response";

  return (
    <ModalShell
      open={open}
      onClose={close}
      title={t("title")}
      description={L("Pick the kind of response. Narriv drafts the plan; you review it before anything is used.", "Pilih jenis respons. Narriv menyusun drafnya; Anda yang meninjau sebelum dipakai.")}
      closeLabel={L("Close", "Tutup")}
      footer={
        <>
          <button type="button" onClick={close} disabled={isSubmitting} className={secondaryButtonClass}>{t("cancel")}</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting} className={primaryButtonClass}>
            {isSubmitting ? L("Drafting…", "Menyusun…") : L("Create plan", "Buat rencana")}
          </button>
        </>
      }
    >
      {basis ? (
        <div className="mb-5 rounded-[12px] border border-[#465FFF]/20 bg-[#F5F7FF] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#3B52F5]">{L("Based on this", "Berdasarkan")} {basis.label}</p>
          <p className="mt-1 truncate text-[14px] font-black text-[#101334]" title={basis.title}>{basis.title}</p>
        </div>
      ) : null}

      <p className="mb-2 text-[12px] font-black text-[#101334]">{t("strategyLabel")}</p>
      <div role="radiogroup" aria-label={t("strategyLabel")} className="grid gap-2.5 sm:grid-cols-2">
        {strategyTypes.map((st) => {
          const isActive = strategyType === st.value;
          return (
            <button
              key={st.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setStrategyType(st.value)}
              className={cn(
                "rounded-[12px] border p-3.5 text-left transition",
                isActive ? "border-[#465FFF] bg-[#F5F7FF] ring-2 ring-[#465FFF]/15" : "border-[#E6EAF2] bg-white hover:border-[#C9D4F6]",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={cn("text-[13px] font-black", isActive ? "text-[#3B52F5]" : "text-[#101334]")}>{t(`strategy.${st.value}`)}</span>
                {st.value === suggested ? <span className="rounded-full bg-[#E8F7EF] px-2 py-0.5 text-[10px] font-black text-[#047857]">{L("Suggested", "Disarankan")}</span> : null}
              </span>
              <span className="mt-1 block text-[12px] font-medium leading-snug text-[#5A6478]">{t(st.descriptionKey)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-[12px] border border-[#EEF1F7]">
        <button type="button" onClick={() => setShowLinks((v) => !v)} aria-expanded={showLinks} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="text-[13px] font-black text-[#101334]">
            {L("Link to an alert or issue", "Kaitkan dengan peringatan atau isu")}
            <span className="ml-2 text-[12px] font-semibold text-[#5A6478]">{linkedCount > 0 ? L(`${linkedCount} linked`, `${linkedCount} terkait`) : L("optional", "opsional")}</span>
          </span>
          <span className="text-[12px] font-black text-[#3B52F5]">{showLinks ? L("Hide", "Tutup") : L("Show", "Buka")}</span>
        </button>
        {showLinks ? (
          <div className="grid gap-4 border-t border-[#EEF1F7] p-4 sm:grid-cols-2">
            <Field label={L("Alert", "Peringatan")} htmlFor="modal-alert-select">
              <select id="modal-alert-select" value={selectedAlertId} onChange={(e) => setSelectedAlertId(e.target.value)} className={inputClass}>
                <option value="">{L("None", "Tidak ada")}</option>
                {selectedAlertId && !alertsData?.data?.some((a) => a.id === selectedAlertId) ? <option value={selectedAlertId}>{initialAlertTitle || L("Selected alert", "Peringatan terpilih")}</option> : null}
                {alertsData?.data?.map((alert) => <option key={alert.id} value={alert.id}>{alert.title}</option>)}
              </select>
            </Field>
            <Field label={L("Issue", "Isu")} htmlFor="modal-cluster-select">
              <select id="modal-cluster-select" value={selectedClusterId} onChange={(e) => setSelectedClusterId(e.target.value)} className={inputClass}>
                <option value="">{L("None", "Tidak ada")}</option>
                {narrativesData?.data?.map((cluster) => <option key={cluster.id} value={cluster.id}>{cluster.title}</option>)}
              </select>
            </Field>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
