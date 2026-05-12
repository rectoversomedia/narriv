"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SectionHeader, SurfaceCard } from "@/components/ui/dashboard-primitives";
import { FeedbackBanner, type FeedbackMessage } from "@/components/ui/FeedbackBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  changePassword,
  createWorkspaceMember,
  deleteWorkspaceMember,
  getCurrentUser,
  getWorkspaceMembers,
  getWorkspaceSettings,
  updateWorkspaceSettings,
  type CurrentUserResponse,
  type WorkspaceMemberRecord,
  type WorkspaceSettingsResponse,
} from "@/lib/api-service";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const emptySettings = {
  brandName: "",
  industry: "",
  timezone: "UTC",
  notificationEmail: "",
  whatsappPIC: "",
};

const toFormSettings = (settings: WorkspaceSettingsResponse | null) => ({
  brandName: settings?.brandName ?? "",
  industry: settings?.industry ?? "",
  timezone: settings?.timezone ?? "UTC",
  notificationEmail: settings?.notificationEmail ?? "",
  whatsappPIC: settings?.whatsappPIC ?? "",
});

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export default function SettingsPage() {
  const t = useTranslations("Workspace.settings");
  const storedUser = useAuthStore((state) => state.user);
  const theme = useUiStore((state) => state.theme);
  const language = useUiStore((state) => state.language);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettingsResponse | null>(null);
  const [settingsForm, setSettingsForm] = useState(emptySettings);
  const [members, setMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"owner" | "admin" | "analyst">("analyst");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchSettingsData() {
      setIsLoading(true);
      const [currentUser, workspaceSettings, workspaceMembers] = await Promise.all([
        getCurrentUser(),
        getWorkspaceSettings(),
        getWorkspaceMembers(),
      ]);
      setUser(currentUser);
      setSettings(workspaceSettings);
      setSettingsForm(toFormSettings(workspaceSettings));
      setMembers(workspaceMembers ?? []);
      setIsLoading(false);
    }

    void fetchSettingsData();
  }, [reloadKey]);

  const profile = user ?? (storedUser ? { id: "-", name: storedUser.name, email: storedUser.email, createdAt: "" } : null);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    const updated = await updateWorkspaceSettings({
      brandName: emptyToNull(settingsForm.brandName),
      industry: emptyToNull(settingsForm.industry),
      timezone: emptyToNull(settingsForm.timezone) ?? "UTC",
      notificationEmail: emptyToNull(settingsForm.notificationEmail),
      whatsappPIC: emptyToNull(settingsForm.whatsappPIC),
    });
    setIsSavingSettings(false);

    if (!updated) {
      setFeedback({ tone: "error", title: t("settingsSaveFailed"), description: t("settingsSaveFailedDesc") });
      return;
    }

    setSettings(updated);
    setSettingsForm(toFormSettings(updated));
    setFeedback({ tone: "success", title: t("settingsSaved"), description: t("settingsSavedDesc") });
  };

  const handleAddMember = async () => {
    if (!newMemberUserId.trim()) {
      setFeedback({ tone: "error", title: t("memberAddFailed"), description: t("memberUserIdRequired") });
      return;
    }

    setIsSavingMember(true);
    const created = await createWorkspaceMember({ userId: newMemberUserId.trim(), role: newMemberRole });
    setIsSavingMember(false);

    if (!created) {
      setFeedback({ tone: "error", title: t("memberAddFailed"), description: t("memberAddFailedDesc") });
      return;
    }

    setMembers((current) => [...current, created]);
    setNewMemberUserId("");
    setFeedback({ tone: "success", title: t("memberAdded"), description: t("memberAddedDesc") });
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId);
    const removed = await deleteWorkspaceMember(memberId);
    setRemovingMemberId(null);

    if (!removed) {
      setFeedback({ tone: "error", title: t("memberRemoveFailed"), description: t("memberRemoveFailedDesc") });
      return;
    }

    setMembers((current) => current.filter((member) => member.id !== memberId));
    setFeedback({ tone: "success", title: t("memberRemoved"), description: t("memberRemovedDesc") });
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setFeedback({ tone: "error", title: t("passwordFailed"), description: t("passwordRequired") });
      return;
    }

    setIsChangingPassword(true);
    const changed = await changePassword(passwordForm);
    setIsChangingPassword(false);

    if (!changed) {
      setFeedback({ tone: "error", title: t("passwordFailed"), description: t("passwordFailedDesc") });
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "" });
    setFeedback({ tone: "success", title: t("passwordSaved"), description: t("passwordSavedDesc") });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="p-5 lg:col-span-2">
          <h2 className="theme-text text-lg font-semibold">{t("workspaceProfile")}</h2>
          {isLoading ? (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void handleSaveSettings(); }}>
              {[
                ["brandName", t("brandName"), t("brandNamePlaceholder")],
                ["industry", t("industry"), t("industryPlaceholder")],
                ["timezone", t("timezone"), "Asia/Jakarta"],
                ["notificationEmail", t("notificationEmail"), "team@example.com"],
                ["whatsappPIC", t("whatsappPIC"), "+6281234567890"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="space-y-1.5">
                  <span className="theme-muted text-xs font-semibold uppercase tracking-wider">{label}</span>
                  <input
                    value={settingsForm[key as keyof typeof settingsForm]}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="theme-panel theme-text h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50"
                  />
                </label>
              ))}
              <div className="theme-subtle rounded-xl border border-[var(--border)] p-4 sm:col-span-2">
                <p className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("activeWorkspace")}</p>
                <p className="theme-text mt-2 font-semibold">{settings?.workspaceId ?? storedUser?.workspace ?? t("defaultWorkspace")}</p>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={isSavingSettings} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50">
                  {isSavingSettings ? t("saving") : t("saveSettings")}
                </button>
              </div>
            </form>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h2 className="theme-text text-lg font-semibold">{t("preferences")}</h2>
          <div className="mt-5 space-y-3">
            <button type="button" onClick={toggleTheme} className="theme-card theme-hover flex w-full items-center justify-between rounded-xl border p-4 text-left">
              <span className="theme-muted text-sm">{t("mode")}</span>
              <span className="theme-text font-semibold capitalize">{theme}</span>
            </button>
            <button type="button" onClick={toggleLanguage} className="theme-card theme-hover flex w-full items-center justify-between rounded-xl border p-4 text-left">
              <span className="theme-muted text-sm">{t("language")}</span>
              <span className="theme-text font-semibold uppercase">{language}</span>
            </button>
          </div>
        </SurfaceCard>
      </div>

      <FeedbackBanner message={feedback} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard className="p-5 lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="theme-text text-lg font-semibold">{t("teamAccess")}</h2>
              <p className="theme-muted mt-1 text-sm">{t("teamAccessDesc")}</p>
            </div>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="theme-card theme-hover h-9 rounded-lg border px-3 text-sm font-semibold">
              {t("refresh")}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <input
              value={newMemberUserId}
              onChange={(event) => setNewMemberUserId(event.target.value)}
              placeholder={t("memberUserId")}
              className="theme-panel theme-text h-10 rounded-xl border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50"
            />
            <select
              value={newMemberRole}
              onChange={(event) => setNewMemberRole(event.target.value as "owner" | "admin" | "analyst")}
              className="theme-panel theme-text h-10 rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[#465FFF]/50"
            >
              <option value="analyst">{t("roleAnalyst")}</option>
              <option value="admin">{t("roleAdmin")}</option>
              <option value="owner">{t("roleOwner")}</option>
            </select>
            <button type="button" onClick={() => void handleAddMember()} disabled={isSavingMember} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50">
              {isSavingMember ? t("adding") : t("addMember")}
            </button>
          </div>

          <div className="mt-5 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {isLoading ? <div className="p-4"><Skeleton className="h-12 w-full" /></div> : members.length ? members.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="theme-text truncate text-sm font-semibold">{member.user?.name || member.user?.email || member.userId}</p>
                  <p className="theme-muted mt-1 truncate text-xs">{member.user?.email || member.userId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#465FFF]/25 bg-[#465FFF]/10 px-2.5 py-1 text-xs font-semibold text-[#465FFF]">{member.role}</span>
                  <button type="button" onClick={() => void handleRemoveMember(member.id)} disabled={removingMemberId === member.id} className="theme-card theme-hover rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-50">
                    {removingMemberId === member.id ? t("removing") : t("remove")}
                  </button>
                </div>
              </div>
            )) : (
              <p className="theme-muted p-4 text-sm">{t("noMembers")}</p>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <h2 className="theme-text text-lg font-semibold">{t("accountSecurity")}</h2>
          <p className="theme-muted mt-1 text-sm">{profile?.email || t("unknown")}</p>
          <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void handleChangePassword(); }}>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              placeholder={t("currentPassword")}
              className="theme-panel theme-text h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50"
            />
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
              placeholder={t("newPassword")}
              className="theme-panel theme-text h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/50"
            />
            <button type="submit" disabled={isChangingPassword} className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50">
              {isChangingPassword ? t("saving") : t("changePassword")}
            </button>
          </form>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <h2 className="theme-text text-lg font-semibold">{t("vercelReadiness")}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="theme-subtle rounded-xl border border-[var(--border)] p-4">
            <p className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("apiConnection")}</p>
            <p className="theme-text mt-2 break-all text-sm font-semibold">{apiUrl}</p>
          </div>
          <div className="theme-subtle rounded-xl border border-[var(--border)] p-4">
            <p className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("primaryColor")}</p>
            <p className="theme-text mt-2 font-semibold">#465FFF</p>
          </div>
          <div className="theme-subtle rounded-xl border border-[var(--border)] p-4">
            <p className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("session")}</p>
            <p className="theme-text mt-2 font-semibold">{profile ? t("connected") : t("notConnected")}</p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
