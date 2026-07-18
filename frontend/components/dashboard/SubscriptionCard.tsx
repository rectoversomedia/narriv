"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "@/lib/api-service";
import { cn } from "@/lib/utils";
import {
  Crown,
  Zap,
  Brain,
  Rocket,
  TrendingUp,
  Users,
  Hash,
  Activity,
  Bell,
  FileText,
  ArrowRight,
  Sparkles
} from "lucide-react";
import Link from "next/link";

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
  intelligence: "bg-[#465FFF]/5 border-[#465FFF]/20",
  decision: "bg-[#8B5CFF]/5 border-[#8B5CFF]/20",
  command: "bg-amber-50 border-amber-200",
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
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", color)}>
            <Icon size={14} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        </div>
        <span className={cn(
          "text-[11px] font-bold",
          isExceeded ? "text-red-600" : isWarning ? "text-amber-600" : "text-slate-500"
        )}>
          {isUnlimited ? (
            <span className="text-emerald-600">Unlimited</span>
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

export function SubscriptionCard({ onUpgradeClick }: SubscriptionCardProps) {
  const t = useTranslations("Workspace.settings");

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
      label: "Members",
      used: subscription.usage?.membersUsed || 0,
      limit: subscription.usage?.membersLimit || 1,
      icon: Users,
    },
    {
      label: "Topics",
      used: subscription.usage?.topicsUsed || 0,
      limit: subscription.usage?.topicsLimit || 5,
      icon: Hash,
    },
    {
      label: "Signals",
      used: subscription.usage?.signalsUsed || 0,
      limit: subscription.usage?.signalsLimit || 10000,
      icon: Activity,
    },
    {
      label: "Alerts",
      used: subscription.usage?.alertsUsed || 0,
      limit: subscription.usage?.alertsLimit || 100,
      icon: Bell,
    },
    {
      label: "Reports",
      used: subscription.usage?.reportsUsed || 0,
      limit: subscription.usage?.reportsLimit || 10,
      icon: FileText,
    },
  ];

  return (
    <div className={cn("rounded-xl border p-4", bgClass)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm",
            gradientClass
          )}>
            <PlanIcon size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-black text-slate-900">
                {subscription.plan?.name || planKey.toUpperCase()}
              </h3>
              {subscription.plan?.status === "active" && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                  Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              {subscription.plan?.tagline || "Your current plan"}
            </p>
          </div>
        </div>

        <Link
          href="/pricing"
          onClick={onUpgradeClick}
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
            "bg-gradient-to-r shadow-sm hover:shadow",
            gradientClass,
            "text-white hover:opacity-90"
          )}
        >
          <Sparkles size={12} />
          Upgrade
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Usage Bars */}
      <div className="space-y-3">
        {usageItems.map((item) => (
          <UsageBar
            key={item.label}
            label={item.label}
            used={item.used}
            limit={item.limit}
            icon={item.icon}
            color={gradientClass.split(" ")[1]}
          />
        ))}
      </div>

      {/* Trial/Billing Info */}
      {(subscription.trialEndsAt || subscription.expiresAt) && (
        <div className="mt-4 rounded-lg bg-white/60 p-2.5">
          <p className="text-[10px] font-semibold text-slate-500">
            {subscription.trialEndsAt ? (
              <>Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}</>
            ) : subscription.expiresAt ? (
              <>Renews: {new Date(subscription.expiresAt).toLocaleDateString()}</>
            ) : null}
          </p>
        </div>
      )}
    </div>
  );
}

export default SubscriptionCard;
