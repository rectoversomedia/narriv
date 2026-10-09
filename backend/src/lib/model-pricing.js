/**
 * Model pricing (dependency-free so scripts can use it without a database).
 */
import { logStructured } from "./logger.js";

// Pricing per 1K tokens (USD), first-party list prices.
// Anthropic prices from the Claude API model table (cached 2026-10-06).
export const PRICING = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "claude-opus-5-5": { input: 0.004, output: 0.02 },
    "claude-opus-5": { input: 0.005, output: 0.025 },
    "claude-sonnet-5-5": { input: 0.002, output: 0.01 },
    "claude-sonnet-5": { input: 0.002, output: 0.01 },
    "claude-haiku-5-5": { input: 0.0001, output: 0.0005 },
};

const warnedUnpriced = new Set();

export function isPricedModel(model) {
    return Boolean(PRICING[model]);
}

/**
 * Calculate cost from token usage. Unknown models are reported as unpriced
 * (0 with a warning) rather than silently billed at another model's rate.
 */
export function calculateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model];
    if (!pricing) {
        if (!warnedUnpriced.has(model)) {
            warnedUnpriced.add(model);
            logStructured("warn", "token_cost_unpriced_model", { model });
        }
        return 0;
    }
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
}
