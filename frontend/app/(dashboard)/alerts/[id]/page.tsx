"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, CalendarClock, CheckCircle2, Route, Save, ShieldAlert, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
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
  red: { badge: "bg-[#EF4444]/10 text-[#EF4444]", bubble: "bg-[#EF4444]/10 text-[#EF4444]", border: "border-[#F4D8D8]", panel: "from-[#FFF4F4]", text: "text-[#EF4444]" },
  amber: { badge: "bg-[#F59E0B]/12 text-[#B7791F]", bubble: "bg-[#F59E0B]/12 text-[#B7791F]", border: "border-[#F7DFC0]", panel: "from-[#FFF9ED]", text: "text-[#B7791F]" },
  blue: { badge: "bg-[#465FFF]/10 text-[#465FFF]", bubble: "bg-[#465FFF]/10 text-[#465FFF]", border: "border-[#DDE5FF]", panel: "from-[#F5F7FF]", text: "text-[#465FFF]" },
  green: { badge: "bg-[#10B981]/10 text-[#0C9B69]", bubble: "bg-[#10B981]/10 text-[#0C9B69]", border: "border-[#CFEFE3]", panel: "from-[#F4FFFA]", text: "text-[#0C9B69]" },
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
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function memberLabel(member: WorkspaceMemberRecord) {
  const displayName = member.user?.name || member.user?.email || member.userId;
  return `${displayName}${member.role ? ` (${member.role})` : ""}`;
}

function getDisplayEscalationRecords(records: EscalationMatrixRecord[] | null | undefined) {
  return [...(records ?? [])].sort((a, b) => a.order - b.order || a.level.localeCompare(b.level));
}

function StatusBadge({ children, tone }: { children: string; tone: DetailTone }) {
  return <span className={`rounded-[8px] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${toneClass[tone].badge}`}>{children}</span>;
}

function DetailStat({ icon: Icon, label, value, tone = "slate" }: { icon: typeof AlertTriangle; label: string; value: string; tone?: DetailTone }) {
  return (
    <div className="rounded-[14px] border border-[#E6EAF2] bg-white p-4 shadow-[0_1px_4px_rgba(16,24,40,0.03)]">
      <div className="flex items-center gap-2">
        <span className={`flex size-8 items-center justify-center rounded-full ${toneClass[tone].bubble}`}>
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8A94B8]">{label}</p>
      </div>
      <p className="mt-3 truncate text-[15px] font-black text-[#101334]" title={value}>{value}</p>
    </div>
  );
}

function AssignmentCard({
  alert,
  members,
  escalationRecords,
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
  const activeEscalationRecords = escalationRecords.filter((record) => record.isActive);

  const handleSaveAssignment = () => {
    onSave({
      assignedTo: nullableText(assignedTo),
      assignedTeam: nullableText(assignedTeam),
      deadline: toIsoDateTime(deadline),
      escalationLevel,
    });
  };

  return (
    <section className={`rounded-[18px] border ${toneClass[tone].border} bg-white shadow-[0_2px_14px_rgba(16,24,40,0.04)]`}>
      <div className="p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className={`flex size-10 items-center justify-center rounded-full ${toneClass[tone].bubble}`}>
            <Route size={18} strokeWidth={2.4} />
          </span>
          <div>
            <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#101334]">{td("assignment.title")}</h2>
            <p className="mt-1 text-[11px] font-bold text-[#68739F]">{td("assignment.desc")}</p>
          </div>
          <button
            type="button"
            onClick={handleSaveAssignment}
            disabled={isSaving}
            className="ml-auto flex h-10 items-center gap-2 rounded-[10px] bg-[#465FFF] px-4 text-[12px] font-black text-white shadow-[0_12px_22px_rgba(70,95,255,0.18)] transition hover:bg-[#3B4FE0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
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
                return <option key={member.id} value={label} title={label}>{label}</option>;
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
              {activeEscalationRecords.map((record) => {
                const label = `${record.roleName} (${record.level})`;
                return <option key={record.id} value={record.roleName} title={label}>{label}</option>;
              })}
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

  const title = liveData?.title ?? td("empty.title");
  const source = liveData?.type ?? "-";
  const issue = liveData?.type ?? "-";
  const whatHappened = liveData?.whatHappened || td("section.empty");
  const whyItMatters = liveData?.whyItMatters || td("section.empty");
  const whatToDo = liveData?.whatToDo || td("section.empty");
  const tone = mapSeverityTone(liveData?.severity);
  const currentStatus = liveData?.status || "open";
  const members = membersQuery.data ?? [];
  const escalationRecords = getDisplayEscalationRecords(escalationQuery.data);

  return (
    <div className="flex max-w-full flex-col gap-4 pb-6 text-[#101334]">
      <Link href="/alerts" className="inline-flex items-center gap-2 text-[13px] font-black text-[#68739F] transition hover:text-[#465FFF]">
        <ArrowLeft size={16} />
        {td("nav.back")}
      </Link>
      
      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : liveData ? (
        <section className={`overflow-hidden rounded-[20px] border ${toneClass[tone].border} bg-linear-to-br ${toneClass[tone].panel} via-white to-white shadow-[0_2px_16px_rgba(16,24,40,0.04)]`}>
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={tone}>{liveData.severity ?? "alert"}</StatusBadge>
              <StatusBadge tone="slate">{source}</StatusBadge>
              <span className="rounded-[8px] border border-[#E6EAF2] bg-white px-3 py-1.5 text-[10px] font-black text-[#68739F]">#{params.id}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                {(["open", "acknowledged", "resolved"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => statusMutation.mutate(status)}
                    disabled={statusMutation.isPending || currentStatus === status}
                    className={`h-9 rounded-[9px] px-3 text-[11px] font-black transition ${currentStatus === status ? "bg-[#465FFF] text-white shadow-[0_8px_18px_rgba(70,95,255,0.18)]" : "border border-[#DDE3EF] bg-white text-[#53608C] hover:bg-[#F8FAFF]"}`}
                  >
                    {status === "open" ? td("status.new") : status === "acknowledged" ? td("status.investigating") : td("status.resolved")}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-full ring-4 ring-white ${toneClass[tone].bubble}`}>
                    <ShieldAlert size={22} strokeWidth={2.4} />
                  </span>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8A94B8]">{td("liveDetail")}</p>
                </div>
                <h1 className="text-[32px] font-black leading-tight tracking-[-0.05em] text-[#070B28]">{title}</h1>
                <p className="mt-3 text-[13px] font-bold leading-6 text-[#53608C]">{td("issue.description", { issue })}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <DetailStat icon={UserRound} label={td("assignedTo")} value={liveData.assignedTo || "-"} tone="blue" />
                <DetailStat icon={CalendarClock} label={td("deadline")} value={formatDateTime(liveData.deadline)} tone={tone} />
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {[
                [td("section.whatHappened"), whatHappened],
                [td("section.whyItMatters"), whyItMatters],
                [td("section.whatToDo"), whatToDo],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-[#E6EAF2] bg-white/80 p-4 text-[13px] font-semibold leading-6 text-[#53608C]">
                  <span className={`mb-2 block text-[10px] font-black uppercase tracking-[0.16em] ${toneClass[tone].text}`}>{label}</span>
                  {value}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[14px] border border-[#CFEFE3] bg-[#F4FFFA] p-5">
              <p className="flex items-center gap-2 text-[13px] font-black text-[#0C9B69]">
                <CheckCircle2 size={17} />
                {td("recommendation.title")}
              </p>
              <p className="mt-2 text-[12px] font-bold leading-5 text-[#31406B]">{td("recommendation.desc")}</p>
              <Link href="/action-plans" className="mt-4 inline-flex h-9 items-center justify-center rounded-[9px] bg-[#10B981] px-4 text-[12px] font-black text-white shadow-[0_10px_20px_rgba(16,185,129,0.18)] transition hover:bg-[#0C9B69]">
                {td("createAction")}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <DashboardErrorState title={td("notFoundTitle")} description={td("notFoundDesc")} onRetry={() => void alertQuery.refetch()} minHeight="min-h-[220px]" />
      )}
      
      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : liveData ? (
        <AssignmentCard
          key={liveData.id}
          alert={liveData}
          members={members}
          escalationRecords={escalationRecords}
          isLoadingOptions={membersQuery.isLoading || escalationQuery.isLoading}
          isSaving={assignmentMutation.isPending}
          onSave={(input) => assignmentMutation.mutate(input)}
        />
      ) : null}
    </div>
  );
}
