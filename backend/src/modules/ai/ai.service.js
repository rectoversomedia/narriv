import OpenAI from "openai";
import { validateAIOutput } from "./ai.schema.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("[AI SERVICE] WARNING: OPENAI_API_KEY is not set. AI features will be disabled.");
}

// Initialize the OpenAI client
const client = new OpenAI({
    apiKey: OPENAI_API_KEY || "sk-placeholder",
});

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

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Makes a single call to the OpenAI chat completions API.
 *
 * @param {Array} messages - Array of { role, content } message objects.
 * @returns {Promise<string>} - The raw string content from the model.
 */
async function callOpenAI(messages) {
    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: "json_object" }
    });
    return response.choices[0]?.message?.content || "{}";
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
export const analyzeSignal = async (title, content) => {
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
    console.log(`[AI] analyzeSignal attempt 1 — title: "${title || "(none)"}"`);
    const rawContent = await callOpenAI(messages);
    const attempt1 = tryParseJSON(rawContent);

    let parsed;

    if (attempt1.ok) {
        parsed = attempt1.data;
    } else {
        // ── Attempt 2 (RETRY) ───────────────────────────────────────────────
        // Send the bad response back and ask OpenAI to self-correct
        console.warn(`[AI] Attempt 1 produced invalid JSON — retrying with correction prompt.`);
        console.warn(`[AI] Parse error: ${attempt1.error}`);
        console.warn(`[AI] Raw response: ${rawContent.substring(0, 200)}`);

        const correctionMessages = [
            ...messages,
            { role: "assistant", content: rawContent },
            {
                role: "user",
                content: `Your previous response was not valid JSON. Parse error: "${attempt1.error}".
Please return ONLY a valid JSON object with all required fields. No markdown. No explanation.`
            }
        ];

        console.log(`[AI] analyzeSignal attempt 2 (retry)...`);
        const rawRetry = await callOpenAI(correctionMessages);
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

export default client;
