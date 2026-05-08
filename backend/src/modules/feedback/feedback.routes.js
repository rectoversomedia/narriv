import express from "express";
import { submitFeedback, getAccuracyMetrics, getRejectionInsights, getActionPlanPromptScoring } from "./feedback.service.js";

const router = express.Router();

// POST /api/feedback — Submit feedback on an AI output
router.post("/", async (req, res) => {
    try {
        const { workspaceId, targetType, targetId, action, originalOutput, editedOutput, reason, userId } = req.body;

        if (!workspaceId || !targetType || !targetId || !action) {
            return res.status(400).json({
                error: "workspaceId, targetType, targetId, and action are required"
            });
        }

        const feedback = await submitFeedback({
            workspaceId, targetType, targetId, action, originalOutput, editedOutput, reason, userId
        });

        res.status(201).json(feedback);
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(400).json({ error: error.message || "Internal server error" });
    }
});

// GET /api/feedback/accuracy — Get AI accuracy metrics
router.get("/accuracy", async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: "workspaceId query param is required" });
        }

        const metrics = await getAccuracyMetrics(workspaceId);
        res.json(metrics);
    } catch (error) {
        console.error("Error fetching accuracy metrics:", error);
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

        const insights = await getRejectionInsights(workspaceId);
        res.json(insights);
    } catch (error) {
        console.error("Error fetching rejection insights:", error);
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

        const scoring = await getActionPlanPromptScoring(workspaceId);
        res.json(scoring);
    } catch (error) {
        console.error("Error fetching prompt scoring:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
