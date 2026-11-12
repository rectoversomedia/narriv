"use client";

import Link from "next/link";
import { intlLocale } from "@/store/useUiStore";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assigneeName } from "@/lib/member-name";
import { teamOptions } from "@/lib/teams";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { CreateInvestigationModal } from "@/app/(dashboard)/signals/components/create-investigation-modal";
import {
  getAlertById,
  getEscalationMatrix,
  getWorkspaceMembers,
  updateAlertStatus,
  updateAlertAssignment,
  type Alert,
  type EscalationLevel,
  type EscalationMatrixRecord,
  type WorkspaceMemberRecord,
} from "@/lib/api-service";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";

type DetailTone = "red" | "amber" | "blue" | "green" | "slate";

const toneClass: Record<DetailTone, { badge: string; bubble: string; border: string; panel: string; text: string }> = {
  red: { badge: "bg-[#EF4444]/10 text-[#C81E1E]", bubble: "bg-[#EF4444]/10 text-[#C81E1E]", border: "border-[#E6EAF2]", panel: "from-[#FFF4F4]", text: "text-[#C81E1E]" },
  amber: { badge: "bg-[#F59E0B]/12 text-[#B7791F]", bubble: "bg-[#F59E0B]/12 text-[#B7791F]", border: "border-[#E6EAF2]", panel: "from-[#FFF9ED]", text: "text-[#B7791F]" },
  blue: { badge: "bg-[#465FFF]/10 text-[#3B52F5]", bubble: "bg-[#465FFF]/10 text-[#3B52F5]", border: "border-[#E6EAF2]", panel: "from-[#F5F7FF]", text: "text-[#3B52F5]" },
  green: { badge: "bg-[#10B981]/10 text-[#047857]", bubble: "bg-[#10B981]/10 text-[#047857]", border: "border-[#E6EAF2]", panel: "from-[#F4FFFA]", text: "text-[#047857]" },
  slate: { badge: "bg-slate-100 text-slate-600", bubble: "bg-slate-100 text-slate-600", border: "border-[#E3E8F2]", panel: "from-[#F8FAFC]", text: "text-slate-600" },
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapSeverityTone(severity?: string | null): DetailTone {
  if (severity === "critical" || severity === "high") return "red";
  if (severity === "medium") return "amber";
  if (severity === "low") return "blue";
  return "slate";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  // The year shows whenever it is not this one, so an old article never passes for a recent one.
  const year = date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined;
  return date.toLocaleString(intlLocale(), { day: "2-digit", month: "short", year, hour: "2-digit", minute: "2-digit" });
}

function memberLabel(member: WorkspaceMemberRecord) {
  const displayName = member.user?.name || member.user?.email || member.userId;
  return `${displayName}${member.role ? ` (${member.role})` : ""}`;
}

function getDisplayEscalationRecords(records: EscalationMatrixRecord[] | null | undefined) {
  return [...(records ?? [])].sort((a, b) => a.order - b.order || a.level.localeCompare(b.level));
}



function severityLabel(severity: string | null | undefined, L: (en: string, id: string) => string) {
  const v = String(severity || "").toLowerCase();
  if (v === "critical") return L("Critical", "Kritis");
  if (v === "high") return L("High", "Tinggi");
  if (v === "medium") return L("Medium", "Sedang");
  return L("Low", "Rendah");
}
function severityTag(severity: string | null | undefined) {
  const v = String(severity || "").toLowerCase();
  return v === "critical" ? "bg-[#B42318] text-white" : v === "high" ? "bg-[#FDECEC] text-[#B42318]" : v === "medium" ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#EEF1F7] text-[#465170]";
}
function sentimentLabel(sentiment: string | null | undefined, L: (en: string, id: string) => string) {
  const v = String(sentiment || "").toLowerCase();
  if (v.includes("neg")) return L("Negative", "Negatif");
  if (v.includes("pos")) return L("Positive", "Positif");
  if (v.includes("mix")) return L("Mixed", "Campuran");
  if (v.includes("neu")) return L("Neutral", "Netral");
  return L("Not analysed", "Belum dianalisis");
}
function sentimentTag(sentiment: string | null | undefined) {
  const v = String(sentiment || "").toLowerCase();
  return v.includes("neg") ? "bg-[#FDECEC] text-[#B42318]" : v.includes("pos") ? "bg-[#E8F7EF] text-[#047857]" : v.includes("mix") ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#EEF1F7] text-[#465170]";
}

function AssignmentCard({
  alert,
  members,
  escalationRecords: _escalationRecords,
  isLoadingOptions,
  isSaving,
  onSave,
}: {
  alert: Alert;
  members: WorkspaceMemberRecord[];
  escalationRecords: EscalationMatrixRecord[];
  isLoadingOptions: boolean;
  isSaving: boolean;
  onSave: (input: { assignedTo: string | null; assignedTeam: string | null; deadline: string | null; escalationLevel?: EscalationLevel }) => void;
}) {
  const td = useTranslations("AlertDetail");
  const [assignedTo, setAssignedTo] = useState(alert?.assignedTo ?? "");
  const [assignedTeam, setAssignedTeam] = useState(alert?.assignedTeam ?? "");
  const [deadline, setDeadline] = useState(toDateTimeLocalValue(alert?.deadline));
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>((alert?.escalationLevel ?? alert?.severity ?? "medium") as EscalationLevel);
  const tone = mapSeverityTone(alert?.severity);

  const handleSaveAssignment = () => {
    onSave({
      assignedTo: nullableText(assignedTo),
      assignedTeam: nullableText(assignedTeam),
      deadline: toIsoDateTime(deadline),
      escalationLevel,
    });
  };

  return (
    <section id="assignment" className={`scroll-mt-24 rounded-[18px] border ${toneClass[tone].border} bg-white shadow-[0_2px_14px_rgba(16,24,40,0.04)]`}>
      <div className="p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#101334]">{td("assignment.title")}</h2>
          </div>
          <button
            type="button"
            onClick={handleSaveAssignment}
            disabled={isSaving}
            className="ml-auto flex h-10 items-center gap-2 rounded-[10px] bg-[#465FFF] px-4 text-[12px] font-black text-white shadow-sm transition hover:bg-[#3B4FE0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? td("assignment.saving") : td("assignment.save")}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-[#31406B]">{td("assignedTo")}</span>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={isLoadingOptions}
              title={assignedTo || td("assignedToPlaceholder")}
              className="h-11 w-full rounded-[10px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white disabled:opacity-60"
            >
              <option value="" title={td("assignedToPlaceholder")}>{td("assignedToPlaceholder")}</option>
              {members.map((member) => {
                const label = memberLabel(member);
                return <option key={member.id} value={member.userId} title={label}>{label}</option>;
              })}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-[#31406B]">{td("assignedTeam")}</span>
            <select
              value={assignedTeam}
              onChange={(e) => setAssignedTeam(e.target.value)}
              disabled={isLoadingOptions}
              title={assignedTeam || td("assignedTeamPlaceholder")}
              className="h-11 w-full rounded-[10px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white disabled:opacity-60"
            >
              <option value="" title={td("assignedTeamPlaceholder")}>{td("assignedTeamPlaceholder")}</option>
              {teamOptions(assignedTeam).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-[#31406B]">{td("deadline")}</span>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 w-full rounded-[10px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-[#31406B]">{td("escalationLevel")}</span>
            <select
              value={escalationLevel}
              onChange={(e) => setEscalationLevel(e.target.value as EscalationLevel)}
              title={td(`escalation.${escalationLevel}`)}
              className="h-11 w-full rounded-[10px] border border-[#DDE3EF] bg-[#F8FAFF] px-3 text-[12px] font-bold text-[#101334] outline-none transition focus:border-[#465FFF] focus:bg-white"
            >
              {(["low", "medium", "high", "critical"] as EscalationLevel[]).map((level) => {
                const label = td(`escalation.${level}`);
                return <option key={level} value={level} title={label}>{label}</option>;
              })}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const td = useTranslations("AlertDetail");
  const queryClient = useQueryClient();
  const toastHook = useToast();
  const [isActionPlanModalOpen, setIsActionPlanModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    toastHook.success(message);
  };
  
  const alertQuery = useQuery({
    queryKey: ["alert-detail", params.id],
    queryFn: () => getAlertById(params.id),
    staleTime: 30 * 1000,
  });
  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: () => getWorkspaceMembers(),
    staleTime: 5 * 60 * 1000,
  });
  const escalationQuery = useQuery({
    queryKey: ["escalation-matrix"],
    queryFn: () => getEscalationMatrix(),
    staleTime: 5 * 60 * 1000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: "open" | "acknowledged" | "resolved") => updateAlertStatus(params.id, status),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["alert-detail", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast(result ? td("toast.statusUpdated") : td("toast.statusUpdateFailed"), result ? "success" : "error");
    },
    onError: () => showToast(td("toast.statusUpdateFailed"), "error"),
  });

  const assignmentMutation = useMutation({
    mutationFn: (input: { assignedTo?: string | null; assignedTeam?: string | null; deadline?: string | null; escalationLevel?: EscalationLevel }) => updateAlertAssignment(params.id, input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["alert-detail", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast(result ? td("toast.assignmentSaved") : td("toast.assignmentFailed"), result ? "success" : "error");
    },
    onError: () => showToast(td("toast.assignmentFailed"), "error"),
  });

  const liveData = alertQuery.data;

  const L = useL();
  const title = liveData?.title ?? td("empty.title");
  const whatHappened = liveData?.whatHappened || (liveData as any)?.what_happened || (liveData as any)?.description || td("section.empty");
  const whyItMatters = liveData?.whyItMatters || (liveData as any)?.why_it_matters || td("section.empty");
  const whatToDo = liveData?.whatToDo || (liveData as any)?.what_to_do || td("section.empty");
  const tone = mapSeverityTone(liveData?.severity);
  const currentStatus = liveData?.status || "open";
  const members = membersQuery.data ?? [];
  const escalationRecords = getDisplayEscalationRecords(escalationQuery.data);

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      <Link href="/alerts" className="inline-flex items-center gap-2 text-[13px] font-black text-[#5F6B94] transition hover:text-[#3B52F5]">
        {td("nav.back")}
      </Link>
      
      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : liveData ? (
        <section className={`overflow-hidden rounded-[20px] border ${toneClass[tone].border} bg-white shadow-[0_2px_16px_rgba(16,24,40,0.04)]`}>
          <div className="p-5 sm:p-6">
            {/* Severity and status: the two facts that decide how fast to move. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-[6px] px-2.5 py-1 text-[11px] font-black ${severityTag(liveData.severity)}`}>{severityLabel(liveData.severity, L)}</span>
              <div role="group" aria-label={L("Status", "Status")} className="flex rounded-[10px] border border-[#DDE3EF] bg-white p-1">
                {(["open", "acknowledged", "resolved"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => statusMutation.mutate(status)}
                    disabled={statusMutation.isPending || currentStatus === status}
                    aria-pressed={currentStatus === status}
                    className={`rounded-[7px] px-3 py-1.5 text-[11px] font-black transition ${currentStatus === status ? "bg-[#465FFF] text-white" : "text-[#53608C] hover:text-[#101334]"}`}
                  >
                    {status === "open" ? td("status.new") : status === "acknowledged" ? td("status.investigating") : td("status.resolved")}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="mt-4 text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{title}</h1>

            {/* Who owns it and by when; missing answers are marked, because that is what to fix first. */}
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: L("Owner", "Penanggung jawab"), value: assigneeName(liveData.assignedTo || (liveData as any)?.assigned_to, members) || liveData.assignedTeam || null, missing: L("Not assigned", "Belum ditunjuk") },
                { label: L("Deadline", "Tenggat"), value: liveData.deadline ? formatDateTime(liveData.deadline) : null, missing: L("No deadline", "Belum ada tenggat") },
                { label: L("Raised", "Muncul"), value: formatDateTime(liveData.createdAt), missing: "-" },
              ].map((item) => (
                <div key={item.label} className={`rounded-[12px] border p-3 ${item.value ? "border-[#E6EAF2] bg-[#FBFCFF]" : "border-transparent bg-[#FFF5F4]"}`}>
                  <dt className="text-[11px] font-bold text-[#5F6B94]">{item.label}</dt>
                  <dd className={`mt-1 text-[14px] font-black ${item.value ? "text-[#101334]" : "text-[#B42318]"}`}>{item.value || item.missing}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                [L("What happened", "Apa yang terjadi"), whatHappened],
                [L("Why it matters", "Kenapa penting"), whyItMatters],
                [L("What to do", "Yang perlu dilakukan"), whatToDo],
              ].map(([label, value], index) => (
                <div key={label} className={`rounded-[14px] border p-4 text-[13px] font-semibold leading-6 ${index === 2 ? "border-transparent bg-[#F5F7FF] text-[#101334]" : "border-[#E6EAF2] bg-white text-[#53608C]"}`}>
                  <span className="mb-1.5 block text-[12px] font-black text-[#101334]">{label}</span>
                  {value}
                </div>
              ))}
            </div>

            {/* One place for the next steps, in the order they are usually done. */}
            <div className="mt-5 rounded-[14px] border border-[#E6EAF2] bg-[#FBFCFF] p-4">
              <p className="text-[13px] font-black text-[#101334]">{L("Next steps", "Langkah berikutnya")}</p>
              <ol className="mt-3 grid gap-2.5 md:grid-cols-3">
                <li>
                  <a href="#assignment" className="flex h-full items-start gap-3 rounded-[10px] border border-[#E6EAF2] bg-white p-3 transition hover:border-[#465FFF]/40">
                    <span className="text-[16px] font-black text-[#465FFF]">1</span>
                    <span><b className="block text-[13px] font-black text-[#101334]">{L("Assign an owner and deadline", "Tunjuk penanggung jawab & tenggat")}</b><span className="text-[11px] font-semibold text-[#5F6B94]">{L("So someone is accountable", "Supaya jelas siapa yang bertanggung jawab")}</span></span>
                  </a>
                </li>
                <li>
                  <button type="button" onClick={() => setIsActionPlanModalOpen(true)} className="flex h-full w-full items-start gap-3 rounded-[10px] border border-[#E6EAF2] bg-white p-3 text-left transition hover:border-[#465FFF]/40">
                    <span className="text-[16px] font-black text-[#465FFF]">2</span>
                    <span><b className="block text-[13px] font-black text-[#101334]">{L("Create Action Plan", "Buat Rencana Aksi")}</b><span className="text-[11px] font-semibold text-[#5F6B94]">{L("AI drafts it; you approve", "Disusun AI, Anda yang menyetujui")}</span></span>
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => statusMutation.mutate("resolved")} disabled={statusMutation.isPending || currentStatus === "resolved"} className="flex h-full w-full items-start gap-3 rounded-[10px] border border-[#E6EAF2] bg-white p-3 text-left transition hover:border-[#465FFF]/40 disabled:opacity-50">
                    <span className="text-[16px] font-black text-[#465FFF]">3</span>
                    <span><b className="block text-[13px] font-black text-[#101334]">{L("Mark as resolved", "Tandai selesai")}</b><span className="text-[11px] font-semibold text-[#5F6B94]">{L("When the issue is handled", "Setelah isunya tertangani")}</span></span>
                  </button>
                </li>
              </ol>
              <button type="button" onClick={() => setIsCaseModalOpen(true)} className="mt-3 text-[12px] font-bold text-[#3B52F5] hover:underline">
                {L("Needs a longer investigation? Open it as a case →", "Perlu investigasi lebih panjang? Jadikan kasus →")}
              </button>
            </div>

            <section aria-label={L("Evidence", "Bukti")} className="mt-5">
              <p className="text-[13px] font-black text-[#101334]">{L("Evidence", "Bukti")} <span className="font-bold text-[#5F6B94]">({liveData.evidence?.length ?? 0} {L("articles", "berita")})</span></p>
              {liveData.evidence && liveData.evidence.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {liveData.evidence.map((sig) => (
                    <li key={sig.id} className="flex flex-wrap items-start justify-between gap-2 rounded-[10px] border border-[#EEF1F7] p-3">
                      <span className="min-w-0">
                        {sig.url ? (
                          <a href={sig.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold text-[#101334] underline-offset-2 hover:text-[#3B52F5] hover:underline">{sig.title}</a>
                        ) : (
                          <span className="text-[13px] font-bold text-[#101334]">{sig.title}</span>
                        )}
                        <span className="mt-0.5 block text-[11px] font-semibold text-[#647099]">{sig.publisher || sig.platform || L("Unknown source", "Sumber tidak diketahui")} · {formatDateTime(sig.publishedAt || sig.capturedAt)}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${sentimentTag(sig.sentiment)}`}>{sentimentLabel(sig.sentiment, L)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] font-semibold text-[#647099]">{L("No linked articles are stored for this alert.", "Belum ada berita yang tertaut ke peringatan ini.")}</p>
              )}
              {liveData.evidenceMissing ? <p className="mt-2 text-[11px] font-semibold text-[#647099]">{L(`${liveData.evidenceMissing} linked article(s) are no longer available.`, `${liveData.evidenceMissing} berita tertaut sudah tidak tersedia.`)}</p> : null}
              {liveData.triggeredBy ? <p className="mt-2 text-[11px] font-semibold text-[#647099]">{L("Raised automatically by Narriv's monitoring rules.", "Dibuat otomatis oleh aturan pemantauan Narriv.")}</p> : null}
            </section>
          </div>
        </section>
      ) : (
        <DashboardErrorState title={td("notFoundTitle")} description={td("notFoundDesc")} onRetry={() => void alertQuery.refetch()} minHeight="min-h-[220px]" />
      )}
      
      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : liveData ? (
        <>
          <AssignmentCard
            key={liveData.id}
            alert={liveData}
            members={members}
            escalationRecords={escalationRecords}
            isLoadingOptions={membersQuery.isLoading || escalationQuery.isLoading}
            isSaving={assignmentMutation.isPending}
            onSave={(input) => assignmentMutation.mutate(input)}
          />
          <CreateActionPlanModal
            open={isActionPlanModalOpen}
            onOpenChange={setIsActionPlanModalOpen}
            initialAlertId={params.id}
            initialAlertTitle={title}
            initialStrategyType={liveData.severity === "critical" || liveData.severity === "high" ? "crisis_response" : "pr_response"}
          />
          <CreateInvestigationModal
            open={isCaseModalOpen}
            onOpenChange={setIsCaseModalOpen}
            alertId={params.id}
            alertTitle={title}
            initialPriority={(liveData.severity as any) || "medium"}
            initialDescription={whatHappened !== td("section.empty") ? whatHappened : undefined}
          />
        </>
      ) : null}
    </div>
  );
}
