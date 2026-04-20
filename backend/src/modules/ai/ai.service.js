import OpenAI from "openai";
import { validateAIOutput, getSchemaPrompt } from "./ai.schema.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("[AI SERVICE] WARNING: OPENAI_API_KEY is not set. AI features will be disabled.");
}

// Initialize the OpenAI client
const client = new OpenAI({
    apiKey: OPENAI_API_KEY || "sk-placeholder",
});

/**
 * Analyzes a given text using OpenAI and returns a validated structured output.
 *
 * @param {string} text - The text content to analyze.
 * @returns {Promise<object>} - The validated AI analysis object.
 */
export const analyzeText = async (text) => {
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.");
    }

    const systemPrompt = `You are an expert media and narrative intelligence analyst for a PR & communications monitoring platform.
Analyze the provided text and extract intelligence signals.

${getSchemaPrompt()}`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze this content:\n\n${text}` }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0]?.message?.content || "{}";

    let parsed;
    try {
        parsed = JSON.parse(rawContent);
    } catch (err) {
        throw new Error(`AI returned invalid JSON: ${rawContent.substring(0, 200)}`);
    }

    // Validate the parsed output against our schema
    return validateAIOutput(parsed);
};

export default client;

