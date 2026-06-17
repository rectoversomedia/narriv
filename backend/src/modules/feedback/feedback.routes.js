import express from "express";
import { submitFeedback, getAccuracyMetrics, getRejectionInsights, getActionPlanPromptScoring } from "./feedback.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { resolveWorkspaceIdForUser, resolveScopedWorkspaceIds } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { submitFeedbackBodySchema } from "./feedback.schema.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();
router.use(verifyToken);

// POST /api/feedback — Submit feedback on an AI output
router.post("/", validateRequest({ body: submitFeedbackBodySchema }), async (req, res) => {
    try {
        const { workspaceId, targetType, targetId, action, originalOutput, editedOutput, reason, userId } = req.body;

        if (!workspaceId || !targetType || !targetId || !action) {
            return res.status(400).json({
                error: "workspaceId, targetType, targetId, and action are required"
            });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const feedback = await submitFeedback({
            workspaceId: scopedWorkspaceId, targetType, targetId, action, originalOutput, editedOutput, reason, userId
        });
        await recordAuditLog({
            userId: req.user.id,
            event: "ai_feedback_submitted",
            workspaceId: scopedWorkspaceId,
            metadata: { feedbackId: feedback.id, targetType, targetId, action },
        });

        res.status(201).json(feedback);
    } catch (error) {
        logStructured("error", "Error submitting feedback:", { error: error?.message || error, stack: error?.stack });
        res.status(400).json({ error: error.message || "Internal server error" });
    }
});

// GET /api/feedback/accuracy — Get AI accuracy metrics
router.get("/accuracy", async (req, res) => {
    try {
        const { workspaceId } = req.query;

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) return res.json({ total_feedback: 0, accuracy_score: null, acceptance_rate: 0, edit_rate: 0, rejection_rate: 0, by_type: {}, trend: [] });

        const metrics = await getAccuracyMetrics(scopedWorkspaceIds);
        res.json(metrics);
    } catch (error) {
        logStructured("error", "Error fetching accuracy metrics:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/feedback/rejections — Get rejection insights for prompt improvement
router.get("/rejections", async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: "workspaceId query param is required" });
        }

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) return res.json({ total_rejections: 0, by_type: {} });

        const insights = await getRejectionInsights(scopedWorkspaceIds[0]);
        res.json(insights);
    } catch (error) {
        logStructured("error", "Error fetching rejection insights:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/feedback/prompt-scoring â€” Feedback-derived prompt scoring signal
router.get("/prompt-scoring", async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: "workspaceId query param is required" });
        }

        const scopedWorkspaceIds = await resolveScopedWorkspaceIds(req.user.id, workspaceId);
        if (scopedWorkspaceIds.length === 0) return res.json({ total_feedback: 0, acceptance_rate: 0, edit_rate: 0, rejection_rate: 0, prompt_score: null, top_reasons: [] });

        const scoring = await getActionPlanPromptScoring(scopedWorkspaceIds[0]);
        res.json(scoring);
    } catch (error) {
        logStructured("error", "Error fetching prompt scoring:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
