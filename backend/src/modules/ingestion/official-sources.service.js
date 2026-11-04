/**
 * Official, low-cost sources collected next to Google News for every monitored keyword:
 * YouTube Data API v3 (search, 100 quota units per call; the free 10,000/day covers ~100 keyword searches) and
 * Reddit (app-only OAuth search). A source without its credentials is skipped, never simulated. Apify stays for
 * the platforms without an affordable official API (TikTok, X, Instagram).
 */

import { logStructured } from "../../lib/logger.js";
import { persistCollectedRecords } from "./signal-persistence.js";

const TIMEOUT_MS = 15_000;
const LOOKBACK_DAYS = 7;

function env(name) {
    const value = process.env[name];
    return value && !/placeholder/i.test(value) ? value : null;
}

export const isYouTubeConfigured = () => Boolean(env("YOUTUBE_API_KEY"));
export const isRedditConfigured = () => Boolean(env("REDDIT_CLIENT_ID") && env("REDDIT_CLIENT_SECRET"));

export function officialSourceStatus() {
    return [
        { key: "youtube", name: "YouTube", configured: isYouTubeConfigured() },
        { key: "reddit", name: "Reddit", configured: isRedditConfigured() },
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
export async function fetchYouTubeVideos(keyword, { limit = 8, fetchImpl = fetch, now = Date.now() } = {}) {
    const params = new URLSearchParams({
        part: "snippet",
        q: keyword,
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
    { platform: "youtube", configured: isYouTubeConfigured, fetch: fetchYouTubeVideos },
    { platform: "reddit", configured: isRedditConfigured, fetch: fetchRedditPosts },
];

/**
 * Collect one keyword from every configured official source and persist it through the shared pipeline
 * (dedup → store → AI analysis → clustering → alerts). One failing source never stops the other.
 */
export async function ingestOfficialSources({ workspaceId, keyword, limit = 8, persist = persistCollectedRecords, collectors = COLLECTORS } = {}) {
    const totals = { totalFetched: 0, newSignalsCreated: 0, skippedDuplicates: 0, analyzed: 0, analysisFailed: 0, insertFailed: 0, clustersCreated: 0, alerts: [], sources: [] };
    for (const collector of collectors) {
        if (!collector.configured()) continue;
        try {
            const records = await collector.fetch(keyword, { limit });
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
