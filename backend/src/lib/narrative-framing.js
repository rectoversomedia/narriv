/**
 * Framing: the angles from which an issue is told ("risiko kredit Mandiri", "Mandiri jadi kambing hitam", "Mandiri
 * memberi solusi"), with the outlets behind each angle and its tone. One small AI call per issue, made only when the
 * issue's records change (signature of member ids) and the issue has at least 3 records; the result is stored in
 * narrative_clusters.metadata.framing so opening the issue again costs nothing.
 */
import crypto from "crypto";
import { logStructured } from "./logger.js";

const MIN_RECORDS = 3;

export function framingSignature(members) {
    return crypto.createHash("sha1").update(members.map((m) => m.id).sort().join(",")).digest("hex").slice(0, 16);
}

const outletOf = (m) => m.metadata?.publisher || m.author || m.platform || "?";
const toneOf = (m) => String(m.sentiment || "").toLowerCase();

export function framingPrompt(title, members, lang) {
    const lines = members.slice(0, 40).map((m, i) => `${i + 1}. [${outletOf(m)}] [${toneOf(m) || "unknown"}] ${String(m.title || "").slice(0, 160)}`);
    const language = lang === "en" ? "English" : "Bahasa Indonesia (natural, professional)";
    return [
        { role: "system", content: `You analyse how an issue is framed in the media. Group the records into 2 to 4 framings (angles from which the story is told). Use only the records given; never invent outlets or facts. Write "label" (max 6 words) and "summary" (one sentence) in ${language}. "tone" is one of positive, neutral, negative, mixed. "records" lists the record numbers that use this framing. Return JSON {"frames":[{"label","summary","tone","records":[numbers]}]}.` },
        { role: "user", content: `Issue: ${title}\n\nRecords (outlet, tone, headline):\n${lines.join("\n")}` },
    ];
}

/** Turns the model's answer into frames with real outlets and counts; drops anything that cites no record. */
export function shapeFrames(raw, members) {
    const frames = Array.isArray(raw?.frames) ? raw.frames : [];
    const used = members.slice(0, 40);
    return frames.map((f) => {
        const idx = [...new Set((Array.isArray(f.records) ? f.records : []).map(Number).filter((n) => n >= 1 && n <= used.length))];
        const rows = idx.map((n) => used[n - 1]);
        const outlets = [...new Set(rows.map(outletOf))].slice(0, 6);
        const tone = ["positive", "neutral", "negative", "mixed"].includes(String(f.tone)) ? String(f.tone) : "neutral";
        return { label: String(f.label || "").slice(0, 80), summary: String(f.summary || "").slice(0, 300), tone, count: rows.length, outlets, recordIds: rows.map((r) => r.id) };
    }).filter((f) => f.label && f.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);
}

/** Stored framing when still current, else a new one (stored back); null when the issue is too small or AI fails. */
export async function getFraming({ cluster, members, lang, db, chat }) {
    if (members.length < MIN_RECORDS) return null;
    const signature = framingSignature(members);
    const stored = cluster.metadata?.framing;
    if (stored?.signature === signature && stored?.lang === lang) return stored;
    try {
        const res = await chat.chat.completions.create({ messages: framingPrompt(cluster.title, members, lang), response_format: { type: "json_object" }, max_tokens: 900 });
        const frames = shapeFrames(JSON.parse(res.choices?.[0]?.message?.content || "{}"), members);
        if (!frames.length) return null;
        const framing = { signature, lang, frames, at: new Date().toISOString(), model: res.model || null };
        await db.from("narrative_clusters").update({ metadata: { ...(cluster.metadata || {}), framing } }).eq("id", cluster.id);
        return framing;
    } catch (error) {
        logStructured("warn", "narrative_framing_failed", { clusterId: cluster.id, error: error?.message || error });
        return stored || null;
    }
}
