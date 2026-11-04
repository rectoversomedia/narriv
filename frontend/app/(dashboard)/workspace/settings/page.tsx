"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Webhook, Pause, Play, RefreshCw, Upload, ChevronDown, ArrowRight, Lock, Trash, Database, Cloud } from "lucide-react";
import { DashboardEmptyState, DashboardErrorState, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteCurrentWorkspace, setMonitoringPaused, getNotificationSettings, updateNotificationSettings, getWorkspaceMembers, getWorkspaceSettings, updateWorkspaceSettings, createWorkspaceMember, deleteWorkspaceMember, changePassword, uploadWorkspaceLogo, type CreateWorkspaceMemberInput, type UpdateWorkspaceSettingsInput, type WorkspaceMemberRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { MonitoringKeywordsPanel } from "@/components/dashboard/monitoring-keywords-panel";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { Field, ModalShell, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { AiProvidersPanel } from "@/components/dashboard/ai-providers-panel";
import { PlatformCollectionPanel } from "@/components/dashboard/platform-collection-panel";
import { pickL, useL } from "@/lib/use-l";

type TeamMember = {
  name: string;
  email: string;
  role: string;
  status: string;
  permission: string;
  time: string;
  initials: string;
  tone: string;
};


function initialsFromName(name: string, fallback: string) {
  return name.split(" ").filter(Boolean).map((word) => word[0]).join("").toUpperCase().slice(0, 2) || fallback;
}

const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);

function resolveBackendAssetUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return `${baseUrl}${url}`;
  }
  return url;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error(pickL("Logo file could not be read.", "File logo tidak bisa dibaca.")));
    reader.readAsDataURL(file);
  });
}

function buildMemberRows(records: WorkspaceMemberRecord[], labels: { defaultName: string; defaultEmail: string; statusActive: string; timeLive: string; permFull: string; permWrite: string; permRead: string; owner: string; admin: string; analyst: string; viewer: string; defaultInitials: string }): TeamMember[] {
  const roleToLabel = (role: string) => {
    if (role === "owner") return labels.owner;
    if (role === "admin") return labels.admin;
    if (role === "analyst") return labels.analyst;
    return labels.viewer;
  };
  const roleToPermission = (role: string) => {
    if (role === "owner" || role === "admin") return labels.permFull;
    if (role === "analyst") return labels.permWrite;
    return labels.permRead;
  };
  return records.map((member) => {
    const name = member.user?.name || member.user?.email || labels.defaultName;
    const role = roleToLabel(member.role);
    return {
      name,
      email: member.user?.email || labels.defaultEmail,
      role,
      status: labels.statusActive,
      permission: roleToPermission(member.role),
      // Narriv records when a member joined, not their last activity.
      time: member.createdAt && !Number.isNaN(new Date(member.createdAt).getTime()) ? new Date(member.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—",
      initials: initialsFromName(name, labels.defaultInitials),
      tone: role === labels.owner ? "purple" : role === labels.admin ? "blue" : role === labels.analyst ? "emerald" : "slate",
    };
  });
}

// Custom Panel Component
function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.05)]", className)}>
      {children}
    </section>
  );
}

// Custom Switch Toggle Component
function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (val: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#465FFF]/20",
        checked ? "bg-[#465FFF]" : "bg-slate-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const ts = useTranslations("Workspace.settings");
  const L = useL();
  const queryClient = useQueryClient();
  const toast = useToast();
  const workspaceSettingsQuery = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: getWorkspaceSettings,
    staleTime: 30 * 1000,
  });
  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: getWorkspaceMembers,
    staleTime: 30 * 1000,
  });
  const updateSettingsMutation = useMutation({
    mutationFn: (input: UpdateWorkspaceSettingsInput) => updateWorkspaceSettings(input),
    onSuccess: async (result) => {
      if (!result) {
        showToast(ts("toast.saveFailed"), "error");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      setSaveSuccess(true);
      showToast(ts("toast.saveSuccess"));
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: () => showToast(ts("toast.saveFailed"), "error"),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: (input: CreateWorkspaceMemberInput) => createWorkspaceMember(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      if (result) {
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("Analyst");
        showToast(ts("toast.inviteSuccess", { email: inviteEmail || "" }));
      } else {
        showToast(ts("toast.inviteFailed"), "error");
      }
    },
    onError: () => showToast(ts("toast.inviteFailed"), "error"),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => deleteWorkspaceMember(memberId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      if (result) {
        showToast(ts("toast.removeSuccess"));
      } else {
        showToast(ts("toast.removeFailed"), "error");
      }
      setMemberToDelete(null);
    },
    onError: () => showToast(ts("toast.removeFailed"), "error"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => changePassword(input),
    onSuccess: async (result) => {
      if (result) {
        showToast(ts("toast.passwordSuccess"));
      } else {
        showToast(ts("toast.passwordFailed"), "error");
      }
    },
    onError: () => showToast(ts("toast.passwordFailed"), "error"),
  });

  // State: Workspace Info
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [language, setLanguage] = useState<"id" | "en" | null>(null);
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const activeLogo = workspaceLogo || (workspaceSettingsQuery.data?.logoUrl ? resolveBackendAssetUrl(workspaceSettingsQuery.data.logoUrl) : "/brand/logo-h.webp");
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const isSavingInfo = updateSettingsMutation.isPending;
  const [saveSuccess, setSaveSuccess] = useState(false);

  const uploadLogoMutation = useMutation({
    mutationFn: (input: { fileName: string; fileContent: string; mimeType: string }) => uploadWorkspaceLogo(input),
    onSuccess: (result) => {
      if (!result) {
        setLogoError(ts("toast.logoUploadError"));
        showToast(ts("toast.logoUploadError"), "error");
        return;
      }

      setWorkspaceLogo(resolveBackendAssetUrl(result.url));
      setLogoError("");
      showToast(ts("toast.logoSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
    },
    onError: () => {
      setLogoError(ts("toast.logoUploadError"));
      showToast(ts("toast.logoUploadError"), "error");
    },
  });

  // State: Team Members
  const [memberOverrides, setMemberOverrides] = useState<TeamMember[] | null>(null);

  // Modal: Invite Member
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Analyst");
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string }>({});

  // State: Change Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; newPass?: string }>({});

  // State: Workspace form validation
  const [workspaceErrors, setWorkspaceErrors] = useState<{ name?: string }>({});

  // State: Notifications
  const [notifEmail, setNotifEmail] = useState<boolean | null>(null);
  const [notifWhatsapp, setNotifWhatsapp] = useState<boolean | null>(null);

  // State: AI Preferences

  // State: Security

  // State: Upgrade Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [upgradeLimit, setUpgradeLimit] = useState<string | undefined>();


  // Confirmation Modal State (Danger Zone)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"pause" | "delete" | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const memberLabels = {
    defaultName: ts("defaultMemberName"),
    defaultEmail: ts("defaultMemberEmail"),
    statusActive: ts("memberStatusActive"),
    statusInactive: ts("memberStatusInactive"),
    timeLive: ts("timeLive"),
    permFull: ts("permissionFullAccess"),
    permWrite: ts("permissionReadWrite"),
    permRead: ts("permissionReadOnly"),
    owner: ts("roles.owner"),
    admin: ts("roles.admin"),
    analyst: ts("roles.analyst"),
    viewer: ts("roles.viewer"),
    defaultInitials: ts("defaultInitials"),
    timeNow: ts("timeActiveNow"),
    timeYesterday: ts("timeActiveYesterday"),
    time2Hours: ts("time2HoursAgo"),
    time1Day: ts("time1DayAgo"),
  };
  const liveMembers = membersQuery.data ? buildMemberRows(membersQuery.data, memberLabels) : null;
  // Never show placeholder people: no data means loading, error or empty.
  const members = memberOverrides ?? liveMembers ?? [];
  const workspaceNameValue = workspaceName ?? workspaceSettingsQuery.data?.brandName ?? "Narriv Intelligence";
  const industryValue = industry ?? workspaceSettingsQuery.data?.industry ?? ts("workspaceInfo.industryTechnology");
  // Stored values are IANA ids; older rows hold labels like "Asia/Jakarta (GMT+7)".
  const timezoneValue = (timezone ?? workspaceSettingsQuery.data?.timezone ?? "Asia/Jakarta").replace(/\s*\(.*\)\s*$/, "");
  const languageValue = language ?? workspaceSettingsQuery.data?.language ?? "id";
  // Email/WhatsApp alert switches live in workspace_notification_settings (booleans) and save on toggle; they used
  // to be sent with the workspace form as notificationEmail: "enabled", which the API rejects as an invalid email,
  // so saving the workspace name, industry or time zone always failed.
  const notificationQuery = useQuery({ queryKey: ["notification-settings"], queryFn: getNotificationSettings, staleTime: 30 * 1000 });
  const notifEmailValue = notifEmail ?? notificationQuery.data?.emailEnabled ?? true;
  const notifWhatsappValue = notifWhatsapp ?? notificationQuery.data?.whatsappEnabled ?? false;
  const notificationMutation = useMutation({
    mutationFn: (input: { emailEnabled?: boolean; whatsappEnabled?: boolean }) => updateNotificationSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      showToast(ts("toast.saveSuccess"));
    },
    onError: () => {
      setNotifEmail(null);
      setNotifWhatsapp(null);
      showToast(ts("toast.saveFailed"), "error");
    },
  });
  const toggleEmail = (next: boolean) => { setNotifEmail(next); notificationMutation.mutate({ emailEnabled: next }); };
  const toggleWhatsapp = (next: boolean) => { setNotifWhatsapp(next); notificationMutation.mutate({ whatsappEnabled: next }); };


  const handleSaveWorkspaceInfo = (e: FormEvent) => {
    e.preventDefault();
    const errors: { name?: string } = {};

    if (!workspaceNameValue.trim()) {
      errors.name = ts("validation.workspaceNameRequired");
    } else if (workspaceNameValue.trim().length < 3) {
      errors.name = ts("validation.workspaceNameMinLength");
    }

    setWorkspaceErrors(errors);
    if (Object.keys(errors).length > 0) return;

    updateSettingsMutation.mutate({
      brandName: workspaceNameValue.trim(),
      industry: industryValue,
      timezone: timezoneValue,
      language: languageValue,
    });
  };

  const handleLogoUpload = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!LOGO_MIME_TYPES.has(file.type)) {
      setLogoError(ts("workspaceInfo.logoInvalidFormat"));
      showToast(ts("toast.logoInvalidFormat"), "error");
      return;
    }

    if (file.size > LOGO_MAX_SIZE_BYTES) {
      setLogoError(ts("workspaceInfo.logoTooLarge"));
      showToast(ts("toast.logoTooLarge"), "error");
      return;
    }

    try {
      const fileContent = await readFileAsBase64(file);
      uploadLogoMutation.mutate({ fileName: file.name, fileContent, mimeType: file.type });
    } catch {
      setLogoError(ts("workspaceInfo.logoReadError"));
      showToast(ts("toast.logoReadFailed"), "error");
    }
  };

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; email?: string } = {};

    if (!inviteName.trim()) {
      errors.name = ts("validation.nameRequired");
    } else if (inviteName.trim().length < 2) {
      errors.name = ts("validation.nameMinLength");
    }

    if (!inviteEmail.trim()) {
      errors.email = ts("validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      errors.email = ts("validation.emailInvalid");
    }

    setInviteErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const roleMap: Record<string, "admin" | "analyst"> = { "Admin": "admin", "Analyst": "analyst" };
    inviteMemberMutation.mutate({ email: inviteEmail.trim(), name: inviteName.trim(), role: roleMap[inviteRole] || "analyst" });
  };

  const showToast = (message: string, tone: "success" | "error" | "info" = "success") => {
    if (tone === "error") {
      toast.error(message);
      return;
    }

    if (tone === "info") {
      toast.info(message);
      return;
    }

    toast.success(message);
  };

  const triggerConfirmAction = (action: "pause" | "delete") => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const monitoringPaused = workspaceSettingsQuery.data?.monitoringPaused === true;
  const pauseMutation = useMutation({
    mutationFn: (paused: boolean) => setMonitoringPaused(paused),
    onSuccess: (paused) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      showToast(ts(paused ? "toast.monitoringPaused" : "toast.monitoringResumed"));
    },
    onError: () => showToast(ts("toast.actionFailed"), "error"),
  });
  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => deleteCurrentWorkspace("Deleted from workspace settings"),
    onSuccess: () => {
      useWorkspaceStore.getState().setSelectedWorkspaceId(null);
      queryClient.clear();
      window.location.href = "/";
    },
    onError: (error: Error & { info?: { code?: string } }) => {
      showToast(ts(error.info?.code === "WORKSPACE_DELETE_RESTRICTED" ? "toast.deleteRestricted" : "toast.actionFailed"), "error");
    },
  });

  const executeConfirmAction = () => {
    setShowConfirmModal(false);
    if (confirmAction === "pause") {
      pauseMutation.mutate(!monitoringPaused);
    } else if (confirmAction === "delete") {
      deleteWorkspaceMutation.mutate();
    }
    setConfirmAction(null);
  };

  const executeDeleteMember = () => {
    if (!memberToDelete) return;

    const liveMember = membersQuery.data?.find((m) => {
      const name = m.user?.name || m.user?.email || "";
      return name === memberToDelete.name || m.user?.email === memberToDelete.email;
    });

    if (liveMember) {
      deleteMemberMutation.mutate(liveMember.id);
    } else {
      const updated = members.filter((member) => member.email !== memberToDelete.email);
      setMemberOverrides(updated);
      showToast(ts("memberRemovedFromOverride", { name: memberToDelete.name }));
      setMemberToDelete(null);
    }
  };

  const confirmDescription = confirmAction === "pause"
    ? ts(monitoringPaused ? "confirm.resumeDesc" : "confirm.pauseDesc")
    : ts("confirm.deleteDesc");

  // Helper styles for roles
  const roleStyles: Record<string, string> = {
    [memberLabels.owner]: "bg-purple-50 text-purple-700 border-transparent",
    [memberLabels.admin]: "bg-blue-50 text-blue-700 border-transparent",
    [memberLabels.analyst]: "bg-emerald-50 text-emerald-700 border-transparent",
    [memberLabels.viewer]: "bg-slate-100 text-slate-700 border-slate-200/50"
  };

  return (
    <div className="flex max-w-full flex-col gap-6 pb-12 text-[#101334]">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{ts("pageHeaderTitle")}</h1>
      </div>

      {/* Subscription Card */}
      <SubscriptionCard onUpgradeClick={() => setShowUpgradeModal(true)} />

      {workspaceSettingsQuery.data === null ? (
        <div className="rounded-[12px] border border-dashed border-transparent bg-[#FBFAFF] px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[13px] font-bold text-slate-900">{ts("loadFailedTitle")}</p>
              <p className="text-[11px] font-medium text-[#5A6478]">{ts("loadFailedDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void workspaceSettingsQuery.refetch()}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {membersQuery.data === null ? (
        <div className="rounded-[12px] border border-dashed border-transparent bg-amber-50 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[13px] font-bold text-slate-900">{ts("membersLoadFailedTitle")}</p>
              <p className="text-[11px] font-medium text-[#5A6478]">{ts("membersLoadFailedDesc")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void membersQuery.refetch()}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50 shrink-0"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Row 1: Workspace & User Management */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.45fr)]">
        
        {/* Card A: Informasi Workspace */}
        <Panel className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div>
              <h2 className="text-base font-black text-[#101334]">{ts("workspaceInfo.title")}</h2>
            </div>
          </div>

          <form onSubmit={handleSaveWorkspaceInfo} className="grid gap-4">
            {/* Logo and inputs side-by-side or stacked */}
            <div className="grid gap-5 sm:grid-cols-1">
              <div className="flex flex-col items-center">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                  <Image src={activeLogo} alt={ts("workspaceInfo.logoAlt")} width={60} height={60} unoptimized={activeLogo.startsWith("http")} className={cn("object-contain transition-opacity", uploadLogoMutation.isPending && "opacity-45")} />
                  {uploadLogoMutation.isPending ? <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/95 px-2 py-1 text-center text-[8px] font-black uppercase tracking-wide text-[#3B52F5] shadow-sm">{ts("workspaceInfo.logoUploading")}</span> : null}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="sr-only"
                  aria-label={ts("logo.changeLogo")}
                  onChange={handleLogoFileChange}
                />
                <button
                  type="button"
                  title={ts("logo.changeLogo")}
                  aria-label={ts("logo.changeLogo")}
                  onClick={handleLogoUpload}
                  disabled={uploadLogoMutation.isPending}
                  className="mt-2.5 flex h-7 w-full items-center justify-center rounded-lg border border-[#DDE3EF] bg-white text-[#3B52F5] shadow-sm transition hover:bg-slate-50 hover:text-[#31406B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadLogoMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} strokeWidth={2.5} />}
                </button>
                <span className="mt-1 text-center text-[9px] font-semibold text-[#5A6478]">{ts("logo.formatHint")}</span>
                {logoError ? <span className="mt-1 text-center text-[9px] font-bold text-[#C81E1E]">{logoError}</span> : null}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#5F6B94]">
                    {ts("workspaceInfo.labelName")}
                  </label>
                  <input
                    aria-label={ts("workspaceInfo.labelName")}
                    type="text"
                    value={workspaceNameValue}
                    onChange={(e) => { setWorkspaceName(e.target.value); setWorkspaceErrors({}); }}
                    className={cn("h-10 w-full rounded-lg border px-3 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/15", workspaceErrors.name ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                  />
                  {workspaceErrors.name && <p className="mt-1 text-[9px] font-bold text-[#C81E1E]">{workspaceErrors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#5F6B94]">
                    {ts("workspaceInfo.labelIndustry")}
                  </label>
                  <div className="relative">
                    <select aria-label={ts("workspaceInfo.labelIndustry")}
                      value={industryValue}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                    >
                      <option value="Technology">{ts("workspaceInfo.industryTechnology")}</option>
                      <option value="Finance">{ts("workspaceInfo.industryFinance")}</option>
                      <option value="Healthcare">{ts("workspaceInfo.industryHealthcare")}</option>
                      <option value="Retail">{ts("workspaceInfo.industryRetail")}</option>
                      <option value="Government">{ts("workspaceInfo.industryGovernment")}</option>
                      <option value="Banking">{pickL("Banking", "Perbankan")}</option>
                      {/* A stored industry outside the list (e.g. "Perbankan") stays visible instead of reading as the first option. */}
                      {industryValue && !["Technology", "Finance", "Healthcare", "Retail", "Government", "Banking"].includes(industryValue) ? <option value={industryValue}>{industryValue}</option> : null}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#5F6B94]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#5F6B94]">
                  {ts("workspaceInfo.labelTimezone")}
                </label>
                <div className="relative">
                  <select aria-label={ts("workspaceInfo.labelTimezone")}
                    value={timezoneValue}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="America/New_York">America/New_York (GMT-5/-4)</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#5F6B94]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#5F6B94]">
                  {ts("workspaceInfo.labelLanguage")}
                </label>
                <div className="relative">
                  <select aria-label={ts("workspaceInfo.labelLanguage")}
                    value={languageValue}
                    onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "id")}
                    className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                  >
                    <option value="id">{ts("workspaceInfo.languageId")}</option>
                    <option value="en">{ts("workspaceInfo.languageEn")}</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#5F6B94]" />
                </div>
                <p className="mt-1 text-[9.5px] font-semibold text-[#5A6478]">{ts("workspaceInfo.languageHint")}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingInfo}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#465FFF] px-4 text-[12px] font-black text-white hover:bg-[#3B20EA] transition disabled:opacity-70"
            >
              {isSavingInfo ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {ts("common.saving")}
                </>
              ) : saveSuccess ? (
                <>
                  {ts("common.changesSaved")}
                </>
              ) : (
                ts("common.saveChanges")
              )}
            </button>
          </form>
        </Panel>

        {/* Card B: User & Access Management */}
        <Panel className="flex flex-col gap-4 h-full">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div>
                <h2 className="text-base font-black text-[#101334]">{ts("membersCard.title")}</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Roles are enforced server-side; this explains them (there is no separate role editor). */}
              <details className="relative">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
                  {L("What each role can do", "Wewenang tiap peran")}
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-[300px] rounded-[10px] border border-[#DDE3EF] bg-white p-3 text-[11px] font-semibold leading-relaxed text-slate-600 shadow-lg">
                  <p><b className="text-[#101334]">{L("Owner", "Pemilik")}</b>: {L("everything an admin can do, plus granting or removing the owner role. The last owner cannot be removed.", "semua yang bisa dilakukan admin, ditambah memberi atau mencabut peran pemilik. Pemilik terakhir tidak bisa dihapus.")}</p>
                  <p className="mt-2"><b className="text-[#101334]">Admin</b>: {L("add and remove members (not owners), change workspace settings, monitoring keywords and integrations.", "menambah dan menghapus anggota (kecuali pemilik), mengubah pengaturan workspace, kata kunci pemantauan, dan integrasi.")}</p>
                  <p className="mt-2"><b className="text-[#101334]">{L("Analyst", "Analis")}</b>: {L("view all workspace data, ask questions, and work on cases and action plans. Cannot change members, settings or keywords.", "melihat semua data workspace, bertanya ke Narriv, serta mengerjakan kasus dan rencana aksi. Tidak bisa mengubah anggota, pengaturan, atau kata kunci.")}</p>
                </div>
              </details>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#465FFF] px-3.5 text-[11px] font-black text-white shadow-sm transition hover:bg-[#3B20EA]"
              >
                {ts("common.inviteMember")}
              </button>
            </div>
          </div>

          <div className="flex-1">
            {membersQuery.isPending ? (
              <TableSkeleton rows={4} columns={6} className="border-0 shadow-none" />
            ) : membersQuery.isError || membersQuery.data === null ? (
              <DashboardErrorState title={L("Members could not be loaded", "Daftar anggota belum bisa dimuat")} description={L("The member list is unavailable right now. No changes were made.", "Daftar anggota sedang tidak tersedia. Tidak ada perubahan yang dibuat.")} onRetry={() => void membersQuery.refetch()} minHeight="min-h-[220px]" />
            ) : members.length === 0 ? (
              <DashboardEmptyState title={ts("membersEmptyTitle")} description={ts("membersEmptyDesc")} icon="inbox" minHeight="min-h-[280px]" />
            ) : (
            <ul className="divide-y divide-[#F0F2F8]" aria-label={ts("membersCard.title")}>
              {members.map((member) => {
                const [personName, ...jobParts] = member.name.split(" · ");
                return (
                  <li key={member.email} className="flex flex-col gap-2 px-1 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white", member.tone === "purple" ? "bg-[#8B5CFF]" : member.tone === "blue" ? "bg-[#465FFF]" : member.tone === "emerald" ? "bg-[#12A66A]" : "bg-[#64748B]")}>
                        {member.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black text-[#101334]">{personName}</p>
                        <p className="truncate text-[11px] font-bold text-[#5A6478]">{jobParts.length ? `${jobParts.join(" · ")} · ` : ""}{member.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-[52px]">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", roleStyles[member.role])}>{member.role}</span>
                      <span className="rounded-full bg-[#F4F6FC] px-2.5 py-1 text-[11px] font-bold text-[#31406B]">{member.permission}</span>
                      <span className="text-[11px] font-bold text-[#8A93AD]">{L("joined", "bergabung")} {member.time}</span>
                      <button type="button" onClick={() => setMemberToDelete(member)} title={ts("removeUser")} aria-label={ts("removeUser")} className="ml-auto flex size-8 items-center justify-center rounded-[8px] text-[#8A93AD] transition hover:bg-[#FDECEC] hover:text-[#C81E1E]">
                        <Trash size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            )}
          </div>
        </Panel>
      </div>

      <MonitoringKeywordsPanel />

      <PlatformCollectionPanel />

      <AiProvidersPanel />

      {/* Row 2: notifications, where integrations and data live, account security. Every control here saves. */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">{ts("notifications.title")}</h3>
            </div>
          </div>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">{ts("notifications.emailAlerts")}</span>
                <span className="block text-[9.5px] text-[#5A6478] font-semibold">{ts("notifications.emailAlertsDesc")}</span>
              </div>
              <Switch label={ts("notifications.emailAlerts")} checked={notifEmailValue} onChange={toggleEmail} disabled={notificationMutation.isPending} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">{ts("notifications.whatsappAlerts")}</span>
                <span className="block text-[9.5px] text-[#5A6478] font-semibold">{ts("notifications.whatsappAlertsDesc")}</span>
              </div>
              <Switch label={ts("notifications.whatsappAlerts")} checked={notifWhatsappValue} onChange={toggleWhatsapp} disabled={notificationMutation.isPending} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2">
              <Link href="/workspace/integrations" className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  <span className="text-[#5F6B94]"><Webhook size={16} /></span>
                  <span>
                    <span className="block text-[11px] font-black text-[#101334]">{ts("related.channels")}</span>
                    <span className="block text-[9px] text-[#5A6478] font-semibold">{ts("related.channelsDesc")}</span>
                  </span>
                </span>
                <ArrowRight size={13} className="text-[#5A6478]" />
              </Link>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">{ts("related.title")}</h3>
            </div>
          </div>
          <div className="space-y-1.5 flex-1">
              <Link href="/workspace/integrations" className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  <span className="text-[#5F6B94]"><Webhook size={16} /></span>
                  <span>
                    <span className="block text-[11px] font-black text-[#101334]">{ts("related.integrations")}</span>
                    <span className="block text-[9px] text-[#5A6478] font-semibold">{ts("related.integrationsDesc")}</span>
                  </span>
                </span>
                <ArrowRight size={13} className="text-[#5A6478]" />
              </Link>
              <Link href="/workspace/sources" className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  <span className="text-[#5F6B94]"><Database size={16} /></span>
                  <span>
                    <span className="block text-[11px] font-black text-[#101334]">{ts("related.sources")}</span>
                    <span className="block text-[9px] text-[#5A6478] font-semibold">{ts("related.sourcesDesc")}</span>
                  </span>
                </span>
                <ArrowRight size={13} className="text-[#5A6478]" />
              </Link>
              <Link href="/reports" className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  <span className="text-[#5F6B94]"><Cloud size={16} /></span>
                  <span>
                    <span className="block text-[11px] font-black text-[#101334]">{ts("related.exports")}</span>
                    <span className="block text-[9px] text-[#5A6478] font-semibold">{ts("related.exportsDesc")}</span>
                  </span>
                </span>
                <ArrowRight size={13} className="text-[#5A6478]" />
              </Link>
              <Link href="/workspace/activity" className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  <span className="text-[#5F6B94]"><Lock size={16} /></span>
                  <span>
                    <span className="block text-[11px] font-black text-[#101334]">{ts("related.activity")}</span>
                    <span className="block text-[9px] text-[#5A6478] font-semibold">{ts("related.activityDesc")}</span>
                  </span>
                </span>
                <ArrowRight size={13} className="text-[#5A6478]" />
              </Link>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">{ts("accountCard.title")}</h3>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-black text-[#101334]">{ts("workspaceInfo.sectionPassword")}</p>
              <div className="space-y-2.5">
                <div>
                  <input
                    type="password"
                    placeholder={ts("workspaceInfo.passwordCurrentPlaceholder")}
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((prev) => ({ ...prev, current: undefined })); }}
                    className={cn("h-9 w-full rounded-md border bg-slate-50 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#465FFF]", passwordErrors.current ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                  />
                  {passwordErrors.current && <p className="mt-1 text-[9px] font-bold text-[#C81E1E]">{passwordErrors.current}</p>}
                </div>
                <div>
                  <input
                    type="password"
                    placeholder={ts("workspaceInfo.passwordNewPlaceholder")}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((prev) => ({ ...prev, newPass: undefined })); }}
                    className={cn("h-9 w-full rounded-md border bg-slate-50 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#465FFF]", passwordErrors.newPass ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                  />
                  {passwordErrors.newPass && <p className="mt-1 text-[9px] font-bold text-[#C81E1E]">{passwordErrors.newPass}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const errors: { current?: string; newPass?: string } = {};
                    if (!currentPassword) errors.current = ts("validation.currentPasswordRequired");
                    if (!newPassword) {
                      errors.newPass = ts("validation.newPasswordRequired");
                    } else if (newPassword.length < 10) {
                      errors.newPass = ts("validation.passwordMinLength");
                    } else if (!/[A-Z]/.test(newPassword)) {
                      errors.newPass = ts("validation.passwordUppercase");
                    } else if (!/[0-9]/.test(newPassword)) {
                      errors.newPass = ts("validation.passwordNumber");
                    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
                      errors.newPass = ts("validation.passwordSymbol");
                    }
                    setPasswordErrors(errors);
                    if (Object.keys(errors).length > 0) return;
                    changePasswordMutation.mutate({ currentPassword, newPassword });
                  }}
                  disabled={changePasswordMutation.isPending}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#465FFF] text-[11px] font-black text-white transition hover:bg-[#3B4FE0] disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? ts("common.saving") : ts("changePassword")}
                </button>
              </div>
          </div>
        </Panel>
      </div>

      {/* Row 3: Danger Zone (plan and usage are in the subscription card at the top) */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Card B: Danger Zone */}
        <Panel className="flex flex-col gap-6 border-transparent bg-rose-50/10">
          <div className="flex items-start gap-4">
            <div>
              <h2 className="text-base font-black text-rose-600">{ts("danger.title")}</h2>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-black text-slate-800">{ts(monitoringPaused ? "danger.resumeTitle" : "danger.pauseTitle")}</span>
                <span className="mt-1 block text-[10px] text-[#5A6478] font-semibold leading-normal">
                  {ts(monitoringPaused ? "danger.resumeDesc" : "danger.pauseDesc")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerConfirmAction("pause")}
                disabled={pauseMutation.isPending || workspaceSettingsQuery.isLoading}
                className={cn(
                  "flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-lg px-3.5 text-[11px] font-black text-white transition shadow-sm disabled:opacity-60",
                  monitoringPaused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700",
                )}
              >
                {monitoringPaused ? <Play size={13} /> : <Pause size={13} />} {ts(monitoringPaused ? "danger.resumeButton" : "danger.pauseButton")}
              </button>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100/80 pt-4">
              <div className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-black text-[#D32F2F]">{ts("danger.deleteTitle")}</span>
                <span className="mt-1 block text-[10px] text-[#5A6478] font-semibold leading-normal">
                  {ts("danger.deleteDesc")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerConfirmAction("delete")}
                disabled={deleteWorkspaceMutation.isPending}
                className="disabled:opacity-60 flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[11px] font-black text-white transition hover:bg-rose-700 shadow-sm"
              >
                {ts("danger.deleteButton")}
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* MODAL: Invite Member */}
      <ModalShell
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        size="sm"
        title={ts("invite.modalTitle")}
        description={L("They must already have a Narriv account with this email.", "Orang tersebut harus sudah punya akun Narriv dengan email ini.")}
        closeLabel={L("Close", "Tutup")}
        footer={
          <>
            <button type="button" onClick={() => setShowInviteModal(false)} className={secondaryButtonClass}>{ts("invite.cancel")}</button>
            <button type="submit" form="invite-member-form" disabled={inviteMemberMutation.isPending} className={primaryButtonClass}>{inviteMemberMutation.isPending ? L("Adding…", "Menambahkan…") : ts("invite.submit")}</button>
          </>
        }
      >
        <form id="invite-member-form" onSubmit={handleInviteSubmit} className="space-y-4">
          <Field label={ts("invite.nameLabel")} htmlFor="invite-name">
            <input id="invite-name" type="text" required placeholder={ts("invite.namePlaceholder")} value={inviteName} onChange={(e) => { setInviteName(e.target.value); setInviteErrors((prev) => ({ ...prev, name: undefined })); }} className={cn(inputClass, inviteErrors.name && "border-[#EF4444]")} />
            {inviteErrors.name ? <p className="text-[12px] font-bold text-[#C81E1E]">{inviteErrors.name}</p> : null}
          </Field>
          <Field label={ts("invite.emailLabel")} htmlFor="invite-email">
            <input id="invite-email" type="email" required placeholder={ts("invite.emailPlaceholder")} value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteErrors((prev) => ({ ...prev, email: undefined })); }} className={cn(inputClass, inviteErrors.email && "border-[#EF4444]")} />
            {inviteErrors.email ? <p className="text-[12px] font-bold text-[#C81E1E]">{inviteErrors.email}</p> : null}
          </Field>
          <div>
            <p className="mb-2 text-[12px] font-black text-[#101334]">{ts("invite.roleLabel")}</p>
            <div role="radiogroup" aria-label={ts("invite.roleLabel")} className="grid gap-2.5 sm:grid-cols-2">
              {([
                ["Admin", ts("invite.roleOptionAdmin"), L("Manages members, keywords and settings", "Mengatur anggota, kata kunci, dan pengaturan")],
                ["Analyst", ts("invite.roleOptionAnalyst"), L("Works on alerts, cases and reports", "Menangani peringatan, kasus, dan laporan")],
              ] as const).map(([value, label, desc]) => (
                <button key={value} type="button" role="radio" aria-checked={inviteRole === value} onClick={() => setInviteRole(value)} className={cn("rounded-[12px] border p-3.5 text-left transition", inviteRole === value ? "border-[#465FFF] bg-[#F5F7FF] ring-2 ring-[#465FFF]/15" : "border-[#E6EAF2] bg-white hover:border-[#C9D4F6]")}>
                  <span className={cn("block text-[13px] font-black", inviteRole === value ? "text-[#3B52F5]" : "text-[#101334]")}>{label}</span>
                  <span className="mt-0.5 block text-[12px] font-medium leading-snug text-[#5A6478]">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </ModalShell>

      <ConfirmationDialog
        open={showConfirmModal}
        title={ts("confirm.title")}
        description={confirmDescription}
        confirmLabel={ts("confirm.confirm")}
        onConfirm={executeConfirmAction}
        onOpenChange={(open) => {
          setShowConfirmModal(open);
          if (!open) setConfirmAction(null);
        }}
      />

      <ConfirmationDialog
        open={Boolean(memberToDelete)}
        title={ts("deleteMemberDialog.title")}
        description={memberToDelete ? ts("deleteMemberDialog.description", { name: memberToDelete.name }) : ""}
        confirmLabel={ts("deleteMemberDialog.confirm")}
        onConfirm={executeDeleteMember}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
        limit={upgradeLimit}
      />
    </div>
  );
}
