/**
 * YouTube comments under the videos Narriv already collected, free through the YouTube Data API
 * (commentThreads.list costs 1 quota unit per 100 comments; the free 10,000 units a day cover thousands of videos).
 * Stored as one raw_documents row per video (external_id "ytcomments:<videoId>", metadata.comments, capped) with
 * who replied to whom. Not a signal: comments never inflate mention counts, and the signal lists stay light.
 */

import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { commentSentiment } from "../../lib/conversation-network.js";
import { toneComments } from "../../lib/comment-ai.js";

const TIMEOUT_MS = 15_000;
const MAX_STORED = 300; // per video, enough for its network, small enough for the record

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
export async function collectYouTubeComments(workspaceId, { maxVideos = 8, days = 30, db = supabase, fetchImpl = fetch, withTopVideos = false } = {}) {
    const out = { videos: 0, comments: 0, failed: 0 };
    if (!apiKey()) return { ...out, skipped: "YOUTUBE_API_KEY not set" };
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: videos } = await db
        .from("signals")
        .select("id, title, url, published_at, captured_at, metadata")
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
            await storeComments(db, workspaceId, videoIdOf(video), { signalId: video.id, title: video.title, channel: video.metadata?.publisher, url: video.url }, rows);
            await db.from("signals").update({ metadata: { ...(video.metadata || {}), comments_collected_at: new Date().toISOString(), comment_count: rows.length } }).eq("id", video.id);
            out.videos++;
            out.comments += Math.min(rows.length, MAX_STORED);
        } catch (error) {
            out.failed++;
            logStructured("warn", "youtube_comments_failed", { workspaceId, signalId: video.id, error: error.message });
        }
    }
    // The newest videos are often small uploads with few comments. The most watched videos about the brand in the
    // period are where the conversation is, so add them (search: 100 quota units per keyword, comments: 1 per page).
    if (withTopVideos) {
        try {
            const top = await collectTopVideoComments(workspaceId, { db, fetchImpl, days });
            out.videos += top.videos; out.comments += top.comments; out.failed += top.failed;
        } catch (error) {
            logStructured("warn", "youtube_top_videos_failed", { workspaceId, error: error.message });
        }
    }
    if (out.videos) logStructured("info", "youtube_comments_collected", { workspaceId, ...out });
    return out;
}

const brandCache = new Map();
async function brandOf(db, workspaceId) {
    if (!brandCache.has(workspaceId)) {
        const { data } = await db.from("workspace_settings").select("brand_name").eq("workspace_id", workspaceId).maybeSingle();
        brandCache.set(workspaceId, data?.brand_name || "the brand");
    }
    return brandCache.get(workspaceId);
}

async function storeComments(db, workspaceId, videoId, video, rows) {
    const base = rows.slice(0, MAX_STORED).map((r) => ({ ...r, text: String(r.text || "").slice(0, 400), sentiment: commentSentiment(r.text) }));
    // The most engaged comments get an AI read of their tone (one Haiku call per video); the rest keep the word list.
    const comments = await toneComments(base, { workspaceId, subject: `${await brandOf(db, workspaceId)} (video: ${video.title || ""})` });
    const externalId = `ytcomments:${videoId}`;
    const metadata = { kind: "youtube_comments", signal_id: video.signalId || null, video: { id: videoId, title: video.title, channel: video.channel || null, url: video.url, views: video.views ?? null }, comments, total: rows.length, collected_at: new Date().toISOString() };
    const { data: existing } = await db.from("raw_documents").select("id").eq("workspace_id", workspaceId).eq("external_id", externalId).maybeSingle();
    const { error } = existing
        ? await db.from("raw_documents").update({ metadata, title: video.title || null }).eq("id", existing.id)
        : await db.from("raw_documents").insert({ workspace_id: workspaceId, external_id: externalId, title: video.title || null, url: video.url, metadata });
    if (error) throw new Error(error.message);
    return comments.length;
}

/** Most-viewed videos of the period for the workspace's first keywords, and their comments (refreshed daily). */
export async function collectTopVideoComments(workspaceId, { db = supabase, fetchImpl = fetch, days = 30, perKeyword = 5 } = {}) {
    const out = { videos: 0, comments: 0, failed: 0 };
    const { data: kws } = await db.from("monitoring_keywords").select("keyword").eq("workspace_id", workspaceId).eq("is_active", true).limit(2);
    const { data: docs } = await db.from("raw_documents").select("external_id, metadata").eq("workspace_id", workspaceId).like("external_id", "ytcomments:%").limit(300);
    const fresh = new Set((docs || []).filter((d) => Date.parse(d.metadata?.collected_at || 0) > Date.now() - 86400000).map((d) => d.external_id));
    for (const { keyword } of kws || []) {
        const params = new URLSearchParams({ part: "snippet", q: `"${keyword}"`, type: "video", order: "viewCount", maxResults: String(perKeyword), regionCode: "ID", relevanceLanguage: "id", publishedAfter: new Date(Date.now() - days * 86400000).toISOString(), key: apiKey() });
        const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`HTTP ${res.status} ${json?.error?.message || ""}`.slice(0, 200));
        for (const item of json.items || []) {
            const id = item.id?.videoId;
            if (!id || fresh.has(`ytcomments:${id}`)) continue;
            fresh.add(`ytcomments:${id}`);
            try {
                const rows = await fetchVideoComments(id, { fetchImpl, maxPages: 3 });
                if (!rows.length) continue;
                const { data: sig } = await db.from("signals").select("id").eq("workspace_id", workspaceId).eq("url", `https://www.youtube.com/watch?v=${id}`).maybeSingle();
                out.comments += await storeComments(db, workspaceId, id, { signalId: sig?.id, title: decode(item.snippet?.title), channel: item.snippet?.channelTitle, url: `https://www.youtube.com/watch?v=${id}` }, rows);
                out.videos++;
            } catch (error) {
                out.failed++;
                logStructured("warn", "youtube_top_video_comments_failed", { workspaceId, videoId: id, error: error.message });
            }
        }
    }
    return out;
}
