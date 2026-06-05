"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building,
  Users,
  Bell,
  Sparkles,
  Key,
  Webhook,
  Shield,
  CreditCard,
  TrendingUp,
  Pause,
  RefreshCw,
  Trash2,
  UserCheck,
  ChevronDown,
  ArrowRight,
  Sliders,
  Lock,
  Plus,
  Copy,
  Check,
  Trash,
  PlusCircle,
  X,
  Clock,
  Layers,
  Database,
  Cloud,
} from "lucide-react";
import { DashboardEmptyState, DashboardErrorState, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/toast";
import { getWorkspaceMembers, getWorkspaceSettings, updateWorkspaceSettings, createWorkspaceMember, deleteWorkspaceMember, changePassword, uploadWorkspaceLogo, type CreateWorkspaceMemberInput, type UpdateWorkspaceSettingsInput, type WorkspaceMemberRecord } from "@/lib/api-service";
import { cn } from "@/lib/utils";

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

function toWorkspaceSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";
}

function roleToLabel(role: string) {
  if (role === "owner") return "Workspace Owner";
  if (role === "admin") return "Admin";
  if (role === "analyst") return "Analyst";
  return "Viewer";
}

function roleToPermission(role: string) {
  if (role === "owner" || role === "admin") return "Full Access";
  if (role === "analyst") return "Read & Write";
  return "Read Only";
}

function initialsFromName(name: string) {
  return name.split(" ").filter(Boolean).map((word) => word[0]).join("").toUpperCase().slice(0, 2) || "NA";
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
    reader.onerror = () => reject(reader.error || new Error("Logo file could not be read."));
    reader.readAsDataURL(file);
  });
}

function buildMemberRows(records: WorkspaceMemberRecord[]): TeamMember[] {
  return records.map((member) => {
    const name = member.user?.name || member.user?.email || "Workspace Member";
    const role = roleToLabel(member.role);
    return {
      name,
      email: member.user?.email || "unknown@narriv.ai",
      role,
      status: "Aktif",
      permission: roleToPermission(member.role),
      time: "Data live",
      initials: initialsFromName(name),
      tone: role === "Workspace Owner" ? "purple" : role === "Admin" ? "blue" : role === "Analyst" ? "emerald" : "slate",
    };
  });
}

const fallbackMembers: TeamMember[] = [
  { name: "Testing User", email: "tu@narriv.ai", role: "Workspace Owner", status: "Aktif", permission: "Full Access", time: "Aktif sekarang", initials: "TU", tone: "purple" },
  { name: "Jane Doe", email: "jane@narriv.ai", role: "Admin", status: "Aktif", permission: "Full Access", time: "Aktif kemarin", initials: "JD", tone: "blue" },
  { name: "John Smith", email: "john@narriv.ai", role: "Analyst", status: "Aktif", permission: "Read & Write", time: "2 jam lalu", initials: "JS", tone: "emerald" },
  { name: "Alice Cooper", email: "alice@narriv.ai", role: "Viewer", status: "Nonaktif", permission: "Read Only", time: "1 hari lalu", initials: "AC", tone: "slate" },
];

// Custom Panel Component
function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[14px] border border-[#DDE3EF] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>
      {children}
    </section>
  );
}

// Custom Switch Toggle Component
function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
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

// Sparkline Component for Billing stats
function PlanSparkline({ values, className = "h-10 w-full" }: { values: number[]; className?: string }) {
  const width = 240;
  const height = 60;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const padding = 5;

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  const pathD = `M ${points.split(" ")[0]} L ${points.split(" ").slice(1).join(" L ")}`;
  const areaD = `${pathD} L ${width - padding} ${height} L ${padding} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("chart-line-draw overflow-visible", className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#465FFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#465FFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGradient)" />
      <path d={pathD} fill="none" stroke="#465FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Main Page Component
export default function SettingsPage() {
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
        showToast("Pengaturan belum bisa disimpan. Coba lagi sebentar.", "error");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
      setSaveSuccess(true);
      showToast("Perubahan workspace berhasil disimpan.");
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: () => showToast("Pengaturan belum bisa disimpan. Coba lagi sebentar.", "error"),
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
        showToast("Berhasil mengundang member ke workspace.");
      } else {
        showToast("Gagal mengundang member. Coba lagi.", "error");
      }
    },
    onError: () => showToast("Gagal mengundang member. Coba lagi.", "error"),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => deleteWorkspaceMember(memberId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      if (result) {
        showToast("Member berhasil dihapus dari workspace.");
      } else {
        showToast("Gagal menghapus member. Coba lagi.", "error");
      }
      setMemberToDelete(null);
    },
    onError: () => showToast("Gagal menghapus member. Coba lagi.", "error"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => changePassword(input),
    onSuccess: async (result) => {
      if (result) {
        showToast("Password berhasil diubah.");
      } else {
        showToast("Gagal mengubah password. Coba lagi.", "error");
      }
    },
    onError: () => showToast("Gagal mengubah password. Coba lagi.", "error"),
  });

  // State: Workspace Info
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [language, setLanguage] = useState("Bahasa Indonesia");
  const [workspaceUrl, setWorkspaceUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const activeLogo = workspaceLogo || (workspaceSettingsQuery.data?.logoUrl ? resolveBackendAssetUrl(workspaceSettingsQuery.data.logoUrl) : "/narriv-logo.svg");
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const isSavingInfo = updateSettingsMutation.isPending;
  const [saveSuccess, setSaveSuccess] = useState(false);

  const uploadLogoMutation = useMutation({
    mutationFn: (input: { fileName: string; fileContent: string; mimeType: string }) => uploadWorkspaceLogo(input),
    onSuccess: (result) => {
      if (!result) {
        setLogoError("Logo belum bisa diunggah. Coba lagi sebentar.");
        showToast("Logo belum bisa diunggah. Coba lagi sebentar.", "error");
        return;
      }

      setWorkspaceLogo(resolveBackendAssetUrl(result.url));
      setLogoError("");
      showToast("Logo workspace berhasil diunggah.");
      void queryClient.invalidateQueries({ queryKey: ["workspace-settings"] });
    },
    onError: () => {
      setLogoError("Logo belum bisa diunggah. Coba lagi sebentar.");
      showToast("Logo belum bisa diunggah. Coba lagi sebentar.", "error");
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
  const [notifSlack, setNotifSlack] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState<boolean | null>(null);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifCritical, setNotifCritical] = useState(false);

  // State: AI Preferences
  const [aiSensitivity, setAiSensitivity] = useState("Medium");
  const [autoCat, setAutoCat] = useState(true);
  const [autoSentiment, setAutoSentiment] = useState(true);
  const [summaryStyle, setSummaryStyle] = useState("Executive");
  const [enableRecs, setEnableRecs] = useState(true);
  const [enablePredictive, setEnablePredictive] = useState(true);

  // State: Security
  const [security2fa, setSecurity2fa] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30 menit");
  const [ipRestrict, setIpRestrict] = useState(false);
  const [dataRetention, setDataRetention] = useState("90 hari");

  // State: Chart interactive hover
  const chartData = [18452, 22000, 19800, 26000, 24500, 31000, 29000, 34000, 32041];
  const chartDates = ["13 Mei", "18 Mei", "25 Mei", "28 Mei", "2 Jun", "7 Jun", "12 Jun", "18 Jun", "24 Jun"];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Confirmation Modal State (Danger Zone)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"pause" | "reset" | "delete" | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const liveMembers = membersQuery.data ? buildMemberRows(membersQuery.data) : null;
  const members = memberOverrides ?? liveMembers ?? fallbackMembers;
  const workspaceNameValue = workspaceName ?? workspaceSettingsQuery.data?.brandName ?? "Narriv Intelligence";
  const industryValue = industry ?? workspaceSettingsQuery.data?.industry ?? "Technology";
  const timezoneValue = timezone ?? workspaceSettingsQuery.data?.timezone ?? "Asia/Jakarta (GMT+7)";
  const workspaceUrlValue = workspaceUrl ?? toWorkspaceSlug(workspaceNameValue);
  const notifEmailValue = notifEmail ?? Boolean(workspaceSettingsQuery.data?.notificationEmail ?? true);
  const notifWhatsappValue = notifWhatsapp ?? Boolean(workspaceSettingsQuery.data?.whatsappPIC);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`narriv.ai/workspace/${workspaceUrlValue}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWorkspaceInfo = (e: FormEvent) => {
    e.preventDefault();
    const errors: { name?: string } = {};

    if (!workspaceNameValue.trim()) {
      errors.name = "Nama workspace wajib diisi.";
    } else if (workspaceNameValue.trim().length < 3) {
      errors.name = "Nama workspace minimal 3 karakter.";
    }

    setWorkspaceErrors(errors);
    if (Object.keys(errors).length > 0) return;

    updateSettingsMutation.mutate({
      brandName: workspaceNameValue.trim(),
      industry: industryValue,
      timezone: timezoneValue,
      notificationEmail: notifEmailValue ? "enabled" : null,
      whatsappPIC: notifWhatsappValue ? "enabled" : null,
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
      setLogoError("Format logo harus PNG, JPG, WEBP, atau SVG.");
      showToast("Format logo tidak didukung.", "error");
      return;
    }

    if (file.size > LOGO_MAX_SIZE_BYTES) {
      setLogoError("Ukuran logo maksimal 2MB.");
      showToast("Ukuran logo maksimal 2MB.", "error");
      return;
    }

    try {
      const fileContent = await readFileAsBase64(file);
      uploadLogoMutation.mutate({ fileName: file.name, fileContent, mimeType: file.type });
    } catch {
      setLogoError("File logo belum bisa dibaca. Coba pilih file lain.");
      showToast("File logo belum bisa dibaca.", "error");
    }
  };

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; email?: string } = {};

    if (!inviteName.trim()) {
      errors.name = "Nama wajib diisi.";
    } else if (inviteName.trim().length < 2) {
      errors.name = "Nama minimal 2 karakter.";
    }

    if (!inviteEmail.trim()) {
      errors.email = "Email wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      errors.email = "Format email tidak valid.";
    }

    setInviteErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const roleMap: Record<string, "admin" | "analyst"> = { "Admin": "admin", "Analyst": "analyst", "Viewer": "analyst" };
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

  const triggerConfirmAction = (action: "pause" | "reset" | "delete") => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeConfirmAction = () => {
    setShowConfirmModal(false);
    if (confirmAction === "pause") {
      showToast("Workspace berhasil dinonaktifkan sementara.");
    } else if (confirmAction === "reset") {
      showToast("Cache sinyal berhasil dibersihkan dan diproses ulang.");
    } else if (confirmAction === "delete") {
      showToast("Prosedur penghapusan workspace diinisialisasi.");
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
      showToast(`${memberToDelete.name} dihapus dari workspace.`);
      setMemberToDelete(null);
    }
  };

  const confirmDescription = (() => {
    if (confirmAction === "pause") {
      return "Apakah Anda yakin ingin menonaktifkan workspace ini sementara? Pengumpulan sinyal baru, analisis sentimen otomatis, dan notifikasi akan dihentikan.";
    }

    if (confirmAction === "reset") {
      return "Apakah Anda yakin ingin membersihkan cache lokal? Semua sinyal akan diunduh ulang dari platform monitoring asal. Proses ini memakan waktu beberapa menit.";
    }

    return "Apakah Anda yakin ingin menghapus workspace secara permanen? Seluruh riwayat analisis, integrasi, data pengguna, dan visualisasi akan dihapus selamanya. Tindakan ini tidak dapat dibatalkan.";
  })();

  // Helper styles for roles
  const roleStyles: Record<string, string> = {
    "Workspace Owner": "bg-purple-50 text-purple-700 border-purple-100",
    "Admin": "bg-blue-50 text-blue-700 border-blue-100",
    "Analyst": "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Viewer": "bg-slate-100 text-slate-700 border-slate-200/50"
  };

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 pb-12 text-[#101334]">
      {/* Header */}
      <div>
        <h1 className="text-[31px] font-black tracking-[-0.045em] text-[#060A23]">Settings</h1>
        <p className="mt-2 text-[14px] font-semibold text-[#68739F]">
          Kelola pengaturan workspace, integrasi, dan preferensi sistem Anda.
        </p>
      </div>

      {workspaceSettingsQuery.data === null ? (
        <DashboardErrorState title="Pengaturan live belum bisa dimuat" description="API client sudah mencoba token refresh. Form tetap bisa digunakan dengan nilai sementara." onRetry={() => void workspaceSettingsQuery.refetch()} minHeight="min-h-[150px]" />
      ) : null}

      {membersQuery.data === null ? (
        <DashboardErrorState title="Daftar member live belum bisa dimuat" description="API client sudah mencoba token refresh. Untuk sementara, tabel menampilkan member contoh." onRetry={() => void membersQuery.refetch()} minHeight="min-h-[150px]" />
      ) : null}

      {/* Row 1: Workspace & User Management */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.45fr]">
        
        {/* Card A: Informasi Workspace */}
        <Panel className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
              <Building size={20} strokeWidth={2.3} />
            </span>
            <div>
              <h2 className="text-base font-black text-[#101334]">Informasi Workspace</h2>
              <p className="text-[11px] font-bold text-[#68739F]">Informasi dasar tentang workspace Anda.</p>
            </div>
          </div>

          <form onSubmit={handleSaveWorkspaceInfo} className="grid gap-4">
            {/* Logo and inputs side-by-side or stacked */}
            <div className="grid gap-5 sm:grid-cols-[100px_1fr]">
              <div className="flex flex-col items-center">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                  <Image src={activeLogo} alt="Workspace Logo" width={60} height={60} unoptimized={activeLogo.startsWith("http")} className={cn("object-contain transition-opacity", uploadLogoMutation.isPending && "opacity-45")} />
                  {uploadLogoMutation.isPending ? <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/95 px-2 py-1 text-center text-[8px] font-black uppercase tracking-wide text-[#465FFF] shadow-sm">Uploading</span> : null}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={handleLogoFileChange}
                />
                <button
                  type="button"
                  onClick={handleLogoUpload}
                  disabled={uploadLogoMutation.isPending}
                  className="mt-2.5 w-full rounded-lg border border-[#DDE3EF] bg-white px-1 py-1 text-center text-[9px] font-extrabold text-[#465FFF] shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                >
                  {uploadLogoMutation.isPending ? "Mengunggah..." : "Ubah Logo"}
                </button>
                <span className="mt-1 text-center text-[9px] font-semibold text-slate-400">PNG, JPG, WEBP, SVG max 2MB</span>
                {logoError ? <span className="mt-1 text-center text-[9px] font-bold text-[#EF4444]">{logoError}</span> : null}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                    Nama Workspace
                  </label>
                  <input
                    type="text"
                    value={workspaceNameValue}
                    onChange={(e) => { setWorkspaceName(e.target.value); setWorkspaceErrors({}); }}
                    className={cn("h-10 w-full rounded-lg border px-3 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/15", workspaceErrors.name ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                  />
                  {workspaceErrors.name && <p className="mt-1 text-[9px] font-bold text-[#EF4444]">{workspaceErrors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                    Industri
                  </label>
                  <div className="relative">
                    <select
                      value={industryValue}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                    >
                      <option value="Technology">Technology</option>
                      <option value="Finance">Finance</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Retail">Retail & E-Commerce</option>
                      <option value="Government">Government & Non-Profit</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#68739F]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-[11px] font-black text-[#101334]">Ubah Password</p>
              <div className="space-y-2.5">
                <div>
                  <input
                    type="password"
                    placeholder="Password saat ini"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors((prev) => ({ ...prev, current: undefined })); }}
                    className={cn("h-9 w-full rounded-md border bg-slate-50 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#465FFF]", passwordErrors.current ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                  />
                  {passwordErrors.current && <p className="mt-1 text-[9px] font-bold text-[#EF4444]">{passwordErrors.current}</p>}
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password baru (min 10 karakter, huruf besar, angka, simbol)"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors((prev) => ({ ...prev, newPass: undefined })); }}
                    className={cn("h-9 w-full rounded-md border bg-slate-50 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#465FFF]", passwordErrors.newPass ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                  />
                  {passwordErrors.newPass && <p className="mt-1 text-[9px] font-bold text-[#EF4444]">{passwordErrors.newPass}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const errors: { current?: string; newPass?: string } = {};
                    if (!currentPassword) errors.current = "Password saat ini wajib diisi.";
                    if (!newPassword) {
                      errors.newPass = "Password baru wajib diisi.";
                    } else if (newPassword.length < 10) {
                      errors.newPass = "Password minimal 10 karakter.";
                    } else if (!/[A-Z]/.test(newPassword)) {
                      errors.newPass = "Password harus mengandung huruf besar.";
                    } else if (!/[0-9]/.test(newPassword)) {
                      errors.newPass = "Password harus mengandung angka.";
                    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
                      errors.newPass = "Password harus mengandung simbol.";
                    }
                    setPasswordErrors(errors);
                    if (Object.keys(errors).length > 0) return;
                    changePasswordMutation.mutate({ currentPassword, newPassword });
                  }}
                  disabled={changePasswordMutation.isPending}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#465FFF] text-[11px] font-black text-white transition hover:bg-[#3B4FE0] disabled:opacity-50"
                >
                  <Lock size={13} />
                  {changePasswordMutation.isPending ? "Menyimpan..." : "Ubah Password"}
                </button>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                  Time Zone
                </label>
                <div className="relative">
                  <select
                    value={timezoneValue}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                  >
                    <option value="Asia/Jakarta (GMT+7)">Asia/Jakarta (GMT+7)</option>
                    <option value="Asia/Singapore (GMT+8)">Asia/Singapore (GMT+8)</option>
                    <option value="UTC (GMT+0)">UTC (GMT+0)</option>
                    <option value="America/New_York (GMT-5)">America/New_York (GMT-5)</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#68739F]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                  Bahasa
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                  >
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#68739F]" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                Workspace URL
              </label>
              <div className="relative flex rounded-lg border border-[#DDE3EF] focus-within:border-[#465FFF] focus-within:ring-2 focus-within:ring-[#465FFF]/15">
                <span className="flex items-center bg-slate-50 px-3 text-[11px] font-black text-slate-400 select-none border-r border-[#DDE3EF]">
                  narriv.ai/workspace/
                </span>
                <input
                  type="text"
                  value={workspaceUrlValue}
                  onChange={(e) => setWorkspaceUrl(e.target.value)}
                  className="h-10 flex-1 px-3 pr-10 text-[12px] font-bold text-[#101334] bg-white rounded-r-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="absolute right-3 top-3 text-slate-400 hover:text-[#465FFF]"
                  title="Salin URL workspace"
                >
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
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
                  Menyimpan...
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={16} />
                  Perubahan Disimpan
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </form>
        </Panel>

        {/* Card B: User & Access Management */}
        <Panel className="flex flex-col gap-4 h-full">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
                <Users size={20} strokeWidth={2.3} />
              </span>
              <div>
                <h2 className="text-base font-black text-[#101334]">User & Access Management</h2>
                <p className="text-[11px] font-bold text-[#68739F]">Kelola anggota workspace dan akses mereka.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => showToast("Role & Permissions manager akan terbuka.", "info")}
                className="flex h-9 items-center gap-1.5 rounded-[8px] border border-[#DDE3EF] bg-white px-3 text-[11px] font-black text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                Kelola Role & Permission
              </button>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex h-9 items-center gap-1.5 rounded-[8px] bg-[#465FFF] px-3.5 text-[11px] font-black text-white shadow-[0_4px_12px_rgba(70,95,255,0.2)] transition hover:bg-[#3B20EA]"
              >
                <Plus size={14} /> Invite Member
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto rounded-[12px] border border-[#EDF1F7] bg-white">
            {membersQuery.isPending ? (
              <TableSkeleton rows={4} columns={6} className="border-0 shadow-none" />
            ) : membersQuery.data && members.length === 0 ? (
              <DashboardEmptyState title="Belum ada member live" description="Workspace ini belum memiliki member yang dikembalikan oleh backend." icon="inbox" minHeight="min-h-[280px]" />
            ) : (
            <table className="w-full min-w-[580px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E6EAF2] bg-[#FBFCFF] text-[10px] font-black uppercase tracking-[0.1em] text-[#68739F]">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Permission</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F7] text-[11.5px] font-bold">
                {members.map((member, idx) => (
                  <tr key={member.email} className="transition hover:bg-[#F8FAFF]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-white",
                          member.tone === "purple" ? "bg-purple-600" : member.tone === "blue" ? "bg-[#465FFF]" : member.tone === "emerald" ? "bg-emerald-600" : "bg-slate-500"
                        )}>
                          {member.initials}
                        </span>
                        <div>
                          <span className="block font-black text-[#101334]">{member.name}</span>
                          <span className="block text-[10px] text-slate-400 font-semibold">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block rounded px-2 py-0.5 text-[9.5px] font-black border", roleStyles[member.role])}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{member.permission}</td>
                    <td className="px-4 py-3 text-slate-500 font-semibold">{member.time}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[9.5px] font-black border",
                        member.status === "Aktif" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100/50" 
                          : "bg-rose-50 text-rose-700 border-rose-100/50"
                      )}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => {
                            const action = member.status === "Aktif" ? "Nonaktif" : "Aktif";
                            const updated = [...members];
                            updated[idx].status = action;
                            setMemberOverrides(updated);
                            showToast(`Status ${member.name} diubah menjadi ${action}.`);
                          }}
                          className="rounded-md border border-[#DDE3EF] bg-white p-1 text-slate-400 hover:text-[#465FFF] hover:bg-[#EEF2FF]"
                          title={member.status === "Aktif" ? "Nonaktifkan pengguna" : "Aktifkan pengguna"}
                        >
                          <UserCheck size={14} />
                        </button>
                          <button
                            type="button"
                            onClick={() => setMemberToDelete(member)}
                            className="ml-1 rounded-md border border-[#DDE3EF] bg-white p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus anggota"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </Panel>
      </div>

      {/* Row 2: 4-Column Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Notifikasi */}
        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#8B5CFF]">
              <Bell size={18} strokeWidth={2.3} />
            </span>
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">Notifikasi</h3>
              <p className="text-[10px] font-semibold text-[#68739F]">Preferensi rute notifikasi Anda.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Email Alerts</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Laporan alert ke email</span>
              </div>
              <Switch checked={notifEmailValue} onChange={setNotifEmail} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Slack Alerts</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Eskalasi otomatis ke Slack</span>
              </div>
              <Switch checked={notifSlack} onChange={setNotifSlack} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">WhatsApp Alerts</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Alert real-time nomor terdaftar</span>
              </div>
              <Switch checked={notifWhatsappValue} onChange={setNotifWhatsapp} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Daily Summary</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Ringkasan harian analisis narasi</span>
              </div>
              <Switch checked={notifDaily} onChange={setNotifDaily} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Critical Alert Only</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Hanya notifikasi tingkat kritis</span>
              </div>
              <Switch checked={notifCritical} onChange={setNotifCritical} />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <div>
                  <span className="block text-[11px] font-black text-[#101334]">Quiet Hours</span>
                  <span className="block text-[9.5px] text-slate-400 font-semibold">Jeda notifikasi di luar kerja</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => showToast("Quiet Hours editor akan terbuka.", "info")}
                className="text-[10px] font-black text-[#465FFF] hover:underline"
              >
                22:00 - 07:00 &gt;
              </button>
            </div>
          </div>
        </Panel>

        {/* Card 2: AI Preferences */}
        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#8B5CFF]">
              <Sparkles size={18} strokeWidth={2.3} />
            </span>
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">AI Preferences</h3>
              <p className="text-[10px] font-semibold text-[#68739F]">Sesuaikan cara kerja agen AI.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#101334]">AI Sensitivity</span>
              <div className="relative">
                <select
                  value={aiSensitivity}
                  onChange={(e) => setAiSensitivity(e.target.value)}
                  className="h-8 appearance-none rounded-md border border-[#DDE3EF] bg-slate-50 px-2.5 pr-7 text-[10px] font-black text-slate-700 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2.5 text-slate-500" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Auto Categorization</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Otomatis kelompokkan tag cluster</span>
              </div>
              <Switch checked={autoCat} onChange={setAutoCat} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Auto Sentiment Analysis</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Tentukan polaritas sentimen berita</span>
              </div>
              <Switch checked={autoSentiment} onChange={setAutoSentiment} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#101334]">AI Summary Style</span>
              <div className="relative">
                <select
                  value={summaryStyle}
                  onChange={(e) => setSummaryStyle(e.target.value)}
                  className="h-8 appearance-none rounded-md border border-[#DDE3EF] bg-slate-50 px-2.5 pr-7 text-[10px] font-black text-slate-700 focus:outline-none"
                >
                  <option value="Executive">Executive</option>
                  <option value="Detailed">Detailed</option>
                  <option value="Short">Short</option>
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2.5 text-slate-500" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Enable AI Recommendations</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Tampilkan saran tindak lanjut</span>
              </div>
              <Switch checked={enableRecs} onChange={setEnableRecs} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Enable Predictive Signals</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Deteksi tanda tren membesar</span>
              </div>
              <Switch checked={enablePredictive} onChange={setEnablePredictive} />
            </div>
          </div>
        </Panel>

        {/* Card 3: Integrations & API */}
        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
              <Layers size={18} strokeWidth={2.3} />
            </span>
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">Integrations & API</h3>
              <p className="text-[10px] font-semibold text-[#68739F]">Kelola integrasi dan akses API.</p>
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            {[
              { label: "Connected Platforms", sub: "Integrasi media & monitoring", icon: Cloud, badge: "12" },
              { label: "API Keys", sub: "Buat & hapus token akses", icon: Key },
              { label: "Webhooks", sub: "Pemberitahuan event eksternal", icon: Webhook },
              { label: "Database Export", sub: "Sinkronisasi Postgres/BigQuery", icon: Database },
              { label: "Slack App Settings", sub: "Hubungkan channel eskalasi", icon: Sliders },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => showToast(`Manajemen ${item.label} akan terbuka.`, "info")}
                  className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#68739F]"><Icon size={16} /></span>
                    <div>
                      <span className="block text-[11px] font-black text-[#101334]">{item.label}</span>
                      <span className="block text-[9px] text-slate-400 font-semibold">{item.sub}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-700">
                        {item.badge}
                      </span>
                    )}
                    <ArrowRight size={13} className="text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Card 4: Security */}
        <Panel className="flex flex-col gap-4.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
              <Shield size={18} strokeWidth={2.3} />
            </span>
            <div>
              <h3 className="text-[13.5px] font-black text-[#101334]">Security</h3>
              <p className="text-[10px] font-semibold text-[#68739F]">Keamanan dan enkripsi workspace.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Two-Factor Auth (2FA)</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">MFA wajib untuk semua anggota</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-[#CDEEDD] bg-[#F1FCF6] px-2 py-0.5 text-[9px] font-black text-[#10B981]">
                  Aktif
                </span>
                <Switch checked={security2fa} onChange={setSecurity2fa} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Session Timeout</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Masa berakhir login aktif</span>
              </div>
              <div className="relative">
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="h-8 appearance-none rounded-md border border-[#DDE3EF] bg-slate-50 px-2.5 pr-7 text-[10px] font-black text-slate-700 focus:outline-none"
                >
                  <option value="15 menit">15 menit</option>
                  <option value="30 menit">30 menit</option>
                  <option value="1 jam">1 jam</option>
                  <option value="12 jam">12 jam</option>
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2.5 text-slate-500" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">IP Restriction</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Batasi login dari IP kantor saja</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-md border px-2 py-0.5 text-[9px] font-black",
                  ipRestrict 
                    ? "border-[#CDEEDD] bg-[#F1FCF6] text-[#10B981]" 
                    : "border-slate-200 bg-slate-100 text-slate-500"
                )}>
                  {ipRestrict ? "Aktif" : "Nonaktif"}
                </span>
                <Switch checked={ipRestrict} onChange={setIpRestrict} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => showToast("Log audit keamanan sedang diekspor.", "info")}
              className="flex w-full items-center justify-between border-t border-slate-100 pt-3.5 text-left"
            >
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-slate-400" />
                <div>
                  <span className="block text-[11px] font-black text-[#101334]">Audit Logs</span>
                  <span className="block text-[9.5px] text-slate-400 font-semibold">Unduh riwayat aktivitas keamanan</span>
                </div>
              </div>
              <ArrowRight size={13} className="text-slate-400" />
            </button>

            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-black text-[#101334]">Data Retention</span>
                <span className="block text-[9.5px] text-slate-400 font-semibold">Lama penyimpanan arsip log</span>
              </div>
              <div className="relative">
                <select
                  value={dataRetention}
                  onChange={(e) => setDataRetention(e.target.value)}
                  className="h-8 appearance-none rounded-md border border-[#DDE3EF] bg-slate-50 px-2.5 pr-7 text-[10px] font-black text-slate-700 focus:outline-none"
                >
                  <option value="30 hari">30 hari</option>
                  <option value="90 hari">90 hari</option>
                  <option value="365 hari">365 hari</option>
                  <option value="Selamanya">Selamanya</option>
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2.5 text-slate-500" />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3: Billing & Usage & Danger Zone */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1.1fr]">
        
        {/* Card A: Billing & Usage */}
        <Panel className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
              <CreditCard size={20} strokeWidth={2.3} />
            </span>
            <div>
              <h2 className="text-base font-black text-[#101334]">Billing & Usage</h2>
              <p className="text-[11px] font-bold text-[#68739F]">Informasi paket dan penggunaan workspace.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Section (Plan Info - 1/3 width) */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-[#FBFCFF] p-4.5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shadow-[inset_0_0_12px_rgba(70,95,255,0.15)]">
                  <Sparkles size={24} />
                </div>
                <h4 className="mt-3 text-[18px] font-black text-[#101334]">Enterprise</h4>
                <p className="mt-1 text-[11px] font-semibold text-[#68739F]">Paket aktif profesional skala besar.</p>
                <button
                  type="button"
                  onClick={() => showToast("Panel langganan akan terbuka.", "info")}
                  className="mt-4 w-full rounded-lg border border-indigo-200 bg-white py-2 text-center text-[11px] font-black text-[#465FFF] shadow-sm transition hover:bg-indigo-50/30"
                >
                  Kelola Paket
                </button>
              </div>

              <div className="border-t border-slate-100 pt-3 text-[11px] font-bold space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#68739F]">Status</span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 text-[9.5px] font-black text-emerald-600">
                    Aktif
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68739F]">Tagihan Berikutnya</span>
                  <span className="text-[#101334]">12 Juni 2025 <span className="text-[10px] text-slate-400 font-semibold">(30 hari lagi)</span></span>
                </div>
              </div>
            </div>

            {/* Right Section (Usage Chart - 2/3 width) */}
            <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#68739F]">
                    Penggunaan Signal (30 Hari Terakhir)
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[25px] font-black text-[#101334]">128.452</span>
                    <span className="text-[11px] font-bold text-slate-400">Total Signals</span>
                  </div>
                  <span className="mt-1 block text-[10.5px] font-black text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp size={12} /> ▲ 18.6% vs periode sebelumnya
                  </span>
                </div>
                <div className="relative">
                  <select
                    defaultValue="30"
                    className="h-7 rounded-md border border-[#DDE3EF] bg-white px-2.5 pr-7 text-[10px] font-black text-slate-700 focus:outline-none"
                  >
                    <option value="30">30 Hari Terakhir</option>
                    <option value="60">60 Hari Terakhir</option>
                  </select>
                  <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2 text-slate-500" />
                </div>
              </div>

              {/* Spline Area Chart */}
              <div className="relative mt-4 h-[120px] w-full">
                {/* Visual grid lines */}
                <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-slate-100/80 w-full" />
                  <div className="border-t border-slate-100/80 w-full" />
                  <div className="border-t border-slate-100/80 w-full" />
                  <div className="border-t border-slate-100/80 w-full" />
                </div>

                <div className="absolute inset-0 z-10">
                  <PlanSparkline values={chartData} className="h-full w-full" />
                </div>

                {/* Hover dots & tooltips */}
                <div className="absolute inset-0 z-20 flex items-end justify-between px-1.5 pointer-events-none">
                  {chartData.map((val, idx) => {
                    const maxVal = Math.max(...chartData);
                    const minVal = Math.min(...chartData);
                    const percent = ((val - minVal) / (maxVal - minVal)) * 80 + 10; // 10% - 90% range
                    
                    return (
                      <div
                        key={idx}
                        className="relative flex flex-col items-center justify-end h-full flex-1 group pointer-events-auto cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        {/* Dot */}
                        <div
                          style={{ bottom: `${percent}%` }}
                          className={cn(
                            "absolute h-3 w-3 rounded-full border-2 border-white transition-all shadow-sm",
                            hoveredIdx === idx ? "bg-[#8B5CFF] scale-125 ring-4 ring-[#8B5CFF]/15" : "bg-[#465FFF]"
                          )}
                        />

                        {/* Custom Interactive Tooltip */}
                        {hoveredIdx === idx && (
                          <div
                            style={{ bottom: `${percent + 18}%` }}
                            className="absolute z-30 flex flex-col items-center bg-slate-950 px-2.5 py-1.5 rounded-lg shadow-xl text-[9px] font-black text-white whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                          >
                            <span className="text-slate-400 font-bold">{chartDates[idx]}</span>
                            <span className="mt-0.5 text-[10px] text-[#00F0FF]">{val.toLocaleString("id-ID")} signals</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X axis dates */}
              <div className="mt-2 flex justify-between px-1 text-[9px] font-black text-slate-400">
                {chartDates.slice(0, 7).map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>
          </div>

          {/* Bottom Progress Metrics Sub-row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 pt-5">
            {[
              { label: "Signal Volume", usage: "128.452 / 200.000", pct: 64, fill: "bg-[#465FFF]" },
              { label: "Connected Sources", usage: "8 / 10", pct: 80, fill: "bg-[#465FFF]" },
              { label: "Users limit", usage: "12 / 25", pct: 48, fill: "bg-[#465FFF]" },
              { label: "AI Credits", usage: "8.200 / 10.000", pct: 82, fill: "bg-emerald-500" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-100 bg-[#FBFCFF] p-4">
                <div className="flex items-center justify-between text-[11px] font-black">
                  <span className="text-slate-500">{metric.label}</span>
                  <span className="text-[#101334]">{metric.usage}</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div style={{ width: `${metric.pct}%` }} className={cn("h-full rounded-full", metric.fill)} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Card B: Danger Zone */}
        <Panel className="flex flex-col gap-6 border-rose-100 bg-rose-50/10">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Shield size={20} strokeWidth={2.3} />
            </span>
            <div>
              <h2 className="text-base font-black text-rose-600">Danger Zone</h2>
              <p className="text-[11px] font-bold text-slate-500">
                Tindakan berisiko yang dapat mempengaruhi workspace Anda.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-black text-slate-800">Pause Workspace</span>
                <span className="mt-1 block text-[10px] text-slate-400 font-semibold leading-normal">
                  Hentikan sementara semua monitoring dan ingest data.
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerConfirmAction("pause")}
                className="flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[11px] font-black text-white transition hover:bg-rose-700 shadow-sm"
              >
                <Pause size={13} /> Pause Workspace
              </button>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100/80 pt-4">
              <div className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-black text-slate-800">Reset Signals Cache</span>
                <span className="mt-1 block text-[10px] text-slate-400 font-semibold leading-normal">
                  Hapus cache lokal dan proses ulang semua signals.
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerConfirmAction("reset")}
                className="flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[11px] font-black text-white transition hover:bg-rose-700 shadow-sm"
              >
                <RefreshCw size={13} /> Reset Cache
              </button>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100/80 pt-4">
              <div className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-black text-[#D32F2F]">Delete Workspace</span>
                <span className="mt-1 block text-[10px] text-slate-400 font-semibold leading-normal">
                  Hapus permanen workspace beserta semua data di dalamnya.
                </span>
              </div>
              <button
                type="button"
                onClick={() => triggerConfirmAction("delete")}
                className="flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-[11px] font-black text-white transition hover:bg-rose-700 shadow-sm"
              >
                <Trash2 size={13} /> Delete Workspace
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* MODAL: Invite Member */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#465FFF]">
                  <PlusCircle size={18} />
                </span>
                <div>
                  <h3 className="text-base font-black text-[#101334]">Invite New Member</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Tambahkan kolaborator baru ke workspace.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg border border-slate-100 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aldi Pratama"
                  value={inviteName}
                  onChange={(e) => { setInviteName(e.target.value); setInviteErrors((prev) => ({ ...prev, name: undefined })); }}
                  className={cn("h-10 w-full rounded-lg border px-3 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/15", inviteErrors.name ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                />
                {inviteErrors.name && <p className="mt-1 text-[9px] font-bold text-[#EF4444]">{inviteErrors.name}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                  Email Kerja
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: aldi@narriv.ai"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteErrors((prev) => ({ ...prev, email: undefined })); }}
                  className={cn("h-10 w-full rounded-lg border px-3 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none focus:ring-2 focus:ring-[#465FFF]/15", inviteErrors.email ? "border-[#EF4444]" : "border-[#DDE3EF]")}
                />
                {inviteErrors.email && <p className="mt-1 text-[9px] font-bold text-[#EF4444]">{inviteErrors.email}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-[#68739F]">
                  Pilih Role Akses
                </label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-[#DDE3EF] bg-white px-3 pr-8 text-[12px] font-bold text-[#101334] focus:border-[#465FFF] focus:outline-none"
                  >
                    <option value="Admin">Admin (Akses Penuh Kelola)</option>
                    <option value="Analyst">Analyst (Tulis & Baca Laporan)</option>
                    <option value="Viewer">Viewer (Hanya Baca)</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-[#68739F]" />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] font-black text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#465FFF] text-[12px] font-black text-white hover:bg-[#3B20EA]"
                >
                  Kirim Undangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={showConfirmModal}
        title="Konfirmasi Aksi"
        description={confirmDescription}
        confirmLabel="Ya, lanjutkan"
        onConfirm={executeConfirmAction}
        onOpenChange={(open) => {
          setShowConfirmModal(open);
          if (!open) setConfirmAction(null);
        }}
      />

      <ConfirmationDialog
        open={Boolean(memberToDelete)}
        title="Hapus Member"
        description={memberToDelete ? `Hapus ${memberToDelete.name} dari workspace? Akses pengguna ini ke dashboard dan data workspace akan dicabut.` : ""}
        confirmLabel="Ya, hapus"
        onConfirm={executeDeleteMember}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      />
    </div>
  );
}
