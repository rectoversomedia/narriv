"use client";

import Link from "next/link";
import { intlLocale } from "@/store/useUiStore";
import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Briefcase, CheckCircle2, Clock3, FileText, Hand, Sparkles, UserX } from "lucide-react";
import { assigneeName } from "@/lib/member-name";
import { teamOptions } from "@/lib/teams";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { useToast } from "@/components/ui/toast";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { CreateInvestigationModal } from "@/app/(dashboard)/signals/components/create-investigation-modal";
import {
  getAlertById,
  getWorkspaceMembers,
  updateAlertStatus,
  updateAlertAssignment,
  type Alert,
  type AlertEvidence,
  type EscalationLevel,
  type WorkspaceMemberRecord,
} from "@/lib/api-service";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";

// One alert, laid out for deciding and acting: the top says how bad it is, how much time is left and the one thing to
// do (with the buttons for it); the left column is the why and the evidence; the right column is the handling desk
// (status, owner, deadline) that stays in view while reading.

type Status = "open" | "acknowledged" | "resolved";
type L = (en: string, id: string) => string;

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

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  // The year shows whenever it is not this one, so an old article never passes for a recent one.
  const year = date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined;
  return date.toLocaleString(intlLocale(), { day: "2-digit", month: "short", year, hour: "2-digit", minute: "2-digit" });
}

/** "3 h left" / "Overdue 12 h", for the deadline stamp. */
function deadlineLeft(deadline: string | null | undefined, L: L): { text: string; overdue: boolean } | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  const hours = Math.round(Math.abs(ms) / 3600000);
  const span = hours >= 48 ? L(`${Math.round(hours / 24)} days`, `${Math.round(hours / 24)} hari`) : hours >= 1 ? L(`${hours} h`, `${hours} jam`) : L("< 1 h", "< 1 jam");
  return ms < 0 ? { text: L(`Overdue ${span}`, `Lewat ${span}`), overdue: true } : { text: L(`${span} left`, `Sisa ${span}`), overdue: false };
}

function memberLabel(member: WorkspaceMemberRecord) {
  const displayName = member.user?.name || member.user?.email || member.userId;
  return `${displayName}${member.role ? ` (${member.role})` : ""}`;
}

function severityLabel(severity: string | null | undefined, L: L) {
  const v = String(severity || "").toLowerCase();
  if (v === "critical") return L("Critical", "Kritis");
  if (v === "high") return L("High", "Tinggi");
  if (v === "medium") return L("Medium", "Sedang");
  return L("Low", "Rendah");
}
/** The colour of the severity: the stamp and the band across the top of the alert. */
function severityTone(severity: string | null | undefined) {
  const v = String(severity || "").toLowerCase();
  if (v === "critical") return { stamp: "bg-[#B42318] text-white", band: "bg-[#B42318]" };
  if (v === "high") return { stamp: "bg-[#FDECEC] text-[#B42318]", band: "bg-[#EF4444]" };
  if (v === "medium") return { stamp: "bg-[#FFF4E5] text-[#A04606]", band: "bg-[#F59E0B]" };
  return { stamp: "bg-[#EEF1F7] text-[#465170]", band: "bg-[#465FFF]" };
}
function sentimentLabel(sentiment: string | null | undefined, L: L) {
  const v = String(sentiment || "").toLowerCase();
  if (v.includes("neg")) return L("Negative", "Negatif");
  if (v.includes("pos")) return L("Positive", "Positif");
  if (v.includes("mix")) return L("Mixed", "Campuran");
  if (v.includes("neu")) return L("Neutral", "Netral");
  return L("Not analysed", "Belum dianalisis");
}
function sentimentDot(sentiment: string | null | undefined) {
  const v = String(sentiment || "").toLowerCase();
  return v.includes("neg") ? "bg-[#EF4444]" : v.includes("pos") ? "bg-[#10B981]" : v.includes("mix") ? "bg-[#F59E0B]" : "bg-[#94A3B8]";
}

/** A small mono label above a block, the Narriv "stamp" voice. */
function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#5F6B94]", className)}>{children}</p>;
}

const STATUS_STEPS: Status[] = ["open", "acknowledged", "resolved"];

/** Quick deadlines from now, so setting one is a click rather than a date picker. */
function quickDeadlines(L: L): Array<{ label: string; at: () => Date }> {
  const at = (fn: (d: Date) => void) => () => { const d = new Date(); fn(d); return d; };
  return [
    { label: L("2 Hours", "2 Jam"), at: at((d) => d.setHours(d.getHours() + 2)) },
    { label: L("Today", "Hari Ini"), at: at((d) => d.setHours(Math.max(d.getHours() + 1, 17), 0, 0, 0)) },
    { label: L("Tomorrow", "Besok"), at: at((d) => { d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); }) },
    { label: L("3 Days", "3 Hari"), at: at((d) => { d.setDate(d.getDate() + 3); d.setHours(12, 0, 0, 0); }) },
  ];
}

function HandlingDesk({
  alert,
  members,
  status,
  isLoadingOptions,
  isSaving,
  isChangingStatus,
  onStatus,
  onSave,
  onOpenCase,
}: {
  alert: Alert;
  members: WorkspaceMemberRecord[];
  status: Status;
  isLoadingOptions: boolean;
  isSaving: boolean;
  isChangingStatus: boolean;
  onStatus: (status: Status) => void;
  onSave: (input: { assignedTo: string | null; assignedTeam: string | null; deadline: string | null; escalationLevel?: EscalationLevel }) => void;
  onOpenCase: () => void;
}) {
  const td = useTranslations("AlertDetail");
  const L = useL();
  const initialLevel = (alert?.escalationLevel ?? alert?.severity ?? "medium") as EscalationLevel;
  const [assignedTo, setAssignedTo] = useState(alert?.assignedTo ?? "");
  const [assignedTeam, setAssignedTeam] = useState(alert?.assignedTeam ?? "");
  const [deadline, setDeadline] = useState(toDateTimeLocalValue(alert?.deadline));
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>(initialLevel);
  const dirty =
    assignedTo !== (alert?.assignedTo ?? "") ||
    assignedTeam !== (alert?.assignedTeam ?? "") ||
    deadline !== toDateTimeLocalValue(alert?.deadline) ||
    escalationLevel !== initialLevel;
  const stepIndex = STATUS_STEPS.indexOf(status);
  const field = "h-11 w-full rounded-[10px] border-[1.5px] border-[#DDE3EF] bg-white px-3 text-[13px] font-bold text-[#101334] outline-none transition focus:border-[#101334] disabled:opacity-60";

  return (
    <aside id="assignment" className={cn(BOX, "scroll-mt-24 space-y-6 lg:sticky lg:top-6")}>
      {/* Status as a three-step track; each step is the button that moves the alert there. */}
      <div>
        <Label>{L("Status", "Status")}</Label>
        <ol className="mt-3 grid grid-cols-3 gap-1.5">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => onStatus(step)}
                  disabled={isChangingStatus || current}
                  aria-pressed={current}
                  className={cn(
                    "w-full rounded-[10px] px-2 py-2.5 text-center text-[12px] font-black transition disabled:cursor-default",
                    current ? "bg-[#101334] text-white" : done ? "bg-[#E8EBFF] text-[#3B52F5]" : "bg-[#F3F5FA] text-[#5F6B94] hover:bg-[#E8EBFF] hover:text-[#101334]",
                  )}
                >
                  <span className="block font-mono text-[10px] opacity-70">0{i + 1}</span>
                  {step === "open" ? td("status.new") : step === "acknowledged" ? td("status.investigating") : td("status.resolved")}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Owner and deadline: what to settle first; empty fields are tinted red. */}
      <div className="space-y-4 border-t border-[#EEF0F6] pt-5">
        <Label>{L("Ownership", "Penanggung Jawab")}</Label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-[#31406B]">{td("assignedTo")}</span>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isLoadingOptions} className={cn(field, !assignedTo && "border-[#F5B5B0] bg-[#FFF7F6]")}>
            <option value="">{L("Choose a person", "Pilih orang")}</option>
            {members.map((member) => <option key={member.id} value={member.userId}>{memberLabel(member)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-[#31406B]">{td("assignedTeam")}</span>
          <select value={assignedTeam} onChange={(e) => setAssignedTeam(e.target.value)} disabled={isLoadingOptions} className={field}>
            <option value="">{td("assignedTeamPlaceholder")}</option>
            {teamOptions(assignedTeam).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-[12px] font-bold text-[#31406B]">{td("deadline")}</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickDeadlines(L).map((q) => (
              <button key={q.label} type="button" onClick={() => setDeadline(toDateTimeLocalValue(q.at().toISOString()))} className="rounded-full bg-[#F3F5FA] px-3 py-1.5 text-[12px] font-bold text-[#31406B] transition hover:bg-[#E8EBFF] hover:text-[#3B52F5]">
                {q.label}
              </button>
            ))}
          </div>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={cn(field, !deadline && "border-[#F5B5B0] bg-[#FFF7F6]")} />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-[#31406B]">{td("escalationLevel")}</span>
          <select value={escalationLevel} onChange={(e) => setEscalationLevel(e.target.value as EscalationLevel)} className={field}>
            {(["low", "medium", "high", "critical"] as EscalationLevel[]).map((level) => <option key={level} value={level}>{td(`escalation.${level}`)}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onSave({ assignedTo: nullableText(assignedTo), assignedTeam: nullableText(assignedTeam), deadline: toIsoDateTime(deadline), escalationLevel })}
          disabled={isSaving || !dirty}
          className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#465FFF] text-[14px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSaving ? td("assignment.saving") : dirty ? L("Save Assignment", "Simpan Penugasan") : L("Saved", "Tersimpan")}
        </button>
      </div>

      <button type="button" onClick={onOpenCase} className="flex w-full items-center gap-3 rounded-[12px] bg-[#F6F7FC] p-3.5 text-left transition hover:bg-[#EEF1FF]">
        <Briefcase size={18} className="shrink-0 text-[#3B52F5]" />
        <span className="min-w-0">
          <span className="block text-[13px] font-black text-[#101334]">{L("Open as a Case", "Buka Kasus")}</span>
          <span className="block text-[12px] font-semibold text-[#5F6B94]">{L("For a longer investigation with notes", "Untuk investigasi panjang dengan catatan")}</span>
        </span>
      </button>
    </aside>
  );
}

function Evidence({ items, missing, auto, L }: { items: AlertEvidence[]; missing?: number; auto: boolean; L: L }) {
  const negative = items.filter((s) => String(s.sentiment || "").toLowerCase().includes("neg")).length;
  const sources = new Set(items.map((s) => s.publisher || s.platform).filter(Boolean)).size;
  return (
    <section aria-label={L("Evidence", "Bukti")} className={BOX}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>{L("Evidence", "Bukti")}</Label>
          <h2 className="mt-1.5 text-[20px] font-black tracking-[-0.02em] text-[#101334]">
            {L(`${items.length} Articles Behind This Alert`, `${items.length} Artikel di Balik Peringatan Ini`)}
          </h2>
        </div>
        {items.length > 0 ? (
          <div className="flex gap-2">
            <span className="nv-stamp !text-[#B42318]">{negative} {L("negative", "negatif")}</span>
            <span className="nv-stamp">{sources} {L("sources", "sumber")}</span>
          </div>
        ) : null}
      </div>
      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-[#EEF0F6]">
          {items.map((sig) => {
            const body = (
              <>
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", sentimentDot(sig.sentiment))} title={sentimentLabel(sig.sentiment, L)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold leading-snug text-[#101334] group-hover:text-[#3B52F5]">{sig.title}</span>
                  <span className="mt-1 block font-mono text-[11.5px] font-medium text-[#5F6B94]">
                    {sig.publisher || sig.platform || L("Unknown source", "Sumber tidak diketahui")} · {formatDateTime(sig.publishedAt || sig.capturedAt)} · {sentimentLabel(sig.sentiment, L)}
                  </span>
                </span>
                {sig.url ? <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-[#9AA3BC] transition group-hover:text-[#3B52F5]" /> : null}
              </>
            );
            return (
              <li key={sig.id}>
                {sig.url ? (
                  <a href={sig.url} target="_blank" rel="noopener noreferrer" className="group -mx-2 flex items-start gap-3 rounded-[12px] px-2 py-3.5 transition hover:bg-[#F7F8FC]">{body}</a>
                ) : (
                  <div className="flex items-start gap-3 py-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] font-semibold text-[#647099]">{L("No linked articles are stored for this alert.", "Belum ada berita yang tertaut ke peringatan ini.")}</p>
      )}
      {missing ? <p className="mt-3 text-[12px] font-semibold text-[#647099]">{L(`${missing} linked article(s) are no longer available.`, `${missing} berita tertaut sudah tidak tersedia.`)}</p> : null}
      {auto ? <p className="mt-3 text-[12px] font-semibold text-[#647099]">{L("Raised automatically by Narriv's monitoring rules.", "Dibuat otomatis oleh aturan pemantauan Narriv.")}</p> : null}
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

  const statusMutation = useMutation({
    mutationFn: (status: Status) => updateAlertStatus(params.id, status),
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
  const currentStatus: Status = liveData?.status === "acknowledged" || liveData?.status === "resolved" ? liveData.status : "open";
  const members = membersQuery.data ?? [];
  const owner = liveData ? assigneeName(liveData.assignedTo || (liveData as any)?.assigned_to, members) || liveData.assignedTeam || null : null;
  const tone = severityTone(liveData?.severity);
  const left = deadlineLeft(liveData?.deadline, L);
  const resolved = currentStatus === "resolved";
  const ghost = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] sm:w-auto border-[1.5px] px-5 text-[14px] font-black text-white transition hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="flex max-w-full flex-col gap-5 pb-6 text-[#101334]">
      <Link href="/alerts" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-black text-[#5F6B94] transition hover:text-[#3B52F5]">
        <ArrowLeft size={15} /> {td("nav.back")}
      </Link>

      {alertQuery.isPending ? (
        <PanelSkeleton />
      ) : liveData ? (
        <>
          {/* The decision: how bad, how much time, the one thing to do, and the buttons for it. */}
          <section className={cn(BOX, "relative overflow-hidden !p-0")}>
            <div className={cn("h-2", tone.band)} />
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em]", tone.stamp)}>{severityLabel(liveData.severity, L)}</span>
                <span className="nv-stamp">{currentStatus === "open" ? td("status.new") : currentStatus === "acknowledged" ? td("status.investigating") : td("status.resolved")}</span>
                {left && !resolved ? (
                  <span className={cn("nv-stamp", left.overdue && "!border-[#B42318] !bg-[#B42318] !text-white !shadow-[0_2px_0_#7A1610]")}>
                    <Clock3 size={12} /> {left.text}
                  </span>
                ) : null}
                <span className="font-mono text-[11.5px] font-medium text-[#5F6B94]">{L("Raised", "Muncul")} {formatDateTime(liveData.createdAt)}</span>
              </div>

              <h1 className="mt-4 max-w-4xl text-balance text-[28px] font-black leading-[1.12] tracking-[-0.03em] text-[#101334] sm:text-[36px]">{title}</h1>

              {!owner && !resolved ? (
                <a href="#assignment" className="mt-5 flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#B42318] bg-[#FFF5F4] px-4 py-3 text-[14px] font-bold text-[#7A1610] transition hover:bg-[#FDECEC]">
                  <UserX size={18} className="shrink-0 text-[#B42318]" />
                  <span className="min-w-0 flex-1">{L("No one owns this yet. Assign an owner and a deadline first.", "Belum ada yang memegang isu ini. Tunjuk penanggung jawab dan tenggat dulu.")}</span>
                  <span className="shrink-0 font-black text-[#B42318]">{L("Assign →", "Tunjuk →")}</span>
                </a>
              ) : null}

              {/* What to do: the most important block on the page. */}
              <div className="mt-5 rounded-[18px] bg-[#101334] p-5 text-white sm:p-6">
                <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#A5B4FF]">
                  <Sparkles size={13} /> {L("What To Do Now", "Yang Perlu Dilakukan")}
                </p>
                <p className="mt-2.5 max-w-3xl text-[18px] font-bold leading-[1.5] sm:text-[20px]">{whatToDo}</p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button type="button" onClick={() => setIsActionPlanModalOpen(true)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5] sm:w-auto">
                    <FileText size={16} /> {L("Create Action Plan", "Buat Rencana Aksi")}
                  </button>
                  {currentStatus === "open" ? (
                    <button type="button" onClick={() => statusMutation.mutate("acknowledged")} disabled={statusMutation.isPending} className={cn(ghost, "border-white/80")}>
                      <Hand size={16} /> {L("I'm Handling This", "Saya Tangani")}
                    </button>
                  ) : null}
                  {!resolved ? (
                    <button type="button" onClick={() => statusMutation.mutate("resolved")} disabled={statusMutation.isPending} className={cn(ghost, "border-white/30 text-white/85")}>
                      <CheckCircle2 size={16} /> {L("Mark Resolved", "Tandai Selesai")}
                    </button>
                  ) : (
                    <button type="button" onClick={() => statusMutation.mutate("open")} disabled={statusMutation.isPending} className={cn(ghost, "border-white/30 text-white/85")}>
                      {L("Reopen", "Buka Lagi")}
                    </button>
                  )}
                </div>
                <p className="mt-3 text-[12px] font-medium text-white/50">{L("AI drafts the plan; nothing is sent without your approval.", "Rencana disusun AI; tidak ada yang dikirim tanpa persetujuan Anda.")}</p>
              </div>
            </div>
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <section className={cn(BOX, "grid gap-6 md:grid-cols-2")}>
                <div>
                  <Label>{L("What Happened", "Apa yang Terjadi")}</Label>
                  <p className="mt-2 text-[15.5px] font-medium leading-[1.65] text-[#101334]">{whatHappened}</p>
                </div>
                <div className="md:border-l md:border-[#EEF0F6] md:pl-6">
                  <Label>{L("Why It Matters", "Kenapa Penting")}</Label>
                  <p className="mt-2 text-[15.5px] font-medium leading-[1.65] text-[#101334]">{whyItMatters}</p>
                </div>
              </section>
              <Evidence items={liveData.evidence ?? []} missing={liveData.evidenceMissing} auto={Boolean(liveData.triggeredBy)} L={L} />
            </div>

            <HandlingDesk
              key={`${liveData.id}:${liveData.assignedTo ?? ""}:${liveData.assignedTeam ?? ""}:${liveData.deadline ?? ""}:${liveData.escalationLevel ?? ""}`}
              alert={liveData}
              members={members}
              status={currentStatus}
              isLoadingOptions={membersQuery.isLoading}
              isSaving={assignmentMutation.isPending}
              isChangingStatus={statusMutation.isPending}
              onStatus={(s) => statusMutation.mutate(s)}
              onSave={(input) => assignmentMutation.mutate(input)}
              onOpenCase={() => setIsCaseModalOpen(true)}
            />
          </div>

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
      ) : (
        <DashboardErrorState title={td("notFoundTitle")} description={td("notFoundDesc")} onRetry={() => void alertQuery.refetch()} minHeight="min-h-[220px]" />
      )}
    </div>
  );
}
