import supabase from "./supabase.js";
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

/**
 * Record one AI call in token_usage
 * (columns: workspace_id, operation, model, input_tokens, output_tokens, cost).
 * Best-effort: never throws, but logs failures so missing cost data is visible.
 */
export async function recordTokenUsage({ workspaceId, operation = "ai_call", model = "gpt-4o-mini", inputTokens = 0, outputTokens = 0 }) {
    if (!workspaceId) return;
    try {
        const { error } = await supabase.from("token_usage").insert({
            workspace_id: workspaceId,
            operation,
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost: Number(calculateCost(model, inputTokens, outputTokens).toFixed(6)),
        });
        if (error) throw error;
    } catch (error) {
        logStructured("warn", "token_usage_record_failed", { workspaceId, operation, error: error?.message });
    }
}

/**
 * Legacy signature kept for existing callers (ai-utils). Total tokens are
 * recorded as input tokens when the split is unknown.
 */
export async function trackTokenUsage(workspaceId, model, tokensUsed, _latencyMs, operation = "ai_call") {
    await recordTokenUsage({ workspaceId, operation, model, inputTokens: tokensUsed || 0, outputTokens: 0 });
}

/**
 * Get token usage summary for a workspace.
 */
export async function getTokenUsageSummary(workspaceId, days = 30) {
    const empty = { totalTokens: 0, totalCalls: 0, averageLatencyMs: 0, estimatedCost: 0, daily: [] };
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data: usage, error } = await supabase
            .from("token_usage")
            .select("created_at, model, input_tokens, output_tokens, cost")
            .eq("workspace_id", workspaceId)
            .gte("created_at", since.toISOString())
            .order("created_at", { ascending: false })
            .limit(10000);

        if (error || !usage) return empty;

        // Aggregate per day + model to keep the existing response shape.
        const byDay = new Map();
        for (const u of usage) {
            const date = String(u.created_at).slice(0, 10);
            const key = `${date}|${u.model}`;
            const row = byDay.get(key) || { date, model: u.model, totalTokens: 0, callCount: 0, totalLatencyMs: 0, cost: 0 };
            row.totalTokens += (u.input_tokens || 0) + (u.output_tokens || 0);
            row.callCount += 1;
            // token_usage.cost is NUMERIC(10,2); derive the exact cost from tokens.
            row.cost += calculateCost(u.model, u.input_tokens || 0, u.output_tokens || 0);
            byDay.set(key, row);
        }
        const daily = [...byDay.values()];

        return {
            totalTokens: daily.reduce((sum, d) => sum + d.totalTokens, 0),
            totalCalls: usage.length,
            averageLatencyMs: 0,
            estimatedCost: Number(daily.reduce((sum, d) => sum + d.cost, 0).toFixed(4)),
            daily: daily.map(({ cost, ...d }) => d),
        };
    } catch (error) {
        return empty;
    }
}
