import crypto from "crypto";
import OpenAI from "openai";
import { validateAIOutput } from "./ai.schema.js";
import { logStructured } from "../../lib/logger.js";
import { incrementAIFailure } from "../../lib/metrics.js";
import { recordTokenUsage } from "../../lib/token-tracking.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    logStructured("warn", "[AI SERVICE] WARNING: OPENAI_API_KEY is not set. AI features will be disabled.");
}

// Initialize the OpenAI client
const client = OPENAI_API_KEY ? new OpenAI({
    apiKey: OPENAI_API_KEY,
}) : null;

class AIAnalysisError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "AIAnalysisError";
        this.details = details;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the strict system prompt for signal analysis.
 * Emphasizes pure JSON output with no markdown or explanation.
 */
function buildSignalSystemPrompt() {
    return `You are a narrative intelligence engine for a PR & crisis communications platform.
Your ONLY job is to analyze media content and return a structured JSON signal analysis.

STRICT RULES:
1. Return ONLY a raw JSON object. No markdown. No code fences. No explanation. No keys outside the schema.
2. All fields are REQUIRED. Never omit any field.
3. "summary" must be at most 2 sentences.
4. "sentiment" must be exactly one of: "positive", "neutral", "negative", "mixed"
5. "impact" must be exactly one of: "low", "medium", "high", "critical"
6. "confidence_score" must be a float between 0.0 and 1.0
7. If you cannot determine a field, use the most reasonable default — never return null.

REQUIRED OUTPUT FORMAT (pure JSON, no other text):
{
  "sentiment": "positive | neutral | negative | mixed",
  "narrative_type": "<type of narrative, e.g. 'Market Speculation', 'Crisis Report', 'Brand Sentiment'>",
  "stakeholder": "<primary affected party, e.g. 'Retail Investors', 'Government', 'Consumers'>",
  "impact": "low | medium | high | critical",
  "summary": "<max 2 sentences summarizing the key signal>",
  "recommended_action": "<1 sentence strategic response recommendation>",
  "confidence_score": <0.0 to 1.0>
}`;
}

/**
 * Builds the user message from a signal's title and content.
 *
 * @param {string} title - The signal title (can be null/empty)
 * @param {string} content - The signal content body
 * @returns {string} - The formatted user message
 */
function buildSignalUserMessage(title, content) {
    const lines = [];
    if (title && title.trim()) {
        lines.push(`TITLE: ${title.trim()}`);
    }
    lines.push(`CONTENT: ${content.trim()}`);
    return lines.join("\n\n");
}

/**
 * Builds the strict system prompt for alert enhancement.
 */
function buildAlertEnhancementSystemPrompt() {
    return `You are an expert PR & crisis communications strategist.
Your task is to analyze an automated intelligence alert and the recent signals that triggered it, then generate strategic insights.

STRICT RULES:
1. Return ONLY a raw JSON object. No markdown. No code fences. No explanation.
2. All fields are REQUIRED.
3. "why_it_matters" must be a concise explanation (2-3 sentences) of the strategic significance of this alert.
4. "what_to_do" must be a single, actionable recommendation (1-2 sentences) for the PR/comms team.

REQUIRED OUTPUT FORMAT (pure JSON):
{
  "why_it_matters": "<explanation>",
  "what_to_do": "<recommendation>"
}`;
}

/**
 * Builds the user message for alert enhancement.
 */
function buildAlertEnhancementUserMessage(alertData, signalsContext) {
    return `ALERT TYPE: ${alertData.type}
ALERT SEVERITY: ${alertData.severity}
ALERT TITLE: ${alertData.title}
WHAT HAPPENED: ${alertData.whatHappened}

RECENT RELEVANT SIGNALS CONTEXT:
${signalsContext}

Analyze the above and provide the strategic insights in JSON.`;
}

/**
 * Builds the strict system prompt for cluster analysis.
 */
function buildClusterAnalysisSystemPrompt(lang = "id") {
    const language = lang === "en" ? "English" : "Indonesian (Bahasa Indonesia)";
    return `You are a strategic intelligence analyst for a PR & crisis communications platform.
Your task is to analyze a cluster of related signals and provide a narrative summary.

STRICT RULES:
1. Return ONLY a raw JSON object. No markdown. No code fences. No explanation.
2. All fields are REQUIRED.
3. "title" must be a short, compelling title for the narrative cluster (max 6 words).
4. "description" must be a 1-2 sentence summary of the overarching narrative.
5. "dominant_sentiment" must be exactly one of: "positive", "neutral", "negative", "mixed".
6. "impact" must be exactly one of: "LOW", "MEDIUM", "HIGH", "CRITICAL".
7. Write "title" and "description" in ${language}, whatever language the signals are in.

REQUIRED OUTPUT FORMAT (pure JSON):
{
  "title": "<title>",
  "description": "<description>",
  "dominant_sentiment": "positive | neutral | negative | mixed",
  "impact": "LOW | MEDIUM | HIGH | CRITICAL"
}`;
}

/**
 * Builds the user message for cluster analysis.
 */
function buildClusterAnalysisUserMessage(signalsContext) {
    return `Analyze the following group of related signals and provide the narrative summary in JSON.

SIGNALS:
${signalsContext}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Makes a single call to the OpenAI chat completions API.
 *
 * @param {Array} messages - Array of { role, content } message objects.
 * @returns {Promise<string>} - The raw string content from the model.
 */
async function callOpenAI(messages, usageCtx = null) {
    const startedAt = Date.now();
    logStructured("info", "ai_provider_call_started", {
        provider: "openai",
        model: "gpt-4o-mini",
        messageCount: Array.isArray(messages) ? messages.length : 0,
    });
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.2,
            max_tokens: 512,
            response_format: { type: "json_object" }
        });
        logStructured("info", "ai_provider_call_succeeded", {
            provider: "openai",
            model: "gpt-4o-mini",
            latencyMs: Date.now() - startedAt,
        });
        // Cost tracking is opt-in per call: only callers that know the workspace pass usageCtx.
        if (usageCtx?.workspaceId) {
            await recordTokenUsage({
                workspaceId: usageCtx.workspaceId,
                operation: usageCtx.operation || "signal_analysis",
                model: "gpt-4o-mini",
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0,
            });
        }
        return response.choices[0]?.message?.content || "{}";
    } catch (error) {
        incrementAIFailure();
        logStructured("error", "ai_provider_call_failed", {
            provider: "openai",
            model: "gpt-4o-mini",
            latencyMs: Date.now() - startedAt,
            error: error.message,
        });
        throw error;
    }
}

/**
 * Attempts to parse a string as JSON.
 * 
 * @param {string} raw - The raw string to parse.
 * @returns {{ ok: boolean, data?: object, error?: string }}
 */
function tryParseJSON(raw) {
    try {
        return { ok: true, data: JSON.parse(raw) };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes a signal (title + content) using OpenAI.
 * Automatically retries once with a correction prompt if JSON parse fails.
 *
 * @param {string|null} title - The signal title (optional).
 * @param {string} content - The signal content body.
 * @returns {Promise<object>} - The validated AI analysis object.
 */
export const analyzeSignal = async (title, content, usageCtx = null) => {
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.");
    }

    const systemPrompt = buildSignalSystemPrompt();
    const userMessage = buildSignalUserMessage(title, content);

    // Build the initial messages array
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
    ];

    // ── Attempt 1 ──────────────────────────────────────────────────────────
    logStructured("info", "ai_analyze_signal_started", { title: title || "(none)" });
    const rawContent = await callOpenAI(messages, usageCtx);
    const attempt1 = tryParseJSON(rawContent);

    let parsed;

    if (attempt1.ok) {
        parsed = attempt1.data;
    } else {
        // ── Attempt 2 (RETRY) ───────────────────────────────────────────────
        // Send the bad response back and ask OpenAI to self-correct
        logStructured("warn", `[AI] Attempt 1 produced invalid JSON — retrying with correction prompt.`);
        logStructured("warn", `[AI] Parse error: ${attempt1.error}`);
        logStructured("warn", `[AI] Raw response: ${rawContent.substring(0, 200)}`);

        const correctionMessages = [
            ...messages,
            { role: "assistant", content: rawContent },
            {
                role: "user",
                content: `Your previous response was not valid JSON. Parse error: "${attempt1.error}".
Please return ONLY a valid JSON object with all required fields. No markdown. No explanation.`
            }
        ];

        logStructured("info", "ai_analyze_signal_retry");
        const rawRetry = await callOpenAI(correctionMessages, usageCtx);
        const attempt2 = tryParseJSON(rawRetry);

        if (!attempt2.ok) {
            throw new Error(
                `AI returned invalid JSON after retry.\n` +
                `Attempt 1: ${rawContent.substring(0, 150)}\n` +
                `Attempt 2: ${rawRetry.substring(0, 150)}`
            );
        }

        parsed = attempt2.data;
    }

    // Validate the final parsed object against our schema
    return validateAIOutput(parsed);
};

/**
 * Generic text analysis using OpenAI (for ad-hoc use).
 *
 * @param {string} text - The text content to analyze.
 * @returns {Promise<object>} - The validated AI analysis object.
 */
export const analyzeText = async (text) => {
    return analyzeSignal(null, text);
};

/**
 * Suggests a CVE narrative category for one record (cve-categories.js), for a person to confirm or dismiss.
 * Used only in workspaces whose use case is "cve". Throws when no AI provider is configured or the answer is not
 * JSON; the caller then stores the record without a category, never a guessed one.
 */
export const classifyCveNarrative = async (title, content, usageCtx = null) => {
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key is not configured.");
    const { CVE_SYSTEM_PROMPT, normalizeCveResult } = await import("../../lib/cve-categories.js");
    const text = `${title ? `Title: ${title}\n` : ""}Content: ${String(content || "").slice(0, 3000)}`;
    const raw = await callOpenAI([{ role: "system", content: CVE_SYSTEM_PROMPT }, { role: "user", content: text }], { ...(usageCtx || {}), operation: usageCtx?.operation || "cve_classification" });
    const parsed = tryParseJSON(raw);
    if (!parsed.ok) throw new Error(`CVE classification returned invalid JSON: ${parsed.error}`);
    return { ...normalizeCveResult(parsed.data), model: "gpt-4o-mini", at: new Date().toISOString() };
};

/**
 * Analyzes an alert and its context to generate strategic insights.
 *
 * @param {object} alertData - The basic alert information.
 * @param {string} signalsContext - Summarized text of recent signals that triggered the alert.
 * @returns {Promise<object>} - { whyItMatters, whatToDo }
 */
export const enhanceAlert = async (alertData, signalsContext) => {
    if (!OPENAI_API_KEY) {
        logStructured("warn", "[AI] Cannot enhance alert: Missing API key.");
        return { whyItMatters: null, whatToDo: null };
    }

    const systemPrompt = buildAlertEnhancementSystemPrompt();
    const userMessage = buildAlertEnhancementUserMessage(alertData, signalsContext);

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
    ];

    try {
        logStructured("info", "ai_enhance_alert_started", { alertTitle: alertData.title });
        const rawContent = await callOpenAI(messages);
        const parsed = tryParseJSON(rawContent);

        if (parsed.ok && parsed.data) {
            return {
                whyItMatters: parsed.data.why_it_matters || null,
                whatToDo: parsed.data.what_to_do || null
            };
        } else {
            // Attempt 2 (Retry)
            const correctionMessages = [
                ...messages,
                { role: "assistant", content: rawContent },
                {
                    role: "user",
                    content: `Your previous response was not valid JSON. Parse error: "${parsed.error}". Please return ONLY a valid JSON object.`
                }
            ];
            const rawRetry = await callOpenAI(correctionMessages);
            const parsedRetry = tryParseJSON(rawRetry);
            
            if (parsedRetry.ok && parsedRetry.data) {
                 return {
                    whyItMatters: parsedRetry.data.why_it_matters || null,
                    whatToDo: parsedRetry.data.what_to_do || null
                };
            }
            logStructured("warn", `[AI] enhanceAlert failed to parse JSON after retry.`);
            return { whyItMatters: null, whatToDo: null };
        }
    } catch (error) {
        logStructured("error", `[AI] enhanceAlert error:`, { error: error.message?.message || error.message, stack: error.message?.stack });
        return { whyItMatters: null, whatToDo: null };
    }
};

/**
 * Analyzes a cluster of signals to generate a narrative summary.
 *
 * @param {string} signalsContext - Summarized text of signals in the cluster.
 * @returns {Promise<object>} - { title, description, dominant_sentiment, impact }
 */
export const analyzeCluster = async (signalsContext, lang = "id") => {
    if (!OPENAI_API_KEY) {
        logStructured("warn", "[AI] Cannot analyze cluster: Missing API key.");
        return null;
    }

    const systemPrompt = buildClusterAnalysisSystemPrompt(lang);
    const userMessage = buildClusterAnalysisUserMessage(signalsContext);

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
    ];

    try {
        logStructured("info", "ai_analyze_cluster_started");
        const rawContent = await callOpenAI(messages);
        const parsed = tryParseJSON(rawContent);

        if (parsed.ok && parsed.data) {
            return parsed.data;
        } else {
            // Attempt 2 (Retry)
            const correctionMessages = [
                ...messages,
                { role: "assistant", content: rawContent },
                {
                    role: "user",
                    content: `Your previous response was not valid JSON. Parse error: "${parsed.error}". Please return ONLY a valid JSON object.`
                }
            ];
            const rawRetry = await callOpenAI(correctionMessages);
            const parsedRetry = tryParseJSON(rawRetry);
            
            if (parsedRetry.ok && parsedRetry.data) {
                 return parsedRetry.data;
            }
            logStructured("warn", `[AI] analyzeCluster failed to parse JSON after retry.`);
            return null;
        }
    } catch (error) {
        logStructured("error", `[AI] analyzeCluster error:`, { error: error.message?.message || error.message, stack: error.message?.stack });
        return null;
    }
};

/**
 * Fallback generator for signals summary when AI provider is offline or rate-limited
 */
function buildFallbackSummary(signals = [], contextInfo = {}) {
    // Short, count-led lines; the advice follows the day's tone instead of a fixed sentence.
    const total = contextInfo.totalSignals24h || signals.length;
    const negative = contextInfo.negativeSignals24h ?? signals.filter((s) => String(s.sentiment).toUpperCase() === "NEGATIVE").length;
    const positive = contextInfo.positiveSignals24h ?? signals.filter((s) => String(s.sentiment).toUpperCase() === "POSITIVE").length;
    const topNegative = signals.find((s) => String(s.sentiment).toUpperCase() === "NEGATIVE")?.title;
    const top = topNegative || signals[0]?.title || "";
    const short = top.length > 70 ? `${top.slice(0, 67).trimEnd()}…` : top;
    const mostlyNegative = negative > positive;
    return {
        title: "AI Signal Summary",
        content: {
            en: `${negative} of ${total} signals today are negative${short ? `, led by "${short}"` : ""}.`,
            id: `${negative} dari ${total} percakapan hari ini negatif${short ? `, terbanyak soal "${short}"` : ""}.`,
        },
        insight: mostlyNegative
            ? { en: "Prepare a holding statement and answer the main complaint on the busiest channel.", id: "Siapkan pernyataan sementara dan jawab keluhan utama di kanal yang paling ramai." }
            : { en: "Amplify the positive stories while they trend.", id: "Perkuat cerita positif selagi sedang ramai." },
    };
}

/**
 * Generates an executive AI narrative summary from recent signals.
 *
 * @param {Array<{ title: string, sentiment?: string, platform?: string, content?: string }>} signals
 * @param {object} contextInfo - Metrics context (totalSignals24h, negativeSignals24h, criticalSignals24h)
 * @returns {Promise<{ title: string, content: { en: string, id: string }, insight: { en: string, id: string } }>}
 */
// The Monitoring page asks for this summary on every load; the same signals and counts give the same summary,
// so it is kept for a few hours per input instead of calling the model again (per warm instance).
const SUMMARY_CACHE = new Map();
const SUMMARY_TTL_MS = 6 * 60 * 60 * 1000;
const SUMMARY_PENDING = new Map();
const SUMMARY_WAIT_MS = 900;

export const generateSignalsSummary = async (signals = [], contextInfo = {}) => {
    if (!signals || signals.length === 0) {
        return null;
    }
    const cacheKey = crypto.createHash("sha1").update(JSON.stringify([signals.slice(0, 8).map((s) => [s.title, s.sentiment]), contextInfo])).digest("hex");
    const cached = SUMMARY_CACHE.get(cacheKey);
    if (cached && cached.at > Date.now() - SUMMARY_TTL_MS) return cached.value;
    // One generation per key at a time; a page waits at most SUMMARY_WAIT_MS for it and otherwise gets the
    // plain summary now, while the AI one finishes into the cache for the next load.
    let pending = SUMMARY_PENDING.get(cacheKey);
    if (!pending) {
        pending = generateSignalsSummaryUncached(signals, contextInfo)
            .then((value) => {
                if (SUMMARY_CACHE.size > 200) SUMMARY_CACHE.delete(SUMMARY_CACHE.keys().next().value);
                SUMMARY_CACHE.set(cacheKey, { at: Date.now(), value });
                return value;
            })
            .finally(() => SUMMARY_PENDING.delete(cacheKey));
        SUMMARY_PENDING.set(cacheKey, pending);
    }
    let timer;
    const waited = new Promise((resolve) => { timer = setTimeout(() => resolve(null), SUMMARY_WAIT_MS); });
    const value = await Promise.race([pending.catch(() => null), waited]);
    clearTimeout(timer);
    return value ?? (cached?.value || buildFallbackSummary(signals, contextInfo));
};

async function generateSignalsSummaryUncached(signals, contextInfo) {

    if (!OPENAI_API_KEY) {
        return buildFallbackSummary(signals, contextInfo);
    }

    const sampleSignals = signals.slice(0, 8);
    const contextSnippet = sampleSignals
        .map((s, idx) => `${idx + 1}. [${(s.sentiment || "NEUTRAL").toUpperCase()}] (${s.platform || "news"}) ${s.title}: ${s.content ? s.content.substring(0, 100) : ""}`)
        .join("\n");

    const systemPrompt = `You are an executive media intelligence analyst for a corporate reputation and PR crisis management platform.
Your task is to analyze recent media signals and generate a high-level executive summary and actionable insight in both English and Indonesian.

STRICT RULES:
1. Return ONLY a valid JSON object. No markdown. No code fences.
2. "content.en" and "content.id" must be ONE plain sentence of at most 22 words: what is happening and the overall tone, for a board member.
3. "insight.en" and "insight.id" must be ONE imperative sentence of at most 16 words: the next step for the communication team.
4. Base your summary directly on the provided signals.

REQUIRED OUTPUT FORMAT (pure JSON):
{
  "title": "AI Signal Summary",
  "content": {
    "en": "<one sentence, max 22 words>",
    "id": "<satu kalimat, maks 22 kata>"
  },
  "insight": {
    "en": "<one imperative sentence, max 16 words>",
    "id": "<satu kalimat perintah, maks 16 kata>"
  }
}`;

    const userMessage = `SIGNALS CONTEXT:
${contextSnippet}

METRICS OVERVIEW:
Total Signals (24h): ${contextInfo.totalSignals24h || signals.length}
Negative Discussions: ${contextInfo.negativeSignals24h || 0}
Critical Alerts: ${contextInfo.criticalSignals24h || 0}`;

    try {
        const rawContent = await callOpenAI([
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ]);
        const parsed = tryParseJSON(rawContent);

        if (parsed.ok && parsed.data?.content?.en && parsed.data?.content?.id) {
            return {
                title: parsed.data.title || "AI Signal Summary",
                content: parsed.data.content,
                insight: parsed.data.insight || {
                    en: "Proactively monitor media coverage and align stakeholder statements.",
                    id: "Pantau liputan media secara proaktif dan selaraskan pernyataan stakeholder."
                },
            };
        }
        return buildFallbackSummary(signals, contextInfo);
    } catch (error) {
        logStructured("warn", "ai_generate_signals_summary_failed_fallback", { error: error.message });
        return buildFallbackSummary(signals, contextInfo);
    }
}

export default client;

