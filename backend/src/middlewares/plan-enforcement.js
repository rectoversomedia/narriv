/**
 * Plan Enforcement Middleware
 *
 * Enforces subscription plan limits and features:
 * - Checks feature availability before allowing access
 * - Validates usage against plan limits
 * - Returns upgrade prompts when limits reached
 */

import { logStructured } from "../lib/logger.js";
import { WorkspacePlan, PLAN_LIMITS } from "../types/workspace.js";

// Feature to plan mapping
const FEATURE_PLANS: Record<string, WorkspacePlan> = {
  // PILOT features
  'signals_monitoring': WorkspacePlan.PILOT,
  'alerts': WorkspacePlan.PILOT,
  'email_notifications': WorkspacePlan.PILOT,

  // INTELLIGENCE features
  'intelligence': WorkspacePlan.INTELLIGENCE,
  'ai_visibility': WorkspacePlan.INTELLIGENCE,
  'whatsapp_notifications': WorkspacePlan.INTELLIGENCE,
  'monthly_report': WorkspacePlan.INTELLIGENCE,

  // DECISION features
  'action_center': WorkspacePlan.DECISION,
  'escalation_workflow': WorkspacePlan.DECISION,
  'slack_integration': WorkspacePlan.DECISION,
  'teams_integration': WorkspacePlan.DECISION,
  'weekly_report': WorkspacePlan.DECISION,

  // COMMAND features
  'custom_ai_models': WorkspacePlan.COMMAND,
  'api_access': WorkspacePlan.COMMAND,
  'dedicated_infrastructure': WorkspacePlan.COMMAND,
  'enterprise_sla': WorkspacePlan.COMMAND,
  'dedicated_success_manager': WorkspacePlan.COMMAND,
  'quarterly_review': WorkspacePlan.COMMAND,
};

// Order of plans for comparison
const PLAN_ORDER: WorkspacePlan[] = [
  WorkspacePlan.PILOT,
  WorkspacePlan.INTELLIGENCE,
  WorkspacePlan.DECISION,
  WorkspacePlan.COMMAND,
];

/**
 * Get plan tier level (0 = PILOT, 3 = COMMAND)
 */
function getPlanLevel(plan: WorkspacePlan): number {
  return PLAN_ORDER.indexOf(plan);
}

/**
 * Check if a plan has access to a feature
 */
export function planHasFeature(plan: WorkspacePlan, featureKey: string): boolean {
  const requiredPlan = FEATURE_PLANS[featureKey];
  if (!requiredPlan) {
    // Feature not in map - assume it's available to all
    return true;
  }
  return getPlanLevel(plan) >= getPlanLevel(requiredPlan);
}

/**
 * Get the minimum plan required for a feature
 */
export function getFeatureRequiredPlan(featureKey: string): WorkspacePlan | null {
  return FEATURE_PLANS[featureKey] || null;
}

/**
 * Check if current usage exceeds limit
 */
export function checkLimit(
  currentUsage: number,
  limit: number,
  requestedAddition: number = 1
): { allowed: boolean; current: number; limit: number; remaining: number } {
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current: currentUsage, limit: -1, remaining: -1 };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const allowed = (currentUsage + requestedAddition) <= limit;

  return { allowed, current: currentUsage, limit, remaining };
}

/**
 * Get suggested upgrade plan for a feature
 */
export function getSuggestedPlanForFeature(featureKey: string): WorkspacePlan | null {
  const requiredPlan = getFeatureRequiredPlan(featureKey);
  if (!requiredPlan) return null;

  // Return the next plan up from current
  const requiredLevel = getPlanLevel(requiredPlan);
  if (requiredLevel < PLAN_ORDER.length - 1) {
    return PLAN_ORDER[requiredLevel + 1];
  }
  return WorkspacePlan.COMMAND;
}

/**
 * Get suggested upgrade plan for a limit
 */
export function getSuggestedPlanForLimit(limitKey: string, requestedValue: number): WorkspacePlan | null {
  for (const plan of PLAN_ORDER) {
    const planLimits = PLAN_LIMITS[plan];
    const limitValue = planLimits[`max${limitKey.charAt(0).toUpperCase() + limitKey.slice(1)}` as keyof typeof planLimits];

    if (limitValue === -1 || limitValue >= requestedValue) {
      return plan;
    }
  }
  return WorkspacePlan.COMMAND;
}

/**
 * Create middleware to enforce feature access
 */
export function requireFeature(featureKey: string) {
  return (req: any, res: any, next: any) => {
    // For now, default to PILOT
    // In production, get from workspace subscription
    const workspacePlan = req.user?.workspacePlan || WorkspacePlan.PILOT;

    if (!planHasFeature(workspacePlan, featureKey)) {
      const suggestedPlan = getSuggestedPlanForFeature(featureKey);

      logStructured("warn", "feature_access_denied", {
        userId: req.user?.id,
        workspaceId: req.user?.workspaceId,
        feature: featureKey,
        currentPlan: workspacePlan,
        suggestedPlan,
      });

      return res.status(403).json({
        error: "Feature not available on your plan",
        code: "FEATURE_NOT_AVAILABLE",
        feature: featureKey,
        currentPlan: workspacePlan,
        requiredPlan: getFeatureRequiredPlan(featureKey),
        upgradeTo: suggestedPlan,
        upgradeUrl: `/pricing?feature=${featureKey}`,
        message: `This feature requires a ${getFeatureRequiredPlan(featureKey)} plan or higher.`,
      });
    }

    next();
  };
}

/**
 * Create middleware to enforce limit
 */
export function requireLimit(limitKey: string, getCurrentUsage: (req: any) => Promise<number> | number) {
  return async (req: any, res: any, next: any) => {
    try {
      // For now, default to PILOT
      const workspacePlan = req.user?.workspacePlan || WorkspacePlan.PILOT;
      const planLimits = PLAN_LIMITS[workspacePlan];

      const limitValue = planLimits[`max${limitKey.charAt(0).toUpperCase() + limitKey.slice(1)}` as keyof typeof planLimits];

      // -1 means unlimited
      if (limitValue === -1) {
        return next();
      }

      const currentUsage = await getCurrentUsage(req);
      const result = checkLimit(currentUsage, limitValue);

      if (!result.allowed) {
        const suggestedPlan = getSuggestedPlanForLimit(limitKey, currentUsage + 1);

        logStructured("warn", "limit_exceeded", {
          userId: req.user?.id,
          workspaceId: req.user?.workspaceId,
          limit: limitKey,
          currentUsage,
          limitValue,
          currentPlan: workspacePlan,
        });

        return res.status(429).json({
          error: "Limit exceeded",
          code: "LIMIT_EXCEEDED",
          limit: limitKey,
          currentUsage: result.current,
          limit: result.limit,
          remaining: 0,
          upgradeTo: suggestedPlan,
          upgradeUrl: `/pricing?limit=${limitKey}`,
          message: `You have reached your ${limitKey} limit on the ${workspacePlan} plan.`,
        });
      }

      // Add usage info to request for tracking
      req.planUsage = req.planUsage || {};
      req.planUsage[limitKey] = {
        current: currentUsage,
        limit: limitValue,
        remaining: result.remaining,
      };

      next();
    } catch (error) {
      logStructured("error", "limit_check_error", {
        error: error.message,
        limitKey,
      });
      // Fail open - allow request if limit check fails
      next();
    }
  };
}

/**
 * Middleware to add plan info to response headers
 */
export function addPlanHeaders() {
  return (req: any, res: any, next: any) => {
    const workspacePlan = req.user?.workspacePlan || WorkspacePlan.PILOT;
    const planLimits = PLAN_LIMITS[workspacePlan];

    res.setHeader("X-Workspace-Plan", workspacePlan);
    res.setHeader("X-Plan-Max-Topics", planLimits.maxTopics.toString());
    res.setHeader("X-Plan-Max-Users", planLimits.maxMembers.toString());

    next();
  };
}

/**
 * Preset feature enforcement middlewares
 */
export const FEATURE_MIDDLEWARES = {
  requireIntelligence: requireFeature("intelligence"),
  requireAiVisibility: requireFeature("ai_visibility"),
  requireActionCenter: requireFeature("action_center"),
  requireEscalationWorkflow: requireFeature("escalation_workflow"),
  requireSlackIntegration: requireFeature("slack_integration"),
  requireTeamsIntegration: requireFeature("teams_integration"),
  requireCustomAiModels: requireFeature("custom_ai_models"),
  requireApiAccess: requireFeature("api_access"),
  requireEnterpriseSla: requireFeature("enterprise_sla"),
};
