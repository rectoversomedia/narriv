import OpenAI from "openai";
import prisma from "../../prisma.js";
import { logStructured } from "../../lib/logger.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new OpenAI({
    apiKey: OPENAI_API_KEY || "sk-placeholder",
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE CALCULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts how many times a term appears in text (case-insensitive).
 * Matches whole words only to avoid partial matches.
 *
 * @param {string} text - The text to search in.
 * @param {string} term - The term to search for.
 * @returns {number} - Number of occurrences.
 */
function countMentions(text, term) {
    if (!text || !term) return 0;
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
}

/**
 * Calculates Brand Presence Rate.
 * = (number of responses mentioning the brand) / (total responses)
 *
 * @param {Array<string>} responses - Array of AI response texts.
 * @param {string} brandName - The brand name to search for.
 * @returns {number} - Rate between 0.0 and 1.0.
 */
function calculateBrandPresenceRate(responses, brandName) {
    if (responses.length === 0) return 0;
    const mentioningCount = responses.filter(r => countMentions(r, brandName) > 0).length;
    return mentioningCount / responses.length;
}

/**
 * Calculates Competitor Mention Rate.
 * = (number of responses mentioning any competitor) / (total responses)
 *
 * @param {Array<string>} responses - Array of AI response texts.
 * @param {Array<string>} competitors - Array of competitor names.
 * @returns {number} - Rate between 0.0 and 1.0.
 */
function calculateCompetitorMentionRate(responses, competitors) {
    if (responses.length === 0 || competitors.length === 0) return 0;
    const mentioningCount = responses.filter(r => {
        return competitors.some(comp => countMentions(r, comp) > 0);
    }).length;
    return mentioningCount / responses.length;
}

/**
 * Calculates the AI Visibility Score (0 - 100).
 *
 * Formula:
 *   visibilityScore = (brandPresenceRate * 60) + (positionBonus * 25) + (sentimentBonus * 15)
 *
 * - brandPresenceRate (60% weight): How often the brand appears.
 * - positionBonus (25% weight): How early the brand appears in responses (top-3 mention bonus).
 * - sentimentBonus (15% weight): Positive framing when the brand is mentioned.
 *
 * @param {Array<string>} responses - Array of AI response texts.
 * @param {string} brandName - The brand name.
 * @returns {number} - Score between 0.0 and 100.0.
 */
function calculateVisibilityScore(responses, brandName) {
    if (responses.length === 0) return 0;

    const brandPresenceRate = calculateBrandPresenceRate(responses, brandName);

    // Position bonus: check if brand appears in the first 200 chars of each response
    let earlyMentionCount = 0;
    responses.forEach(r => {
        const firstSegment = r.substring(0, 200).toLowerCase();
        if (firstSegment.includes(brandName.toLowerCase())) {
            earlyMentionCount++;
        }
    });
    const positionBonus = responses.length > 0 ? earlyMentionCount / responses.length : 0;

    // Sentiment bonus: check for positive framing around the brand
    const positiveIndicators = ["leading", "top", "best", "recommended", "trusted", "popular", "innovative", "excellent", "premier", "renowned"];
    let positiveMentionCount = 0;
    responses.forEach(r => {
        const lowerText = r.toLowerCase();
        if (countMentions(lowerText, brandName.toLowerCase()) > 0) {
            const hasPositive = positiveIndicators.some(indicator => lowerText.includes(indicator));
            if (hasPositive) positiveMentionCount++;
        }
    });
    const sentimentBonus = responses.length > 0 ? positiveMentionCount / responses.length : 0;

    // Weighted formula
    const score = (brandPresenceRate * 60) + (positionBonus * 25) + (sentimentBonus * 15);
    return Math.round(score * 100) / 100; // Round to 2 decimals
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ENGINE QUERY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queries an AI engine with a set of prompts and returns the raw responses.
 * Currently uses OpenAI as the engine. Future: add Gemini, Perplexity, etc.
 *
 * @param {string} engineName - The AI engine identifier.
 * @param {Array<string>} queries - Array of prompts to send.
 * @returns {Promise<Array<{query: string, response: string}>>} - Query-response pairs.
 */
async function queryAIEngine(engineName, queries) {
    if (!OPENAI_API_KEY) {
        logStructured("warn", "[GEO] No OPENAI_API_KEY set. Returning mock responses.");
        return queries.map(q => ({
            query: q,
            response: `Mock response for: ${q}. This is placeholder text for development.`
        }));
    }

    const results = [];

    for (const query of queries) {
        try {
            const startedAt = Date.now();
            logStructured("info", "ai_provider_call_started", {
                provider: "openai",
                module: "geo",
                engineName,
            });
            const response = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant that provides bilingual responses. When answering, ALWAYS respond in this exact JSON format:
{
  "en": "English response here...",
  "id": "Indonesian response here (Bahasa Indonesia)..."
}

Rules:
- Both responses must convey the same information
- Answer thoroughly and mention specific brands, products, or companies when relevant
- The English version should be natural English
- The Indonesian version should be natural Bahasa Indonesia (not a literal translation)
- Keep responses concise but informative (150-300 words each)
- ONLY return valid JSON, no markdown or extra text`
                    },
                    { role: "user", content: query }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                response_format: { type: "json_object" }
            });

            const rawContent = response.choices[0]?.message?.content || "{}";
            let parsed;
            try {
                parsed = JSON.parse(rawContent);
            } catch {
                parsed = { en: rawContent, id: rawContent };
            }

            results.push({
                query,
                response: parsed.en || rawContent,
                responseId: parsed.id || parsed.en || rawContent
            });
            logStructured("info", "ai_provider_call_succeeded", {
                provider: "openai",
                module: "geo",
                engineName,
                latencyMs: Date.now() - startedAt,
            });
        } catch (error) {
            logStructured("error", "ai_provider_call_failed", {
                provider: "openai",
                module: "geo",
                engineName,
                error: error.message,
            });
            results.push({ query, response: "", responseId: "" });
        }
    }

    return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SERVICE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs a full GEO visibility analysis for a given brand within a workspace.
 *
 * @param {object} params
 * @param {string} params.workspaceId - The workspace ID.
 * @param {string} params.brandName - The brand name to track.
 * @param {Array<string>} params.competitors - Array of competitor names.
 * @param {Array<string>} params.queries - Industry-relevant prompts to test.
 * @param {string} [params.engineName="chatgpt"] - The AI engine to query.
 * @returns {Promise<object>} - The saved AIVisibilityResult record.
 */
export async function runVisibilityAnalysis({ workspaceId, brandName, competitors = [], queries, engineName = "chatgpt" }) {
    logStructured("info", "geo_analysis_started", { brandName, engineName, competitorCount: competitors.length, queryCount: queries.length });

    // 1. Query the AI engine
    const queryResults = await queryAIEngine(engineName, queries);
    const responses = queryResults.map(qr => qr.response);

    // 2. Calculate metrics
    const visibilityScore = calculateVisibilityScore(responses, brandName);
    const brandPresenceRate = calculateBrandPresenceRate(responses, brandName);
    const competitorMentionRate = calculateCompetitorMentionRate(responses, competitors);

    logStructured("info", "geo_analysis_results", { visibilityScore, brandPresence: `${(brandPresenceRate * 100).toFixed(1)}%`, competitorMention: `${(competitorMentionRate * 100).toFixed(1)}%` });

    // 3. Save to database
    const result = await prisma.aIVisibilityResult.create({
        data: {
            workspaceId,
            engineName,
            visibilityScore,
            brandPresenceRate: Math.round(brandPresenceRate * 1000) / 1000,
            competitorMentionRate: Math.round(competitorMentionRate * 1000) / 1000,
            queryUsed: JSON.stringify(queries),
            rawResponse: queryResults,
            metadata: {
                brandName,
                competitors,
                totalQueries: queries.length,
                totalResponses: responses.filter(r => r.length > 0).length
            }
        }
    });

    logStructured("info", "geo_analysis_saved", { resultId: result.id });
    return result;
}

/**
 * Analyze competitor mentions in detail across all responses.
 * Returns per-competitor mention counts and sentiment.
 */
export function analyzeCompetitorMentions(responses, brandName, competitors) {
    const results = {};

    for (const competitor of competitors) {
        const mentionCount = responses.filter(r =>
            r.toLowerCase().includes(competitor.toLowerCase())
        ).length;

        const mentionRate = responses.length > 0 ? mentionCount / responses.length : 0;

        // Check sentiment around competitor mentions
        const positiveIndicators = ["leading", "top", "best", "recommended", "trusted", "popular", "excellent"];
        const negativeIndicators = ["struggling", "declining", "losing", "failing", "issues", "problems", "complaints"];

        let positiveCount = 0;
        let negativeCount = 0;

        responses.forEach(r => {
            if (r.toLowerCase().includes(competitor.toLowerCase())) {
                const lowerText = r.toLowerCase();
                if (positiveIndicators.some(ind => lowerText.includes(ind))) positiveCount++;
                if (negativeIndicators.some(ind => lowerText.includes(ind))) negativeCount++;
            }
        });

        results[competitor] = {
            mentionCount,
            mentionRate: Number((mentionRate * 100).toFixed(1)),
            sentiment: {
                positive: positiveCount,
                negative: negativeCount,
                neutral: mentionCount - positiveCount - negativeCount,
            },
        };
    }

    return results;
}

/**
 * Analyze overall sentiment of AI responses mentioning the brand.
 */
export function analyzeResponseSentiment(responses, brandName) {
    const positiveIndicators = ["leading", "top", "best", "recommended", "trusted", "popular", "innovative", "excellent", "premier", "renowned", "great", "outstanding", "reliable"];
    const negativeIndicators = ["struggling", "declining", "losing", "failing", "issues", "problems", "complaints", "controversy", "concerns", "poor", "weak"];

    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let mentioned = 0;

    responses.forEach(r => {
        if (!r.toLowerCase().includes(brandName.toLowerCase())) return;
        mentioned++;

        const lowerText = r.toLowerCase();
        const hasPositive = positiveIndicators.some(ind => lowerText.includes(ind));
        const hasNegative = negativeIndicators.some(ind => lowerText.includes(ind));

        if (hasPositive && !hasNegative) positive++;
        else if (hasNegative && !hasPositive) negative++;
        else neutral++;
    });

    return {
        totalResponses: responses.length,
        brandMentions: mentioned,
        positive,
        negative,
        neutral,
        sentimentScore: mentioned > 0 ? Number(((positive - negative) / mentioned).toFixed(3)) : 0,
        positiveRate: mentioned > 0 ? Number((positive / mentioned).toFixed(3)) : 0,
        negativeRate: mentioned > 0 ? Number((negative / mentioned).toFixed(3)) : 0,
    };
}
