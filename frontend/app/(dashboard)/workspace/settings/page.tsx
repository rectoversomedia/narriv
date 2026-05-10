"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SectionHeader, SurfaceCard } from "@/components/ui/demo-primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCurrentUser, type CurrentUserResponse } from "@/lib/api-service";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SettingsPage() {
  const t = useTranslations("Workspace.settings");
  const storedUser = useAuthStore((state) => state.user);
  const theme = useUiStore((state) => state.theme);
  const language = useUiStore((state) => state.language);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const toggleLanguage = useUiStore((state) => state.toggleLanguage);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      setIsLoading(true);
      setUser(await getCurrentUser());
      setIsLoading(false);
    }

    void fetchUser();
  }, []);

  const profile = user ?? (storedUser ? { id: "-", name: storedUser.name, email: storedUser.email, createdAt: "" } : null);

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
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="theme-subtle rounded-xl border border-[var(--border)] p-4">
                <p className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("workspace")}</p>
                <p className="theme-text mt-2 font-semibold">{storedUser?.workspace || t("defaultWorkspace")}</p>
              </div>
              <div className="theme-subtle rounded-xl border border-[var(--border)] p-4">
                <p className="theme-muted text-xs font-semibold uppercase tracking-wider">{t("member")}</p>
                <p className="theme-text mt-2 font-semibold">{profile?.name || t("unknown")}</p>
                <p className="theme-muted mt-1 text-sm">{profile?.email || "-"}</p>
              </div>
            </div>
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
