"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BriefcaseBusiness } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";
import { getActionQueue, getAlerts } from "@/lib/api-service";

type CaseRow = {
  id: string;
  title: string;
  status: string;
  owner: string;
  href: string;
};

function ownerForSeverity(severity: string | null | undefined) {
  if (severity === "high") return "PR";
  if (severity === "medium") return "Comms";
  return "Growth";
}

export default function CasesPage() {
  const t = useTranslations("Workspace.cases");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCases() {
      setIsLoading(true);
      const [alerts, actions] = await Promise.all([
        getAlerts({ limit: 10 }),
        getActionQueue({ limit: 10 }),
      ]);

      const alertCases = (alerts?.data ?? []).map((alert) => ({
        id: alert.id,
        title: alert.title,
        status: alert.status,
        owner: ownerForSeverity(alert.severity),
        href: `/alerts/${alert.id}`,
      }));
      const actionCases = (actions?.data ?? []).map((action) => ({
        id: action.id,
        title: action.title,
        status: t("actionPlanStatus"),
        owner: action.alert?.severity ? ownerForSeverity(action.alert.severity) : "Comms",
        href: "/action-plans",
      }));

      setCases([...alertCases, ...actionCases].slice(0, 12));
      setIsLoading(false);
    }

    void fetchCases();
  }, [t]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SurfaceCard className="overflow-hidden">
        <div className="theme-border border-b p-6"><h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><BriefcaseBusiness className="theme-accent" /> {t("queue")}</h2></div>
        {isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : cases.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="search" title={t("emptyTitle")} description={t("emptyDesc")} />
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {cases.map((item) => (
              <Link key={item.id} href={item.href} className="theme-row-hover grid gap-3 p-5 md:grid-cols-[1fr_140px_140px] md:items-center">
                <p className="theme-text font-semibold">{item.title}</p>
                <StatusBadge tone="slate">{item.status}</StatusBadge>
                <p className="theme-muted text-sm">{t("owner")}: {item.owner}</p>
              </Link>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
