"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Activity, CheckCircle2 } from "lucide-react";
import { SectionHeader, SurfaceCard } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getActionQueue, getAlerts, getReports, getSources, type SourceRecord } from "@/lib/api-service";

function normalizeSources(data: unknown): SourceRecord[] {
  const list = Array.isArray(data) ? data : (data as { sources?: unknown[] } | null)?.sources;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is SourceRecord => Boolean(item && typeof item === "object" && "id" in item && "name" in item));
}

export default function ActivityPage() {
  const t = useTranslations("Workspace.activity");
  const [items, setItems] = useState<{ label: string; href: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      setIsLoading(true);
      const [alerts, actions, reports, sources] = await Promise.all([
        getAlerts({ limit: 3 }),
        getActionQueue({ limit: 3 }),
        getReports(),
        getSources(),
      ]);

      const sourceItems = normalizeSources(sources).slice(0, 2).map((source) => ({
        label: t("sourceActivity", { name: source.name }),
        href: "/workspace/sources",
      }));
      const alertItems = (alerts?.data ?? []).slice(0, 2).map((alert) => ({
        label: t("alertActivity", { title: alert.title }),
        href: `/alerts/${alert.id}`,
      }));
      const actionItems = (actions?.data ?? []).slice(0, 2).map((action) => ({
        label: t("actionActivity", { title: action.title }),
        href: "/action-plans",
      }));
      const reportItems = (reports?.reports ?? []).slice(0, 2).map((report) => ({
        label: t("reportActivity", { title: report.title }),
        href: "/reports",
      }));

      setItems([...actionItems, ...alertItems, ...sourceItems, ...reportItems].slice(0, 8));
      setIsLoading(false);
    }

    void fetchActivity();
  }, [t]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SurfaceCard className="p-6">
        <h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><Activity className="theme-accent" /> {t("recentActivity")}</h2>
        {isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon="search" title={t("emptyTitle")} description={t("emptyDesc")} />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href} className="theme-panel theme-hover flex gap-3 rounded-xl border p-4 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#465FFF]" />
                <span className="theme-soft">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
