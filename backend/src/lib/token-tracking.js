import supabase from "./supabase.js";
import { v4 as uuidv4 } from "uuid";

// Pricing per 1K tokens (USD) — gpt-4o-mini
const PRICING = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
};

/**
 * Calculate cost from token usage.
 */
export function calculateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model] || PRICING["gpt-4o-mini"];
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
}

/**
 * Track token usage for a workspace.
 */
export async function trackTokenUsage(workspaceId, model, tokensUsed, latencyMs) {
    try {
        const today = new Date().toISOString().split("T")[0];

        // First try to find existing record for this workspace/date/model
        const { data: existing } = await supabase
            .from('token_usage')
            .select('id, total_tokens, call_count, total_latency_ms')
            .eq('workspace_id', workspaceId)
            .eq('date', today)
            .eq('model', model)
            .single();

        if (existing) {
            // Update existing record
            await supabase
                .from('token_usage')
                .update({
                    total_tokens: existing.total_tokens + tokensUsed,
                    call_count: existing.call_count + 1,
                    total_latency_ms: existing.total_latency_ms + latencyMs,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
        } else {
            // Insert new record
            await supabase
                .from('token_usage')
                .insert({
                    id: uuidv4(),
                    workspace_id: workspaceId,
                    date: today,
                    model: model,
                    total_tokens: tokensUsed,
                    call_count: 1,
                    total_latency_ms: latencyMs,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
        }
    } catch (error) {
        // Token tracking is best-effort, don't fail the analysis
    }
}

/**
 * Get token usage summary for a workspace.
 */
export async function getTokenUsageSummary(workspaceId, days = 30) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data: usage, error } = await supabase
            .from('token_usage')
            .select('date, model, total_tokens, call_count, total_latency_ms')
            .eq('workspace_id', workspaceId)
            .gte('date', since.toISOString().split('T')[0])
            .order('date', { ascending: false });

        if (error || !usage) {
            return { totalTokens: 0, totalCalls: 0, averageLatencyMs: 0, estimatedCost: 0, daily: [] };
        }

        const totalTokens = usage.reduce((sum, u) => sum + u.total_tokens, 0);
        const totalCalls = usage.reduce((sum, u) => sum + u.call_count, 0);
        const totalLatency = usage.reduce((sum, u) => sum + u.total_latency_ms, 0);
        const estimatedCost = usage.reduce((sum, u) => sum + calculateCost(u.model, u.total_tokens, 0), 0);

        return {
            totalTokens,
            totalCalls,
            averageLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
            estimatedCost: Number(estimatedCost.toFixed(4)),
            daily: usage.map(u => ({
                date: u.date,
                model: u.model,
                totalTokens: u.total_tokens,
                callCount: u.call_count,
                totalLatencyMs: u.total_latency_ms,
            })),
        };
    } catch (error) {
        return { totalTokens: 0, totalCalls: 0, averageLatencyMs: 0, estimatedCost: 0, daily: [] };
    }
}
