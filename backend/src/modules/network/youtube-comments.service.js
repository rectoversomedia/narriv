/**
 * YouTube comments under the videos Narriv already collected, free through the YouTube Data API
 * (commentThreads.list costs 1 quota unit per 100 comments; the free 10,000 units a day cover thousands of videos).
 * Stored in social_comments with who replied to whom, which the conversation network is built from.
 */

import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { commentSentiment } from "../../lib/conversation-network.js";

const TIMEOUT_MS = 15_000;

function apiKey() {
    const v = process.env.YOUTUBE_API_KEY;
    return v && !/placeholder/i.test(v) ? v : null;
}
export const isCommentCollectionConfigured = () => Boolean(apiKey());

const decode = (s) => String(s || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

export function videoIdOf(signal) {
    const ext = String(signal?.external_id || "");
    if (ext.startsWith("youtube:")) return ext.slice(8);
    const m = String(signal?.url || "").match(/[?&]v=([\w-]{6,})/) || String(signal?.url || "").match(/youtu\.be\/([\w-]{6,})/);
    return m ? m[1] : null;
}

/** Top-level comments and their replies for one video, flattened: each row knows whom it answers. */
export async function fetchVideoComments(videoId, { fetchImpl = fetch, maxPages = 2 } = {}) {
    const rows = [];
    let pageToken = "";
    for (let page = 0; page < maxPages; page++) {
        const params = new URLSearchParams({ part: "snippet,replies", videoId, maxResults: "100", order: "relevance", textFormat: "plainText", key: apiKey() });
        if (pageToken) params.set("pageToken", pageToken);
        const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/commentThreads?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        const json = await res.json().catch(() => ({}));
        // Comments turned off on a video is normal, not an error worth surfacing.
        if (!res.ok) {
            if (json?.error?.errors?.[0]?.reason === "commentsDisabled") return rows;
            throw new Error(`HTTP ${res.status} ${json?.error?.message || ""}`.trim().slice(0, 200));
        }
        for (const thread of json.items || []) {
            const top = thread.snippet?.topLevelComment;
            const ts = top?.snippet;
            if (!top?.id || !ts) continue;
            rows.push({
                external_id: top.id,
                parent_external_id: null,
                author_id: ts.authorChannelId?.value || ts.authorDisplayName || null,
                author_name: ts.authorDisplayName || null,
                reply_to_author_id: null,
                reply_to_author_name: null,
                text: decode(ts.textDisplay || ts.textOriginal),
                like_count: ts.likeCount || 0,
                reply_count: thread.snippet.totalReplyCount || 0,
                published_at: ts.publishedAt || null,
            });
            for (const reply of thread.replies?.comments || []) {
                const rs = reply.snippet;
                if (!reply.id || !rs) continue;
                rows.push({
                    external_id: reply.id,
                    parent_external_id: top.id,
                    author_id: rs.authorChannelId?.value || rs.authorDisplayName || null,
                    author_name: rs.authorDisplayName || null,
                    reply_to_author_id: ts.authorChannelId?.value || ts.authorDisplayName || null,
                    reply_to_author_name: ts.authorDisplayName || null,
                    text: decode(rs.textDisplay || rs.textOriginal),
                    like_count: rs.likeCount || 0,
                    reply_count: 0,
                    published_at: rs.publishedAt || null,
                });
            }
        }
        pageToken = json.nextPageToken || "";
        if (!pageToken) break;
    }
    return rows;
}

/**
 * Collect comments for the workspace's most recent YouTube videos that have none stored yet (or were collected more
 * than a day ago). Bounded per run so the ingest call stays fast and the quota stays far below the free limit.
 */
export async function collectYouTubeComments(workspaceId, { maxVideos = 8, days = 30, db = supabase, fetchImpl = fetch } = {}) {
    const out = { videos: 0, comments: 0, failed: 0 };
    if (!apiKey()) return { ...out, skipped: "YOUTUBE_API_KEY not set" };
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: videos } = await db
        .from("signals")
        .select("id, url, published_at, captured_at, metadata")
        .eq("workspace_id", workspaceId)
        .eq("platform", "youtube")
        .gte("captured_at", since)
        .order("captured_at", { ascending: false })
        .limit(60);
    const dayAgo = Date.now() - 86400000;
    const due = (videos || []).filter((v) => videoIdOf(v) && !(v.metadata?.comments_collected_at && Date.parse(v.metadata.comments_collected_at) > dayAgo)).slice(0, maxVideos);
    for (const video of due) {
        try {
            const rows = await fetchVideoComments(videoIdOf(video), { fetchImpl });
            if (rows.length) {
                const { error } = await db.from("social_comments").upsert(
                    rows.map((r) => ({ ...r, workspace_id: workspaceId, signal_id: video.id, platform: "youtube", sentiment: commentSentiment(r.text) })),
                    { onConflict: "workspace_id,platform,external_id" },
                );
                if (error) throw new Error(error.message);
            }
            await db.from("signals").update({ metadata: { ...(video.metadata || {}), comments_collected_at: new Date().toISOString(), comment_count: rows.length } }).eq("id", video.id);
            out.videos++;
            out.comments += rows.length;
        } catch (error) {
            out.failed++;
            logStructured("warn", "youtube_comments_failed", { workspaceId, signalId: video.id, error: error.message });
        }
    }
    if (out.videos) logStructured("info", "youtube_comments_collected", { workspaceId, ...out });
    return out;
}
