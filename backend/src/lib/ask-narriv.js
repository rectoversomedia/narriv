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

import { getOpenAIClient } from "./ai-client.js";
import { routeForTask, listTiers } from "./ai-routing.js";
import { recordAiEvent } from "./ai-observability.js";
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
        baseSupabaseAdmin.from("narrative_clusters").select("id, title, momentum, signal_count, sentiment_score").eq("workspace_id", workspaceId).order("momentum", { ascending: false }).limit(10).then((r) => r.data || []),
    ]);
    return { signals, alerts, clusters, sinceIso, windowHours };
}

export async function askNarriv({ workspaceId, question, windowHours = 24 }) {
    if (!workspaceId) return { grounded: false, error: "workspaceId is required" };
    if (!question || typeof question !== "string") return { grounded: false, error: "question is required" };

    const ctx = await gatherContext(workspaceId, windowHours);
    const dataIsEmpty = ctx.signals.length === 0 && ctx.alerts.length === 0 && ctx.clusters.length === 0;

    const dataSection = `Window: last ${windowHours}h (since ${ctx.sinceIso})\n` +
        `Signals: ${ctx.signals.length}\n` +
        `Alerts: ${ctx.alerts.length}\n` +
        `Narrative clusters: ${ctx.clusters.length}\n\n` +
        `Recent signals (id | sent | platform | title):\n` +
        ctx.signals.slice(0, 10).map((s) => `  ${s.id} | ${s.sentiment || "?"} | ${s.platform || "?"} | ${(s.title || "").slice(0, 80)}`).join("\n") +
        `\n\nActive alerts (id | severity | status):\n` +
        ctx.alerts.map((a) => `  ${a.id} | ${a.severity || "?"} | ${a.status || "?"}`).join("\n") +
        `\n\nTop clusters (id | momentum | signal_count | title):\n` +
        ctx.clusters.map((c) => `  ${c.id} | momentum=${c.momentum} | n=${c.signal_count} | ${c.title}`).join("\n");

    if (dataIsEmpty) {
        return {
            grounded: true,
            answer: "There is no data in the current window, so I cannot answer the question. Try a wider window or wait for signals to arrive.",
            sources: [],
            data: { signals: 0, alerts: 0, clusters: 0, windowHours },
        };
    }

    const route = routeForTask("ask_narriv");
    const start = Date.now();
    let content = null;
    let error = null;
    let success = false;
    try {
        const client = getOpenAIClient();
        const resp = await client.chat.completions.create({
            model: route.model,
            temperature: route.temperature,
            max_tokens: route.maxTokens,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `DATA CONTEXT:\n${dataSection}\n\nQUESTION: ${question}\n\nRespond in JSON with keys: answer (string), sources (array of {id, kind}), grounded (boolean).` },
            ],
        });
        const raw = resp.choices?.[0]?.message?.content || "";
        try {
            const parsed = JSON.parse(raw);
            content = parsed;
        } catch {
            content = { answer: raw, sources: [], grounded: false };
        }
        success = true;
    } catch (e) {
        error = e?.message || String(e);
    }
    const latencyMs = Date.now() - start;
    recordAiEvent({
        provider: route.provider,
        model: route.model,
        task: "ask_narriv",
        complexity: route.meta?.complexity || "complex",
        latencyMs,
        success,
        error,
    });
    logStructured("info", "[AskNarriv]", { workspaceId, question: question.slice(0, 80), latencyMs, success, error });
    if (error) {
        return { grounded: false, error, route: { provider: route.provider, model: route.model } };
    }
    return { ...content, data: { signals: ctx.signals.length, alerts: ctx.alerts.length, clusters: ctx.clusters.length, windowHours } };
}
