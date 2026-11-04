"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "@/lib/api-service";
import { cn } from "@/lib/utils";
import { Crown, Zap, Brain, Rocket, Users, Hash, Activity, Bell, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { pickL, useL } from "@/lib/use-l";

const planIcons = {
  pilot: Rocket,
  intelligence: Brain,
  decision: Zap,
  command: Crown,
};

const planColors = {
  pilot: "from-slate-500 to-slate-600",
  intelligence: "from-[#465FFF] to-[#3b50d8]",
  decision: "from-[#8B5CFF] to-[#764ee6]",
  command: "from-amber-500 to-amber-600",
};

const planBgColors = {
  pilot: "bg-slate-50 border-slate-200",
  intelligence: "bg-[#465FFF]/5 border-transparent",
  decision: "bg-[#8B5CFF]/5 border-transparent",
  command: "bg-amber-50 border-transparent",
};

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  icon: React.ElementType;
  color: string;
}

function UsageBar({ label, used, limit, icon: Icon, color }: UsageBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 80 && !isUnlimited;
  const isExceeded = percentage >= 100 && !isUnlimited;

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        </div>
        <span className={cn(
          "text-[11px] font-bold",
          isExceeded ? "text-red-700" : isWarning ? "text-amber-700" : "text-[#5A6478]"
        )}>
          {isUnlimited ? (
            <span className="text-emerald-700">{pickL("Unlimited", "Tanpa batas")}</span>
          ) : (
            <>{formatNumber(used)} / {formatNumber(limit)}</>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isExceeded ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface SubscriptionCardProps {
  onUpgradeClick?: () => void;
}

const PLAN_TAGLINE: Record<string, [string, string]> = {
  pilot: ["Validate the value.", "Buktikan nilainya."],
  intelligence: ["Understand what matters.", "Pahami yang penting."],
  decision: ["Turn intelligence into action.", "Ubah intelijen jadi tindakan."],
  command: ["Operationalize intelligence.", "Jadikan intelijen bagian dari operasional."],
};

export function SubscriptionCard({ onUpgradeClick }: SubscriptionCardProps) {
  const t = useTranslations("Workspace.settings");
  const L = useL();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: getMySubscription,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const planKey = subscription?.plan?.key?.toLowerCase() || "pilot";
  const PlanIcon = planIcons[planKey as keyof typeof planIcons] || Rocket;
  const gradientClass = planColors[planKey as keyof typeof planColors] || planColors.pilot;
  const bgClass = planBgColors[planKey as keyof typeof planBgColors] || planBgColors.pilot;

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border p-4", bgClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return null;
  }

  const usageItems = [
    {
      label: L("Members", "Anggota"),
      used: subscription.usage?.membersUsed || 0,
      limit: subscription.usage?.membersLimit || 1,
      icon: Users,
    },
    {
      label: L("Topics", "Topik"),
      used: subscription.usage?.topicsUsed || 0,
      limit: subscription.usage?.topicsLimit || 5,
      icon: Hash,
    },
    {
      label: L("Signals", "Sinyal"),
      used: subscription.usage?.signalsUsed || 0,
      limit: subscription.usage?.signalsLimit || 10000,
      icon: Activity,
    },
    {
      label: L("Alerts", "Peringatan"),
      used: subscription.usage?.alertsUsed || 0,
      limit: subscription.usage?.alertsLimit || 100,
      icon: Bell,
    },
    {
      label: L("Reports", "Laporan"),
      used: subscription.usage?.reportsUsed || 0,
      limit: subscription.usage?.reportsLimit || 10,
      icon: FileText,
    },
  ];

  void PlanIcon; void gradientClass; void bgClass;
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

  // The plan as a header strip and one tile per limit: used / limit, a thick bar, and how much is left.
  return (
    <section className="rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#8A93AD]">{L("Your plan", "Paket Anda")}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="text-[20px] font-black text-[#101334]">{subscription.plan?.name || planKey.toUpperCase()}</h3>
            {subscription.plan?.status === "active" ? <span className="rounded-full bg-[#12A66A] px-2 py-0.5 text-[10px] font-black text-white">{L("Active", "Aktif")}</span> : null}
          </div>
          <p className="text-[12px] font-bold text-[#5A6478]">
            {PLAN_TAGLINE[planKey] ? L(...PLAN_TAGLINE[planKey]) : subscription.plan?.tagline || L("Your current plan", "Paket Anda saat ini")}
            {subscription.trialEndsAt ? ` · ${L("trial ends", "trial berakhir")} ${new Date(subscription.trialEndsAt).toLocaleDateString()}` : subscription.expiresAt ? ` · ${L("renews", "diperpanjang")} ${new Date(subscription.expiresAt).toLocaleDateString()}` : ""}
          </p>
        </div>
        <Link href="/pricing" onClick={onUpgradeClick} className="flex h-10 items-center gap-1.5 rounded-[10px] bg-[#465FFF] px-4 text-[13px] font-black text-white shadow-sm transition hover:bg-[#3B52F5]">
          {L("Upgrade", "Tingkatkan")} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {usageItems.map((item) => {
          const pct = Math.min(100, Math.round((item.used / Math.max(1, item.limit)) * 100));
          const color = pct >= 90 ? "#E5484D" : pct >= 70 ? "#F59E0B" : "#465FFF";
          return (
            <div key={item.label} className="rounded-[12px] bg-[#F7F8FC] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.06em] text-[#5A6478]">{item.label}</p>
              <p className="mt-1 text-[20px] font-black leading-none text-[#101334]">{fmt(item.used)}<span className="text-[13px] font-bold text-[#8A93AD]"> / {fmt(item.limit)}</span></p>
              <div className="mt-2 h-2 rounded-full bg-[#E6EAF2]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: color }} /></div>
              <p className="mt-1.5 text-[11px] font-bold" style={{ color: pct >= 90 ? "#C81E1E" : "#5A6478" }}>{pct >= 90 ? L("almost full", "hampir penuh") : L(`${pct}% used`, `${pct}% terpakai`)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SubscriptionCard;
