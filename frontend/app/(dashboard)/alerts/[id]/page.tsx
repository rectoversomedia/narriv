"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { createActionPlan, getAlertById, type Alert } from "@/lib/api-service";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("AlertDetail");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlert() {
      setIsLoading(true);
      setAlert(await getAlertById(params.id));
      setIsLoading(false);
    }

    fetchAlert();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/alerts" className="theme-muted inline-flex items-center gap-2 text-sm font-semibold transition hover:text-[#465FFF]">
          <ArrowLeft size={16} /> {t("backToAlerts")}
        </Link>
        <EmptyState icon="search" title={t("notFoundTitle")} description={t("notFoundDesc")} />
      </div>
    );
  }

  const detailItems = [alert.whatHappened, alert.whyItMatters, alert.whatToDo].filter(Boolean);

  const handleCreateAction = async () => {
    setActionError(null);
    setIsCreatingAction(true);
    const created = await createActionPlan({ strategyType: "crisis_response", alertId: alert.id });
    setIsCreatingAction(false);

    if (!created) {
      setActionError(t("createActionFailed"));
      return;
    }

    router.push("/action-plans");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/alerts" className="theme-muted inline-flex items-center gap-2 text-sm font-semibold transition hover:text-[#465FFF]">
        <ArrowLeft size={16} /> {t("backToAlerts")}
      </Link>
      <SurfaceCard className="p-6 md:p-8">
        <div className="flex flex-wrap gap-2"><StatusBadge tone="amber">{alert.severity ?? "medium"}</StatusBadge><StatusBadge tone="slate">{alert.status}</StatusBadge></div>
        <h1 className="theme-text mt-5 text-3xl font-semibold tracking-tight">{alert.title}</h1>
        <p className="theme-muted mt-3 text-sm leading-6">{alert.whyItMatters ?? alert.whatHappened ?? t("liveDetail")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {detailItems.map((item) => <div key={item} className="theme-subtle theme-soft rounded-2xl border border-[var(--border)] p-4 text-sm">{item}</div>)}
        </div>
        <div className="theme-soft mt-8 rounded-2xl border border-[#12B76A]/30 bg-[#12B76A]/10 p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-[#027A48]"><CheckCircle2 size={16} /> {t("recommendedStep")}</p>
          <p className="mt-2">{alert.whatToDo ?? t("routeTo")}</p>
          <button
            type="button"
            onClick={() => void handleCreateAction()}
            disabled={isCreatingAction}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#465FFF] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isCreatingAction ? t("creatingAction") : t("createAction")}
          </button>
          {actionError ? <p className="mt-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">{actionError}</p> : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
