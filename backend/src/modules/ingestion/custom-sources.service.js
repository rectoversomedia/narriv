import { logStructured } from "../../lib/logger.js";

/**
 * Fetch items from an RSS feed.
 *
 * @param {string} url - RSS feed URL
 * @param {number} maxItems - Maximum items to fetch
 * @returns {Promise<Array<{ title: string, content: string, author: string, publishedDate: string, url: string }>>}
 */
export async function fetchRSSFeed(url, maxItems = 20) {
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "Narriv/1.0 (RSS Reader)" },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
        }

        const text = await response.text();
        const items = parseRSSXML(text, maxItems);

        logStructured("info", "rss_feed_fetched", { url, itemCount: items.length });
        return items;
    } catch (error) {
        logStructured("error", "rss_feed_failed", { url, error: error.message });
        return [];
    }
}

/**
 * Simple RSS XML parser (no external dependencies).
 */
function parseRSSXML(xml, maxItems) {
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const item of itemMatches.slice(0, maxItems)) {
        const title = extractTag(item, "title");
        const description = extractTag(item, "description") || extractTag(item, "content:encoded") || "";
        const link = extractTag(item, "link");
        const author = extractTag(item, "dc:creator") || extractTag(item, "author") || "";
        const pubDate = extractTag(item, "pubDate") || "";

        items.push({
            title: cleanHTML(title),
            content: cleanHTML(description),
            author: cleanHTML(author),
            publishedDate: pubDate,
            url: link || "",
        });
    }

    return items;
}

function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
}

function cleanHTML(text) {
    return text
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();
}

/**
 * Handle an incoming webhook payload.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.sourceId
 * @param {Object} params.payload - Webhook payload
 * @returns {Promise<Array>} - Processed items
 */
export async function handleWebhook({ workspaceId, sourceId, payload }) {
    try {
        // Normalize webhook payload to standard items format
        const items = [];

        if (Array.isArray(payload)) {
            // Array of items
            for (const item of payload) {
                items.push(normalizeWebhookItem(item, sourceId));
            }
        } else if (payload && typeof payload === "object") {
            // Single item or wrapped in a key
            const data = payload.data || payload.items || payload.records || [payload];
            if (Array.isArray(data)) {
                for (const item of data) {
                    items.push(normalizeWebhookItem(item, sourceId));
                }
            }
        }

        logStructured("info", "webhook_processed", { workspaceId, sourceId, itemCount: items.length });
        return items;
    } catch (error) {
        logStructured("error", "webhook_processing_failed", { workspaceId, sourceId, error: error.message });
        return [];
    }
}

function normalizeWebhookItem(item, sourceId) {
    return {
        title: item.title || item.name || item.subject || "Webhook item",
        content: item.content || item.body || item.message || item.description || item.text || "",
        author: item.author || item.sender || item.from || "",
        publishedDate: item.publishedDate || item.timestamp || item.date || item.createdAt || new Date().toISOString(),
        url: item.url || item.link || item.permalink || "",
        externalId: item.id ? `webhook_${item.id}` : undefined,
    };
}
