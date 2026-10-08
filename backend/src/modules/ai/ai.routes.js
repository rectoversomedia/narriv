import express from "express";
import { analyzeSignal } from "./ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { analyzeBodySchema } from "./ai.module.schema.js";
import { logStructured } from "../../lib/logger.js";
import { computeNarrativeIntelligence } from "../../lib/narrative-intelligence.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

const router = express.Router();
router.use(verifyToken);

/**
 * POST /ai/analyze
 * Analyzes a signal's title + content using OpenAI.
 * Body: { title?: string, content: string }
 * Rate limited: 20/minute
 */
router.post("/analyze", rateLimiters.aiGeneration(), validateRequest({ body: analyzeBodySchema }), async (req, res) => {
    try {
        const { title, content, text } = req.body;
        const inputContent = content || text;

        if (!inputContent) {
            return res.status(400).json({ error: "'content' field is required." });
        }

        const result = await analyzeSignal(title || null, inputContent);
        res.json({ result });
    } catch (error) {
        logStructured("error", "[AI MODULE] Error:", { error: error.message?.message || error.message, stack: error.message?.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /ai/narrative-intelligence
 * Returns evidence-grounded narrative intelligence for the caller's workspace.
 * Pure read-only — no AI calls, no writes. Cost-free.
 * Optional query: ?windowHours=24 (default 24)
 */
router.get("/narrative-intelligence", async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        if (!userId) {
            return res.status(401).json({ error: "auth required" });
        }
        const requested = req.query.workspaceId || req.workspaceId || null;
        const workspaceId = await resolveWorkspaceIdForUser(userId, requested);
        if (!workspaceId) {
            return res.status(403).json({ error: "no accessible workspace" });
        }
        const windowHours = Math.min(Math.max(parseInt(req.query.windowHours, 10) || 24, 1), 168);
        const payload = await computeNarrativeIntelligence({ workspaceId, windowHours });
        res.json(payload);
    } catch (error) {
        logStructured("error", "[AI MODULE] narrative-intelligence error:", { error: error.message });
        res.status(500).json({ error: "Failed to compute narrative intelligence" });
    }
});

export default router;
