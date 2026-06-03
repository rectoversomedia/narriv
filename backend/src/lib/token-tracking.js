import prisma from "../prisma.js";

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

        await prisma.$executeRaw`
            INSERT INTO "TokenUsage" ("id", "workspaceId", "date", "model", "totalTokens", "callCount", "totalLatencyMs", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${workspaceId}, ${today}::date, ${model}, ${tokensUsed}, 1, ${latencyMs}, NOW(), NOW())
            ON CONFLICT ("workspaceId", "date", "model")
            DO UPDATE SET
                "totalTokens" = "TokenUsage"."totalTokens" + ${tokensUsed},
                "callCount" = "TokenUsage"."callCount" + 1,
                "totalLatencyMs" = "TokenUsage"."totalLatencyMs" + ${latencyMs},
                "updatedAt" = NOW()
        `;
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

        const usage = await prisma.tokenUsage.findMany({
            where: {
                workspaceId,
                date: { gte: since },
            },
            orderBy: { date: "desc" },
        });

        const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
        const totalCalls = usage.reduce((sum, u) => sum + u.callCount, 0);
        const totalLatency = usage.reduce((sum, u) => sum + u.totalLatencyMs, 0);
        const estimatedCost = usage.reduce((sum, u) => sum + calculateCost(u.model, u.totalTokens, 0), 0);

        return {
            totalTokens,
            totalCalls,
            averageLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
            estimatedCost: Number(estimatedCost.toFixed(4)),
            daily: usage,
        };
    } catch (error) {
        return { totalTokens: 0, totalCalls: 0, averageLatencyMs: 0, estimatedCost: 0, daily: [] };
    }
}
