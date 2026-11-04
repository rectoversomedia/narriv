/** Subscription plans and usage. Re-exported from @/lib/api-service. */

import { apiClient } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type PlanKey = "pilot" | "intelligence" | "decision" | "command";

export interface PlanLimits {
  maxMembers: number;
  maxTopics: number;
  maxSignalsPerMonth: number;
  maxAlertsPerMonth: number;
  maxReportsPerMonth: number;
  maxAiAnalysesPerMonth: number;
  dataRetentionDays: number;
}

export interface PlanFeature {
  key: string;
  enabled: boolean;
}

export interface SubscriptionPlan {
  key: PlanKey;
  name: string;
  tagline: string;
  priceIdr: number;
  maxMembers: number;
  maxTopics: number;
  maxSignalsPerMonth: number;
  maxAlertsPerMonth: number;
  maxReportsPerMonth: number;
  maxAiAnalysesPerMonth: number;
  dataRetentionDays: number;
  features: string[];
}

export interface CurrentSubscription {
  plan: {
    key: PlanKey;
    name: string;
    tagline: string;
    priceIdr: number;
    status: string;
  };
  usage: {
    membersUsed: number;
    membersLimit: number;
    topicsUsed: number;
    topicsLimit: number;
    signalsUsed: number;
    signalsLimit: number;
    alertsUsed: number;
    alertsLimit: number;
    reportsUsed: number;
    reportsLimit: number;
  };
  expiresAt: string | null;
  trialEndsAt: string | null;
}

export async function getSubscriptionPlans(): Promise<{ plans: SubscriptionPlan[]; featuredPlan: PlanKey } | null> {
  try {
    return await apiClient<{ plans: SubscriptionPlan[]; featuredPlan: PlanKey }>("/api/subscriptions/plans");
  } catch {
    return null;
  }
}

export async function getMySubscription(): Promise<CurrentSubscription | null> {
  try {
    return await apiClient<CurrentSubscription>("/api/subscriptions/my-plan");
  } catch {
    return null;
  }
}

export async function getSubscriptionLimits(): Promise<{ limits: PlanLimits } | null> {
  try {
    return await apiClient<{ limits: PlanLimits }>("/api/subscriptions/limits");
  } catch {
    return null;
  }
}

export async function getSubscriptionFeatures(): Promise<{ features: PlanFeature[] } | null> {
  try {
    return await apiClient<{ features: PlanFeature[] }>("/api/subscriptions/features");
  } catch {
    return null;
  }
}

export async function checkFeature(featureKey: string): Promise<{
  featureKey: string;
  enabled: boolean;
  upgradeRequired: boolean;
  suggestedPlan: PlanKey | null;
} | null> {
  try {
    return await apiClient<{
      featureKey: string;
      enabled: boolean;
      upgradeRequired: boolean;
      suggestedPlan: PlanKey | null;
    }>("/api/subscriptions/check-feature", {
      method: "POST",
      body: JSON.stringify({ featureKey }),
    });
  } catch {
    return null;
  }
}

export async function checkLimit(limitKey: string, requestedValue: number): Promise<{
  limitKey: string;
  hasCapacity: boolean;
  currentUsage: number;
  limit: number | "unlimited";
  upgradeRequired: boolean;
  suggestedPlan: PlanKey | null;
} | null> {
  try {
    return await apiClient<{
      limitKey: string;
      hasCapacity: boolean;
      currentUsage: number;
      limit: number | "unlimited";
      upgradeRequired: boolean;
      suggestedPlan: PlanKey | null;
    }>("/api/subscriptions/check-limit", {
      method: "POST",
      body: JSON.stringify({ limitKey, requestedValue }),
    });
  } catch {
    return null;
  }
}
