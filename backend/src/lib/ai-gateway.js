/**
 * AI gateway: one entry point for routed intelligence tasks.
 *
 * Task -> tier -> model is resolved by ai-routing.js. Production behavior is
 * unchanged by default (every tier resolves to the current economical model).
 * The premium tier is used only when AI_MODEL_PREMIUM is configured AND its
 * provider is configured; otherwise the call falls back to the "complex" tier
 * and the result says so (no silent quality change).
 *
 * Every call: bounded max tokens, provider timeout + bounded SDK retries,
 * workspace budget check (premium has its own monthly cap), token/cost
 * recording with the serving model, latency, refusal and malformed-JSON
 * handling. Returns a result object; never throws for provider failures.
 */

import { routeForTask } from "./ai-routing.js";
import { getOpenAIClient } from "./ai-client.js";
import { createClaudeCompletion, isAnthropicConfigured } from "./anthropic-client.js";
import { recordTokenUsage, calculateCost, isPricedModel } from "./token-tracking.js";
import { checkBudgetAllowance } from "./cost-management.js";
import { parseModelJson } from "./ask-narriv.js";
import { recordAiEvent } from "./ai-observability.js";
import { logStructured } from "./logger.js";
import supabase from "./supabase.js";

const PREMIUM_MONTHLY_BUDGET_USD = Number(process.env.AI_PREMIUM_MONTHLY_BUDGET_USD || 10);

export function providerConfigured(provider) {
    if (provider === "anthropic") return isAnthropicConfigured();
    return Boolean(process.env.OPENAI_API_KEY) && process.env.OPENAI_API_KEY !== "sk-placeholder";
}

/** Month-to-date spend on premium models for one workspace (USD). */
export async function premiumSpendThisMonth(workspaceId, premiumModel, db = supabase) {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const { data, error } = await db
        .from("token_usage")
        .select("model, input_tokens, output_tokens")
        .eq("workspace_id", workspaceId)
        .eq("model", premiumModel)
        .gte("created_at", start.toISOString())
        .limit(10000);
    if (error) return { spend: null, error: error.message };
    return { spend: (data || []).reduce((s, r) => s + calculateCost(r.model, r.input_tokens || 0, r.output_tokens || 0), 0), error: null };
}

/**
 * Resolve the route for a task, falling back from premium when it is not
 * usable. Returns { route, fallbackReason }.
 */
export function resolveTaskRoute(task) {
    const route = routeForTask(task);
    if (route.meta.complexity === "premium" && (!route.model || !providerConfigured(route.provider))) {
        const fallback = routeForTask(task, { tierOverride: "complex" });
        return {
            route: fallback,
            fallbackReason: !route.model ? "premium model not configured (AI_MODEL_PREMIUM unset)" : `provider ${route.provider} not configured`,
        };
    }
    return { route, fallbackReason: null };
}

/**
 * Run one routed AI task.
 * @param {object} p
 * @param {string} p.task         task name registered in ai-routing.js
 * @param {string} p.workspaceId  owning workspace (required: budgets + cost attribution)
 * @param {string} p.user         user prompt
 * @param {string} [p.system]
 * @param {boolean} [p.json]      expect a JSON object response
 * @param {(obj:any)=>boolean} [p.validate]  structural validator for JSON results
 */
export async function runAiTask({ task, workspaceId, user, system = null, json = false, validate = null }, deps = {}) {
    const openai = deps.openai || null;
    const claude = deps.claude || null;
    if (!workspaceId) return { ok: false, error: "workspaceId is required", task };

    const { route, fallbackReason } = resolveTaskRoute(task);
    const base = { task, provider: route.provider, model: route.model, tier: route.meta.complexity, fallbackReason };

    if (!isPricedModel(route.model)) {
        logStructured("warn", "ai_task_unpriced_model", { task, model: route.model });
    }

    // Budget guards (fail closed on an explicit "exceeded"; budget lookup errors fail open as before).
    const allowance = await (deps.checkBudget || checkBudgetAllowance)(workspaceId);
    if (allowance && allowance.allowed === false) {
        return { ...base, ok: false, error: "budget_exceeded", detail: allowance.reason };
    }
    if (route.meta.complexity === "premium") {
        const { spend, error } = await (deps.premiumSpend || premiumSpendThisMonth)(workspaceId, route.model);
        if (error || spend === null) return { ...base, ok: false, error: "premium_budget_unknown", detail: error };
        if (spend >= PREMIUM_MONTHLY_BUDGET_USD) {
            return { ...base, ok: false, error: "premium_budget_exceeded", detail: `$${spend.toFixed(2)} of $${PREMIUM_MONTHLY_BUDGET_USD} used this month` };
        }
    }

    const started = Date.now();
    let content = null;
    let usage = { input: 0, output: 0 };
    let servedModel = route.model;
    let error = null;
    let refusal = null;
    try {
        if (route.provider === "anthropic") {
            const out = await createClaudeCompletion({ model: route.model, system, user, maxTokens: route.maxTokens }, ...(claude ? [claude] : []));
            servedModel = out.model || route.model;
            usage = { input: out.usage?.input_tokens || 0, output: out.usage?.output_tokens || 0 };
            if (out.refusal) refusal = out.refusal;
            else content = out.content;
        } else {
            const client = openai || getOpenAIClient();
            const resp = await client.chat.completions.create({
                model: route.model,
                temperature: route.temperature,
                max_tokens: route.maxTokens,
                ...(json ? { response_format: { type: "json_object" } } : {}),
                messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }],
            });
            servedModel = resp.model || route.model;
            usage = { input: resp.usage?.prompt_tokens || 0, output: resp.usage?.completion_tokens || 0 };
            content = resp.choices?.[0]?.message?.content ?? null;
        }
    } catch (e) {
        error = e?.message || String(e);
    }
    const latencyMs = Date.now() - started;

    // Record usage for every completed provider call, including refusals.
    if (!error) {
        await (deps.recordUsage || recordTokenUsage)({ workspaceId, operation: task, model: route.model, inputTokens: usage.input, outputTokens: usage.output });
    }
    const costUsd = Number(calculateCost(route.model, usage.input, usage.output).toFixed(6));
    recordAiEvent({ provider: route.provider, model: route.model, task, complexity: route.meta.complexity, latencyMs, success: !error && !refusal, error: error || (refusal ? "refusal" : null) });

    const result = { ...base, servedModel, latencyMs, usage, costUsd };
    if (error) return { ...result, ok: false, error: "provider_error", detail: error };
    if (refusal) return { ...result, ok: false, error: "model_refused", detail: refusal.category };
    if (!json) return { ...result, ok: true, content };

    const parsed = parseModelJson(content);
    if (!parsed || (validate && !validate(parsed))) {
        return { ...result, ok: false, error: "malformed_output", raw: String(content || "").slice(0, 500) };
    }
    return { ...result, ok: true, data: parsed };
}
