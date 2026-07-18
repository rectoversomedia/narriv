"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getSubscriptionPlans, getMySubscription } from "@/lib/api-service";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Sparkles,
  Rocket,
  Brain,
  Zap,
  Crown,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

const planIcons = {
  pilot: Rocket,
  intelligence: Brain,
  decision: Zap,
  command: Crown,
};

const planColors = {
  pilot: {
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-600",
    button: "bg-slate-600 hover:bg-slate-700",
    icon: "bg-slate-500",
  },
  intelligence: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    button: "bg-[#465FFF] hover:bg-[#3b50d8]",
    icon: "bg-[#465FFF]",
  },
  decision: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    button: "bg-[#8B5CFF] hover:bg-[#764ee6]",
    icon: "bg-[#8B5CFF]",
  },
  command: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700",
    icon: "bg-amber-500",
  },
};

const planOrder = ["pilot", "intelligence", "decision", "command"];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  limit?: string;
  currentPlan?: string;
}

export function UpgradeModal({ isOpen, onClose, feature, limit, currentPlan }: UpgradeModalProps) {
  const t = useTranslations("Workspace.settings");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: plansData } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: getSubscriptionPlans,
    enabled: isOpen,
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: getMySubscription,
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && plansData?.plans?.length) {
      // Find the next plan after current
      const currentKey = currentSubscription?.plan?.key?.toLowerCase() || "pilot";
      const currentIndex = planOrder.indexOf(currentKey);
      const nextPlan = planOrder[currentIndex + 1] || planOrder[planOrder.length - 1];
      setSelectedPlan(nextPlan);
    }
  }, [isOpen, plansData, currentSubscription]);

  if (!isOpen) return null;

  const plans = plansData?.plans || [];
  const currentKey = currentSubscription?.plan?.key?.toLowerCase() || "pilot";
  const currentIndex = planOrder.indexOf(currentKey);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {feature ? `Unlock ${feature}` : limit ? `Upgrade for More ${limit}` : "Upgrade Your Plan"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {feature
                ? `This feature requires a higher plan. Choose a plan that includes ${feature}.`
                : limit
                ? `You've reached your ${limit} limit. Upgrade to unlock more.`
                : "Get more features and higher limits with our premium plans."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const planKey = plan.key?.toLowerCase() || "pilot";
            const planIndex = planOrder.indexOf(planKey);
            const colors = planColors[planKey as keyof typeof planColors] || planColors.pilot;
            const Icon = planIcons[planKey as keyof typeof planIcons] || Rocket;
            const isCurrentPlan = planKey === currentKey;
            const isUpgraded = planIndex > currentIndex;
            const isSelected = selectedPlan === planKey;

            return (
              <div
                key={plan.key}
                className={cn(
                  "relative rounded-xl border-2 p-4 transition-all cursor-pointer",
                  colors.border,
                  isCurrentPlan && "ring-2 ring-offset-2 ring-[#465FFF]",
                  isSelected && !isCurrentPlan && "ring-2 ring-offset-2 ring-[#465FFF]",
                  !isCurrentPlan && "hover:shadow-lg hover:scale-[1.02]"
                )}
                onClick={() => !isCurrentPlan && setSelectedPlan(planKey)}
              >
                {/* Current Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#465FFF] px-2.5 py-0.5 text-[10px] font-bold text-white">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colors.icon)}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className={cn("text-sm font-black", colors.text)}>
                      {plan.name}
                    </h3>
                    <p className="text-[10px] text-slate-500">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-black text-slate-900">
                    {formatPrice(plan.priceIdr)}
                  </span>
                  <span className="text-xs text-slate-500">/month</span>
                </div>

                {/* Limits */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Members</span>
                    <span className="font-semibold text-slate-700">
                      {plan.maxMembers === -1 ? "∞" : plan.maxMembers}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Topics</span>
                    <span className="font-semibold text-slate-700">
                      {plan.maxTopics === -1 ? "∞" : plan.maxTopics}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Signals/mo</span>
                    <span className="font-semibold text-slate-700">
                      {plan.maxSignalsPerMonth === -1 ? "∞" : `${(plan.maxSignalsPerMonth / 1000)}K`}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1 mb-4">
                  {plan.features?.slice(0, 3).map((feat: string) => (
                    <div key={feat} className="flex items-center gap-1.5">
                      <Check size={12} className="text-emerald-500" />
                      <span className="text-[10px] text-slate-600 truncate">{feat.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                  {(plan.features?.length || 0) > 3 && (
                    <div className="flex items-center gap-1.5">
                      <Check size={12} className="text-slate-300" />
                      <span className="text-[10px] text-slate-400">
                        +{(plan.features?.length || 0) - 3} more
                      </span>
                    </div>
                  )}
                </div>

                {/* Select Indicator */}
                {isCurrentPlan ? (
                  <div className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold", colors.bg, colors.text)}>
                    <Lock size={12} />
                    Current
                  </div>
                ) : isSelected ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#465FFF] py-2 text-xs font-bold text-white">
                    <Check size={12} />
                    Selected
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:border-slate-300">
                    Select
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            Need help choosing?{" "}
            <Link href="/pricing" className="text-[#465FFF] hover:underline">
              Compare all plans
            </Link>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Maybe Later
            </button>>
            <Link
              href={`/pricing?plan=${selectedPlan}${feature ? `&feature=${feature}` : ""}${limit ? `&limit=${limit}` : ""}`}
              className="flex items-center gap-2 rounded-lg bg-[#465FFF] px-4 py-2 text-sm font-bold text-white shadow-[0_4px_12px_rgba(70,95,255,0.3)] transition hover:bg-[#3b50d8]"
            >
              {currentIndex < planOrder.indexOf(selectedPlan || "command") ? "Upgrade Now" : "Choose Plan"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
