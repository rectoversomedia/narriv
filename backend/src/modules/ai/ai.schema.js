/**
 * AI Analysis Output Schema
 * 
 * Defines the expected shape and valid values for the AI analysis result.
 * Used to validate the parsed JSON response from OpenAI before saving to DB.
 */

const VALID_SENTIMENTS = ["positive", "neutral", "negative", "mixed"];
const VALID_IMPACTS = ["low", "medium", "high", "critical"];

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

    // sentiment: required, must be one of the valid values
    if (!output.sentiment) {
        errors.push("Missing required field: 'sentiment'");
    } else if (!VALID_SENTIMENTS.includes(output.sentiment)) {
        errors.push(`Invalid 'sentiment': "${output.sentiment}". Must be one of: ${VALID_SENTIMENTS.join(", ")}`);
    }

    // narrative_type: required, must be a non-empty string
    if (!output.narrative_type || typeof output.narrative_type !== "string" || output.narrative_type.trim() === "") {
        errors.push("Missing or empty required field: 'narrative_type'");
    }

    // stakeholder: required, must be a non-empty string
    if (!output.stakeholder || typeof output.stakeholder !== "string" || output.stakeholder.trim() === "") {
        errors.push("Missing or empty required field: 'stakeholder'");
    }

    // impact: required, must be one of the valid values
    if (!output.impact) {
        errors.push("Missing required field: 'impact'");
    } else if (!VALID_IMPACTS.includes(output.impact)) {
        errors.push(`Invalid 'impact': "${output.impact}". Must be one of: ${VALID_IMPACTS.join(", ")}`);
    }

    // summary: required, must be a non-empty string
    if (!output.summary || typeof output.summary !== "string" || output.summary.trim() === "") {
        errors.push("Missing or empty required field: 'summary'");
    }

    // recommended_action: required, must be a non-empty string
    if (!output.recommended_action || typeof output.recommended_action !== "string" || output.recommended_action.trim() === "") {
        errors.push("Missing or empty required field: 'recommended_action'");
    }

    // confidence_score: required, must be a number between 0 and 1
    if (output.confidence_score === undefined || output.confidence_score === null) {
        errors.push("Missing required field: 'confidence_score'");
    } else if (typeof output.confidence_score !== "number" || output.confidence_score < 0 || output.confidence_score > 1) {
        errors.push(`Invalid 'confidence_score': ${output.confidence_score}. Must be a number between 0 and 1.`);
    }

    if (errors.length > 0) {
        throw new Error(`AI output schema validation failed:\n${errors.map(e => `  - ${e}`).join("\n")}`);
    }

    return output;
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
