/**
 * Ask Narriv (BACKEND FOUNDATION)
 *
 * Provides a clean backend interface that the existing / future UI can
 * consume. The function builds a deterministic data context from
 * actual Narriv tables and then asks the configured AI to produce a
 * grounded, evidence-aware answer.
 *
 * Strict rules:
 *   - The answer is grounded in the data context.
 *   - If the data is insufficient, the function returns an answer that
 *     explicitly says so.
 *   - The model never gets raw user prompts without context. The system
 *     prompt is fixed and instructs the model to refuse to fabricate.
 *   - Output includes a "grounded" boolean and a "sources" array.
 */

import { runAiTask } from "./ai-gateway.js";
import { logStructured } from "./logger.js";
import { baseSupabaseAdmin } from "./supabase.js";

const SYSTEM_PROMPT = `You are Ask Narriv, an assistant that answers questions about a workspace's media-monitoring data.
Rules:
1. Only use the data context provided below.
2. If the data is insufficient to answer, say so explicitly.
3. Never fabricate sources, citations, or counts.
4. Prefer short, structured answers.
5. Always include a "sources" array of evidence IDs you actually referenced.
6. Always include a "grounded" boolean — true if the answer is fully supported by the data, false otherwise.`;

async function gatherContext(workspaceId, windowHours) {
    const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const [signals, alerts, clusters] = await Promise.all([
        baseSupabaseAdmin.from("signals").select("id, sentiment, platform, captured_at, title").eq("workspace_id", workspaceId).gte("captured_at", sinceIso).order("captured_at", { ascending: false }).limit(50).then((r) => r.data || []),
        baseSupabaseAdmin.from("alerts").select("id, severity, status, created_at").eq("workspace_id", workspaceId).gte("created_at", sinceIso).limit(20).then((r) => r.data || []),
        baseSupabaseAdmin.from("narrative_clusters").select("id, title, signal_count, sentiment, updated_at").eq("workspace_id", workspaceId).order("signal_count", { ascending: false, nullsFirst: false }).limit(10).then((r) => r.data || []),
    ]);
    return { signals, alerts, clusters, sinceIso, windowHours };
}

const ASK_ERRORS = {
    budget_exceeded: "This workspace has reached its AI usage budget for the month.",
    provider_error: "The AI provider failed to respond. Please try again shortly.",
    malformed_output: "The AI response could not be verified, so it was discarded. Please try again.",
    model_refused: "The AI model declined to answer this question.",
};

// Models often wrap JSON in ```json fences; strip them before parsing.
export function parseModelJson(raw) {
    const text = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(text); } catch { /* fall through */ }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// Only keep cited sources whose ids were actually in the data context.
export function keepKnownSources(sources, ctx) {
    const known = new Set([...ctx.signals, ...ctx.alerts, ...ctx.clusters].map((r) => r.id));
    return (Array.isArray(sources) ? sources : [])
        .map((src) => (typeof src === "string" ? { id: src } : src))
        .filter((src) => src && known.has(src.id));
}

export async function askNarriv({ workspaceId, question, windowHours = 24 }, deps = {}) {
    if (!workspaceId) return { grounded: false, error: "workspaceId is required" };
    if (!question || typeof question !== "string") return { grounded: false, error: "question is required" };

    const ctx = await (deps.gatherContext || gatherContext)(workspaceId, windowHours);
    const dataIsEmpty = ctx.signals.length === 0 && ctx.alerts.length === 0 && ctx.clusters.length === 0;

    const dataSection = `Window: last ${windowHours}h (since ${ctx.sinceIso})\n` +
        `Signals: ${ctx.signals.length}\n` +
        `Alerts: ${ctx.alerts.length}\n` +
        `Narrative clusters: ${ctx.clusters.length}\n\n` +
        `Recent signals (id | sent | platform | title):\n` +
        ctx.signals.slice(0, 10).map((s) => `  ${s.id} | ${s.sentiment || "?"} | ${s.platform || "?"} | ${(s.title || "").slice(0, 80)}`).join("\n") +
        `\n\nActive alerts (id | severity | status):\n` +
        ctx.alerts.map((a) => `  ${a.id} | ${a.severity || "?"} | ${a.status || "?"}`).join("\n") +
        `\n\nLargest narrative clusters (id | signal_count | title):\n` +
        ctx.clusters.map((c) => `  ${c.id} | n=${c.signal_count} | ${c.title}`).join("\n");

    if (dataIsEmpty) {
        return {
            grounded: true,
            answer: "There is no data in the current window, so I cannot answer the question. Try a wider window or wait for signals to arrive.",
            sources: [],
            data: { signals: 0, alerts: 0, clusters: 0, windowHours },
        };
    }

    const out = await runAiTask({
        task: "ask_narriv",
        workspaceId,
        system: SYSTEM_PROMPT,
        user: `DATA CONTEXT:\n${dataSection}\n\nQUESTION: ${question}\n\nRespond in JSON with keys: answer (string), sources (array of {id, kind}), grounded (boolean).`,
        json: true,
        validate: (o) => typeof o?.answer === "string" && o.answer.trim().length > 0,
    }, deps);
    const meta = { model: out.servedModel || out.model || null, latencyMs: out.latencyMs ?? null, costUsd: out.costUsd ?? null };
    logStructured("info", "[AskNarriv]", { workspaceId, question: question.slice(0, 80), ok: out.ok, error: out.error || null, model: meta.model, latencyMs: meta.latencyMs });
    if (!out.ok) {
        // Never surface unverified model text or raw provider errors as an answer.
        return { grounded: false, error: ASK_ERRORS[out.error] || "The AI service could not answer this question.", code: out.error, meta };
    }
    const sources = keepKnownSources(out.data.sources, ctx);
    // Grounded only when the model says so AND at least one cited id exists in this workspace's context.
    return {
        answer: out.data.answer,
        sources,
        grounded: out.data.grounded === true && sources.length > 0,
        meta,
        data: { signals: ctx.signals.length, alerts: ctx.alerts.length, clusters: ctx.clusters.length, windowHours },
    };
}
