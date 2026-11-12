"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { createCase, getWorkspaceMembers } from "@/lib/api-service";
import { useToast } from "@/components/ui/toast";
import { Field, ModalShell, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { memberName } from "@/lib/member-name";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

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

type Priority = "low" | "medium" | "high" | "critical";

// Each priority carries its own colour and a default response window; the deadline follows the choice
// until the user sets one by hand.
const PRIORITIES: Array<{ key: Priority; hours: number; fg: string; bg: string; window: [string, string] }> = [
  { key: "critical", hours: 2, fg: "#FFFFFF", bg: "#C81E1E", window: ["within 2 hours", "dalam 2 jam"] },
  { key: "high", hours: 8, fg: "#FFFFFF", bg: "#E8590C", window: ["today", "hari ini"] },
  { key: "medium", hours: 72, fg: "#FFFFFF", bg: "#465FFF", window: ["within 3 days", "dalam 3 hari"] },
  { key: "low", hours: 168, fg: "#FFFFFF", bg: "#12A66A", window: ["this week", "minggu ini"] },
];

/** datetime-local value (local time) for now + hours. */
function deadlineIn(hours: number) {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  const computedTitle = () => {
    if (alertTitle) return L(`Investigate: ${alertTitle}`, `Investigasi: ${alertTitle}`);
    if (signalTitle) return L(`Investigate: ${signalTitle}`, `Investigasi: ${signalTitle}`);
    return "";
  };
  const startPriority = initialPriority || (alertId ? "high" : "medium");

  const [title, setTitle] = useState(computedTitle());
  const [description, setDescription] = useState(initialDescription || "");
  const [priority, setPriority] = useState<Priority>(startPriority);
  const [assignee, setAssignee] = useState("");
  const [deadline, setDeadline] = useState(deadlineIn(PRIORITIES.find((p) => p.key === startPriority)!.hours));
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const membersQuery = useQuery({ queryKey: ["workspace-members"], queryFn: () => getWorkspaceMembers(), staleTime: 5 * 60 * 1000, enabled: open });
  const members = membersQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    setTitle(computedTitle());
    setDescription(initialDescription || "");
    setPriority(startPriority);
    setAssignee("");
    setDeadline(deadlineIn(PRIORITIES.find((p) => p.key === startPriority)!.hours));
    setDeadlineTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signalTitle, alertTitle, initialDescription, initialPriority]);

  const choosePriority = (p: Priority) => {
    setPriority(p);
    if (!deadlineTouched) setDeadline(deadlineIn(PRIORITIES.find((x) => x.key === p)!.hours));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const createdCase = await createCase({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        sourceType: alertId ? "alert" : "signal",
        sourceId: alertId || signalId,
        assignedTo: assignee || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
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
  const selected = PRIORITIES.find((p) => p.key === priority)!;

  return (
    <ModalShell
      open={open}
      onClose={close}
      title={t("title")}
      description={L("Give the case an owner and a deadline so it gets followed up.", "Beri kasus penanggung jawab dan tenggat agar pasti ditindaklanjuti.")}
      closeLabel={L("Close", "Tutup")}
      size="md"
      footer={
        <>
          <button type="button" onClick={close} disabled={isSubmitting} className={secondaryButtonClass}>{t("cancel")}</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !title.trim()} className={primaryButtonClass}>
            {isSubmitting ? L("Saving…", "Menyimpan…") : t("submit")}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {basis ? (
          <div className="rounded-[12px] bg-[#EEF1FF] px-4 py-3">
            <p className="text-[11px] font-black text-[#3B52F5]">{alertTitle ? L("From this alert", "Dari peringatan") : L("From this article", "Dari berita")}</p>
            <p className="mt-1 line-clamp-2 text-[14px] font-black leading-snug text-[#101334]" title={basis}>{basis}</p>
          </div>
        ) : null}

        <Field label={t("titleLabel")} htmlFor="case-title">
          <input id="case-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L("e.g. Verify the data-leak claim on X", "mis. Verifikasi klaim kebocoran data di X")} className={inputClass} />
        </Field>

        <div>
          <p className="mb-1.5 text-[12px] font-black text-[#101334]">{t("priorityLabel")}</p>
          <div role="radiogroup" aria-label={t("priorityLabel")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIORITIES.map((p) => {
              const active = priority === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choosePriority(p.key)}
                  className={cn("rounded-[12px] px-3 py-2.5 text-left transition", active ? "shadow-[0_6px_16px_rgba(16,19,52,0.18)]" : "bg-[#F4F6FC] hover:bg-[#EBEEF7]")}
                  style={active ? { background: p.bg, color: p.fg } : undefined}
                >
                  <span className={cn("block text-[13px] font-black", active ? "" : "text-[#101334]")}>{t(`priority.${p.key}`)}</span>
                  <span className={cn("mt-0.5 block text-[11px] font-bold", active ? "text-white/85" : "text-[#5A6478]")}>{L(...p.window)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L("Owner", "Penanggung jawab")} htmlFor="case-owner">
            <select id="case-owner" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
              <option value="">{L("Not assigned yet", "Belum ditunjuk")}</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{memberName(m)}</option>)}
            </select>
          </Field>
          <Field label={L("Deadline", "Tenggat")} htmlFor="case-deadline" hint={deadlineTouched ? undefined : L(`Set from the priority: ${L(...selected.window)}`, `Mengikuti prioritas: ${L(...selected.window)}`)}>
            <input id="case-deadline" type="datetime-local" value={deadline} onChange={(e) => { setDeadline(e.target.value); setDeadlineTouched(true); }} className={inputClass} />
          </Field>
        </div>

        <Field label={t("descriptionLabel")} htmlFor="case-description">
          <textarea id="case-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L("What needs checking, and what does done look like?", "Apa yang perlu dicek, dan kapan dianggap selesai?")} className={`${inputClass} h-auto py-2.5`} />
        </Field>
      </div>
    </ModalShell>
  );
}
