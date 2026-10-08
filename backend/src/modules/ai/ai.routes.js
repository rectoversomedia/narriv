import express from "express";
import { analyzeSignal } from "./ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { analyzeBodySchema } from "./ai.module.schema.js";
import { logStructured } from "../../lib/logger.js";
import { computeNarrativeIntelligence } from "../../lib/narrative-intelligence.js";
import { resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { listTiers, routeCompletion, routeForTask, listTasks } from "../../lib/ai-routing.js";
import { getAnthropicClient, ANTHROPIC_MODEL } from "../../lib/anthropic-client.js";
import { computeEntityIntelligence } from "../../lib/entity-intelligence.js";
import { computeReputationIntelligence } from "../../lib/reputation-intelligence.js";
import { computePredictiveSignals } from "../../lib/predictive-signals.js";
import { deriveRecommendations } from "../../lib/recommendation-engine.js";
import { computeTrend, sentimentVelocity } from "../../lib/trend-engine.js";
import { getAiObservabilitySummary, recordAiEvent } from "../../lib/ai-observability.js";
import { askNarriv } from "../../lib/ask-narriv.js";
import { generateExecutiveBrief } from "../../lib/executive-briefing.js";
import { computeGeoIntelligence } from "../../lib/geo-intelligence.js";

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
        const windowHours = Math.min(Math.max(parseInt(req.query.windowHours, 10) || 24, 1), 2160);
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

// =========================================================
// Phase 4: Intelligence Engine (additive endpoints)
// All endpoints are auth-required, read-only, no external actions.
// =========================================================

async function resolveWs(req, res) {
    const userId = req.user?.id || req.userId;
    if (!userId) {
        res.status(401).json({ error: "auth required" });
        return null;
    }
    const requested = req.query.workspaceId || req.workspaceId || null;
    const workspaceId = await resolveWorkspaceIdForUser(userId, requested);
    if (!workspaceId) {
        res.status(403).json({ error: "no accessible workspace" });
        return null;
    }
    return workspaceId;
}

const windowParam = (req) => Math.min(Math.max(parseInt(req.query.windowHours, 10) || 24, 1), 2160);

router.get("/entity-intelligence", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const out = await computeEntityIntelligence({ workspaceId: ws, windowHours: windowParam(req) });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/reputation-intelligence", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const out = await computeReputationIntelligence({ workspaceId: ws, windowHours: windowParam(req) });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/predictive-signals", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const out = await computePredictiveSignals({ workspaceId: ws, windowHours: windowParam(req) });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/recommendations", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const win = windowParam(req);
        const [narrative, rep, predictions] = await Promise.all([
            computeNarrativeIntelligence({ workspaceId: ws, windowHours: win }),
            computeReputationIntelligence({ workspaceId: ws, windowHours: win }),
            computePredictiveSignals({ workspaceId: ws, windowHours: win }),
        ]);
        const signalCount = narrative.facts.find((f) => f.kind === "signal_count_window")?.value || 0;
        const alertCount = narrative.facts.find((f) => f.kind === "alert_count_window")?.value || 0;
        const negCount = narrative.facts.find((f) => f.kind === "sentiment_breakdown")?.value?.NEGATIVE || 0;
        const out = deriveRecommendations({
            riskScore: narrative.riskScore || 0,
            riskBand: narrative.riskBand || "low",
            reputationBand: rep.reputationBand || "neutral",
            activeAlerts: alertCount,
            emergingNarratives: narrative.inferences.find((i) => i.kind === "emerging_narratives")?.items?.length || 0,
            negativeShare: signalCount > 0 ? negCount / signalCount : 0,
            volumeRatio: narrative.inferences.find((i) => i.kind === "volume_ratio")?.ratio || 1,
        });
        res.json({ status: "ok", ...out, source: { narrativeRisk: narrative.riskScore, reputationBand: rep.reputationBand, predictiveSignalCount: predictions.signals.length } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/trend", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const win = windowParam(req);
        const out = await computeTrend({ workspaceId: ws, windowHours: win });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/executive-brief", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const out = await generateExecutiveBrief({ workspaceId: ws, windowHours: windowParam(req) });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/geo-intelligence", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const out = await computeGeoIntelligence({ workspaceId: ws, windowHours: windowParam(req) });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/observability", async (req, res) => {
    res.json(getAiObservabilitySummary());
});

router.get("/tasks", async (req, res) => {
    res.json({ tasks: listTasks() });
});

router.post("/ask", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const question = req.body?.question;
        const win = windowParam(req);
        const out = await askNarriv({ workspaceId: ws, question, windowHours: win });
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
