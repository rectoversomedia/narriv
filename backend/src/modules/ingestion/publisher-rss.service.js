/**
 * Publisher RSS feeds (official, free): Indonesia's large outlets publish RSS with a summary of each article, which
 * Google News results do not carry (they arrive as headlines only). Used two ways:
 *   1. as a source: articles that name a keyword become records with their summary as content;
 *   2. to enrich: headline-only records from Google News get the summary of the same article (matched by outlet and
 *      title words), so analysis reads more than the headline.
 * Feeds are cached for 20 minutes across keywords and workspaces.
 */

import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { mentionsKeyword } from "../../lib/keyword-match.js";

export const PUBLISHER_FEEDS = [
    { name: "CNN Indonesia", url: "https://www.cnnindonesia.com/nasional/rss" },
    { name: "CNN Indonesia", url: "https://www.cnnindonesia.com/ekonomi/rss" },
    { name: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/news/rss" },
    { name: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/market/rss" },
    { name: "ANTARA News", url: "https://www.antaranews.com/rss/terkini.xml" },
    { name: "ANTARA News", url: "https://www.antaranews.com/rss/ekonomi.xml" },
    { name: "Tempo.co", url: "https://rss.tempo.co/bisnis" },
    { name: "Republika", url: "https://www.republika.co.id/rss" },
    { name: "Okezone", url: "https://sindikasi.okezone.com/index.php/economy/RSS2.0" },
];

const TTL_MS = 20 * 60 * 1000;
let cache = { at: 0, items: [] };

const clean = (s) => String(s || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Items of one RSS document: { title, url, summary, publishedAt }. */
export function parseRss(xml) {
    const out = [];
    for (const m of String(xml || "").matchAll(/<item\b[\s\S]*?<\/item>/g)) {
        const block = m[0];
        const tag = (t) => block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`))?.[1] || "";
        const title = clean(tag("title"));
        const url = clean(tag("link")) || clean(block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]);
        const summary = clean(tag("description") || tag("content:encoded")).replace(/\s*\.\.\.$/, "…");
        const date = Date.parse(clean(tag("pubDate")));
        if (title && url) out.push({ title, url, summary, publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null });
    }
    return out;
}

export async function publisherItems({ fetchImpl = fetch, now = Date.now() } = {}) {
    if (now - cache.at < TTL_MS && cache.items.length) return cache.items;
    const items = [];
    await Promise.all(PUBLISHER_FEEDS.map(async (f) => {
        try {
            const res = await fetchImpl(f.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; NarrivMonitor/1.0)" }, signal: AbortSignal.timeout(10000) });
            if (!res.ok) return;
            for (const it of parseRss(await res.text())) items.push({ ...it, publisher: f.name });
        } catch (error) {
            logStructured("warn", "publisher_feed_failed", { url: f.url, error: error.message });
        }
    }));
    const seen = new Set();
    cache = { at: now, items: items.filter((it) => (seen.has(it.url) ? false : seen.add(it.url))) };
    return cache.items;
}

/** Articles from the publisher feeds that name the keyword, as persistable records (last 7 days). */
export async function fetchPublisherArticles(keyword, { limit = 8, fetchImpl = fetch, now = Date.now() } = {}) {
    const since = now - 7 * 86400000;
    return (await publisherItems({ fetchImpl, now }))
        .filter((it) => (!it.publishedAt || Date.parse(it.publishedAt) >= since) && mentionsKeyword(`${it.title} ${it.summary}`, keyword))
        .slice(0, limit)
        .map((it) => ({
            externalId: `rss:${it.url}`,
            title: it.title,
            content: [it.title, it.summary].filter(Boolean).join("\n\n"),
            url: it.url,
            author: it.publisher,
            publishedAt: it.publishedAt,
            metadata: { publisher: it.publisher, source_feed: "publisher_rss", has_summary: Boolean(it.summary) },
        }));
}

const words = (t) => new Set(String(t || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2));
export function titleMatch(a, b) {
    const A = words(a), B = words(b);
    if (!A.size || !B.size) return 0;
    let n = 0;
    for (const w of A) if (B.has(w)) n++;
    return n / Math.max(A.size, B.size);
}

/**
 * Headline-only news records of a workspace (last 7 days) get the summary of the same article from the publisher
 * feeds. Returns how many were enriched.
 */
export async function enrichHeadlineRecords(workspaceId, { db = supabase, fetchImpl = fetch, now = Date.now() } = {}) {
    const since = new Date(now - 7 * 86400000).toISOString();
    const { data: rows } = await db.from("signals").select("id, title, content, metadata").eq("workspace_id", workspaceId).eq("platform", "news").gte("captured_at", since).limit(400);
    const thin = (rows || []).filter((r) => !r.metadata?.enriched_at && String(r.content || "").length < String(r.title || "").length + 60);
    if (!thin.length) return 0;
    const items = await publisherItems({ fetchImpl, now });
    let n = 0;
    for (const r of thin) {
        const best = items.map((it) => ({ it, s: titleMatch(r.title, it.title) })).sort((a, b) => b.s - a.s)[0];
        if (!best || best.s < 0.7 || !best.it.summary) continue;
        const { error } = await db.from("signals").update({
            content: [r.title, best.it.summary].join("\n\n"),
            metadata: { ...(r.metadata || {}), enriched_at: new Date(now).toISOString(), enriched_from: best.it.url },
        }).eq("id", r.id);
        if (!error) n++;
    }
    if (n) logStructured("info", "headline_records_enriched", { workspaceId, enriched: n });
    return n;
}
