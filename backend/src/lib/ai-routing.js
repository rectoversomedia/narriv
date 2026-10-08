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
 * All routing is configured via environment variables. Defaults are safe
 * (gpt-4o-mini) and pre-existing behavior is preserved.
 *
 * IMPORTANT: This module is ADDITIVE. It does not modify any existing call
 * site or change behavior for any caller that does not opt in via
 * routeCompletion().
 */

const DEFAULTS = {
    simple: {
        model: process.env.AI_MODEL_SIMPLE || "gpt-4o-mini",
        temperature: 0.2,
        maxTokens: 1024,
    },
    balanced: {
        model: process.env.AI_MODEL_BALANCED || "gpt-4o-mini",
        temperature: 0.3,
        maxTokens: 2048,
    },
    complex: {
        model: process.env.AI_MODEL_COMPLEX || "gpt-4o-mini",
        temperature: 0.4,
        maxTokens: 4096,
    },
};

function resolve(complexity) {
    const c = DEFAULTS[complexity] || DEFAULTS.simple;
    return {
        provider: "openai",
        model: c.model,
        temperature: c.temperature,
        maxTokens: c.maxTokens,
    };
}

/**
 * Route a completion request by complexity tier.
 * Returns { provider, model, temperature, maxTokens, meta }.
 *
 * meta = { complexity, latencyMs, success, error } for observability.
 * Populated by the caller after the call completes (we don't time here
 * to keep this module side-effect-free).
 */
export function routeCompletion({ complexity = "simple" } = {}) {
    const tier = DEFAULTS[complexity] ? complexity : "simple";
    const r = resolve(tier);
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
    return Object.keys(DEFAULTS).map((k) => ({
        name: k,
        model: DEFAULTS[k].model,
        temperature: DEFAULTS[k].temperature,
        maxTokens: DEFAULTS[k].maxTokens,
    }));
}
