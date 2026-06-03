import { getOpenAIClient, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from "./ai-client.js";
import { logStructured } from "./logger.js";

/**
 * Call OpenAI with messages and return the parsed response.
 * @param {Array} messages - OpenAI messages array
 * @param {Object} options - { model, temperature, maxTokens, workspaceId }
 * @returns {Promise<{ content: string, tokensUsed: number }>}
 */
export async function callOpenAI(messages, options = {}) {
    const client = getOpenAIClient();
    const model = options.model || AI_MODEL;
    const temperature = options.temperature ?? AI_TEMPERATURE;
    const maxTokens = options.maxTokens || AI_MAX_TOKENS;

    const startTime = Date.now();

    try {
        const response = await client.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: options.jsonMode ? { type: "json_object" } : undefined,
        });

        const content = response.choices?.[0]?.message?.content || "";
        const tokensUsed = response.usage?.total_tokens || 0;
        const latencyMs = Date.now() - startTime;

        logStructured("info", "ai_call_completed", {
            model,
            tokensUsed,
            latencyMs,
            messageCount: messages.length,
        });

        // Track token usage if workspaceId provided
        if (options.workspaceId) {
            try {
                const { trackTokenUsage } = await import("./token-tracking.js");
                await trackTokenUsage(options.workspaceId, model, tokensUsed, latencyMs);
            } catch {
                // Best-effort tracking
            }
        }

        return { content, tokensUsed, latencyMs };
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        logStructured("error", "ai_call_failed", {
            model,
            latencyMs,
            error: error.message,
        });
        throw error;
    }
}

/**
 * Safe JSON parse with error handling.
 */
export function tryParseJSON(raw) {
    try {
        const parsed = JSON.parse(raw);
        return { ok: true, data: parsed };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

/**
 * Call OpenAI with retry and JSON correction.
 * @param {Array} messages - OpenAI messages array
 * @param {Function} validator - Function that validates parsed output, throws on invalid
 * @param {Object} options - { maxRetries, jsonMode, ... }
 * @returns {Promise<Object>} - Parsed and validated output
 */
export async function callAndRetryWithCorrection(messages, validator, options = {}) {
    const { maxRetries = 1, jsonMode = true, ...callOptions } = options;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const currentMessages = attempt === 0 ? messages : [
                ...messages,
                {
                    role: "user",
                    content: "Your previous response was not valid JSON or did not match the required schema. Please fix the issues and return valid JSON only.",
                },
            ];

            const { content } = await callOpenAI(currentMessages, { ...callOptions, jsonMode });

            const parseResult = tryParseJSON(content);
            if (!parseResult.ok) {
                lastError = new Error(`JSON parse failed: ${parseResult.error}`);
                continue;
            }

            const validated = validator(parseResult.data);
            return validated;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                logStructured("warn", "ai_retry", { attempt: attempt + 1, error: error.message });
            }
        }
    }

    throw lastError || new Error("AI call failed after all retries");
}

/**
 * Truncate text to fit within a character limit.
 */
export function truncateText(text, maxLength = 2000) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
}
