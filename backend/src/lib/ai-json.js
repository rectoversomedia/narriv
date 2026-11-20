/** One budget-gated, token-metered JSON call to the cheap model (Haiku first). Returns the parsed object or null. */
import { anyAiConfigured, getChatClient } from "./chat-client.js";
import { checkBudgetAllowance } from "./cost-management.js";
import { recordTokenUsage } from "./token-tracking.js";
import { logStructured } from "./logger.js";

export async function aiJson({ workspaceId, operation, system, user, maxTokens = 900, chat }) {
    if (!chat && !anyAiConfigured()) return null;
    const allowance = workspaceId ? await checkBudgetAllowance(workspaceId).catch(() => ({ allowed: true })) : { allowed: true };
    if (allowance?.allowed === false) return null;
    try {
        const client = chat || getChatClient();
        const res = await client.chat.completions.create({
            messages: [{ role: "system", content: `${system} Return JSON only.` }, { role: "user", content: user }],
            response_format: { type: "json_object" },
            max_tokens: maxTokens,
            temperature: 0.2,
        });
        const usage = res?.usage || {};
        if (workspaceId) await recordTokenUsage({ workspaceId, operation, model: res?.model || "claude-haiku", inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0 }).catch(() => {});
        const raw = String(res?.choices?.[0]?.message?.content || "{}").replace(/^```(?:json)?\s*|\s*```$/g, "");
        return JSON.parse(raw);
    } catch (error) {
        logStructured("warn", "ai_json_failed", { operation, error: error?.message || error });
        return null;
    }
}
