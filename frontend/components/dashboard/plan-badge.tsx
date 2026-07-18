"use client";

import { useQuery } from "@tanstack/react-query";
import { getMySubscription, type PlanKey } from "@/lib/api-service";
import { Crown, Zap, Brain, Target } from "lucide-react";

const PLAN_CONFIG: Record<PlanKey, {
  name: string;
  icon: typeof Crown;
  color: string;
  bgColor: string;
}> = {
  pilot: {
    name: "PILOT",
    icon: Zap,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  intelligence: {
    name: "INTELLIGENCE",
    icon: Brain,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  decision: {
    name: "DECISION",
    icon: Target,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  command: {
    name: "COMMAND",
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
};

export function PlanBadge() {
  const { data: subscription } = useQuery({
    queryKey: ["subscription", "my-plan"],
    queryFn: getMySubscription,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  if (!subscription) {
    return null;
  }

  const planKey = subscription.plan.key as PlanKey;
  const config = PLAN_CONFIG[planKey] || PLAN_CONFIG.pilot;
  const PlanIcon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${config.color} ${config.bgColor}`}
      title={`${subscription.plan.name} Plan`}
    >
      <PlanIcon size={12} />
      <span>{config.name}</span>
    </div>
  );
}

export function PlanUsageBar() {
  const { data: subscription } = useQuery({
    queryKey: ["subscription", "my-plan"],
    queryFn: getMySubscription,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!subscription) {
    return null;
  }

  const { usage, plan } = subscription;
  const planKey = plan.key as PlanKey;

  // Calculate usage percentages
  const topicsPercent = planKey === "command" || planKey === "decision"
    ? 0
    : (usage.topicsUsed / usage.topicsLimit) * 100;

  const usersPercent = (usage.membersUsed / usage.membersLimit) * 100;

  const getBarColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 75) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-3">
      {/* Topics Usage */}
      {planKey !== "command" && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Intelligence Topics</span>
            <span className="text-slate-700 font-medium">
              {usage.topicsUsed} / {usage.topicsLimit === -1 ? "∞" : usage.topicsLimit}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(topicsPercent)} transition-all`}
              style={{ width: `${Math.min(topicsPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Users Usage */}
      {planKey !== "command" && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Team Members</span>
            <span className="text-slate-700 font-medium">
              {usage.membersUsed} / {usage.membersLimit === -1 ? "∞" : usage.membersLimit}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(usersPercent)} transition-all`}
              style={{ width: `${Math.min(usersPercent, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PlanUpgradePrompt({
  feature,
  limit,
}: {
  feature?: string;
  limit?: string;
}) {
  const { data: subscription } = useQuery({
    queryKey: ["subscription", "my-plan"],
    queryFn: getMySubscription,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!subscription) {
    return null;
  }

  const planKey = subscription.plan.key as PlanKey;

  // Determine suggested upgrade
  let suggestedPlan: PlanKey | null = null;
  if (feature) {
    if (planKey === "pilot") suggestedPlan = "intelligence";
    else if (planKey === "intelligence") suggestedPlan = "decision";
    else if (planKey === "decision") suggestedPlan = "command";
  }

  if (!suggestedPlan || suggestedPlan === "command") {
    return null; // Already at max
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm text-amber-800">
        {feature && `Feature "${feature}" requires a higher plan.`}
        {limit && `You've reached your ${limit} limit.`}
      </p>
      <a
        href={`/pricing?upgrade=${suggestedPlan}`}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900"
      >
        Upgrade to {PLAN_CONFIG[suggestedPlan].name}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}

export default PlanBadge;
