"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, BellRing, CheckCircle2 } from "lucide-react";
import { predictiveAlerts } from "@/lib/mock-data";
import { ProgressBar, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("AlertDetail");
  const alert = predictiveAlerts.find((item) => item.id === params.id) ?? predictiveAlerts[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/alerts" className="theme-muted inline-flex items-center gap-2 text-sm font-semibold transition hover:text-[#465FFF]">
        <ArrowLeft size={16} /> {t("backToAlerts")}
      </Link>
      <SurfaceCard className="p-6 md:p-8">
        <div className="flex flex-wrap gap-2"><StatusBadge tone="amber">{alert.severity}</StatusBadge><StatusBadge tone="slate">{alert.window} {t("responseWindow")}</StatusBadge></div>
        <h1 className="theme-text mt-5 text-3xl font-semibold tracking-tight">{alert.title}</h1>
        <p className="theme-muted mt-3 text-sm leading-6">{t("demoDetail")}</p>
        <div className="mt-6"><ProgressBar value={alert.probability} tone="amber" /></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {alert.drivers.map((driver) => <div key={driver} className="theme-subtle theme-soft rounded-2xl border border-[var(--border)] p-4 text-sm"><BellRing className="mb-3 text-[#B54708]" size={18} />{driver}</div>)}
        </div>
        <div className="theme-soft mt-8 rounded-2xl border border-[#12B76A]/30 bg-[#12B76A]/10 p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-[#027A48]"><CheckCircle2 size={16} /> {t("recommendedStep")}</p>
          <p className="mt-2">{t("routeTo", { owner: alert.owner })}</p>
        </div>
      </SurfaceCard>
    </div>
  );
}
