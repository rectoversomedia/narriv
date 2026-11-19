import supabase from "../../lib/supabase.js";
import { buildNetwork } from "../../lib/conversation-network.js";
import { summarizeCamps } from "../../lib/comment-ai.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { logStructured } from "../../lib/logger.js";

const SUMMARY_DOC = "ytnetwork:camps";

/** Comments (from raw_documents "ytcomments:<videoId>") and the videos they sit under, for a period. */
export async function loadNetworkInput(workspaceId, { days = 30, signalFilter = null, db = supabase } = {}) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: docs, error } = await db
        .from("raw_documents")
        .select("metadata")
        .eq("workspace_id", workspaceId)
        .like("external_id", "ytcomments:%")
        .limit(300);
    if (error) throw error;
    const wanted = signalFilter ? new Set(signalFilter) : null;
    // A video is its signal when Narriv stored one, otherwise the video itself (most-viewed videos of the period).
    const kept = (docs || []).filter((d) => (d.metadata?.signal_id || d.metadata?.video?.id) && (!wanted || wanted.has(d.metadata.signal_id)));
    const vid = (d) => d.metadata.signal_id || `yt:${d.metadata.video.id}`;
    const comments = kept.flatMap((d) => (Array.isArray(d.metadata.comments) ? d.metadata.comments : [])
        .filter((c) => !c.published_at || c.published_at >= since)
        .map((c) => ({ ...c, signal_id: vid(d) })));
    const used = new Set(comments.map((c) => c.signal_id));
    const signalIds = [...used].filter((id) => !id.startsWith("yt:"));
    const { data: signalVideos } = signalIds.length
        ? await db.from("signals").select("id, title, author, url").in("id", signalIds)
        : { data: [] };
    const videos = [
        ...(signalVideos || []),
        ...kept.filter((d) => !d.metadata.signal_id && used.has(vid(d))).map((d) => ({ id: vid(d), title: d.metadata.video.title, author: d.metadata.video.channel, url: d.metadata.video.url })),
    ];
    return { comments, videos };
}

/** Stored AI names/summaries of camps, keyed by the camp's video set. */
export async function storedCampSummaries(workspaceId, db = supabase) {
    const { data } = await db.from("raw_documents").select("metadata").eq("workspace_id", workspaceId).eq("external_id", SUMMARY_DOC).maybeSingle();
    return new Map((data?.metadata?.camps || []).map((c) => [c.key, c]));
}

/** After a collection: name and summarize the 30-day camps once (one AI call), stored for every reader. */
export async function refreshCampSummaries(workspaceId, { db = supabase } = {}) {
    try {
        const { comments, videos } = await loadNetworkInput(workspaceId, { days: 30, db });
        const net = buildNetwork(comments, videos);
        if (!net.camps.length) return { camps: 0 };
        const known = await storedCampSummaries(workspaceId, db);
        const missing = net.camps.filter((c) => !known.has(c.key));
        if (!missing.length) return { camps: 0 };
        const { data: ws } = await db.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
        const fresh = await summarizeCamps(missing, { workspaceId, brand: ws?.brand_name || "the brand", lang: await workspaceLanguage(workspaceId) });
        if (!fresh.length) return { camps: 0 };
        // Keep the summaries of camps still present plus the new ones.
        const present = new Set(net.camps.map((c) => c.key));
        const camps = [...[...known.values()].filter((c) => present.has(c.key)), ...fresh];
        const { data: existing } = await db.from("raw_documents").select("id").eq("workspace_id", workspaceId).eq("external_id", SUMMARY_DOC).maybeSingle();
        const metadata = { kind: "youtube_network_camps", camps, at: new Date().toISOString() };
        if (existing) await db.from("raw_documents").update({ metadata }).eq("id", existing.id);
        else await db.from("raw_documents").insert({ workspace_id: workspaceId, external_id: SUMMARY_DOC, title: "Conversation camps", metadata });
        return { camps: fresh.length };
    } catch (error) {
        logStructured("warn", "camp_summaries_failed", { workspaceId, error: error?.message || error });
        return { camps: 0, error: error?.message };
    }
}
