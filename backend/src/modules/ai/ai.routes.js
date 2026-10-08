import express from "express";
import { analyzeSignal } from "./ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { analyzeBodySchema } from "./ai.module.schema.js";
import { logStructured } from "../../lib/logger.js";
import { computeNarrativeIntelligence } from "../../lib/narrative-intelligence.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { listTiers, routeCompletion } from "../../lib/ai-routing.js";
import { getAnthropicClient, ANTHROPIC_MODEL } from "../../lib/anthropic-client.js";

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

/**
 * GET /ai/providers
 * Diagnostic: lists configured AI tiers and which providers are wired.
 * Pure read-only — does not call any external AI.
 */
router.get("/providers", async (req, res) => {
    try {
        const tiers = listTiers();
        const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.ANTHROPIC_API_KEY !== "sk-ant-placeholder";
        const openaiConfigured = Boolean(process.env.OPENAI_API_KEY) && process.env.OPENAI_API_KEY !== "sk-placeholder";
        res.json({
            tiers,
            providers: {
                openai: {
                    configured: openaiConfigured,
                    model: tiers.find((t) => t.provider === "openai")?.model || null,
                },
                anthropic: {
                    configured: anthropicConfigured,
                    model: ANTHROPIC_MODEL,
                },
            },
        });
    } catch (error) {
        logStructured("error", "[AI MODULE] providers error:", { error: error.message });
        res.status(500).json({ error: "Failed to list providers" });
    }
});

/**
 * POST /ai/complete
 * Generic completion endpoint using the routing layer.
 * Body: { complexity?: "simple"|"balanced"|"complex", provider?: "openai"|"anthropic", system?: string, user: string, maxTokens?: number }
 *
 * ADDITIVE — new endpoint, does not change any existing AI call. Used by
 * new intelligence workloads. The existing 14 OpenAI call sites are
 * untouched.
 */
router.post("/complete", async (req, res) => {
    try {
        const { complexity = "simple", provider = null, model = null, system = null, user, maxTokens = null } = req.body || {};
        if (!user || typeof user !== "string") {
            return res.status(400).json({ error: "'user' field is required" });
        }
        const route = routeCompletion({ complexity, provider, model });
        const start = Date.now();
        let content = null;
        let error = null;
        try {
            if (route.provider === "anthropic") {
                const client = getAnthropicClient();
                const resp = await client.messages.create({
                    model: route.model,
                    max_tokens: maxTokens || route.maxTokens,
                    temperature: route.temperature,
                    system: system || undefined,
                    messages: [{ role: "user", content: user }],
                });
                content = (resp.content || [])
                    .map((b) => (b.type === "text" ? b.text : ""))
                    .filter(Boolean)
                    .join("\n");
            } else {
                const { getOpenAIClient } = await import("../../lib/ai-client.js");
                const client = getOpenAIClient();
                const resp = await client.chat.completions.create({
                    model: route.model,
                    temperature: route.temperature,
                    max_tokens: maxTokens || route.maxTokens,
                    messages: [
                        ...(system ? [{ role: "system", content: system }] : []),
                        { role: "user", content: user },
                    ],
                });
                content = resp.choices?.[0]?.message?.content || null;
            }
        } catch (e) {
            error = e?.message || String(e);
        }
        const latencyMs = Date.now() - start;
        route.meta.latencyMs = latencyMs;
        route.meta.success = error == null;
        route.meta.error = error;
        logStructured("info", "[AI MODULE] completion", {
            provider: route.provider,
            model: route.model,
            complexity,
            latencyMs,
            success: route.meta.success,
            error: route.meta.error,
        });
        if (error) {
            return res.status(502).json({ error: "upstream_ai_failed", detail: error, route });
        }
        res.json({ content, route });
    } catch (error) {
        logStructured("error", "[AI MODULE] complete error:", { error: error.message });
        res.status(500).json({ error: "Failed to complete" });
    }
});

export default router;
