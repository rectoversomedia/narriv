/**
 * Tone learning: what the AI reads about a workspace before it judges a new record.
 *
 * 1. Who the brand is, so posts by its own people (employees, agents, branch staff, official accounts, company teams
 *    and events) are told apart from the public: they get voice "internal" and are not public criticism.
 * 2. How words are meant: "anti fraud", "waspada penipuan" or a scam warning from the brand is education, not a fraud
 *    accusation against it.
 * 3. The team's own corrections (signals.metadata.tone_review where the human disagreed with the AI), newest first,
 *    as worked examples: once a team corrects a few employee videos, the next ones are read the same way.
 *
 * Cached per workspace for 10 minutes; a correction clears the cache so it applies to the next record at once.
 */
import supabaseAdmin from "./supabase.js";

const TTL = 10 * 60 * 1000;
const cache = new Map();

export function forgetToneContext(workspaceId) { cache.delete(workspaceId); accountCache?.delete(workspaceId); }

export const VOICES = ["public", "internal", "partner"];
export const normalVoice = (v) => (VOICES.includes(String(v || "").toLowerCase()) ? String(v).toLowerCase() : "public");

/** An account name or handle as compared: lower case, no "@", no spaces or punctuation. */
export const accountKey = (v) => String(v || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]/g, "");

/** The workspace's own list of accounts (workspaces.settings.voice_accounts): [{ name, voice }]. */
export async function voiceAccounts(workspaceId, db = supabaseAdmin) {
    const { data } = await db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
    const list = Array.isArray(data?.settings?.voice_accounts) ? data.settings.voice_accounts : [];
    return list.filter((a) => accountKey(a?.name) && ["internal", "partner"].includes(a?.voice)).map((a) => ({ name: String(a.name).trim().slice(0, 80), voice: a.voice }));
}

const accountCache = new Map();
/** voiceAccounts, cached for 10 minutes (ingestion asks for every record). */
export async function cachedVoiceAccounts(workspaceId) {
    const hit = accountCache.get(workspaceId);
    if (hit && Date.now() - hit.at < TTL) return hit.list;
    const list = await voiceAccounts(workspaceId).catch(() => []);
    accountCache.set(workspaceId, { at: Date.now(), list });
    return list;
}

/** The voice the list gives this author (exact account match), or null. */
export function listedVoice(author, accounts) {
    const key = accountKey(author);
    if (!key) return null;
    return accounts.find((a) => accountKey(a.name) === key)?.voice || null;
}

/** Save the list and apply it at once to the workspace's records by those authors. Returns { accounts, updated }. */
export async function saveVoiceAccounts(workspaceId, accounts, db = supabaseAdmin) {
    const clean = [];
    for (const a of Array.isArray(accounts) ? accounts : []) {
        const name = String(a?.name || "").trim().slice(0, 80);
        if (!accountKey(name) || !["internal", "partner"].includes(a?.voice) || clean.some((c) => accountKey(c.name) === accountKey(name))) continue;
        clean.push({ name, voice: a.voice });
        if (clean.length >= 200) break;
    }
    const { data: ws } = await db.from("workspaces").select("settings").eq("id", workspaceId).maybeSingle();
    const before = Array.isArray(ws?.settings?.voice_accounts) ? ws.settings.voice_accounts : [];
    const { error } = await db.from("workspaces").update({ settings: { ...(ws?.settings || {}), voice_accounts: clean } }).eq("id", workspaceId);
    if (error) throw error;
    // Records by these accounts take the listed voice; records by an account taken off the list go back to public.
    const removed = before.filter((b) => !clean.some((c) => accountKey(c.name) === accountKey(b?.name)));
    const keys = new Set([...clean, ...removed].map((a) => accountKey(a.name)));
    let updated = 0;
    if (keys.size) {
        const { data: rows } = await db.from("signals").select("id, author, metadata").eq("workspace_id", workspaceId).not("author", "is", null).order("captured_at", { ascending: false }).limit(5000);
        for (const r of rows || []) {
            if (!keys.has(accountKey(r.author)) || r.metadata?.voice_review) continue;
            const voice = listedVoice(r.author, clean) || "public";
            if ((r.metadata?.voice || "public") === voice) continue;
            await db.from("signals").update({ metadata: { ...(r.metadata || {}), voice, voice_source: listedVoice(r.author, clean) ? "list" : "ai" } }).eq("id", r.id);
            updated++;
        }
    }
    forgetToneContext(workspaceId);
    return { accounts: clean, updated };
}

/** A person sets a record's voice; it stays, and teaches the AI (see toneContext). */
export async function reviewVoice(workspaceId, signalId, voice, userId, db = supabaseAdmin) {
    const v = normalVoice(voice);
    const { data: s } = await db.from("signals").select("id, workspace_id, metadata").eq("id", signalId).maybeSingle();
    if (!s || s.workspace_id !== workspaceId) return null;
    const ai = s.metadata?.voice_review?.ai ?? (s.metadata?.voice || "public");
    const review = { ai, human: v, by: userId, at: new Date().toISOString() };
    const { error } = await db.from("signals").update({ metadata: { ...(s.metadata || {}), voice: v, voice_review: review } }).eq("id", s.id);
    if (error) throw error;
    forgetToneContext(workspaceId);
    return review;
}

/** The text added to the analysis prompt for this workspace ("" when there is nothing to add). */
export async function toneContext(workspaceId, db = supabaseAdmin) {
    if (!workspaceId) return "";
    const hit = cache.get(workspaceId);
    if (hit && Date.now() - hit.at < TTL) return hit.text;
    let text = "";
    try {
        const [{ data: settings }, { data: reviewed }, { data: voiced }, accounts] = await Promise.all([
            db.from("workspace_settings").select("brand_name, industry").eq("workspace_id", workspaceId).maybeSingle(),
            db.from("signals").select("title, content, metadata").eq("workspace_id", workspaceId).not("metadata->tone_review", "is", null).order("captured_at", { ascending: false }).limit(60),
            db.from("signals").select("title, author, metadata").eq("workspace_id", workspaceId).not("metadata->voice_review", "is", null).order("captured_at", { ascending: false }).limit(12),
            voiceAccounts(workspaceId, db).catch(() => []),
        ]);
        const brand = String(settings?.brand_name || "").trim();
        const corrections = (reviewed || [])
            .filter((s) => s.metadata?.tone_review && s.metadata.tone_review.correct === false)
            .slice(0, 12)
            .map((s) => `- "${String(s.title || s.content || "").replace(/\s+/g, " ").slice(0, 160)}" → ${s.metadata.tone_review.human}${s.metadata?.voice === "internal" ? " (internal)" : ""} (AI had said ${s.metadata.tone_review.ai})`);
        const parts = [];
        if (brand && !/^narriv$/i.test(brand)) {
            parts.push(`BRAND: ${brand}${settings?.industry ? ` (${settings.industry})` : ""}.`);
            parts.push(`VOICE: set "voice" to "internal" when the author is ${brand}'s own side: its employees, sales agents, branch or regional staff, collectors, official or branch accounts, company teams, sports teams, events and gatherings, or people talking about their own work, targets, office or training at ${brand}. Set "partner" when an outside creator, influencer, KOL or media partner makes content FOR ${brand} (endorsement, paid promotion, sponsored or collaboration content: "kerja sama", "sponsored", "#ad", "endorse", "bersama ${brand}" campaigns, promo codes). Otherwise "public": outside people talking about ${brand} on their own, including influencers reviewing or criticising it unpaid. Internal content about routine work, targets, team activities or company events is "neutral" or "positive", not "negative"; it is "negative" only when it complains about ${brand} itself (pay, treatment, leaks).`);
        }
        parts.push('MEANING: judge the meaning, not single words. A campaign or explanation AGAINST something bad ("anti fraud", "anti froud", "waspada penipuan", "hati-hati modus", scam awareness, literacy) is education: "neutral" or "positive". "negative" needs criticism, a complaint, an accusation or harm aimed at the brand.');
        if (accounts.length) parts.push(`KNOWN ACCOUNTS (the team's list; an author matching one of these always has that voice): ${accounts.slice(0, 60).map((a) => `${a.name} = ${a.voice}`).join("; ")}.`);
        const voiceFixes = (voiced || []).map((v) => `- ${v.author ? `${v.author}: ` : ""}"${String(v.title || "").replace(/\s+/g, " ").slice(0, 140)}" → voice ${v.metadata.voice_review.human}`);
        if (voiceFixes.length) parts.push(`VOICE SET BY THE TEAM; read similar authors and posts the same way:\n${voiceFixes.join("\n")}`);
        if (corrections.length) parts.push(`THE TEAM CORRECTED THESE EARLIER; read similar records the same way:\n${corrections.join("\n")}`);
        text = `\n\nWORKSPACE CONTEXT\n${parts.join("\n")}`;
    } catch {
        text = "";
    }
    cache.set(workspaceId, { at: Date.now(), text });
    return text;
}

/**
 * Re-read a workspace's recent records with the context above (after the brand or the rules change). Records a
 * person already reviewed keep the person's tone. Returns { checked, changed, internal }.
 */
export async function reassessTone(workspaceId, { days = 30, limit = 400, db = supabaseAdmin, concurrency = 4 } = {}) {
    const { analyzeSignal } = await import("../modules/ai/ai.service.js");
    const { buildAnalysisRow } = await import("../modules/ai/backfill.worker.js");
    forgetToneContext(workspaceId);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const accounts = await voiceAccounts(workspaceId, db).catch(() => []);
    const { data } = await db.from("signals").select("id, title, content, author, sentiment, metadata").eq("workspace_id", workspaceId).gte("captured_at", since).order("captured_at", { ascending: false }).limit(limit);
    const rows = (data || []).filter((s) => !s.metadata?.tone_review && (s.title || s.content));
    let checked = 0, changed = 0, internal = 0, i = 0;
    const work = async () => {
        while (i < rows.length) {
            const s = rows[i++];
            try {
                const r = await analyzeSignal(s.title || null, String(s.content || s.title).slice(0, 4000), { workspaceId, operation: "tone_reassess" });
                checked++;
                const sentiment = String(r.sentiment).toUpperCase();
                if (r.voice !== "public") internal++;
                if (sentiment !== String(s.sentiment || "").toUpperCase()) changed++;
                await db.from("signals").update({ sentiment, metadata: { ...(s.metadata || {}), voice: s.metadata?.voice_review ? s.metadata.voice : (listedVoice(s.author, accounts) || r.voice), ai_summary: r.summary || s.metadata?.ai_summary || null } }).eq("id", s.id);
                await db.from("signal_analyses").update({ analysis: { ...buildAnalysisRow(s.id, r).analysis, voice: r.voice } }).eq("signal_id", s.id);
            } catch { /* leave the record as it was */ }
        }
    };
    await Promise.all(Array.from({ length: concurrency }, work));
    return { checked, changed, internal };
}
