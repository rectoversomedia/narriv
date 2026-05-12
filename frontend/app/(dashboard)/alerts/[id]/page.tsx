"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { StatusBadge, SurfaceCard } from "@/components/ui/dashboard-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackBanner, type FeedbackMessage } from "@/components/ui/FeedbackBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { createActionPlan, getAlertById, updateAlertAssignment, type Alert, type EscalationLevel } from "@/lib/api-service";

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("AlertDetail");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ assignedTo: "", assignedTeam: "", deadline: "", escalationLevel: "medium" as EscalationLevel });
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    async function fetchAlert() {
      setIsLoading(true);
      const nextAlert = await getAlertById(params.id);
      setAlert(nextAlert);
      if (nextAlert) {
        setAssignmentForm({
          assignedTo: nextAlert.assignedTo ?? "",
          assignedTeam: nextAlert.assignedTeam ?? "",
          deadline: toDateTimeInputValue(nextAlert.deadline),
          escalationLevel: nextAlert.escalationLevel ?? "medium",
        });
      }
      setIsLoading(false);
    }

    fetchAlert();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/alerts" className="theme-muted inline-flex items-center gap-2 text-sm font-semibold transition hover:text-[#465FFF]">
          <ArrowLeft size={16} /> {t("backToAlerts")}
        </Link>
        <EmptyState icon="search" title={t("notFoundTitle")} description={t("notFoundDesc")} />
      </div>
    );
  }

  const detailItems = [alert.whatHappened, alert.whyItMatters, alert.whatToDo].filter(Boolean);

  const handleCreateAction = async () => {
    setActionError(null);
    setIsCreatingAction(true);
    const created = await createActionPlan({ strategyType: "crisis_response", alertId: alert.id });
    setIsCreatingAction(false);

    if (!created) {
      setActionError(t("createActionFailed"));
      return;
    }

    router.push("/action-plans");
  };

  const handleSaveAssignment = async () => {
    setIsSavingAssignment(true);
    const updated = await updateAlertAssignment(alert.id, {
      assignedTo: assignmentForm.assignedTo.trim() || null,
      assignedTeam: assignmentForm.assignedTeam.trim() || null,
      deadline: assignmentForm.deadline ? new Date(assignmentForm.deadline).toISOString() : null,
      escalationLevel: assignmentForm.escalationLevel,
    });
    setIsSavingAssignment(false);

    if (!updated) {
      setFeedback({ tone: "error", title: t("assignmentFailed"), description: t("assignmentFailedDesc") });
      return;
    }

    setAlert(updated);
    setFeedback({ tone: "success", title: t("assignmentSaved"), description: t("assignmentSavedDesc") });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/alerts" className="theme-muted inline-flex items-center gap-2 text-sm font-semibold transition hover:text-[#465FFF]">
        <ArrowLeft size={16} /> {t("backToAlerts")}
      </Link>
      <FeedbackBanner message={feedback} />
      <SurfaceCard className="p-6 md:p-8">
        <div className="flex flex-wrap gap-2"><StatusBadge tone="amber">{alert.severity ?? "medium"}</StatusBadge><StatusBadge tone="slate">{alert.status}</StatusBadge></div>
        <h1 className="theme-text mt-5 text-3xl font-semibold tracking-tight">{alert.title}</h1>
        <p className="theme-muted mt-3 text-sm leading-6">{alert.whyItMatters ?? alert.whatHappened ?? t("liveDetail")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {detailItems.map((item) => <div key={item} className="theme-subtle theme-soft rounded-2xl border border-[var(--border)] p-4 text-sm">{item}</div>)}
        </div>
        <div className="theme-soft mt-8 rounded-2xl border border-[#12B76A]/30 bg-[#12B76A]/10 p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-[#027A48]"><CheckCircle2 size={16} /> {t("recommendedStep")}</p>
          <p className="mt-2">{alert.whatToDo ?? t("routeTo")}</p>
          <button
            type="button"
            onClick={() => void handleCreateAction()}
            disabled={isCreatingAction}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isCreatingAction ? t("creatingAction") : t("createAction")}
          </button>
          {actionError ? <p className="mt-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">{actionError}</p> : null}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-6 md:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="theme-text text-xl font-semibold tracking-tight">{t("assignmentTitle")}</h2>
            <p className="theme-muted mt-1 text-sm leading-6">{t("assignmentDesc")}</p>
          </div>
          <StatusBadge tone={assignmentForm.escalationLevel === "critical" || assignmentForm.escalationLevel === "high" ? "red" : assignmentForm.escalationLevel === "medium" ? "amber" : "slate"}>{assignmentForm.escalationLevel}</StatusBadge>
        </div>
        <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void handleSaveAssignment(); }}>
          <label className="space-y-1.5">
            <span className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("assignedTo")}</span>
            <input value={assignmentForm.assignedTo} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignedTo: event.target.value }))} placeholder={t("assignedToPlaceholder")} className="theme-panel theme-text h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50" />
          </label>
          <label className="space-y-1.5">
            <span className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("assignedTeam")}</span>
            <input value={assignmentForm.assignedTeam} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignedTeam: event.target.value }))} placeholder={t("assignedTeamPlaceholder")} className="theme-panel theme-text h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50" />
          </label>
          <label className="space-y-1.5">
            <span className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("deadline")}</span>
            <input type="datetime-local" value={assignmentForm.deadline} onChange={(event) => setAssignmentForm((current) => ({ ...current, deadline: event.target.value }))} className="theme-panel theme-text h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[#465FFF]/50" />
          </label>
          <label className="space-y-1.5">
            <span className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("escalationLevel")}</span>
            <select value={assignmentForm.escalationLevel} onChange={(event) => setAssignmentForm((current) => ({ ...current, escalationLevel: event.target.value as EscalationLevel }))} className="theme-panel theme-text h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[#465FFF]/50">
              <option value="low">{t("escalation.low")}</option>
              <option value="medium">{t("escalation.medium")}</option>
              <option value="high">{t("escalation.high")}</option>
              <option value="critical">{t("escalation.critical")}</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={isSavingAssignment} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50">
              {isSavingAssignment ? t("savingAssignment") : t("saveAssignment")}
            </button>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
