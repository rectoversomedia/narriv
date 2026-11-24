/**
 * Official, low-cost sources collected next to Google News for every monitored keyword:
 * YouTube Data API v3 (search, 100 quota units per call; the free 10,000/day covers ~100 keyword searches) and
 * Reddit (app-only OAuth search). A source without its credentials is skipped, never simulated. Apify stays for
 * the platforms without an affordable official API (TikTok, X, Instagram).
 */

import { looksIndonesian } from "../../lib/indonesian-text.js";
import { logStructured } from "../../lib/logger.js";
import { persistCollectedRecords } from "./signal-persistence.js";
import { mentionsKeyword, phraseQuery } from "../../lib/keyword-match.js";
import { fetchTelegramPosts } from "./telegram.service.js";
import { fetchPublisherArticles } from "./publisher-rss.service.js";
import { scopedQuery, workspaceBrandAliases } from "../../lib/brand-scope.js";

const TIMEOUT_MS = 15_000;
const LOOKBACK_DAYS = 30; // the dashboard window (record-age.js)

function env(name) {
    const value = process.env[name];
    return value && !/placeholder/i.test(value) ? value : null;
}

export const isYouTubeConfigured = () => Boolean(env("YOUTUBE_API_KEY"));
export const isGdeltEnabled = () => process.env.GDELT_DISABLED !== "1" && process.env.NODE_ENV !== "test";
export const isRedditConfigured = () => Boolean(env("REDDIT_CLIENT_ID") && env("REDDIT_CLIENT_SECRET"));

export function officialSourceStatus() {
    return [
        { key: "youtube", name: "YouTube", configured: isYouTubeConfigured() },
        { key: "reddit", name: "Reddit", configured: isRedditConfigured() },
        { key: "youtube_comments", name: "YouTube comments", configured: isYouTubeConfigured() },
        { key: "gdelt", name: "GDELT (global news index, free)", configured: isGdeltEnabled() },
        { key: "telegram", name: "Telegram (public channels)", configured: true },
        { key: "publisher_rss", name: "Publisher RSS (CNN, CNBC, ANTARA, Tempo, Republika, Okezone)", configured: true },
    ];
}

async function getJson(url, init = {}, fetchImpl = fetch) {
    const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HTTP ${res.status} ${json?.error?.message || json?.message || ""}`.trim().slice(0, 200));
    return json;
}

const decodeEntities = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Recent Indonesian-region YouTube videos for a keyword, as persistable records. */
export async function fetchYouTubeVideos(keyword, { limit = 8, fetchImpl = fetch, now = Date.now(), query } = {}) {
    const params = new URLSearchParams({
        part: "snippet",
        q: query || phraseQuery(keyword),
        type: "video",
        order: "date",
        maxResults: String(Math.min(Math.max(limit, 1), 25)),
        regionCode: "ID",
        relevanceLanguage: "id",
        publishedAfter: new Date(now - LOOKBACK_DAYS * 86400000).toISOString(),
        key: env("YOUTUBE_API_KEY"),
    });
    const json = await getJson(`https://www.googleapis.com/youtube/v3/search?${params}`, {}, fetchImpl);
    return (json.items || [])
        .filter((item) => item.id?.videoId && item.snippet)
        // YouTube search is loose even with quotes: keep only videos whose own text names the keyword.
        .filter(({ snippet }) => mentionsKeyword(`${decodeEntities(snippet.title)} ${decodeEntities(snippet.description)} ${snippet.channelTitle || ""}`, keyword))
        // relevanceLanguage=id is only a ranking hint: an international word ("ransomware") still brings English or
        // Portuguese videos. Keep the ones written in Indonesian.
        .filter(({ snippet }) => looksIndonesian(`${decodeEntities(snippet.title)} ${decodeEntities(snippet.description)}`))
        .map(({ id, snippet }) => {
            const title = decodeEntities(snippet.title);
            return {
                externalId: `youtube:${id.videoId}`,
                title,
                content: [title, decodeEntities(snippet.description)].filter(Boolean).join("\n\n"),
                url: `https://www.youtube.com/watch?v=${id.videoId}`,
                author: snippet.channelTitle || null,
                publishedAt: snippet.publishedAt || null,
                metadata: { publisher: snippet.channelTitle || "YouTube", channel_id: snippet.channelId || null },
            };
        });
}

/**
 * Top-level comments under the given videos (commentThreads, 1 quota unit per video): the closest free stand-in for
 * what viewers say, since TikTok/X/Instagram have no free search API. Comments sit under a video that already named
 * the keyword, so they are kept even when the comment itself does not repeat it.
 */
export async function fetchYouTubeComments(videos, { perVideo = 10, fetchImpl = fetch } = {}) {
    const out = [];
    for (const video of videos) {
        const videoId = String(video.externalId || "").replace(/^youtube:/, "");
        if (!videoId) continue;
        const params = new URLSearchParams({ part: "snippet", videoId, order: "relevance", maxResults: String(Math.min(Math.max(perVideo, 1), 50)), textFormat: "plainText", key: env("YOUTUBE_API_KEY") });
        let json;
        try {
            json = await getJson(`https://www.googleapis.com/youtube/v3/commentThreads?${params}`, {}, fetchImpl);
        } catch (error) {
            // Comments switched off on one video must not stop the others.
            logStructured("warn", "youtube_comments_failed", { videoId, error: error.message });
            continue;
        }
        for (const item of json.items || []) {
            const c = item.snippet?.topLevelComment?.snippet;
            if (!item.id || !c?.textDisplay) continue;
            out.push({
                externalId: `youtube-comment:${item.id}`,
                title: `Komentar di "${video.title || "video YouTube"}"`,
                content: decodeEntities(c.textDisplay).slice(0, 2000),
                url: `https://www.youtube.com/watch?v=${videoId}&lc=${item.id}`,
                author: c.authorDisplayName || null,
                publishedAt: c.publishedAt || null,
                metadata: { publisher: "YouTube (komentar)", video_id: videoId, engagement: { likes: c.likeCount || 0, replies: item.snippet?.totalReplyCount || 0 } },
            });
        }
    }
    return out;
}

/** Videos plus the comments under the most recent few: one search (100 units) + one call per video (1 unit). */
export async function fetchYouTubeVideosAndComments(keyword, { limit = 8, fetchImpl = fetch, query, commentVideos = 3, perVideo = 10 } = {}) {
    const videos = await fetchYouTubeVideos(keyword, { limit, fetchImpl, query });
    const comments = commentVideos > 0 ? await fetchYouTubeComments(videos.slice(0, commentVideos), { perVideo, fetchImpl }) : [];
    return [...videos, ...comments];
}

const gdeltDate = (s) => {
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(String(s || ""));
    return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
};

/**
 * GDELT DOC 2.0: an open, keyless index of online news worldwide, updated every 15 minutes. Indonesian-language
 * articles that name the keyword in their headline, newest first.
 */
// GDELT answers HTTP 429 to anyone asking more than once every 5 seconds, so calls from this process queue up.
const GDELT_GAP_MS = 6_000;
let gdeltNextAt = 0;
async function gdeltTurn(sleep) {
    const wait = gdeltNextAt - Date.now();
    gdeltNextAt = Math.max(Date.now(), gdeltNextAt) + GDELT_GAP_MS;
    if (wait > 0) await sleep(wait);
}

export async function fetchGdeltArticles(keyword, { limit = 8, fetchImpl = fetch, timespan = "14d", sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
    await gdeltTurn(sleep);
    const params = new URLSearchParams({
        query: `${phraseQuery(keyword)} sourcelang:indonesian`,
        mode: "ArtList",
        format: "json",
        maxrecords: String(Math.min(Math.max(limit, 1), 75)),
        timespan,
        sort: "DateDesc",
    });
    const json = await getJson(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {}, fetchImpl);
    const seen = new Set();
    return (json.articles || [])
        .filter((a) => a?.url && a.title && mentionsKeyword(a.title, keyword))
        .filter((a) => (seen.has(a.url) ? false : seen.add(a.url)))
        .map((a) => ({
            externalId: `gdelt:${a.url}`,
            title: a.title,
            content: a.title,
            url: a.url,
            author: null,
            publishedAt: gdeltDate(a.seendate),
            metadata: { publisher: a.domain || "GDELT", via: "gdelt" },
        }));
}

let redditToken = null; // { value, expiresAt }

async function redditAccessToken(fetchImpl) {
    if (redditToken && redditToken.expiresAt > Date.now() + 60_000) return redditToken.value;
    const basic = Buffer.from(`${env("REDDIT_CLIENT_ID")}:${env("REDDIT_CLIENT_SECRET")}`).toString("base64");
    const json = await getJson("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded", "user-agent": redditUserAgent() },
        body: "grant_type=client_credentials",
    }, fetchImpl);
    if (!json.access_token) throw new Error("Reddit did not return an access token");
    redditToken = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
    return redditToken.value;
}

const redditUserAgent = () => env("REDDIT_USER_AGENT") || "web:digital.narriv.monitor:v1.0 (by /u/narriv)";

/** Reddit posts from the past week that mention a keyword, as persistable records. */
export async function fetchRedditPosts(keyword, { limit = 8, fetchImpl = fetch } = {}) {
    const token = await redditAccessToken(fetchImpl);
    const params = new URLSearchParams({ q: `"${keyword}"`, sort: "new", t: "week", type: "link", limit: String(Math.min(Math.max(limit, 1), 25)), raw_json: "1" });
    const json = await getJson(`https://oauth.reddit.com/search?${params}`, {
        headers: { authorization: `Bearer ${token}`, "user-agent": redditUserAgent() },
    }, fetchImpl);
    return (json.data?.children || [])
        .map((child) => child.data)
        .filter((post) => post?.id && post.title && !post.over_18)
        .map((post) => ({
            externalId: `reddit:${post.id}`,
            title: post.title,
            content: [post.title, post.selftext].filter(Boolean).join("\n\n").slice(0, 4000),
            url: `https://www.reddit.com${post.permalink}`,
            author: post.author ? `u/${post.author}` : null,
            publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
            metadata: {
                publisher: post.subreddit_name_prefixed || "Reddit",
                engagement: { score: post.score || 0, comments: post.num_comments || 0 },
            },
        }));
}

const COLLECTORS = [
    { platform: "youtube", configured: isYouTubeConfigured, fetch: fetchYouTubeVideosAndComments },
    { platform: "reddit", configured: isRedditConfigured, fetch: fetchRedditPosts },
    // Free and keyless: public channels' web previews.
    // Large outlets' own RSS: articles with their summary, not only the headline.
    { platform: "news", configured: () => process.env.PUBLISHER_RSS_DISABLED !== "1" && process.env.NODE_ENV !== "test", fetch: fetchPublisherArticles },
    { platform: "news", configured: isGdeltEnabled, fetch: fetchGdeltArticles },
    { platform: "telegram", configured: () => process.env.TELEGRAM_DISABLED !== "1" && process.env.NODE_ENV !== "test", fetch: fetchTelegramPosts },
];

/**
 * Collect one keyword from every configured official source and persist it through the shared pipeline
 * (dedup → store → AI analysis → clustering → alerts). One failing source never stops the other.
 */
export async function ingestOfficialSources({ workspaceId, keyword, limit = 8, persist = persistCollectedRecords, collectors = COLLECTORS } = {}) {
    const aliases = workspaceId ? await workspaceBrandAliases(workspaceId).catch(() => []) : [];
    const query = scopedQuery(keyword, aliases);
    const totals = { totalFetched: 0, newSignalsCreated: 0, skippedDuplicates: 0, analyzed: 0, analysisFailed: 0, insertFailed: 0, clustersCreated: 0, alerts: [], sources: [] };
    for (const collector of collectors) {
        if (!collector.configured()) continue;
        try {
            const records = await collector.fetch(keyword, { limit, query });
            const r = records.length
                ? await persist(records, { workspaceId, platform: collector.platform, keyword, ingestionType: collector.platform, signalDefaults: { region: "ID" } })
                : { createdSignals: [], skippedDuplicates: 0, analyzed: 0, analysisFailed: 0, insertFailed: 0, alerts: [] };
            totals.totalFetched += records.length;
            totals.newSignalsCreated += r.createdSignals?.length || 0;
            totals.skippedDuplicates += r.skippedDuplicates || 0;
            totals.analyzed += r.analyzed || 0;
            totals.analysisFailed += r.analysisFailed || 0;
            totals.insertFailed += r.insertFailed || 0;
            totals.clustersCreated += r.clustering?.clustersCreated || 0;
            if (Array.isArray(r.alerts)) totals.alerts.push(...r.alerts);
            totals.sources.push({ platform: collector.platform, status: "ok", fetched: records.length, inserted: r.createdSignals?.length || 0 });
        } catch (error) {
            logStructured("warn", "official_source_failed", { workspaceId, keyword, platform: collector.platform, error: error.message });
            totals.sources.push({ platform: collector.platform, status: "failed", error: String(error.message).slice(0, 200) });
        }
    }
    return totals;
}
