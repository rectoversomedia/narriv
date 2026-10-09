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

const DEFAULTS = {
    simple: {
        model: process.env.AI_MODEL_SIMPLE || "gpt-4o-mini",
        provider: process.env.AI_PROVIDER_SIMPLE || null,
        temperature: 0.2,
        maxTokens: 1024,
    },
    balanced: {
        model: process.env.AI_MODEL_BALANCED || "gpt-4o-mini",
        provider: process.env.AI_PROVIDER_BALANCED || null,
        temperature: 0.3,
        maxTokens: 2048,
    },
    complex: {
        model: process.env.AI_MODEL_COMPLEX || "gpt-4o-mini",
        provider: process.env.AI_PROVIDER_COMPLEX || null,
        temperature: 0.4,
        maxTokens: 4096,
    },
    // Premium reasoning tier: OFF unless AI_MODEL_PREMIUM is set (e.g.
    // "claude-opus-5-5"). When unset or its provider is not configured, the
    // AI gateway falls back to "complex" and reports the fallback.
    premium: {
        model: process.env.AI_MODEL_PREMIUM || null,
        provider: process.env.AI_PROVIDER_PREMIUM || null,
        temperature: 0.3,
        maxTokens: Number(process.env.AI_PREMIUM_MAX_TOKENS || 4096),
    },
};

// Premium settings are read at call time so the tier can be enabled or
// disabled via environment without a code change (and is testable).
function tierConfig(name) {
    if (name !== "premium") return DEFAULTS[name];
    return {
        ...DEFAULTS.premium,
        model: process.env.AI_MODEL_PREMIUM || null,
        provider: process.env.AI_PROVIDER_PREMIUM || null,
    };
}

function resolve(complexity, explicitProvider) {
    const c = tierConfig(complexity) || DEFAULTS.simple;
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
    const tier = DEFAULTS[complexity] ? complexity : "simple";
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
    narrative_synthesis: "complex",
    risk_reasoning: "complex",
    executive_briefing: "complex",
    ask_narriv: "complex",
    // Phase 10 workload classes
    routine_classification: "simple",
    narrative_analysis: "balanced",
    executive_synthesis: "complex",
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
    return Object.keys(DEFAULTS).filter((k) => tierConfig(k).model).map((k) => {
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
