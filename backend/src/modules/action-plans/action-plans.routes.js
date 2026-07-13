import express from "express";
import supabase from "../../lib/supabase.js";
import { submitFeedback } from "../feedback/feedback.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { logStructured } from "../../lib/logger.js";
import { z } from "zod";
import { actionPlanIdParamsSchema, submitActionPlanFeedbackBodySchema } from "./action-plans.schema.js";

const router = express.Router();
router.use(verifyToken);

const assignActionPlanParamsSchema = z.object({
    id: z.string().uuid("id must be a valid UUID."),
});

const assignActionPlanBodySchema = z.object({
    assignedTo: z.string().trim().min(1, "assignedTo cannot be empty.").max(120, "assignedTo is too long.").optional().nullable(),
    assignedTeam: z.string().trim().min(1, "assignedTeam cannot be empty.").max(120, "assignedTeam is too long.").optional().nullable(),
    deadline: z.string().datetime("deadline must be a valid ISO datetime.").optional().nullable(),
    escalationLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
});

function parseOption(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function collectActionSteps(...options) {
    const stepFields = [
        "immediate_actions",
        "talking_points",
        "key_messages",
        "content_pillars",
        "recommended_formats",
        "distribution_channels",
        "key_themes",
        "success_metrics",
        "collaboration_formats",
        "key_messages_for_influencers",
        "platforms",
        "stakeholder_management"
    ];

    return options
        .filter(Boolean)
        .flatMap((option) => {
            const fieldSteps = stepFields.flatMap((field) => Array.isArray(option[field]) ? option[field] : []);
            const structuredSteps = Array.isArray(option.steps)
                ? option.steps.map((step) => {
                    if (typeof step === "string") return step;
                    if (!step || typeof step !== "object") return "";
                    return step.objective || step.phase || step.success_criteria || "";
                })
                : [];
            return [...fieldSteps, ...structuredSteps];
        })
        .filter((step) => typeof step === "string" && step.trim().length > 0)
        .filter((step, index, steps) => steps.indexOf(step) === index);
}

function buildActionPlanResponse(plan) {
    // Use strategy JSONB field instead of option1/2/3
    const strategy = plan.strategy || {};
    const primaryOption = typeof strategy === 'string' ? parseOption(strategy) || {} : strategy;
    const steps = collectActionSteps(primaryOption);

    const channel = primaryOption.media_channels?.join(", ")
        || primaryOption.distribution_channels?.join(", ")
        || primaryOption.platforms?.join(", ")
        || "Owned + PR";

    const timelineSlots = ["Today", "Next 6h", "24h", "48h"];

    return {
        id: plan.id,
        assignedTo: plan.assigned_to,
        assignedTeam: plan.assigned_team,
        deadline: plan.deadline,
        escalationLevel: plan.escalation_level,
        workflowStatus: plan.workflow_status,
        inputNarrative: primaryOption.executive_summary
            || primaryOption.severity_assessment
            || plan.description
            || "",
        evidenceSummary: `Status: ${plan.status || "open"} · Priority: ${plan.priority || "medium"}`,
        outputs: [
            ["Primary action", plan.title || "Action plan"],
            ["Channel", channel],
            ["Impact / effort", `${plan.priority === "high" || plan.priority === "critical" ? "High" : "Medium"} impact · Medium effort`],
            ["Confidence", "82%"],
        ],
        plan: steps.slice(0, 4).map((step, index) => [step, timelineSlots[index] || "Later"]),
    };
}

// GET /api/action-plans — Frontend contract endpoint
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) {
            return res.json({ inputNarrative: "", evidenceSummary: "", outputs: [], plan: [] });
        }

        const { data: latestPlan, error } = await supabase
            .from("action_plans")
            .select("*")
            .in("workspace_id", scopedWorkspaceIds)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!latestPlan) {
            return res.json({
                inputNarrative: "",
                evidenceSummary: "",
                outputs: [],
                plan: [],
            });
        }

        return res.json(buildActionPlanResponse(latestPlan));
    } catch (error) {
        logStructured("error", "Error fetching action plan contract data:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});


// GET /api/action-plans/metrics — Action Plan metrics for dashboard
router.get("/metrics", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);

        const fallback = {
            active: { value: 0, trend: 0 },
            inProgress: { value: 0, trend: 0 },
            done: { value: 0, trend: 0 },
            needsAttention: { value: 0, trend: 0 },
            resolution: { value: "0h", trend: 0 }
        };

        if (scopedWorkspaceIds.length === 0) {
            return res.json(fallback);
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const { data: allPlans, error } = await supabase
            .from("action_plans")
            .select("workflow_status, escalation_level, created_at")
            .in("workspace_id", scopedWorkspaceIds);

        if (error) throw error;

        const calculateTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        const metrics = {
            active: { current: 0, previous: 0, total: 0 },
            inProgress: { current: 0, previous: 0, total: 0 },
            done: { current: 0, previous: 0, total: 0 },
            needsAttention: { current: 0, previous: 0, total: 0 }
        };

        for (const plan of (allPlans || [])) {
            const isCurrent = new Date(plan.created_at) >= sevenDaysAgo;
            const isPrevious = new Date(plan.created_at) >= fourteenDaysAgo && new Date(plan.created_at) < sevenDaysAgo;
            const isActive = plan.workflow_status !== "done";
            const isInProgress = ["in_progress", "blocked"].includes(plan.workflow_status);
            const isDone = plan.workflow_status === "done";
            const isNeedsAttention = isActive && ["high", "critical"].includes(plan.escalation_level);

            if (isActive) metrics.active.total++;
            if (isInProgress) metrics.inProgress.total++;
            if (isDone) metrics.done.total++;
            if (isNeedsAttention) metrics.needsAttention.total++;

            if (isCurrent) {
                if (isActive) metrics.active.current++;
                if (isInProgress) metrics.inProgress.current++;
                if (isDone) metrics.done.current++;
                if (isNeedsAttention) metrics.needsAttention.current++;
            } else if (isPrevious) {
                if (isActive) metrics.active.previous++;
                if (isInProgress) metrics.inProgress.previous++;
                if (isDone) metrics.done.previous++;
                if (isNeedsAttention) metrics.needsAttention.previous++;
            }
        }

        return res.json({
            active: { value: metrics.active.total, trend: calculateTrend(metrics.active.current, metrics.active.previous) },
            inProgress: { value: metrics.inProgress.total, trend: calculateTrend(metrics.inProgress.current, metrics.inProgress.previous) },
            done: { value: metrics.done.total, trend: calculateTrend(metrics.done.current, metrics.done.previous) },
            needsAttention: { value: metrics.needsAttention.total, trend: calculateTrend(metrics.needsAttention.current, metrics.needsAttention.previous) },
            resolution: {
                value: (allPlans || []).length,
                trend: calculateTrend(
                    metrics.active.current + metrics.inProgress.current + metrics.done.current,
                    metrics.active.previous + metrics.inProgress.previous + metrics.done.previous
                )
            }
        });

    } catch (error) {
        logStructured("error", "Error fetching action plan metrics:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/action-plans/:id — Get a specific action plan for preview
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: plan, error } = await supabase
            .from("action_plans")
            .select(`
                *,
                alert:alerts(*),
                cluster:narrative_clusters(*)
            `)
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!plan || !scopedWorkspaceIds.includes(plan.workspace_id)) {
            return res.json({
                inputNarrative: "",
                evidenceSummary: "",
                outputs: [],
                plan: [],
            });
        }

        const response = buildActionPlanResponse(plan);
        response.id = plan.id;
        return res.json(response);
    } catch (error) {
        logStructured("error", "Error fetching specific action plan data:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/action-plans/:id/learning — Insights and learning data for an action plan
router.get("/:id/learning", async (req, res) => {
    try {
        const { id } = req.params;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: plan, error } = await supabase
            .from("action_plans")
            .select("id, workspace_id")
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!plan || !scopedWorkspaceIds.includes(plan.workspace_id)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        // Return mock data that can be localized or displayed directly
        // In a real implementation, this would aggregate data from related actions/reports
        return res.json({
            insights: [],
            templates: []
        });
    } catch (error) {
        logStructured("error", "Error fetching action plan learning:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/action-plans/:id/feedback — Feedback endpoint for action suggestions
router.post("/:id/feedback", validateRequest({ params: actionPlanIdParamsSchema, body: submitActionPlanFeedbackBodySchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason, comment, editedOutput, originalOutput, userId } = req.body;

        const validActions = ["accepted", "edited", "rejected"];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                error: `Invalid action. Must be one of: ${validActions.join(", ")}`
            });
        }

        const { data: plan, error: planError } = await supabase
            .from("action_plans")
            .select("id, workspace_id")
            .eq("id", id)
            .maybeSingle();

        if (planError) throw planError;

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        if (!plan || !scopedWorkspaceIds.includes(plan.workspace_id)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        const feedback = await submitFeedback({
            workspaceId: plan.workspace_id,
            targetType: "action_plan",
            targetId: plan.id,
            action,
            originalOutput: originalOutput || null,
            editedOutput: editedOutput || null,
            reason: reason || comment || null,
            userId: userId || null,
        });

        return res.status(201).json({
            id: feedback.id,
            action: feedback.action,
            targetType: feedback.target_type,
            targetId: feedback.target_id,
            reason: feedback.reason,
            createdAt: feedback.created_at,
        });
    } catch (error) {
        logStructured("error", "Error submitting action plan feedback:", { error: error?.message || error, stack: error?.stack });
        return res.status(400).json({ error: error.message || "Internal server error" });
    }
});

// PATCH /api/action-plans/:id/assign - Update assignment workflow fields
router.patch("/:id/assign", validateRequest({ params: assignActionPlanParamsSchema, body: assignActionPlanBodySchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo, assignedTeam, deadline, escalationLevel } = req.body;
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        const { data: existing, error: existingError } = await supabase
            .from("action_plans")
            .select("id, workspace_id, escalation_level")
            .eq("id", id)
            .maybeSingle();

        if (existingError) throw existingError;

        if (!existing || !scopedWorkspaceIds.includes(existing.workspace_id)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        const { data: updated, error: updateError } = await supabase
            .from("action_plans")
            .update({
                assigned_to: assignedTo ?? null,
                assigned_team: assignedTeam ?? null,
                deadline: deadline ? new Date(deadline) : null,
                escalation_level: escalationLevel ?? existing.escalation_level,
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase.from("audit_logs").insert({
            user_id: req.user.id,
            workspace_id: updated.workspace_id,
            event: "assignment_change",
            metadata: {
                target_type: "action_plan",
                action_plan_id: updated.id,
                workspace_id: updated.workspace_id,
                assigned_to: updated.assigned_to,
                assigned_team: updated.assigned_team,
                deadline: updated.deadline,
                escalation_level: updated.escalation_level,
            }
        });

        if (escalationLevel && escalationLevel !== existing.escalation_level) {
            await supabase.from("audit_logs").insert({
                user_id: req.user.id,
                workspace_id: updated.workspace_id,
                event: "escalation_change",
                metadata: {
                    target_type: "action_plan",
                    action_plan_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: existing.escalation_level,
                    escalation_level: updated.escalation_level,
                }
            });
        }

        return res.json(updated);
    } catch (error) {
        logStructured("error", "Error updating action plan assignment:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
