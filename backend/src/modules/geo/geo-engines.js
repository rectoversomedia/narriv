/**
 * The five AI assistants Narriv checks for GEO (how AI answers mention a brand). Each one is asked the test
 * prompt the way a person would ask it, through its own API, and the plain answer is scored by the same
 * analysis for every engine. An engine without an API key is reported as not connected, never simulated.
 *
 * ChatGPT, DeepSeek and Perplexity speak the OpenAI chat-completions format; Claude and Gemini have their own.
 * Models can be changed per engine with GEO_<KEY>_MODEL.
 */

import { getAnthropicClient, isAnthropicConfigured } from "../../lib/anthropic-client.js";
import { logStructured } from "../../lib/logger.js";

export const GEO_ENGINES = [
    { key: "chatgpt", name: "ChatGPT", kind: "openai", envKey: "OPENAI_API_KEY", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    { key: "gemini", name: "Gemini", kind: "gemini", envKey: "GEMINI_API_KEY", model: "gemini-2.5-flash" },
    { key: "claude", name: "Claude", kind: "anthropic", envKey: "ANTHROPIC_API_KEY", model: "claude-haiku-5-5" },
    { key: "perplexity", name: "Perplexity", kind: "openai", envKey: "PERPLEXITY_API_KEY", baseUrl: "https://api.perplexity.ai", model: "sonar" },
    { key: "deepseek", name: "DeepSeek", kind: "openai", envKey: "DEEPSEEK_API_KEY", baseUrl: "https://api.deepseek.com", model: "deepseek-chat" },
];

/** Stored engine names from before per-engine testing, mapped to the engine they ran on. */
const LEGACY_ENGINE_KEYS = { "gpt-4o-mini-simulated": "chatgpt", "gpt-4o-mini": "chatgpt", openai: "chatgpt" };

export function engineKeyFor(storedName) {
    const name = String(storedName || "").toLowerCase();
    if (GEO_ENGINES.some((e) => e.key === name)) return name;
    return LEGACY_ENGINE_KEYS[name] || null;
}

function apiKey(engine) {
    const value = process.env[engine.envKey];
    return value && !/placeholder/i.test(value) ? value : null;
}

export function modelFor(engine) {
    return process.env[`GEO_${engine.key.toUpperCase()}_MODEL`] || engine.model;
}

export function isEngineConfigured(engine) {
    return engine.kind === "anthropic" ? isAnthropicConfigured() : Boolean(apiKey(engine));
}

export function engineStatus() {
    return GEO_ENGINES.map((engine) => ({ key: engine.key, name: engine.name, model: modelFor(engine), configured: isEngineConfigured(engine) }));
}

const SYSTEM = "Jawab dalam Bahasa Indonesia, seperti menjawab pertanyaan pengguna biasa.";
const TIMEOUT_MS = 45_000;

async function postJson(url, headers, body) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${json?.error?.message || json?.message || "request failed"}`.slice(0, 200));
    return json;
}

/** The engine's plain answer to one prompt. Throws when the engine is not configured or the call fails. */
export async function askEngine(engine, prompt) {
    if (!isEngineConfigured(engine)) throw new Error(`${engine.name} is not connected (${engine.envKey} missing)`);
    const model = modelFor(engine);
    const startedAt = Date.now();
    try {
        let text = "";
        if (engine.kind === "openai") {
            const json = await postJson(`${engine.baseUrl}/chat/completions`, { authorization: `Bearer ${apiKey(engine)}` }, {
                model,
                messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
                max_tokens: 800,
            });
            text = json.choices?.[0]?.message?.content || "";
        } else if (engine.kind === "gemini") {
            const json = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { "x-goog-api-key": apiKey(engine) }, {
                systemInstruction: { parts: [{ text: SYSTEM }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 800 },
            });
            text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
        } else {
            const msg = await getAnthropicClient().messages.create({ model, max_tokens: 800, system: SYSTEM, messages: [{ role: "user", content: prompt }] });
            text = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
        }
        logStructured("info", "geo_engine_answered", { engine: engine.key, model, latencyMs: Date.now() - startedAt, chars: text.length });
        return text;
    } catch (error) {
        logStructured("warn", "geo_engine_failed", { engine: engine.key, model, error: error.message });
        throw error;
    }
}
