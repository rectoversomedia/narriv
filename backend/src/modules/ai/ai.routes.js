import express from "express";
import { analyzeSignal } from "./ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { rateLimiters } from "../../middlewares/rate-limit.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { analyzeBodySchema } from "./ai.module.schema.js";
import { logStructured } from "../../lib/logger.js";
import { computeNarrativeIntelligence } from "../../lib/narrative-intelligence.js";
import { resolveWorkspaceIdForUser, requireWorkspaceRole, MANAGER_ROLES } from "../../lib/workspace-access.js";
import { getOpenAIClient } from "../../lib/ai-client.js";
import { PROFILES } from "../../lib/ai-routing.js";
import { listTiers, routeCompletion, routeForTask, listTasks } from "../../lib/ai-routing.js";
import { checkBudgetAllowance } from "../../lib/cost-management.js";
import { ANTHROPIC_MODEL, createClaudeCompletion, isAnthropicConfigured, modelCapabilities } from "../../lib/anthropic-client.js";
import { computeEntityIntelligence } from "../../lib/entity-intelligence.js";
import { computeReputationIntelligence } from "../../lib/reputation-intelligence.js";
import { computePredictiveSignals } from "../../lib/predictive-signals.js";
import { computeExecutiveOverview, computeWorkspaceRecommendations } from "../../lib/executive-overview.js";
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
 * Rate limited per user: RATE_LIMITS.ai_generation
 */
router.post("/analyze", rateLimiters.aiGeneration(), validateRequest({ body: analyzeBodySchema }), async (req, res) => {
    try {
        const { title, content, text } = req.body;
        const inputContent = content || text;

        if (!inputContent) {
            return res.status(400).json({ error: "'content' field is required." });
        }

        // Attribute cost to the caller's workspace and respect its AI budget.
        const ws = await resolveWorkspaceIdForUser(req.user?.id || req.userId, req.query.workspaceId || null);
        if (!ws) return res.status(403).json({ error: "no accessible workspace" });
        const budget = await checkBudgetAllowance(ws).catch(() => ({ allowed: true }));
        if (budget?.allowed === false) return res.status(429).json({ error: "budget_exceeded", detail: budget.reason });

        const started = Date.now();
        const result = await analyzeSignal(title || null, inputContent, { workspaceId: ws, operation: "interactive_analysis" });
        res.json({ result, meta: { model: "gpt-4o-mini", latencyMs: Date.now() - started } });
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
        const raw = req.body?.windowHours ?? req.query?.windowHours ?? 24;
        const windowHours = Math.min(Math.max(parseInt(raw, 10) || 24, 1), 2160);
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
        const anthropicConfigured = isAnthropicConfigured();
        const openaiConfigured = Boolean(process.env.OPENAI_API_KEY) && process.env.OPENAI_API_KEY !== "sk-placeholder";
        const { resolveTierRoute } = await import("../../lib/ai-gateway.js");
        const { activeProfile, TIERS } = await import("../../lib/ai-routing.js");
        const effective = TIERS.map((t) => {
            const { route, fallbackReason } = resolveTierRoute(t);
            return { tier: t, provider: route.provider, model: route.model, servedAs: route.meta.complexity, fallbackReason };
        });
        // What each Narriv workflow actually calls. Only Ask Narriv goes through
        // the routing profile; the others are fixed OpenAI calls in their services.
        const askRoute = resolveTierRoute("complex").route;
        const workflows = [
            { workflow: "ask_narriv", provider: askRoute.provider, model: askRoute.model, routed: true },
            { workflow: "signal_analysis_and_sentiment", provider: "openai", model: "gpt-4o-mini", routed: false },
            { workflow: "action_plans_and_recommendations", provider: "openai", model: "gpt-4o-mini", routed: false },
            { workflow: "ai_visibility", provider: "openai", model: "gpt-4o-mini", routed: false },
            { workflow: "narrative_clustering", provider: null, model: null, routed: false, note: "deterministic, no language model" },
            { workflow: "reports", provider: null, model: null, routed: false, note: "built from stored records, no language model" },
        ];
        res.json({
            profile: activeProfile(),
            workflows,
            effective,
            tiers,
            providers: {
                openai: {
                    configured: openaiConfigured,
                    model: tiers.find((t) => t.provider === "openai")?.model || null,
                },
                anthropic: {
                    configured: anthropicConfigured,
                    model: ANTHROPIC_MODEL,
                    capabilities: modelCapabilities(ANTHROPIC_MODEL),
                    // Premium model is available for opt-in routing only; no tier uses it by default.
                    routedTiers: tiers.filter((t) => t.provider === "anthropic").map((t) => t.name),
                },
            },
        });
    } catch (error) {
        logStructured("error", "[AI MODULE] providers error:", { error: error.message });
        res.status(500).json({ error: "Failed to list providers" });
    }
});

/**
 * POST /ai/providers/check — owner/admin connectivity test. Sends a fixed
 * one-word prompt (no user or client data) with a 5-token cap to each
 * configured provider and reports ok / error category / latency. Keys never
 * leave the server; provider error text is reduced to a category.
 */
export function categorizeProviderError(err) {
    const status = Number(err?.status || err?.response?.status || 0);
    const msg = String(err?.message || "").toLowerCase();
    if (status === 401 || /invalid.*(api key|x-api-key)|authentication/.test(msg)) return "authentication_failed";
    if (/credit balance|billing|quota|insufficient/.test(msg)) return "billing_or_quota";
    if (status === 403) return "permission_denied";
    if (status === 404 || /model.*not.*found|not_found/.test(msg)) return "model_not_found";
    if (status === 429) return "rate_limited";
    if (status >= 500) return "provider_unavailable";
    if (/timeout|timed out|abort/.test(msg)) return "timeout";
    return "request_failed";
}

const PING = "Reply with the single word OK.";

router.post("/providers/check", rateLimiters.aiGeneration(), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    const results = {};
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey === "sk-placeholder") {
        results.openai = { configured: false };
    } else {
        const model = "gpt-4o-mini";
        const t = Date.now();
        try {
            const r = await getOpenAIClient().chat.completions.create({ model, messages: [{ role: "user", content: PING }], max_tokens: 5, temperature: 0 });
            results.openai = { configured: true, ok: true, model: r.model || model, latencyMs: Date.now() - t, reply: String(r.choices?.[0]?.message?.content || "").slice(0, 20) };
        } catch (err) {
            results.openai = { configured: true, ok: false, model, latencyMs: Date.now() - t, error: categorizeProviderError(err), status: err?.status || null };
        }
    }
    if (!isAnthropicConfigured()) {
        results.anthropic = { configured: false };
    } else {
        // The low-cost tier of the Claude profile; never the premium model.
        const model = PROFILES.claude.simple;
        const t = Date.now();
        try {
            // Haiku 5.5 thinks by default; low effort and a small cap keep the ping to a fraction of a cent.
            const r = await createClaudeCompletion({ model, user: PING, maxTokens: 64, effort: "low" });
            results.anthropic = { configured: true, ok: true, model: r.model || model, latencyMs: Date.now() - t, reply: String(r.content || "").slice(0, 20) };
        } catch (err) {
            results.anthropic = { configured: true, ok: false, model, latencyMs: Date.now() - t, error: categorizeProviderError(err), status: err?.status || null };
        }
    }
    // Apify: read-only account check (no actor run, no cost). Usage and limits
    // answer whether the account can run scraping before any is attempted.
    const apifyToken = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        results.apify = { configured: false };
    } else {
        const t = Date.now();
        try {
            const headers = { Authorization: `Bearer ${apifyToken}` };
            const [meRes, limRes] = await Promise.all([
                fetch("https://api.apify.com/v2/users/me", { headers, signal: AbortSignal.timeout(15000) }),
                fetch("https://api.apify.com/v2/users/me/limits", { headers, signal: AbortSignal.timeout(15000) }),
            ]);
            if (!meRes.ok) {
                results.apify = { configured: true, ok: false, latencyMs: Date.now() - t, status: meRes.status, error: meRes.status === 401 ? "authentication_failed" : "request_failed" };
            } else {
                const me = (await meRes.json())?.data || {};
                const lim = limRes.ok ? (await limRes.json())?.data || {} : {};
                const used = lim.current?.monthlyUsageUsd ?? null;
                const max = lim.limits?.maxMonthlyUsageUsd ?? me.plan?.maxMonthlyUsageUsd ?? null;
                results.apify = {
                    configured: true,
                    ok: true,
                    latencyMs: Date.now() - t,
                    plan: me.plan?.id ?? null,
                    monthlyUsageUsd: used,
                    monthlyLimitUsd: max,
                    cycleEnd: lim.monthlyUsageCycle?.endAt ?? null,
                    remainingUsd: typeof used === "number" && typeof max === "number" ? Math.max(0, Math.round((max - used) * 100) / 100) : null,
                };
            }
        } catch (err) {
            results.apify = { configured: true, ok: false, latencyMs: Date.now() - t, error: categorizeProviderError(err) };
        }
    }
    logStructured("info", "ai_provider_check", {
        apify: results.apify.ok ?? results.apify.configured,
        openai: results.openai.ok ?? results.openai.configured,
        anthropic: results.anthropic.ok ?? results.anthropic.configured,
        anthropicError: results.anthropic.error || null,
    });
    res.json({ checkedAt: new Date().toISOString(), profile: (await import("../../lib/ai-routing.js")).activeProfile(), results });
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
// Owner/admin only: an open completion endpoint would let any session (including
// the public demo login) run arbitrary prompts at Narriv's cost.
router.post("/complete", rateLimiters.aiGeneration(), requireWorkspaceRole(MANAGER_ROLES), async (req, res) => {
    try {
        const { complexity = "simple", system = null, user, maxTokens = null } = req.body || {};
        if (!user || typeof user !== "string") {
            return res.status(400).json({ error: "'user' field is required" });
        }
        if (!["simple", "balanced", "complex", "premium"].includes(complexity)) {
            return res.status(400).json({ error: "complexity must be simple, balanced, complex or premium" });
        }
        // Workspace-scoped like every other AI call: budgets, metering and cost attribution.
        const ws = await resolveWs(req, res);
        if (!ws) return;
        const { runAiTier } = await import("../../lib/ai-gateway.js");
        const out = await runAiTier({ tier: complexity, workspaceId: ws, user, system, maxTokens, operation: "ai_complete" });
        const route = { provider: out.provider, model: out.model, tier: out.tier, fallbackReason: out.fallbackReason ?? null };
        if (!out.ok) {
            if (out.error === "budget_exceeded" || out.error === "premium_budget_exceeded") return res.status(402).json({ error: out.error, detail: out.detail, route });
            if (out.error === "model_refused") return res.status(422).json({ error: "model_refused", category: out.detail ?? null, route });
            return res.status(502).json({ error: "upstream_ai_failed", route });
        }
        res.json({ content: out.content, route, model: out.servedModel, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.costUsd });
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

const windowParam = (req) => {
    const raw = req.body?.windowHours ?? req.query?.windowHours ?? 24;
    return Math.min(Math.max(parseInt(raw, 10) || 24, 1), 2160);
};

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
        const { out, narrative, rep, predictions } = await computeWorkspaceRecommendations({ workspaceId: ws, windowHours: windowParam(req) });
        res.json({ status: "ok", ...out, source: { narrativeRisk: narrative.riskScore, reputationBand: rep.reputationBand, predictiveSignalCount: predictions.signals.length } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /ai/overview — the executive Overview (what happened, why it matters,
// what changed, what to do), built only from this workspace's records.
router.get("/overview", async (req, res) => {
    try {
        const ws = await resolveWs(req, res);
        if (!ws) return;
        res.json(await computeExecutiveOverview({ workspaceId: ws, windowHours: windowParam(req) }));
    } catch (e) {
        logStructured("error", "executive_overview_failed", { error: e?.message });
        res.status(500).json({ error: "The overview could not be built." });
    }
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

router.post("/ask", rateLimiters.aiGeneration(), async (req, res) => {
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
