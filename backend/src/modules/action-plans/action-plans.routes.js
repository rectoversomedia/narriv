import express from "express";
import prisma from "../../prisma.js";
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
    const conservative = parseOption(plan.option1) || {};
    const balanced = parseOption(plan.option2) || {};
    const bold = parseOption(plan.option3) || {};
    const primaryOption = balanced.error ? (conservative.error ? bold : conservative) : balanced;
    const steps = collectActionSteps(primaryOption, conservative, balanced, bold);

    const channel = primaryOption.media_channels?.join(", ")
        || primaryOption.distribution_channels?.join(", ")
        || primaryOption.platforms?.join(", ")
        || "Owned + PR";

    const timelineSlots = ["Today", "Next 6h", "24h", "48h"];

    return {
        id: plan.id,
        assignedTo: plan.assignedTo,
        assignedTeam: plan.assignedTeam,
        deadline: plan.deadline,
        escalationLevel: plan.escalationLevel,
        workflowStatus: plan.workflowStatus,
        inputNarrative: primaryOption.executive_summary
            || primaryOption.severity_assessment
            || plan.alert?.whatHappened
            || plan.cluster?.description
            || "",
        evidenceSummary: `Evidence: ${plan.cluster?.signalCount || 0} related findings · Severity: ${plan.alert?.severity || "medium"} · Status: ${plan.alert?.status || "open"}`,
        outputs: [
            ["Primary action", plan.title || "Action plan"],
            ["Channel", channel],
            ["Impact / effort", `${plan.alert?.severity === "high" ? "High" : "Medium"} impact · Medium effort`],
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
        const whereClause = { workspaceId: { in: scopedWorkspaceIds } };

        const latestPlan = await prisma.actionPlan.findFirst({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                alert: true,
                cluster: true,
            },
        });

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

        const allPlans = await prisma.actionPlan.findMany({
            where: { workspaceId: { in: scopedWorkspaceIds } },
            select: { workflowStatus: true, escalationLevel: true, createdAt: true }
        });

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

        for (const plan of allPlans) {
            const isCurrent = plan.createdAt >= sevenDaysAgo;
            const isPrevious = plan.createdAt >= fourteenDaysAgo && plan.createdAt < sevenDaysAgo;
            const isActive = plan.workflowStatus !== "done";
            const isInProgress = plan.workflowStatus === "in_progress";
            const isDone = plan.workflowStatus === "done";
            const isNeedsAttention = isActive && ["high", "critical"].includes(plan.escalationLevel);

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
                value: allPlans.length, 
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

        const plan = await prisma.actionPlan.findUnique({
            where: { id },
            include: {
                alert: true,
                cluster: true,
            },
        });

        if (!plan || !scopedWorkspaceIds.includes(plan.workspaceId)) {
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

        const plan = await prisma.actionPlan.findUnique({
            where: { id },
            select: { id: true, workspaceId: true },
        });

        if (!plan || !scopedWorkspaceIds.includes(plan.workspaceId)) {
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

        const plan = await prisma.actionPlan.findUnique({
            where: { id },
            select: { id: true, workspaceId: true },
        });
        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, null);

        if (!plan || !scopedWorkspaceIds.includes(plan.workspaceId)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        const feedback = await submitFeedback({
            workspaceId: plan.workspaceId,
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
            targetType: feedback.targetType,
            targetId: feedback.targetId,
            reason: feedback.reason,
            createdAt: feedback.createdAt,
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

        const existing = await prisma.actionPlan.findUnique({
            where: { id },
            select: { id: true, workspaceId: true, escalationLevel: true },
        });

        if (!existing || !scopedWorkspaceIds.includes(existing.workspaceId)) {
            return res.status(404).json({ error: "Action plan not found" });
        }

        const updated = await prisma.actionPlan.update({
            where: { id },
            data: {
                assignedTo: assignedTo ?? null,
                assignedTeam: assignedTeam ?? null,
                deadline: deadline ? new Date(deadline) : null,
                escalationLevel: escalationLevel ?? existing.escalationLevel,
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                event: "assignment_change",
                metadata: {
                    targetType: "action_plan",
                    actionPlanId: updated.id,
                    workspaceId: updated.workspaceId,
                    assignedTo: updated.assignedTo,
                    assignedTeam: updated.assignedTeam,
                    deadline: updated.deadline,
                    escalationLevel: updated.escalationLevel,
                }
            }
        });

        if (escalationLevel && escalationLevel !== existing.escalationLevel) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    event: "escalation_change",
                    metadata: {
                        targetType: "action_plan",
                        actionPlanId: updated.id,
                        workspaceId: updated.workspaceId,
                        previousEscalationLevel: existing.escalationLevel,
                        escalationLevel: updated.escalationLevel,
                    }
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
