/**
 * Anthropic Client (ADDITIVE)
 *
 * Mirrors the structure of ai-client.js but for Anthropic Claude models.
 * This module is OPT-IN — no existing Narriv code uses it yet. It exists
 * so that new intelligence workloads can route to Anthropic when
 * frontier reasoning is needed.
 *
 * IMPORTANT:
 * - No existing AI call site has been migrated. The 14 existing OpenAI
 *   callers continue using getOpenAIClient() and AI_MODEL unchanged.
 * - Anthropic is invoked only when a new caller explicitly opts in via
 *   getAnthropicClient() + AnthropicMessages.create().
 * - The client is lazily initialized. If ANTHROPIC_API_KEY is unset,
 *   callers receive a clear error and can fall back to OpenAI.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logStructured } from "./logger.js";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey || apiKey === "sk-ant-placeholder") {
    logStructured("warn", "[AI] ANTHROPIC_API_KEY is not set or is a placeholder. Anthropic features will fail until configured.");
}

let clientInstance = null;

export function getAnthropicClient() {
    if (!clientInstance) {
        if (!apiKey || apiKey === "sk-ant-placeholder") {
            throw new Error("Anthropic is not configured: ANTHROPIC_API_KEY is missing.");
        }
        clientInstance = new Anthropic({ apiKey });
    }
    return clientInstance;
}

/**
 * Default Anthropic model. Configurable via env. The default is the
 * current strongest available Claude model at the time of this module.
 * Verify against your Anthropic account's available models before
 * changing in production.
 */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
export const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 4096);
export const ANTHROPIC_TEMPERATURE = Number(process.env.ANTHROPIC_TEMPERATURE || 0.4);
