"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/dashboard-primitives";
import {
  createActionPlan,
  getAlerts,
  updateAlertAssignment,
  updateAlertStatus,
  buildAlertItems,
  type EscalationLevel,
} from "@/lib/api-service";

type AlertItem = {
  id: string;
  title: string;
  metric: string;
  detail: string;
  tone: string;
  status: string;
  assignedTo: string | null;
  assignedTeam: string | null;
  deadline: string | null;
  escalationLevel: EscalationLevel;
};

type AssignmentDraft = {
  assignedTo: string;
  assignedTeam: string;
  deadline: string;
  escalationLevel: EscalationLevel;
};

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

const displayDeadline = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function AlertsPage() {
  const t = useTranslations("Alerts");
  const router = useRouter();
  const [alertItems, setAlertItems] = useState<AlertItem[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [creatingActionId, setCreatingActionId] = useState<string | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>({ assignedTo: "", assignedTeam: "", deadline: "", escalationLevel: "medium" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const flow = [
    [t("flowSteps.recommendTitle"), t("flowSteps.recommendDesc")],
    [t("flowSteps.feedbackTitle"), t("flowSteps.feedbackDesc")],
    [t("flowSteps.scoreTitle"), t("flowSteps.scoreDesc")],
    [t("flowSteps.improveTitle"), t("flowSteps.improveDesc")],
    [t("flowSteps.betterTitle"), t("flowSteps.betterDesc")],
  ];

  useEffect(() => {
    getAlerts({ limit: 10 }).then((res) => {
      setAlertItems(res ? buildAlertItems(res.data) : []);
    });
  }, []);

  const handleStatusChange = async (id: string, status: "acknowledged" | "resolved") => {
    const updated = await updateAlertStatus(id, status);
    if (updated) {
      const [updatedItem] = buildAlertItems([updated]);
      setAlertItems((prev) =>
        prev.map((a) => (a.id === id ? updatedItem : a))
      );
    }
  };

  const handleCreateAction = async (alertId: string) => {
    setActionError(null);
    setCreatingActionId(alertId);
    const created = await createActionPlan({ strategyType: "crisis_response", alertId });
    setCreatingActionId(null);

    if (!created) {
      setActionError(t("createActionFailed"));
      return;
    }

    router.push("/action-plans");
  };

  const startAssignmentEdit = (item: AlertItem) => {
    setAssignmentError(null);
    setEditingAlertId(item.id);
    setAssignmentDraft({
      assignedTo: item.assignedTo ?? "",
      assignedTeam: item.assignedTeam ?? "",
      deadline: toDateTimeInputValue(item.deadline),
      escalationLevel: item.escalationLevel ?? "medium",
    });
  };

  const handleSaveAssignment = async (alertId: string) => {
    setAssignmentError(null);
    setSavingAssignmentId(alertId);
    const updated = await updateAlertAssignment(alertId, {
      assignedTo: assignmentDraft.assignedTo.trim() || null,
      assignedTeam: assignmentDraft.assignedTeam.trim() || null,
      deadline: assignmentDraft.deadline ? new Date(assignmentDraft.deadline).toISOString() : null,
      escalationLevel: assignmentDraft.escalationLevel,
    });
    setSavingAssignmentId(null);

    if (!updated) {
      setAssignmentError(t("assignmentFailed"));
      return;
    }

    const [updatedItem] = buildAlertItems([updated]);
    setAlertItems((prev) => prev.map((item) => (item.id === alertId ? updatedItem : item)));
    setEditingAlertId(null);
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <button
            type="button"
            onClick={() => setReviewed(true)}
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {reviewed ? t("reviewed") : t("learningQueue")}
          </button>
        }
      />

      {actionError ? (
        <div className="rounded-lg border border-[#F04438]/20 bg-[#F04438]/10 px-4 py-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">
          {actionError}
        </div>
      ) : null}

      {assignmentError ? (
        <div className="rounded-lg border border-[#F04438]/20 bg-[#F04438]/10 px-4 py-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">
          {assignmentError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_416px]">
        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t("queue")}</h2>
          <div className="mt-7 space-y-3">
            {alertItems.length ? alertItems.map((item) => (
              <div key={item.id} className="block">
                <InnerPanel className="min-h-[76px] px-4 py-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <p className="theme-text max-w-[360px] text-sm font-semibold">{item.title}</p>
                    <p className={`text-[13px] font-semibold ${item.tone}`}>{item.metric}</p>
                  </div>
                  <p className="theme-muted mt-2 text-xs">{item.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 theme-muted">{t("owner")}: <span className="theme-text">{item.assignedTo || t("unassigned")}</span></span>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 theme-muted">{t("team")}: <span className="theme-text">{item.assignedTeam || t("unassigned")}</span></span>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 theme-muted">{t("deadline")}: <span className="theme-text">{displayDeadline(item.deadline) || t("noDeadline")}</span></span>
                    <span className={`rounded-full border px-2.5 py-1 ${item.escalationLevel === "critical" || item.escalationLevel === "high" ? "border-[#F97066]/30 bg-[#F97066]/10 text-[#B42318] dark:text-[#FDA29B]" : item.escalationLevel === "medium" ? "border-[#FDB022]/30 bg-[#FDB022]/10 text-[#B54708]" : "border-[var(--border)] theme-muted"}`}>{t("escalationLabel")}: {t(`escalation.${item.escalationLevel}`)}</span>
                    <button type="button" onClick={() => startAssignmentEdit(item)} className="rounded-full border border-[#465FFF]/30 bg-[#465FFF]/10 px-2.5 py-1 text-[#465FFF] hover:border-[#465FFF]/50">
                      {editingAlertId === item.id ? t("editingAssignment") : t("quickEdit")}
                    </button>
                  </div>
                  {editingAlertId === item.id ? (
                    <form className="mt-3 grid gap-2 rounded-2xl border border-[#465FFF]/20 bg-[#465FFF]/[0.04] p-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void handleSaveAssignment(item.id); }}>
                      <input value={assignmentDraft.assignedTo} onChange={(event) => setAssignmentDraft((current) => ({ ...current, assignedTo: event.target.value }))} placeholder={t("assignedToPlaceholder")} className="theme-panel theme-text h-9 rounded-lg border border-[var(--border)] px-3 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50" />
                      <input value={assignmentDraft.assignedTeam} onChange={(event) => setAssignmentDraft((current) => ({ ...current, assignedTeam: event.target.value }))} placeholder={t("assignedTeamPlaceholder")} className="theme-panel theme-text h-9 rounded-lg border border-[var(--border)] px-3 text-xs outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50" />
                      <input type="datetime-local" value={assignmentDraft.deadline} onChange={(event) => setAssignmentDraft((current) => ({ ...current, deadline: event.target.value }))} className="theme-panel theme-text h-9 rounded-lg border border-[var(--border)] px-3 text-xs outline-none focus:border-[#465FFF]/50" />
                      <select value={assignmentDraft.escalationLevel} onChange={(event) => setAssignmentDraft((current) => ({ ...current, escalationLevel: event.target.value as EscalationLevel }))} className="theme-panel theme-text h-9 rounded-lg border border-[var(--border)] px-3 text-xs outline-none focus:border-[#465FFF]/50">
                        <option value="low">{t("escalation.low")}</option>
                        <option value="medium">{t("escalation.medium")}</option>
                        <option value="high">{t("escalation.high")}</option>
                        <option value="critical">{t("escalation.critical")}</option>
                      </select>
                      <div className="flex gap-2 sm:col-span-2">
                        <button type="submit" disabled={savingAssignmentId === item.id} className="rounded-md bg-[#465FFF] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-50">
                          {savingAssignmentId === item.id ? t("savingAssignment") : t("saveAssignment")}
                        </button>
                        <button type="button" onClick={() => setEditingAlertId(null)} className="rounded-md border border-[#465FFF33] px-3 py-1.5 text-xs font-semibold text-[#465FFF] hover:border-[#465FFF55]">
                          {t("cancel")}
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {item.status === "open" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "acknowledged")}
                        className="rounded-md bg-[#465FFF] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                      >
                        {t("acknowledge")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, "resolved")}
                        className="rounded-md border border-[#465FFF33] px-3 py-1 text-xs font-semibold text-[#465FFF] hover:border-[#465FFF55]"
                      >
                        {t("resolve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateAction(item.id)}
                        disabled={creatingActionId === item.id}
                        className="rounded-md border border-[#465FFF33] bg-[#465FFF0F] px-3 py-1 text-xs font-semibold text-[#465FFF] hover:border-[#465FFF55] disabled:pointer-events-none disabled:opacity-50"
                      >
                        {creatingActionId === item.id ? t("creatingAction") : t("createAction")}
                      </button>
                    </div>
                  )}
                  {item.status !== "open" && (
                    <span className="mt-2 inline-block rounded-full border border-[#12B76A]/30 bg-[#12B76A]/10 px-3 py-0.5 text-xs font-semibold text-[#027A48]">
                      {item.status}
                    </span>
                  )}
                </InnerPanel>
              </div>
            )) : <p className="theme-muted text-sm">{t("noAlerts")}</p>}
          </div>
        </DesignFrame>

        <DesignFrame className="min-h-[376px]">
          <h2 className="theme-text text-lg font-semibold">{t("scoring")}</h2>
          <p className="mt-8 text-[58px] font-semibold leading-none text-[#12B76A]">-</p>
          <p className="theme-muted mt-5 max-w-[330px] text-[13px] leading-[1.45]">
            {t("scoringDesc")}
          </p>
          <div className="mt-12 grid grid-cols-3 gap-5">
            {[[t("accepted"), "-"], [t("edited"), "-"], [t("rejected"), "-"]].map(
              ([label, value]) => (
                <div key={label}>
                  <p className="theme-muted text-xs font-semibold">{label}</p>
                  <p className="theme-text mt-2 text-[28px] font-semibold">{value}</p>
                </div>
              )
            )}
          </div>
          <button
            onClick={() => setReviewed(true)}
            className="mt-6 rounded-lg bg-[#465FFF] px-4 py-2 text-[13px] font-semibold text-white"
            type="button"
          >
            {reviewed ? t("reviewed") : t("learningQueue")}
          </button>
        </DesignFrame>
      </div>

      <DesignFrame className="min-h-[204px]">
        <h2 className="theme-text text-lg font-semibold">{t("flow")}</h2>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {flow.map(([title, detail], index) => (
            <div
              key={title}
              className={`flex min-h-[82px] flex-col gap-2 rounded-xl border p-4 ${index === 4 ? "border-[#465FFF33] bg-[#465FFF14]" : "theme-panel"}`}
            >
              <p className="theme-text text-sm font-semibold">{title}</p>
              <p className={`text-xs leading-[1.35] ${index === 4 ? "text-[#465FFF]" : "theme-muted"}`}>
                {detail}
              </p>
            </div>
          ))}
        </div>
      </DesignFrame>

      <div className="theme-soft rounded-2xl border border-[#465FFF33] bg-[#465FFF0F] p-[18px_24px] text-[13px] leading-[1.45]">
        {t("footer")}
      </div>
    </div>
  );
}
