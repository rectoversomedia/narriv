/**
 * AI Model Routing
 *
 * Selects the appropriate model and parameters based on task complexity.
 * Read from environment, with safe defaults.
 *
 * Complexity levels:
 *   - simple   : High-volume, low-complexity tasks (classification, extraction, tagging)
 *   - balanced : Moderate analysis (summarization, generation, recommendations)
 *   - complex  : Deep reasoning (long-context, multi-step analysis, strategy)
 *
 * Provider selection:
 *   - Each tier has an optional `provider` override via env: AI_PROVIDER_SIMPLE,
 *     AI_PROVIDER_BALANCED, AI_PROVIDER_COMPLEX (default "openai").
 *   - If a tier's resolved model name starts with "claude-", the provider
 *     is auto-detected as "anthropic". This is a safe heuristic because
 *     Anthropic model identifiers all use that prefix.
 *   - Callers may also pass an explicit `provider` to override.
 *
 * All routing is configured via environment variables. Defaults are safe
 * (OpenAI gpt-4o-mini) and pre-existing behavior is preserved.
 *
 * IMPORTANT: This module is ADDITIVE. It does not modify any existing call
 * site or change behavior for any caller that does not opt in via
 * routeCompletion().
 */

const DEFAULT_PROVIDER = "openai";

function detectProviderFromModel(model) {
    if (typeof model !== "string") return DEFAULT_PROVIDER;
    if (model.startsWith("claude-")) return "anthropic";
    if (model.startsWith("gpt-") || model.startsWith("o1-") || model.startsWith("o3-") || model.startsWith("o4-")) return "openai";
    return DEFAULT_PROVIDER;
}

// Routing profiles. "openai" (default) keeps the economical model on every
// tier and premium off. "claude" maps tiers to the Claude family:
//   simple  -> Haiku 5.5   (routine classification and extraction)
//   balanced/complex -> Sonnet 5.5 (contextual and narrative analysis)
//   premium -> Opus 5.5    (strategic synthesis, executive intelligence)
// Model ids verified against the Anthropic models API (2026-10-12).
// Per-tier env overrides (AI_MODEL_<TIER>, AI_PROVIDER_<TIER>) always win.
export const PROFILES = {
    openai: { simple: "gpt-4o-mini", balanced: "gpt-4o-mini", complex: "gpt-4o-mini", premium: null },
    claude: { simple: "claude-haiku-5-5", balanced: "claude-sonnet-5-5", complex: "claude-sonnet-5-5", premium: "claude-opus-5-5" },
};
const TIER_PARAMS = {
    simple: { temperature: 0.2, maxTokens: 1024 },
    balanced: { temperature: 0.3, maxTokens: 2048 },
    complex: { temperature: 0.4, maxTokens: 4096 },
    premium: { temperature: 0.3, maxTokens: null },
};
export const TIERS = Object.keys(TIER_PARAMS);

export function activeProfile() {
    const p = String(process.env.AI_ROUTING_PROFILE || "openai").toLowerCase();
    return PROFILES[p] ? p : "openai";
}

// Read at call time so tiers can be changed via environment (and tested).
function tierConfig(name) {
    if (!TIER_PARAMS[name]) return null;
    const key = name.toUpperCase();
    return {
        model: process.env[`AI_MODEL_${key}`] || PROFILES[activeProfile()][name],
        provider: process.env[`AI_PROVIDER_${key}`] || null,
        temperature: TIER_PARAMS[name].temperature,
        maxTokens: name === "premium" ? Number(process.env.AI_PREMIUM_MAX_TOKENS || 4096) : TIER_PARAMS[name].maxTokens,
    };
}

/** The economical OpenAI route for a tier: the fallback when a provider is unavailable. */
export function openaiFallbackRoute(tier) {
    const t = tier === "premium" ? "complex" : tier;
    const params = TIER_PARAMS[t] || TIER_PARAMS.simple;
    return { provider: "openai", model: PROFILES.openai[t] || "gpt-4o-mini", temperature: params.temperature, maxTokens: params.maxTokens, meta: { complexity: t, success: null, latencyMs: null, error: null } };
}

function resolve(complexity, explicitProvider) {
    const c = tierConfig(complexity) || tierConfig("simple");
    const provider = explicitProvider || c.provider || detectProviderFromModel(c.model);
    return {
        provider,
        model: c.model,
        temperature: c.temperature,
        maxTokens: c.maxTokens,
    };
}

/**
 * Route a completion request by complexity tier.
 * Returns { provider, model, temperature, maxTokens, meta }.
 *
 * Caller may pass `provider` to force a specific provider
 * (e.g., { complexity: "complex", provider: "anthropic" }).
 *
 * meta = { complexity, latencyMs, success, error } for observability.
 * Populated by the caller after the call completes (we don't time here
 * to keep this module side-effect-free).
 */
export function routeCompletion({ complexity = "simple", provider = null, model = null } = {}) {
    const tier = TIER_PARAMS[complexity] ? complexity : "simple";
    const r = resolve(tier, provider);
    const finalModel = model || r.model;
    return {
        ...r,
        model: finalModel,
        provider: provider || r.provider || detectProviderFromModel(finalModel),
        meta: {
            complexity: tier,
            success: null,
            latencyMs: null,
            error: null,
        },
    };
}

const TASK_COMPLEXITY = {
    classification: "simple",
    entity_extraction: "simple",
    tagging: "simple",
    summarization: "balanced",
    generation: "balanced",
    recommendation: "balanced",
    // Strategic synthesis runs on the premium tier when it is enabled and falls
    // back to "complex" otherwise (no change while premium is off).
    narrative_synthesis: "premium",
    risk_reasoning: "premium",
    executive_briefing: "premium",
    ask_narriv: "complex",
    // Phase 10 workload classes
    routine_classification: "simple",
    narrative_analysis: "balanced",
    executive_synthesis: "premium",
    reputation_investigation: "premium", // high-severity investigations; falls back to complex when premium is off
};

export function routeForTask(taskName, { provider = null, model = null, tierOverride = null } = {}) {
    const complexity = tierOverride || TASK_COMPLEXITY[taskName] || "simple";
    return routeCompletion({ complexity, provider, model });
}

export function listTasks() {
    return Object.entries(TASK_COMPLEXITY).map(([task, complexity]) => ({ task, complexity }));
}

/**
 * List available tiers — for diagnostics or admin UIs.
 */
export function listTiers() {
    return TIERS.filter((k) => tierConfig(k).model).map((k) => {
        const c = tierConfig(k);
        return {
            name: k,
            model: c.model,
            provider: c.provider || detectProviderFromModel(c.model),
            temperature: c.temperature,
            maxTokens: c.maxTokens,
        };
    });
}
