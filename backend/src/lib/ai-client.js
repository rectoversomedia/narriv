import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey || apiKey === "sk-placeholder") {
    console.warn("[AI] OPENAI_API_KEY is not set or is a placeholder. AI features will fail.");
}

let clientInstance = null;

export function getOpenAIClient() {
    if (!clientInstance) {
        clientInstance = new OpenAI({ apiKey: apiKey || "" });
    }
    return clientInstance;
}

export const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
export const AI_TEMPERATURE = 0.2;
export const AI_MAX_TOKENS = 1024;
