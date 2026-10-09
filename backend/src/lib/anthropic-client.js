/**
 * Anthropic Client (ADDITIVE, opt-in)
 *
 * Used only by callers that explicitly route to provider "anthropic"
 * (currently POST /ai/complete). Production analysis still runs on OpenAI.
 *
 * Model behavior is described by capabilities, not inferred from the name at
 * call sites: newer Claude models reject sampling parameters and take an
 * `effort` setting instead, and may stop with stop_reason "refusal".
 */

import Anthropic from "@anthropic-ai/sdk";
import { logStructured } from "./logger.js";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey || apiKey === "sk-ant-placeholder") {
    logStructured("warn", "[AI] ANTHROPIC_API_KEY is not set or is a placeholder. Anthropic features will fail until configured.");
}

let clientInstance = null;

export function isAnthropicConfigured() {
    return Boolean(apiKey && apiKey !== "sk-ant-placeholder");
}

export function getAnthropicClient() {
    if (!clientInstance) {
        if (!isAnthropicConfigured()) {
            throw new Error("Anthropic is not configured: ANTHROPIC_API_KEY is missing.");
        }
        // Explicit timeout (ms) and retry budget; the SDK retries 408/409/429/5xx.
        clientInstance = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
    }
    return clientInstance;
}

/**
 * Premium reasoning model. Claude Opus 5.5 (`claude-opus-5-5`) is the default;
 * override with ANTHROPIC_MODEL. No production workload is routed here unless
 * a tier is explicitly configured to a claude-* model.
 */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 4096);
export const ANTHROPIC_EFFORT = process.env.ANTHROPIC_EFFORT || "medium";

// Capabilities per model family (see Anthropic model docs). `sampling: false`
// means temperature/top_p are rejected; `effort` means output_config.effort is
// supported; `serverFallback` means the server-side refusal fallback is offered.
const CAPABILITIES = [
    { prefix: "claude-opus-5-5", sampling: false, effort: true, serverFallback: true },
    { prefix: "claude-opus-5", sampling: false, effort: true, serverFallback: true },
    { prefix: "claude-sonnet-5-5", sampling: false, effort: true, serverFallback: true },
    { prefix: "claude-sonnet-5", sampling: false, effort: true, serverFallback: false },
    { prefix: "claude-haiku-5-5", sampling: false, effort: true, serverFallback: false },
    { prefix: "claude-fable-5", sampling: false, effort: true, serverFallback: true },
    { prefix: "claude-opus-4-8", sampling: false, effort: true, serverFallback: false },
    { prefix: "claude-opus-4-7", sampling: false, effort: true, serverFallback: false },
];

export function modelCapabilities(model) {
    const hit = CAPABILITIES.find((c) => String(model).startsWith(c.prefix));
    // Unknown/older models: allow sampling, no effort parameter.
    return hit || { prefix: null, sampling: true, effort: false, serverFallback: false };
}

/** Build a Messages API request that respects the model's capabilities. */
export function buildClaudeRequest({ model = ANTHROPIC_MODEL, system, user, maxTokens = ANTHROPIC_MAX_TOKENS, temperature, effort = ANTHROPIC_EFFORT }) {
    const caps = modelCapabilities(model);
    const req = {
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: user }],
    };
    if (system) req.system = system;
    if (caps.sampling && typeof temperature === "number") req.temperature = temperature;
    if (caps.effort && effort) req.output_config = { effort };
    if (caps.serverFallback) {
        // Server-side fallback on safety refusals (beta); routes by refusal category.
        req.betas = ["server-side-fallback-2026-07-01"];
        req.fallbacks = "default";
    }
    return req;
}

/**
 * Run one Claude completion. Returns { content, model, usage, stopReason,
 * refusal }. A refusal is returned explicitly, never as successful content.
 */
export async function createClaudeCompletion(opts, client = getAnthropicClient()) {
    const req = buildClaudeRequest(opts);
    const resp = req.betas ? await client.beta.messages.create(req) : await client.messages.create(req);
    if (resp.stop_reason === "refusal") {
        return {
            content: null,
            model: resp.model,
            usage: resp.usage,
            stopReason: "refusal",
            refusal: { category: resp.stop_details?.category ?? null },
        };
    }
    const content = (resp.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    return { content, model: resp.model, usage: resp.usage, stopReason: resp.stop_reason, refusal: null };
}
