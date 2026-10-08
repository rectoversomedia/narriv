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
};

function resolve(complexity, explicitProvider) {
    const c = DEFAULTS[complexity] || DEFAULTS.simple;
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
export function routeCompletion({ complexity = "simple", provider = null } = {}) {
    const tier = DEFAULTS[complexity] ? complexity : "simple";
    const r = resolve(tier, provider);
    return {
        ...r,
        meta: {
            complexity: tier,
            success: null,
            latencyMs: null,
            error: null,
        },
    };
}

/**
 * List available tiers — for diagnostics or admin UIs.
 */
export function listTiers() {
    return Object.keys(DEFAULTS).map((k) => {
        const c = DEFAULTS[k];
        return {
            name: k,
            model: c.model,
            provider: c.provider || detectProviderFromModel(c.model),
            temperature: c.temperature,
            maxTokens: c.maxTokens,
        };
    });
}
