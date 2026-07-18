/**
 * Subscription routes for Narriv
 * Handles subscription management, plan limits, and feature checks
 *
 * IMPORTANT: All endpoints require authentication
 */

import express from "express";
import { logStructured } from "../../lib/logger.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { WorkspacePlan, PLAN_LIMITS } from "../../types/workspace.js";

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

/**
 * Helper: Get workspace subscription from database
 */
async function getWorkspaceSubscription(workspaceId) {
  const { data, error } = await supabaseAdmin
    .from("workspace_subscriptions")
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

/**
 * Helper: Get workspace plan limits
 */
function getPlanLimits(planKey) {
  const planKeyUpper = planKey.toUpperCase();
  const plan = Object.values(PLAN_LIMITS).find(p => p.plan.toUpperCase() === planKeyUpper);
  return plan || PLAN_LIMITS[WorkspacePlan.PILOT];
}

/**
 * Helper: Get workspace usage statistics
 */
async function getWorkspaceUsage(workspaceId) {
  const [membersCount, topicsCount, signalsCount, alertsCount, reportsCount] = await Promise.all([
    supabaseAdmin.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabaseAdmin.from("monitoring_keywords").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("is_active", true),
    supabaseAdmin.from("signals").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabaseAdmin.from("alerts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  return {
    membersUsed: membersCount.count || 0,
    topicsUsed: topicsCount.count || 0,
    signalsUsed: signalsCount.count || 0,
    alertsUsed: alertsCount.count || 0,
    reportsUsed: reportsCount.count || 0,
  };
}

/**
 * Helper: Get user's default workspace
 */
async function getUserWorkspace(userId) {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }
  return data.workspace_id;
}

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans (public, no workspace required)
 */
router.get("/plans", async (req, res) => {
  try {
    const plans = Object.values(PLAN_LIMITS).map((plan) => ({
      key: plan.plan,
      name: plan.name,
      tagline: plan.tagline,
      priceIdr: plan.priceIdr,
      maxMembers: plan.maxMembers,
      maxTopics: plan.maxTopics,
      maxSignalsPerMonth: plan.maxSignalsPerMonth,
      maxAlertsPerMonth: plan.maxAlertsPerMonth,
      maxReportsPerMonth: plan.maxReportsPerMonth,
      maxAiAnalysesPerMonth: plan.maxAiAnalysesPerMonth,
      dataRetentionDays: plan.dataRetentionDays,
      features: plan.features,
    }));

    res.json({
      plans,
      featuredPlan: "intelligence",
    });
  } catch (error) {
    logStructured("error", "get_plans_error", { error: error.message });
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

/**
 * GET /api/subscriptions/my-plan
 * Get current workspace subscription plan
 * Requires authentication - returns user's workspace subscription
 */
router.get("/my-plan", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's workspace
    const workspaceId = await getUserWorkspace(userId);
    if (!workspaceId) {
      return res.status(404).json({ error: "No workspace found for user" });
    }

    // Get subscription from database
    const subscription = await getWorkspaceSubscription(workspaceId);

    // Get plan limits
    const planKey = subscription?.plan?.plan_key || WorkspacePlan.PILOT;
    const planLimits = getPlanLimits(planKey);

    // Get usage statistics
    const usage = await getWorkspaceUsage(workspaceId);

    res.json({
      plan: {
        key: planLimits.plan,
        name: planLimits.name,
        tagline: planLimits.tagline,
        priceIdr: planLimits.priceIdr,
        status: subscription?.status || "active",
      },
      usage: {
        membersUsed: usage.membersUsed,
        membersLimit: planLimits.maxMembers,
        topicsUsed: usage.topicsUsed,
        topicsLimit: planLimits.maxTopics,
        signalsUsed: usage.signalsUsed,
        signalsLimit: planLimits.maxSignalsPerMonth,
        alertsUsed: usage.alertsUsed,
        alertsLimit: planLimits.maxAlertsPerMonth,
        reportsUsed: usage.reportsUsed,
        reportsLimit: planLimits.maxReportsPerMonth,
      },
      expiresAt: subscription?.expires_at || null,
      trialEndsAt: subscription?.trial_ends_at || null,
    });
  } catch (error) {
    logStructured("error", "get_my_plan_error", {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

/**
 * GET /api/subscriptions/limits
 * Get plan limits for current workspace
 */
router.get("/limits", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's workspace
    const workspaceId = await getUserWorkspace(userId);
    if (!workspaceId) {
      return res.status(404).json({ error: "No workspace found for user" });
    }

    // Get subscription
    const subscription = await getWorkspaceSubscription(workspaceId);
    const planKey = subscription?.plan?.plan_key || WorkspacePlan.PILOT;
    const planLimits = getPlanLimits(planKey);

    res.json({
      limits: {
        maxMembers: planLimits.maxMembers,
        maxTopics: planLimits.maxTopics,
        maxSignalsPerMonth: planLimits.maxSignalsPerMonth,
        maxAlertsPerMonth: planLimits.maxAlertsPerMonth,
        maxReportsPerMonth: planLimits.maxReportsPerMonth,
        maxAiAnalysesPerMonth: planLimits.maxAiAnalysesPerMonth,
        dataRetentionDays: planLimits.dataRetentionDays,
      },
      plan: planLimits.plan,
    });
  } catch (error) {
    logStructured("error", "get_limits_error", {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({ error: "Failed to fetch limits" });
  }
});

/**
 * GET /api/subscriptions/features
 * Get enabled features for current workspace
 */
router.get("/features", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's workspace
    const workspaceId = await getUserWorkspace(userId);
    if (!workspaceId) {
      return res.status(404).json({ error: "No workspace found for user" });
    }

    // Get subscription
    const subscription = await getWorkspaceSubscription(workspaceId);
    const planKey = subscription?.plan?.plan_key || WorkspacePlan.PILOT;
    const planLimits = getPlanLimits(planKey);

    res.json({
      features: planLimits.features.map((feature) => ({
        key: feature,
        enabled: true,
      })),
      plan: planLimits.plan,
    });
  } catch (error) {
    logStructured("error", "get_features_error", {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

/**
 * POST /api/subscriptions/check-feature
 * Check if a feature is enabled for the workspace
 */
router.post("/check-feature", async (req, res) => {
  try {
    const { featureKey } = req.body;
    const userId = req.user.userId;

    if (!featureKey) {
      return res.status(400).json({ error: "featureKey is required" });
    }

    // Get user's workspace
    const workspaceId = await getUserWorkspace(userId);
    if (!workspaceId) {
      return res.status(404).json({ error: "No workspace found for user" });
    }

    // Get subscription
    const subscription = await getWorkspaceSubscription(workspaceId);
    const planKey = subscription?.plan?.plan_key || WorkspacePlan.PILOT;
    const planLimits = getPlanLimits(planKey);
    const hasFeature = planLimits.features.includes(featureKey);

    res.json({
      featureKey,
      enabled: hasFeature,
      upgradeRequired: !hasFeature,
      suggestedPlan: hasFeature ? null : "intelligence",
      currentPlan: planLimits.plan,
    });
  } catch (error) {
    logStructured("error", "check_feature_error", {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({ error: "Failed to check feature" });
  }
});

/**
 * POST /api/subscriptions/check-limit
 * Check if a limit has capacity
 */
router.post("/check-limit", async (req, res) => {
  try {
    const { limitKey, requestedValue } = req.body;
    const userId = req.user.userId;

    if (!limitKey || requestedValue === undefined) {
      return res.status(400).json({ error: "limitKey and requestedValue are required" });
    }

    // Get user's workspace
    const workspaceId = await getUserWorkspace(userId);
    if (!workspaceId) {
      return res.status(404).json({ error: "No workspace found for user" });
    }

    // Get subscription
    const subscription = await getWorkspaceSubscription(workspaceId);
    const planKey = subscription?.plan?.plan_key || WorkspacePlan.PILOT;
    const planLimits = getPlanLimits(planKey);

    // Map limitKey to plan limits
    const limitMapping = {
      members: "maxMembers",
      topics: "maxTopics",
      signalsPerMonth: "maxSignalsPerMonth",
      alertsPerMonth: "maxAlertsPerMonth",
      reportsPerMonth: "maxReportsPerMonth",
      aiAnalysesPerMonth: "maxAiAnalysesPerMonth",
    };

    const limitProperty = limitMapping[limitKey];
    if (!limitProperty) {
      return res.status(400).json({ error: "Invalid limitKey" });
    }

    const limitValue = planLimits[limitProperty];
    const usage = await getWorkspaceUsage(workspaceId);
    const currentUsage = usage[`${limitKey.replace(/([A-Z])/g, '_$1').toLowerCase()}Used`] || 0;

    // -1 means unlimited
    if (limitValue === -1) {
      return res.json({
        limitKey,
        hasCapacity: true,
        currentUsage: 0,
        limit: "unlimited",
        upgradeRequired: false,
      });
    }

    res.json({
      limitKey,
      hasCapacity: currentUsage + requestedValue <= limitValue,
      currentUsage,
      limit: limitValue,
      upgradeRequired: currentUsage + requestedValue > limitValue,
      suggestedPlan: currentUsage + requestedValue > limitValue ? "intelligence" : null,
      currentPlan: planLimits.plan,
    });
  } catch (error) {
    logStructured("error", "check_limit_error", {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({ error: "Failed to check limit" });
  }
});

/**
 * GET /api/subscriptions/usage
 * Get detailed usage statistics for current workspace
 */
router.get("/usage", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's workspace
    const workspaceId = await getUserWorkspace(userId);
    if (!workspaceId) {
      return res.status(404).json({ error: "No workspace found for user" });
    }

    // Get subscription and usage
    const subscription = await getWorkspaceSubscription(workspaceId);
    const planKey = subscription?.plan?.plan_key || WorkspacePlan.PILOT;
    const planLimits = getPlanLimits(planKey);
    const usage = await getWorkspaceUsage(workspaceId);

    res.json({
      workspaceId,
      plan: planLimits.plan,
      usage: {
        members: {
          used: usage.membersUsed,
          limit: planLimits.maxMembers,
          percentage: planLimits.maxMembers === -1 ? 0 : (usage.membersUsed / planLimits.maxMembers) * 100,
        },
        topics: {
          used: usage.topicsUsed,
          limit: planLimits.maxTopics,
          percentage: planLimits.maxTopics === -1 ? 0 : (usage.topicsUsed / planLimits.maxTopics) * 100,
        },
        signals: {
          used: usage.signalsUsed,
          limit: planLimits.maxSignalsPerMonth,
          percentage: planLimits.maxSignalsPerMonth === -1 ? 0 : (usage.signalsUsed / planLimits.maxSignalsPerMonth) * 100,
        },
        alerts: {
          used: usage.alertsUsed,
          limit: planLimits.maxAlertsPerMonth,
          percentage: planLimits.maxAlertsPerMonth === -1 ? 0 : (usage.alertsUsed / planLimits.maxAlertsPerMonth) * 100,
        },
        reports: {
          used: usage.reportsUsed,
          limit: planLimits.maxReportsPerMonth,
          percentage: planLimits.maxReportsPerMonth === -1 ? 0 : (usage.reportsUsed / planLimits.maxReportsPerMonth) * 100,
        },
      },
      expiresAt: subscription?.expires_at || null,
      trialEndsAt: subscription?.trial_ends_at || null,
    });
  } catch (error) {
    logStructured("error", "get_usage_error", {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;
