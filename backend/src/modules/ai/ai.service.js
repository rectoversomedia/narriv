import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("[AI SERVICE] WARNING: OPENAI_API_KEY is not set. AI features will be disabled.");
}

// Initialize the OpenAI client
const client = new OpenAI({
    apiKey: OPENAI_API_KEY || "sk-placeholder",
});

/**
 * Analyzes a given text using OpenAI.
 * This is the core reusable function for all AI analysis tasks.
 *
 * @param {string} text - The text content to analyze.
 * @param {string} [systemPrompt] - Optional system prompt to guide the analysis.
 * @returns {Promise<string>} - The raw AI response text.
 */
export const analyzeText = async (text, systemPrompt = "You are an expert media and narrative intelligence analyst.") => {
    if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.");
    }

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
};

export default client;
