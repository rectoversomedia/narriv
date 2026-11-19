/**
 * AI reading of social comments, kept small and cheap (Claude Haiku first through chat-client, monthly cap applies):
 *   - toneComments: one call per video labels the comments that matter most (most liked / most replied, up to 60),
 *     which the word list reads poorly (slang, sarcasm). The rest keep the word-list tone.
 *   - summarizeCamps: one call per collection names each camp and says in a sentence what it argues.
 * Both fail soft: without AI or on any error the network still works on the word-list tone.
 */

import { anyAiConfigured, getChatClient } from "./chat-client.js";
import { checkBudgetAllowance } from "./cost-management.js";
import { recordTokenUsage } from "./token-tracking.js";
import { logStructured } from "./logger.js";

const TONES = new Set(["positive", "negative", "neutral"]);
const MAX_TONED = 60;

async function allowed(workspaceId, chat) {
    if (!chat && !anyAiConfigured()) return false;
    const a = await checkBudgetAllowance(workspaceId).catch(() => ({ allowed: true }));
    return a?.allowed !== false;
}

async function ask(workspaceId, operation, messages, maxTokens, chat = getChatClient()) {
    const res = await chat.chat.completions.create({ messages, response_format: { type: "json_object" }, max_tokens: maxTokens, temperature: 0 });
    const usage = res?.usage || {};
    await recordTokenUsage({ workspaceId, operation, model: res?.model || "claude-haiku", inputTokens: usage.prompt_tokens || 0, outputTokens: usage.completion_tokens || 0 }).catch(() => {});
    return JSON.parse(res?.choices?.[0]?.message?.content || "{}");
}

/** Which comments get the AI read: the ones people engaged with most. */
export function commentsWorthToning(rows, limit = MAX_TONED) {
    return [...rows].sort((a, b) => (b.like_count || 0) + (b.reply_count || 0) * 2 - ((a.like_count || 0) + (a.reply_count || 0) * 2)).slice(0, limit);
}

/**
 * Returns rows with `sentiment` from AI where it was read (`tone_by: "ai"`), word-list tone otherwise.
 * `subject` is what the comments are about (brand / video title), so "negative" means negative about the subject.
 */
export async function toneComments(rows, { workspaceId, subject, chat } = {}) {
    if (!rows.length || !(await allowed(workspaceId, chat))) return rows;
    const picked = commentsWorthToning(rows);
    const list = picked.map((r, i) => `${i + 1}. ${String(r.text || "").replace(/\s+/g, " ").slice(0, 220)}`).join("\n");
    try {
        const out = await ask(workspaceId, "comment_tone", [
            { role: "system", content: "You label the tone of Indonesian social-media comments toward a subject. Read slang, sarcasm and irony as a native reader would. Return JSON only." },
            { role: "user", content: `Subject: ${subject}\n\nComments:\n${list}\n\nReturn {"tones":[{"n":1,"tone":"positive|negative|neutral"}, ...]} with one entry per comment. "negative" = criticism, complaint, mockery or distrust toward the subject; "positive" = praise, support or thanks; anything else "neutral".` },
        ], 900, chat);
        const byIndex = new Map((Array.isArray(out?.tones) ? out.tones : []).filter((t) => TONES.has(t?.tone)).map((t) => [Number(t.n), t.tone]));
        const toned = new Map(picked.map((r, i) => [r.external_id, byIndex.get(i + 1)]).filter(([, t]) => t));
        return rows.map((r) => (toned.has(r.external_id) ? { ...r, sentiment: toned.get(r.external_id), tone_by: "ai" } : r));
    } catch (error) {
        logStructured("warn", "comment_tone_failed", { workspaceId, error: error?.message || error });
        return rows;
    }
}

/** Stable key of a camp: the videos it gathers around (set by buildNetwork). */
export const campKey = (camp) => camp.key;

/**
 * Names and one-sentence summaries for the camps of a built network, in the workspace language.
 * Input camps carry `videos` and `samples` (their most-liked comments). Returns [{ key, label, summary, stance }].
 */
export async function summarizeCamps(camps, { workspaceId, brand, lang = "id", chat } = {}) {
    if (!camps.length || !(await allowed(workspaceId, chat))) return [];
    const blocks = camps.map((c, i) => [
        `Camp ${i + 1} (${c.size} accounts, ${c.positiveShare}% positive, ${c.negativeShare}% negative)`,
        `Videos: ${c.videos.map((v) => v.title).join(" | ")}`,
        `Top comments:\n${(c.samples || []).map((s) => `- ${String(s).replace(/\s+/g, " ").slice(0, 180)}`).join("\n")}`,
    ].join("\n")).join("\n\n");
    const language = lang === "en" ? "English" : "Bahasa Indonesia";
    try {
        const out = await ask(workspaceId, "camp_summary", [
            { role: "system", content: `You are a media analyst. Describe conversation camps about ${brand} on YouTube for a corporate communications team. Write in ${language}: plain, factual, no hype. Return JSON only.` },
            { role: "user", content: `${blocks}\n\nReturn {"camps":[{"n":1,"label":"3-6 word name of what the camp talks about","summary":"one sentence: what they say and how they feel about ${brand}","stance":"supportive|critical|mixed|unrelated"}, ...]}` },
        ], 1200, chat);
        const list = Array.isArray(out?.camps) ? out.camps : [];
        return camps.map((c, i) => {
            const hit = list.find((x) => Number(x?.n) === i + 1);
            if (!hit?.label) return null;
            return { key: campKey(c), label: String(hit.label).slice(0, 60), summary: String(hit.summary || "").slice(0, 280), stance: ["supportive", "critical", "mixed", "unrelated"].includes(hit.stance) ? hit.stance : "mixed" };
        }).filter(Boolean);
    } catch (error) {
        logStructured("warn", "camp_summary_failed", { workspaceId, error: error?.message || error });
        return [];
    }
}
