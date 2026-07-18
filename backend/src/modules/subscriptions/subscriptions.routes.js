/**
 * Subscription routes for Narriv
 * Handles subscription management, plan limits, and feature checks
 */

import express from "express";
import { logStructured } from "../../lib/logger.js";
import { validateRequest } from "../../lib/validation.js";
import { z } from "zod";
import { WorkspacePlan, PLAN_LIMITS } from "../../types/workspace.js";

const router = express.Router();

// Validation schemas
const getPlanSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

const upgradeSchema = z.object({
  workspaceId: z.string().uuid(),
  planKey: z.enum(["pilot", "intelligence", "decision", "command"]),
});

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
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
 */
router.get("/my-plan", async (req, res) => {
  try {
    // For now, return PILOT as default
    // In production, this would check the database
    const defaultPlan = PLAN_LIMITS[WorkspacePlan.PILOT];

    res.json({
      plan: {
        key: defaultPlan.plan,
        name: defaultPlan.name,
        tagline: defaultPlan.tagline,
        priceIdr: defaultPlan.priceIdr,
        status: "active",
      },
      usage: {
        topicsUsed: 0,
        topicsLimit: defaultPlan.maxTopics,
        usersUsed: 1,
        usersLimit: defaultPlan.maxMembers,
      },
      expiresAt: null,
    });
  } catch (error) {
    logStructured("error", "get_my_plan_error", { error: error.message });
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

/**
 * GET /api/subscriptions/limits
 * Get plan limits for a workspace
 */
router.get("/limits", async (req, res) => {
  try {
    // For now, return PILOT limits
    // In production, this would check the database
    const defaultPlan = PLAN_LIMITS[WorkspacePlan.PILOT];

    res.json({
      limits: {
        maxMembers: defaultPlan.maxMembers,
        maxTopics: defaultPlan.maxTopics,
        maxSignalsPerMonth: defaultPlan.maxSignalsPerMonth,
        maxAlertsPerMonth: defaultPlan.maxAlertsPerMonth,
        maxReportsPerMonth: defaultPlan.maxReportsPerMonth,
        maxAiAnalysesPerMonth: defaultPlan.maxAiAnalysesPerMonth,
        dataRetentionDays: defaultPlan.dataRetentionDays,
      },
    });
  } catch (error) {
    logStructured("error", "get_limits_error", { error: error.message });
    res.status(500).json({ error: "Failed to fetch limits" });
  }
});

/**
 * GET /api/subscriptions/features
 * Get enabled features for current workspace
 */
router.get("/features", async (req, res) => {
  try {
    // For now, return PILOT features
    const defaultPlan = PLAN_LIMITS[WorkspacePlan.PILOT];

    res.json({
      features: defaultPlan.features.map((feature) => ({
        key: feature,
        enabled: true,
      })),
    });
  } catch (error) {
    logStructured("error", "get_features_error", { error: error.message });
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

    if (!featureKey) {
      return res.status(400).json({ error: "featureKey is required" });
    }

    // For now, return based on PILOT plan
    // In production, this would check the database
    const defaultPlan = PLAN_LIMITS[WorkspacePlan.PILOT];
    const hasFeature = defaultPlan.features.includes(featureKey);

    res.json({
      featureKey,
      enabled: hasFeature,
      upgradeRequired: !hasFeature,
      suggestedPlan: hasFeature ? null : "intelligence",
    });
  } catch (error) {
    logStructured("error", "check_feature_error", { error: error.message });
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

    if (!limitKey || requestedValue === undefined) {
      return res.status(400).json({ error: "limitKey and requestedValue are required" });
    }

    // For now, return based on PILOT plan
    const defaultPlan = PLAN_LIMITS[WorkspacePlan.PILOT];
    const limitValue = defaultPlan[`max${limitKey.charAt(0).toUpperCase() + limitKey.slice(1)}`];

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
      hasCapacity: requestedValue <= limitValue,
      currentUsage: 0,
      limit: limitValue,
      upgradeRequired: requestedValue > limitValue,
      suggestedPlan: requestedValue > limitValue ? "intelligence" : null,
    });
  } catch (error) {
    logStructured("error", "check_limit_error", { error: error.message });
    res.status(500).json({ error: "Failed to check limit" });
  }
});

export default router;
