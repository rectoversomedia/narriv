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
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes a signal (title + content) using OpenAI.
 * Returns a validated, structured analysis object.
 *
 * @param {string} title - The signal title.
 * @param {string} content - The signal content.
 * @returns {Promise<object>} - The validated AI analysis object.
 */
export const analyzeSignal = async (title, content) => {
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.");
    }

    const systemPrompt = buildSignalSystemPrompt();
    const userMessage = buildSignalUserMessage(title, content);

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ],
        temperature: 0.2,         // Low temperature = more deterministic output
        max_tokens: 512,
        response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0]?.message?.content || "{}";

    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    } catch (err) {
        throw new Error(`AI returned invalid JSON: ${rawContent.substring(0, 300)}`);
    }

    // Validate against schema — throws if any field is invalid
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
