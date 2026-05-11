import express from "express";
import prisma from "../../prisma.js";
import { submitFeedback } from "../feedback/feedback.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { z } from "zod";

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
        .flatMap((option) => stepFields.flatMap((field) => Array.isArray(option[field]) ? option[field] : []))
        .filter((step) => typeof step === "string" && step.trim().length > 0)
        .filter((step, index, steps) => steps.indexOf(step) === index);
}

function buildActionPlanResponse(plan) {
    const conservative = parseOption(plan.option1) || {};
    const balanced = parseOption(plan.option2) || {};
    const bold = parseOption(plan.option3) || {};
    const primaryOption = balanced.error ? (conservative.error ? bold : conservative) : balanced;
    const steps = collectActionSteps(primaryOption, conservative, balanced, bold);
    const fallbackSteps = [
        "Review the evidence and confirm the audience priority.",
        "Prepare the message, content, or response owner.",
        "Publish the approved action and monitor new findings.",
        "Record feedback so future suggestions improve."
    ];
    const channel = primaryOption.media_channels?.join(", ")
        || primaryOption.distribution_channels?.join(", ")
        || primaryOption.platforms?.join(", ")
        || "Owned + PR";

    const timelineSlots = ["Today", "Next 6h", "24h", "48h"];

    return {
        id: plan.id,
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
        plan: (steps.length ? steps : fallbackSteps).slice(0, 4).map((step, index) => [step, timelineSlots[index] || "Later"]),
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
        console.error("Error fetching action plan contract data:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/action-plans/:id/feedback — Feedback endpoint for action suggestions
router.post("/:id/feedback", async (req, res) => {
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
        console.error("Error submitting action plan feedback:", error);
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
        console.error("Error updating action plan assignment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
