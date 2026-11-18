/**
 * One chat client for every AI feature, shaped like the OpenAI SDK (`client.chat.completions.create`) so call sites
 * do not change, but able to run on either provider:
 *
 *   AI_PRIMARY_PROVIDER = "openai" (default) | "anthropic"
 *   AI_CLAUDE_MODEL     = the Claude model for this path (default claude-haiku-5-5, the price class of gpt-4o-mini)
 *
 * When the primary provider fails for a reason the other one can fix (no credits, bad key, rate limit, outage,
 * timeout), the call is repeated once on the other provider if it is configured. On 18 Nov 2026 the OpenAI account
 * ran out of credits and every analysis in production failed; with a fallback the product keeps working.
 *
 * Not for features that must ask one specific engine (AI Answers asks "ChatGPT" itself): those keep their own client.
 */
import OpenAI from "openai";
import { createClaudeCompletion, isAnthropicConfigured } from "./anthropic-client.js";
import { logStructured } from "./logger.js";

const openaiConfigured = () => {
    const k = process.env.OPENAI_API_KEY;
    return Boolean(k && k !== "sk-placeholder" && !k.startsWith("REPLACE"));
};

let openaiInstance = null;
const openai = () => (openaiInstance ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" }));

/** Errors another provider can get around; a bad request would fail there too. */
export function isProviderSideFailure(err) {
    const status = Number(err?.status ?? err?.statusCode ?? 0);
    if ([401, 402, 403, 408, 429].includes(status) || status >= 500) return true;
    return /timeout|timed out|ECONNRESET|ENOTFOUND|fetch failed|credit|quota|billing/i.test(String(err?.message || ""));
}

/** OpenAI chat messages -> one Claude system prompt and one user turn. */
export function toClaudeRequest(params) {
    const messages = params.messages || [];
    const system = messages.filter((m) => m.role === "system").map((m) => contentText(m.content)).join("\n\n");
    const rest = messages.filter((m) => m.role !== "system");
    const user = rest.length === 1
        ? contentText(rest[0].content)
        : rest.map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${contentText(m.content)}`).join("\n\n");
    const wantsJson = params.response_format?.type === "json_object";
    return {
        model: process.env.AI_CLAUDE_MODEL || "claude-haiku-5-5",
        system: [system, wantsJson ? "Reply with one valid JSON object only: no prose, no code fences." : ""].filter(Boolean).join("\n\n") || undefined,
        user,
        // Thinking is on for current Claude models and counts toward max_tokens: leave room so a short JSON
        // answer is not cut off after the reasoning (OpenAI callers ask for as little as 300).
        maxTokens: Math.min(Math.max(Number(params.max_tokens || params.max_completion_tokens || 1024), 2048), 8192),
        effort: "low",
        wantsJson,
    };
}

function contentText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n");
    return String(content ?? "");
}

/** A JSON reply sometimes arrives inside ```json fences; keep only the object. */
function cleanJson(text) {
    const t = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = t.indexOf("{"), end = t.lastIndexOf("}");
    return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

async function viaClaude(params, deps) {
    const req = toClaudeRequest(params);
    const res = await (deps.claude || createClaudeCompletion)(req);
    if (res.refusal) {
        const err = new Error("The model declined this request.");
        err.code = "AI_REFUSAL";
        throw err;
    }
    const content = req.wantsJson ? cleanJson(res.content) : res.content;
    return {
        id: `claude-${Date.now()}`,
        model: res.model,
        provider: "anthropic",
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: res.stopReason === "max_tokens" ? "length" : "stop" }],
        usage: { prompt_tokens: res.usage?.input_tokens ?? 0, completion_tokens: res.usage?.output_tokens ?? 0, total_tokens: (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0) },
    };
}

async function viaOpenAI(params, options, deps) {
    const resp = await (deps.openai || openai()).chat.completions.create(params, options);
    return Object.assign(resp, { provider: "openai" });
}

/** Providers in the order to try them, keeping only configured ones. */
export function providerOrder(env = process.env, configured = { openai: openaiConfigured(), anthropic: isAnthropicConfigured() }) {
    const primary = env.AI_PRIMARY_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const order = primary === "anthropic" ? ["anthropic", "openai"] : ["openai", "anthropic"];
    return order.filter((p) => configured[p]);
}

/**
 * A hard monthly ceiling on AI calls for the whole platform (NARRIV_AI_MONTHLY_CALL_CAP, default 3000, about $1-2 a
 * month on Haiku). The Claude credit is shared with other projects, so Narriv must never run it down: past the cap AI
 * calls stop until the next month, and records are stored without a sentiment (the daily backfill finishes them later).
 * Counted from token_usage, cached for ten minutes so the check itself costs one query per instance now and then.
 */
let capCache = { at: 0, month: "", count: 0 };
export async function monthlyCallsUsed(db = null, now = new Date()) {
    // Loaded on first use: importing the database client at module load would make this file need DB settings.
    db ??= (await import("./supabase.js")).default;
    const month = now.toISOString().slice(0, 7);
    if (capCache.month === month && Date.now() - capCache.at < 10 * 60 * 1000) return capCache.count;
    const { count, error } = await db.from("token_usage").select("id", { count: "exact", head: true }).gte("created_at", `${month}-01T00:00:00Z`);
    if (error) return capCache.month === month ? capCache.count : 0;
    capCache = { at: Date.now(), month, count: count || 0 };
    return capCache.count;
}

export async function assertWithinMonthlyCap(deps = {}) {
    const cap = Number(process.env.NARRIV_AI_MONTHLY_CALL_CAP || 3000);
    if (!(cap > 0)) return;
    const used = await (deps.monthlyCallsUsed || monthlyCallsUsed)();
    if (used >= cap) {
        logStructured("warn", "ai_monthly_cap_reached", { used, cap });
        throw Object.assign(new Error(`Monthly AI limit reached (${used}/${cap} calls).`), { code: "AI_MONTHLY_CAP" });
    }
    capCache.count += 1; // count this call too until the next refresh
}

export function createChatClient(deps = {}) {
    return {
        chat: {
            completions: {
                async create(params, options) {
                    await assertWithinMonthlyCap(deps);
                    const order = deps.order || providerOrder();
                    if (!order.length) throw Object.assign(new Error("No AI provider is configured."), { code: "AI_NOT_CONFIGURED" });
                    let lastErr;
                    for (let i = 0; i < order.length; i++) {
                        const provider = order[i];
                        try {
                            return provider === "anthropic" ? await viaClaude(params, deps) : await viaOpenAI(params, options, deps);
                        } catch (err) {
                            lastErr = err;
                            const next = order[i + 1];
                            if (!next || !isProviderSideFailure(err)) throw err;
                            logStructured("warn", "ai_provider_fallback", { from: provider, to: next, reason: String(err?.message || err).slice(0, 200) });
                        }
                    }
                    throw lastErr;
                },
            },
        },
    };
}

let shared = null;
/** The shared client for the app (tests pass their own via createChatClient). */
export function getChatClient() {
    return (shared ??= createChatClient());
}

export const anyAiConfigured = () => providerOrder().length > 0;

/** The model that normally answers, for labelling stored analyses (a one-off fallback is not reflected). */
export function primaryModelLabel(env = process.env) {
    return env.AI_PRIMARY_PROVIDER === "anthropic" ? (env.AI_CLAUDE_MODEL_LOCK || env.AI_CLAUDE_MODEL || "claude-haiku-5-5") : (env.AI_MODEL || "gpt-4o-mini");
}
