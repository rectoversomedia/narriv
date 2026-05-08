/**
 * AI Analysis Output Schema
 * 
 * Defines the expected shape and valid values for the AI analysis result.
 * Used to validate the parsed JSON response from OpenAI before saving to DB.
 */

const VALID_SENTIMENTS = ["positive", "neutral", "negative", "mixed"];
const VALID_IMPACTS = ["low", "medium", "high", "critical"];

function normalizeText(value) {
    if (typeof value !== "string") return "";
    return value.trim();
}

function clampConfidence(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    if (num < 0) return 0;
    if (num > 1) return 1;
    return num;
}

/**
 * Validates an AI analysis output object against the expected schema.
 * Throws a descriptive error if any required field is missing or invalid.
 *
 * @param {object} output - The parsed JSON object from OpenAI response.
 * @returns {object} - The validated output (same object if valid).
 * @throws {Error} - If any field is missing or has an invalid value.
 */
export function validateAIOutput(output) {
    if (!output || typeof output !== "object") {
        throw new Error("AI output must be a valid JSON object.");
    }

    const errors = [];
    const normalized = {
        sentiment: normalizeText(output.sentiment).toLowerCase(),
        narrative_type: normalizeText(output.narrative_type),
        stakeholder: normalizeText(output.stakeholder),
        impact: normalizeText(output.impact).toLowerCase(),
        summary: normalizeText(output.summary),
        recommended_action: normalizeText(output.recommended_action),
        confidence_score: clampConfidence(output.confidence_score),
    };

    // sentiment: required, must be one of the valid values
    if (!normalized.sentiment) {
        errors.push("Missing required field: 'sentiment'");
    } else if (!VALID_SENTIMENTS.includes(normalized.sentiment)) {
        errors.push(`Invalid 'sentiment': "${normalized.sentiment}". Must be one of: ${VALID_SENTIMENTS.join(", ")}`);
    }

    // narrative_type: required, must be a non-empty string
    if (!normalized.narrative_type) {
        errors.push("Missing or empty required field: 'narrative_type'");
    }

    // stakeholder: required, must be a non-empty string
    if (!normalized.stakeholder) {
        errors.push("Missing or empty required field: 'stakeholder'");
    }

    // impact: required, must be one of the valid values
    if (!normalized.impact) {
        errors.push("Missing required field: 'impact'");
    } else if (!VALID_IMPACTS.includes(normalized.impact)) {
        errors.push(`Invalid 'impact': "${normalized.impact}". Must be one of: ${VALID_IMPACTS.join(", ")}`);
    }

    // summary: required, must be a non-empty string
    if (!normalized.summary) {
        errors.push("Missing or empty required field: 'summary'");
    }

    // recommended_action: required, must be a non-empty string
    if (!normalized.recommended_action) {
        errors.push("Missing or empty required field: 'recommended_action'");
    }

    // confidence_score: required, must be a number between 0 and 1
    if (output.confidence_score === undefined || output.confidence_score === null) {
        errors.push("Missing required field: 'confidence_score'");
    } else if (normalized.confidence_score === null) {
        errors.push(`Invalid 'confidence_score': ${output.confidence_score}. Must be a number between 0 and 1.`);
    }

    if (errors.length > 0) {
        throw new Error(`AI output schema validation failed:\n${errors.map(e => `  - ${e}`).join("\n")}`);
    }

    return normalized;
}

/**
 * Returns the example schema for use in OpenAI system prompts.
 * This is injected into the prompt so the AI follows the exact format.
 */
export function getSchemaPrompt() {
    return `You must return a valid JSON object with EXACTLY these fields:
{
  "sentiment": "positive | neutral | negative | mixed",
  "narrative_type": "<string describing the type of narrative, e.g. 'Market Speculation'>",
  "stakeholder": "<string describing who is primarily affected, e.g. 'Retail Investors'>",
  "impact": "low | medium | high | critical",
  "summary": "<2-3 sentence summary of the content>",
  "recommended_action": "<1-2 sentence strategic recommendation>",
  "confidence_score": <float between 0.0 and 1.0>
}

Return ONLY the JSON object. Do not include any explanation or markdown.`;
}
